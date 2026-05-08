export const maxImageUploadBytes = 4 * 1024 * 1024;
const maxSourceImageBytes = 18 * 1024 * 1024;
const maxImageDimension = 1600;
const compressedImageQuality = 0.82;

export function validateImageUpload(file: File) {
  if (!file.type.startsWith("image/")) {
    return "Please choose an image file";
  }

  if (file.size > maxSourceImageBytes) {
    return "Image is too large. Please choose an image under 18 MB.";
  }

  return null;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

async function loadImageBitmap(file: File): Promise<{ source: CanvasImageSource & { close?: () => void }; width: number; height: number }> {
  if ("createImageBitmap" in window) {
    const bitmap = await createImageBitmap(file);
    return { source: bitmap, width: bitmap.width, height: bitmap.height };
  }

  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ source: image, width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not read image"));
    };
    image.src = objectUrl;
  });
}

function compressedFileName(file: File) {
  const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
  return `${baseName}.webp`;
}

export async function prepareImageForUpload(file: File) {
  const validationError = validateImageUpload(file);
  if (validationError) return { error: validationError };

  if (file.type === "image/gif" || file.type === "image/svg+xml") {
    if (file.size > maxImageUploadBytes) {
      return { error: "This image type cannot be compressed here. Please upload an image under 4 MB." };
    }
    return { file, compressed: false };
  }

  try {
    const image = await loadImageBitmap(file);
    const { source, width, height } = image;
    const scale = Math.min(1, maxImageDimension / Math.max(width, height));
    const targetWidth = Math.max(1, Math.round(width * scale));
    const targetHeight = Math.max(1, Math.round(height * scale));
    const shouldResize = targetWidth !== width || targetHeight !== height;

    if (!shouldResize && file.size <= maxImageUploadBytes) {
      return { file, compressed: false };
    }

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const context = canvas.getContext("2d");
    if (!context) return { file, compressed: false };

    context.drawImage(source, 0, 0, targetWidth, targetHeight);
    const blob = await canvasToBlob(canvas, "image/webp", compressedImageQuality);
    if (typeof source.close === "function") source.close();

    if (!blob) return { error: "Could not compress image. Please try another file." };
    if (blob.size > maxImageUploadBytes) {
      return { error: "Compressed image is still too large. Please choose a smaller image." };
    }
    if (blob.size >= file.size && file.size <= maxImageUploadBytes) {
      return { file, compressed: false };
    }

    return {
      file: new File([blob], compressedFileName(file), { type: "image/webp" }),
      compressed: true
    };
  } catch {
    if (file.size > maxImageUploadBytes) {
      return { error: "Could not compress image. Please choose an image under 4 MB." };
    }
    return { file, compressed: false };
  }
}
