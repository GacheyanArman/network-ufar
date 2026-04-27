import { desc, eq, or, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { photoAlbums, photos, users } from "@/lib/schema";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import PhotoUploader from "@/components/PhotoUploader";
import { deletePhoto, deletePhotoAlbum } from "@/app/actions/photo"; // ИМПОРТИРУЕМ ОБА ЭКШЕНА

export default async function PhotosPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const albums = await db
    .select({
      id: photoAlbums.id,
      title: photoAlbums.title,
      description: photoAlbums.description,
      ownerName: users.fullName,
      ownerId: photoAlbums.ownerId,
      createdAt: photoAlbums.createdAt,
    })
    .from(photoAlbums)
    .innerJoin(users, eq(photoAlbums.ownerId, users.id))
    .orderBy(desc(photoAlbums.createdAt));

  const realPhotos = await db
    .select({
      id: photos.id,
      imageUrl: photos.imageUrl,
      caption: photos.caption,
      isPrivate: photos.isPrivate,
      ownerName: users.fullName,
      ownerId: photos.ownerId,
      createdAt: photos.createdAt,
    })
    .from(photos)
    .innerJoin(users, eq(photos.ownerId, users.id))
    .where(
      or(
        eq(photos.isPrivate, false),
        and(eq(photos.isPrivate, true), eq(photos.ownerId, session.userId))
      )
    )
    .orderBy(desc(photos.createdAt));

  return (
    <section className="old-page">
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.8rem', letterSpacing: '-0.03em' }}>Photos Gallery</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Upload your university memories.</p>
      </div>

      <PhotoUploader albums={albums} />

      {albums.length === 0 && realPhotos.length === 0 ? (
        <div className="old-empty card" style={{ padding: '60px 20px' }}>
          No photos yet.
        </div>
      ) : (
        <>
          {albums.length > 0 && (
            <>
              <div className="old-feed-title" style={{ marginTop: '32px' }}>
                <h2>Albums</h2>
                <span>{albums.length}</span>
              </div>
              <div className="old-grid">
                {albums.map((album) => (
                  <div className="card old-tile" key={album.id} style={{ position: 'relative' }}>

                    {album.ownerId === session.userId && (
                      <form action={deletePhotoAlbum} style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 10 }}>
                        <input type="hidden" name="albumId" value={album.id} />
                        <button type="submit" style={{ background: 'rgba(217, 45, 32, 0.1)', color: 'var(--danger)', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', fontWeight: 'bold' }}>×</button>
                      </form>
                    )}

                    <div className="old-tile-preview" style={{ background: 'var(--ufar-blue-soft)' }} />
                    <strong>{album.title}</strong>
                    <p>{album.description || `by ${album.ownerName}`}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="old-feed-title" style={{ marginTop: '32px' }}>
            <h2>All Photos</h2>
            <span>{realPhotos.length}</span>
          </div>

          <div className="old-grid">
            {realPhotos.map((photo) => (
              <div className="card old-tile" key={photo.id} style={{ padding: '10px', position: 'relative' }}>
                
                {/* КНОПКА УДАЛЕНИЯ ФОТОГРАФИИ */}
                {photo.ownerId === session.userId && (
                  <form action={deletePhoto} style={{ position: 'absolute', top: '5px', right: '5px', zIndex: 10 }}>
                    <input type="hidden" name="photoId" value={photo.id} />
                    <button type="submit" style={{ background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer' }}>×</button>
                  </form>
                )}

                {photo.isPrivate && (
                  <span style={{ position: 'absolute', top: '16px', left: '16px', background: 'rgba(0,0,0,0.7)', color: 'white', padding: '4px 8px', borderRadius: '8px', fontSize: '0.75rem' }}>🔒</span>
                )}
                
                <img src={photo.imageUrl} style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '10px', marginBottom: '10px' }} />
                <strong>{photo.caption || "Untitled"}</strong>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>by {photo.ownerName}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}