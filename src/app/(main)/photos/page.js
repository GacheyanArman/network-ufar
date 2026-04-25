export default function PhotosPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* 1. HEADER CARD WITH ACTIONS */}
      <div className="card">
        <div style={{ 
            padding: '16px', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center' 
        }}>
          <h2 style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>Photos</h2>
          <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-secondary" style={{ padding: '8px 16px' }}>Create Album</button>
              <button className="btn btn-primary" style={{ padding: '8px 16px' }}>+ Add Photo</button>
          </div>
        </div>
      </div>

      {/* 2. INNER LAYOUT: Albums Widget vs Photo Grid Area */}
      <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '260px 1fr', 
          gap: '16px', 
          alignItems: 'flex-start' 
      }}>
          
          {/* A. LEFT: Albums Navigation Widget */}
          <aside className="card" style={{ padding: '10px' }}>
              <div style={{ padding: '8px 12px', borderRadius: '4px', background: '#eaf0fa', color: 'var(--ufar-blue)', fontWeight: '600', cursor: 'pointer', marginBottom: '4px' }}>
                  My Albums (0)
              </div>
              <div style={{ padding: '8px 12px', borderRadius: '4px', color: 'var(--text-secondary)', fontWeight: '500', cursor: 'pointer' }}>
                  Photos of me (0)
              </div>
          </aside>

          {/* B. RIGHT: Main Photo Area */}
          <main style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* ALBUMS SECTION (Visual Placeholders) */}
              <div className="card">
                  <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color-light)' }}>
                      <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>Albums</h3>
                  </div>
                  
                  {/* Empty grid for albums */}
                  <div style={{ 
                      padding: '16px', 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(3, 1fr)', 
                      gap: '16px' 
                  }}>
                      {/* Album 1 placeholder */}
                      <div style={{ textAlign: 'center', cursor: 'pointer' }}>
                          <div style={{ 
                              aspectRatio: '1', 
                              background: '#ddd', 
                              borderRadius: '8px', 
                              border: '1px solid var(--border-color-light)', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              fontSize: '2rem',
                              color: '#aaa',
                              marginBottom: '8px'
                          }}>
                              📷
                          </div>
                          <div className="skeleton-bar" style={{ width: '70%', margin: '0 auto', height: '12px' }}></div>
                      </div>
                      
                      {/* Album 2 placeholder */}
                      <div style={{ textAlign: 'center', cursor: 'pointer' }}>
                          <div style={{ 
                              aspectRatio: '1', 
                              background: '#ddd', 
                              borderRadius: '8px', 
                              border: '1px solid var(--border-color-light)',
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              fontSize: '2rem',
                              color: '#aaa',
                              marginBottom: '8px'
                          }}>
                              📷
                          </div>
                          <div className="skeleton-bar" style={{ width: '50%', margin: '0 auto', height: '12px' }}></div>
                      </div>
                  </div>
              </div>

              {/* PRIMARY PHOTO GRID EMPTY STATE */}
              <div className="card" style={{ 
                  padding: '60px 20px', 
                  textAlign: 'center', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center' 
              }}>
                <span style={{ fontSize: '3.5rem', opacity: 0.3, display: 'block', marginBottom: '16px' }}>🖼️</span>
                <h3 style={{ color: 'var(--text-primary)', marginBottom: '8px' }}>Your Photo Library is Empty</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', maxWidth: '350px', lineHeight: '1.5' }}>
                  Upload photos from your academic life, campus events, or study sessions to share them with your peers.
                </p>
                <button className="btn btn-primary" style={{ padding: '10px 24px' }}>+ Upload First Photo</button>
              </div>

          </main>
      </div>

    </div>
  );
}