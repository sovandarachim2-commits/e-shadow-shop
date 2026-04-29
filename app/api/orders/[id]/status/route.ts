import { NextRequest, NextResponse } from "next/server";
import { OrderStatus, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireRole(request, [Role.ADMIN, Role.STAFF]);
  if (auth.response) return auth.response;
  const { id } = params;
  const { status } = await request.json();
  if (!Object.values(OrderStatus).includes(status as OrderStatus)) return NextResponse.json({ message: "Invalid status" }, { status: 400 });
  const order = await prisma.order.update({ where: { id }, data: { status } });
  return NextResponse.json({ order });
}
