import { CUSTOM_SUBTITLE_FONT_FAMILY } from "@/lib/subtitles/subtitle-settings";

/**
 * User-uploaded subtitle fonts are stored in IndexedDB (font files are too big
 * for the localStorage-backed settings store) and registered at runtime with
 * the FontFace API under {@link CUSTOM_SUBTITLE_FONT_FAMILY}.
 */

const DB_NAME = "kitty-subtitle-fonts";
const DB_VERSION = 1;
const STORE = "fonts";
const RECORD_KEY = "custom";

/** Accepted font MIME types / extensions. */
export const CUSTOM_FONT_ACCEPT = ".ttf,.otf,.woff,.woff2,font/*";
/** Reject anything larger than this (bytes) — keeps IndexedDB usage sane. */
export const CUSTOM_FONT_MAX_BYTES = 12 * 1024 * 1024;

const FONT_EXTENSION = /\.(ttf|otf|woff2?|woff)$/i;

export type CustomSubtitleFontMeta = { name: string };

type StoredFont = {
  name: string;
  data: ArrayBuffer;
  type: string;
};

let cachedMeta: CustomSubtitleFontMeta | null = null;
let loadPromise: Promise<CustomSubtitleFontMeta | null> | null = null;
let registered = false;

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined";
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function idbGet(): Promise<StoredFont | null> {
  return openDb().then(
    (db) =>
      new Promise<StoredFont | null>((resolve, reject) => {
        const tx = db.transaction(STORE, "readonly");
        const req = tx.objectStore(STORE).get(RECORD_KEY);
        req.onsuccess = () => resolve((req.result as StoredFont) ?? null);
        req.onerror = () => reject(req.error);
        tx.oncomplete = () => db.close();
      }),
  );
}

function idbPut(value: StoredFont): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).put(value, RECORD_KEY);
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      }),
  );
}

function idbDelete(): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).delete(RECORD_KEY);
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      }),
  );
}

function removeRegisteredFaces() {
  if (typeof document === "undefined" || !("fonts" in document)) return;
  const toDelete: FontFace[] = [];
  document.fonts.forEach((face) => {
    if (face.family === CUSTOM_SUBTITLE_FONT_FAMILY) toDelete.push(face);
  });
  toDelete.forEach((face) => document.fonts.delete(face));
}

async function registerFontFace(data: ArrayBuffer): Promise<void> {
  if (typeof document === "undefined" || typeof FontFace === "undefined") return;
  removeRegisteredFaces();
  // FontFace copies the buffer, so the stored/registered copies stay independent.
  const face = new FontFace(CUSTOM_SUBTITLE_FONT_FAMILY, data);
  await face.load();
  document.fonts.add(face);
  registered = true;
}

function deriveFontName(fileName: string): string {
  const base = fileName.replace(FONT_EXTENSION, "").replace(/[_-]+/g, " ").trim();
  return base.length > 0 ? base.slice(0, 60) : "Custom font";
}

/** Persist and register a font file the user picked from their device. */
export async function saveCustomSubtitleFont(
  file: File,
): Promise<CustomSubtitleFontMeta> {
  if (!isBrowser()) throw new Error("unavailable");
  if (file.size > CUSTOM_FONT_MAX_BYTES) throw new Error("too-large");
  const data = await file.arrayBuffer();
  // Validate the bytes actually parse as a font before persisting.
  await registerFontFace(data.slice(0));
  const name = deriveFontName(file.name);
  await idbPut({ name, data, type: file.type });
  cachedMeta = { name };
  loadPromise = Promise.resolve(cachedMeta);
  return cachedMeta;
}

/** Load + register the stored custom font once per session (idempotent). */
export async function ensureCustomSubtitleFontLoaded(): Promise<CustomSubtitleFontMeta | null> {
  if (!isBrowser()) return null;
  if (registered) return cachedMeta;
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    try {
      const stored = await idbGet();
      if (!stored) return null;
      await registerFontFace(stored.data);
      cachedMeta = { name: stored.name };
      return cachedMeta;
    } catch {
      return null;
    }
  })();
  return loadPromise;
}

/** Read the stored font's display name without forcing registration. */
export async function getCustomSubtitleFontMeta(): Promise<CustomSubtitleFontMeta | null> {
  if (!isBrowser()) return null;
  if (cachedMeta) return cachedMeta;
  try {
    const stored = await idbGet();
    cachedMeta = stored ? { name: stored.name } : null;
    return cachedMeta;
  } catch {
    return null;
  }
}

/** Remove the stored font and unregister it. */
export async function clearCustomSubtitleFont(): Promise<void> {
  if (!isBrowser()) return;
  try {
    await idbDelete();
  } finally {
    removeRegisteredFaces();
    cachedMeta = null;
    loadPromise = null;
    registered = false;
  }
}
