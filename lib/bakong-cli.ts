import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const phpPath = "C:\\xampp\\php\\php.exe";
const bakongGeneratorDir = path.join(process.cwd(), "Bakong API QR Generate AND Auto Check Payment", "QR_Bakong_Generator");

async function runBakongScript<T>(scriptName: string, args: string[]) {
  const scriptPath = path.join(bakongGeneratorDir, scriptName);
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
