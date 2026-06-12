import Link from "next/link";
import UiIcon from "@/shared/ui/UiIcon";
import { Card } from "@/shared/ui/Card";
import { EmptyState } from "@/shared/ui/Layout";
import { Button } from "@/shared/ui/Button";
import type { DeadlineItem } from "../server/today-utils";
import {
  formatRelativeDay,
  safeDeadlineType,
} from "../server/today-utils";

type DeadlineListProps = {
  deadlines: DeadlineItem[];
  locale: string;
  lang: string;
  t: (key: string) => string;
};

export default function DeadlineList({
  deadlines,
  locale,
  lang,
  t,
}: DeadlineListProps) {
  const visible = deadlines.slice(0, 5);

  return (
    <section className="dashboard-section" id="today-deadlines">
      <div className="dash-section-head">
        <h2 className="dash-section-title">
          <UiIcon name="clock" size={20} color="var(--french-gold)" />{" "}
          {t("today.deadlines")}
        </h2>
        <Link href="/courses?tab=calendar" className="dash-view-all">
          {t("today.viewAll")}
        </Link>
      </div>

      {visible.length > 0 ? (
        <div className="dash-list">
          {visible.map((d) => {
            const relDay = formatRelativeDay(new Date(d.dueDate), locale);
            const isUrgent = relDay === "Today" || relDay === "Aujourd\u2019hui" || relDay === "\u0531\u0575\u057d\u0585\u0580";
            const dueDateStr = new Intl.DateTimeFormat(locale, {
              month: "short",
              day: "numeric",
            }).format(new Date(d.dueDate));

            return (
              <Link
                key={d.id}
                href={`/courses?tab=calendar`}
                className="dash-link-reset"
              >
                <Card
                  padding="sm"
                  interactive
                  className={isUrgent ? "dash-deadline-urgent" : ""}
                >
                  <div className="dash-deadline-row">
                    <div className={`dash-deadline-date ${isUrgent ? "dash-deadline-date--urgent" : ""}`}>
                      <div className="dash-deadline-month">
                        {new Date(d.dueDate).toLocaleString(locale, {
                          month: "short",
                        })}
                      </div>
                      <div className="dash-deadline-day">
                        {new Date(d.dueDate).getDate()}
                      </div>
                    </div>
                    <div>
                      <div className="dash-deadline-title">{d.title}</div>
                      <div className="dash-deadline-type">
                        {safeDeadlineType(d.eventType, lang)}
                        <span className="dash-deadline-relative">
                          {" \u00b7 "}
                          {relDay}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <Card padding="md">
          <EmptyState
            icon="check-circle"
            title={t("today.noDeadlines")}
            action={
              <Link href="/courses?tab=calendar">
                <Button variant="outline" size="sm">
                  {t("today.addDeadline") || "Add deadline"}
                </Button>
              </Link>
            }
          />
        </Card>
      )}
    </section>
  );
}
