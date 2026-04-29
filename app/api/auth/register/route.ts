import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authCookie, signToken } from "@/lib/auth";
import { consumeTelegramVerification, findTelegramVerificationByToken, isVerificationReady, markTelegramVerificationVerified } from "@/lib/telegram-otp";
import { registerWithOtpSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const body = registerWithOtpSchema.parse(await request.json());
  const normalizedEmail = body.email?.trim() || null;
  const verification = await findTelegramVerificationByToken(body.verificationToken);
  if (!verification || verification.consumedAt) {
    return NextResponse.json({ message: "Telegram verification was not found" }, { status: 400 });
  }
  if (!isVerificationReady(verification)) {
    return NextResponse.json({ message: "Start the Telegram bot first to receive your OTP" }, { status: 400 });
  }
  if (verification.phone !== body.phone) {
    return NextResponse.json({ message: "Phone number does not match the Telegram verification" }, { status: 400 });
  }
  if (verification.otpCode !== body.verificationCode) {
    return NextResponse.json({ message: "Invalid OTP code" }, { status: 400 });
  }

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

  await markTelegramVerificationVerified(body.verificationToken);

  const user = await prisma.user.create({
    data: {
      name: body.name,
      username: body.username,
      phone: body.phone,
      email: normalizedEmail,
      password: await bcrypt.hash(body.password, 10)
    },
    select: { id: true, name: true, username: true, phone: true, email: true, role: true, commissionRate: true }
  });
  await consumeTelegramVerification(body.verificationToken);
  const token = signToken({ id: user.id, email: user.email, role: user.role });
  const response = NextResponse.json({ token, user }, { status: 201 });
  response.cookies.set(authCookie(token));
  return response;
}
