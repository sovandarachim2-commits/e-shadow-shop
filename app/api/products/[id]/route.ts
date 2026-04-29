import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { productSchema } from "@/lib/validators";
import { productErrorResponse } from "../product-error";

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) return NextResponse.json({ message: "Product not found" }, { status: 404 });
  return NextResponse.json({ product });
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireRole(request, [Role.ADMIN]);
  if (auth.response) return auth.response;
  const { id } = params;
  try {
    const body = productSchema.parse(await request.json());
    const product = await prisma.product.update({ where: { id }, data: body });
    return NextResponse.json({ product });
  } catch (error) {
    return productErrorResponse(error, "Could not update product");
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireRole(request, [Role.ADMIN]);
  if (auth.response) return auth.response;
  const { id } = params;
  await prisma.product.delete({ where: { id } });
  return NextResponse.json({ message: "Product deleted" });
}
