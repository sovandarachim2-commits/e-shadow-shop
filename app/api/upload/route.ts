import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { v2 as cloudinary } from "cloudinary";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { requireRole } from "@/lib/auth";
import { getR2Config, uploadToR2 } from "@/lib/r2-storage";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

function resolveSafeExtension(file: File) {
  const originalExtension = path.extname(file.name).toLowerCase();
  if (originalExtension === ".jfif") return ".jpg";
  if (!originalExtension) {
    if (file.type === "image/png") return ".png";
    if (file.type === "image/webp") return ".webp";
    if (file.type === "image/gif") return ".gif";
    if (file.type.startsWith("video/")) return ".mp4";
    return ".jpg";
  }
  return originalExtension;
}

function currentMediaFolder(kind: "image" | "video") {
  const timeZone = process.env.MEDIA_STORAGE_TIME_ZONE || "Asia/Bangkok";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit"
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value || String(new Date().getFullYear());
  const month = parts.find((part) => part.type === "month")?.value || String(new Date().getMonth() + 1).padStart(2, "0");
  return `${kind}/${year}/${month}`;
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, [Role.ADMIN, Role.STAFF]);
  if (auth.response) return auth.response;

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) return NextResponse.json({ message: "Media file is required" }, { status: 400 });

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const isVideo = file.type.startsWith("video/");
  const mediaKind = isVideo ? "video" : "image";
  const mediaFolder = currentMediaFolder(mediaKind);
  const cloudinaryFolder = `shadow-commerce/${mediaFolder}`;
  const extension = resolveSafeExtension(file);
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}${extension}`;
  const storageKey = `${mediaFolder}/${safeName}`;

  if (getR2Config()) {
    try {
      const url = await uploadToR2(storageKey, buffer, file.type || "application/octet-stream");
      return NextResponse.json({ url, key: storageKey });
    } catch (error) {
      console.error(error);
      return NextResponse.json({ message: "R2 upload failed" }, { status: 500 });
    }
  }

  if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
    const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream({ folder: cloudinaryFolder, resource_type: "auto" }, (error, uploadResult) => {
        if (error || !uploadResult) reject(error);
        else resolve(uploadResult);
      });
      stream.end(buffer);
    });

    return NextResponse.json({ url: result.secure_url });
  }

  const uploadDir = path.join(process.cwd(), "public", mediaFolder);
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, safeName), buffer);

  return NextResponse.json({ url: `/${storageKey}`, key: storageKey });
}
