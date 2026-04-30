import { put } from "@vercel/blob";
import crypto from "node:crypto";

const MAX_UPLOAD_SIZE = 10 * 1024 * 1024; // 10MB

export type BlobAccess = "public" | "private";

type SaveUploadFileOptions = {
  subdir?: string;
  prefix?: string;
  maxSize?: number;
  allowedMimePrefix?: string;
  access?: BlobAccess;
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

export async function saveUploadFile(
  file: File | null | undefined,
  options: SaveUploadFileOptions = {}
): Promise<string | null> {
  const {
    subdir = "misc",
    prefix = "file",
    maxSize = MAX_UPLOAD_SIZE,
    allowedMimePrefix,
    access = "public",
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

  if (allowedMimePrefix && !file.type?.startsWith(allowedMimePrefix)) {
    throw new Error(`Invalid MIME type. Expected ${allowedMimePrefix}`);
  }

  const safeName = sanitizeFileName(file.name);
  const filename = `${subdir}/${prefix}-${Date.now()}-${crypto.randomUUID()}-${safeName}`;

  try {
    const blob = await put(filename, file, {
      access,
      addRandomSuffix: false,
    });

    return blob.url;
  } catch (error) {
    console.error("Vercel Blob Upload Failed:", error);
    throw new Error("Internal Server Error: Cloud storage upload failed.");
  }
}