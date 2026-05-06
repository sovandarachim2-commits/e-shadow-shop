import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, [Role.ADMIN, Role.STAFF]);
  if (auth.response) return auth.response;

  const [totalOrders, completedOrdersCount, completedOrders, completedItems] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({ where: { status: "COMPLETED" } }),
    prisma.order.findMany({
      where: { status: "COMPLETED" },
      select: { createdAt: true, total: true },
      orderBy: { createdAt: "asc" }
    }),
    prisma.orderItem.findMany({
      where: { order: { status: "COMPLETED" } },
      select: {
        productId: true,
        quantity: true,
        price: true,
        product: { select: { name: true } }
      }
    })
  ]);

  const sales = completedOrders.reduce((sum, order) => sum + Number(order.total), 0);
  const chart = completedOrders.map((order) => ({ date: order.createdAt.toISOString().slice(0, 10), sales: Number(order.total) }));
  const productMap = new Map<string, { name: string; quantity: number; revenue: number }>();

  for (const item of completedItems) {
    const current = productMap.get(item.productId) || { name: item.product.name, quantity: 0, revenue: 0 };
    current.quantity += item.quantity;
    current.revenue += Number(item.price) * item.quantity;
    productMap.set(item.productId, current);
  }

  return NextResponse.json({
    sales,
    totalOrders,
    completedOrders: completedOrdersCount,
    chart,
    bestSellers: [...productMap.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 8)
  });
}
