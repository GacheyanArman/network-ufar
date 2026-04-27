export default function LibraryPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* 1. HEADER & ACTIONS */}
      <div className="card" style={{ 
          padding: '16px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
      }}>
        <h2 style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>UFAR Library</h2>
        <div style={{ display: 'flex', gap: '12px' }}>
            <button style={{ 
                backgroundColor: '#E2DCCF', 
                color: '#050505', 
                padding: '8px 16px', 
                borderRadius: 'var(--radius-btn)', 
                border: '1px solid #ced0d4', 
                fontWeight: '600', 
                cursor: 'pointer' 
            }}>
                🔖 My List
            </button>
            <button className="btn btn-primary" style={{ padding: '8px 16px' }}>
                + Request Book
            </button>
        </div>
      </div>

      {/* 2. SEARCH & FILTERS */}
      <div className="card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <input 
                type="text" 
                placeholder="Search past exams, syllabus, lecture notes..." 
                style={{ 
                    flex: 1, 
                    padding: '12px 16px', 
                    borderRadius: 'var(--radius-btn)', 
                    border: '1px solid var(--border-color)', 
                    outline: 'none',
                    fontSize: '0.95rem',
                    fontFamily: 'inherit'
                }} 
              />
              <button className="btn btn-primary" style={{ padding: '0 24px' }}>Search</button>
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
              <select style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--border-color-light)', outline: 'none', backgroundColor: 'var(--bg-main)', color: 'var(--text-secondary)' }}>
                  <option>All Faculties</option>
                  <option>Computer Science</option>
                  <option>Law</option>
                  <option>Management</option>
              </select>
              <select style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--border-color-light)', outline: 'none', backgroundColor: 'var(--bg-main)', color: 'var(--text-secondary)' }}>
                  <option>All Types</option>
                  <option>Past Exams</option>
                  <option>Textbooks</option>
                  <option>Lecture Notes</option>
              </select>
          </div>
      </div>

      {/* 3. TABS */}
      <div className="card" style={{ display: 'flex', gap: '24px', padding: '0 20px', borderBottom: '1px solid var(--border-color-light)' }}>
          <div style={{ padding: '16px 0', borderBottom: '3px solid var(--ufar-blue)', color: 'var(--ufar-blue)', fontWeight: '600', cursor: 'pointer' }}>
            Recent Uploads
          </div>
          <div style={{ padding: '16px 0', color: 'var(--text-secondary)', fontWeight: '500', cursor: 'pointer', borderBottom: '3px solid transparent' }}>
            My Uploads
          </div>
      </div>

      {/* 4. EMPTY STATE (Нет загруженных материалов) */}
      <div className="card" style={{ 
          padding: '60px 20px', 
          textAlign: 'center', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center' 
      }}>
        <span style={{ fontSize: '3.5rem', opacity: 0.3, display: 'block', marginBottom: '16px' }}>📚</span>
        <h3 style={{ color: 'var(--text-primary)', marginBottom: '8px' }}>The library is empty</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', maxWidth: '400px', lineHeight: '1.5' }}>
          No study materials match your criteria. Be the first to help your classmates by uploading notes or past exams.
        </p>
      </div>

    </div>
  );
}