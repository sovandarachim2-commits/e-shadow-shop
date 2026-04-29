import { prisma } from "@/lib/prisma";

export async function ensureSettingsTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS SiteSetting (
      \`key\` VARCHAR(191) NOT NULL,
      \`value\` LONGTEXT NOT NULL,
      updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      PRIMARY KEY (\`key\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

export async function readSiteSetting<T>(key: string, fallback: T): Promise<T> {
  await ensureSettingsTable();
  const rows = await prisma.$queryRawUnsafe<{ value: string }[]>("SELECT `value` FROM SiteSetting WHERE `key` = ? LIMIT 1", key);
  if (!rows[0]?.value) return fallback;

  try {
    return JSON.parse(rows[0].value) as T;
  } catch {
    return fallback;
  }
}

export async function writeSiteSetting(key: string, value: unknown) {
  await ensureSettingsTable();
  await prisma.$executeRawUnsafe(
    "INSERT INTO SiteSetting (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)",
    key,
    JSON.stringify(value)
  );
}
