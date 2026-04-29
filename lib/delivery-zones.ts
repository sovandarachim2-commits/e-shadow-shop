import { prisma } from "@/lib/prisma";

export async function ensureDeliveryZoneTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS DeliveryZone (
      id VARCHAR(191) NOT NULL,
      name VARCHAR(191) NOT NULL,
      price DECIMAL(10, 2) NOT NULL DEFAULT 0,
      freeDeliveryAmount DECIMAL(10, 2) NULL,
      isActive BOOLEAN NOT NULL DEFAULT TRUE,
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      UNIQUE KEY DeliveryZone_name_key (name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}
