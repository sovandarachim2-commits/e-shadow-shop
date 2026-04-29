import { prisma } from "@/lib/prisma";

export type AddressLocationRecord = {
  id: string;
  userId: string;
  label: string;
  recipientName: string | null;
  recipientPhone: string | null;
  address: string;
  province: string | null;
  latitude: number | null;
  longitude: number | null;
  isDefault: number | boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export async function ensureAddressLocationTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS AddressLocation (
      id VARCHAR(191) NOT NULL,
      userId VARCHAR(191) NOT NULL,
      label VARCHAR(191) NOT NULL,
      recipientName VARCHAR(191) NULL,
      recipientPhone VARCHAR(191) NULL,
      address TEXT NOT NULL,
      province VARCHAR(191) NULL,
      latitude DECIMAL(10, 7) NULL,
      longitude DECIMAL(10, 7) NULL,
      isDefault BOOLEAN NOT NULL DEFAULT FALSE,
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      KEY AddressLocation_userId_idx (userId),
      KEY AddressLocation_userId_isDefault_idx (userId, isDefault)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  const columns = await prisma.$queryRawUnsafe<Array<{ COLUMN_NAME: string }>>(
    "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'AddressLocation' AND COLUMN_NAME IN ('recipientName', 'recipientPhone', 'latitude', 'longitude')"
  );
  const columnNames = new Set(columns.map((column) => column.COLUMN_NAME));

  if (!columnNames.has("recipientName")) {
    await prisma.$executeRawUnsafe("ALTER TABLE AddressLocation ADD COLUMN recipientName VARCHAR(191) NULL AFTER label");
  }

  if (!columnNames.has("recipientPhone")) {
    await prisma.$executeRawUnsafe("ALTER TABLE AddressLocation ADD COLUMN recipientPhone VARCHAR(191) NULL AFTER recipientName");
  }

  if (!columnNames.has("latitude")) {
    await prisma.$executeRawUnsafe("ALTER TABLE AddressLocation ADD COLUMN latitude DECIMAL(10, 7) NULL AFTER province");
  }

  if (!columnNames.has("longitude")) {
    await prisma.$executeRawUnsafe("ALTER TABLE AddressLocation ADD COLUMN longitude DECIMAL(10, 7) NULL AFTER latitude");
  }
}
