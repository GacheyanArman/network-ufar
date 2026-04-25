export default function StudyMaterialsPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* 1. HEADER & ACTIONS (Breadcrumbs and Upload buttons) */}
      <div className="card" style={{ 
          padding: '16px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>Materials</h2>
            <span style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>/ Root</span>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-secondary" style={{ padding: '8px 16px' }}>
                📁 New Folder
            </button>
            <button className="btn btn-primary" style={{ padding: '8px 16px' }}>
                ⬆️ Upload File
            </button>
        </div>
      </div>

      {/* 2. FILE MANAGER VIEW */}
      <div className="card" style={{ padding: '0' }}>
        
        {/* Table Header (Data Grid style) */}
        <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '3fr 1fr 1fr', 
            padding: '12px 20px', 
            borderBottom: '1px solid var(--border-color-light)', 
            backgroundColor: 'var(--bg-main)', 
            color: 'var(--text-secondary)', 
            fontSize: '0.85rem', 
            fontWeight: '600', 
            textTransform: 'uppercase' 
        }}>
            <span>Name</span>
            <span>Date Modified</span>
            <span>Size</span>
        </div>

        {/* 3. EMPTY STATE (No files uploaded yet) */}
        <div style={{ 
            padding: '80px 20px', 
            textAlign: 'center', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center' 
        }}>
          <span style={{ fontSize: '3.5rem', opacity: 0.3, display: 'block', marginBottom: '16px' }}>🗂️</span>
          <h3 style={{ color: 'var(--text-primary)', marginBottom: '8px' }}>This folder is empty</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', maxWidth: '400px', lineHeight: '1.5' }}>
            You haven't uploaded any study materials or created any folders yet. Use this space to organize your academic files and share them with peers.
          </p>
          <button className="btn btn-primary" style={{ padding: '10px 24px' }}>Upload your first file</button>
        </div>
      </div>

    </div>
  );
}