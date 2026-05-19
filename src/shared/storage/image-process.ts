import sharp from "sharp";

const THUMB_SIZE = 400;
const MEDIUM_MAX = 800;
const ORIGINAL_MAX = 2048;
const JPEG_QUALITY = 80;
const WEBP_QUALITY = 78;
const THUMB_WEBP_QUALITY = 72;

export interface ProcessedImage {
  originalBuffer: Buffer;
  thumbnailBuffer: Buffer;
  mediumBuffer: Buffer;
  originalWidth: number;
  originalHeight: number;
  format: string;
}

export async function processImage(
  inputBuffer: Buffer | ArrayBuffer,
  mimeType: string
): Promise<ProcessedImage> {
  const buf = Buffer.isBuffer(inputBuffer)
    ? inputBuffer
    : Buffer.from(inputBuffer);

  const image = sharp(buf);
  const metadata = await image.metadata();
  const origWidth = metadata.width || 800;
  const origHeight = metadata.height || 600;
  const hasAlpha = metadata.hasAlpha || false;
  const isAnimated = metadata.pages && metadata.pages > 1;

  const webpFormat: keyof sharp.FormatEnum = "webp";
  const jpegFormat: keyof sharp.FormatEnum = "jpeg";

  if (isAnimated) {
    const originalBuffer = await image.webp({ quality: WEBP_QUALITY }).toBuffer();
    const thumbWidth = Math.min(THUMB_SIZE, origWidth);
    const thumbnailBuffer = await sharp(buf, { animated: true })
      .resize(thumbWidth, thumbWidth, { fit: "cover", position: "center" })
      .webp({ quality: THUMB_WEBP_QUALITY })
      .toBuffer();

    return {
      originalBuffer,
      thumbnailBuffer,
      mediumBuffer: originalBuffer,
      originalWidth: origWidth,
      originalHeight: origHeight,
      format: "webp",
    };
  }

  const useWebp = !hasAlpha || mimeType === "image/jpeg" || mimeType === "image/jpg";
  const fmt = useWebp ? webpFormat : "png";
  const fmtExt = useWebp ? "webp" : "png";

  let originalPipeline = sharp(buf).rotate();
  if (origWidth > ORIGINAL_MAX || origHeight > ORIGINAL_MAX) {
    originalPipeline = originalPipeline.resize(ORIGINAL_MAX, ORIGINAL_MAX, {
      fit: "inside",
      withoutEnlargement: true,
    });
  }
  const originalOpts =
    fmtExt === "webp"
      ? { quality: WEBP_QUALITY, effort: 4 }
      : { quality: JPEG_QUALITY };
  const originalBuffer = await originalPipeline
    .toFormat(fmt, originalOpts)
    .toBuffer();

  const resized = await sharp(buf).resize(origWidth, origHeight, {
    fit: "inside",
    withoutEnlargement: true,
  }).toBuffer({ resolveWithObject: true });
  const finalWidth = resized.info.width || origWidth;
  const finalHeight = resized.info.height || origHeight;

  const mediumPipeline = sharp(buf).resize(MEDIUM_MAX, MEDIUM_MAX, {
    fit: "inside",
    withoutEnlargement: true,
  });
  const mediumOpts =
    fmtExt === "webp"
      ? { quality: WEBP_QUALITY, effort: 4 }
      : { quality: JPEG_QUALITY };
  const mediumBuffer = await mediumPipeline
    .toFormat(fmt, mediumOpts)
    .toBuffer();

  const thumbnailBuffer = await sharp(buf)
    .resize(THUMB_SIZE, THUMB_SIZE, { fit: "cover", position: "center" })
    .toFormat("webp", { quality: THUMB_WEBP_QUALITY, effort: 4 })
    .toBuffer();

  return {
    originalBuffer,
    thumbnailBuffer,
    mediumBuffer,
    originalWidth: finalWidth,
    originalHeight: finalHeight,
    format: fmtExt,
  };
}

export function isImageMime(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}
