/**
 * Unified upload pipeline: HEIC→JPEG conversion, resize, EXIF orientation fix.
 * Returns an idb:// key (stored in IndexedDB) for each file.
 */

import { convertHeicIfNeeded, type HeicConversionReport } from "@/lib/convertHeic";
import { storeBlob, registerMediaUrl } from "./mediaStore";

const DEFAULT_MAX_WIDTH = 1920;
const DEFAULT_QUALITY = 0.8;

/**
 * Resize an image blob via canvas, fixing EXIF orientation (handled by modern browsers).
 * Returns a JPEG Blob with max dimension capped.
 */
function resizeImageBlob(
  blob: Blob,
  maxWidth: number,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let w = img.naturalWidth;
      let h = img.naturalHeight;

      // Cap the longest side
      if (w > maxWidth || h > maxWidth) {
        if (w >= h) {
          h = Math.round((h * maxWidth) / w);
          w = maxWidth;
        } else {
          w = Math.round((w * maxWidth) / h);
          h = maxWidth;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(blob); // fallback
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (result) => resolve(result ?? blob),
        "image/jpeg",
        quality,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image for resize"));
    };
    img.src = url;
  });
}

export interface NormalizedFile {
  /** idb:// key for the stored blob */
  key: string;
  /** Displayable object URL (valid for current session) */
  objectUrl: string;
  /** "image" or "video" */
  type: "image" | "video";
  /** Original filename */
  name: string;
}

export interface NormalizeResult {
  files: NormalizedFile[];
  failedNames: string[];
}

/**
 * Process a single File: convert HEIC if needed, resize images, store in IDB.
 * Returns null if HEIC conversion failed.
 */
export async function normalizeUploadFile(
  file: File,
  opts?: { maxWidth?: number; quality?: number },
): Promise<NormalizedFile | null> {
  const maxWidth = opts?.maxWidth ?? DEFAULT_MAX_WIDTH;
  const quality = opts?.quality ?? DEFAULT_QUALITY;
  const isVideo = file.type.startsWith("video/");

  if (isVideo) {
    const key = await storeBlob(file);
    const objectUrl = URL.createObjectURL(file);
    registerMediaUrl(key, objectUrl);
    return { key, objectUrl, type: "video", name: file.name };
  }

  // Convert HEIC if needed
  const converted = await convertHeicIfNeeded(file);
  if (!converted) return null;

  // Resize & normalize
  let finalBlob: Blob;
  try {
    finalBlob = await resizeImageBlob(converted, maxWidth, quality);
  } catch {
    // If resize fails, store the converted file as-is
    finalBlob = converted;
  }

  const key = await storeBlob(finalBlob);
  const objectUrl = URL.createObjectURL(finalBlob);
  return { key, objectUrl, type: "image", name: converted.name };
}

/**
 * Batch process multiple files. Reports failures.
 */
export async function normalizeUploadFiles(
  files: File[],
  opts?: { maxWidth?: number; quality?: number },
): Promise<NormalizeResult> {
  const results = await Promise.all(
    files.map(async (file) => ({
      original: file,
      result: await normalizeUploadFile(file, opts),
    })),
  );

  const normalized: NormalizedFile[] = [];
  const failedNames: string[] = [];

  for (const r of results) {
    if (r.result) {
      normalized.push(r.result);
    } else {
      failedNames.push(r.original.name);
    }
  }

  return { files: normalized, failedNames };
}
