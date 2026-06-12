"use client";

import { useState } from "react";
import Link from "next/link";
import UiIcon from "@/shared/ui/UiIcon";

const DAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type MaterialItem = {
  id: string;
  title: string;
  type: string;
  downloadsCount: number;
  createdAt: Date | string;
  ownerName: string | null;
  fileUrl: string | null;
};

type ScheduleItem = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room: string | null;
  instructor: string | null;
};

type CourseData = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  credits: number | null;
  facultyName: string | null;
};

type EventItem = {
  id: string;
  title: string;
  description: string | null;
  eventType: string;
  location: string | null;
  startTime: string | null;
  endTime: string | null;
};

type CourseDetailProps = {
  course: CourseData;
  materials: MaterialItem[];
  scheduleItems: ScheduleItem[];
  events: EventItem[];
};

type Tab = "overview" | "materials" | "events";
function materialIcon(type: string): string {
  switch (type) {
    case "notes": return "file-text";
    case "slides": return "monitor";
    case "exam": return "clipboard";
    case "assignment": return "edit";
    case "book": return "book";
    default: return "file";
  }
}

export default function CourseDetail({ course, materials, scheduleItems, events }: CourseDetailProps) {
  const [tab, setTab] = useState<Tab>("overview");

  const TABS: { value: Tab; label: string; icon: string }[] = [
    { value: "overview", label: "Overview", icon: "book-open" },
    { value: "materials", label: "Materials", icon: "folder" },
    { value: "events", label: "Deadlines & Exams", icon: "calendar" },
  ];

  return (
    <div className="course-detail">
      {/* Back link */}
      <Link
        href="/courses"
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          fontSize: "0.82rem", color: "var(--text-secondary)",
          textDecoration: "none", marginBottom: 16,
        }}
      >
        <UiIcon name="arrow-left" size={14} /> Back to Courses
      </Link>

      {/* Header */}
      <div className="course-detail-header">
        <h1 className="course-detail-name">{course.name}</h1>
        <p className="course-detail-code">{course.code}</p>
        <div className="course-detail-info">
          {course.facultyName && (
            <span className="course-detail-info-item">
              <UiIcon name="book" size={14} /> {course.facultyName}
            </span>
          )}
          {course.credits != null && (
            <span className="course-detail-info-item">
              <UiIcon name="star" size={14} /> {course.credits} credits
            </span>
          )}
          <span className="course-detail-info-item">
            <UiIcon name="folder" size={14} /> {materials.length} materials
          </span>
          <span className="course-detail-info-item">
            <UiIcon name="calendar" size={14} /> {scheduleItems.length} classes/week
          </span>
          <span className="course-detail-info-item">
            <UiIcon name="calendar" size={14} /> {events.length} events
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="course-detail-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.value}
            role="tab"
            aria-selected={tab === t.value}
            onClick={() => setTab(t.value)}
            className={`courses-tab ${tab === t.value ? "courses-tab--active" : ""}`}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <UiIcon name={t.icon} size={16} /> {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === "overview" && (
        <OverviewTab course={course} materials={materials} scheduleItems={scheduleItems} events={events} setTab={setTab} />
      )}
      {tab === "materials" && (
        <MaterialsTab materials={materials} />
      )}
      {tab === "events" && (
        <EventsTab events={events} />
      )}
    </div>
  );
}

/* ── Overview Tab ── */
function OverviewTab({ course, materials, scheduleItems, events, setTab }: {
  course: CourseData;
  materials: MaterialItem[];
  scheduleItems: ScheduleItem[];
  events: EventItem[];
  setTab: (tab: Tab) => void;
}) {
  const recentMaterials = materials.slice(0, 3);
  const recentEvents = events.slice(0, 2);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Description */}
      {course.description && (
        <div className="course-detail-section">
          <h3>About this course</h3>
          <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
            {course.description}
          </p>
        </div>
      )}

      {/* Recent Events */}
      <div className="course-detail-section">
        <h3>Upcoming Course Events</h3>
        {recentEvents.length === 0 ? (
          <div className="course-empty">
            <div className="course-empty-icon" style={{ display: "flex", justifyContent: "center", color: "var(--text-muted)", opacity: 0.4 }}>
              <UiIcon name="calendar" size={48} />
            </div>
            <p className="course-empty-text">No upcoming events scheduled for this course.</p>
          </div>
        ) : (
          <div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {recentEvents.map((ev) => (
                <Link
                  key={ev.id}
                  href={`/events/${ev.id}`}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <div
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "10px 12px", borderRadius: 8,
                      background: "var(--bg-hover)",
                      border: "1px solid var(--border-color-light)",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                      width: 40, height: 40, borderRadius: 6,
                      background: "var(--french-blue-soft, #e8eef9)", color: "var(--french-blue)",
                      fontWeight: 800, fontSize: "0.75rem", minWidth: 40,
                    }}>
                      <div style={{ fontSize: "0.6rem", textTransform: "uppercase" }}>
                        {ev.startTime ? new Date(ev.startTime).toLocaleString("en-US", { month: "short" }) : ""}
                      </div>
                      <div style={{ fontSize: "0.95rem", fontWeight: 900, marginTop: -2 }}>
                        {ev.startTime ? new Date(ev.startTime).getDate() : ""}
                      </div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: "0.85rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {ev.title}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        {ev.startTime && new Date(ev.startTime).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                        {ev.location && ` · ${ev.location}`}
                      </div>
                    </div>
                    <UiIcon name="chevron-right" size={16} color="var(--text-muted)" />
                  </div>
                </Link>
              ))}
            </div>
            {events.length > 2 && (
              <button
                onClick={() => setTab("events")}
                style={{
                  marginTop: 8, background: "none", border: "none",
                  color: "var(--french-blue)", fontSize: "0.82rem",
                  fontWeight: 600, cursor: "pointer",
                }}
              >
                View all {events.length} events →
              </button>
            )}
          </div>
        )}
      </div>

      {/* Recent Materials */}
      <div className="course-detail-section">
        <h3>Latest Materials</h3>
        {recentMaterials.length === 0 ? (
          <div className="course-empty">
            <div className="course-empty-icon" style={{ display: "flex", justifyContent: "center", color: "var(--text-muted)", opacity: 0.4 }}>
              <UiIcon name="folder" size={48} />
            </div>
            <p className="course-empty-text">No materials yet for this course.</p>
          </div>
        ) : (
          <div>
            {recentMaterials.map((m) => (
              <MaterialRow key={m.id} material={m} />
            ))}
            {materials.length > 3 && (
              <button
                onClick={() => setTab("materials")}
                style={{
                  marginTop: 8, background: "none", border: "none",
                  color: "var(--french-blue)", fontSize: "0.82rem",
                  fontWeight: 600, cursor: "pointer",
                }}
              >
                View all {materials.length} materials →
              </button>
            )}
          </div>
        )}
      </div>

      {/* Schedule Preview */}
      <div className="course-detail-section">
        <h3>Class Schedule</h3>
        {scheduleItems.length === 0 ? (
          <div className="course-empty">
            <div className="course-empty-icon" style={{ display: "flex", justifyContent: "center", color: "var(--text-muted)", opacity: 0.4 }}>
              <UiIcon name="clock" size={48} />
            </div>
            <p className="course-empty-text">No classes scheduled for this course.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {scheduleItems.map((s, i) => (
              <div
                key={i}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "8px 12px", borderRadius: 8,
                  background: "var(--bg-hover)",
                }}
              >
                <UiIcon name="clock" size={16} color="var(--french-blue)" />
                <span style={{ fontWeight: 600, fontSize: "0.85rem", minWidth: 40 }}>
                  {DAYS_SHORT[s.dayOfWeek]}
                </span>
                <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  {s.startTime} – {s.endTime}
                </span>
                {s.room && (
                  <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginLeft: "auto" }}>
                    Room {s.room}
                  </span>
                )}
                {s.instructor && (
                  <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                    · {s.instructor}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Materials Tab ── */
function MaterialsTab({ materials }: { materials: MaterialItem[] }) {
  if (materials.length === 0) {
    return (
      <div className="course-detail-section">
        <div className="course-empty">
          <div className="course-empty-icon" style={{ display: "flex", justifyContent: "center", color: "var(--text-muted)", opacity: 0.4 }}>
            <UiIcon name="folder" size={48} />
          </div>
          <p className="course-empty-text" style={{ fontWeight: 600, marginBottom: 4 }}>
            No materials yet for this course.
          </p>
          <p className="course-empty-text">
            Materials uploaded for this course will appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="course-detail-section">
      <h3>Course Materials ({materials.length})</h3>
      {materials.map((m) => (
        <MaterialRow key={m.id} material={m} />
      ))}
    </div>
  );
}

/* ── Shared Material Row ── */
function MaterialRow({ material }: { material: MaterialItem }) {
  const href = material.fileUrl || `/study-materials`;
  return (
    <a
      href={href}
      target={material.fileUrl ? "_blank" : undefined}
      rel={material.fileUrl ? "noopener noreferrer" : undefined}
      className="course-material-row"
      style={{ textDecoration: "none", color: "inherit" }}
    >
      <div className="course-material-icon">
        <UiIcon name={materialIcon(material.type)} size={18} />
      </div>
      <div className="course-material-info">
        <p className="course-material-title">{material.title}</p>
        <p className="course-material-meta">
          {material.type} · {material.downloadsCount} downloads
          {material.ownerName ? ` · ${material.ownerName}` : ""}
        </p>
      </div>
    </a>
  );
}

/* ── Events Tab ── */
function EventsTab({ events }: { events: EventItem[] }) {
  if (events.length === 0) {
    return (
      <div className="course-detail-section">
        <div className="course-empty">
          <div className="course-empty-icon" style={{ display: "flex", justifyContent: "center", color: "var(--text-muted)", opacity: 0.4 }}>
            <UiIcon name="calendar" size={48} />
          </div>
          <p className="course-empty-text" style={{ fontWeight: 600, marginBottom: 4 }}>
            No events scheduled for this course.
          </p>
          <p className="course-empty-text">
            Upcoming exams, assignments, or deadlines will show up here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="course-detail-section">
      <h3>Course Events ({events.length})</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {events.map((ev) => (
          <Link
            key={ev.id}
            href={`/events/${ev.id}`}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <div
              style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "14px 16px", borderRadius: 12,
                background: "var(--bg-hover)",
                border: "1px solid var(--border-color-light)",
                transition: "transform 0.15s, border-color 0.15s",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--french-blue)";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border-color-light)";
                e.currentTarget.style.transform = "none";
              }}
            >
              <div style={{
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                width: 50, height: 50, borderRadius: 10,
                background: "var(--french-blue-soft, #e8eef9)", color: "var(--french-blue)",
                fontWeight: 800, fontSize: "0.8rem",
              }}>
                <div style={{ fontSize: "0.65rem", textTransform: "uppercase" }}>
                  {ev.startTime ? new Date(ev.startTime).toLocaleString("en-US", { month: "short" }) : ""}
                </div>
                <div style={{ fontSize: "1.1rem", fontWeight: 900, marginTop: -2 }}>
                  {ev.startTime ? new Date(ev.startTime).getDate() : ""}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: "0.92rem", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {ev.title}
                </div>
                <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "flex", flexWrap: "wrap", gap: "6px 12px" }}>
                  {ev.startTime && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <UiIcon name="clock" size={12} />
                      {new Date(ev.startTime).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}
                  {ev.location && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <UiIcon name="flag" size={12} />
                      {ev.location}
                    </span>
                  )}
                </div>
                {ev.description && (
                  <p style={{ margin: "6px 0 0", fontSize: "0.82rem", color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", lineHeight: 1.4 }}>
                    {ev.description}
                  </p>
                )}
              </div>
              <UiIcon name="chevron-right" size={18} color="var(--text-muted)" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
