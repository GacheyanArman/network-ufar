import Link from "next/link";
import UiIcon from "@/shared/ui/UiIcon";
import { Card } from "@/shared/ui/Card";
import { EmptyState } from "@/shared/ui/Layout";
import { Button } from "@/shared/ui/Button";
import type { ScheduleItem, ClassStatus } from "../server/today-utils";

type TodayScheduleListProps = {
  classes: Array<ScheduleItem & { status: ClassStatus }>;
  t: (key: string) => string;
};

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function TodayScheduleList({
  classes,
  t,
}: TodayScheduleListProps) {
  // Show max 6 today's classes
  const visible = classes.slice(0, 6);

  return (
    <section className="dashboard-section" id="today-schedule">
      <div className="dash-section-head">
        <h2 className="dash-section-title">
          <UiIcon name="list" size={20} color="var(--french-gold)" />{" "}
          {t("today.todaySchedule") || "Today\u2019s schedule"}
        </h2>
        <Link href="/courses?tab=schedule" className="dash-view-all">
          {t("today.viewAll")}
        </Link>
      </div>

      {visible.length > 0 ? (
        <div className="dash-list">
          {visible.map((cls) => (
            <Card
              key={cls.id}
              padding="sm"
              className={`dash-schedule-item dash-schedule-item--${cls.status}`}
            >
              <div className="dash-schedule-row">
                <div className="dash-schedule-time">
                  <span className={cls.status === "past" ? "dash-text-dimmed" : ""}>
                    {cls.startTime}
                  </span>
                  <span className="dash-schedule-endtime">{cls.endTime}</span>
                </div>
                <div className="dash-schedule-info">
                  <div className="dash-schedule-course">
                    {cls.courseCode || cls.courseName}
                    {cls.status === "current" && (
                      <span className="dash-now-pill">NOW</span>
                    )}
                  </div>
                  <div className="dash-schedule-meta">
                    {cls.courseCode ? cls.courseName : ""}
                    {cls.room && (
                      <>
                        {cls.courseCode ? " \u00b7 " : ""}
                        {t("today.room")}: {cls.room}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card padding="md">
          <EmptyState
            icon="calendar"
            title={t("today.noClassesScheduledToday") || "No classes scheduled today"}
            action={
              <Link href="/courses?tab=schedule">
                <Button variant="outline" size="sm">
                  {t("today.openSchedule") || "Open schedule"}
                </Button>
              </Link>
            }
          />
        </Card>
      )}
    </section>
  );
}
