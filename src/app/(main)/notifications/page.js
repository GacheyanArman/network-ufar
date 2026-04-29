import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { notifications, users } from "@/lib/schema";
import { getSession } from "@/lib/session";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/app/actions/notifications";

function notificationLabel(type) {
  if (type === "like") return "liked your post";
  if (type === "comment") return "commented on your post";
  if (type === "friend_request") return "sent you a friend request";
  if (type === "friend_accept") return "accepted your friend request";
  if (type === "message") return "sent you a message";
  return "interacted with you";
}

function notificationIcon(type) {
  if (type === "like") return "♡";
  if (type === "comment") return "💬";
  if (type === "friend_request") return "👥";
  if (type === "friend_accept") return "✅";
  if (type === "message") return "✉️";
  return "🔔";
}

function formatTime(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const diff = Date.now() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return "just now";
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  if (diff < day * 7) return `${Math.floor(diff / day)}d ago`;

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function NotificationsPage() {
  const session = await getSession();

  if (!session?.userId) {
    redirect("/login");
  }

  const rows = await db
    .select({
      id: notifications.id,
      type: notifications.type,
      isRead: notifications.isRead,
      createdAt: notifications.createdAt,
      actorId: users.id,
      actorName: users.fullName,
      actorImage: users.image,
    })
    .from(notifications)
    .leftJoin(users, eq(notifications.actorId, users.id))
    .where(eq(notifications.userId, session.userId))
    .orderBy(desc(notifications.createdAt))
    .limit(50);

  const unreadCount = rows.filter((item) => !item.isRead).length;

  return (
    <div className="uf-notifications-page">
      <style>{pageStyles}</style>

      <section className="uf-notifications-shell">
        <div className="uf-notifications-header-card">
          <div className="uf-notifications-header">
            <div className="uf-notifications-title-wrap">
              <div className="uf-notifications-title-row">
                <h1>Notifications</h1>

                {unreadCount > 0 ? (
                  <span className="uf-notifications-count">
                    {unreadCount} unread
                  </span>
                ) : null}
              </div>

              <p>
                Stay updated with likes, comments, friend requests and other
                activity.
              </p>
            </div>

            {rows.length > 0 ? (
              <form action={markAllNotificationsRead}>
                <button className="uf-mark-all-btn" type="submit">
                  Mark all as read
                </button>
              </form>
            ) : null}
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="uf-notifications-empty-card">
            <div className="uf-notifications-empty-icon">🔔</div>
            <h2>No notifications yet</h2>
            <p>
              When someone likes your post, comments, sends a request or
              interacts with you, it will appear here.
            </p>
          </div>
        ) : (
          <div className="uf-notifications-list-card">
            <div className="uf-notifications-list">
              {rows.map((item) => {
                const actorName = item.actorName || "Someone";
                const actorInitial = actorName.charAt(0).toUpperCase() || "U";
                const actorHref = item.actorId ? `/profile/${item.actorId}` : "/profile";

                return (
                  <article
                    key={item.id}
                    className={`uf-notification-item ${
                      item.isRead ? "" : "is-unread"
                    }`}
                  >
                    <div className="uf-notification-left">
                      <Link href={actorHref} className="uf-notification-avatar-link">
                        <div className="uf-notification-avatar-wrap">
                          {item.actorImage ? (
                            <img
                              src={item.actorImage}
                              alt={actorName}
                              className="uf-notification-avatar"
                            />
                          ) : (
                            <div className="uf-notification-avatar uf-notification-avatar-fallback">
                              {actorInitial}
                            </div>
                          )}

                          <span className="uf-notification-type-icon">
                            {notificationIcon(item.type)}
                          </span>
                        </div>
                      </Link>
                    </div>

                    <div className="uf-notification-main">
                      <div className="uf-notification-text">
                        <Link href={actorHref} className="uf-notification-actor">
                          {actorName}
                        </Link>{" "}
                        <span>{notificationLabel(item.type)}</span>
                      </div>

                      <div className="uf-notification-meta">
                        <span className="uf-notification-time">
                          {formatTime(item.createdAt)}
                        </span>

                        {!item.isRead ? (
                          <span className="uf-unread-pill">New</span>
                        ) : (
                          <span className="uf-read-pill">Read</span>
                        )}
                      </div>
                    </div>

                    <div className="uf-notification-right">
                      {!item.isRead ? (
                        <form action={markNotificationRead}>
                          <input
                            type="hidden"
                            name="notificationId"
                            value={item.id}
                          />
                          <button
                            className="uf-notification-read-btn"
                            type="submit"
                          >
                            Mark as read
                          </button>
                        </form>
                      ) : (
                        <div className="uf-notification-read-state">✓</div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

const pageStyles = `
.uf-notifications-page {
  width: 100%;
  min-width: 0;
}

.uf-notifications-shell {
  width: 100%;
  max-width: 980px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.uf-notifications-header-card,
.uf-notifications-list-card,
.uf-notifications-empty-card {
  background: #ffffff;
  border: 1px solid #d9e2ef;
  border-radius: 18px;
  box-shadow: 0 2px 12px rgba(15, 23, 42, 0.04);
}

.uf-notifications-header-card {
  padding: 22px 24px;
}

.uf-notifications-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.uf-notifications-title-wrap {
  min-width: 0;
}

.uf-notifications-title-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.uf-notifications-title-row h1 {
  margin: 0;
  color: #0f172a;
  font-size: 24px;
  line-height: 1.1;
  font-weight: 900;
  letter-spacing: -0.03em;
}

.uf-notifications-title-wrap p {
  margin: 8px 0 0;
  color: #64748b;
  font-size: 14px;
  line-height: 1.5;
}

.uf-notifications-count {
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  background: #eef4ff;
  color: #0b3aa8;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 800;
  border: 1px solid #d9e6ff;
}

.uf-mark-all-btn {
  height: 40px;
  padding: 0 16px;
  border-radius: 10px;
  border: 1px solid #d9e2ef;
  background: #ffffff;
  color: #0b3aa8;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
  transition: background-color 160ms ease, border-color 160ms ease, color 160ms ease;
}

.uf-mark-all-btn:hover {
  background: #f4f7fb;
  border-color: rgba(11, 58, 168, 0.24);
}

.uf-notifications-list-card {
  overflow: hidden;
}

.uf-notifications-list {
  display: flex;
  flex-direction: column;
}

.uf-notification-item {
  display: grid;
  grid-template-columns: 60px minmax(0, 1fr) auto;
  gap: 14px;
  align-items: center;
  padding: 18px 22px;
  border-bottom: 1px solid #e7edf5;
  background: #ffffff;
  transition: background-color 160ms ease;
}

.uf-notification-item:last-child {
  border-bottom: none;
}

.uf-notification-item:hover {
  background: #f8fafc;
}

.uf-notification-item.is-unread {
  background: #fbfdff;
}

.uf-notification-left {
  min-width: 0;
}

.uf-notification-avatar-link {
  text-decoration: none;
}

.uf-notification-avatar-wrap {
  position: relative;
  width: 52px;
  height: 52px;
}

.uf-notification-avatar {
  width: 52px;
  height: 52px;
  border-radius: 999px;
  object-fit: cover;
  display: block;
  background: #0b3aa8;
  color: #ffffff;
  border: 1px solid #d9e2ef;
}

.uf-notification-avatar-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 900;
}

.uf-notification-type-icon {
  position: absolute;
  right: -3px;
  bottom: -2px;
  width: 24px;
  height: 24px;
  border-radius: 999px;
  background: #ffffff;
  border: 1px solid #d9e2ef;
  box-shadow: 0 4px 10px rgba(15, 23, 42, 0.08);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}

.uf-notification-main {
  min-width: 0;
}

.uf-notification-text {
  color: #334155;
  font-size: 15px;
  line-height: 1.55;
  word-break: break-word;
}

.uf-notification-actor {
  color: #0f172a;
  text-decoration: none;
  font-weight: 900;
}

.uf-notification-actor:hover {
  text-decoration: underline;
}

.uf-notification-meta {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.uf-notification-time {
  color: #64748b;
  font-size: 13px;
  font-weight: 600;
}

.uf-unread-pill,
.uf-read-pill {
  min-height: 24px;
  padding: 0 9px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 800;
}

.uf-unread-pill {
  background: #eef4ff;
  color: #0b3aa8;
}

.uf-read-pill {
  background: #f4f7fb;
  color: #64748b;
}

.uf-notification-right {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.uf-notification-read-btn {
  min-height: 38px;
  padding: 0 14px;
  border-radius: 10px;
  border: 1px solid #d9e2ef;
  background: #ffffff;
  color: #0f172a;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  white-space: nowrap;
  transition: background-color 160ms ease, border-color 160ms ease, color 160ms ease;
}

.uf-notification-read-btn:hover {
  background: #f4f7fb;
  border-color: rgba(11, 58, 168, 0.24);
  color: #0b3aa8;
}

.uf-notification-read-state {
  width: 34px;
  height: 34px;
  border-radius: 999px;
  background: #f4f7fb;
  color: #64748b;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  font-weight: 900;
}

.uf-notifications-empty-card {
  padding: 54px 24px;
  text-align: center;
}

.uf-notifications-empty-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 16px;
  border-radius: 999px;
  background: #eef4ff;
  color: #0b3aa8;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
}

.uf-notifications-empty-card h2 {
  margin: 0 0 8px;
  color: #0f172a;
  font-size: 20px;
  font-weight: 900;
}

.uf-notifications-empty-card p {
  margin: 0 auto;
  max-width: 420px;
  color: #64748b;
  font-size: 15px;
  line-height: 1.55;
}

@media (max-width: 700px) {
  .uf-notifications-header-card {
    padding: 18px 16px;
  }

  .uf-notification-item {
    grid-template-columns: 52px minmax(0, 1fr);
    padding: 16px;
  }

  .uf-notification-right {
    grid-column: 2 / 3;
    justify-content: flex-start;
    margin-top: 10px;
  }
}
`;