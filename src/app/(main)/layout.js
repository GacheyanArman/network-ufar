// src/app/(main)/layout.js
export default function MainLayout({ children }) {
  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          
          <div className="brand">
            <a href="/" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div className="logo-circle">U</div>
              <span className="brand-name">UFARnet</span>
            </a>
          </div>
          
          <div className="search-container">
            <span className="search-icon">🔍</span>
            <input type="text" className="search-input" placeholder="Search students, groups, materials..." />
          </div>
          
          <div className="topbar-actions">
            <button className="action-icon-btn">💬</button>
            <button className="action-icon-btn">🔔</button>
            <div className="user-dropdown-btn">
              <div className="avatar-blank-sm"></div>
              <span className="dropdown-arrow">▼</span>
            </div>
          </div>
        </div>
      </header>

      <div className="app-container">
        
        <aside className="sidebar-left">
          <nav className="student-nav card">
            <div className="nav-section">
                <a href="/" className="nav-item"><span className="nav-icon">📰</span> <span className="nav-label">My News</span></a>
                <a href="/messages" className="nav-item"><span className="nav-icon">💬</span> <span className="nav-label">Messages</span></a>
                <a href="/friends" className="nav-item"><span className="nav-icon">👥</span> <span className="nav-label">Friends</span></a>
                <a href="/profile" className="nav-item"><span className="nav-icon">👤</span> <span className="nav-label">My Profile</span></a>
                <a href="/communities" className="nav-item"><span className="nav-icon">🤝</span> <span className="nav-label">Communities</span></a>
                <a href="/photos" className="nav-item"><span className="nav-icon">🖼️</span> <span className="nav-label">Photos</span></a>
            </div>
            <div className="divider"></div>
            <div className="nav-section">
                <h4 className="nav-section-title">University Help</h4>
                <a href="/library" className="nav-item"><span className="nav-icon">📚</span> <span className="nav-label">UFAR Library</span></a>
                <a href="/study-materials" className="nav-item"><span className="nav-icon">📁</span> <span className="nav-label">Materials</span></a>
            </div>
          </nav>
        </aside>

        <main className="main-content">
          {children}
        </main>

        <aside className="sidebar-right">
          <div className="card contextual-search-card">
              <input type="text" className="right-search-input" placeholder="Search..." />
          </div>

          <div className="card">
              <h4 className="widget-title">You may also know</h4>
              <div className="empty-state-mini">
                  <p>No suggestions.</p>
              </div>
          </div>

          <div className="card" style={{padding: '0'}}>
              <h4 className="widget-title" style={{borderBottom: 'none'}}>FOLLOWING</h4>
              <ul className="subscriptions-list">
                  <li className="sub-item">
                      <span className="sub-icon">👥</span>
                      <span className="sub-label">followed students</span>
                      <span className="sub-count">--</span>
                  </li>
                  <li className="sub-item">
                      <span className="sub-icon">🤝</span>
                      <span className="sub-label">followed groups</span>
                      <span className="sub-count">--</span>
                  </li>
              </ul>
          </div>

          <div className="card">
              <h4 className="widget-title">Birthdays</h4>
              <div className="empty-state-mini">
                  <p>No birthdays today.</p>
              </div>
          </div>
        </aside>

      </div>
    </>
  );
}