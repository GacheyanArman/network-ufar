import { db } from "@/lib/db";
import { posts } from "@/lib/schema";
import { desc, eq } from "drizzle-orm";
import { createPost, deletePost } from "@/app/actions/post"; // ИМПОРТ ОБЕИХ ФУНКЦИЙ!
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  // Получаем только посты текущего юзера
  const userPosts = await db
    .select({
      id: posts.id,
      content: posts.content,
      createdAt: posts.createdAt,
    })
    .from(posts)
    .where(eq(posts.authorId, session.userId))
    .orderBy(desc(posts.createdAt));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* 1. ШАПКА ПРОФИЛЯ (Которую ты удалил) */}
      <div className="card profile-header-card">
          <div className="empty-cover-upload"></div>
          <div className="profile-info-overlay">
              <div className="empty-avatar-upload" style={{ backgroundColor: 'var(--ufar-blue)', color: 'white', fontSize: '2.5rem' }}>
                  {session.fullName.charAt(0)}
              </div>
              <div className="profile-name-promo">
                  <h1 style={{ fontSize: '1.8rem', fontWeight: '800', margin: 0 }}>{session.fullName}</h1>
                  <span style={{ color: 'var(--text-secondary)' }}>{session.email}</span>
              </div>
          </div>
      </div>

      {/* 2. ПОЛЕ ДЛЯ СОЗДАНИЯ ПОСТА */}
      <div className="card" style={{ padding: '16px' }}>
          <form action={createPost}>
            <textarea 
              name="content"
              style={{ width: '100%', height: '80px', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', resize: 'none', fontFamily: 'inherit', outline: 'none' }} 
              placeholder="Write a post on your wall..."
              required
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
              <button type="submit" className="btn btn-primary">Post</button>
            </div>
          </form>
      </div>

      {/* 3. ЛЕНТА ПОСТОВ */}
      {userPosts.length === 0 ? (
        <div className="card" style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)', border: '2px dashed var(--border-color-light)' }}>
            <p>Your wall is empty.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {userPosts.map((post) => (
            <div key={post.id} className="card" style={{ padding: '16px', position: 'relative' }}>
              
              {/* ФОРМА УДАЛЕНИЯ ПОСТА */}
              <form action={deletePost} style={{ position: 'absolute', top: '12px', right: '12px' }}>
                <input type="hidden" name="postId" value={post.id} />
                <button type="submit" className="add-link" style={{ background: 'none', border: 'none', color: 'var(--ufar-red)' }}>
                  Delete
                </button>
              </form>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div className="avatar-blank-sm" style={{ backgroundColor: 'var(--ufar-blue)' }}>{session.fullName.charAt(0)}</div>
                <div>
                  <h4 style={{ margin: 0 }}>{session.fullName}</h4>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {new Date(post.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
              <p style={{ whiteSpace: 'pre-wrap' }}>{post.content}</p>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}