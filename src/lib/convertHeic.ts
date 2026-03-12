import heic2any from "heic2any";

/**
 * Converts HEIC/HEIF files to JPEG. Returns the original file if not HEIC.
 */
export async function convertHeicIfNeeded(file: File): Promise<File> {
  const name = file.name.toLowerCase();
  if (!name.endsWith(".heic") && !name.endsWith(".heif")) {
    return file;
  }
  const blob = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.85 });
  const result = Array.isArray(blob) ? blob[0] : blob;
  const newName = file.name.replace(/\.heic$/i, ".jpg").replace(/\.heif$/i, ".jpg");
  return new File([result], newName, { type: "image/jpeg" });
}

/**
 * Converts an array of files, converting any HEIC to JPEG.
 */
export async function convertHeicFiles(files: File[]): Promise<File[]> {
  return Promise.all(files.map(convertHeicIfNeeded));
}
