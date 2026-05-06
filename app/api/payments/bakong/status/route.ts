import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getBakongPaymentById, getBakongPaymentByMd5, updateBakongPaymentStatus } from "@/lib/bakong-payment-store";
import { checkBakongStatus } from "@/lib/bakong-cli";
import { sendBakongPaymentSuccessNotification } from "@/lib/bakong-telegram";

export const runtime = "nodejs";

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
    const payment = await checkBakongStatus(paymentRecord.md5);
    if (payment.success === false) {
      await updateBakongPaymentStatus({
        id: paymentRecord.id,
        status: "ERROR",
        lastError: payment.error || "Could not check payment status"
      });
      return NextResponse.json(payment, { status: 500 });
    }

    if (payment.status === "PAID") {
      const paidAt = paymentRecord.paidAt || new Date();
      await updateBakongPaymentStatus({
        id: paymentRecord.id,
        status: "PAID",
        lastError: null,
        paidAt
      });
      if (paymentRecord.status !== "PAID") {
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
      }
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
    await updateBakongPaymentStatus({
      id: paymentRecord.id,
      status: "ERROR",
      lastError: error instanceof Error ? error.message : "Could not check payment status"
    });
    return NextResponse.json(
      { success: false, status: "UNPAID", message: error instanceof Error ? error.message : "Could not check payment status" },
      { status: 500 }
    );
  }
}
