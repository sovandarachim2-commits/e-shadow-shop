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

export async function GET(request: NextRequest) {
  const includeInactive = request.nextUrl.searchParams.get("all") === "true";
  const brands = await prisma.brand.findMany({
    where: includeInactive ? {} : { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
  });
  return NextResponse.json({ brands });
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, [Role.ADMIN]);
  if (auth.response) return auth.response;

  const body = brandSchema.parse(await request.json());
  const brand = await prisma.brand.create({ data: body });
  return NextResponse.json({ brand }, { status: 201 });
}
