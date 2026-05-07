"use client";

import { useMemo, useState, useRef } from "react";
import { createCalendarEntry, deleteCalendarEntry } from "@/app/actions/calendar";

type CalEntry = {
  id: string;
  title: string;
  description: string | null;
  eventType: string;
  category: string;
  course: string | null;
  location: string | null;
  onlineLink: string | null;
  dueDate: string;
  endDate: string | null;
  isPublic: boolean;
  createdBy: string;
  creatorName: string;
  source: "academic" | "event" | "rsvp";
};

type Props = {
  entries: CalEntry[];
  currentUserId: string;
};

type FormAction = (fd: FormData) => void | Promise<void>;
const createAction = createCalendarEntry as unknown as FormAction;
const deleteAction = deleteCalendarEntry as unknown as FormAction;

const CATEGORY_META: Record<string, { color: string; bg: string; icon: string; label: string }> = {
  exam:        { color: "#dc2626", bg: "#fef2f2", icon: "📝", label: "Exam" },
  deadline:    { color: "#ea580c", bg: "#fff7ed", icon: "⏰", label: "Deadline" },
  assignment:  { color: "#2563eb", bg: "#eff6ff", icon: "📚", label: "Assignment" },
  lecture:     { color: "#7c3aed", bg: "#f5f3ff", icon: "🎓", label: "Lecture" },
  event:       { color: "#0891b2", bg: "#ecfeff", icon: "🎪", label: "Event" },
  study_group: { color: "#059669", bg: "#ecfdf5", icon: "👥", label: "Study Group" },
  club:        { color: "#d97706", bg: "#fffbeb", icon: "🎭", label: "Club" },
  erasmus:     { color: "#7c3aed", bg: "#fdf4ff", icon: "✈️", label: "Erasmus" },
  reminder:    { color: "#64748b", bg: "#f8fafc", icon: "🔔", label: "Reminder" },
  holiday:     { color: "#16a34a", bg: "#f0fdf4", icon: "🎉", label: "Holiday" },
  other:       { color: "#64748b", bg: "#f8fafc", icon: "📌", label: "Other" },
};

const VIEWS = ["This Week", "List", "Month"] as const;
type View = typeof VIEWS[number];

function fmt(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}
function fmtDay(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}
function isSameWeek(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const start = new Date(now); start.setDate(now.getDate() - now.getDay() + 1);
  start.setHours(0,0,0,0);
  const end = new Date(start); end.setDate(start.getDate() + 6);
  end.setHours(23,59,59,999);
  return d >= start && d <= end;
}
function isSameMonth(iso: string, year: number, month: number) {
  const d = new Date(iso);
  return d.getFullYear() === year && d.getMonth() === month;
}

function downloadIcs(entries: CalEntry[]) {
  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//UFARnet//Calendar//EN",
    ...entries.map(e => {
      const dt = new Date(e.dueDate).toISOString().replace(/[-:]/g,"").split(".")[0]+"Z";
      return [
        "BEGIN:VEVENT",
        `UID:${e.id}@ufarnet`,
        `DTSTART:${dt}`,
        `SUMMARY:${e.title}`,
        `DESCRIPTION:${e.description || ""}`,
        `LOCATION:${e.location || ""}`,
        "END:VEVENT",
      ].join("\r\n");
    }),
    "END:VCALENDAR",
  ].join("\r\n");
  const blob = new Blob([lines], { type: "text/calendar" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "ufarnet-calendar.ics"; a.click();
}

export default function CalendarPageClient({ entries, currentUserId }: Props) {
  const [view, setView] = useState<View>("This Week");
  const [query, setQuery] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [showModal, setShowModal] = useState<"reminder" | "deadline" | "study" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [monthOffset, setMonthOffset] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  const now = new Date();
  const viewYear = new Date(now.getFullYear(), now.getMonth() + monthOffset).getFullYear();
  const viewMonth = new Date(now.getFullYear(), now.getMonth() + monthOffset).getMonth();

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return entries.filter(e => {
      const matchQ = !q || e.title.toLowerCase().includes(q) || (e.course || "").toLowerCase().includes(q);
      const matchC = filterCat === "all" || e.eventType === filterCat || e.category === filterCat;
      return matchQ && matchC;
    });
  }, [entries, query, filterCat]);

  const thisWeek = filtered.filter(e => isSameWeek(e.dueDate)).sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  const listAll = [...filtered].sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  // Month grid
  const firstDay = new Date(viewYear, viewMonth, 1);
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const startDow = (firstDay.getDay() + 6) % 7; // Mon=0
  const monthName = firstDay.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const monthEntries = filtered.filter(e => isSameMonth(e.dueDate, viewYear, viewMonth));

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const fd = new FormData(e.currentTarget);
      const date = fd.get("date") as string;
      const time = fd.get("time") as string;
      if (date) fd.set("dueDate", time ? `${date}T${time}` : `${date}T23:59`);
      fd.delete("date"); fd.delete("time");
      await createCalendarEntry(fd);
      setShowModal(null);
      formRef.current?.reset();
    } finally { setIsSubmitting(false); }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

      {/* Header */}
      <section className="card" style={{ padding: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <h1 style={{ margin: "0 0 6px", fontSize: "30px", fontWeight: 950, color: "var(--text-primary)" }}>📅 Calendar</h1>
            <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "15px" }}>
              Track your classes, exams, deadlines, events and study groups.
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button type="button" className="btn btn-primary" style={{ fontSize: "13px" }} onClick={() => setShowModal("reminder")}>🔔 Reminder</button>
            <button type="button" className="btn btn-secondary" style={{ fontSize: "13px" }} onClick={() => setShowModal("deadline")}>⏰ Deadline</button>
            <button type="button" className="btn btn-secondary" style={{ fontSize: "13px" }} onClick={() => setShowModal("study")}>👥 Study Session</button>
            <button type="button" className="btn btn-secondary" style={{ fontSize: "13px" }} onClick={() => downloadIcs(filtered)}>📥 Export .ics</button>
          </div>
        </div>

        {/* Search + Filter */}
        <div style={{ display: "flex", gap: "10px", marginTop: "18px", flexWrap: "wrap" }}>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search calendar events..."
            style={{ flex: 1, minWidth: "200px", height: "44px", border: "1px solid var(--border-color)", borderRadius: "12px", padding: "0 16px", fontSize: "14px", outline: "none" }}
          />
          <select
            value={filterCat}
            onChange={e => setFilterCat(e.target.value)}
            style={{ height: "44px", border: "1px solid var(--border-color)", borderRadius: "12px", padding: "0 12px", fontSize: "14px", outline: "none", background: "#fff" }}
          >
            <option value="all">All Categories</option>
            {Object.entries(CATEGORY_META).map(([k,v]) => (
              <option key={k} value={k}>{v.icon} {v.label}</option>
            ))}
          </select>
        </div>

        {/* View Tabs */}
        <div style={{ display: "flex", gap: "6px", marginTop: "16px" }}>
          {VIEWS.map(v => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              style={{
                border: "1px solid var(--border-color)",
                borderRadius: "999px",
                padding: "8px 16px",
                fontSize: "13px",
                fontWeight: 800,
                cursor: "pointer",
                background: view === v ? "var(--french-blue)" : "#fff",
                color: view === v ? "#fff" : "var(--text-primary)",
                transition: "all 0.15s ease",
              }}
            >{v}</button>
          ))}
        </div>
      </section>

      {/* ── THIS WEEK ── */}
      {view === "This Week" && (
        <section>
          <h2 style={{ margin: "0 0 12px", fontSize: "18px", fontWeight: 900, color: "var(--text-primary)" }}>
            This Week
            {thisWeek.length > 0 && (
              <span style={{ marginLeft: "10px", fontSize: "13px", color: "var(--text-secondary)", fontWeight: 700 }}>
                {thisWeek.length} item{thisWeek.length !== 1 ? "s" : ""}
              </span>
            )}
          </h2>
          {thisWeek.length === 0 ? (
            <div className="card" style={{ padding: "50px 24px", textAlign: "center" }}>
              <div style={{ fontSize: "40px", opacity: 0.3, marginBottom: "10px" }}>🗓</div>
              <p style={{ margin: 0, color: "var(--text-secondary)", fontWeight: 700 }}>
                No events this week. Enjoy your free time or create a study session.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {thisWeek.map(e => <EntryCard key={e.id} entry={e} currentUserId={currentUserId} />)}
            </div>
          )}
        </section>
      )}

      {/* ── LIST ── */}
      {view === "List" && (
        <section>
          {listAll.length === 0 ? (
            <div className="card" style={{ padding: "50px 24px", textAlign: "center" }}>
              <div style={{ fontSize: "40px", opacity: 0.3, marginBottom: "10px" }}>📋</div>
              <p style={{ margin: 0, color: "var(--text-secondary)", fontWeight: 700 }}>No calendar items match your filters.</p>
            </div>
          ) : (() => {
            // Group by month
            const groups = new Map<string, CalEntry[]>();
            for (const e of listAll) {
              const d = new Date(e.dueDate);
              const key = `${d.getFullYear()}-${d.getMonth()}`;
              const label = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
              if (!groups.has(key)) groups.set(key, []);
              groups.get(key)!.push(e);
              (groups as any).__labels = (groups as any).__labels || {};
              (groups as any).__labels[key] = label;
            }
            return Array.from(groups.entries()).map(([key, items]) => (
              <div key={key} style={{ marginBottom: "24px" }}>
                <h3 style={{ margin: "0 0 10px", fontSize: "15px", fontWeight: 900, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {(groups as any).__labels?.[key] || key}
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {items.map(e => <EntryCard key={e.id} entry={e} currentUserId={currentUserId} />)}
                </div>
              </div>
            ));
          })()}
        </section>
      )}

      {/* ── MONTH ── */}
      {view === "Month" && (
        <section className="card" style={{ padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <button type="button" className="btn btn-secondary" style={{ fontSize: "13px", minHeight: "36px", padding: "0 14px" }} onClick={() => setMonthOffset(o => o - 1)}>← Prev</button>
            <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 900 }}>{monthName}</h2>
            <button type="button" className="btn btn-secondary" style={{ fontSize: "13px", minHeight: "36px", padding: "0 14px" }} onClick={() => setMonthOffset(o => o + 1)}>Next →</button>
          </div>
          {/* Day headers */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px", marginBottom: "4px" }}>
            {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => (
              <div key={d} style={{ textAlign: "center", fontSize: "12px", fontWeight: 900, color: "var(--text-muted)", padding: "4px 0" }}>{d}</div>
            ))}
          </div>
          {/* Grid cells */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px" }}>
            {Array.from({ length: startDow }).map((_, i) => <div key={`empty-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayEntries = monthEntries.filter(e => new Date(e.dueDate).getDate() === day);
              const isToday = now.getFullYear() === viewYear && now.getMonth() === viewMonth && now.getDate() === day;
              return (
                <div key={day} style={{
                  minHeight: "72px",
                  border: "1px solid var(--border-color)",
                  borderRadius: "10px",
                  padding: "6px",
                  background: isToday ? "var(--french-blue-soft)" : "#fff",
                  position: "relative",
                }}>
                  <div style={{
                    fontSize: "13px", fontWeight: 900,
                    color: isToday ? "var(--french-blue)" : "var(--text-primary)",
                    marginBottom: "4px",
                  }}>{day}</div>
                  {dayEntries.slice(0, 2).map(e => {
                    const meta = CATEGORY_META[e.eventType] || CATEGORY_META.other;
                    return (
                      <div key={e.id} style={{
                        fontSize: "11px", fontWeight: 700,
                        background: meta.bg, color: meta.color,
                        borderRadius: "4px", padding: "2px 4px",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        marginBottom: "2px",
                      }}>{meta.icon} {e.title}</div>
                    );
                  })}
                  {dayEntries.length > 2 && (
                    <div style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: 700 }}>+{dayEntries.length - 2} more</div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── MODAL BACKDROP ── */}
      {showModal && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}
          onMouseDown={() => setShowModal(null)}
        >
          <div
            className="card"
            style={{ width: "100%", maxWidth: "540px", maxHeight: "90vh", overflowY: "auto", padding: "24px" }}
            onMouseDown={e => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 950 }}>
                {showModal === "reminder" ? "🔔 Add Reminder" : showModal === "deadline" ? "⏰ Add Deadline" : "👥 Add Study Session"}
              </h2>
              <button type="button" className="btn btn-secondary" style={{ minHeight: "34px", padding: "0 12px" }} onClick={() => setShowModal(null)}>×</button>
            </div>

            <form ref={formRef} style={{ display: "flex", flexDirection: "column", gap: "14px" }} onSubmit={handleSubmit}>
              {/* Hidden category */}
              <input type="hidden" name="eventType" value={showModal === "reminder" ? "reminder" : showModal === "deadline" ? "deadline" : "study_group"} />
              <input type="hidden" name="isPublic" value={showModal === "study" ? "true" : "false"} />

              <label>
                <FieldLabel>{showModal === "study" ? "Subject" : "Title"}</FieldLabel>
                <FieldInput name="title" required placeholder={
                  showModal === "reminder" ? "e.g., Review lecture notes" :
                  showModal === "deadline" ? "e.g., Marketing Assignment" :
                  "e.g., Statistics Study Group"
                } />
              </label>

              {showModal === "deadline" && (
                <label>
                  <FieldLabel>Subject / Course</FieldLabel>
                  <FieldInput name="course" placeholder="e.g., MKTG 201" />
                </label>
              )}

              {showModal === "study" && (
                <label>
                  <FieldLabel>Goal</FieldLabel>
                  <FieldInput name="description" placeholder="e.g., Prepare for Chapter 5 exam" />
                </label>
              )}

              <label>
                <FieldLabel>Description</FieldLabel>
                <textarea name="description" rows={3} placeholder="Optional details..." style={fieldStyle} />
              </label>

              <div>
                <FieldLabel>Date</FieldLabel>
                <div style={{ display: "flex", gap: "10px", marginTop: "7px" }}>
                  <input name="date" type="date" required style={{ ...fieldStyle, flex: 1, marginTop: 0 }} />
                  <input name="time" type="time" style={{ ...fieldStyle, flex: 1, marginTop: 0 }} />
                </div>
              </div>

              {showModal === "study" && (
                <>
                  <label>
                    <FieldLabel>Location / Online Link</FieldLabel>
                    <FieldInput name="location" placeholder="Room 301 or https://meet.google.com/..." />
                  </label>
                  <label>
                    <FieldLabel>Max Participants</FieldLabel>
                    <FieldInput name="maxAttendees" type="number" min="2" placeholder="e.g., 10" />
                  </label>
                </>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "4px" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting} style={{ opacity: isSubmitting ? 0.7 : 1 }}>
                  {isSubmitting ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function EntryCard({ entry, currentUserId }: { entry: CalEntry; currentUserId: string }) {
  const meta = CATEGORY_META[entry.eventType] || CATEGORY_META.other;
  const date = new Date(entry.dueDate);
  const isPast = date < new Date();
  const isToday = fmtDate(entry.dueDate) === fmtDate(new Date().toISOString());
  const isCreator = entry.createdBy === currentUserId;

  return (
    <div className="card" style={{
      padding: "14px 18px",
      display: "flex",
      gap: "14px",
      alignItems: "center",
      opacity: isPast ? 0.65 : 1,
      borderLeft: `4px solid ${meta.color}`,
      borderRadius: "14px",
    }}>
      {/* Date badge */}
      <div style={{
        minWidth: "50px", textAlign: "center",
        background: meta.bg, borderRadius: "10px", padding: "8px 6px",
        flexShrink: 0,
      }}>
        <div style={{ fontSize: "11px", fontWeight: 900, color: meta.color, textTransform: "uppercase" }}>
          {date.toLocaleDateString("en-US", { month: "short" })}
        </div>
        <div style={{ fontSize: "22px", fontWeight: 950, color: meta.color, lineHeight: 1 }}>{date.getDate()}</div>
        <div style={{ fontSize: "10px", color: meta.color, fontWeight: 700 }}>
          {date.toLocaleDateString("en-US", { weekday: "short" })}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
          <span style={{
            fontSize: "11px", fontWeight: 900, color: meta.color,
            background: meta.bg, borderRadius: "6px", padding: "2px 8px",
            textTransform: "uppercase", letterSpacing: "0.04em",
          }}>{meta.icon} {meta.label}</span>
          {isToday && <span style={{ fontSize: "11px", fontWeight: 900, color: "#fff", background: "var(--french-blue)", borderRadius: "6px", padding: "2px 8px" }}>TODAY</span>}
          {!entry.isPublic && <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 700 }}>🔒 Private</span>}
        </div>
        <div style={{ fontSize: "16px", fontWeight: 900, color: "var(--text-primary)", marginBottom: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {entry.title}
        </div>
        <div style={{ fontSize: "13px", color: "var(--text-secondary)", display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <span>🕐 {fmt(entry.dueDate)}</span>
          {entry.course && <span>📖 {entry.course}</span>}
          {entry.location && <span>📍 {entry.location}</span>}
        </div>
        {entry.description && (
          <p style={{ margin: "6px 0 0", fontSize: "13px", color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {entry.description}
          </p>
        )}
      </div>

      {/* Actions */}
      {isCreator && (
        <form action={deleteAction} style={{ flexShrink: 0 }}>
          <input type="hidden" name="entryId" value={entry.id} />
          <button type="submit" style={{
            border: "none", background: "transparent", cursor: "pointer",
            color: "var(--text-muted)", fontSize: "16px", padding: "4px 8px",
          }} title="Delete">🗑</button>
        </form>
      )}
    </div>
  );
}

const fieldStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid var(--border-color)",
  borderRadius: "12px",
  padding: "10px 12px",
  fontSize: "14px",
  outline: "none",
  marginTop: "7px",
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span style={{ display: "block", color: "var(--text-primary)", fontSize: "13px", fontWeight: 900 }}>{children}</span>;
}
function FieldInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} style={fieldStyle} />;
}
