import { db } from "@/lib/db";
import { posts, users } from "@/lib/schema";
import { desc, eq } from "drizzle-orm";
import { createPost, deletePost } from "@/app/actions/post"; 
import { getSession } from "@/lib/session";
import PostComposer from "@/components/PostComposer"; 

export default async function Home() {
  const session = await getSession();

  const allPosts = await db
    .select({
      id: posts.id,
      content: posts.content,
      imageUrl: posts.imageUrl, 
      createdAt: posts.createdAt,
      authorId: posts.authorId,
      likesCount: posts.likesCount,
      commentsCount: posts.commentsCount,
      authorName: users.fullName,
      authorFaculty: users.faculty,
    })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .orderBy(desc(posts.createdAt));

  return (
    <>
      <PostComposer />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
        {allPosts.length === 0 ? (
          <div className="card" style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <p>No posts yet. Be the first to post something.</p>
          </div>
        ) : (
          allPosts.map((post) => (
            <div key={post.id} className="card" style={{ padding: '16px', position: 'relative' }}>
              
              {session && post.authorId === session.userId && (
                <form action={deletePost} style={{ position: 'absolute', top: '12px', right: '12px' }}>
                  <input type="hidden" name="postId" value={post.id} />
                  <button 
                    type="submit" 
                    style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem' }}
                    title="Delete post"
                  >
                    &times;
                  </button>
                </form>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div className="avatar-blank-sm" style={{ backgroundColor: 'var(--ufar-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', borderRadius: '50%', width: '40px', height: '40px' }}>
                  {post.authorName.charAt(0)}
                </div>
                <div>
                  <h4 style={{ margin: 0 }}>{post.authorName}</h4>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {post.authorFaculty || "Student"} · {new Date(post.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
              
              <div className="post-content" style={{ marginTop: '12px' }}>
                <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{post.content}</p>
                {post.imageUrl && (
                  <img 
                    src={post.imageUrl} 
                    alt="Post attachment" 
                    style={{ marginTop: '12px', borderRadius: '14px', maxHeight: '400px', width: 'auto', objectFit: 'cover', border: '1px solid var(--border-color)' }} 
                  />
                )}
              </div>
              
              <div style={{ display: 'flex', gap: '16px', marginTop: '16px', borderTop: '1px solid var(--border-color-light)', paddingTop: '12px' }}>
                <button style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 'bold' }}>👍 Like ({post.likesCount || 0})</button>
                <button style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 'bold' }}>💬 Comment ({post.commentsCount || 0})</button>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
        