import { put } from "@vercel/blob";
import crypto from "node:crypto";
import { processImage, isImageMime } from "./image-process";

const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;

export type BlobAccess = "public" | "private";

export interface UploadResult {
  url: string;
  thumbnailUrl?: string;
  mediumUrl?: string;
  width?: number;
  height?: number;
}

type SaveUploadFileOptions = {
  subdir?: string;
  prefix?: string;
  maxSize?: number;
  allowedMimePrefix?: string;
  allowedMimeTypes?: string[];
  access?: BlobAccess;
  processImage?: boolean;
};

const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

const DOCUMENT_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
]);

const VIDEO_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-m4v",
]);

const MATERIAL_TYPES = new Set([
  ...IMAGE_TYPES,
  ...DOCUMENT_TYPES,
  ...VIDEO_TYPES,
  "application/zip",
  "application/x-zip-compressed",
  "application/x-rar-compressed",
  "application/x-7z-compressed",
  "application/epub+zip",
]);

const MESSAGE_ATTACHMENT_TYPES = new Set([
  ...IMAGE_TYPES,
  "application/pdf",
  "text/plain",
]);

const MAGIC_BYTES: Record<string, number[]> = {
  "image/jpeg": [0xff, 0xd8, 0xff],
  "image/png": [0x89, 0x50, 0x4e, 0x47],
  "image/gif": [0x47, 0x49, 0x46],
  "image/webp": [0x52, 0x49, 0x46, 0x46],
  "image/avif": [0x00, 0x00, 0x00],
  "application/pdf": [0x25, 0x50, 0x44, 0x46],
  "video/mp4": [0x00, 0x00, 0x00],
  "application/zip": [0x50, 0x4b, 0x03, 0x04],
  "application/x-rar-compressed": [0x52, 0x61, 0x72, 0x21],
};

function sanitizeFileName(name: string | undefined | null): string {
  return String(name || "file")
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 120);
}

function assertSafeSubdir(subdir: string): void {
  if (!/^[a-zA-Z0-9/_-]+$/.test(subdir) || subdir.includes("..")) {
    throw new Error("Invalid upload folder constraint.");
  }
}

async function verifyMagicBytes(file: File, declaredMime: string): Promise<boolean> {
  const expected = MAGIC_BYTES[declaredMime];
  if (!expected) return true;

  try {
    const slice = file.slice(0, expected.length);
    const buf = await slice.arrayBuffer();
    const view = new Uint8Array(buf);
    for (let i = 0; i < expected.length; i++) {
      if (view[i] !== expected[i]) return false;
    }
  } catch {
    return true;
  }
  return true;
}

function validateMimeType(
  file: File,
  allowedMimePrefix: string | undefined,
  allowedMimeTypes: string[] | undefined
): void {
  if (allowedMimeTypes && allowedMimeTypes.length > 0) {
    if (!allowedMimeTypes.includes(file.type)) {
      throw new Error(`Invalid file type: ${file.type}. Allowed: ${allowedMimeTypes.join(", ")}`);
    }
  } else if (allowedMimePrefix) {
    if (!file.type?.startsWith(allowedMimePrefix)) {
      throw new Error(`Invalid MIME type. Expected ${allowedMimePrefix}*`);
    }
  }
}

async function putBuffer(
  subdir: string,
  prefix: string,
  ext: string,
  buffer: Buffer,
  access: BlobAccess
): Promise<string> {
  const filename = `${subdir}/${prefix}-${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const blob = await put(filename, buffer, { access, addRandomSuffix: false });
  return blob.url;
}

export async function saveUploadFile(
  file: File | null | undefined,
  options: SaveUploadFileOptions = {}
): Promise<string | null> {
  const result = await saveUploadFileWithMeta(file, options);
  return result?.url ?? null;
}

export async function saveUploadFileWithMeta(
  file: File | null | undefined,
  options: SaveUploadFileOptions = {}
): Promise<UploadResult | null> {
  const {
    subdir = "misc",
    prefix = "file",
    maxSize = MAX_UPLOAD_SIZE,
    allowedMimePrefix,
    allowedMimeTypes,
    access = "public",
    processImage: shouldProcess = true,
  } = options;

  assertSafeSubdir(subdir);

  if (!file || typeof file.size !== "number" || file.size === 0) {
    return null;
  }

  if (file.size > maxSize) {
    throw new Error(
      `Payload Too Large. Max size is ${Math.floor(maxSize / 1024 / 1024)}MB.`
    );
  }

  validateMimeType(file, allowedMimePrefix, allowedMimeTypes);

  const isValidMagic = await verifyMagicBytes(file, file.type);
  if (!isValidMagic) {
    throw new Error(`File content does not match declared type: ${file.type}`);
  }

  const isImg = isImageMime(file.type) && file.type !== "image/svg+xml";

  if (shouldProcess && isImg) {
    try {
      const arrayBuf = await file.arrayBuffer();
      const processed = await processImage(arrayBuf, file.type);

      const ext = processed.format;
      const [originalUrl, thumbnailUrl, mediumUrl] = await Promise.all([
        putBuffer(subdir, `${prefix}-orig`, ext, processed.originalBuffer, access),
        putBuffer(subdir, `${prefix}-thumb`, "webp", processed.thumbnailBuffer, access),
        putBuffer(subdir, `${prefix}-med`, ext, processed.mediumBuffer, access),
      ]);

      return {
        url: originalUrl,
        thumbnailUrl,
        mediumUrl,
        width: processed.originalWidth,
        height: processed.originalHeight,
      };
    } catch (imgErr) {
      console.error("Image processing failed, falling back to raw upload:", imgErr);
    }
  }

  const safeName = sanitizeFileName(file.name);
  const filename = `${subdir}/${prefix}-${Date.now()}-${crypto.randomUUID()}-${safeName}`;

  try {
    const blob = await put(filename, file, { access, addRandomSuffix: false });
    return { url: blob.url };
  } catch (error) {
    console.error("Vercel Blob Upload Failed:", error);
    throw new Error("Internal Server Error: Cloud storage upload failed.");
  }
}

export { IMAGE_TYPES, DOCUMENT_TYPES, VIDEO_TYPES, MATERIAL_TYPES, MESSAGE_ATTACHMENT_TYPES };
