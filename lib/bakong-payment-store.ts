import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";

export type BakongPaymentRecord = {
  id: string;
  customerId: string;
  orderId: string | null;
  orderPayload: string | null;
  customerName: string;
  phone: string;
  address: string;
  province: string | null;
  note: string | null;
  contactTelegram: boolean;
  md5: string;
  qrUrl: string;
  currency: string;
  amount: number;
  subtotal: number;
  deliveryFee: number;
  total: number;
  status: "PENDING" | "PAID" | "ERROR";
  lastError: string | null;
  expiresAt: Date | null;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type BakongPaymentRow = Omit<BakongPaymentRecord, "contactTelegram" | "amount" | "subtotal" | "deliveryFee" | "total"> & {
  contactTelegram: number;
  amount: string | number;
  subtotal: string | number;
  deliveryFee: string | number;
  total: string | number;
};

type CreateBakongPaymentInput = {
  customerId: string;
  orderPayload?: unknown;
  customerName: string;
  phone: string;
  address: string;
  province?: string | null;
  note?: string | null;
  contactTelegram?: boolean;
  md5: string;
  qrUrl: string;
  currency: string;
  amount: number;
  subtotal: number;
  deliveryFee: number;
  total: number;
  expiresInMinutes?: number;
};

function mapRow(row: BakongPaymentRow): BakongPaymentRecord {
  return {
    ...row,
    contactTelegram: Boolean(row.contactTelegram),
    amount: Number(row.amount),
    subtotal: Number(row.subtotal),
    deliveryFee: Number(row.deliveryFee),
    total: Number(row.total)
  };
}

export async function ensureBakongPaymentTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS BakongPayment (
      id VARCHAR(191) NOT NULL,
      customerId VARCHAR(191) NOT NULL,
      orderId VARCHAR(191) NULL,
      orderPayload LONGTEXT NULL,
      customerName VARCHAR(191) NOT NULL,
      phone VARCHAR(191) NOT NULL,
      address TEXT NOT NULL,
      province VARCHAR(191) NULL,
      note TEXT NULL,
      contactTelegram TINYINT(1) NOT NULL DEFAULT 0,
      md5 VARCHAR(32) NOT NULL,
      qrUrl TEXT NOT NULL,
      currency VARCHAR(10) NOT NULL,
      amount DECIMAL(10, 2) NOT NULL,
      subtotal DECIMAL(10, 2) NOT NULL,
      deliveryFee DECIMAL(10, 2) NOT NULL,
      total DECIMAL(10, 2) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
      lastError TEXT NULL,
      expiresAt DATETIME(3) NULL,
      paidAt DATETIME(3) NULL,
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      UNIQUE KEY BakongPayment_md5_key (md5),
      KEY BakongPayment_customerId_idx (customerId),
      KEY BakongPayment_orderId_idx (orderId),
      KEY BakongPayment_status_idx (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  const columns = await prisma.$queryRawUnsafe<Array<{ COLUMN_NAME: string }>>(
    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'BakongPayment' AND COLUMN_NAME = 'orderPayload'"
  );
  if (!columns.length) {
    await prisma.$executeRawUnsafe("ALTER TABLE BakongPayment ADD COLUMN orderPayload LONGTEXT NULL AFTER orderId");
  }
}

export async function createBakongPayment(input: CreateBakongPaymentInput) {
  await ensureBakongPaymentTable();
  const id = crypto.randomUUID();
  const expiresAt =
    typeof input.expiresInMinutes === "number" && input.expiresInMinutes > 0
      ? new Date(Date.now() + input.expiresInMinutes * 60 * 1000)
      : null;

  await prisma.$executeRawUnsafe(
    `INSERT INTO BakongPayment
      (id, customerId, orderPayload, customerName, phone, address, province, note, contactTelegram, md5, qrUrl, currency, amount, subtotal, deliveryFee, total, status, expiresAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)`,
    id,
    input.customerId,
    input.orderPayload ? JSON.stringify(input.orderPayload) : null,
    input.customerName,
    input.phone,
    input.address,
    input.province ?? null,
    input.note ?? null,
    input.contactTelegram ? 1 : 0,
    input.md5,
    input.qrUrl,
    input.currency,
    input.amount,
    input.subtotal,
    input.deliveryFee,
    input.total,
    expiresAt
  );

  return getBakongPaymentById(id);
}

export async function getBakongPaymentById(id: string) {
  await ensureBakongPaymentTable();
  const rows = await prisma.$queryRawUnsafe<BakongPaymentRow[]>(
    "SELECT * FROM BakongPayment WHERE id = ? LIMIT 1",
    id
  );
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function getBakongPaymentByMd5(md5: string) {
  await ensureBakongPaymentTable();
  const rows = await prisma.$queryRawUnsafe<BakongPaymentRow[]>(
    "SELECT * FROM BakongPayment WHERE md5 = ? LIMIT 1",
    md5
  );
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function updateBakongPaymentStatus(input: {
  id: string;
  status: "PENDING" | "PAID" | "ERROR";
  lastError?: string | null;
  paidAt?: Date | null;
}) {
  await ensureBakongPaymentTable();
  await prisma.$executeRawUnsafe(
    `UPDATE BakongPayment
     SET status = ?, lastError = ?, paidAt = ?
     WHERE id = ?`,
    input.status,
    input.lastError ?? null,
    input.paidAt ?? null,
    input.id
  );
}

export async function linkBakongPaymentToOrder(paymentId: string, orderId: string) {
  await ensureBakongPaymentTable();
  await prisma.$executeRawUnsafe(
    "UPDATE BakongPayment SET orderId = ? WHERE id = ?",
    orderId,
    paymentId
  );
}

export async function getBakongPaymentStatusesByOrderIds(orderIds: string[]) {
  await ensureBakongPaymentTable();
  if (!orderIds.length) return new Map<string, BakongPaymentRecord["status"]>();

  const placeholders = orderIds.map(() => "?").join(", ");
  const rows = await prisma.$queryRawUnsafe<Array<{ orderId: string; status: BakongPaymentRecord["status"] }>>(
    `SELECT orderId, status
     FROM BakongPayment
     WHERE orderId IN (${placeholders})
     ORDER BY updatedAt DESC`,
    ...orderIds
  );

  const statusMap = new Map<string, BakongPaymentRecord["status"]>();
  for (const row of rows) {
    if (!row.orderId || statusMap.has(row.orderId)) continue;
    statusMap.set(row.orderId, row.status);
  }
  return statusMap;
}
