import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { authCookie, signToken } from "@/lib/auth";
import { loginSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const body = loginSchema.parse(await request.json());
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: body.identifier }, { username: body.identifier }]
      }
    });
    if (!user || !(await bcrypt.compare(body.password, user.password))) {
      return NextResponse.json({ message: "Invalid username/email or password" }, { status: 401 });
    }

    const session = { id: user.id, name: user.name, username: user.username, phone: user.phone, email: user.email, role: user.role, commissionRate: user.commissionRate };
    const token = signToken({ id: user.id, email: user.email, role: user.role });
    const response = NextResponse.json({ token, user: session });
    response.cookies.set(authCookie(token));
    return response;
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: "Please enter a valid username/email and password" }, { status: 400 });
    }

    return NextResponse.json({ message: "Login failed. Please try again." }, { status: 500 });
  }
}
