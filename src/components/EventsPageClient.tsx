"use client";

import Link from "next/link";
import { useCallback, useMemo, useState, useTransition, useRef } from "react";
import UiIcon from "@/components/UiIcon";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  createEvent,
  deleteEvent,
  rsvpToEvent,
  getEventsList,
  type EventsFilter,
  type EventListItem,
} from "@/app/actions/events";

type Community = { id: string; name: string };

type Props = {
  events: EventListItem[];
  myCommunities: Community[];
  filterCommunities?: Community[];
  currentUserId: string;
};

const CATEGORY_META: Record<
  string,
  { color: string; bg: string; icon: string }
> = {
  academic: { color: "#7c3aed", bg: "#f5f3ff", icon: "graduation" },
  club: { color: "#d97706", bg: "#fffbeb", icon: "users" },
  career: { color: "#0891b2", bg: "#ecfeff", icon: "building" },
  social: { color: "#ec4899", bg: "#fdf2f8", icon: "heart" },
  sports: { color: "#16a34a", bg: "#f0fdf4", icon: "trending-up" },
  workshop: { color: "#2563eb", bg: "#eff6ff", icon: "book" },
  exam: { color: "#dc2626", bg: "#fef2f2", icon: "file" },
  party: { color: "#ec4899", bg: "#fdf2f8", icon: "heart" },
  cultural: { color: "#ec4899", bg: "#fdf2f8", icon: "users" },
  other: { color: "#64748b", bg: "#f8fafc", icon: "calendar" },
};

const PRIMARY_CATEGORIES = [
  "academic",
  "club",
  "career",
  "social",
  "sports",
  "workshop",
  "exam",
] as const;

const FILTERS: { value: EventsFilter; labelKey: string }[] = [
  { value: "upcoming", labelKey: "events.filters.upcoming" },
  { value: "today", labelKey: "events.filters.today" },
  { value: "this_week", labelKey: "events.filters.thisWeek" },
  { value: "my_events", labelKey: "events.filters.myEvents" },
  { value: "community", labelKey: "events.filters.community" },
  { value: "past", labelKey: "events.filters.past" },
];

const REMINDER_OPTIONS = [
  { value: 24 * 60, labelKey: "events.form.oneDayBefore" },
  { value: 3 * 60, labelKey: "events.form.threeHoursBefore" },
  { value: 30, labelKey: "events.form.thirtyMinutesBefore" },
];

function fmtDate(iso: string | null, locale: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
function fmtTime(iso: string | null, locale: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function interpolate(
  template: string,
  values: Record<string, string | number>,
) {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

const deleteAction = deleteEvent as unknown as (
  fd: FormData,
) => void | Promise<void>;

export default function EventsPageClient({
  events: initialEvents,
  myCommunities,
  filterCommunities = myCommunities,
  currentUserId,
}: Props) {
  const { t } = useLanguage();
  const [events, setEvents] = useState<EventListItem[]>(initialEvents);
  const [filter, setFilter] = useState<EventsFilter>("upcoming");
  const [category, setCategory] = useState<string>("");
  const [communityId, setCommunityId] = useState<string>("");
  const [query, setQuery] = useState("");
  const [loading, startLoading] = useTransition();
  const [showCreate, setShowCreate] = useState(false);

  const refetch = useCallback(
    (f: {
      filter: EventsFilter;
      category: string;
      communityId: string;
      query: string;
    }) => {
      startLoading(() => {
        getEventsList({
          filter: f.filter,
          category: f.category || undefined,
          communityId: f.communityId || undefined,
          query: f.query || undefined,
        })
          .then((data) => setEvents(data))
          .catch((err) => console.error("getEventsList failed:", err));
      });
    },
    [],
  );

  const handleFilter = (f: EventsFilter) => {
    setFilter(f);
    refetch({ filter: f, category, communityId, query });
  };
  const handleCategory = (c: string) => {
    setCategory(c);
    refetch({ filter, category: c, communityId, query });
  };
  const handleCommunity = (id: string) => {
    setCommunityId(id);
    refetch({ filter, category, communityId: id, query });
  };

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleQuery = (q: string) => {
    setQuery(q);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      refetch({ filter, category, communityId, query: q });
    }, 300);
  };

  const handleOptimisticRsvp = useCallback(
    (eventId: string, target: "going" | "interested" | "not_going") => {
      setEvents((prev) =>
        prev.map((e) => {
          if (e.id !== eventId) return e;
          let going = e.goingCount;
          let interested = e.maybeCount;
          if (e.rsvpStatus === "going") going = Math.max(0, going - 1);
          if (e.rsvpStatus === "interested")
            interested = Math.max(0, interested - 1);
          let newStatus: any = target;
          if (
            target === "going" &&
            e.maxAttendees != null &&
            e.maxAttendees > 0 &&
            going >= e.maxAttendees &&
            e.enableWaitlist
          ) {
            newStatus = "waitlisted";
          } else if (target === "going") {
            going += 1;
          } else if (target === "interested") {
            interested += 1;
          }
          return {
            ...e,
            rsvpStatus: newStatus,
            goingCount: going,
            maybeCount: interested,
          };
        }),
      );
    },
    [],
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <section
        className="card"
        style={{
          padding: "clamp(18px, 3vw, 24px)",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <h1
              style={{
                margin: "0 0 4px",
                fontSize: "clamp(1.4rem, 3vw, 1.9rem)",
                fontWeight: 950,
              }}
            >
              <span
                style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
              >
                <UiIcon name="calendar" size={24} /> {t("events.title")}
              </span>
            </h1>
            <p
              style={{
                margin: 0,
                color: "var(--text-secondary)",
                fontSize: "0.95rem",
              }}
            >
              {t("events.description")}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowCreate(true)}
            style={{
              fontSize: "0.85rem",
              minHeight: 38,
              padding: "0 14px",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            + {t("events.createEvent")}
          </button>
        </div>

        <input
          value={query}
          onChange={(e) => handleQuery(e.target.value)}
          placeholder={t("events.searchPlaceholder")}
          style={{
            height: 42,
            border: "1px solid var(--border-color)",
            borderRadius: 10,
            padding: "0 14px",
            fontSize: "0.9rem",
            outline: "none",
            background: "var(--bg-main)",
            color: "var(--text-primary)",
          }}
        />

        <div
          style={{
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            overflowX: "auto",
          }}
        >
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => handleFilter(f.value)}
              style={pillStyle(filter === f.value)}
            >
              {t(f.labelKey)}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => handleCategory("")}
            style={pillStyle(category === "")}
          >
            {t("events.categories.all")}
          </button>
          {PRIMARY_CATEGORIES.map((c) => {
            const m = CATEGORY_META[c];
            return (
              <button
                key={c}
                type="button"
                onClick={() => handleCategory(c)}
                style={pillStyle(category === c, m.color, m.bg)}
              >
                <UiIcon name={m.icon} size={14} /> {t(`events.categories.${c}`)}
              </button>
            );
          })}
        </div>

        {filter === "community" && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => handleCommunity("")}
              style={pillStyle(communityId === "")}
            >
              {t("events.allMyCommunities")}
            </button>
            {filterCommunities.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => handleCommunity(c.id)}
                style={pillStyle(communityId === c.id)}
              >
                {c.name}
              </button>
            ))}
            {filterCommunities.length === 0 && (
              <span
                style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}
              >
                {t("events.noCommunitiesJoined")}
              </span>
            )}
          </div>
        )}
      </section>

      {loading ? (
        <SkeletonGrid />
      ) : events.length === 0 ? (
        <EmptyState
          title={t("events.noEventsMatch")}
          message={
            filter === "past"
              ? t("events.noPastEvents")
              : t("events.emptyCreateHint")
          }
        />
      ) : (
        <div className="events-grid">
          {events.map((e) => (
            <EventCard
              key={e.id}
              event={e}
              currentUserId={currentUserId}
              onRsvpOptimistic={handleOptimisticRsvp}
            />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateEventModal
          myCommunities={myCommunities}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            refetch({ filter, category, communityId, query });
          }}
        />
      )}

      <style jsx>{`
        .events-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 16px;
        }
      `}</style>
    </div>
  );
}

function EventCard({
  event: e,
  currentUserId,
  onRsvpOptimistic,
}: {
  event: EventListItem;
  currentUserId: string;
  onRsvpOptimistic: (
    eventId: string,
    target: "going" | "interested" | "not_going",
  ) => void;
}) {
  const { t, locale } = useLanguage();
  const meta = CATEGORY_META[e.eventType] || CATEGORY_META.other;
  const isPast = useMemo(
    // eslint-disable-next-line react-hooks/purity
    () => (e.startTime ? new Date(e.startTime).getTime() < Date.now() : false),
    [e.startTime],
  );
  const cap = e.maxAttendees ?? 0;
  const fillPct =
    cap > 0 ? Math.min(100, Math.round((e.goingCount / cap) * 100)) : 0;

  const handleRsvp = async (target: "going" | "interested" | "not_going") => {
    onRsvpOptimistic(e.id, target);
    const fd = new FormData();
    fd.set("eventId", e.id);
    fd.set("status", target);
    try {
      await rsvpToEvent(fd);
    } catch (err) {
      console.error("rsvpToEvent failed:", err);
    }
  };

  const isWaitlistCase =
    e.maxAttendees != null &&
    e.maxAttendees > 0 &&
    e.goingCount >= e.maxAttendees &&
    e.enableWaitlist &&
    e.rsvpStatus !== "going" &&
    e.rsvpStatus !== "waitlisted";

  return (
    <div
      className="card"
      style={{
        display: "flex",
        flexDirection: "column",
        borderRadius: 14,
        overflow: "hidden",
        border: "1px solid var(--border-color)",
        background: "var(--bg-main)",
      }}
    >
      <Link
        href={`/events/${e.id}`}
        style={{
          display: "block",
          textDecoration: "none",
          color: "inherit",
        }}
      >
        <div
          style={{
            position: "relative",
            background: meta.bg,
            height: 140,
            overflow: "hidden",
          }}
        >
          {e.imageUrl ? (
            <img
              src={e.imageUrl}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
                opacity: e.isCancelled || isPast ? 0.6 : 1,
              }}
            />
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                color: meta.color,
                opacity: 0.65,
              }}
            >
              <UiIcon name={meta.icon} size={46} />
            </div>
          )}
          <div
            style={{
              position: "absolute",
              top: 10,
              left: 10,
              background: "rgba(255,255,255,0.95)",
              borderRadius: 8,
              padding: "4px 10px",
              fontSize: "0.75rem",
              fontWeight: 800,
              color: meta.color,
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            }}
          >
            {fmtDate(e.startTime, locale)} · {fmtTime(e.startTime, locale)}
          </div>
          <div
            style={{
              position: "absolute",
              top: 10,
              right: 10,
              display: "flex",
              flexDirection: "column",
              gap: 4,
              alignItems: "flex-end",
            }}
          >
            <span
              style={{
                background: meta.color,
                color: "#fff",
                borderRadius: 999,
                padding: "3px 10px",
                fontSize: "0.7rem",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              <UiIcon name={meta.icon} size={12} /> {t(`events.categories.${e.eventType}`)}
            </span>
            {e.isCancelled && (
              <span
                style={{
                  background: "#dc2626",
                  color: "#fff",
                  borderRadius: 999,
                  padding: "3px 10px",
                  fontSize: "0.7rem",
                  fontWeight: 800,
                }}
              >
                {t("events.cancelled")}
              </span>
            )}
            {isPast && !e.isCancelled && (
              <span
                style={{
                  background: "rgba(0,0,0,0.55)",
                  color: "#fff",
                  borderRadius: 999,
                  padding: "3px 10px",
                  fontSize: "0.7rem",
                  fontWeight: 800,
                }}
              >
                {t("events.pastEvent")}
              </span>
            )}
          </div>
        </div>

        <div
          style={{
            padding: 14,
            display: "flex",
            flexDirection: "column",
            gap: 8,
            flex: 1,
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: "1rem",
              fontWeight: 900,
              lineHeight: 1.3,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {e.title}
          </h3>
          {e.description && (
            <p
              style={{
                margin: 0,
                color: "var(--text-secondary)",
                fontSize: "0.85rem",
                lineHeight: 1.4,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {e.description}
            </p>
          )}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              fontSize: "0.78rem",
              color: "var(--text-secondary)",
            }}
          >
            {e.location && (
              <span
                style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
              >
                <UiIcon name="flag" size={12} /> {e.location}
              </span>
            )}
            {e.communityName && (
              <span
                style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
              >
                <UiIcon name="users" size={12} /> {e.communityName}
              </span>
            )}
            <span
              style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
            >
              <UiIcon name="user" size={12} /> {e.organizerName}
            </span>
          </div>

          {cap > 0 && (
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.7rem",
                  color: "var(--text-secondary)",
                  fontWeight: 600,
                  marginBottom: 3,
                }}
              >
                <span>
                  {interpolate(t("events.card.goingCount"), {
                    going: e.goingCount,
                    capacity: cap,
                  })}
                </span>
                {e.waitlistedCount > 0 && (
                  <span>
                    {interpolate(t("events.card.waitlistCount"), {
                      count: e.waitlistedCount,
                    })}
                  </span>
                )}
              </div>
              <div
                style={{
                  height: 4,
                  background: "var(--border-color)",
                  borderRadius: 4,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${fillPct}%`,
                    height: "100%",
                    background: fillPct >= 100 ? "#dc2626" : meta.color,
                    transition: "width 0.2s",
                  }}
                />
              </div>
            </div>
          )}
          {e.rsvpStatus && (
            <div
              style={{
                fontSize: "0.78rem",
                fontWeight: 800,
                color: rsvpColor(e.rsvpStatus),
                background: "rgba(0,0,0,0.04)",
                borderRadius: 6,
                padding: "4px 8px",
                alignSelf: "flex-start",
              }}
            >
              {rsvpLabel(t, e.rsvpStatus, e.waitlistPosition ?? null)}
            </div>
          )}
        </div>
      </Link>

      <div
        style={{
          padding: "10px 14px",
          borderTop: "1px solid var(--border-color)",
          display: "flex",
          gap: 6,
          flexWrap: "wrap",
        }}
      >
        {!isPast && !e.isCancelled && (
          <>
            <RsvpBtn
              active={e.rsvpStatus === "going" || e.rsvpStatus === "waitlisted"}
              onClick={() => handleRsvp("going")}
              fullText={
                isWaitlistCase
                  ? t("events.card.joinWaitlist")
                  : t("events.card.youAreGoing")
              }
            />
            <RsvpBtn
              active={e.rsvpStatus === "interested"}
              onClick={() => handleRsvp("interested")}
              fullText={t("events.card.interested")}
              variant="secondary"
            />
            {e.rsvpStatus && e.rsvpStatus !== "not_going" && (
              <button
                type="button"
                onClick={() => handleRsvp("not_going")}
                style={{
                  padding: "6px 10px",
                  borderRadius: 8,
                  border: "1px solid var(--border-color)",
                  background: "var(--bg-main)",
                  color: "var(--text-secondary)",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {t("events.card.cancelRsvp")}
              </button>
            )}
          </>
        )}
        <Link
          href={`/events/${e.id}`}
          style={{
            marginLeft: "auto",
            padding: "6px 10px",
            borderRadius: 8,
            background: "var(--bg-hover, #f1f5f9)",
            color: "var(--text-primary)",
            textDecoration: "none",
            fontWeight: 700,
            fontSize: "0.78rem",
          }}
        >
          <span
            style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
          >
            {t("events.card.details")} <UiIcon name="arrow-right" size={12} />
          </span>
        </Link>
        {e.isMine && (
          <form action={deleteAction}>
            <input type="hidden" name="eventId" value={e.id} />
            <button
              type="submit"
              onClick={(ev) => {
                if (!confirm(t("events.form.deleteConfirm"))) ev.preventDefault();
              }}
              title={t("common.delete")}
              style={{
                padding: "6px 8px",
                borderRadius: 8,
                border: "1px solid var(--border-color)",
                background: "var(--bg-main)",
                color: "var(--text-secondary)",
                cursor: "pointer",
                fontSize: "0.85rem",
              }}
            >
              <UiIcon name="trash" size={14} />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function RsvpBtn({
  active,
  onClick,
  fullText,
  variant = "primary",
}: {
  active: boolean;
  onClick: () => void;
  fullText: string;
  variant?: "primary" | "secondary";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "6px 12px",
        borderRadius: 8,
        border: active
          ? "1px solid var(--french-blue, #2563eb)"
          : "1px solid var(--border-color)",
        background: active
          ? variant === "primary"
            ? "var(--french-blue, #2563eb)"
            : "var(--french-blue-soft, rgba(37,99,235,0.12))"
          : "var(--bg-main)",
        color: active && variant === "primary" ? "#fff" : "var(--text-primary)",
        fontWeight: 700,
        fontSize: "0.78rem",
        cursor: "pointer",
      }}
    >
      {fullText}
    </button>
  );
}

function rsvpLabel(
  t: (key: string) => string,
  status: string,
  position: number | null,
) {
  if (status === "going") return t("events.card.youAreGoing");
  if (status === "interested") return t("events.card.interested");
  if (status === "waitlisted")
    return position
      ? interpolate(t("events.card.waitlistPosition"), { position })
      : t("events.card.onWaitlist");
  if (status === "not_going") return t("events.card.notGoing");
  return status;
}
function rsvpColor(status: string) {
  if (status === "going") return "#16a34a";
  if (status === "interested") return "#2563eb";
  if (status === "waitlisted") return "#d97706";
  return "var(--text-secondary)";
}

function SkeletonGrid() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
        gap: 16,
      }}
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="card"
          style={{
            padding: 0,
            borderRadius: 14,
            overflow: "hidden",
            border: "1px solid var(--border-color)",
          }}
        >
          <div
            style={{
              height: 140,
              background:
                "linear-gradient(90deg, #f1f5f9 0%, #e2e8f0 50%, #f1f5f9 100%)",
              backgroundSize: "200% 100%",
              animation: "shimmer 1.4s infinite",
            }}
          />
          <div style={{ padding: 14 }}>
            <div
              style={{
                width: "80%",
                height: 16,
                background: "#e2e8f0",
                borderRadius: 4,
                marginBottom: 8,
              }}
            />
            <div
              style={{
                width: "60%",
                height: 12,
                background: "#e2e8f0",
                borderRadius: 4,
              }}
            />
          </div>
        </div>
      ))}
      <style jsx>{`
        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
      `}</style>
    </div>
  );
}

function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div
      className="card"
      style={{
        padding: "40px 20px",
        textAlign: "center",
        color: "var(--text-secondary)",
      }}
    >
      <div style={{ opacity: 0.45, marginBottom: 6 }}>
        <UiIcon name="calendar" size={34} />
      </div>
      <h3 style={{ margin: "0 0 4px", color: "var(--text-primary)" }}>
        {title}
      </h3>
      <p style={{ margin: 0, fontSize: "0.9rem" }}>{message}</p>
    </div>
  );
}

function CreateEventModal({
  myCommunities,
  onClose,
  onCreated,
}: {
  myCommunities: Community[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const { t } = useLanguage();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reminders, setReminders] = useState<Set<number>>(new Set());
  const [eventType, setEventType] = useState<string>("social");
  const [enableWaitlist, setEnableWaitlist] = useState(true);
  const [capacityMode, setCapacityMode] = useState<"unlimited" | "limited">(
    "unlimited",
  );
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setCoverFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setCoverPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setCoverPreview(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const fd = new FormData(e.currentTarget);
      fd.set("eventType", eventType);
      fd.set(
        "reminderOffsets",
        Array.from(reminders)
          .sort((a, b) => b - a)
          .join(","),
      );
      fd.set("enableWaitlist", enableWaitlist ? "true" : "false");
      if (capacityMode === "unlimited") {
        fd.delete("maxAttendees");
      }
      if (coverFile) {
        fd.set("coverFile", coverFile);
      }
      const dateStr = fd.get("startDate") as string;
      const timeStr = (fd.get("startTimeOnly") as string) || "18:00";
      if (dateStr) fd.set("startTime", `${dateStr}T${timeStr}`);
      fd.delete("startDate");
      fd.delete("startTimeOnly");
      const endDateStr = (fd.get("endDate") as string) || "";
      const endTimeStr = (fd.get("endTimeOnly") as string) || "";
      if (endDateStr)
        fd.set("endTime", `${endDateStr}T${endTimeStr || "23:59"}`);
      else fd.delete("endTime");
      fd.delete("endDate");
      fd.delete("endTimeOnly");

      const res = await createEvent(fd);
      if ((res as any)?.error) {
        setError((res as any).error);
      } else {
        onCreated();
      }
    } catch (err: any) {
      setError(err?.message || t("events.form.errorFailedCreate"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      onMouseDown={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.55)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        className="card"
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 600,
          maxHeight: "92vh",
          overflowY: "auto",
          padding: 20,
          borderRadius: 14,
          background: "var(--bg-main)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 14,
          }}
        >
          <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 950 }}>
            {t("events.form.title")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
            style={{
              minHeight: 32,
              padding: "0 10px",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>

        {error && (
          <div
            style={{
              background: "rgba(220,38,38,0.08)",
              border: "1px solid rgba(220,38,38,0.25)",
              color: "#b91c1c",
              padding: "8px 12px",
              borderRadius: 8,
              fontSize: "0.85rem",
              marginBottom: 12,
            }}
          >
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: 12 }}
          encType="multipart/form-data"
        >
          <Field label={t("events.form.eventTitle")}>
            <input
              required
              maxLength={160}
              name="title"
              style={fieldStyle}
              placeholder={t("events.form.titlePlaceholder")}
            />
          </Field>

          <Field label={t("events.form.category")}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
                gap: 6,
              }}
            >
              {PRIMARY_CATEGORIES.map((c) => {
                const m = CATEGORY_META[c];
                const active = eventType === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setEventType(c)}
                    style={{
                      borderRadius: 8,
                      padding: "8px 10px",
                      border: `1px solid ${
                        active ? m.color : "var(--border-color)"
                      }`,
                      background: active ? m.bg : "var(--bg-main)",
                      color: active ? m.color : "var(--text-primary)",
                      fontWeight: 700,
                      cursor: "pointer",
                      fontSize: "0.85rem",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      justifyContent: "center",
                    }}
                  >
                    <UiIcon name={m.icon} size={14} />
                    {t(`events.categories.${c}`)}
                  </button>
                );
              })}
            </div>
          </Field>

          <div style={twoCol}>
            <Field label={t("events.form.startDate")}>
              <input required type="date" name="startDate" style={fieldStyle} />
            </Field>
            <Field label={t("events.form.startTime")}>
              <input
                type="time"
                name="startTimeOnly"
                defaultValue="18:00"
                style={fieldStyle}
              />
            </Field>
          </div>

          <div style={twoCol}>
            <Field label={t("events.form.endDate")}>
              <input type="date" name="endDate" style={fieldStyle} />
            </Field>
            <Field label={t("events.form.endTime")}>
              <input type="time" name="endTimeOnly" style={fieldStyle} />
            </Field>
          </div>

          <Field label={t("events.form.location")}>
            <input
              name="location"
              style={fieldStyle}
              placeholder={t("events.form.locationPlaceholder")}
            />
          </Field>

          <Field label={t("events.form.description")}>
            <textarea
              name="description"
              rows={3}
              style={{ ...fieldStyle, resize: "none" }}
              placeholder={t("events.form.descriptionPlaceholder")}
            />
          </Field>

          <Field label={t("events.form.capacity")}>
            <div
              style={{
                display: "flex",
                gap: 6,
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                onClick={() => setCapacityMode("unlimited")}
                style={pillStyle(capacityMode === "unlimited")}
              >
                <UiIcon name="infinity" size={14} />{" "}
                {t("events.form.capacityUnlimited")}
              </button>
              <button
                type="button"
                onClick={() => setCapacityMode("limited")}
                style={pillStyle(capacityMode === "limited")}
              >
                <UiIcon name="users" size={14} />{" "}
                {t("events.form.capacityLimited")}
              </button>
            </div>
            {capacityMode === "limited" && (
              <div style={{ marginTop: 8 }}>
                <input
                  type="number"
                  name="maxAttendees"
                  min={1}
                  required
                  style={fieldStyle}
                  placeholder={t("events.form.maxAttendeesPlaceholder")}
                />
                <p
                  style={{
                    margin: "4px 0 0",
                    fontSize: "0.75rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  {t("events.form.capacityHelp")}
                </p>
              </div>
            )}
          </Field>

          <Field label={t("events.form.coverImage")}>
            <input
              ref={coverInputRef}
              type="file"
              name="coverFile"
              accept="image/*"
              onChange={handleCoverChange}
              style={{ display: "none" }}
            />
            <div
              onClick={() => coverInputRef.current?.click()}
              style={{
                border: "2px dashed var(--border-color)",
                borderRadius: 12,
                padding: coverPreview ? 0 : "20px 16px",
                textAlign: "center",
                cursor: "pointer",
                background: "var(--bg-hover, #f8fafc)",
                overflow: "hidden",
                transition: "border-color 0.15s",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLDivElement).style.borderColor =
                  "var(--french-blue, #2563eb)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLDivElement).style.borderColor =
                  "var(--border-color)")
              }
            >
              {coverPreview ? (
                <div style={{ position: "relative" }}>
                  <img
                    src={coverPreview}
                    alt=""
                    style={{
                      width: "100%",
                      height: 140,
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      right: 0,
                      background: "rgba(0,0,0,0.5)",
                      color: "#fff",
                      padding: "6px 12px",
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      textAlign: "center",
                    }}
                  >
                    {t("events.form.changeCover")}
                  </div>
                </div>
              ) : (
                <>
                  <UiIcon name="image" size={28} />
                  <div
                    style={{
                      marginTop: 8,
                      fontSize: "0.85rem",
                      fontWeight: 700,
                      color: "var(--french-blue, #2563eb)",
                    }}
                  >
                    {t("events.form.browseCover")}
                  </div>
                  <div
                    style={{
                      marginTop: 4,
                      fontSize: "0.75rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {t("events.form.coverHint")}
                  </div>
                </>
              )}
            </div>
          </Field>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: "0.85rem",
            }}
          >
            <input
              type="checkbox"
              checked={enableWaitlist}
              onChange={(e) => setEnableWaitlist(e.target.checked)}
            />
            {t("events.form.enableWaitlist")}
          </label>

          {myCommunities.length > 0 && (
            <Field label={t("events.form.community")}>
              <select name="communityId" style={fieldStyle} defaultValue="">
                <option value="">{t("events.form.noCommunity")}</option>
                {myCommunities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
          )}

          <Field label={t("events.form.reminders")}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {REMINDER_OPTIONS.map((opt) => {
                const active = reminders.has(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      const n = new Set(reminders);
                      if (active) n.delete(opt.value);
                      else n.add(opt.value);
                      setReminders(n);
                    }}
                    style={{
                      borderRadius: 999,
                      padding: "6px 12px",
                      border: `1px solid ${
                        active
                          ? "var(--french-blue, #2563eb)"
                          : "var(--border-color)"
                      }`,
                      background: active
                        ? "var(--french-blue-soft, rgba(37,99,235,0.1))"
                        : "var(--bg-main)",
                      color: active
                        ? "var(--french-blue, #2563eb)"
                        : "var(--text-primary)",
                      fontWeight: 700,
                      cursor: "pointer",
                      fontSize: "0.8rem",
                    }}
                  >
                    <UiIcon name="bell" size={13} /> {t(opt.labelKey)}
                  </button>
                );
              })}
            </div>
          </Field>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
              marginTop: 4,
            }}
          >
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              style={{
                minHeight: 38,
                padding: "0 14px",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              {t("events.form.cancel")}
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
              style={{
                minHeight: 38,
                padding: "0 14px",
                borderRadius: 8,
                cursor: submitting ? "default" : "pointer",
                opacity: submitting ? 0.6 : 1,
              }}
            >
              {submitting
                ? t("events.form.creating")
                : t("events.form.submit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function pillStyle(
  active: boolean,
  activeColor = "var(--french-blue, #2563eb)",
  activeBg = "var(--french-blue-soft, rgba(37,99,235,0.1))",
): React.CSSProperties {
  return {
    border: `1px solid ${active ? activeColor : "var(--border-color)"}`,
    background: active ? activeBg : "var(--bg-main)",
    color: active ? activeColor : "var(--text-primary)",
    borderRadius: 999,
    padding: "8px 14px",
    fontSize: "0.85rem",
    fontWeight: 700,
    cursor: "pointer",
    whiteSpace: "nowrap",
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
  };
}

const fieldStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid var(--border-color)",
  borderRadius: 10,
  padding: "9px 11px",
  fontSize: "0.9rem",
  outline: "none",
  background: "var(--bg-main)",
  color: "var(--text-primary)",
};

const twoCol: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 10,
};

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: "block" }}>
      <span
        style={{
          display: "block",
          fontSize: "0.78rem",
          fontWeight: 800,
          marginBottom: 4,
          color: "var(--text-secondary)",
          textTransform: "uppercase",
          letterSpacing: 0.4,
        }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}
