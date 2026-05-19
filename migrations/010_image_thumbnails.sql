ALTER TABLE "photo" ADD COLUMN "thumbnail_url" text;
ALTER TABLE "photo" ADD COLUMN "medium_url" text;
ALTER TABLE "photo" ADD COLUMN "width" integer;
ALTER TABLE "photo" ADD COLUMN "height" integer;

ALTER TABLE "event" ADD COLUMN "cover_thumbnail_url" text;
ALTER TABLE "event" ADD COLUMN "cover_medium_url" text;
