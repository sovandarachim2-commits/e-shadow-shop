import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { defaultPaymentMethods, normalizePaymentMethods } from "@/lib/payment-methods";
import { readSiteSetting, writeSiteSetting } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const paymentMethods = normalizePaymentMethods(await readSiteSetting("paymentMethods", defaultPaymentMethods));
  return NextResponse.json({ paymentMethods });
}

export async function PUT(request: NextRequest) {
  const auth = await requireRole(request, [Role.ADMIN]);
  if (auth.response) return auth.response;

  const body = await request.json().catch(() => null);
  const paymentMethods = normalizePaymentMethods(body?.paymentMethods);
  await writeSiteSetting("paymentMethods", paymentMethods);
  return NextResponse.json({ paymentMethods });
}
