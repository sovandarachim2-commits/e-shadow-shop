export const maxImageUploadBytes = 4 * 1024 * 1024;

export function validateImageUpload(file: File) {
  if (!file.type.startsWith("image/")) {
    return "Please choose an image file";
  }

  if (file.size > maxImageUploadBytes) {
    return "Image is too large. Please upload an image under 4 MB.";
  }

  return null;
}
