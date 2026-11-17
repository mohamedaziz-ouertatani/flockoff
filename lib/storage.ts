import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * One interface for product image storage. Pick the driver with STORAGE_DRIVER:
 *   - "local"      (default) files in ./uploads, served by app/uploads/[file]/route.ts. Dev only:
 *                  serverless hosts (Vercel) have no persistent disk.
 *   - "cloudinary" signed uploads to Cloudinary (CLOUDINARY_CLOUD_NAME / _API_KEY / _API_SECRET).
 */
export type StoredImage = { url: string };

export interface StorageDriver {
  put(bytes: Uint8Array, kind: ImageKind): Promise<StoredImage>;
  /** Best effort: a missing file is not an error. Only deletes URLs this driver owns. */
  delete(url: string): Promise<void>;
}

// ---------------------------------------------------------------------------------------------
// Validation by content, not by the browser-supplied MIME type or file name.

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export const IMAGE_KINDS = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
} as const;
export type ImageKind = keyof typeof IMAGE_KINDS;

export function sniffImageKind(b: Uint8Array): ImageKind | null {
  const ascii = (start: number, len: number) => String.fromCharCode(...b.subarray(start, start + len));
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  if (b.length >= 8 && ascii(0, 8) === "\x89PNG\r\n\x1a\n") return "png";
  if (b.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP") return "webp";
  if (b.length >= 12 && ascii(4, 4) === "ftyp" && ["avif", "avis"].includes(ascii(8, 4))) return "avif";
  return null;
}

// ---------------------------------------------------------------------------------------------
// Local disk driver

export const LOCAL_UPLOAD_DIR = path.join(process.cwd(), "uploads");
export const LOCAL_URL_PREFIX = "/uploads/";
/** Generated names only: 32 hex chars + known extension. Anything else is rejected (no traversal). */
export const LOCAL_FILE_RE = /^[a-f0-9]{32}\.(jpg|png|webp|avif)$/;

const localDriver: StorageDriver = {
  async put(bytes, kind) {
    await mkdir(LOCAL_UPLOAD_DIR, { recursive: true });
    const name = `${randomBytes(16).toString("hex")}.${kind}`;
    await writeFile(path.join(LOCAL_UPLOAD_DIR, name), bytes, { flag: "wx" });
    return { url: `${LOCAL_URL_PREFIX}${name}` };
  },
  async delete(url) {
    if (!url.startsWith(LOCAL_URL_PREFIX)) return;
    const name = url.slice(LOCAL_URL_PREFIX.length);
    if (!LOCAL_FILE_RE.test(name)) return;
    await unlink(path.join(LOCAL_UPLOAD_DIR, name)).catch(() => undefined);
  },
};

export async function readLocalUpload(name: string): Promise<{ bytes: Buffer; contentType: string } | null> {
  if (!LOCAL_FILE_RE.test(name)) return null;
  try {
    const bytes = await readFile(path.join(LOCAL_UPLOAD_DIR, name));
    const ext = name.split(".").pop() as ImageKind;
    return { bytes, contentType: IMAGE_KINDS[ext] };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------------------------
// Cloudinary driver (signed REST API; no SDK). Not exercised in local dev.

function cloudinaryConfig() {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  const key = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud || !key || !secret) throw new Error("Cloudinary env vars are not set");
  return { cloud, key, secret, folder: process.env.CLOUDINARY_FOLDER ?? "flockoff/products" };
}

function sign(params: Record<string, string>, secret: string) {
  const toSign = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return createHash("sha1").update(toSign + secret).digest("hex");
}

const cloudinaryDriver: StorageDriver = {
  async put(bytes, kind) {
    const { cloud, key, secret, folder } = cloudinaryConfig();
    const params = { folder, timestamp: String(Math.floor(Date.now() / 1000)) };
    const form = new FormData();
    form.set("file", new Blob([new Uint8Array(bytes)], { type: IMAGE_KINDS[kind] }));
    form.set("api_key", key);
    for (const [k, v] of Object.entries(params)) form.set(k, v);
    form.set("signature", sign(params, secret));
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, { method: "POST", body: form });
    if (!res.ok) throw new Error(`Cloudinary upload failed: ${res.status}`);
    const json = (await res.json()) as { secure_url: string };
    return { url: json.secure_url };
  },
  async delete(url) {
    const { cloud, key, secret } = cloudinaryConfig();
    // https://res.cloudinary.com/<cloud>/image/upload/v123/<folder>/<id>.<ext> -> "<folder>/<id>"
    const m = new RegExp(`^https://res\\.cloudinary\\.com/${cloud}/image/upload/(?:v\\d+/)?(.+)\\.[a-z0-9]+$`).exec(url);
    if (!m) return;
    const params = { public_id: m[1], timestamp: String(Math.floor(Date.now() / 1000)) };
    const form = new FormData();
    form.set("api_key", key);
    for (const [k, v] of Object.entries(params)) form.set(k, v);
    form.set("signature", sign(params, secret));
    await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/destroy`, { method: "POST", body: form }).catch(() => undefined);
  },
};

export function getStorage(): StorageDriver {
  return process.env.STORAGE_DRIVER === "cloudinary" ? cloudinaryDriver : localDriver;
}
