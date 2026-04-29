import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { ensureDeliveryZoneTable } from "@/lib/delivery-zones";

const deliveryZoneSchema = z.object({
  name: z.string().min(2),
  price: z.coerce.number().min(0),
  freeDeliveryAmount: z.preprocess((value) => (value === "" ? null : value), z.coerce.number().min(0).nullable().optional()),
  isActive: z.boolean().default(true)
});

export async function GET(request: NextRequest) {
  await ensureDeliveryZoneTable();
  const includeInactive = request.nextUrl.searchParams.get("all") === "true";
  const zones = await prisma.$queryRawUnsafe(
    includeInactive
      ? "SELECT id, name, price, freeDeliveryAmount, isActive FROM DeliveryZone ORDER BY name ASC"
      : "SELECT id, name, price, freeDeliveryAmount, isActive FROM DeliveryZone WHERE isActive = TRUE ORDER BY name ASC"
  );
  return NextResponse.json({ zones });
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, [Role.ADMIN]);
  if (auth.response) return auth.response;

  const body = deliveryZoneSchema.parse(await request.json());
  await ensureDeliveryZoneTable();

  const idResult = await prisma.$queryRawUnsafe<{ id: string }[]>("SELECT UUID() AS id");
  const id = idResult[0]?.id;

  await prisma.$executeRawUnsafe(
    "INSERT INTO DeliveryZone (id, name, price, freeDeliveryAmount, isActive) VALUES (?, ?, ?, ?, ?)",
    id,
    body.name,
    body.price,
    body.freeDeliveryAmount,
    body.isActive
  );

  const zoneResult = await prisma.$queryRawUnsafe<{ id: string; name: string; price: string; freeDeliveryAmount: string | null; isActive: boolean }[]>(
    "SELECT id, name, price, freeDeliveryAmount, isActive FROM DeliveryZone WHERE id = ?",
    id
  );
  return NextResponse.json({ zone: zoneResult[0] ?? null }, { status: 201 });
}
