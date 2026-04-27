import { db } from "@/lib/db";
import { posts, users } from "@/lib/schema";
import { desc, eq } from "drizzle-orm";
import { deletePost } from "@/app/actions/post"; 
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
    <section className="card old-feed-card">
      <div className="old-feed-tabs">
        <a className="active">Top News</a>
      </div>

      <PostComposer />

      <div className="old-feed-title">
        <h2>News Feed</h2>
        <span>{allPosts.length} posts</span>
      </div>

      {allPosts.length === 0 ? (
        <div className="old-empty">
          No posts yet. Be the first to post something.
        </div>
      ) : (
        allPosts.map((post) => (
          <article className="old-post" key={post.id}>
            <div className="old-avatar">
              {post.authorName?.charAt(0) || "U"}
            </div>

            <div className="old-post-body">
              <div className="old-post-head">
                <strong>{post.authorName}</strong>
                <span>
                  {post.authorFaculty || "Student"} ·{" "}
                  {new Date(post.createdAt).toLocaleDateString('en-US', { 
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                  })}
                </span>
              </div>

              {/* КОНТЕНТ ПОСТА И КАРТИНКА */}
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

              <div className="old-post-actions">
                <button type="button">👍 Like</button>
                <span>{post.likesCount || 0}</span>
                <button type="button">💬 Comment</button>
                <span>{post.commentsCount || 0}</span>

                {session?.userId === post.authorId && (
                  <form action={deletePost} style={{ marginLeft: 'auto' }}>
                    <input type="hidden" name="postId" value={post.id} />
                    <button type="submit" style={{ color: 'var(--danger)' }}>🗑️ Delete</button>
                  </form>
                )}
              </div>
            </div>
          </article>
        ))
      )}
    </section>
  );
}