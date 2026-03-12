/**
 * IndexedDB-based media blob storage.
 * Photos/videos are stored as Blobs in IDB; drafts only keep string keys (idb://...).
 * This avoids base64 in localStorage and prevents QuotaExceeded errors.
 */

const DB_NAME = "app_media";
const DB_VERSION = 1;
const STORE_NAME = "blobs";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      dbPromise = null;
      reject(req.error);
    };
  });
  return dbPromise;
}

/** Prefix used to identify IDB-stored media URLs in draft data */
export const IDB_PREFIX = "idb://";

function makeKey(): string {
  return `${IDB_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Returns true if a URL string is an IDB reference */
export function isIdbUrl(url: string): boolean {
  return url.startsWith(IDB_PREFIX);
}

/**
 * Store a Blob in IndexedDB. Returns an idb:// key.
 */
export async function storeBlob(blob: Blob): Promise<string> {
  const db = await openDB();
  const key = makeKey();
  return new Promise<string>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(blob, key);
    tx.oncomplete = () => resolve(key);
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Retrieve a Blob from IndexedDB by key.
 */
export async function loadBlob(key: string): Promise<Blob | null> {
  const db = await openDB();
  return new Promise<Blob | null>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(key);
    req.onsuccess = () => resolve(req.result instanceof Blob ? req.result : null);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Delete a single blob by key.
 */
export async function deleteBlob(key: string): Promise<void> {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Delete multiple blobs by key.
 */
export async function deleteBlobs(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    for (const key of keys) store.delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ----- Object URL cache (per session) -----

const objectUrlCache = new Map<string, string>();

/**
 * Get a displayable object URL for an IDB key.
 * If the key is already a data: or http(s): URL, returns it as-is.
 * Caches the object URL for the session lifetime.
 */
export async function resolveMediaUrl(url: string): Promise<string> {
  if (!isIdbUrl(url)) return url;

  const cached = objectUrlCache.get(url);
  if (cached) return cached;

  const blob = await loadBlob(url);
  if (!blob) return "";

  const objUrl = URL.createObjectURL(blob);
  objectUrlCache.set(url, objUrl);
  return objUrl;
}

/**
 * Revoke all cached object URLs (call on app teardown if needed).
 */
export function revokeAllObjectUrls(): void {
  for (const objUrl of objectUrlCache.values()) {
    URL.revokeObjectURL(objUrl);
  }
  objectUrlCache.clear();
}

/**
 * Collect all IDB keys from draft photo arrays and inspection records.
 */
export function collectIdbKeys(draft: {
  inspectionPhotos?: string[];
  underhoodPhotos?: string[];
  bodyPhotos?: string[];
  glassPhotos?: string[];
  interiorPhotos?: string[];
  wheelsPhotos?: string[];
  tdPhotos?: string[];
  mediaFiles?: { url: string; children?: { url: string }[] }[];
  inspections?: Record<string, { photos?: string[]; tagPhotos?: Record<string, string[]> }>;
  bodyStructuralInspections?: Record<string, { photos?: string[]; tagPhotos?: Record<string, string[]> }>;
  bodyUndercarriageInspections?: Record<string, { photos?: string[]; tagPhotos?: Record<string, string[]> }>;
  glassInspections?: Record<string, { photos?: string[]; tagPhotos?: Record<string, string[]> }>;
  diagnosticFiles?: { dataUrl: string }[];
}): string[] {
  const keys: string[] = [];
  const push = (url: string) => { if (isIdbUrl(url)) keys.push(url); };
  const pushArr = (arr?: string[]) => arr?.forEach(push);

  pushArr(draft.inspectionPhotos);
  pushArr(draft.underhoodPhotos);
  pushArr(draft.bodyPhotos);
  pushArr(draft.glassPhotos);
  pushArr(draft.interiorPhotos);
  pushArr(draft.wheelsPhotos);
  pushArr(draft.tdPhotos);

  draft.mediaFiles?.forEach((m) => {
    push(m.url);
    m.children?.forEach((c) => push(c.url));
  });

  const processInsp = (rec?: Record<string, { photos?: string[]; tagPhotos?: Record<string, string[]> }>) => {
    if (!rec) return;
    for (const insp of Object.values(rec)) {
      pushArr(insp.photos);
      if (insp.tagPhotos) {
        for (const urls of Object.values(insp.tagPhotos)) pushArr(urls);
      }
    }
  };

  processInsp(draft.inspections);
  processInsp(draft.bodyStructuralInspections);
  processInsp(draft.bodyUndercarriageInspections);
  processInsp(draft.glassInspections);

  draft.diagnosticFiles?.forEach((f) => push(f.dataUrl));

  return keys;
}
