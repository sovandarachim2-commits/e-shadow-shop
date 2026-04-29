import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

const brandSchema = z.object({
  name: z.string().min(2),
  logoUrl: z.preprocess((value) => (value === "" ? null : value), z.string().min(1).nullable().optional()),
  sortOrder: z.coerce.number().int().default(0),
  isActive: z.boolean().default(true)
});

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireRole(request, [Role.ADMIN]);
  if (auth.response) return auth.response;

  const body = brandSchema.parse(await request.json());
  const brand = await prisma.brand.update({ where: { id: params.id }, data: body });
  return NextResponse.json({ brand });
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireRole(request, [Role.ADMIN]);
  if (auth.response) return auth.response;

  await prisma.brand.delete({ where: { id: params.id } });
  return NextResponse.json({ message: "Brand deleted" });
}
