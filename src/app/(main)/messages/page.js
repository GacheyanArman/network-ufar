import Link from "next/link";
import { getSession } from "@/lib/session";

export default async function MessagesPage() {
  const session = await getSession();

  return (
    <>
      <style>{`
        .app-container:has(.twitter-messages-shell) {
          grid-template-columns: 220px minmax(0, 1fr) !important;
        }
        .app-container:has(.twitter-messages-shell) .sidebar-right {
          display: none !important;
        }
      `}</style>

      <section className="twitter-messages-shell">
        <aside className="twitter-dm-sidebar">
          <div className="twitter-dm-sidebar-header">
            <div>
              <h1>Messages</h1>
              <p>Private conversations</p>
            </div>

            <Link href="/friends" className="twitter-new-message-btn">
              ✎
            </Link>
          </div>

          <form action="/search" className="twitter-dm-search">
            <span>⌕</span>
            <input
              name="q"
              placeholder="Search people"
              autoComplete="off"
            />
          </form>

          <div className="twitter-dm-tabs">
            <button className="active" type="button">
              Inbox
            </button>
            <button type="button">
              Requests
            </button>
          </div>

          <div className="twitter-dm-empty-list">
            <div className="twitter-dm-empty-icon">✉</div>
            <h2>No conversations yet</h2>
            <p>
              When you start messaging classmates, your chats will appear here.
            </p>

            <Link href="/friends">
              Find people
            </Link>
          </div>
        </aside>

        <main className="twitter-dm-main">
          <header className="twitter-dm-chat-header">
            <div className="twitter-dm-user">
              <div className="twitter-dm-avatar">
                {session?.fullName?.charAt(0) || "U"}
              </div>

              <div>
                <strong>New message</strong>
                <span>
                  {session?.fullName
                    ? `Signed in as ${session.fullName}`
                    : "Choose someone to start"}
                </span>
              </div>
            </div>
          </header>

          <div className="twitter-dm-hero">
            <div className="twitter-dm-hero-card">
              <div className="twitter-dm-hero-icon">💬</div>

              <h2>Select a message</h2>
              <p>
                Choose an existing conversation or find a student to start a new one.
              </p>

              <Link href="/friends" className="twitter-dm-primary-link">
                Start a conversation
              </Link>
            </div>
          </div>

          <form className="twitter-dm-composer">
            <button type="button" aria-label="Attach file">
              ＋
            </button>

            <input
              disabled
              placeholder="Choose a conversation first"
            />

            <button type="button" disabled>
              Send
            </button>
          </form>
        </main>
      </section>
    </>
  );
}