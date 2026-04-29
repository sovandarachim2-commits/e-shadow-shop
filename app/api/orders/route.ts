import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUser, requireRole } from "@/lib/auth";
import { orderSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const orders = await prisma.order.findMany({
    where: user.role === Role.ADMIN || user.role === Role.STAFF ? undefined : { customerId: user.id },
    include: { items: { include: { product: true } }, staff: { select: { name: true, commissionRate: true } } },
    orderBy: { createdAt: "desc" }
  });
  return NextResponse.json({ orders });
}

export async function POST(request: NextRequest) {
  const body = orderSchema.parse(await request.json());
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ message: "Please login before checkout" }, { status: 401 });

  const productIds = body.items.map((item) => item.productId);
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
  const productMap = new Map(products.map((product) => [product.id, product]));
  const orderItems = body.items.map((item) => {
    const product = productMap.get(item.productId);
    if (!product) return null;
    const price = product.isOnSale && product.salePrice ? Number(product.salePrice) : Number(product.price);
    return { productId: item.productId, quantity: item.quantity, price };
  });

  if (orderItems.some((item) => !item)) {
    return NextResponse.json({ message: "One or more products are no longer available" }, { status: 400 });
  }

  const validOrderItems = orderItems as Array<{ productId: string; quantity: number; price: number }>;
  const subtotal = validOrderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const deliveryFee = 0;
  const total = subtotal + deliveryFee;
  const order = await prisma.order.create({
    data: {
      customerName: body.customerName,
      phone: body.phone,
      address: body.address,
      province: body.province,
      note: body.note,
      contactTelegram: body.contactTelegram,
      paymentMethod: body.paymentMethod,
      deliveryFee,
      total,
      customerId: user.id,
      staffId: user?.role === Role.STAFF ? user.id : undefined,
      items: { create: validOrderItems }
    },
    include: { items: true }
  });
  return NextResponse.json({ order }, { status: 201 });
}
