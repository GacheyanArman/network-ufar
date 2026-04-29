import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { notifications, users } from "@/lib/schema";
import { getSession } from "@/lib/session";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/app/actions/notifications";

function label(type) {
  if (type === "like") return "liked your post";
  if (type === "comment") return "commented on your post";
  if (type === "friend_request") return "sent you a friend request";
  return "interacted with you";
}

export default async function NotificationsPage() {
  const session = await getSession();
  if (!session?.userId) redirect("/login");

  const rows = await db
    .select({
      id: notifications.id,
      type: notifications.type,
      isRead: notifications.isRead,
      createdAt: notifications.createdAt,
      actorName: users.fullName,
      actorImage: users.image,
    })
    .from(notifications)
    .leftJoin(users, eq(notifications.actorId, users.id))
    .where(eq(notifications.userId, session.userId))
    .orderBy(desc(notifications.createdAt))
    .limit(50);

  return (
    <section className="card old-page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
        <h1>Notifications</h1>
        <form action={markAllNotificationsRead}>
          <button className="btn btn-secondary">Mark all as read</button>
        </form>
      </div>

      {rows.length === 0 ? (
        <div className="old-empty">No notifications yet.</div>
      ) : (
        <div className="old-list">
          {rows.map((item) => (
            <div key={item.id} className="old-list-item" style={{ opacity: item.isRead ? 0.72 : 1 }}>
              <div className="old-avatar">
                {item.actorImage ? <img src={item.actorImage} alt={item.actorName || "User"} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} /> : (item.actorName?.[0] || "U")}
              </div>
              <div>
                <strong>{item.actorName || "Someone"}</strong>
                <span>{label(item.type)} · {new Date(item.createdAt).toLocaleString()}</span>
              </div>
              {!item.isRead && (
                <form action={markNotificationRead}>
                  <input type="hidden" name="notificationId" value={item.id} />
                  <button className="btn btn-secondary">Read</button>
                </form>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
