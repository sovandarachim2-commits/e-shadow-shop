import { NextRequest, NextResponse } from "next/server";
import { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { productSchema } from "@/lib/validators";
import { productErrorResponse } from "./product-error";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get("search") || "";
  const brand = searchParams.get("brand") || "";
  const category = searchParams.get("category") || "";
  const promotion = searchParams.get("promotion") || "";
  const where: Prisma.ProductWhereInput = {};
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { description: { contains: search } },
      { brand: { contains: search } }
    ];
  }
  if (brand) where.brand = brand;
  if (category) where.category = category;
  if (promotion === "sale") where.isOnSale = true;
  if (promotion === "new") where.isNewArrival = true;
  const products = await prisma.product.findMany({
    where,
    orderBy: { createdAt: "desc" }
  });
  return NextResponse.json({ products });
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, [Role.ADMIN]);
  if (auth.response) return auth.response;
  try {
    const body = productSchema.parse(await request.json());
    const product = await prisma.product.create({ data: body });
    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    return productErrorResponse(error, "Could not save product");
  }
}
