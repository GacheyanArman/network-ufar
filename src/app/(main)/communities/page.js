import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { communities, users } from "@/lib/schema";
import { createCommunity } from "@/app/actions/content";

export default async function CommunitiesPage() {
  const realCommunities = await db
    .select({
      id: communities.id,
      name: communities.name,
      description: communities.description,
      createdAt: communities.createdAt,
      ownerName: users.fullName,
    })
    .from(communities)
    .innerJoin(users, eq(communities.ownerId, users.id))
    .orderBy(desc(communities.createdAt));

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
          <h2 style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>Communities</h2>
          <form action={createCommunity} style={{ display: 'flex', gap: '8px' }}>
              <input name="name" placeholder="Community name" required style={{ padding: '6px', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
              <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px' }}>Create</button>
          </form>
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
            All Communities
          </div>
          <div style={{ 
              padding: '16px 0', 
              color: 'var(--text-secondary)', 
              fontWeight: '500', 
              cursor: 'pointer',
              borderBottom: '3px solid transparent'
          }}>
            Managed by me
          </div>
        </div>
      </div>

      {/* 2. LOCAL SEARCH BAR */}
      <div className="card" style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>🔍</span>
        <input 
          type="text" 
          placeholder="Search UFAR groups, clubs, or departments..." 
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

      {realCommunities.length === 0 ? (
        <div className="card" style={{ 
            padding: '60px 20px', 
            textAlign: 'center', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center' 
        }}>
          <span style={{ fontSize: '3.5rem', opacity: 0.3, display: 'block', marginBottom: '16px' }}>🤝</span>
          <h3 style={{ color: 'var(--text-primary)', marginBottom: '8px' }}>No communities found</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', maxWidth: '350px', lineHeight: '1.5' }}>
            You haven't joined any university groups or clubs yet. Discover communities to connect with peers sharing your academic interests.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {realCommunities.map((community) => (
            <div className="card" key={community.id} style={{ padding: '16px', display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '12px', backgroundColor: 'var(--ufar-blue)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 'bold', flexShrink: 0 }}>
                {community.name[0]}
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>{community.name}</h4>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {community.description || "No description"}
                </p>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                  by {community.ownerName}
                </div>
              </div>
              <button className="btn btn-secondary">Join</button>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}