import Link from "next/link";
import {
  getCachedUserSchedule,
  getCachedUpcomingDeadlines,
} from "@/shared/cache/cache";
import UiIcon from "@/shared/ui/UiIcon";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type Props = {
  userId: string;
};

/**
 * Compact right-sidebar widgets: today's class lineup + upcoming deadlines.
 *
 * Both queries are cached (`getCachedUserSchedule` / `getCachedUpcomingDeadlines`)
 * with short TTLs and shared with `TodayDashboard`, so on the home page the
 * same data is fetched only once per render cycle.
 */
export default async function RightPanelWidgets({ userId }: Props) {
  const now = new Date();
  const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1;
  const currentTime = now.toTimeString().slice(0, 5);

  const [allClasses, allDeadlines] = await Promise.all([
    getCachedUserSchedule(userId),
    getCachedUpcomingDeadlines(userId),
  ]);

  const todaysClasses = allClasses
    .filter((c) => c.dayOfWeek === dayOfWeek && c.startTime >= currentTime)
    .slice(0, 4);

  const upcomingDeadlines = allDeadlines.slice(0, 3);

  return (
    <>
      {/* Today's schedule */}
      <div className="card right-widget">
        <div className="right-widget-head">
          <h4 className="widget-title">
            <UiIcon name="book-open" size={16} color="var(--french-gold)" /> Today
          </h4>
          <Link href="/schedule" className="right-widget-link">
            All
          </Link>
        </div>

        {todaysClasses.length === 0 ? (
          <div className="empty-state-mini">
            <p>No more classes today.</p>
          </div>
        ) : (
          <ul className="right-widget-list">
            {todaysClasses.map((c) => (
              <li key={c.id} className="right-widget-row">
                <span className="right-widget-time">{c.startTime}</span>
                <span className="right-widget-main">
                  <strong>{c.courseCode || c.courseName}</strong>
                  <span className="right-widget-sub">
                    {c.room || "TBA"} • {DAY_LABELS[dayOfWeek]}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Upcoming deadlines */}
      <div className="card right-widget">
        <div className="right-widget-head">
          <h4 className="widget-title">
            <UiIcon name="clock" size={16} color="var(--french-gold)" /> Deadlines
          </h4>
          <Link href="/calendar" className="right-widget-link">
            All
          </Link>
        </div>

        {upcomingDeadlines.length === 0 ? (
          <div className="empty-state-mini">
            <p>You&rsquo;re all caught up.</p>
          </div>
        ) : (
          <ul className="right-widget-list">
            {upcomingDeadlines.map((d) => (
              <li key={d.id} className="right-widget-row">
                <span className="right-widget-date">
                  <span className="right-widget-month">
                    {new Date(d.dueDate).toLocaleString("en-US", {
                      month: "short",
                    })}
                  </span>
                  <span className="right-widget-day">
                    {new Date(d.dueDate).getDate()}
                  </span>
                </span>
                <span className="right-widget-main">
                  <strong>{d.title}</strong>
                  <span className="right-widget-sub">{d.eventType}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
