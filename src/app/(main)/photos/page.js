import { desc, eq, or, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { photoAlbums, photos, users } from "@/lib/schema";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import PhotoUploader from "@/components/PhotoUploader";
import PhotosGrid from "@/components/PhotosGrid";
import { deletePhoto, deletePhotoAlbum } from "@/app/actions/photo"; 

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* 1. HEADER CARD WITH ACTIONS */}
      <div className="card photos-toolbar">
        <div className="photos-toolbar-title">
          <h2>Photos</h2>
          <p>Upload and manage your campus photos.</p>
        </div>

        <div className="photos-toolbar-uploader">
          <PhotoUploader albums={albums} />
        </div>
      </div>

      {/* 2. INNER LAYOUT: Albums Widget vs Photo Grid Area */}
      <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '260px 1fr', 
          gap: '16px', 
          alignItems: 'flex-start' 
      }}>
          
          {/* A. LEFT: Albums Navigation Widget */}
          <aside className="card" style={{ padding: '10px' }}>
              <div style={{ padding: '8px 12px', borderRadius: '4px', background: '#eaf0fa', color: 'var(--ufar-blue)', fontWeight: '600', cursor: 'pointer', marginBottom: '4px' }}>
                  My Albums ({albums.length})
              </div>
              <div style={{ padding: '8px 12px', borderRadius: '4px', color: 'var(--text-secondary)', fontWeight: '500', cursor: 'pointer' }}>
                  Photos of me (0)
              </div>
          </aside>

          {/* B. RIGHT: Main Photo Area */}
          <main style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* ALBUMS SECTION */}
              <div className="card">
                  <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color-light)' }}>
                      <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>Albums</h3>
                  </div>
                  
                  {albums.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>No albums yet.</div>
                  ) : (
                    <div style={{ 
                        padding: '16px', 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(3, 1fr)', 
                        gap: '16px' 
                    }}>
                        {albums.map((album) => (
                          <div key={album.id} style={{ textAlign: 'center', cursor: 'pointer', position: 'relative' }}>
                              {album.ownerId === session.userId && (
                                <form action={deletePhotoAlbum} style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 10 }}>
                                  <input type="hidden" name="albumId" value={album.id} />
                                  <button type="submit" style={{ background: 'rgba(217, 45, 32, 0.1)', color: 'var(--danger)', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', fontWeight: 'bold' }}>×</button>
                                </form>
                              )}
                              <div style={{ 
                                  aspectRatio: '1', 
                                  background: 'var(--ufar-blue-soft)', 
                                  borderRadius: '8px', 
                                  border: '1px solid var(--border-color-light)', 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center',
                                  fontSize: '2rem',
                                  color: 'var(--ufar-blue)',
                                  marginBottom: '8px'
                              }}>
                                  📷
                              </div>
                              <strong style={{ display: 'block', fontSize: '0.9rem' }}>{album.title}</strong>
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{album.description || `by ${album.ownerName}`}</span>
                          </div>
                        ))}
                    </div>
                  )}
              </div>

              {/* PRIMARY PHOTO GRID */}
              <div className="card">
                <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color-light)' }}>
                    <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>All Photos</h3>
                </div>
                {realPhotos.length === 0 ? (
                  <div style={{
                      padding: '60px 20px',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center'
                  }}>
                    <span style={{ fontSize: '3.5rem', opacity: 0.3, display: 'block', marginBottom: '16px' }}>🖼️</span>
                    <h3 style={{ color: 'var(--text-primary)', marginBottom: '8px' }}>Your Photo Library is Empty</h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', maxWidth: '350px', lineHeight: '1.5' }}>
                      Upload photos from your academic life, campus events, or study sessions to share them with your peers.
                    </p>
                  </div>
                ) : (
                  <PhotosGrid photos={realPhotos} currentUserId={session.userId} />
                )}
              </div>
          </main>
      </div>

    </div>
  );
}