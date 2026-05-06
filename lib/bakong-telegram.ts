import { readFile } from "node:fs/promises";
import path from "node:path";

type BakongTelegramConfig = {
  telegram_bot_token?: string;
  telegram_payment_bot_token?: string;
  telegram_order_bot_token?: string;
  telegram_group_chat_id?: string;
  telegram_payment_group_chat_id?: string;
  telegram_order_group_chat_id?: string;
  telegram_payment_topic_id?: string | number;
  telegram_order_topic_id?: string | number;
};

type PaymentNotificationInput = {
  customerName?: string | null;
  email?: string | null;
  amount: number;
  currency: string;
  transactionId: string;
  paidAt: Date;
};

type OrderNotificationItem = {
  name: string;
  quantity: number;
  lineTotal: number;
};

type OrderNotificationInput = {
  orderCode: string;
  customerName: string;
  phone: string;
  location: string;
  currency: string;
  deliveryCost: number;
  items: OrderNotificationItem[];
  discount: number;
  total: number;
  status: string;
};

async function readBakongTelegramConfig() {
  const configPath = path.join(
    process.cwd(),
    "Bakong API QR Generate AND Auto Check Payment",
    "QR_Bakong_Generator",
    "config.json"
  );

  const configText = await readFile(configPath, "utf8");
  return JSON.parse(configText) as BakongTelegramConfig;
}

function resolveTelegramBotToken(config: BakongTelegramConfig) {
  return (
    process.env.BAKONG_TELEGRAM_BOT_TOKEN ||
    process.env.TELEGRAM_BOT_TOKEN ||
    config.telegram_bot_token ||
    ""
  );
}

function resolvePaymentBotToken(config: BakongTelegramConfig) {
  return (
    process.env.BAKONG_TELEGRAM_PAYMENT_BOT_TOKEN ||
    process.env.BAKONG_TELEGRAM_BOT_TOKEN ||
    process.env.TELEGRAM_PAYMENT_BOT_TOKEN ||
    process.env.TELEGRAM_BOT_TOKEN ||
    config.telegram_payment_bot_token ||
    config.telegram_bot_token ||
    ""
  );
}

function resolveOrderBotToken(config: BakongTelegramConfig) {
  return (
    process.env.BAKONG_TELEGRAM_ORDER_BOT_TOKEN ||
    process.env.BAKONG_TELEGRAM_BOT_TOKEN ||
    process.env.TELEGRAM_ORDER_BOT_TOKEN ||
    process.env.TELEGRAM_BOT_TOKEN ||
    config.telegram_order_bot_token ||
    config.telegram_bot_token ||
    ""
  );
}

function resolvePaymentGroupChatId(config: BakongTelegramConfig) {
  return (
    process.env.BAKONG_TELEGRAM_PAYMENT_GROUP_CHAT_ID ||
    process.env.BAKONG_TELEGRAM_GROUP_CHAT_ID ||
    process.env.TELEGRAM_PAYMENT_GROUP_CHAT_ID ||
    process.env.TELEGRAM_GROUP_CHAT_ID ||
    config.telegram_payment_group_chat_id ||
    config.telegram_group_chat_id ||
    ""
  );
}

function resolveOrderGroupChatId(config: BakongTelegramConfig) {
  return (
    process.env.BAKONG_TELEGRAM_ORDER_GROUP_CHAT_ID ||
    process.env.BAKONG_TELEGRAM_GROUP_CHAT_ID ||
    process.env.TELEGRAM_ORDER_GROUP_CHAT_ID ||
    process.env.TELEGRAM_GROUP_CHAT_ID ||
    config.telegram_order_group_chat_id ||
    config.telegram_group_chat_id ||
    ""
  );
}

function parseTopicId(value: string | undefined) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function resolvePaymentTopicId(config: BakongTelegramConfig) {
  return parseTopicId(
    process.env.BAKONG_TELEGRAM_PAYMENT_TOPIC_ID ||
      process.env.TELEGRAM_PAYMENT_TOPIC_ID ||
      (config.telegram_payment_topic_id != null ? String(config.telegram_payment_topic_id) : "")
  );
}

function resolveOrderTopicId(config: BakongTelegramConfig) {
  return parseTopicId(
    process.env.BAKONG_TELEGRAM_ORDER_TOPIC_ID ||
      process.env.TELEGRAM_ORDER_TOPIC_ID ||
      (config.telegram_order_topic_id != null ? String(config.telegram_order_topic_id) : "")
  );
}

function formatAmount(amount: number, currency: string) {
  if (currency.toUpperCase() === "USD") return `$${amount.toFixed(2).replace(/\.00$/, "")}`;
  return `${amount.toFixed(2).replace(/\.00$/, "")} ${currency.toUpperCase()}`;
}

function formatPaidTime(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Phnom_Penh",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });

  const parts = formatter.formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value || "";
  return `${value("day")}-${value("month")}-${value("year")} | ${value("hour")}:${value("minute")}:${value("second")} ${value("dayPeriod").toUpperCase()}`;
}

export async function sendBakongPaymentSuccessNotification(input: PaymentNotificationInput) {
  const config = await readBakongTelegramConfig();
  const botToken = resolvePaymentBotToken(config);
  const chatId = resolvePaymentGroupChatId(config);
  const topicId = resolvePaymentTopicId(config);

  if (!botToken || !chatId) {
    return { ok: false, skipped: true, reason: "Telegram group notification is not configured" as const };
  }

  const text = [
    "💳 Bakong Payment Notification:",
    `🧑 Customer: ${input.customerName?.trim() || "Unknown customer"}`,
    `👤 Email: ${input.email?.trim() || "No email"}`,
    `💰 Amount: ${formatAmount(input.amount, input.currency)}`,
    `🔢 Transaction ID: ${input.transactionId}`,
    `🕓 Time: ${formatPaidTime(input.paidAt)}`,
    "✅ Status: Payment Successful"
  ].join("\n");

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      ...(topicId ? { message_thread_id: topicId } : {}),
      text
    })
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(errorText || "Could not send Telegram group payment notification");
  }

  return { ok: true, skipped: false };
}

export async function sendOrderCompletionNotification(input: OrderNotificationInput) {
  const config = await readBakongTelegramConfig();
  const botToken = resolveOrderBotToken(config);
  const chatId = resolveOrderGroupChatId(config);
  const topicId = resolveOrderTopicId(config);

  if (!botToken || !chatId) {
    return { ok: false, skipped: true, reason: "Telegram group notification is not configured" as const };
  }

  const itemLines = input.items.length
    ? input.items.map((item) => `- ${item.name} x ${item.quantity} = ${formatAmount(item.lineTotal, input.currency)}`)
    : ["- No items"];

  const text = [
    `New order: ${input.orderCode}`,
    "",
    `Customer: ${input.customerName}`,
    `Phone: ${input.phone}`,
    `Location: ${input.location}`,
    "",
    `Delivery Cost: ${formatAmount(input.deliveryCost, input.currency)}`,
    "Items:",
    ...itemLines,
    `Discount: ${formatAmount(input.discount, input.currency)}`,
    `Total: ${formatAmount(input.total, input.currency)}`,
    `Status: ${input.status}`
  ].join("\n");

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      ...(topicId ? { message_thread_id: topicId } : {}),
      text
    })
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(errorText || "Could not send Telegram order completion notification");
  }

  return { ok: true, skipped: false };
}
