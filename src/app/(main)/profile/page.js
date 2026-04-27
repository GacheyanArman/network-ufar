import { db } from "@/lib/db";
import { posts, photos } from "@/lib/schema"; 
import { desc, eq } from "drizzle-orm";
import { createPost, deletePost } from "@/app/actions/post"; 
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import Link from "next/link"; 
import PostComposer from "@/components/PostComposer"; 
import PhotoGallery from "@/components/PhotoGallery";

export default async function ProfilePage({ searchParams }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const params = await searchParams;
  const currentTab = params?.tab || "posts";

  const userPosts = await db
    .select({
      id: posts.id,
      content: posts.content,
      imageUrl: posts.imageUrl,
      createdAt: posts.createdAt,
    })
    .from(posts)
    .where(eq(posts.authorId, session.userId))
    .orderBy(desc(posts.createdAt));

  let userPhotos = [];
  if (currentTab === "photos") {
    userPhotos = await db
      .select()
      .from(photos)
      .where(eq(photos.ownerId, session.userId))
      .orderBy(desc(photos.createdAt));
  }

  const safeName = session?.fullName || "Student";
  const safeInitial = session?.fullName?.charAt(0) || "U";
  const safeEmail = session?.email || "No email provided";

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      <div className="card profile-header-card" style={{ position: 'relative', overflow: 'hidden', paddingBottom: '0' }}>
          <div className="empty-cover-upload" style={{ height: '160px', backgroundColor: 'var(--border-color)', backgroundImage: 'linear-gradient(45deg, #e0e5ec 25%, transparent 25%, transparent 75%, #e0e5ec 75%, #e0e5ec), linear-gradient(45deg, #e0e5ec 25%, transparent 25%, transparent 75%, #e0e5ec 75%, #e0e5ec)', backgroundSize: '20px 20px', backgroundPosition: '0 0, 10px 10px' }}></div>
          <div className="profile-info-overlay" style={{ padding: '0 24px', display: 'flex', gap: '24px', transform: 'translateY(-40px)' }}>
              <div className="empty-avatar-upload" style={{ backgroundColor: 'var(--ufar-blue)', color: 'white', fontSize: '3.5rem', width: '120px', height: '120px', borderRadius: '50%', border: '4px solid var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                  {safeInitial}
              </div>
              <div className="profile-name-promo" style={{ paddingTop: '50px' }}>
                  <h1 style={{ fontSize: '1.8rem', fontWeight: '800', margin: 0, color: 'var(--text-primary)' }}>{safeName}</h1>
                  <span style={{ color: 'var(--text-secondary)' }}>{safeEmail}</span>
              </div>
          </div>
          
          <div style={{ display: 'flex', gap: '24px', padding: '0 24px', borderTop: '1px solid var(--border-color-light)' }}>
              <Link href="?tab=posts" scroll={false} style={{ padding: '16px 0', borderBottom: currentTab === 'posts' ? '3px solid var(--ufar-blue)' : '3px solid transparent', color: currentTab === 'posts' ? 'var(--ufar-blue)' : 'var(--text-secondary)', fontWeight: '600', textDecoration: 'none' }}>Posts</Link>
              <Link href="?tab=about" scroll={false} style={{ padding: '16px 0', borderBottom: currentTab === 'about' ? '3px solid var(--ufar-blue)' : '3px solid transparent', color: currentTab === 'about' ? 'var(--ufar-blue)' : 'var(--text-secondary)', fontWeight: '600', textDecoration: 'none' }}>About</Link>
              <Link href="?tab=photos" scroll={false} style={{ padding: '16px 0', borderBottom: currentTab === 'photos' ? '3px solid var(--ufar-blue)' : '3px solid transparent', color: currentTab === 'photos' ? 'var(--ufar-blue)' : 'var(--text-secondary)', fontWeight: '600', textDecoration: 'none' }}>Photos</Link>
          </div>
      </div>

      {currentTab === "posts" && (
        <>
          <div className="card" style={{ padding: '16px' }}>
            <PostComposer />
          </div>

          {userPosts.length === 0 ? (
            <div className="card" style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <p>Your wall is empty.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {userPosts.map((post) => (
                <div key={post.id} className="card" style={{ padding: '16px', position: 'relative' }}>
                  
                  <form action={deletePost} style={{ position: 'absolute', top: '12px', right: '12px' }}>
                    <input type="hidden" name="postId" value={post.id} />
                    <button type="submit" style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '1.2rem' }} title="Delete">
                      &times;
                    </button>
                  </form>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <div className="avatar-blank-sm" style={{ backgroundColor: 'var(--ufar-blue)', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>{safeInitial}</div>
                    <div>
                      <h4 style={{ margin: 0 }}>{safeName}</h4>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {new Date(post.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div style={{ marginTop: '12px' }}>
                    <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{post.content}</p>
                    {post.imageUrl && (
                      <img 
                        src={post.imageUrl} 
                        alt="Post attachment" 
                        style={{ marginTop: '12px', borderRadius: '14px', maxHeight: '400px', width: 'auto', objectFit: 'cover', border: '1px solid var(--border-color)' }} 
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {currentTab === "about" && (
        <div className="card" style={{ padding: '32px 24px', borderRadius: '14px' }}>
          <h2 style={{ marginBottom: '12px' }}>About {safeName}</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Detailed information and bio settings will be available here soon.</p>
        </div>
      )}

      {currentTab === "photos" && (
        <div className="card" style={{ padding: '16px' }}>
          <PhotoGallery photos={userPhotos} />
        </div>
      )}
    </div>
  );
}