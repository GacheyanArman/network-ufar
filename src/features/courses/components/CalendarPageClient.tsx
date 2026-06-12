"use client";

import { useMemo, useState, useRef, useCallback, useEffect } from "react";
import {
  createCalendarEntry,
  updateCalendarEntry,
  deleteCalendarEntry,
} from "@/features/courses/server/calendar";
import { translations } from "@/shared/i18n/i18n";
import UiIcon from "@/shared/ui/UiIcon";

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

type CalEntry = {
  id: string;
  masterId: string;
  title: string;
  description: string | null;
  eventType: string;
  category: string;
  course: string | null;
  faculty: string | null;
  communityId: string | null;
  communityName: string | null;
  location: string | null;
  onlineLink: string | null;
  dueDate: string;
  endDate: string | null;
  isAllDay: boolean;
  isPublic: boolean;
  recurrence: string;
  reminderOffsets: number[];
  createdBy: string;
  creatorName: string | null;
  source: "academic" | "rsvp";
  isMaster: boolean;
};

type Community = { id: string; name: string };

type Props = {
  entries: CalEntry[];
  myCommunities: Community[];
  currentUserId: string;
};

// Category metadata — colour, icon, label. The 6 colours requested by the
// product team are exam/homework/project/event/personal/community; the rest
// are kept as fallbacks for legacy rows.
const CATEGORY_META: Record<
  string,
  { color: string; bg: string; icon: string; label: string }
> = {
  exam:        { color: "var(--danger)", bg: "var(--danger-soft)", icon: "file-text", label: "Exam" },
  homework:    { color: "var(--french-blue)", bg: "var(--french-blue-soft)", icon: "book-open", label: "Homework" },
  assignment:  { color: "var(--french-blue)", bg: "var(--french-blue-soft)", icon: "book-open", label: "Homework" },
  project:     { color: "var(--purple)", bg: "var(--purple-soft)", icon: "lightbulb", label: "Project" },
  event:       { color: "#0891b2", bg: "#ecfeff", icon: "party", label: "Event" },
  personal:    { color: "var(--text-secondary)", bg: "var(--bg-soft)", icon: "bookmark", label: "Personal" },
  community:   { color: "var(--success)", bg: "var(--success-soft)", icon: "users", label: "Group" },
  lecture:     { color: "var(--purple)", bg: "var(--purple-soft)", icon: "graduation", label: "Lecture" },
  deadline:    { color: "#ea580c", bg: "#fff7ed", icon: "clock", label: "Deadline" },
  holiday:     { color: "var(--success)", bg: "var(--success-soft)", icon: "party", label: "Holiday" },
  other:       { color: "var(--text-secondary)", bg: "var(--bg-soft)", icon: "flag", label: "Other" },
};

const PRIMARY_CATEGORIES = [
  "exam",
  "homework",
  "project",
  "event",
  "personal",
  "community",
] as const;

const VIEWS = ["Week", "Day", "Month", "List"] as const;
type View = (typeof VIEWS)[number];

const DEADLINE_CATS = new Set([
  "exam",
  "homework",
  "assignment",
  "project",
  "deadline",
]);

const REMINDER_OPTIONS = [
  { value: 24 * 60, label: "1 day before" },
  { value: 3 * 60, label: "3 hours before" },
  { value: 30, label: "30 minutes before" },
];

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
function fmtFullDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
function startOfWeek(d: Date) {
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  // Monday-first week (ISO).
  const dow = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - dow);
  return start;
}
function endOfWeek(d: Date) {
  const e = startOfWeek(d);
  e.setDate(e.getDate() + 6);
  e.setHours(23, 59, 59, 999);
  return e;
}
function inRange(iso: string, from: Date, to: Date) {
  const d = new Date(iso);
  return d >= from && d <= to;
}

// `YYYY-MM-DDTHH:mm` form usable in <input type="datetime-local">.
function toLocalInputValue(iso: string | undefined | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
    d.getDate()
  )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function toLocalDateValue(iso: string | undefined | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// ---------------------------------------------------------------------------
// ICS export
// ---------------------------------------------------------------------------

function escIcs(s: string | null | undefined) {
  return (s || "")
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}
function toIcsTime(iso: string) {
  return (
    new Date(iso).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"
  );
}

function downloadIcs(entries: CalEntry[]) {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//UFARnet//Calendar//EN",
    "CALSCALE:GREGORIAN",
  ];
  for (const e of entries) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.id}@ufarnet`,
      `DTSTAMP:${toIcsTime(new Date().toISOString())}`,
      `DTSTART:${toIcsTime(e.dueDate)}`,
      `DTEND:${toIcsTime(e.endDate || e.dueDate)}`,
      `SUMMARY:${escIcs(e.title)}`,
      e.description ? `DESCRIPTION:${escIcs(e.description)}` : "",
      e.location ? `LOCATION:${escIcs(e.location)}` : "",
      "END:VEVENT"
    );
  }
  lines.push("END:VCALENDAR");
  const ics = lines.filter(Boolean).join("\r\n");
  const blob = new Blob([ics], { type: "text/calendar" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "ufarnet-calendar.ics";
  a.click();
  URL.revokeObjectURL(a.href);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type FormAction = (fd: FormData) => void | Promise<void>;
const deleteAction = deleteCalendarEntry as unknown as FormAction;

export default function CalendarPageClient({
  entries,
  myCommunities,
  currentUserId,
}: Props) {
  const lang = typeof window !== "undefined" ? (localStorage.getItem("language") || "en") : "en";
  const es = (translations[lang as keyof typeof translations] || translations.en).emptyStates;
  const [view, setView] = useState<View>("Week");
  const [query, setQuery] = useState("");
  const [filterCat, setFilterCat] = useState<string>("all");
  const [filterCourse, setFilterCourse] = useState("");
  const [filterFaculty, setFilterFaculty] = useState("");
  const [filterCommunity, setFilterCommunity] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const filtersRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!showFilters) return;
    const handler = (e: MouseEvent) => {
      if (filtersRef.current && !filtersRef.current.contains(e.target as Node)) {
        setShowFilters(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showFilters]);
  const [editing, setEditing] = useState<CalEntry | null>(null);
  const [creating, setCreating] = useState(false);
  const [cursor, setCursor] = useState<Date>(() => new Date()); // anchor date

  // Move the anchor cursor by view step.
  const shiftCursor = useCallback(
    (delta: number) => {
      setCursor((prev) => {
        const next = new Date(prev);
        if (view === "Day") next.setDate(next.getDate() + delta);
        else if (view === "Week") next.setDate(next.getDate() + 7 * delta);
        else if (view === "Month") next.setMonth(next.getMonth() + delta);
        return next;
      });
    },
    [view]
  );

  // ------------------- Filtering -------------------
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (q) {
        const hay = [
          e.title,
          e.description || "",
          e.course || "",
          e.location || "",
          e.faculty || "",
          e.communityName || "",
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filterCat !== "all" && e.eventType !== filterCat) return false;
      if (filterCourse && (e.course || "") !== filterCourse) return false;
      if (filterFaculty && (e.faculty || "") !== filterFaculty) return false;
      if (filterCommunity && (e.communityId || "") !== filterCommunity) return false;
      return true;
    });
  }, [entries, query, filterCat, filterCourse, filterFaculty, filterCommunity]);

  // Distinct courses / faculties from the data, for the filter dropdowns.
  const distinctCourses = useMemo(() => {
    const s = new Set<string>();
    for (const e of entries) if (e.course) s.add(e.course);
    return Array.from(s).sort();
  }, [entries]);
  const distinctFaculties = useMemo(() => {
    const s = new Set<string>();
    for (const e of entries) if (e.faculty) s.add(e.faculty);
    return Array.from(s).sort();
  }, [entries]);

  // ------------------- Derived buckets -------------------
  const now = new Date();
  const weekStart = startOfWeek(cursor);
  const weekEnd = endOfWeek(cursor);
  const dayStart = (() => {
    const d = new Date(cursor);
    d.setHours(0, 0, 0, 0);
    return d;
  })();
  const dayEnd = (() => {
    const d = new Date(cursor);
    d.setHours(23, 59, 59, 999);
    return d;
  })();

  const thisWeekItems = useMemo(
    () =>
      filtered
        .filter((e) => inRange(e.dueDate, weekStart, weekEnd))
        .sort(
          (a, b) =>
            new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
        ),
    [filtered, weekStart, weekEnd]
  );

  const dayItems = useMemo(
    () =>
      filtered
        .filter((e) => inRange(e.dueDate, dayStart, dayEnd))
        .sort(
          (a, b) =>
            new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
        ),
    [filtered, dayStart, dayEnd]
  );

  const myDeadlinesThisWeek = useMemo(() => {
    const ws = startOfWeek(now);
    const we = endOfWeek(now);
    return entries
      .filter(
        (e) =>
          e.createdBy === currentUserId &&
          DEADLINE_CATS.has(e.category) &&
          inRange(e.dueDate, ws, we)
      )
      .sort(
        (a, b) =>
          new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, currentUserId]);

  const upcomingDeadlines = useMemo(() => {
    return entries
      .filter(
        (e) =>
          DEADLINE_CATS.has(e.category) &&
          new Date(e.dueDate).getTime() >= now.getTime() &&
          new Date(e.dueDate).getTime() <= now.getTime() + 72 * 60 * 60 * 1000
      )
      .sort(
        (a, b) =>
          new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      )
      .slice(0, 5);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries]);

  // ------------------- Render -------------------

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* ============== Hero header ============== */}
      <section
        className="card"
        style={{
          padding: "clamp(18px, 3vw, 24px)",
          display: "flex",
          flexDirection: "column",
          gap: 16,
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
                color: "var(--text-primary)",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <UiIcon name="calendar" size={28} color="var(--french-navy)" />
              Calendar
            </h1>
            <p
              style={{
                margin: 0,
                color: "var(--text-secondary)",
                fontSize: "0.95rem",
              }}
            >
              Track classes, exams, deadlines, events and study groups.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setEditing(null);
                setCreating(true);
              }}
              style={btnStyle({ display: "inline-flex", alignItems: "center", gap: 6 })}
            >
              <UiIcon name="plus" size={14} />
              New entry
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => downloadIcs(filtered)}
              style={btnStyle({ display: "inline-flex", alignItems: "center", gap: 6 })}
            >
              <UiIcon name="download" size={14} />
              Export .ics
            </button>
          </div>
        </div>

        {/* Search & quick filters */}
        <div ref={filtersRef}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search title, course, location…"
              style={{
                flex: 1,
                minWidth: 200,
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
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowFilters((v) => !v)}
              style={btnStyle()}
            >
              {showFilters ? "Hide filters" : "Filters"}
            </button>
          </div>

          {showFilters && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 8,
                marginTop: 8,
              }}
            >
            <select
              value={filterCat}
              onChange={(e) => setFilterCat(e.target.value)}
              style={selectStyle()}
            >
              <option value="all">All categories</option>
              {Object.entries(CATEGORY_META).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
            <select
              value={filterCourse}
              onChange={(e) => setFilterCourse(e.target.value)}
              style={selectStyle()}
            >
              <option value="">Any course</option>
              {distinctCourses.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              value={filterFaculty}
              onChange={(e) => setFilterFaculty(e.target.value)}
              style={selectStyle()}
            >
              <option value="">Any faculty</option>
              {distinctFaculties.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
            <select
              value={filterCommunity}
              onChange={(e) => setFilterCommunity(e.target.value)}
              style={selectStyle()}
            >
              <option value="">Any community</option>
              {myCommunities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          )}
        </div>

        {/* View tabs + cursor controls */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {VIEWS.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                style={{
                  border: "1px solid var(--border-color)",
                  borderRadius: 999,
                  padding: "8px 14px",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  background:
                    view === v ? "var(--french-blue, #2563eb)" : "var(--bg-main)",
                  color: view === v ? "var(--bg-card)" : "var(--text-primary)",
                  transition: "all 0.15s ease",
                }}
              >
                {v}
              </button>
            ))}
          </div>
          {view !== "List" && (
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={btnStyle({ minHeight: 36, padding: "0 12px" })}
                onClick={() => shiftCursor(-1)}
              >
                ←
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={btnStyle({ minHeight: 36, padding: "0 12px" })}
                onClick={() => setCursor(new Date())}
              >
                Today
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={btnStyle({ minHeight: 36, padding: "0 12px" })}
                onClick={() => shiftCursor(1)}
              >
                →
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ============== Upcoming reminder banner ============== */}
      {upcomingDeadlines.length > 0 && (
        <UpcomingDeadlinesBanner deadlines={upcomingDeadlines} />
      )}

      {/* ============== My deadlines this week ============== */}
      <MyDeadlinesSection
        items={myDeadlinesThisWeek}
        currentUserId={currentUserId}
        onEdit={(e) => {
          setCreating(false);
          setEditing(e);
        }}
        onCreate={() => setCreating(true)}
      />

      {/* ============== Main view ============== */}
      {view === "Week" && (
        <WeekView
          weekStart={weekStart}
          items={thisWeekItems}
          currentUserId={currentUserId}
          onEdit={(e) => {
            setCreating(false);
            setEditing(e);
          }}
        />
      )}
      {view === "Day" && (
        <DayView
          day={dayStart}
          items={dayItems}
          currentUserId={currentUserId}
          onEdit={(e) => {
            setCreating(false);
            setEditing(e);
          }}
          onCreate={() => setCreating(true)}
        />
      )}
      {view === "Month" && (
        <MonthView
          cursor={cursor}
          items={filtered}
          onSelectDay={(d) => {
            setCursor(d);
            setView("Day");
          }}
        />
      )}
      {view === "List" && (
        <ListView
          items={filtered}
          currentUserId={currentUserId}
          onEdit={(e) => {
            setCreating(false);
            setEditing(e);
          }}
          onCreate={() => setCreating(true)}
          onClearFilters={() => {
            setFilterCat("all");
            setFilterCourse("");
            setFilterFaculty("");
            setFilterCommunity("");
            setQuery("");
          }}
        />
      )}

      {/* ============== Create/Edit modal ============== */}
      {(creating || editing) && (
        <EntryModal
          editing={editing}
          myCommunities={myCommunities}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-views
// ---------------------------------------------------------------------------

function UpcomingDeadlinesBanner({ deadlines }: { deadlines: CalEntry[] }) {
  return (
    <div
      style={{
        background:
          "linear-gradient(90deg, rgba(220,38,38,0.08), rgba(234,88,12,0.08))",
        border: "1px solid rgba(220,38,38,0.25)",
        borderRadius: 12,
        padding: "12px 16px",
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        flexWrap: "wrap",
      }}
    >
      <div style={{ color: "var(--danger)", display: "flex", alignItems: "center" }}>
        <UiIcon name="clock" size={22} />
      </div>
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ fontWeight: 800, marginBottom: 4 }}>
          {deadlines.length} deadline{deadlines.length === 1 ? "" : "s"} in the next 72 hours
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            color: "var(--text-secondary)",
            fontSize: "0.85rem",
          }}
        >
          {deadlines.map((d) => (
            <span
              key={d.id}
              style={{
                background: "rgba(255,255,255,0.7)",
                border: "1px solid var(--border-color)",
                borderRadius: 999,
                padding: "2px 10px",
                fontWeight: 600,
              }}
            >
              {d.title} · {fmtTime(d.dueDate)}{" "}
              {fmtFullDate(d.dueDate).split(",")[0]}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function MyDeadlinesSection({
  items,
  currentUserId,
  onEdit,
  onCreate,
}: {
  items: CalEntry[];
  currentUserId: string;
  onEdit: (e: CalEntry) => void;
  onCreate: () => void;
}) {
  const lang = typeof window !== "undefined" ? (localStorage.getItem("language") || "en") : "en";
  const es = (translations[lang as keyof typeof translations] || translations.en).emptyStates;
  return (
    <section>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 900, display: "inline-flex", alignItems: "center", gap: 8 }}>
          <UiIcon name="flag" size={18} color="var(--french-gold)" />
          My deadlines this week
          <span
            style={{
              marginLeft: 8,
              fontSize: "0.8rem",
              color: "var(--text-secondary)",
              fontWeight: 700,
            }}
          >
            {items.length} item{items.length !== 1 ? "s" : ""}
          </span>
        </h2>
      </div>
      {items.length === 0 ? (
        <div
          className="card"
          style={{
            padding: "32px 20px",
            textAlign: "center",
            color: "var(--text-secondary)",
            fontSize: "0.9rem",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 6,
          }}
        >
          <p style={{ margin: 0 }}>{es.calendar.noDeadlines}</p>
          <p style={{ margin: 0, fontSize: "0.85rem", opacity: 0.7 }}>{es.calendar.noDeadlinesHint}</p>
          <button
            className="btn btn-primary"
            style={{ marginTop: 6, fontSize: "0.85rem" }}
            onClick={onCreate}
          >
            {es.calendar.addDeadline}
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map((e) => (
            <EntryCard
              key={e.id}
              entry={e}
              currentUserId={currentUserId}
              onEdit={onEdit}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function WeekView({
  weekStart,
  items,
  currentUserId,
  onEdit,
}: {
  weekStart: Date;
  items: CalEntry[];
  currentUserId: string;
  onEdit: (e: CalEntry) => void;
}) {
  // Group items by day index 0..6.
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
  const groups = days.map((d) =>
    items.filter((e) => isSameDay(new Date(e.dueDate), d))
  );

  const headerLabel = `${weekStart.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })} – ${new Date(weekStart.getTime() + 6 * 86400_000).toLocaleDateString(
    "en-US",
    { month: "short", day: "numeric", year: "numeric" }
  )}`;

  return (
    <section>
      <h2 style={{ margin: "0 0 12px", fontSize: "1rem", fontWeight: 800 }}>
        Week of {headerLabel}
      </h2>
      <div className="calendar-week-grid">
        {days.map((d, i) => {
          const today = isSameDay(d, new Date());
          return (
            <div
              key={d.toISOString()}
              className="card"
              style={{
                padding: 10,
                borderRadius: 10,
                border: "1px solid var(--border-color)",
                background: today
                  ? "var(--french-blue-soft, rgba(37,99,235,0.06))"
                  : "var(--bg-main)",
                display: "flex",
                flexDirection: "column",
                gap: 6,
                minHeight: 120,
              }}
            >
              <div
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 800,
                  color: today
                    ? "var(--french-blue, #2563eb)"
                    : "var(--text-secondary)",
                  textTransform: "uppercase",
                  letterSpacing: 0.4,
                }}
              >
                {d.toLocaleDateString("en-US", { weekday: "short" })}{" "}
                {d.getDate()}
              </div>
              {groups[i].length === 0 ? (
                <div
                  style={{
                    color: "var(--text-muted)",
                    fontSize: "0.8rem",
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: 60,
                  }}
                >
                  —
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  {groups[i].slice(0, 4).map((e) => (
                    <DayChip
                      key={e.id}
                      entry={e}
                      onClick={() =>
                        e.createdBy === currentUserId ? onEdit(e) : null
                      }
                    />
                  ))}
                  {groups[i].length > 4 && (
                    <div
                      style={{
                        fontSize: "0.7rem",
                        color: "var(--text-muted)",
                        fontWeight: 700,
                      }}
                    >
                      +{groups[i].length - 4} more
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <style jsx>{`
        .calendar-week-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 8px;
        }
        @media (max-width: 900px) {
          .calendar-week-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 520px) {
          .calendar-week-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </section>
  );
}

function DayChip({
  entry,
  onClick,
}: {
  entry: CalEntry;
  onClick?: () => void;
}) {
  const meta = CATEGORY_META[entry.eventType] || CATEGORY_META.other;
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        textAlign: "left",
        background: meta.bg,
        color: meta.color,
        border: "none",
        borderLeft: `3px solid ${meta.color}`,
        borderRadius: 6,
        padding: "4px 6px",
        fontSize: "0.78rem",
        fontWeight: 700,
        cursor: onClick ? "pointer" : "default",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
      title={entry.title}
    >
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
        {fmtTime(entry.dueDate)} ·
        <UiIcon name={meta.icon} size={12} />
        {entry.title}
      </span>
    </button>
  );
}

function DayView({
  day,
  items,
  currentUserId,
  onEdit,
  onCreate,
}: {
  day: Date;
  items: CalEntry[];
  currentUserId: string;
  onEdit: (e: CalEntry) => void;
  onCreate: () => void;
}) {
  const lang = typeof window !== "undefined" ? (localStorage.getItem("language") || "en") : "en";
  const es = (translations[lang as keyof typeof translations] || translations.en).emptyStates;
  return (
    <section>
      <h2 style={{ margin: "0 0 12px", fontSize: "1.05rem", fontWeight: 900 }}>
        {fmtFullDate(day.toISOString())}
      </h2>
      {items.length === 0 ? (
        <div
          className="card"
          style={{
            padding: "32px 20px",
            textAlign: "center",
            color: "var(--text-secondary)",
          }}
        >
          <div style={{ opacity: 0.5, marginBottom: 6, display: "flex", justifyContent: "center", color: "var(--text-muted)" }}>
            <UiIcon name="calendar-x" size={28} />
          </div>
          <p style={{ margin: 0 }}>{es.calendar.noDayEvents}</p>
          <p style={{ margin: "4px 0 0", fontSize: "0.85rem", opacity: 0.7 }}>{es.calendar.noDayEventsHint}</p>
          <button className="btn btn-primary" style={{ marginTop: 8, fontSize: "0.85rem" }} onClick={onCreate}>
            {es.calendar.addEntry}
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map((e) => (
            <EntryCard
              key={e.id}
              entry={e}
              currentUserId={currentUserId}
              onEdit={onEdit}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function MonthView({
  cursor,
  items,
  onSelectDay,
}: {
  cursor: Date;
  items: CalEntry[];
  onSelectDay: (d: Date) => void;
}) {
  const firstDay = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const daysInMonth = new Date(
    cursor.getFullYear(),
    cursor.getMonth() + 1,
    0
  ).getDate();
  const startDow = (firstDay.getDay() + 6) % 7;
  const monthName = firstDay.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const today = new Date();

  return (
    <section className="card" style={{ padding: 16 }}>
      <h2
        style={{
          margin: "0 0 12px",
          fontSize: "1.05rem",
          fontWeight: 900,
          textAlign: "center",
        }}
      >
        {monthName}
      </h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 2,
          marginBottom: 4,
        }}
      >
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div
            key={d}
            style={{
              textAlign: "center",
              fontSize: "0.7rem",
              fontWeight: 900,
              color: "var(--text-muted)",
              padding: "4px 0",
              textTransform: "uppercase",
            }}
          >
            {d}
          </div>
        ))}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 2,
        }}
      >
        {Array.from({ length: startDow }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dayDate = new Date(
            cursor.getFullYear(),
            cursor.getMonth(),
            day
          );
          const dayItems = items.filter((e) =>
            isSameDay(new Date(e.dueDate), dayDate)
          );
          const isToday = isSameDay(dayDate, today);
          return (
            <button
              key={day}
              type="button"
              onClick={() => onSelectDay(dayDate)}
              style={{
                textAlign: "left",
                minHeight: 84,
                border: "1px solid var(--border-color)",
                borderRadius: 8,
                padding: 4,
                background: isToday
                  ? "var(--french-blue-soft, rgba(37,99,235,0.06))"
                  : "var(--bg-main)",
                cursor: "pointer",
                position: "relative",
              }}
            >
              <div
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 900,
                  color: isToday
                    ? "var(--french-blue, #2563eb)"
                    : "var(--text-primary)",
                  marginBottom: 2,
                }}
              >
                {day}
              </div>
              {dayItems.slice(0, 2).map((e) => {
                const meta =
                  CATEGORY_META[e.eventType] || CATEGORY_META.other;
                return (
                  <div
                    key={e.id}
                    style={{
                      fontSize: "0.65rem",
                      fontWeight: 700,
                      background: meta.bg,
                      color: meta.color,
                      borderRadius: 4,
                      padding: "1px 4px",
                      marginBottom: 2,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      display: "flex",
                      alignItems: "center",
                      gap: 3,
                    }}
                  >
                    <UiIcon name={meta.icon} size={10} />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.title}</span>
                  </div>
                );
              })}
              {dayItems.length > 2 && (
                <div
                  style={{
                    fontSize: "0.6rem",
                    color: "var(--text-muted)",
                    fontWeight: 700,
                  }}
                >
                  +{dayItems.length - 2} more
                </div>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function ListView({
  items,
  currentUserId,
  onEdit,
  onCreate,
  onClearFilters,
}: {
  items: CalEntry[];
  currentUserId: string;
  onEdit: (e: CalEntry) => void;
  onCreate: () => void;
  onClearFilters: () => void;
}) {
  const lang = typeof window !== "undefined" ? (localStorage.getItem("language") || "en") : "en";
  const es = (translations[lang as keyof typeof translations] || translations.en).emptyStates;

  if (items.length === 0) {
    return (
      <div
        className="card"
        style={{
          padding: "40px 20px",
          textAlign: "center",
          color: "var(--text-secondary)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 6,
        }}
      >
        <div style={{ opacity: 0.4, marginBottom: 6, display: "flex", justifyContent: "center", color: "var(--text-muted)" }}>
          <UiIcon name="calendar" size={32} />
        </div>
        <p style={{ margin: 0 }}>{es.calendar.noFilterMatch}</p>
        <p style={{ margin: 0, fontSize: "0.85rem", opacity: 0.7 }}>{es.calendar.noFilterMatchHint}</p>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button className="btn btn-secondary" style={{ fontSize: "0.85rem" }} onClick={onClearFilters}>
            {es.calendar.clearFilters}
          </button>
          <button className="btn btn-primary" style={{ fontSize: "0.85rem" }} onClick={onCreate}>
            {es.calendar.addNew}
          </button>
        </div>
      </div>
    );
  }
  // Group by month for nicer scanning.
  const groups = new Map<string, { label: string; rows: CalEntry[] }>();
  for (const e of items) {
    const d = new Date(e.dueDate);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const label = d.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
    if (!groups.has(key)) groups.set(key, { label, rows: [] });
    groups.get(key)!.rows.push(e);
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {Array.from(groups.entries()).map(([k, v]) => (
        <section key={k}>
          <h3
            style={{
              margin: "0 0 8px",
              fontSize: "0.75rem",
              fontWeight: 900,
              color: "var(--text-secondary)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {v.label}
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {v.rows.map((e) => (
              <EntryCard
                key={e.id}
                entry={e}
                currentUserId={currentUserId}
                onEdit={onEdit}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Entry card
// ---------------------------------------------------------------------------

function EntryCard({
  entry,
  currentUserId,
  onEdit,
}: {
  entry: CalEntry;
  currentUserId: string;
  onEdit: (e: CalEntry) => void;
}) {
  const meta = CATEGORY_META[entry.eventType] || CATEGORY_META.other;
  const date = new Date(entry.dueDate);
  const isPast = date < new Date();
  const today = isSameDay(date, new Date());
  const isCreator = entry.createdBy === currentUserId;

  return (
    <div
      className="card"
      style={{
        padding: "12px 14px",
        display: "flex",
        gap: 12,
        alignItems: "stretch",
        opacity: isPast ? 0.7 : 1,
        borderLeft: `4px solid ${meta.color}`,
        borderRadius: 12,
      }}
    >
      <div
        style={{
          minWidth: 56,
          textAlign: "center",
          background: meta.bg,
          borderRadius: 10,
          padding: "8px 4px",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            fontSize: "0.7rem",
            fontWeight: 900,
            color: meta.color,
            textTransform: "uppercase",
          }}
        >
          {date.toLocaleDateString("en-US", { month: "short" })}
        </div>
        <div
          style={{
            fontSize: "1.4rem",
            fontWeight: 950,
            color: meta.color,
            lineHeight: 1,
          }}
        >
          {date.getDate()}
        </div>
        <div
          style={{
            fontSize: "0.65rem",
            color: meta.color,
            fontWeight: 700,
          }}
        >
          {date.toLocaleDateString("en-US", { weekday: "short" })}
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            flexWrap: "wrap",
            marginBottom: 2,
          }}
        >
          <span
            style={{
              fontSize: "0.7rem",
              fontWeight: 900,
              color: meta.color,
              background: meta.bg,
              borderRadius: 6,
              padding: "2px 8px",
              textTransform: "uppercase",
              letterSpacing: 0.4,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <UiIcon name={meta.icon} size={11} />
            {meta.label}
          </span>
          {today && (
            <span
              style={{
                fontSize: "0.65rem",
                fontWeight: 900,
                color: "var(--bg-card)",
                background: "var(--french-blue, #2563eb)",
                borderRadius: 6,
                padding: "2px 8px",
              }}
            >
              TODAY
            </span>
          )}
          {entry.recurrence !== "none" && (
            <span
              style={{
                fontSize: "0.65rem",
                color: "var(--text-secondary)",
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <UiIcon name="repeat" size={11} />
              {entry.recurrence}
            </span>
          )}
          {!entry.isPublic && (
            <span
              style={{
                fontSize: "0.7rem",
                color: "var(--text-muted)",
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <UiIcon name="lock" size={11} />
              Private
            </span>
          )}
          {entry.source === "rsvp" && (
            <span
              style={{
                fontSize: "0.7rem",
                color: "var(--text-secondary)",
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <UiIcon name="check" size={11} />
              RSVP
            </span>
          )}
        </div>
        <div
          style={{
            fontSize: "0.95rem",
            fontWeight: 900,
            marginBottom: 2,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {entry.title}
        </div>
        <div
          style={{
            fontSize: "0.78rem",
            color: "var(--text-secondary)",
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <UiIcon name="clock" size={12} />
            {fmtTime(entry.dueDate)}
          </span>
          {entry.endDate && <span>– {fmtTime(entry.endDate)}</span>}
          {entry.course && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <UiIcon name="book" size={12} />
              {entry.course}
            </span>
          )}
          {entry.location && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <UiIcon name="map-pin" size={12} />
              {entry.location}
            </span>
          )}
          {entry.communityName && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <UiIcon name="users" size={12} />
              {entry.communityName}
            </span>
          )}
        </div>
        {entry.description && (
          <p
            style={{
              margin: "4px 0 0",
              fontSize: "0.8rem",
              color: "var(--text-secondary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {entry.description}
          </p>
        )}
      </div>

      {isCreator && entry.source === "academic" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <button
            type="button"
            onClick={() => onEdit(entry)}
            style={iconBtnStyle()}
            title="Edit"
            aria-label="Edit"
          >
            <UiIcon name="edit" size={14} />
          </button>
          <form action={deleteAction}>
            <input type="hidden" name="entryId" value={entry.masterId} />
            <button
              type="submit"
              style={iconBtnStyle()}
              title="Delete"
              aria-label="Delete"
              onClick={(e) => {
                if (!confirm("Delete this entry?")) e.preventDefault();
              }}
            >
              <UiIcon name="trash" size={14} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal: create / edit
// ---------------------------------------------------------------------------

function EntryModal({
  editing,
  myCommunities,
  onClose,
}: {
  editing: CalEntry | null;
  myCommunities: Community[];
  onClose: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const initial = editing;
  const initialReminders = useMemo(
    () => new Set(initial?.reminderOffsets ?? []),
    [initial]
  );
  const [reminders, setReminders] = useState<Set<number>>(initialReminders);
  const [recurrence, setRecurrence] = useState(initial?.recurrence ?? "none");
  const [isAllDay, setIsAllDay] = useState(initial?.isAllDay ?? false);
  const [isPublic, setIsPublic] = useState(initial?.isPublic ?? false);
  const [eventType, setEventType] = useState(
    initial?.eventType ?? "personal"
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const fd = new FormData(e.currentTarget);
      // Build reminder CSV from selected checkboxes.
      fd.set(
        "reminderOffsets",
        Array.from(reminders).sort((a, b) => b - a).join(",")
      );
      fd.set("recurrence", recurrence);
      fd.set("isAllDay", isAllDay ? "true" : "false");
      fd.set("isPublic", isPublic ? "true" : "false");
      fd.set("eventType", eventType);

      // Combine date + time to ISO strings.
      const dueDate = fd.get("dueDate") as string;
      const dueTime = (fd.get("dueTime") as string) || (isAllDay ? "00:00" : "09:00");
      if (dueDate) fd.set("dueDate", `${dueDate}T${dueTime}`);
      fd.delete("dueTime");

      const endDate = (fd.get("endDate") as string) || "";
      const endTime = (fd.get("endTime") as string) || "";
      if (endDate) fd.set("endDate", `${endDate}T${endTime || "23:59"}`);
      else fd.delete("endDate");
      fd.delete("endTime");

      const recurrenceUntil = (fd.get("recurrenceUntil") as string) || "";
      if (recurrenceUntil) {
        fd.set("recurrenceUntil", `${recurrenceUntil}T23:59`);
      }

      const res = editing
        ? await updateCalendarEntry(fd)
        : await createCalendarEntry(fd);

      if ((res as any)?.error) {
        setError((res as any).error);
      } else {
        onClose();
      }
    } catch (err: any) {
      setError(err?.message || "Failed to save");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(15,23,42,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onMouseDown={onClose}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: 600,
          maxHeight: "92vh",
          overflowY: "auto",
          padding: 20,
          borderRadius: 14,
          background: "var(--bg-main)",
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 950 }}>
            {editing ? "Edit entry" : "New entry"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
            aria-label="Close"
            style={btnStyle({ minHeight: 32, padding: "0 10px", display: "inline-flex", alignItems: "center", justifyContent: "center" })}
          >
            <UiIcon name="x" size={14} />
          </button>
        </div>

        {error && (
          <div
            style={{
              background: "rgba(220,38,38,0.08)",
              border: "1px solid rgba(220,38,38,0.25)",
              color: "var(--danger)",
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
          ref={formRef}
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: 12 }}
        >
          {editing && (
            <input type="hidden" name="entryId" value={editing.masterId} />
          )}

          <Field label="Title">
            <input
              required
              defaultValue={initial?.title ?? ""}
              maxLength={200}
              name="title"
              placeholder="e.g., Marketing midterm"
              style={fieldStyle}
            />
          </Field>

          {/* Category buttons */}
          <Field label="Category">
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(110px, 1fr))",
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
                      border: `1px solid ${active ? m.color : "var(--border-color)"}`,
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
                    {m.label}
                  </button>
                );
              })}
            </div>
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label={isAllDay ? "Date" : "Start date"}>
              <input
                required
                type="date"
                name="dueDate"
                defaultValue={toLocalDateValue(initial?.dueDate)}
                style={fieldStyle}
              />
            </Field>
            {!isAllDay && (
              <Field label="Time">
                <input
                  type="time"
                  name="dueTime"
                  defaultValue={(() => {
                    const v = toLocalInputValue(initial?.dueDate);
                    return v ? v.split("T")[1] : "";
                  })()}
                  style={fieldStyle}
                />
              </Field>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="End date (optional)">
              <input
                type="date"
                name="endDate"
                defaultValue={toLocalDateValue(initial?.endDate)}
                style={fieldStyle}
              />
            </Field>
            {!isAllDay && (
              <Field label="End time">
                <input
                  type="time"
                  name="endTime"
                  defaultValue={(() => {
                    const v = toLocalInputValue(initial?.endDate);
                    return v ? v.split("T")[1] : "";
                  })()}
                  style={fieldStyle}
                />
              </Field>
            )}
          </div>

          <label
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem" }}
          >
            <input
              type="checkbox"
              checked={isAllDay}
              onChange={(e) => setIsAllDay(e.target.checked)}
            />
            All-day event
          </label>

          <Field label="Description">
            <textarea
              rows={2}
              defaultValue={initial?.description ?? ""}
              maxLength={1000}
              name="description"
              placeholder="Optional details…"
              style={{ ...fieldStyle, resize: "none" }}
            />
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Course (optional)">
              <input
                name="course"
                defaultValue={initial?.course ?? ""}
                placeholder="e.g., FIN-201"
                style={fieldStyle}
              />
            </Field>
            <Field label="Faculty (optional)">
              <input
                name="faculty"
                defaultValue={initial?.faculty ?? ""}
                placeholder="e.g., Finance"
                style={fieldStyle}
              />
            </Field>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Location">
              <input
                name="location"
                defaultValue={initial?.location ?? ""}
                placeholder="Room 301, Library, …"
                style={fieldStyle}
              />
            </Field>
            <Field label="Online link">
              <input
                name="onlineLink"
                defaultValue={initial?.onlineLink ?? ""}
                placeholder="https://meet.google.com/…"
                style={fieldStyle}
              />
            </Field>
          </div>

          {myCommunities.length > 0 && (
            <Field label="Group (optional)">
              <select
                name="communityId"
                defaultValue={initial?.communityId ?? ""}
                style={fieldStyle}
              >
                <option value="">None</option>
                {myCommunities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
          )}

          {/* Recurrence */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Repeats">
              <select
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value as any)}
                style={fieldStyle}
              >
                <option value="none">Does not repeat</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </Field>
            {recurrence !== "none" && (
              <Field label="Repeat until">
                <input
                  type="date"
                  name="recurrenceUntil"
                  defaultValue={toLocalDateValue(initial?.dueDate)}
                  style={fieldStyle}
                />
              </Field>
            )}
          </div>

          {/* Reminders */}
          <Field label="Reminders">
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
              }}
            >
              {REMINDER_OPTIONS.map((opt) => {
                const active = reminders.has(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      const next = new Set(reminders);
                      if (active) next.delete(opt.value);
                      else next.add(opt.value);
                      setReminders(next);
                    }}
                    style={{
                      borderRadius: 999,
                      padding: "6px 12px",
                      border: `1px solid ${active ? "var(--french-blue, #2563eb)" : "var(--border-color)"}`,
                      background: active
                        ? "var(--french-blue-soft, rgba(37,99,235,0.1))"
                        : "var(--bg-main)",
                      color: active
                        ? "var(--french-blue, #2563eb)"
                        : "var(--text-primary)",
                      fontWeight: 700,
                      cursor: "pointer",
                      fontSize: "0.8rem",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <UiIcon name="bell" size={12} />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </Field>

          <label
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem" }}
          >
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
            />
            Public event
            <span style={{ color: "var(--text-muted)", fontWeight: 500 }}>
              (requires moderator role or community ownership)
            </span>
          </label>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
              marginTop: 6,
            }}
          >
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              style={btnStyle()}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
              style={{ ...btnStyle(), opacity: submitting ? 0.7 : 1 }}
            >
              {submitting ? "Saving…" : editing ? "Save changes" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tiny style helpers
// ---------------------------------------------------------------------------

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

function btnStyle(
  overrides: Partial<React.CSSProperties> = {}
): React.CSSProperties {
  return {
    fontSize: "0.85rem",
    minHeight: 38,
    padding: "0 14px",
    borderRadius: 8,
    cursor: "pointer",
    ...overrides,
  };
}

function selectStyle(): React.CSSProperties {
  return {
    height: 40,
    border: "1px solid var(--border-color)",
    borderRadius: 10,
    padding: "0 12px",
    fontSize: "0.85rem",
    outline: "none",
    background: "var(--bg-main)",
    color: "var(--text-primary)",
  };
}

function iconBtnStyle(): React.CSSProperties {
  return {
    border: "1px solid var(--border-color)",
    background: "var(--bg-main)",
    cursor: "pointer",
    color: "var(--text-secondary)",
    fontSize: "0.9rem",
    padding: "4px 6px",
    borderRadius: 6,
  };
}
