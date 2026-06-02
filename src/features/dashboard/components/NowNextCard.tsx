import Link from "next/link";
import UiIcon from "@/shared/ui/UiIcon";
import { Card } from "@/shared/ui/Card";
import { EmptyState } from "@/shared/ui/Layout";
import { Button } from "@/shared/ui/Button";
import type { ScheduleItem, ClassStatus } from "../server/today-utils";

type NowNextCardProps = {
  todayClasses: Array<ScheduleItem & { status: ClassStatus }>;
  /** The single "next" class from any future day if today has nothing left */
  nextFutureClass: ScheduleItem | null;
  nextFutureLabel: string; // e.g. "Tue" or "Tomorrow"
  t: (key: string) => string;
};

export default function NowNextCard({
  todayClasses,
  nextFutureClass,
  nextFutureLabel,
  t,
}: NowNextCardProps) {
  // Find the current class (if any) and the next upcoming class today
  const currentClass = todayClasses.find((c) => c.status === "current");
  const nextToday = todayClasses.find((c) => c.status === "next" || c.status === "upcoming");

  // Determine what to show as the hero card
  const heroClass = currentClass || nextToday || nextFutureClass;
  const isCurrent = !!currentClass;
  const isToday = !!currentClass || !!nextToday;

  if (!heroClass) {
    return (
      <section className="dashboard-section-wide" id="today-now-next">
        <Card padding="md">
          <EmptyState
            icon="calendar"
            title={t("today.noUpcomingClasses") || "No upcoming classes"}
            action={
              <Link href="/schedule">
                <Button variant="outline" size="sm">
                  {t("today.seeSchedule")}
                </Button>
              </Link>
            }
          />
        </Card>
      </section>
    );
  }

  return (
    <section className="dashboard-section-wide" id="today-now-next">
      <Card padding="none">
        <div className={`dash-now-card ${isCurrent ? "dash-now-card--live" : ""}`}>
          <div className="dash-now-card-left">
            <div className="dash-now-badge">
              {isCurrent ? (
                <>
                  <span className="dash-now-dot" />
                  {t("today.happeningNow") || "Now"}
                </>
              ) : isToday ? (
                t("today.nextClass")
              ) : (
                nextFutureLabel
              )}
            </div>
            <div className="dash-now-card-course">
              {heroClass.courseCode || heroClass.courseName}
            </div>
            <div className="dash-now-card-name">
              {heroClass.courseCode ? heroClass.courseName : ""}
            </div>
            <div className="dash-now-card-room">
              <UiIcon name="map-pin" size={14} />
              {t("today.room")}: {heroClass.room || "TBA"}
            </div>
          </div>
          <div className="dash-now-card-right">
            <div className="dash-now-card-time">
              {heroClass.startTime}
            </div>
            <div className="dash-now-card-endtime">
              {isCurrent
                ? `${t("today.endsAt") || "Ends"} ${heroClass.endTime}`
                : `\u2013 ${heroClass.endTime}`}
            </div>
          </div>
        </div>
      </Card>
    </section>
  );
}
