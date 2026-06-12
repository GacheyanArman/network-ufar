import Link from "next/link";
import UiIcon from "@/shared/ui/UiIcon";
import { Card } from "@/shared/ui/Card";
import { EmptyState } from "@/shared/ui/Layout";
import { Button } from "@/shared/ui/Button";

export type UnreadConversation = {
  senderId: string;
  senderName: string | null;
  preview: string;
};

type UnreadMessagesCardProps = {
  unreadCount: number;
  conversations: UnreadConversation[];
  t: (key: string) => string;
};

export default function UnreadMessagesCard({
  unreadCount,
  conversations,
  t,
}: UnreadMessagesCardProps) {
  const visible = conversations.slice(0, 3);

  return (
    <section className="dashboard-section" id="today-messages">
      <div className="dash-section-head">
        <h2 className="dash-section-title">
          <UiIcon name="message-circle" size={20} color="var(--french-gold)" />{" "}
          {t("today.unreadMessages") || "Unread messages"}
          {unreadCount > 0 ? (
            <span className="dash-accent" style={{ marginLeft: 6 }}>
              {unreadCount}
            </span>
          ) : null}
        </h2>
        <Link href="/messages?tab=unread" className="dash-view-all">
          {t("today.viewAll") || "View all"}
        </Link>
      </div>

      {visible.length > 0 ? (
        <div className="dash-list">
          {visible.map((c) => (
            <Link
              key={c.senderId}
              href={`/messages?user=${c.senderId}`}
              className="dash-link-reset"
            >
              <Card padding="sm" interactive>
                <div className="dash-material-row">
                  <div className="dash-material-icon">
                    <UiIcon name="message-circle" size={18} />
                  </div>
                  <div className="dash-material-meta">
                    <div className="dash-material-title">
                      {c.senderName || "Student"}
                    </div>
                    <div className="dash-material-sub">{c.preview}</div>
                  </div>
                  <UiIcon
                    name="chevron-right"
                    size={18}
                    color="var(--text-muted)"
                  />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card padding="md">
          <EmptyState
            icon="message-circle"
            title={t("today.noUnreadMessages") || "All caught up"}
            action={
              <Link href="/messages">
                <Button variant="outline" size="sm">
                  {t("today.openMessages") || "Open messages"}
                </Button>
              </Link>
            }
          />
        </Card>
      )}
    </section>
  );
}
