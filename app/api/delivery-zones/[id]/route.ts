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

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireRole(request, [Role.ADMIN]);
  if (auth.response) return auth.response;

  const body = deliveryZoneSchema.parse(await request.json());
  await ensureDeliveryZoneTable();
  await prisma.$executeRawUnsafe(
    "UPDATE DeliveryZone SET name = ?, price = ?, freeDeliveryAmount = ?, isActive = ? WHERE id = ?",
    body.name,
    body.price,
    body.freeDeliveryAmount,
    body.isActive,
    params.id
  );

  const zoneResult = await prisma.$queryRawUnsafe<{ id: string; name: string; price: string; freeDeliveryAmount: string | null; isActive: boolean }[]>(
    "SELECT id, name, price, freeDeliveryAmount, isActive FROM DeliveryZone WHERE id = ?",
    params.id
  );
  return NextResponse.json({ zone: zoneResult[0] ?? null });
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireRole(request, [Role.ADMIN]);
  if (auth.response) return auth.response;

  await ensureDeliveryZoneTable();
  await prisma.$executeRawUnsafe("DELETE FROM DeliveryZone WHERE id = ?", params.id);
  return NextResponse.json({ message: "Delivery zone deleted" });
}
