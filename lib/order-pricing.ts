import { prisma } from "@/lib/prisma";

export type RequestedOrderItem = {
  productId: string;
  quantity: number;
};

export type ResolvedOrderItem = {
  productId: string;
  quantity: number;
  price: number;
  productName: string;
  originalPrice: number;
};

export async function resolveOrderPricing(items: RequestedOrderItem[]) {
  const productIds = items.map((item) => item.productId);
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
  const productMap = new Map(products.map((product) => [product.id, product]));
  const resolvedItems = items.map((item) => {
    const product = productMap.get(item.productId);
    if (!product) return null;
    const price = product.isOnSale && product.salePrice ? Number(product.salePrice) : Number(product.price);
    return {
      productId: item.productId,
      quantity: item.quantity,
      price,
      productName: product.name,
      originalPrice: Number(product.price)
    };
  });

  if (resolvedItems.some((item) => !item)) {
    return null;
  }

  const validItems = resolvedItems as ResolvedOrderItem[];
  const subtotal = validItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const originalSubtotal = validItems.reduce((sum, item) => sum + item.originalPrice * item.quantity, 0);
  const deliveryFee = products.length ? Math.min(...products.map((product) => Number(product.deliveryFee || 0))) : 0;
  const total = subtotal + deliveryFee;
  const discount = Math.max(0, originalSubtotal - subtotal);

  return {
    items: validItems,
    subtotal,
    originalSubtotal,
    discount,
    deliveryFee,
    total
  };
}
