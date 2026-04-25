export default function ProfilePage() {
  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
      
      <div className="card profile-header-card">
          <div className="empty-cover-upload">
              <span style={{color: 'var(--text-secondary)'}}>📷 Add Cover Photo</span>
          </div>
          
          <div className="profile-info-overlay">
              <div className="empty-avatar-upload">
                  <span style={{fontSize: '1.5rem'}}>+</span>
              </div>
              
              <div className="profile-name-promo">
                  <input type="text" className="profile-name-input" placeholder="Enter your full name" />
                  <span className="add-link">+ Add promo and faculty</span>
              </div>
          </div>
      </div>

      <div className="card" style={{padding: '16px'}}>
          <h4 style={{borderBottom: '1px solid var(--border-color-light)', paddingBottom: '10px', marginBottom: '10px'}}>About</h4>
          <div style={{marginBottom: '8px'}}><span style={{color: 'var(--text-secondary)', fontWeight: '600'}}>Lives in:</span> <span className="add-link">Add city</span></div>
          <div><span style={{color: 'var(--text-secondary)', fontWeight: '600'}}>Faculty:</span> <span className="add-link">Select faculty</span></div>
      </div>

      <div className="card" style={{padding: '16px'}}>
          <textarea style={{width: '100%', height: '80px', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', resize: 'none', fontFamily: 'inherit', outline: 'none'}} placeholder="Write a post on your wall..."></textarea>
          <div style={{display: 'flex', justifyContent: 'flex-end', marginTop: '12px'}}>
            <button className="btn btn-primary">Post</button>
          </div>
      </div>

      <div className="card" style={{padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)', border: '2px dashed var(--border-color-light)'}}>
          <p>Your wall is empty.</p>
      </div>

    </div>
  );
}