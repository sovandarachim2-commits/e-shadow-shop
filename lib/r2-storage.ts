import crypto from "crypto";

type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicUrl: string;
  endpoint: string;
  region: string;
};

function value(name: string) {
  return process.env[name]?.trim() || "";
}

export function getR2Config(): R2Config | null {
  const accountId = value("R2_ACCOUNT_ID");
  const accessKeyId = value("R2_ACCESS_KEY_ID");
  const secretAccessKey = value("R2_SECRET_ACCESS_KEY");
  const bucketName = value("R2_BUCKET_NAME");
  const publicUrl = value("R2_PUBLIC_URL");

  if (!accessKeyId || !secretAccessKey || !bucketName || !publicUrl || (!accountId && !value("R2_ENDPOINT"))) return null;

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
    publicUrl: publicUrl.replace(/\/+$/, ""),
    endpoint: value("R2_ENDPOINT").replace(/\/+$/, "") || `https://${accountId}.r2.cloudflarestorage.com`,
    region: value("R2_REGION") || "auto"
  };
}

function hmac(key: crypto.BinaryLike | crypto.KeyObject, data: string) {
  return crypto.createHmac("sha256", key).update(data).digest();
}

function hash(data: crypto.BinaryLike) {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function encodeKey(key: string) {
  return key.split("/").map(encodeURIComponent).join("/");
}

function signingKey(secretAccessKey: string, dateStamp: string, region: string) {
  const dateKey = hmac(`AWS4${secretAccessKey}`, dateStamp);
  const regionKey = hmac(dateKey, region);
  const serviceKey = hmac(regionKey, "s3");
  return hmac(serviceKey, "aws4_request");
}

export async function uploadToR2(key: string, body: Buffer, contentType: string) {
  const config = getR2Config();
  if (!config) throw new Error("R2 storage is not configured");

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const endpoint = new URL(config.endpoint);
  const canonicalUri = `/${encodeURIComponent(config.bucketName)}/${encodeKey(key)}`;
  const objectUrl = `${endpoint.origin}${canonicalUri}`;
  const uploadBody = body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength) as ArrayBuffer;
  const payloadHash = hash(body);
  const headers = {
    "content-type": contentType || "application/octet-stream",
    host: endpoint.host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate
  };
  const signedHeaders = Object.keys(headers).sort().join(";");
  const canonicalHeaders = Object.entries(headers)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, headerValue]) => `${name}:${headerValue}\n`)
    .join("");
  const canonicalRequest = ["PUT", canonicalUri, "", canonicalHeaders, signedHeaders, payloadHash].join("\n");
  const credentialScope = `${dateStamp}/${config.region}/s3/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, credentialScope, hash(canonicalRequest)].join("\n");
  const signature = crypto.createHmac("sha256", signingKey(config.secretAccessKey, dateStamp, config.region)).update(stringToSign).digest("hex");
  const authorization = `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const response = await fetch(objectUrl, {
    method: "PUT",
    headers: {
      ...headers,
      authorization
    },
    body: uploadBody
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`R2 upload failed with ${response.status}${detail ? `: ${detail}` : ""}`);
  }

  return `${config.publicUrl}/${encodeKey(key)}`;
}
