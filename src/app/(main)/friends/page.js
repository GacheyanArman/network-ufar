import Link from "next/link";
import { ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { getSession } from "@/lib/session";

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* 1. HEADER & TABS CARD */}
      <div className="card">
        {/* Title and Action */}
        <div style={{ 
            padding: '16px', 
            borderBottom: '1px solid var(--border-color-light)', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center' 
        }}>
          <h2 style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>Friends</h2>
          <button className="btn btn-primary" style={{ padding: '8px 16px' }}>Find Friends</button>
        </div>
        
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '24px', padding: '0 20px' }}>
          <div style={{ 
              padding: '16px 0', 
              borderBottom: '3px solid var(--ufar-blue)', 
              color: 'var(--ufar-blue)', 
              fontWeight: '600', 
              cursor: 'pointer' 
          }}>
            Suggestions
          </div>
          <div style={{ 
              padding: '16px 0', 
              color: 'var(--text-secondary)', 
              fontWeight: '500', 
              cursor: 'pointer',
              borderBottom: '3px solid transparent'
          }}>
            All Friends
          </div>
        </div>
      </div>

      {/* 2. LOCAL SEARCH BAR */}
      <div className="card" style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>🔍</span>
        <input 
          type="text" 
          placeholder="Search among your friends..." 
          style={{ 
              flex: 1, 
              border: 'none', 
              outline: 'none', 
              fontSize: '0.95rem', 
              backgroundColor: 'transparent',
              color: 'var(--text-primary)'
          }} 
        />
      </div>

      {/* 3. SUGGESTIONS */}
      <div className="card">
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color-light)' }}>
            <h3 style={{ fontSize: '1.1rem' }}>People you may know</h3>
        </div>
        {suggestions.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No suggestions right now. Invite classmates to join!
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', padding: '16px' }}>
            {suggestions.map((user) => (
              <div key={user.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', border: '1px solid var(--border-color-light)', padding: '16px', borderRadius: '12px' }}>
                <Link href={`/profile/${user.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'var(--ufar-blue)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', marginBottom: '12px' }}>
                    {user.avatarUrl ? <img src={user.avatarUrl} alt={user.fullName} style={{width:'100%', height:'100%', borderRadius:'50%', objectFit:'cover'}} /> : user.fullName?.[0] || "U"}
                  </div>
                </Link>
                <Link href={`/profile/${user.id}`} style={{ textDecoration: 'none', color: 'var(--text-primary)', fontWeight: 'bold' }}>
                  {user.fullName}
                </Link>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                  {user.faculty || "Student"}
                </span>
                <button className="btn btn-primary" style={{ width: '100%', padding: '6px' }}>Add friend</button>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}