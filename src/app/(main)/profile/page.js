import { db } from "@/lib/db";
import { posts, photos } from "@/lib/schema"; 
import { desc, eq } from "drizzle-orm";
import { deletePost } from "@/app/actions/post"; 
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
    <>
      <style>{`
        .app-container:has(.ot-profile-page) {
          grid-template-columns: 220px minmax(0, 1fr) !important;
        }
        .app-container:has(.ot-profile-page) .sidebar-right {
          display: none !important;
        }
        .ot-profile-cover { height: 120px !important; }
        .ot-profile-avatar-wrap { margin-top: -60px !important; }
        .ot-profile-avatar, .ot-profile-avatar-img {
          width: 120px !important; 
          height: 120px !important;
          font-size: 3rem !important;
          border-width: 4px !important;
        }
        .ot-profile-userinfo h1 { font-size: 1.5rem !important; }
        .ot-profile-body { min-height: auto !important; }
        .ot-profile-empty { min-height: 200px !important; }

        .ot-profile-tabs a {
          padding: 17px 22px;
          color: var(--text-secondary);
          font-weight: 900;
          font-size: 0.96rem;
          text-decoration: none;
          display: inline-block;
        }
        .ot-profile-tabs a:hover {
          background: var(--bg-main);
          color: var(--ufar-blue);
        }
        .ot-profile-tabs a.active {
          color: var(--text-primary);
          box-shadow: inset 0 -4px 0 var(--ufar-blue);
        }
      `}</style>

      <div className="ot-profile-page">
        <div className="ot-profile-cover"></div>

        <div className="ot-profile-body">
          <div className="ot-profile-left">
            <div className="ot-profile-avatar-wrap">
              <div className="ot-profile-avatar">
                {safeInitial}
              </div>
            </div>
            
            <div className="ot-profile-userinfo">
              <h1>{safeName}</h1>
              <span>{safeEmail}</span>
            </div>
            
            <p className="ot-profile-bio" style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
              Bio not added yet.
            </p>
            
            <div className="ot-profile-meta">
              <div style={{ color: 'var(--text-muted)' }}>📍 Location not set</div>
              <div style={{ color: 'var(--text-muted)' }}>🎓 Faculty not set</div>
            </div>
            
            <button className="ot-profile-message-btn">Edit Profile</button>
          </div>

          <div className="ot-profile-center">
            
            <div className="ot-profile-tabs">
              <Link href="?tab=posts" scroll={false} className={currentTab === "posts" ? "active" : ""}>Posts</Link>
              <Link href="?tab=about" scroll={false} className={currentTab === "about" ? "active" : ""}>About</Link>
              <Link href="?tab=photos" scroll={false} className={currentTab === "photos" ? "active" : ""}>Photos</Link>
            </div>

            {currentTab === "posts" && (
              <>
                <PostComposer />

                <div className="ot-profile-feed">
                  {userPosts.length === 0 ? (
                    <div className="ot-profile-empty">
                      <h2>Your wall is empty</h2>
                      <p>Share your thoughts, exam notes, or updates with your peers.</p>
                    </div>
                  ) : (
                    userPosts.map((post) => (
                      <div key={post.id} className="ot-profile-post">
                        <div className="ot-profile-post-avatar">
                          {safeInitial}
                        </div>
                        
                        <div style={{ minWidth: 0 }}>
                          <div className="ot-profile-post-head">
                            <strong>{safeName}</strong>
                            <span>
                              {new Date(post.createdAt).toLocaleDateString('en-US', { 
                                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                              })}
                            </span>
                          </div>
                          
                          <div className="old-post-content">
                            <p style={{ whiteSpace: 'pre-wrap' }}>{post.content}</p>
                            {post.imageUrl && (
                              <img 
                                src={post.imageUrl} 
                                alt="Post attachment" 
                                style={{ marginTop: '12px', borderRadius: '14px', maxHeight: '400px', width: 'auto', objectFit: 'cover', border: '1px solid var(--border-color)' }} 
                              />
                            )}
                          </div>
                          
                          <div className="ot-profile-post-actions">
                            <button type="button">👍 Like</button>
                            <button type="button">💬 Comment</button>
                            
                            <form action={deletePost} style={{ marginLeft: 'auto' }}>
                              <input type="hidden" name="postId" value={post.id} />
                              <button type="submit" style={{ color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
                                🗑️ Delete
                              </button>
                            </form>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}

            {currentTab === "about" && (
              <div className="card" style={{ padding: '24px', margin: '16px', borderRadius: '14px' }}>
                <h2 style={{ marginBottom: '12px' }}>About {safeName}</h2>
                <p style={{ color: 'var(--text-secondary)' }}>Detailed information and bio settings will be available here soon.</p>
              </div>
            )}

            {currentTab === "photos" && (
              <PhotoGallery photos={userPhotos} />
            )}
            
          </div>
        </div>
      </div>
    </>
  );
}