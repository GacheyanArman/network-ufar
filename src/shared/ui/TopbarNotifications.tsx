import Link from "next/link";
import UiIcon from "@/shared/ui/UiIcon";

type Props = {
  unread: number;
};

/**
 * Topbar bell — links to /notifications with an unread-count badge.
 * Server component: count comes from the cached query in layout.
 */
export default function TopbarNotifications({ unread }: Props) {
  const display = unread > 99 ? "99+" : String(unread);

  return (
    <Link
      href="/notifications"
      className="action-icon-btn topbar-action-icon topbar-action-icon--badge"
      aria-label={
        unread > 0 ? `Notifications (${display} unread)` : "Notifications"
      }
    >
      <UiIcon name="bell" size={20} />
      {unread > 0 && (
        <span className="topbar-icon-badge" aria-hidden="true">
          {display}
        </span>
      )}
    </Link>
  );
}
