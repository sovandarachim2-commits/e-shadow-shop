import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, [Role.ADMIN, Role.STAFF]);
  if (auth.response) return auth.response;

  const orders = await prisma.order.findMany({ include: { items: { include: { product: true } } }, orderBy: { createdAt: "asc" } });
  const completed = orders.filter((order) => order.status === "COMPLETED");
  const sales = completed.reduce((sum, order) => sum + Number(order.total), 0);
  const chart = completed.map((order) => ({ date: order.createdAt.toISOString().slice(0, 10), sales: Number(order.total) }));
  const productMap = new Map<string, { name: string; quantity: number; revenue: number }>();

  for (const order of completed) {
    for (const item of order.items) {
      const current = productMap.get(item.productId) || { name: item.product.name, quantity: 0, revenue: 0 };
      current.quantity += item.quantity;
      current.revenue += Number(item.price) * item.quantity;
      productMap.set(item.productId, current);
    }
  }

  return NextResponse.json({
    sales,
    totalOrders: orders.length,
    completedOrders: completed.length,
    chart,
    bestSellers: [...productMap.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 8)
  });
}
