import Link from "next/link";
import UiIcon from "@/shared/ui/UiIcon";
import { Card } from "@/shared/ui/Card";
import { EmptyState } from "@/shared/ui/Layout";
import { Button } from "@/shared/ui/Button";
import type { EventItem } from "../server/today-utils";

type EventsListProps = {
  events: EventItem[];
  locale: string;
  t: (key: string) => string;
};

export default function EventsList({
  events,
  locale,
  t,
}: EventsListProps) {
  const visible = events.slice(0, 3);

  return (
    <section className="dashboard-section" id="today-events">
      <div className="dash-section-head">
        <h2 className="dash-section-title">
          <UiIcon name="calendar" size={20} color="var(--french-gold)" />{" "}
          {t("today.campusToday") || t("today.eventsThisWeek")}
        </h2>
        <Link href="/events" className="dash-view-all">
          {t("today.viewAll")}
        </Link>
      </div>

      {visible.length > 0 ? (
        <div className="dash-list">
          {visible.map((ev) => (
            <Link
              key={ev.id}
              href={`/events/${ev.id}`}
              className="dash-link-reset"
            >
              <Card padding="sm" interactive>
                <div className="dash-event-row">
                  <div className="dash-event-date">
                    <div className="dash-event-date-month">
                      {new Date(ev.startTime).toLocaleString(locale, {
                        month: "short",
                      })}
                    </div>
                    <div className="dash-event-date-day">
                      {new Date(ev.startTime).getDate()}
                    </div>
                  </div>
                  <div className="dash-event-info">
                    <div className="dash-event-title">{ev.title}</div>
                    <div className="dash-event-meta">
                      <span>
                        {new Date(ev.startTime).toLocaleTimeString(locale, {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {ev.location && <span>{ev.location}</span>}
                      {(ev.courseCode || ev.communityName) && (
                        <span className="dash-accent">
                          {ev.courseCode || ev.communityName}
                        </span>
                      )}
                    </div>
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
            icon="calendar"
            title={t("today.noEvents") || "No upcoming events"}
            action={
              <Link href="/events">
                <Button variant="outline" size="sm">
                  {t("emptyStates.explore.browseEvents") || "Browse events"}
                </Button>
              </Link>
            }
          />
        </Card>
      )}
    </section>
  );
}
