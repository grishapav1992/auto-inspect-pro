// Dynamic imports to keep HEIC converters out of the main bundle

const HEIC_MIME_TYPES = new Set([
  "image/heic",
  "image/heif",
  "image/heic-sequence",
  "image/heif-sequence",
  "application/octet-stream",
]);

function isHeicFile(file: File): boolean {
  const name = file.name.toLowerCase();
  const type = (file.type || "").toLowerCase();
  return name.endsWith(".heic") || name.endsWith(".heif") || HEIC_MIME_TYPES.has(type);
}

function toJpegFile(blob: Blob, original: File): File {
  const newName = original.name.replace(/\.heic$/i, ".jpg").replace(/\.heif$/i, ".jpg");
  try {
    return new File([blob], newName, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    return Object.assign(blob, { name: newName, lastModified: Date.now() }) as File;
  }
}

async function convertWithHeic2Any(file: File): Promise<Blob | null> {
  try {
    const mod = await import("heic2any");
    const convert = (mod as any).default ?? mod;
    if (typeof convert !== "function") return null;
    const out = await convert({ blob: file, toType: "image/jpeg", quality: 0.85 });
    const blob = Array.isArray(out) ? out[0] : out;
    return blob instanceof Blob ? blob : null;
  } catch (error) {
    console.error("HEIC conversion failed via heic2any:", error);
    return null;
  }
}

async function convertWithHeicTo(file: File): Promise<Blob | null> {
  try {
    const mod = await import("heic-to");
    const convert = (mod as any).heicTo ?? (mod as any).default?.heicTo ?? (mod as any).default;
    if (typeof convert !== "function") return null;
    const out = await convert({ blob: file, type: "image/jpeg", quality: 0.85 });
    const blob = Array.isArray(out) ? out[0] : out;
    return blob instanceof Blob ? blob : null;
  } catch (error) {
    console.error("HEIC conversion failed via heic-to:", error);
    return null;
  }
}

/**
 * Converts one file. Returns null only when HEIC conversion failed in all converters.
 */
export async function convertHeicIfNeeded(file: File): Promise<File | null> {
  if (!isHeicFile(file)) return file;

  const firstTry = await convertWithHeic2Any(file);
  if (firstTry) return toJpegFile(firstTry, file);

  const secondTry = await convertWithHeicTo(file);
  if (secondTry) return toJpegFile(secondTry, file);

  return null;
}

export interface HeicConversionReport {
  files: File[];
  failedHeicNames: string[];
}

/**
 * Converts HEIC files to JPEG and reports failed conversions.
 */
export async function convertHeicFiles(files: File[]): Promise<HeicConversionReport> {
  const results = await Promise.all(files.map(async (file) => ({
    original: file,
    converted: await convertHeicIfNeeded(file),
  })));

  const okFiles: File[] = [];
  const failedHeicNames: string[] = [];

  for (const r of results) {
    if (r.converted) {
      okFiles.push(r.converted);
    } else {
      failedHeicNames.push(r.original.name);
    }
  }

  return { files: okFiles, failedHeicNames };
}
