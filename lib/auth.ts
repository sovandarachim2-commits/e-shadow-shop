import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const JWT_SECRET = process.env.JWT_SECRET || "development-secret-change-me";

export type JwtPayload = {
  id: string;
  role: Role;
  email?: string | null;
};

export function signToken(payload: JwtPayload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export async function getAuthUser(request: NextRequest) {
  const bearer = request.headers.get("authorization")?.replace("Bearer ", "");
  const cookie = request.cookies.get("token")?.value;
  const token = bearer || cookie;
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  return prisma.user.findUnique({
    where: { id: payload.id },
    select: { id: true, name: true, username: true, phone: true, email: true, role: true, commissionRate: true }
  });
}

export async function requireRole(request: NextRequest, roles: Role[]) {
  const user = await getAuthUser(request);
  if (!user || !roles.includes(user.role)) {
    return { user: null, response: NextResponse.json({ message: "Unauthorized" }, { status: 401 }) };
  }
  return { user, response: null };
}

export function authCookie(token: string) {
  return {
    name: "token",
    value: token,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  };
}
