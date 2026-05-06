import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { readSiteSetting, writeSiteSetting } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

const defaultDeliveryDisplay = {
  productVisibility: {} as Record<string, boolean>,
  productLabels: {} as Record<string, string>
};

export async function GET() {
  const deliveryDisplay = await readSiteSetting("deliveryDisplay", defaultDeliveryDisplay);
  return NextResponse.json({ deliveryDisplay });
}

export async function PUT(request: NextRequest) {
  const auth = await requireRole(request, [Role.ADMIN]);
  if (auth.response) return auth.response;

  const body = await request.json();
  const deliveryDisplay = {
    productVisibility: typeof body.productVisibility === "object" && body.productVisibility
      ? Object.fromEntries(
          Object.entries(body.productVisibility).map(([productId, visible]) => [String(productId), Boolean(visible)])
        )
      : {},
    productLabels: typeof body.productLabels === "object" && body.productLabels
      ? Object.fromEntries(
          Object.entries(body.productLabels).map(([productId, label]) => [String(productId), typeof label === "string" ? label.trim() : ""])
        )
      : {}
  };

  await writeSiteSetting("deliveryDisplay", deliveryDisplay);
  return NextResponse.json({ deliveryDisplay });
}
