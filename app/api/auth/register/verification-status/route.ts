import { NextRequest, NextResponse } from "next/server";
import { findTelegramVerificationByToken, isVerificationExpired } from "@/lib/telegram-otp";

export async function GET(request: NextRequest) {
  const verificationToken = request.nextUrl.searchParams.get("token") || "";
  if (!verificationToken) return NextResponse.json({ message: "Verification token is required" }, { status: 400 });

  const record = await findTelegramVerificationByToken(verificationToken);
  if (!record || record.consumedAt) return NextResponse.json({ message: "Verification not found" }, { status: 404 });

  return NextResponse.json({
    botConnected: Boolean(record.chatId),
    otpSent: Boolean(record.otpSentAt),
    verified: Boolean(record.verifiedAt),
    expired: isVerificationExpired(record),
    expiresAt: new Date(record.expiresAt).toISOString()
  });
}
