import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getAuthUser } from "@/lib/auth";
import { ensureAddressLocationTable, type AddressLocationRecord } from "@/lib/address-locations";
import { prisma } from "@/lib/prisma";

function normalizeRows(rows: AddressLocationRecord[]) {
  return rows.map((row) => ({
    ...row,
    isDefault: Boolean(row.isDefault)
  }));
}

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  await ensureAddressLocationTable();
  const rows = await prisma.$queryRawUnsafe<AddressLocationRecord[]>(
    "SELECT id, userId, label, recipientName, recipientPhone, address, province, latitude, longitude, isDefault, createdAt, updatedAt FROM AddressLocation WHERE userId = ? ORDER BY isDefault DESC, updatedAt DESC",
    user.id
  );

  return NextResponse.json({ locations: normalizeRows(rows) });
}

export async function POST(request: NextRequest) {
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

  if (isDefault) {
    await prisma.$executeRawUnsafe("UPDATE AddressLocation SET isDefault = FALSE WHERE userId = ?", user.id);
  }

  const id = randomUUID();
  await prisma.$executeRawUnsafe(
    "INSERT INTO AddressLocation (id, userId, label, recipientName, recipientPhone, address, province, latitude, longitude, isDefault) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    id,
    user.id,
    label,
    recipientName,
    recipientPhone,
    address,
    province || null,
    latitude,
    longitude,
    isDefault
  );

  const rows = await prisma.$queryRawUnsafe<AddressLocationRecord[]>(
    "SELECT id, userId, label, recipientName, recipientPhone, address, province, latitude, longitude, isDefault, createdAt, updatedAt FROM AddressLocation WHERE id = ? LIMIT 1",
    id
  );

  return NextResponse.json({ location: normalizeRows(rows)[0] }, { status: 201 });
}
