import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, [Role.ADMIN]);
  if (auth.response) return auth.response;
  const role = request.nextUrl.searchParams.get("role") as Role | null;
  const users = await prisma.user.findMany({
    where: role ? { role } : {},
    select: {
      id: true,
      name: true,
      username: true,
      phone: true,
      email: true,
      role: true,
      commissionRate: true,
      createdAt: true,
      _count: {
        select: {
          customerOrders: true
        }
      },
      customerOrders: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          customerName: true,
          phone: true,
          address: true,
          province: true,
          paymentMethod: true,
          status: true,
          total: true,
          createdAt: true
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });
  return NextResponse.json({ users });
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, [Role.ADMIN]);
  if (auth.response) return auth.response;
  const body = await request.json();
  const user = await prisma.user.create({
    data: {
      name: body.name,
      email: body.email,
      password: await bcrypt.hash(body.password || "staff123", 10),
      role: body.role || Role.STAFF,
      commissionRate: Number(body.commissionRate || 0)
    },
    select: { id: true, name: true, email: true, role: true, commissionRate: true }
  });
  return NextResponse.json({ user }, { status: 201 });
}
