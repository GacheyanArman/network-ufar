export default function Home() {
  return (
    <>
      <div className="card" style={{padding: '16px'}}>
        <textarea style={{width: '100%', height: '80px', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', resize: 'none', fontFamily: 'inherit', outline: 'none'}} placeholder="What's new?"></textarea>
        <div style={{display: 'flex', justifyContent: 'flex-end', marginTop: '12px'}}>
          <button className="btn btn-primary">Post to Feed</button>
        </div>
      </div>

      <div className="card" style={{padding: '60px 20px', textAlign: 'center', color: 'var(--text-secondary)', border: '2px dashed var(--border-color-light)'}}>
          <h3 style={{color: 'var(--text-primary)', marginBottom: '8px'}}>Feed is empty</h3>
          <p>No posts to show yet. Start following people or write a post.</p>
      </div>
    </>
  );
}