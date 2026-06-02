import Link from "next/link";
import UiIcon from "@/shared/ui/UiIcon";
import { Button } from "@/shared/ui/Button";

type SummaryBarProps = {
  classesToday: number;
  deadlinesCount: number;
  materialsCount: number;
  unreadMessages: number;
  t: (key: string) => string;
};

export default function SummaryBar({
  classesToday,
  deadlinesCount,
  materialsCount,
  unreadMessages,
  t,
}: SummaryBarProps) {
  const totalItems = classesToday + deadlinesCount + materialsCount + unreadMessages;

  if (totalItems === 0) {
    return (
      <div className="dash-summary-empty" id="today-summary">
        <h3 className="dash-summary-empty-title">{t("today.dayLooksClear") || "Your day looks clear"}</h3>
        <p className="dash-summary-empty-desc">
          {t("today.noTasksDesc") || "No classes, deadlines, new materials, or unread messages right now."}
        </p>
        <p className="dash-summary-empty-sub">
          {t("today.reviewNotes") || "Use this time to review notes or plan your next study session."}
        </p>
        <div className="dash-summary-empty-actions">
          <Link href="/schedule">
            <Button variant="outline" size="sm">
              {t("today.openSchedule") || "Open schedule"}
            </Button>
          </Link>
          <Link href="/study-materials">
            <Button variant="outline" size="sm">
              {t("today.browseMaterials") || "Browse materials"}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const cards = [
    {
      href: "/schedule",
      icon: "calendar",
      isUrgent: false,
      title: classesToday > 0 ? `${classesToday} ${t("today.classesSummary") || "classes"}` : t("today.noClassesLabel") || "No classes",
      subtitle: t("today.todayTitle") || "Today",
    },
    {
      href: "/calendar",
      icon: "alert-circle",
      isUrgent: deadlinesCount > 0,
      title: deadlinesCount > 0 ? `${deadlinesCount} ${deadlinesCount === 1 ? (t("today.deadlineSingle") || "deadline") : (t("today.deadlinesSummary") || "deadlines")}` : t("today.noDeadlinesLabel") || "No deadlines",
      subtitle: deadlinesCount > 0 ? (t("today.dueSoon") || "Due soon") : (t("today.deadlinesTitle") || "Deadlines"),
    },
    {
      href: "/study-materials",
      icon: "book",
      isUrgent: false,
      title: materialsCount > 0 ? `${materialsCount} ${t("today.materialsSummary") || "new materials"}` : t("today.noMaterialsLabel") || "No new materials",
      subtitle: t("today.studyMaterials") || "Study materials",
    },
    {
      href: "/messages",
      icon: "message-circle",
      isUrgent: false,
      title: unreadMessages > 0 ? `${unreadMessages} ${t("today.unreadSummary") || "unread"}` : t("today.allCaughtUp") || "All caught up",
      subtitle: t("today.messagesTitle") || "Messages",
    },
  ];

  return (
    <div className="dash-summary-grid" id="today-summary">
      {cards.map((card, i) => (
        <Link
          key={i}
          href={card.href}
          className={`dash-summary-card ${card.isUrgent ? "is-urgent" : ""}`}
        >
          <div className="dash-summary-icon" aria-hidden="true">
            <UiIcon name={card.icon} size={20} />
          </div>
          <div>
            <strong>{card.title}</strong>
            <span>{card.subtitle}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}
