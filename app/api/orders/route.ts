import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUser, requireRole } from "@/lib/auth";
import { getBakongPaymentById, getBakongPaymentStatusesByOrderIds, linkBakongPaymentToOrder } from "@/lib/bakong-payment-store";
import { sendOrderCompletionNotification } from "@/lib/bakong-telegram";
import { resolveOrderPricing } from "@/lib/order-pricing";
import { bakongPaymentMethod } from "@/lib/payment-methods";
import { orderSchema } from "@/lib/validators";

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

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const isPrivileged = user.role === Role.ADMIN || user.role === Role.STAFF;
  const orders = await prisma.order.findMany({
    where: isPrivileged ? undefined : { customerId: user.id },
    include: {
      items: isPrivileged
        ? { select: { id: true } }
        : {
            select: {
              id: true,
              quantity: true,
              price: true,
              product: { select: { id: true, name: true, brand: true, imageUrl: true } }
            }
          },
      staff: isPrivileged ? false : { select: { name: true, commissionRate: true } }
    },
    orderBy: { createdAt: "desc" }
  });

  if (isPrivileged) {
    return NextResponse.json({ orders });
  }

  const paymentStatuses = await getBakongPaymentStatusesByOrderIds(orders.map((order) => order.id));
  return NextResponse.json({
    orders: orders.map((order) => ({
      ...order,
      paymentStatus: paymentStatuses.get(order.id) === "PAID" ? "COMPLETED" : "PENDING"
    }))
  });
}

export async function POST(request: NextRequest) {
  const body = orderSchema.parse(await request.json());
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ message: "Please login before checkout" }, { status: 401 });
  if (!body.paymentId) {
    return NextResponse.json({ message: "Payment verification is required before checkout" }, { status: 400 });
  }

  const paymentRecord = await getBakongPaymentById(body.paymentId);
  if (!paymentRecord || paymentRecord.customerId !== user.id) {
    return NextResponse.json({ message: "Payment record was not found" }, { status: 404 });
  }
  if (paymentRecord.status !== "PAID") {
    return NextResponse.json({ message: "Payment has not been confirmed yet" }, { status: 400 });
  }
  if (paymentRecord.orderId) {
    const existingOrder = await prisma.order.findUnique({
      where: { id: paymentRecord.orderId },
      include: { items: { include: { product: true } } }
    });
    if (existingOrder) {
      return NextResponse.json({ order: existingOrder, alreadyCreated: true });
    }
    return NextResponse.json({ message: "This payment is already linked to an order" }, { status: 400 });
  }

  const pricing = await resolveOrderPricing(body.items);
  if (!pricing) {
    return NextResponse.json({ message: "One or more products are no longer available" }, { status: 400 });
  }

  const order = await prisma.order.create({
    data: {
      customerName: body.customerName,
      phone: body.phone,
      address: body.address,
      province: body.province,
      note: body.note,
      contactTelegram: body.contactTelegram,
      paymentMethod: bakongPaymentMethod.name,
      deliveryFee: pricing.deliveryFee,
      total: pricing.total,
      customerId: user.id,
      staffId: user?.role === Role.STAFF ? user.id : undefined,
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
  await linkBakongPaymentToOrder(body.paymentId, order.id);

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
      status: paymentRecord.status === "PAID" ? "PAID" : "UNPAID"
    });
  } catch (notificationError) {
    console.error("Telegram order completion notification failed", notificationError);
  }

  return NextResponse.json({ order }, { status: 201 });
}
