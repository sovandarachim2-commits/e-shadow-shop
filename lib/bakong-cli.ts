import { execFile } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

const bakongSdk = require("bakong-khqr") as {
  BakongKHQR: new () => { generateIndividual: (info: unknown) => unknown };
  IndividualInfo: new (
    bakongAccountID: string,
    merchantName: string,
    merchantCity: string,
    optional?: Record<string, unknown>
  ) => unknown;
};

const execFileAsync = promisify(execFile);
const bakongGeneratorDir = path.join(process.cwd(), "Bakong API QR Generate AND Auto Check Payment", "QR_Bakong_Generator");

type BakongRuntimeConfig = {
  token: string;
  statusUrl: string;
  accountId: string;
  merchantName: string;
  merchantCity: string;
  currency: "USD" | "KHR";
  expirationMinutes: number;
  qrSize: number;
};

let cachedBakongConfig: BakongRuntimeConfig | null = null;

function toNumber(input: unknown, fallback: number) {
  const value = Number(input);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function parseConfigFile() {
  const configPath = path.join(bakongGeneratorDir, "config.json");
  if (!existsSync(configPath)) return {} as Record<string, unknown>;

  try {
    return JSON.parse(readFileSync(configPath, "utf8")) as Record<string, unknown>;
  } catch {
    return {} as Record<string, unknown>;
  }
}

function loadBakongConfig() {
  if (cachedBakongConfig) return cachedBakongConfig;

  const fileConfig = parseConfigFile();
  const env = process.env;
  const currencyRaw = String(env.BAKONG_CURRENCY || fileConfig.currency || "USD").trim().toUpperCase();

  cachedBakongConfig = {
    token: String(env.BAKONG_TOKEN || fileConfig.token || "").trim(),
    statusUrl: String(env.BAKONG_STATUS_URL || fileConfig.status_url || "https://api-bakong.nbc.gov.kh/v1/check_transaction_by_md5").trim(),
    accountId: String(env.BAKONG_ACCOUNT_ID || fileConfig.bakong_account_id || "").trim(),
    merchantName: String(env.BAKONG_MERCHANT_NAME || fileConfig.merchant_name || "").trim(),
    merchantCity: String(env.BAKONG_MERCHANT_CITY || fileConfig.merchant_city || "").trim(),
    currency: currencyRaw === "KHR" ? "KHR" : "USD",
    expirationMinutes: toNumber(env.BAKONG_EXPIRATION_MINUTES || fileConfig.expiration_minutes, 2),
    qrSize: toNumber(env.BAKONG_QR_SIZE || fileConfig.qr_size, 220)
  };

  return cachedBakongConfig;
}

function isLocalHostUrl(url: string) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return hostname === "localhost" || hostname === "0.0.0.0" || hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

function isNbcStatusUrl(url: string) {
  return /api-bakong\.nbc\.gov\.kh\/v1\/check_transaction_by_md5/i.test(url);
}

function canUseBridgeUrl(url: string) {
  if (!url) return false;
  if (process.env.NODE_ENV === "production" && isLocalHostUrl(url)) return false;
  return true;
}

function resolvePhpExecutable() {
  const configured = (process.env.BAKONG_PHP_PATH || "").trim();
  if (configured) return configured;

  const xamppPhp = "C:\\xampp\\php\\php.exe";
  if (process.platform === "win32" && existsSync(xamppPhp)) return xamppPhp;

  // Use PATH lookup for Linux/macOS/Vercel environments where php may be installed globally.
  return "php";
}

async function parseJsonResponse<T>(response: Response, fallbackMessage: string) {
  const raw = await response.text();
  if (!raw.trim()) {
    throw new Error(fallbackMessage);
  }

  let parsed: T & { success?: boolean; error?: string };
  try {
    parsed = JSON.parse(raw) as T & { success?: boolean; error?: string };
  } catch {
    throw new Error(fallbackMessage);
  }

  if (parsed.success === false) {
    throw new Error(parsed.error || fallbackMessage);
  }

  return parsed as T;
}

async function runBakongHttpScript<T>(url: string, payload: Record<string, unknown>, fallbackMessage: string) {
  const postResponse = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify(payload)
  });

  if (postResponse.ok) {
    return parseJsonResponse<T>(postResponse, fallbackMessage);
  }

  // Compatibility fallback for simple PHP bridges that expect query params via GET.
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(payload)) {
    query.set(key, String(value ?? ""));
  }
  const separator = url.includes("?") ? "&" : "?";
  const getResponse = await fetch(`${url}${separator}${query.toString()}`, {
    method: "GET",
    cache: "no-store"
  });

  return parseJsonResponse<T>(getResponse, fallbackMessage);
}

function requireBakongMerchantConfig() {
  const config = loadBakongConfig();
  if (!config.accountId || !config.merchantName || !config.merchantCity) {
    throw new Error("Bakong merchant config is missing. Set BAKONG_ACCOUNT_ID, BAKONG_MERCHANT_NAME and BAKONG_MERCHANT_CITY.");
  }
  return config;
}

async function generateBakongQrNative(amount: number): Promise<BakongQrResult> {
  const config = requireBakongMerchantConfig();
  const normalizedAmount = Number(amount || 0);
  if (normalizedAmount <= 0) {
    throw new Error("Invalid payment amount");
  }

  const currencyCode = config.currency === "KHR" ? 116 : 840;
  const expirationTimestamp = Date.now() + config.expirationMinutes * 60 * 1000;
  const info = new bakongSdk.IndividualInfo(config.accountId, config.merchantName, config.merchantCity, {
    currency: currencyCode,
    amount: normalizedAmount,
    expirationTimestamp
  });

  const khqr = new bakongSdk.BakongKHQR();
  const response = khqr.generateIndividual(info) as {
    status?: { code?: number; message?: string | null };
    data?: { qr?: string; md5?: string };
  };

  if (response?.status?.code !== 0 || !response?.data?.qr || !response?.data?.md5) {
    throw new Error(response?.status?.message || "Could not generate Bakong QR");
  }

  const qrPayload = encodeURIComponent(response.data.qr);
  return {
    success: true,
    qr: `https://api.qrserver.com/v1/create-qr-code/?size=${config.qrSize}x${config.qrSize}&data=${qrPayload}`,
    md5: response.data.md5,
    amount: Number(normalizedAmount.toFixed(2)),
    currency: config.currency,
    merchantName: config.merchantName,
    expiresInMinutes: config.expirationMinutes
  };
}

async function checkBakongStatusNative(md5: string, overrideUrl?: string): Promise<BakongStatusResult> {
  const config = loadBakongConfig();
  const statusUrl = String(overrideUrl || config.statusUrl || "").trim();
  const token = config.token;

  if (!statusUrl || !token) {
    throw new Error("Bakong status config is missing. Set BAKONG_TOKEN and BAKONG_STATUS_URL.");
  }

  const response = await fetch(statusUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    cache: "no-store",
    body: JSON.stringify({ md5 })
  });

  const raw = await response.text();
  if (!raw.trim()) {
    throw new Error("Could not check payment status");
  }

  let parsed: { responseCode?: number; data?: { acknowledgedDateMs?: number | string } };
  try {
    parsed = JSON.parse(raw) as { responseCode?: number; data?: { acknowledgedDateMs?: number | string } };
  } catch {
    throw new Error("Invalid response from Bakong status service");
  }

  const paid = parsed.responseCode === 0 && Boolean(parsed.data?.acknowledgedDateMs);
  return {
    success: true,
    status: paid ? "PAID" : "UNPAID"
  };
}

async function runBakongScript<T>(scriptName: string, args: string[]) {
  const scriptPath = path.join(bakongGeneratorDir, scriptName);

  // Optional bridge mode for externally hosted PHP APIs.
  const qrApiUrl = (process.env.BAKONG_QR_API_URL || "").trim();
  const statusApiUrl = (process.env.BAKONG_STATUS_API_URL || "").trim();
  if (scriptName === "generate_checkout_qr.php" && canUseBridgeUrl(qrApiUrl)) {
    return runBakongHttpScript<T>(qrApiUrl, { amount: Number(args[0] || 0) }, "Could not contact Bakong payment service");
  }
  if (scriptName === "check_checkout_status.php" && canUseBridgeUrl(statusApiUrl) && !isNbcStatusUrl(statusApiUrl)) {
    return runBakongHttpScript<T>(statusApiUrl, { md5: String(args[0] || "") }, "Could not check payment status");
  }

  // Native Node mode (works on Vercel without PHP runtime).
  if (scriptName === "generate_checkout_qr.php") {
    return generateBakongQrNative(Number(args[0] || 0)) as Promise<T>;
  }
  if (scriptName === "check_checkout_status.php") {
    const md5 = String(args[0] || "").trim().toLowerCase();
    return checkBakongStatusNative(md5, isNbcStatusUrl(statusApiUrl) ? statusApiUrl : undefined) as Promise<T>;
  }

  if (!existsSync(scriptPath)) {
    throw new Error("Bakong script is missing on the server");
  }

  const phpPath = resolvePhpExecutable();
  let stdout = "";
  let stderr = "";

  try {
    const result = await execFileAsync(phpPath, [scriptPath, ...args], {
      cwd: bakongGeneratorDir,
      windowsHide: true
    });
    stdout = result.stdout;
    stderr = result.stderr;
  } catch (error) {
    const execError = error as Error & { stdout?: string; stderr?: string };
    const isMissingPhp = execError.message.includes("ENOENT") || execError.message.includes("not recognized");
    if (isMissingPhp) {
      throw new Error(
        "Bakong service is not configured on this server. Set BAKONG_ACCOUNT_ID, BAKONG_MERCHANT_NAME, BAKONG_MERCHANT_CITY and BAKONG_TOKEN."
      );
    }
    stdout = execError.stdout || "";
    stderr = execError.stderr || "";
  }

  const payload = (stdout || stderr || "").trim();
  if (!payload) {
    throw new Error("Could not contact Bakong payment service");
  }

  const result = JSON.parse(payload) as T & { success?: boolean; error?: string };
  if (result.success === false) {
    throw new Error(result.error || "Bakong request failed");
  }
  return result as T;
}

export type BakongQrResult = {
  success: true;
  qr: string;
  md5: string;
  amount: number;
  currency: string;
  merchantName: string;
  expiresInMinutes: number;
};

export type BakongStatusResult = {
  success: boolean;
  status: "PAID" | "UNPAID";
  error?: string;
};

export function generateBakongQr(amount: number) {
  return runBakongScript<BakongQrResult>("generate_checkout_qr.php", [String(amount)]);
}

export function checkBakongStatus(md5: string) {
  return runBakongScript<BakongStatusResult>("check_checkout_status.php", [md5]);
}
