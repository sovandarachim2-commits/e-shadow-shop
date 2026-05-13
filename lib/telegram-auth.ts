import crypto from "node:crypto";

export type TelegramLoginPayload = {
  id: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: string;
  hash: string;
};

export function getTelegramAuthBotToken() {
  return process.env.TELEGRAM_BOT_TOKEN || "";
}

export function getTelegramAuthBotUsername() {
  return (process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "").replace(/^@/, "");
}

export function isTelegramAuthConfigured() {
  return Boolean(getTelegramAuthBotToken() && getTelegramAuthBotUsername());
}

function normalizePayload(input: unknown): TelegramLoginPayload | null {
  if (!input || typeof input !== "object") return null;
  const record = input as Record<string, unknown>;
  const id = String(record.id || "").trim();
  const authDate = String(record.auth_date || "").trim();
  const hash = String(record.hash || "").trim();

  if (!id || !authDate || !hash) return null;

  return {
    id,
    first_name: String(record.first_name || "").trim() || undefined,
    last_name: String(record.last_name || "").trim() || undefined,
    username: String(record.username || "").trim() || undefined,
    photo_url: String(record.photo_url || "").trim() || undefined,
    auth_date: authDate,
    hash
  };
}

export function verifyTelegramLoginPayload(input: unknown): TelegramLoginPayload | null {
  const payload = normalizePayload(input);
  const botToken = getTelegramAuthBotToken();
  if (!payload || !botToken) return null;

  const authTime = Number(payload.auth_date);
  if (!Number.isFinite(authTime) || Date.now() / 1000 - authTime > 86400) return null;

  const dataCheckString = Object.entries(payload)
    .filter(([key, value]) => key !== "hash" && value !== undefined && value !== "")
    .map(([key, value]) => `${key}=${value}`)
    .sort()
    .join("\n");

  const secretKey = crypto.createHash("sha256").update(botToken).digest();
  const expectedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(expectedHash, "hex"), Buffer.from(payload.hash, "hex")) ? payload : null;
  } catch {
    return null;
  }
}
