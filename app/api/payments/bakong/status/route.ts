import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BakongPaymentRecord, getBakongPaymentById, getBakongPaymentByMd5, linkBakongPaymentToOrder, updateBakongPaymentStatus } from "@/lib/bakong-payment-store";
import { checkBakongStatus } from "@/lib/bakong-cli";
import { sendBakongPaymentSuccessNotification, sendOrderCompletionNotification } from "@/lib/bakong-telegram";
import { bakongPaymentMethod } from "@/lib/payment-methods";
import { resolveOrderPricing } from "@/lib/order-pricing";

export const runtime = "nodejs";
export const preferredRegion = "sin1";

const savedCheckoutPayloadSchema = z.object({
  customerName: z.string().min(2),
  phone: z.string().min(6),
  address: z.string().min(8),
  province: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  contactTelegram: z.boolean().default(false),
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().int().positive()
  })).min(1)
});

function formatOrderCode(createdAt: Date, sequence: number) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Phnom_Penh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  const datePart = formatter.format(createdAt).replace(/-/g, "");
  return `LKM-${datePart}${String(sequence).padStart(4, "0")}`;
}

async function buildOrderCode(orderId: string, createdAt: Date) {
  const localDate = new Date(createdAt.toLocaleString("en-US", { timeZone: "Asia/Phnom_Penh" }));
  const startOfDay = new Date(localDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(localDate);
  endOfDay.setHours(23, 59, 59, 999);

  const offsetMinutes = -new Date().getTimezoneOffset();
  const utcStart = new Date(startOfDay.getTime() - offsetMinutes * 60 * 1000);
  const utcEnd = new Date(endOfDay.getTime() - offsetMinutes * 60 * 1000);

  const sequence = await prisma.order.count({
    where: {
      AND: [
        { createdAt: { gte: utcStart, lte: utcEnd } },
        {
          OR: [{ createdAt: { lt: createdAt } }, { createdAt, id: { lte: orderId } }]
        }
      ]
    }
  });

  return formatOrderCode(createdAt, Math.max(1, sequence));
}

async function completeOrderForPaidPayment(paymentRecord: BakongPaymentRecord, user: NonNullable<Awaited<ReturnType<typeof getAuthUser>>>) {
  if (paymentRecord.orderId) return paymentRecord.orderId;
  if (!paymentRecord.orderPayload) return null;

  const payload = savedCheckoutPayloadSchema.parse(JSON.parse(paymentRecord.orderPayload));
  const pricing = await resolveOrderPricing(payload.items);
  if (!pricing) throw new Error("One or more products are no longer available");

  const amountMatches = Math.abs(pricing.total - paymentRecord.total) < 0.01;
  if (!amountMatches) throw new Error("Payment amount does not match the current order total");

  const order = await prisma.order.create({
    data: {
      customerName: payload.customerName,
      phone: payload.phone,
      address: payload.address,
      province: payload.province ?? null,
      note: payload.note ?? null,
      contactTelegram: payload.contactTelegram,
      paymentMethod: bakongPaymentMethod.name,
      deliveryFee: pricing.deliveryFee,
      total: pricing.total,
      customerId: user.id,
      staffId: user.role === Role.STAFF ? user.id : undefined,
      items: {
        create: pricing.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price
        }))
      }
    },
    include: { items: { include: { product: true } } }
  });

  await linkBakongPaymentToOrder(paymentRecord.id, order.id);

  try {
    const orderCode = await buildOrderCode(order.id, order.createdAt);
    await sendOrderCompletionNotification({
      orderCode,
      customerName: order.customerName,
      phone: order.phone,
      location: [order.address, order.province].filter(Boolean).join(", "),
      currency: paymentRecord.currency,
      deliveryCost: Number(order.deliveryFee),
      items: order.items.map((item) => ({
        name: item.product?.name || "Product",
        quantity: item.quantity,
        lineTotal: Number(item.price) * item.quantity
      })),
      discount: pricing.discount,
      total: Number(order.total),
      status: "PAID"
    });
  } catch (notificationError) {
    console.error("Telegram order completion notification failed", notificationError);
  }

  return order.id;
}

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ success: false, status: "UNPAID", message: "Unauthorized" }, { status: 401 });

  const paymentId = String(request.nextUrl.searchParams.get("paymentId") || "").trim();
  const md5 = String(request.nextUrl.searchParams.get("md5") || "").trim().toLowerCase();
  const paymentRecord = paymentId
    ? await getBakongPaymentById(paymentId)
    : /^[a-f0-9]{32}$/.test(md5)
      ? await getBakongPaymentByMd5(md5)
      : null;

  if (!paymentRecord || paymentRecord.customerId !== user.id) {
    return NextResponse.json({ success: false, status: "UNPAID", message: "Payment record not found" }, { status: 404 });
  }

  try {
    if (paymentRecord.status === "PAID") {
      const orderId = await completeOrderForPaidPayment(paymentRecord, user);
      return NextResponse.json({ success: true, status: "PAID", paymentId: paymentRecord.id, orderId });
    }

    const payment = await checkBakongStatus(paymentRecord.md5);
    if (payment.success === false) {
      await updateBakongPaymentStatus({
        id: paymentRecord.id,
        status: "PENDING",
        lastError: payment.error || "Could not check payment status"
      });
      return NextResponse.json({
        success: true,
        status: "UNPAID",
        paymentId: paymentRecord.id,
        message: payment.error || "Still waiting for Bakong payment confirmation"
      });
    }

    if (payment.status === "PAID") {
      const paidAt = paymentRecord.paidAt || new Date();
      await updateBakongPaymentStatus({
        id: paymentRecord.id,
        status: "PAID",
        lastError: null,
        paidAt
      });
      try {
        await sendBakongPaymentSuccessNotification({
          customerName: paymentRecord.customerName,
          email: user.email,
          amount: paymentRecord.total,
          currency: paymentRecord.currency,
          transactionId: paymentRecord.md5,
          paidAt
        });
      } catch (notificationError) {
        console.error("Bakong Telegram group notification failed", notificationError);
      }
      const paidPaymentRecord = await getBakongPaymentById(paymentRecord.id);
      const orderId = paidPaymentRecord ? await completeOrderForPaidPayment(paidPaymentRecord, user) : null;
      return NextResponse.json({ ...payment, paymentId: paymentRecord.id, orderId });
    } else {
      await updateBakongPaymentStatus({
        id: paymentRecord.id,
        status: "PENDING",
        lastError: null,
        paidAt: null
      });
    }

    return NextResponse.json({ ...payment, paymentId: paymentRecord.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not check payment status";
    console.error("Bakong payment status check failed", {
      paymentId: paymentRecord.id,
      md5: paymentRecord.md5,
      message
    });

    await updateBakongPaymentStatus({
      id: paymentRecord.id,
      status: "PENDING",
      lastError: message
    });
    return NextResponse.json({
      success: true,
      status: "UNPAID",
      paymentId: paymentRecord.id,
      message: "Still checking Bakong payment confirmation"
    });
  }
}
