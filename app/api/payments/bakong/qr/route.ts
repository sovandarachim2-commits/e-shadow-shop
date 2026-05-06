import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateBakongQr } from "@/lib/bakong-cli";
import { getAuthUser } from "@/lib/auth";
import { createBakongPayment } from "@/lib/bakong-payment-store";
import { defaultPaymentMethods, normalizePaymentMethods } from "@/lib/payment-methods";
import { resolveOrderPricing } from "@/lib/order-pricing";
import { readSiteSetting } from "@/lib/site-settings";

export const runtime = "nodejs";

const qrRequestSchema = z.object({
  customerName: z.string().min(2),
  phone: z.string().min(6),
  address: z.string().min(8),
  province: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  contactTelegram: z.boolean().default(false),
  items: z.array(
    z.object({
      productId: z.string(),
      quantity: z.number().int().positive()
    })
  ).min(1)
});

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ message: "Please login before checkout" }, { status: 401 });

  const paymentMethods = normalizePaymentMethods(await readSiteSetting("paymentMethods", defaultPaymentMethods));
  if (!paymentMethods[0]?.isActive) {
    return NextResponse.json({ message: "Bakong payment is currently unavailable" }, { status: 400 });
  }

  const body = qrRequestSchema.parse(await request.json());
  const pricing = await resolveOrderPricing(body.items);
  if (!pricing) {
    return NextResponse.json({ message: "One or more products are no longer available" }, { status: 400 });
  }

  try {
    const payment = await generateBakongQr(pricing.total);
    const paymentRecord = await createBakongPayment({
      customerId: user.id,
      customerName: body.customerName,
      phone: body.phone,
      address: body.address,
      province: body.province ?? null,
      note: body.note ?? null,
      contactTelegram: body.contactTelegram,
      md5: payment.md5,
      qrUrl: payment.qr,
      currency: payment.currency,
      amount: payment.amount,
      subtotal: pricing.subtotal,
      deliveryFee: pricing.deliveryFee,
      total: pricing.total,
      expiresInMinutes: payment.expiresInMinutes
    });

    return NextResponse.json({
      payment: {
        paymentId: paymentRecord?.id,
        ...payment,
        subtotal: pricing.subtotal,
        deliveryFee: pricing.deliveryFee,
        total: pricing.total
      }
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Could not generate Bakong QR" },
      { status: 500 }
    );
  }
}
