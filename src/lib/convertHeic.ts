import heic2any from "heic2any";

const HEIC_MIME_TYPES = new Set([
  "image/heic",
  "image/heif",
  "image/heic-sequence",
  "image/heif-sequence",
  "application/octet-stream", // some browsers provide generic mime for HEIC
]);

function isHeicFile(file: File): boolean {
  const name = file.name.toLowerCase();
  const type = (file.type || "").toLowerCase();
  return name.endsWith(".heic") || name.endsWith(".heif") || HEIC_MIME_TYPES.has(type);
}

/**
 * Converts HEIC/HEIF files to JPEG. Returns the original file if conversion fails.
 */
export async function convertHeicIfNeeded(file: File): Promise<File> {
  if (!isHeicFile(file)) return file;

  try {
    const converted = await heic2any({
      blob: file,
      toType: "image/jpeg",
      quality: 0.85,
    });

    const blob = Array.isArray(converted) ? converted[0] : converted;
    if (!(blob instanceof Blob)) return file;

    const newName = file.name
      .replace(/\.heic$/i, ".jpg")
      .replace(/\.heif$/i, ".jpg");

    try {
      return new File([blob], newName, { type: "image/jpeg", lastModified: Date.now() });
    } catch {
      // Older environments may fail File constructor
      return Object.assign(blob, { name: newName, lastModified: Date.now() }) as File;
    }
  } catch (error) {
    console.error("HEIC conversion failed:", error);
    return file;
  }
}

/**
 * Converts an array of files, converting HEIC to JPEG when possible.
 */
export async function convertHeicFiles(files: File[]): Promise<File[]> {
  return Promise.all(files.map((file) => convertHeicIfNeeded(file)));
}
