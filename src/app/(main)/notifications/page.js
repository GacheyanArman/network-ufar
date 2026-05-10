import Link from "next/link";
import { cookies } from "next/headers";
import { desc, eq, and } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { notifications, users } from "@/lib/schema";
import { getSession } from "@/lib/session";
import { getNotificationPreferences } from "@/lib/notifications";
import { translations } from "@/lib/i18n";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/app/actions/notifications";
import NotificationControls from "@/components/NotificationControls";
import UiIcon from "@/components/UiIcon";

const TYPE_ICON = {
  like: "heart",
  comment: "comment",
  friend_request: "user-plus",
  friend_accept: "check",
  message: "mail",
  reminder: "bell",
  material_approved: "check-circle",
  photo_approved: "check-circle",
  event_new: "calendar",
  deadline: "clock",
  group_join: "users",
};

const TYPE_COLOR = {
  like: "#e11d48",
  comment: "#0b3aa8",
  friend_request: "#7c3aed",
  friend_accept: "#059669",
  message: "#0b3aa8",
  reminder: "#d97706",
  material_approved: "#059669",
  photo_approved: "#059669",
  event_new: "#7c3aed",
  deadline: "#dc2626",
  group_join: "#0b3aa8",
};

function formatTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const diff = Date.now() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return "just now";
  if (diff < hour) return `${Math.floor(diff / minute)}m`;
  if (diff < day) return `${Math.floor(diff / hour)}h`;
  if (diff < day * 7) return `${Math.floor(diff / day)}d`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default async function NotificationsPage({ searchParams }) {
  const session = await getSession();
  if (!session?.userId) redirect("/login");

  const cookieStore = await cookies();
  const lang = cookieStore.get("language")?.value || "en";
  const t = translations[lang]?.notifications || translations.en.notifications;

  const params = await searchParams;
  const filter = params?.cat || "all";

  const prefs = await getNotificationPreferences(session.userId);

  const whereClause =
    filter === "all"
      ? eq(notifications.userId, session.userId)
      : and(
          eq(notifications.userId, session.userId),
          eq(notifications.category, filter)
        );

  const rows = await db
    .select({
      id: notifications.id,
      type: notifications.type,
      category: notifications.category,
      isRead: notifications.isRead,
      createdAt: notifications.createdAt,
      entityId: notifications.entityId,
      actorId: users.id,
      actorName: users.fullName,
      actorImage: users.image,
    })
    .from(notifications)
    .leftJoin(users, eq(notifications.actorId, users.id))
    .where(whereClause)
    .orderBy(desc(notifications.createdAt))
    .limit(80);

  const unreadCount = rows.filter((item) => !item.isRead).length;

  const grouped = groupByCategory(rows);

  return (
    <div className="uf-notifications-page">
      <style>{pageStyles}</style>

      <section className="uf-notifications-shell">
        <div className="uf-notifications-header-card">
          <div className="uf-notifications-header">
            <div className="uf-notifications-title-wrap">
              <div className="uf-notifications-title-row">
                <h1>{t.title}</h1>
                {unreadCount > 0 ? (
                  <span className="uf-notifications-count">
                    {unreadCount} {t.unread}
                  </span>
                ) : null}
              </div>
              <p>{t.subtitle}</p>
            </div>

            {rows.length > 0 ? (
              <form action={markAllNotificationsRead}>
                <button className="uf-mark-all-btn" type="submit">
                  {t.markAllRead}
                </button>
              </form>
            ) : null}
          </div>
        </div>

        <NotificationControls
          prefs={prefs}
        />

        {rows.length === 0 ? (
          <div className="uf-notifications-empty-card">
            <div className="uf-notifications-empty-icon">
              <UiIcon name="bell" size={28} />
            </div>
            <h2>{t.emptyTitle}</h2>
            <p>{t.emptyHint}</p>
          </div>
        ) : (
          <div className="uf-notifications-list-card">
            <div className="uf-notifications-list">
              {rows.map((item) => (
                <NotificationItem
                  key={item.id}
                  item={item}
                  t={t}
                  lang={lang}
                />
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function NotificationItem({ item, t, lang }) {
  const actorName = item.actorName || "System";
  const actorInitial = actorName.charAt(0).toUpperCase() || "S";
  const actorHref = item.actorId ? `/profile/${item.actorId}` : null;
  const iconName = TYPE_ICON[item.type] || "bell";
  const iconColor = TYPE_COLOR[item.type] || "#64748b";
  const label = t.types?.[item.type] || item.type;
  const isSystem = !item.actorId;

  return (
    <article
      className={`uf-notification-item ${item.isRead ? "" : "is-unread"}`}
    >
      <div className="uf-notification-left">
        {actorHref ? (
          <Link href={actorHref} className="uf-notification-avatar-link">
            <NotificationAvatar
              image={item.actorImage}
              initial={actorInitial}
              iconName={iconName}
              iconColor={iconColor}
            />
          </Link>
        ) : (
          <NotificationAvatar
            image={null}
            initial={actorInitial}
            iconName={iconName}
            iconColor={iconColor}
            isSystem
          />
        )}
      </div>

      <div className="uf-notification-main">
        <div className="uf-notification-text">
          {actorHref ? (
            <Link href={actorHref} className="uf-notification-actor">
              {actorName}
            </Link>
          ) : (
            <span className="uf-notification-actor uf-notification-actor--system">
              {isSystem ? t.systemLabel : actorName}
            </span>
          )}{" "}
          <span>{label}</span>
        </div>

        <div className="uf-notification-meta">
          <span className="uf-notification-time">
            {formatTime(item.createdAt)}
          </span>
          {!item.isRead ? (
            <span className="uf-unread-pill">{t.new}</span>
          ) : (
            <span className="uf-read-pill">{t.read}</span>
          )}
          <span
            className="uf-notification-cat-badge"
            style={{ color: iconColor }}
          >
            {t.categories?.[item.category] || item.category}
          </span>
        </div>
      </div>

      <div className="uf-notification-right">
        {!item.isRead ? (
          <form action={markNotificationRead}>
            <input type="hidden" name="notificationId" value={item.id} />
            <button className="uf-notification-read-btn" type="submit">
              {t.markRead}
            </button>
          </form>
        ) : (
          <div className="uf-notification-read-state">
            <UiIcon name="check" size={14} />
          </div>
        )}
      </div>
    </article>
  );
}

function NotificationAvatar({ image, initial, iconName, iconColor, isSystem }) {
  return (
    <div className="uf-notification-avatar-wrap">
      {image ? (
        <img src={image} alt="" className="uf-notification-avatar" />
      ) : (
        <div
          className={`uf-notification-avatar uf-notification-avatar-fallback ${isSystem ? "is-system" : ""}`}
        >
          {isSystem ? (
            <UiIcon name={iconName} size={20} />
          ) : (
            initial
          )}
        </div>
      )}
      <span
        className="uf-notification-type-icon"
        style={{ color: iconColor, background: "#fff" }}
      >
        <UiIcon name={iconName} size={11} />
      </span>
    </div>
  );
}

function groupByCategory(rows) {
  const map = {};
  for (const r of rows) {
    const cat = r.category || "social";
    if (!map[cat]) map[cat] = [];
    map[cat].push(r);
  }
  return map;
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
  transition: background-color 160ms ease, border-color 160ms ease;
}

.uf-mark-all-btn:hover {
  background: #f4f7fb;
  border-color: rgba(11, 58, 168, 0.24);
}

.uf-notif-controls {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.uf-notif-filters {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.uf-notif-filter {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 7px 13px;
  border-radius: 999px;
  border: 1px solid #d9e2ef;
  background: #fff;
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 160ms ease;
}

.uf-notif-filter:hover {
  background: #f8fafc;
  border-color: #c7d2e0;
}

.uf-notif-filter.active {
  background: #0b3aa8;
  color: #fff;
  border-color: #0b3aa8;
}

.uf-notif-prefs {
  background: #fff;
  border: 1px solid #d9e2ef;
  border-radius: 14px;
  padding: 16px 20px;
}

.uf-notif-prefs-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 800;
  color: #0f172a;
  margin-bottom: 12px;
}

.uf-notif-prefs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 10px;
}

.uf-notif-pref-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 0;
}

.uf-notif-pref-label {
  font-size: 13px;
  font-weight: 700;
  color: #334155;
}

.uf-notif-toggle {
  width: 40px;
  height: 22px;
  border-radius: 999px;
  border: none;
  position: relative;
  cursor: pointer;
  transition: background 200ms ease;
  flex-shrink: 0;
}

.uf-notif-toggle.on {
  background: #0b3aa8;
}

.uf-notif-toggle.off {
  background: #cbd5e1;
}

.uf-notif-toggle:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.uf-notif-toggle-knob {
  position: absolute;
  top: 2px;
  width: 18px;
  height: 18px;
  border-radius: 999px;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0,0,0,0.15);
  transition: left 200ms ease;
}

.uf-notif-toggle.on .uf-notif-toggle-knob {
  left: 20px;
}

.uf-notif-toggle.off .uf-notif-toggle-knob {
  left: 2px;
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
  padding: 16px 22px;
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

.uf-notification-avatar-link {
  text-decoration: none;
}

.uf-notification-avatar-wrap {
  position: relative;
  width: 48px;
  height: 48px;
}

.uf-notification-avatar {
  width: 48px;
  height: 48px;
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
  font-size: 16px;
  font-weight: 900;
}

.uf-notification-avatar-fallback.is-system {
  background: linear-gradient(135deg, #0b3aa8, #062fae);
  border-radius: 14px;
}

.uf-notification-type-icon {
  position: absolute;
  right: -3px;
  bottom: -2px;
  width: 22px;
  height: 22px;
  border-radius: 999px;
  border: 1px solid #d9e2ef;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.uf-notification-main {
  min-width: 0;
}

.uf-notification-text {
  color: #334155;
  font-size: 14px;
  line-height: 1.5;
  word-break: break-word;
}

.uf-notification-actor {
  color: #0f172a;
  text-decoration: none;
  font-weight: 800;
}

.uf-notification-actor:hover {
  text-decoration: underline;
}

.uf-notification-actor--system {
  font-style: italic;
  color: #0b3aa8;
}

.uf-notification-meta {
  margin-top: 6px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.uf-notification-time {
  color: #64748b;
  font-size: 12px;
  font-weight: 600;
}

.uf-unread-pill,
.uf-read-pill {
  min-height: 20px;
  padding: 0 7px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 800;
}

.uf-unread-pill {
  background: #eef4ff;
  color: #0b3aa8;
}

.uf-read-pill {
  background: #f4f7fb;
  color: #94a3b8;
}

.uf-notification-cat-badge {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.uf-notification-right {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.uf-notification-read-btn {
  min-height: 34px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid #d9e2ef;
  background: #ffffff;
  color: #0f172a;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  white-space: nowrap;
  transition: all 160ms ease;
}

.uf-notification-read-btn:hover {
  background: #f4f7fb;
  border-color: rgba(11, 58, 168, 0.24);
  color: #0b3aa8;
}

.uf-notification-read-state {
  width: 30px;
  height: 30px;
  border-radius: 999px;
  background: #f4f7fb;
  color: #94a3b8;
  display: inline-flex;
  align-items: center;
  justify-content: center;
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
  font-size: 14px;
  line-height: 1.55;
}

@media (max-width: 700px) {
  .uf-notifications-header-card {
    padding: 18px 16px;
  }

  .uf-notification-item {
    grid-template-columns: 48px minmax(0, 1fr);
    padding: 14px 16px;
  }

  .uf-notification-right {
    grid-column: 2 / 3;
    justify-content: flex-start;
    margin-top: 8px;
  }

  .uf-notif-prefs-grid {
    grid-template-columns: 1fr;
  }
}
`;
