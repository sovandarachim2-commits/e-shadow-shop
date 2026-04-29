import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function productErrorResponse(error: unknown, fallbackMessage: string) {
  if (error instanceof ZodError) {
    return NextResponse.json({ message: error.issues[0]?.message || "Invalid product data" }, { status: 400 });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return NextResponse.json({ message: "Product name already exists" }, { status: 409 });
  }

  return NextResponse.json({ message: fallbackMessage }, { status: 500 });
}
