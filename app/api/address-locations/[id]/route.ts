import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { ensureAddressLocationTable, type AddressLocationRecord } from "@/lib/address-locations";
import { prisma } from "@/lib/prisma";

function normalizeRow(row?: AddressLocationRecord) {
  if (!row) return null;
  return {
    ...row,
    isDefault: Boolean(row.isDefault)
  };
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const label = String(body.label || "").trim();
  const recipientName = String(body.recipientName || "").trim();
  const recipientPhone = String(body.recipientPhone || "").trim();
  const address = String(body.address || "").trim();
  const province = String(body.province || "").trim();
  const latitude = body.latitude === "" || body.latitude === null || body.latitude === undefined ? null : Number(body.latitude);
  const longitude = body.longitude === "" || body.longitude === null || body.longitude === undefined ? null : Number(body.longitude);
  const isDefault = Boolean(body.isDefault);

  if (label.length < 2) return NextResponse.json({ message: "Label is required" }, { status: 400 });
  if (recipientName.length < 2) return NextResponse.json({ message: "Recipient name is required" }, { status: 400 });
  if (recipientPhone.length < 6) return NextResponse.json({ message: "Recipient phone is required" }, { status: 400 });
  if (address.length < 8) return NextResponse.json({ message: "Address is required" }, { status: 400 });

  await ensureAddressLocationTable();

  const existing = await prisma.$queryRawUnsafe<AddressLocationRecord[]>(
    "SELECT id, userId, label, recipientName, recipientPhone, address, province, latitude, longitude, isDefault, createdAt, updatedAt FROM AddressLocation WHERE id = ? AND userId = ? LIMIT 1",
    params.id,
    user.id
  );
  if (!existing[0]) return NextResponse.json({ message: "Address location not found" }, { status: 404 });

  if (isDefault) {
    await prisma.$executeRawUnsafe("UPDATE AddressLocation SET isDefault = FALSE WHERE userId = ?", user.id);
  }

  await prisma.$executeRawUnsafe(
    "UPDATE AddressLocation SET label = ?, recipientName = ?, recipientPhone = ?, address = ?, province = ?, latitude = ?, longitude = ?, isDefault = ? WHERE id = ? AND userId = ?",
    label,
    recipientName,
    recipientPhone,
    address,
    province || null,
    latitude,
    longitude,
    isDefault,
    params.id,
    user.id
  );

  const rows = await prisma.$queryRawUnsafe<AddressLocationRecord[]>(
    "SELECT id, userId, label, recipientName, recipientPhone, address, province, latitude, longitude, isDefault, createdAt, updatedAt FROM AddressLocation WHERE id = ? LIMIT 1",
    params.id
  );

  return NextResponse.json({ location: normalizeRow(rows[0]) });
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  await ensureAddressLocationTable();

  const existing = await prisma.$queryRawUnsafe<AddressLocationRecord[]>(
    "SELECT id, userId, label, recipientName, recipientPhone, address, province, latitude, longitude, isDefault, createdAt, updatedAt FROM AddressLocation WHERE id = ? AND userId = ? LIMIT 1",
    params.id,
    user.id
  );
  if (!existing[0]) return NextResponse.json({ message: "Address location not found" }, { status: 404 });

  await prisma.$executeRawUnsafe("DELETE FROM AddressLocation WHERE id = ? AND userId = ?", params.id, user.id);
  return NextResponse.json({ message: "Address location deleted" });
}
