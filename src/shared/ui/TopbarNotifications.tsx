import Link from "next/link";
import { cookies } from "next/headers";
import UiIcon from "@/shared/ui/UiIcon";
import { Language } from "@/shared/i18n/i18n";
import { getServerTranslator } from "@/shared/i18n/server";

type Props = {
  unread: number;
};

/**
 * Topbar bell — links to /notifications with an unread-count badge.
 * Server component: count comes from the cached query in layout.
 */
export default async function TopbarNotifications({ unread }: Props) {
  const cookieStore = await cookies();
  const lang = (cookieStore.get("language")?.value || "en") as Language;
  const t = getServerTranslator(lang);

  const display = unread > 99 ? "99+" : String(unread);

  const ariaLabel =
    unread > 0
      ? t("widgets.notificationsUnread").replace("{count}", display)
      : t("widgets.notificationsLabel");

  return (
    <Link
      href="/notifications"
      className="action-icon-btn topbar-action-icon topbar-action-icon--badge"
      aria-label={ariaLabel}
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
