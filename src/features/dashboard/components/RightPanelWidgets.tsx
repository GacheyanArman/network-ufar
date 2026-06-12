import Link from "next/link";
import { cookies } from "next/headers";
import {
  getCachedUserSchedule,
} from "@/shared/cache/cache";
import UiIcon from "@/shared/ui/UiIcon";
import { Language } from "@/shared/i18n/i18n";
import { getServerTranslator } from "@/shared/i18n/server";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type ScheduleEntry = {
  id: string;
  courseName: string;
  courseCode: string | null;
  room: string | null;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

type Props = {
  userId: string;
};

/**
 * Compact right-sidebar widgets: today's class lineup.
 *
 * The query is cached (`getCachedUserSchedule`)
 * with a short TTL and shared with `TodayDashboard`, so on the home page the
 * same data is fetched only once per render cycle.
 */
export default async function RightPanelWidgets({ userId }: Props) {
  const cookieStore = await cookies();
  const lang = (cookieStore.get("language")?.value || "en") as Language;
  const t = getServerTranslator(lang);

  const now = new Date();
  const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1;
  const currentTime = now.toTimeString().slice(0, 5);

  const allClasses = (await getCachedUserSchedule(userId)) as ScheduleEntry[];

  const todaysClasses = allClasses
    .filter((c: ScheduleEntry) => c.dayOfWeek === dayOfWeek && c.startTime >= currentTime)
    .slice(0, 4);

  return (
    <>
      {/* Today's schedule */}
      <div className="card right-widget">
        <div className="right-widget-head">
          <h4 className="widget-title">
            <UiIcon name="book-open" size={16} color="var(--french-gold)" /> {t("widgets.today")}
          </h4>
          <Link href="/courses?tab=schedule" className="right-widget-link">
            {t("widgets.all")}
          </Link>
        </div>

        {todaysClasses.length === 0 ? (
          <div className="empty-state-mini">
            <p>{t("widgets.noMoreClasses")}</p>
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
    </>
  );
}
