import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const bakongGeneratorDir = path.join(process.cwd(), "Bakong API QR Generate AND Auto Check Payment", "QR_Bakong_Generator");

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

async function runBakongScript<T>(scriptName: string, args: string[]) {
  const scriptPath = path.join(bakongGeneratorDir, scriptName);

  // Production-safe mode: call external Bakong bridge APIs (for Vercel/serverless where php is unavailable).
  const qrApiUrl = (process.env.BAKONG_QR_API_URL || "").trim();
  const statusApiUrl = (process.env.BAKONG_STATUS_API_URL || "").trim();
  if (scriptName === "generate_checkout_qr.php" && qrApiUrl) {
    return runBakongHttpScript<T>(qrApiUrl, { amount: Number(args[0] || 0) }, "Could not contact Bakong payment service");
  }
  if (scriptName === "check_checkout_status.php" && statusApiUrl) {
    return runBakongHttpScript<T>(statusApiUrl, { md5: String(args[0] || "") }, "Could not check payment status");
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
        "Bakong service is not configured on this server. Set BAKONG_QR_API_URL and BAKONG_STATUS_API_URL for production."
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
