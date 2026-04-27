import Link from "next/link";
import { getSession } from "@/lib/session";

export default async function MessagesPage() {
  const session = await getSession();

  return (
    <div className="messenger-card">
      
      {/* === LEFT PANE: CHAT LIST === */}
      <aside className="messenger-sidebar">
        
        <div className="messenger-search-header">
          <input 
            type="text" 
            className="messenger-search-input" 
            placeholder="Search messages..." 
          />
        </div>

        <div className="chat-list-container">
          <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '20px', textAlign: 'center', color: 'var(--text-secondary)'}}>
              <span style={{fontSize: '2rem', opacity: '0.5', marginBottom: '10px'}}>📭</span>
              <p style={{fontSize: '0.9rem', fontWeight: '500'}}>No recent chats</p>
              <p style={{fontSize: '0.8rem', marginTop: '4px'}}>Search for a student to start messaging.</p>
          </div>
        </div>

      </aside>

      {/* === RIGHT PANE: ACTIVE CHAT WINDOW === */}
      <main className="messenger-chat-area">
        
        {/* Шапка чата (пустая, так как чат не выбран) */}
        <div className="chat-window-header">
          <span style={{fontWeight: '600', color: 'var(--text-secondary)'}}>New Message</span>
        </div>

        {/* История сообщений (пустая) */}
        <div className="chat-messages-history">
          <div className="empty-state-mini">
            <span style={{fontSize: '2rem', display: 'block', marginBottom: '10px', opacity: '0.5'}}>💬</span>
            <p style={{fontSize: '1rem', color: 'var(--text-secondary)'}}>No messages here yet.</p>
          </div>
        </div>

        <div className="chat-input-area">
          <button className="btn-attach">📎</button>
          <input 
            type="text"
            className="chat-message-input" 
            placeholder="Write a message..."
            disabled
          />
          <button className="btn btn-send" disabled>Send</button>
        </div>

      </main>

    </div>
  );
}