export default function CommunitiesPage() {
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
          <button className="btn btn-primary" style={{ padding: '8px 16px' }}>Create Community</button>
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

      {/* 3. EMPTY STATE (Список пуст) */}
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
        <button className="btn btn-primary" style={{ padding: '10px 24px' }}>Discover Communities</button>
      </div>

    </div>
  );
}