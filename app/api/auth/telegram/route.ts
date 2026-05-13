import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authCookie, signToken } from "@/lib/auth";
import { isTelegramAuthConfigured, verifyTelegramLoginPayload, type TelegramLoginPayload } from "@/lib/telegram-auth";

type TelegramAuthAccountRow = {
  userId: string;
};

function displayNameFromTelegram(profile: TelegramLoginPayload) {
  return [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim() || profile.username || `Telegram ${profile.id}`;
}

function usernameSeedFromTelegram(profile: TelegramLoginPayload) {
  const seed = (profile.username || profile.first_name || `telegram_${profile.id}`)
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return (seed || `telegram_${profile.id}`).slice(0, 24);
}

async function ensureTelegramAuthAccountTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS TelegramAuthAccount (
      id VARCHAR(191) NOT NULL,
      userId VARCHAR(191) NOT NULL,
      telegramId VARCHAR(191) NOT NULL,
      telegramUsername VARCHAR(191) NULL,
      firstName VARCHAR(191) NULL,
      lastName VARCHAR(191) NULL,
      photoUrl TEXT NULL,
      authDate DATETIME(3) NULL,
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      UNIQUE KEY TelegramAuthAccount_telegramId_key (telegramId),
      KEY TelegramAuthAccount_userId_idx (userId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function findTelegramAccountUserId(telegramId: string) {
  await ensureTelegramAuthAccountTable();
  const rows = await prisma.$queryRawUnsafe<TelegramAuthAccountRow[]>(
    "SELECT userId FROM TelegramAuthAccount WHERE telegramId = ? LIMIT 1",
    telegramId
  );
  return rows[0]?.userId || null;
}

async function generateUniqueUsername(profile: TelegramLoginPayload) {
  const base = usernameSeedFromTelegram(profile);

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const suffix = attempt === 0 ? "" : `_${attempt + 1}`;
    const candidate = `${base}${suffix}`.slice(0, 30);
    const existing = await prisma.user.findUnique({ where: { username: candidate } });
    if (!existing) return candidate;
  }

  return `${base.slice(0, 18)}_${crypto.randomBytes(4).toString("hex")}`.slice(0, 30);
}

async function linkTelegramAccount(userId: string, profile: TelegramLoginPayload) {
  await ensureTelegramAuthAccountTable();
  const id = crypto.randomUUID();
  const authDate = new Date(Number(profile.auth_date) * 1000);

  await prisma.$executeRawUnsafe(
    `INSERT INTO TelegramAuthAccount
      (id, userId, telegramId, telegramUsername, firstName, lastName, photoUrl, authDate)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       userId = VALUES(userId),
       telegramUsername = VALUES(telegramUsername),
       firstName = VALUES(firstName),
       lastName = VALUES(lastName),
       photoUrl = VALUES(photoUrl),
       authDate = VALUES(authDate)`,
    id,
    userId,
    profile.id,
    profile.username || null,
    profile.first_name || null,
    profile.last_name || null,
    profile.photo_url || null,
    authDate
  );
}

export async function POST(request: Request) {
  if (!isTelegramAuthConfigured()) {
    return NextResponse.json({ message: "Telegram sign-in is not configured yet" }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const profile = verifyTelegramLoginPayload(body.authData);
  if (!profile) {
    return NextResponse.json({ message: "Could not verify Telegram account" }, { status: 401 });
  }

  let user = null;
  const linkedUserId = await findTelegramAccountUserId(profile.id);
  if (linkedUserId) {
    user = await prisma.user.findUnique({ where: { id: linkedUserId } });
  }

  if (!user) {
    const username = await generateUniqueUsername(profile);
    user = await prisma.user.create({
      data: {
        name: displayNameFromTelegram(profile),
        username,
        password: await bcrypt.hash(crypto.randomUUID(), 10)
      }
    });
  }

  await linkTelegramAccount(user.id, profile);

  const session = {
    id: user.id,
    name: user.name,
    username: user.username,
    phone: user.phone,
    email: user.email,
    role: user.role,
    commissionRate: user.commissionRate
  };
  const token = signToken({ id: user.id, email: user.email, role: user.role });
  const response = NextResponse.json({ token, user: session });
  response.cookies.set(authCookie(token));
  return response;
}
