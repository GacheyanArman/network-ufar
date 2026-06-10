import Link from "next/link";
import UiIcon from "@/shared/ui/UiIcon";
import { Button } from "@/shared/ui/Button";

type SummaryBarProps = {
  classesToday: number;
  deadlinesCount: number;
  materialsCount: number;
  notificationsCount: number;
  t: (key: string) => string;
};

export default function SummaryBar({
  classesToday,
  deadlinesCount,
  materialsCount,
  notificationsCount,
  t,
}: SummaryBarProps) {
  const totalItems = classesToday + deadlinesCount + materialsCount + notificationsCount;

  if (totalItems === 0) {
    return (
      <div className="dash-summary-empty" id="today-summary">
        <h3 className="dash-summary-empty-title">Welcome to your student club</h3>
        <p className="dash-summary-empty-desc">
          Today is clear: check the feed, discover groups, or save new campus memories.
        </p>
        <div className="dash-summary-empty-actions">
          <Link href="/feed">
            <Button variant="outline" size="sm">Open feed</Button>
          </Link>
          <Link href="/communities">
            <Button variant="outline" size="sm">Explore groups</Button>
          </Link>
        </div>
      </div>
    );
  }

  const cards = [
    {
      href: "/today",
      icon: "calendar",
      isUrgent: false,
      title: classesToday > 0 ? `${classesToday} ${t("today.classesSummary") || "classes"}` : t("today.noClassesLabel") || "No classes",
      subtitle: t("today.todayTitle") || "Today",
    },
    {
      href: "/today",
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
      href: "/notifications",
      icon: "bell",
      isUrgent: notificationsCount > 0,
      title: notificationsCount > 0 ? `${notificationsCount} new` : "All caught up",
      subtitle: "Notifications",
    },
  ];

  return (
    <div className="dash-summary-grid" id="today-summary">
      {cards.map((card, i) => (
        <Link key={i} href={card.href} className={`dash-summary-card ${card.isUrgent ? "is-urgent" : ""}`}>
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
