import { db } from "@/lib/db";
import { posts, users } from "@/lib/schema";
import { desc, eq } from "drizzle-orm";
import { createPost, deletePost } from "@/app/actions/post"; // Импорт удаления
import { getSession } from "@/lib/session";

export default async function Home() {
  const session = await getSession();

  const allPosts = await db
    .select({
      id: posts.id,
      content: posts.content,
      createdAt: posts.createdAt,
      authorId: posts.authorId, // Добавили authorId для проверки
      authorName: users.fullName,
    })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .orderBy(desc(posts.createdAt));

  return (
    <>
      {/* Form to Create Post */}
      <div className="card" style={{ padding: '16px' }}>
        <form action={createPost}>
          <textarea 
            name="content"
            className="chat-message-input"
            style={{ width: '100%', height: '80px', marginBottom: '12px' }} 
            placeholder="What's new?"
            required
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary">Post to Feed</button>
          </div>
        </form>
      </div>

      {/* Posts List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
        {allPosts.map((post) => (
          <div key={post.id} className="card" style={{ padding: '16px', position: 'relative' }}>
            
            {/* КНОПКА УДАЛЕНИЯ: Показываем только владельцу */}
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
              <div className="avatar-blank-sm" style={{ backgroundColor: 'var(--ufar-blue)' }}>{post.authorName.charAt(0)}</div>
              <div>
                <h4 style={{ margin: 0 }}>{post.authorName}</h4>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {new Date(post.createdAt).toLocaleString()}
                </span>
              </div>
            </div>
            <p style={{ whiteSpace: 'pre-wrap' }}>{post.content}</p>
          </div>
        ))}
      </div>
    </>
  );
}