import { neon } from "@neondatabase/serverless";
import { put } from "@vercel/blob";
import sharp from "sharp";
import "dotenv/config";

const sql = neon(process.env.DATABASE_URL!);

const THUMB_SIZE = 400;
const MEDIUM_MAX = 800;
const ORIGINAL_MAX = 2048;

async function processAndUpload(imageUrl: string) {
  const response = await fetch(imageUrl);
  if (!response.ok) throw new Error(`Failed to fetch ${imageUrl}: ${response.status}`);
  const arrayBuf = await response.arrayBuffer();
  const buf = Buffer.from(arrayBuf);

  const metadata = await sharp(buf).metadata();
  const origWidth = metadata.width || 800;
  const origHeight = metadata.height || 600;
  const isAnimated = metadata.pages && metadata.pages > 1;

  if (isAnimated) {
    const thumbBuf = await sharp(buf, { animated: true })
      .resize(THUMB_SIZE, THUMB_SIZE, { fit: "cover", position: "center" })
      .webp({ quality: 72 })
      .toBuffer();
    const thumbBlob = await put(`photos/backfill-thumb-${Date.now()}.webp`, thumbBuf, { access: "public" });
    return { thumbnailUrl: thumbBlob.url, mediumUrl: imageUrl, width: origWidth, height: origHeight };
  }

  const hasAlpha = metadata.hasAlpha || false;
  const fmt = hasAlpha ? "png" : "webp";
  const ext = hasAlpha ? "png" : "webp";

  let origPipeline = sharp(buf).rotate();
  if (origWidth > ORIGINAL_MAX || origHeight > ORIGINAL_MAX) {
    origPipeline = origPipeline.resize(ORIGINAL_MAX, ORIGINAL_MAX, { fit: "inside", withoutEnlargement: true });
  }
  const resizedResult = await origPipeline.toBuffer({ resolveWithObject: true });
  const finalWidth = resizedResult.info.width || origWidth;
  const finalHeight = resizedResult.info.height || origHeight;

  const mediumBuf = await sharp(buf)
    .resize(MEDIUM_MAX, MEDIUM_MAX, { fit: "inside", withoutEnlargement: true })
    .toFormat(fmt, { quality: 78, effort: 4 })
    .toBuffer();

  const thumbBuf = await sharp(buf)
    .resize(THUMB_SIZE, THUMB_SIZE, { fit: "cover", position: "center" })
    .webp({ quality: 72, effort: 4 })
    .toBuffer();

  const [thumbBlob, mediumBlob] = await Promise.all([
    put(`photos/backfill-thumb-${Date.now()}.webp`, thumbBuf, { access: "public" }),
    put(`photos/backfill-med-${Date.now()}.${ext}`, mediumBuf, { access: "public" }),
  ]);

  return { thumbnailUrl: thumbBlob.url, mediumUrl: mediumBlob.url, width: finalWidth, height: finalHeight };
}

async function main() {
  const BATCH_SIZE = 20;

  const photos = await sql`
    SELECT id, image_url FROM "photo"
    WHERE thumbnail_url IS NULL
    ORDER BY created_at DESC
    LIMIT ${BATCH_SIZE}
  `;

  console.log(`Found ${photos.length} photos without thumbnails`);

  let processed = 0;
  let failed = 0;

  for (const photo of photos) {
    try {
      console.log(`Processing ${photo.id}...`);
      const result = await processAndUpload(photo.image_url);

      await sql`
        UPDATE "photo"
        SET thumbnail_url = ${result.thumbnailUrl},
            medium_url = ${result.mediumUrl},
            width = ${result.width},
            height = ${result.height}
        WHERE id = ${photo.id}
      `;

      processed++;
      console.log(`  OK: thumb=${result.thumbnailUrl?.slice(0, 60)}...`);
    } catch (err) {
      failed++;
      console.error(`  FAILED: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log(`\nDone: ${processed} processed, ${failed} failed`);

  if (photos.length === BATCH_SIZE) {
    console.log("More photos remaining. Run again to continue.");
  }
}

main().catch(console.error);
