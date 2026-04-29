import { NextRequest, NextResponse } from "next/server";
import {
  findActiveUnlinkedTelegramVerifications,
  findLatestActiveUnlinkedTelegramVerificationByPhone,
  formatTelegramPhoneText,
  findFirstLinkedPhoneForChat,
  findTelegramSubscriberByChatId,
  findTelegramVerificationByToken,
  getTelegramWebhookSecret,
  isTelegramPhoneText,
  isTelegramConfigured,
  isVerificationExpired,
  markTelegramOtpSent,
  markTelegramVerificationChatLinked,
  normalizeTelegramPhone,
  sendTelegramOtpMessage,
  upsertTelegramSubscriber
} from "@/lib/telegram-otp";

type TelegramUpdate = {
  message?: {
    text?: string;
    chat?: { id?: number | string };
    from?: { username?: string; first_name?: string };
    contact?: { phone_number?: string };
  };
};

export async function POST(request: NextRequest) {
  const configuredSecret = getTelegramWebhookSecret();
  const providedSecret = request.nextUrl.searchParams.get("secret") || request.headers.get("x-telegram-bot-api-secret-token") || "";
  if (configuredSecret && configuredSecret !== providedSecret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  if (!isTelegramConfigured()) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  const update = await request.json().catch(() => ({} as TelegramUpdate));
  const text = update.message?.text || "";
  const chatId = update.message?.chat?.id;
  const telegramUsername = update.message?.from?.username || null;
  const firstName = update.message?.from?.first_name || null;
  const contactPhone = update.message?.contact?.phone_number || "";

  if (!chatId) {
    return NextResponse.json({ ok: true });
  }

  if (text === "/start") {
    const existingSubscriber = await findTelegramSubscriberByChatId(String(chatId));
    const canonicalPhone = await findFirstLinkedPhoneForChat(String(chatId));
    const knownPhone = canonicalPhone || (existingSubscriber?.phone ? normalizeTelegramPhone(existingSubscriber.phone) : "");

    if (knownPhone) {
      const matchingPending = await findLatestActiveUnlinkedTelegramVerificationByPhone(knownPhone);
      if (matchingPending) {
        await markTelegramVerificationChatLinked({
          verificationToken: matchingPending.verificationToken,
          chatId: String(chatId),
          telegramUsername,
          phone: knownPhone
        });
        await sendTelegramOtpMessage({
          chatId: String(chatId),
          otpCode: matchingPending.otpCode,
          firstName,
          displayName: matchingPending.username
        });
        await markTelegramOtpSent(matchingPending.verificationToken);
        return NextResponse.json({ ok: true });
      }
    }

    const pendingVerifications = await findActiveUnlinkedTelegramVerifications(3);
    if (pendingVerifications.length === 1) {
      const pending = pendingVerifications[0];
      await markTelegramVerificationChatLinked({
        verificationToken: pending.verificationToken,
        chatId: String(chatId),
        telegramUsername,
        phone: pending.phone
      });
      await sendTelegramOtpMessage({
        chatId: String(chatId),
        otpCode: pending.otpCode,
        firstName,
        displayName: pending.username
      });
      await markTelegramOtpSent(pending.verificationToken);
      return NextResponse.json({ ok: true });
    }

    await upsertTelegramSubscriber({
      chatId: String(chatId),
      telegramUsername
    });
    await sendTelegramTextMessage(
      String(chatId),
      [
        `Hi ${firstName?.trim() || "there"}!`,
        "Telegram is connected for Shadow OTP.",
        "Return to the register page and tap Send OTP.",
        "If this is your first time, open the bot from the register page link and press Start there."
      ].join("\n")
    );
    return NextResponse.json({ ok: true });
  }

  if (contactPhone || isTelegramPhoneText(text)) {
    const normalizedPhone = contactPhone ? formatTelegramPhoneText(contactPhone) : formatTelegramPhoneText(text);
    const canonicalPhone = await findFirstLinkedPhoneForChat(String(chatId));
    if (canonicalPhone && canonicalPhone !== normalizedPhone) {
      await sendTelegramTextMessage(
        String(chatId),
        "This Telegram account is already linked to another phone number. Please use the original linked phone for OTP."
      );
      return NextResponse.json({ ok: true });
    }

    await upsertTelegramSubscriber({
      chatId: String(chatId),
      telegramUsername,
      phone: normalizedPhone
    });
    await sendTelegramTextMessage(
      String(chatId),
      "Your phone number is linked. Future registration OTPs can be sent here automatically."
    );
    return NextResponse.json({ ok: true });
  }

  if (!text.startsWith("/start verify_")) {
    return NextResponse.json({ ok: true });
  }

  const verificationPayload = text.replace("/start verify_", "").trim();
  const [verificationToken, linkedPhone = ""] = verificationPayload.split("_");
  const record = await findTelegramVerificationByToken(verificationToken);
  if (!record || record.consumedAt || isVerificationExpired(record)) {
    return NextResponse.json({ ok: true });
  }

  const normalizedLinkedPhone = normalizeTelegramPhone(linkedPhone || record.phone);
  const existingSubscriber = await findTelegramSubscriberByChatId(String(chatId));
  const canonicalPhone = await findFirstLinkedPhoneForChat(String(chatId));
  const subscriberPhone = existingSubscriber?.phone ? normalizeTelegramPhone(existingSubscriber.phone) : null;

  if ((canonicalPhone && canonicalPhone !== normalizedLinkedPhone) || (subscriberPhone && subscriberPhone !== normalizedLinkedPhone)) {
    await sendTelegramTextMessage(
      String(chatId),
      "This Telegram account is already linked to another phone number. Please use the correct Telegram account for this registration."
    );
    return NextResponse.json({ ok: true });
  }

  await markTelegramVerificationChatLinked({
    verificationToken,
    chatId: String(chatId),
    telegramUsername,
    phone: normalizedLinkedPhone
  });

  await sendTelegramOtpMessage({
    chatId: String(chatId),
    otpCode: record.otpCode,
    firstName
  });
  await markTelegramOtpSent(verificationToken);

  return NextResponse.json({ ok: true });
}

async function sendTelegramTextMessage(chatId: string, text: string) {
  const response = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text })
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(errorText || "Could not send Telegram message");
  }
}
