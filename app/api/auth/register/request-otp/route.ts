import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validators";
import { createTelegramVerification, isTelegramConfigured, markTelegramOtpSent, sendTelegramOtpMessage } from "@/lib/telegram-otp";

export async function POST(request: Request) {
  if (!isTelegramConfigured()) {
    return NextResponse.json({ message: "Telegram OTP is not configured yet" }, { status: 503 });
  }

  const body = registerSchema.parse(await request.json());
  const normalizedEmail = body.email?.trim() || null;
  const exists = await prisma.user.findFirst({
    where: {
      OR: [
        { username: body.username },
        { phone: body.phone },
        ...(normalizedEmail ? [{ email: normalizedEmail }] : [])
      ]
    }
  });

  if (exists?.phone === body.phone) return NextResponse.json({ message: "Phone number already registered" }, { status: 409 });
  if (normalizedEmail && exists?.email === normalizedEmail) return NextResponse.json({ message: "Email already registered" }, { status: 409 });
  if (exists?.username === body.username) return NextResponse.json({ message: "Username already registered" }, { status: 409 });

  const verification = await createTelegramVerification({
    phone: body.phone,
    username: body.username,
    email: normalizedEmail
  });
  if (verification.reusedChat && verification.chatId) {
    await sendTelegramOtpMessage({
      chatId: verification.chatId,
      otpCode: verification.otpCode,
      displayName: body.name
    });
    await markTelegramOtpSent(verification.verificationToken);
  }

  return NextResponse.json({
    verificationToken: verification.verificationToken,
    telegramUrl: verification.telegramUrl,
    expiresAt: verification.expiresAt.toISOString(),
    reusedChat: verification.reusedChat
  });
}
