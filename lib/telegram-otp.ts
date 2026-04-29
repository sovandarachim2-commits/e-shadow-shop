import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";

const OTP_TTL_MINUTES = 3;

export type TelegramVerificationRecord = {
  id: string;
  phone: string;
  username: string;
  email: string | null;
  verificationToken: string;
  otpCode: string;
  chatId: string | null;
  telegramUsername: string | null;
  otpSentAt: Date | null;
  verifiedAt: Date | null;
  consumedAt: Date | null;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type TelegramSubscriberRecord = {
  id: string;
  chatId: string;
  telegramUsername: string | null;
  phone: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export async function ensureTelegramVerificationTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS TelegramPhoneVerification (
      id VARCHAR(191) NOT NULL,
      phone VARCHAR(191) NOT NULL,
      username VARCHAR(191) NOT NULL,
      email VARCHAR(191) NULL,
      verificationToken VARCHAR(191) NOT NULL,
      otpCode VARCHAR(6) NOT NULL,
      chatId VARCHAR(191) NULL,
      telegramUsername VARCHAR(191) NULL,
      otpSentAt DATETIME(3) NULL,
      verifiedAt DATETIME(3) NULL,
      consumedAt DATETIME(3) NULL,
      expiresAt DATETIME(3) NOT NULL,
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      UNIQUE KEY TelegramPhoneVerification_verificationToken_key (verificationToken),
      KEY TelegramPhoneVerification_phone_idx (phone),
      KEY TelegramPhoneVerification_chatId_idx (chatId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

export async function ensureTelegramSubscriberTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS TelegramBotSubscriber (
      id VARCHAR(191) NOT NULL,
      chatId VARCHAR(191) NOT NULL,
      telegramUsername VARCHAR(191) NULL,
      phone VARCHAR(191) NULL,
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      UNIQUE KEY TelegramBotSubscriber_chatId_key (chatId),
      KEY TelegramBotSubscriber_phone_idx (phone)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

function generateOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function generateVerificationToken() {
  return crypto.randomBytes(24).toString("hex");
}

export function getTelegramBotToken() {
  return process.env.TELEGRAM_BOT_TOKEN || "";
}

export function getTelegramBotUsername() {
  return (process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "").replace(/^@/, "");
}

export function getTelegramWebhookSecret() {
  return process.env.TELEGRAM_WEBHOOK_SECRET || "";
}

export function isTelegramConfigured() {
  return Boolean(getTelegramBotToken() && getTelegramBotUsername());
}

export function getTelegramVerificationDeepLink(token: string, phone?: string) {
  const botUsername = getTelegramBotUsername();
  if (!botUsername) return "";
  const normalizedPhone = phone ? normalizePhone(phone) : "";
  const startPayload = normalizedPhone ? `verify_${token}_${normalizedPhone}` : `verify_${token}`;
  return `https://t.me/${botUsername}?start=${startPayload}`;
}

function normalizePhone(phone: string) {
  const digits = phone.replace(/\D+/g, "");
  if (digits.startsWith("855") && digits.length > 3) {
    return `0${digits.slice(3)}`;
  }
  return digits;
}

export function normalizeTelegramPhone(phone: string) {
  return normalizePhone(phone);
}

function looksLikePhoneMessage(text: string) {
  return /^[0-9+\-\s()]{6,20}$/.test(text.trim());
}

export function isTelegramPhoneText(text: string) {
  return looksLikePhoneMessage(text);
}

export function formatTelegramPhoneText(text: string) {
  return normalizePhone(text);
}

export async function upsertTelegramSubscriber(input: { chatId: string; telegramUsername: string | null; phone?: string | null }) {
  await ensureTelegramSubscriberTable();
  const id = crypto.randomUUID();
  await prisma.$executeRawUnsafe(
    `INSERT INTO TelegramBotSubscriber (id, chatId, telegramUsername, phone)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       telegramUsername = VALUES(telegramUsername),
       phone = COALESCE(VALUES(phone), phone)`,
    id,
    input.chatId,
    input.telegramUsername,
    input.phone ? normalizePhone(input.phone) : null
  );
}

export async function findTelegramSubscriberByPhone(phone: string) {
  await ensureTelegramSubscriberTable();
  const rows = await prisma.$queryRawUnsafe<TelegramSubscriberRecord[]>(
    `SELECT * FROM TelegramBotSubscriber
     WHERE phone = ?
     ORDER BY updatedAt DESC
     LIMIT 1`,
    normalizePhone(phone)
  );
  return rows[0] || null;
}

export async function findTelegramSubscriberByChatId(chatId: string) {
  await ensureTelegramSubscriberTable();
  const rows = await prisma.$queryRawUnsafe<TelegramSubscriberRecord[]>(
    `SELECT * FROM TelegramBotSubscriber
     WHERE chatId = ?
     LIMIT 1`,
    chatId
  );
  return rows[0] || null;
}

export async function findFirstLinkedPhoneForChat(chatId: string) {
  await ensureTelegramVerificationTable();
  const rows = await prisma.$queryRawUnsafe<Array<Pick<TelegramVerificationRecord, "phone">>>(
    `SELECT phone
     FROM TelegramPhoneVerification
     WHERE chatId = ? AND phone IS NOT NULL
     ORDER BY createdAt ASC
     LIMIT 1`,
    chatId
  );
  return rows[0]?.phone ? normalizePhone(rows[0].phone) : null;
}

export async function createTelegramVerification(input: { phone: string; username: string; email: string | null }) {
  await ensureTelegramVerificationTable();
  await ensureTelegramSubscriberTable();
  await prisma.$executeRawUnsafe(
    "UPDATE TelegramPhoneVerification SET consumedAt = COALESCE(consumedAt, CURRENT_TIMESTAMP(3)) WHERE phone = ? AND consumedAt IS NULL",
    input.phone
  );

  const verificationToken = generateVerificationToken();
  const otpCode = generateOtpCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
  const id = crypto.randomUUID();

  await prisma.$executeRawUnsafe(
    `INSERT INTO TelegramPhoneVerification
      (id, phone, username, email, verificationToken, otpCode, expiresAt)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.phone,
    input.username,
    input.email,
    verificationToken,
    otpCode,
    expiresAt
  );

  const subscriberChat = await findTelegramSubscriberByPhone(input.phone);
  const canonicalPhone = subscriberChat?.chatId ? await findFirstLinkedPhoneForChat(subscriberChat.chatId) : null;
  const previousChat = subscriberChat?.chatId && (!canonicalPhone || canonicalPhone === normalizePhone(input.phone)) ? subscriberChat : null;
  if (previousChat?.chatId) {
    await prisma.$executeRawUnsafe(
      `UPDATE TelegramPhoneVerification
       SET chatId = ?, telegramUsername = ?
       WHERE id = ?`,
      previousChat.chatId,
      previousChat.telegramUsername,
      id
    );
  }

  return {
    verificationToken,
    otpCode,
    expiresAt,
    chatId: previousChat?.chatId || null,
    telegramUrl: previousChat?.chatId ? "" : getTelegramVerificationDeepLink(verificationToken, input.phone),
    reusedChat: Boolean(previousChat?.chatId)
  };
}

export async function findTelegramVerificationByToken(verificationToken: string) {
  await ensureTelegramVerificationTable();
  const rows = await prisma.$queryRawUnsafe<TelegramVerificationRecord[]>(
    "SELECT * FROM TelegramPhoneVerification WHERE verificationToken = ? LIMIT 1",
    verificationToken
  );
  return rows[0] || null;
}

export async function findActiveUnlinkedTelegramVerifications(limit = 5) {
  await ensureTelegramVerificationTable();
  const rows = await prisma.$queryRawUnsafe<TelegramVerificationRecord[]>(
    `SELECT * FROM TelegramPhoneVerification
     WHERE consumedAt IS NULL
       AND chatId IS NULL
     ORDER BY createdAt DESC
     LIMIT ?`,
    limit
  );
  return rows.filter((row) => !isVerificationExpired(row));
}

export async function findLatestActiveUnlinkedTelegramVerificationByPhone(phone: string) {
  await ensureTelegramVerificationTable();
  const rows = await prisma.$queryRawUnsafe<TelegramVerificationRecord[]>(
    `SELECT * FROM TelegramPhoneVerification
     WHERE consumedAt IS NULL
       AND chatId IS NULL
       AND phone = ?
     ORDER BY createdAt DESC
     LIMIT 5`,
    normalizePhone(phone)
  );

  return rows.find((row) => !isVerificationExpired(row)) || null;
}

export async function markTelegramVerificationChatLinked(input: { verificationToken: string; chatId: string; telegramUsername: string | null; phone?: string | null }) {
  await ensureTelegramVerificationTable();
  await prisma.$executeRawUnsafe(
    `UPDATE TelegramPhoneVerification
     SET chatId = ?, telegramUsername = ?
     WHERE verificationToken = ? AND consumedAt IS NULL`,
    input.chatId,
    input.telegramUsername,
    input.verificationToken
  );
  await upsertTelegramSubscriber({
    chatId: input.chatId,
    telegramUsername: input.telegramUsername,
    phone: input.phone ?? null
  });
}

export async function markTelegramOtpSent(verificationToken: string) {
  await ensureTelegramVerificationTable();
  await prisma.$executeRawUnsafe(
    "UPDATE TelegramPhoneVerification SET otpSentAt = CURRENT_TIMESTAMP(3) WHERE verificationToken = ? AND consumedAt IS NULL",
    verificationToken
  );
}

export async function markTelegramVerificationVerified(verificationToken: string) {
  await ensureTelegramVerificationTable();
  await prisma.$executeRawUnsafe(
    "UPDATE TelegramPhoneVerification SET verifiedAt = CURRENT_TIMESTAMP(3) WHERE verificationToken = ? AND consumedAt IS NULL",
    verificationToken
  );
}

export async function consumeTelegramVerification(verificationToken: string) {
  await ensureTelegramVerificationTable();
  await prisma.$executeRawUnsafe(
    "UPDATE TelegramPhoneVerification SET consumedAt = CURRENT_TIMESTAMP(3) WHERE verificationToken = ? AND consumedAt IS NULL",
    verificationToken
  );
}

export async function sendTelegramOtpMessage(input: { chatId: string; otpCode: string; firstName?: string | null; displayName?: string | null }) {
  const botToken = getTelegramBotToken();
  if (!botToken) throw new Error("Telegram bot token is not configured");

  const greetingName = input.displayName?.trim() || input.firstName?.trim() || "there";
  const text = [
    `Hi ${greetingName}!`,
    "Use the following one-time password (OTP) to sign in to your Shadow account.",
    `This OTP will be valid for ${OTP_TTL_MINUTES} minutes: ${input.otpCode}`,
    "Best Regard,",
    "Shadow Team"
  ].join("\n");

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: input.chatId,
      text
    })
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(errorText || "Could not send Telegram OTP");
  }
}

export function isVerificationExpired(record: Pick<TelegramVerificationRecord, "expiresAt">) {
  return new Date(record.expiresAt).getTime() < Date.now();
}

export function isVerificationReady(record: TelegramVerificationRecord) {
  return Boolean(record.chatId && record.otpSentAt && !record.consumedAt && !isVerificationExpired(record));
}
