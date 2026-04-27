import Link from "next/link";
import { ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { getSession } from "@/lib/session";
// import { addFriend } from "@/app/actions/content"; 

export default async function FriendsPage() {
  const session = await getSession();

  const suggestions = session?.userId
    ? await db
        .select({
          id: users.id,
          fullName: users.fullName,
          faculty: users.faculty,
          email: users.email,
          avatarUrl: users.avatarUrl, 
        })
        .from(users)
        .where(ne(users.id, session.userId))
        .limit(10)
    : [];

  const myFriends = []; 

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      <style>{`
        .old-list-item a.old-avatar {
          padding: 0 !important;
          border: 2px solid var(--surface-bg) !important;
          overflow: hidden; /* Чтобы картинка не вылезала за края */
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, var(--ufar-blue), var(--ufar-blue-hover)) !important;
        }
        
        /* Стили для реальной картинки аватарки */
        .old-list-item a.old-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover; /* Чтобы картинка не плющилась */
        }
        
        .old-list-item a.name-link {
          padding: 0 !important;
          background: transparent !important;
          border: none !important;
        }
        .old-list-item a.name-link:hover strong {
          color: var(--ufar-blue);
        }
      `}</style>

      <section className="card old-page" style={{ paddingBottom: '24px' }}>
        <h1 style={{ fontSize: '1.45rem', marginBottom: '16px', letterSpacing: '-0.03em' }}>My Friends</h1>

        {myFriends.length === 0 ? (
          <div className="old-empty" style={{ padding: '30px 10px', border: '2px dashed var(--border-color-light)', borderRadius: '14px' }}>
            <p style={{ margin: 0 }}>You don't have any friends yet.</p>
          </div>
        ) : (
          <div className="old-list">
          </div>
        )}
      </section>

      <section className="card old-page">
        <h1 style={{ fontSize: '1.45rem', marginBottom: '4px', letterSpacing: '-0.03em' }}>People you may know</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
          Suggested students from your university.
        </p>

        {suggestions.length === 0 ? (
          <div className="old-empty">
            No suggestions right now. Invite classmates to join!
          </div>
        ) : (
          <div className="old-list">
            {suggestions.map((user) => (
              <div className="old-list-item" key={user.id}>

                <Link href={`/profile/${user.id}`} className="old-avatar" style={{ textDecoration: 'none' }}>
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.fullName} />
                  ) : (
                    <span>{user.fullName?.[0] || "U"}</span>
                  )}
                </Link>

                <div>
                  <Link href={`/profile/${user.id}`} className="name-link" style={{ textDecoration: 'none', color: 'inherit', display: 'inline-block' }}>
                    <strong style={{ display: 'block', fontSize: '1.05rem', transition: 'color 0.15s ease' }}>
                      {user.fullName}
                    </strong>
                  </Link>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {user.faculty || user.email}
                  </span>
                </div>

                <button type="submit" className="btn-primary-old" style={{ padding: '7px 14px', fontSize: '0.9rem' }}>
                    Add friend
                </button>

              </div>
            ))}
          </div>
        )}
      </section>

    </div>
  );
}