import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

const categorySchema = z.object({
  name: z.string().min(2),
  imageUrl: z.preprocess((value) => (value === "" ? null : value), z.string().min(1).nullable().optional()),
  sortOrder: z.coerce.number().int().default(0),
  isActive: z.boolean().default(true)
});

async function ensureCategoryTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS Category (
      id VARCHAR(191) NOT NULL,
      name VARCHAR(191) NOT NULL,
      imageUrl VARCHAR(1000) NULL,
      sortOrder INT NOT NULL DEFAULT 0,
      isActive BOOLEAN NOT NULL DEFAULT TRUE,
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      UNIQUE KEY Category_name_key (name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await prisma.$executeRawUnsafe("ALTER TABLE Category ADD COLUMN IF NOT EXISTS imageUrl VARCHAR(1000) NULL AFTER name");
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireRole(request, [Role.ADMIN]);
  if (auth.response) return auth.response;

  const body = categorySchema.parse(await request.json());
  await ensureCategoryTable();
  await prisma.$executeRawUnsafe(
    "UPDATE Category SET name = ?, imageUrl = ?, sortOrder = ?, isActive = ? WHERE id = ?",
    body.name,
    body.imageUrl,
    body.sortOrder,
    body.isActive,
    params.id
  );
  const categoryResult = await prisma.$queryRawUnsafe<{ id: string; name: string; imageUrl: string | null; sortOrder: number; isActive: boolean }[]>(
    "SELECT id, name, imageUrl, sortOrder, isActive FROM Category WHERE id = ?",
    params.id
  );
  const category = categoryResult[0] ?? null;
  return NextResponse.json({ category });
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireRole(request, [Role.ADMIN]);
  if (auth.response) return auth.response;

  await ensureCategoryTable();
  await prisma.$executeRawUnsafe("DELETE FROM Category WHERE id = ?", params.id);
  return NextResponse.json({ message: "Category deleted" });
}
