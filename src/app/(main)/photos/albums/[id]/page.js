import { desc, eq, and, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { photoAlbums, photos, users, photoLikes, photoSaves, photoComments } from "@/lib/schema";
import { getSession } from "@/lib/session";
import { redirect, notFound } from "next/navigation";
import AlbumPageClient from "@/components/AlbumPageClient";

export default async function AlbumPage({ params }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const albumId = params.id;

  // Fetch album details
  const albumData = await db
    .select({
      id: photoAlbums.id,
      title: photoAlbums.title,
      description: photoAlbums.description,
      category: photoAlbums.category,
      eventDate: photoAlbums.eventDate,
      coverPhotoUrl: photoAlbums.coverPhotoUrl,
      isPrivate: photoAlbums.isPrivate,
      ownerName: users.fullName,
      ownerId: photoAlbums.ownerId,
      createdAt: photoAlbums.createdAt,
    })
    .from(photoAlbums)
    .innerJoin(users, eq(photoAlbums.ownerId, users.id))
    .where(eq(photoAlbums.id, albumId))
    .limit(1);

  if (albumData.length === 0) {
    notFound();
  }

  const album = albumData[0];

  // Check privacy
  if (album.isPrivate && album.ownerId !== session.userId) {
    notFound();
  }

  // Fetch photos in album
  const albumPhotos = await db
    .select({
      id: photos.id,
      imageUrl: photos.imageUrl,
      caption: photos.caption,
      isPrivate: photos.isPrivate,
      viewCount: photos.viewCount,
      ownerName: users.fullName,
      ownerId: photos.ownerId,
      createdAt: photos.createdAt,
      likesCount: sql`(
        SELECT COUNT(*)::int
        FROM ${photoLikes}
        WHERE ${photoLikes.photoId} = ${photos.id}
      )`,
      commentsCount: sql`(
        SELECT COUNT(*)::int
        FROM ${photoComments}
        WHERE ${photoComments.photoId} = ${photos.id}
      )`,
      isLiked: sql`EXISTS(
        SELECT 1
        FROM ${photoLikes}
        WHERE ${photoLikes.photoId} = ${photos.id}
        AND ${photoLikes.userId} = ${session.userId}
      )`,
      isSaved: sql`EXISTS(
        SELECT 1
        FROM ${photoSaves}
        WHERE ${photoSaves.photoId} = ${photos.id}
        AND ${photoSaves.userId} = ${session.userId}
      )`,
    })
    .from(photos)
    .innerJoin(users, eq(photos.ownerId, users.id))
    .where(
      and(
        eq(photos.albumId, albumId),
        eq(photos.moderationStatus, "approved")
      )
    )
    .orderBy(desc(photos.createdAt));

  return (
    <AlbumPageClient
      album={album}
      photos={albumPhotos}
      currentUserId={session.userId}
    />
  );
}
