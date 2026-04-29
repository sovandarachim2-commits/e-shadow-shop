import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authCookie, signToken } from "@/lib/auth";
import { isGoogleAuthConfigured, verifyGoogleIdToken } from "@/lib/google-auth";

function buildUsernameSeed(email: string, name: string) {
  const emailSeed = email.split("@")[0] || "";
  const nameSeed = name.toLowerCase().replace(/[^a-z0-9_]+/g, "_");
  const seed = (nameSeed || emailSeed.toLowerCase().replace(/[^a-z0-9_]+/g, "_") || "shadow_user").replace(/^_+|_+$/g, "");
  return seed.slice(0, 24) || "shadow_user";
}

async function generateUniqueUsername(email: string, name: string) {
  const base = buildUsernameSeed(email, name);

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const suffix = attempt === 0 ? "" : `_${attempt + 1}`;
    const candidate = `${base}${suffix}`.slice(0, 30);
    const existing = await prisma.user.findUnique({ where: { username: candidate } });
    if (!existing) return candidate;
  }

  return `${base.slice(0, 18)}_${crypto.randomBytes(4).toString("hex")}`.slice(0, 30);
}

export async function POST(request: Request) {
  if (!isGoogleAuthConfigured()) {
    return NextResponse.json({ message: "Google sign-in is not configured yet" }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const credential = String(body.credential || "").trim();
  if (!credential) {
    return NextResponse.json({ message: "Google credential is required" }, { status: 400 });
  }

  const profile = await verifyGoogleIdToken(credential);
  if (!profile) {
    return NextResponse.json({ message: "Could not verify Google account" }, { status: 401 });
  }

  let user = await prisma.user.findUnique({ where: { email: profile.email } });
  if (!user) {
    const username = await generateUniqueUsername(profile.email, profile.name);
    const password = await bcrypt.hash(crypto.randomUUID(), 10);

    user = await prisma.user.create({
      data: {
        name: profile.name,
        username,
        email: profile.email,
        password
      }
    });
  }

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
