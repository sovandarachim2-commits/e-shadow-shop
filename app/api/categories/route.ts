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

export async function GET(request: NextRequest) {
  await ensureCategoryTable();
  const includeInactive = request.nextUrl.searchParams.get("all") === "true";
  const categories = await prisma.$queryRawUnsafe(
    includeInactive
      ? "SELECT id, name, imageUrl, sortOrder, isActive FROM Category ORDER BY sortOrder ASC, name ASC"
      : "SELECT id, name, imageUrl, sortOrder, isActive FROM Category WHERE isActive = TRUE ORDER BY sortOrder ASC, name ASC"
  );
  return NextResponse.json({ categories });
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, [Role.ADMIN]);
  if (auth.response) return auth.response;

  const body = categorySchema.parse(await request.json());
  await ensureCategoryTable();

  const idResult = await prisma.$queryRawUnsafe<{ id: string }[]>("SELECT UUID() AS id");
  const id = idResult[0]?.id;

  await prisma.$executeRawUnsafe(
    "INSERT INTO Category (id, name, imageUrl, sortOrder, isActive) VALUES (?, ?, ?, ?, ?)",
    id,
    body.name,
    body.imageUrl,
    body.sortOrder,
    body.isActive
  );

  const categoryResult = await prisma.$queryRawUnsafe<{ id: string; name: string; imageUrl: string | null; sortOrder: number; isActive: boolean }[]>(
    "SELECT id, name, imageUrl, sortOrder, isActive FROM Category WHERE id = ?",
    id
  );
  const category = categoryResult[0] ?? null;
  return NextResponse.json({ category }, { status: 201 });
}
