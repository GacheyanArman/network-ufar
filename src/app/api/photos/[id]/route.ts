import { NextResponse } from "next/server";
import { getSession } from "@/shared/auth/session";
import { db } from "@/shared/db/db";
import { photos, photoAlbums } from "@/shared/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [photo] = await db
    .select({
      imageUrl: photos.imageUrl,
      thumbnailUrl: photos.thumbnailUrl,
      mediumUrl: photos.mediumUrl,
      isPrivate: photos.isPrivate,
      ownerId: photos.ownerId,
      albumId: photos.albumId,
    })
    .from(photos)
    .where(eq(photos.id, id))
    .limit(1);

  if (!photo) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!photo.isPrivate) {
    return NextResponse.redirect(photo.imageUrl);
  }

  if (photo.ownerId === session.userId) {
    return NextResponse.redirect(photo.imageUrl);
  }

  if (photo.albumId) {
    const [album] = await db
      .select({ ownerId: photoAlbums.ownerId, isPrivate: photoAlbums.isPrivate })
      .from(photoAlbums)
      .where(eq(photoAlbums.id, photo.albumId))
      .limit(1);

    if (album && album.ownerId === session.userId) {
      return NextResponse.redirect(photo.imageUrl);
    }
  }

  const { isStaff } = await import("@/shared/auth/roles");
  const { getUserRole } = await import("@/shared/auth/roles");
  const role = await getUserRole(session.userId as string);
  if (isStaff(role)) {
    return NextResponse.redirect(photo.imageUrl);
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
