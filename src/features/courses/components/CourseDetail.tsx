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

type CourseDetailProps = {
  course: CourseData;
  materials: MaterialItem[];
  scheduleItems: ScheduleItem[];
};

type Tab = "overview" | "materials" | "schedule";

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

export default function CourseDetail({ course, materials, scheduleItems }: CourseDetailProps) {
  const [tab, setTab] = useState<Tab>("overview");

  const TABS: { value: Tab; label: string; icon: string }[] = [
    { value: "overview", label: "Overview", icon: "📋" },
    { value: "materials", label: "Materials", icon: "📁" },
    { value: "schedule", label: "Schedule", icon: "🗓️" },
  ];

  return (
    <div className="course-detail">
      {/* Back link */}
      <Link
        href="/schedule"
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
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === "overview" && (
        <OverviewTab course={course} materials={materials} scheduleItems={scheduleItems} />
      )}
      {tab === "materials" && (
        <MaterialsTab materials={materials} />
      )}
      {tab === "schedule" && (
        <ScheduleTab scheduleItems={scheduleItems} />
      )}
    </div>
  );
}

/* ── Overview Tab ── */
function OverviewTab({ course, materials, scheduleItems }: {
  course: CourseData; materials: MaterialItem[]; scheduleItems: ScheduleItem[];
}) {
  const recentMaterials = materials.slice(0, 3);

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

      {/* Recent Materials */}
      <div className="course-detail-section">
        <h3>Latest Materials</h3>
        {recentMaterials.length === 0 ? (
          <div className="course-empty">
            <div className="course-empty-icon">📁</div>
            <p className="course-empty-text">No materials yet for this course.</p>
          </div>
        ) : (
          <div>
            {recentMaterials.map((m) => (
              <MaterialRow key={m.id} material={m} />
            ))}
            {materials.length > 3 && (
              <button
                onClick={() => {}}
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
            <div className="course-empty-icon">🗓️</div>
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
          <div className="course-empty-icon">📁</div>
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

/* ── Schedule Tab ── */
function ScheduleTab({ scheduleItems }: { scheduleItems: ScheduleItem[] }) {
  if (scheduleItems.length === 0) {
    return (
      <div className="course-detail-section">
        <div className="course-empty">
          <div className="course-empty-icon">🗓️</div>
          <p className="course-empty-text">No classes scheduled for this course.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="course-detail-section">
      <h3>Weekly Schedule</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {scheduleItems.map((s, i) => (
          <div
            key={i}
            style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "12px 16px", borderRadius: 10,
              background: "var(--bg-hover)",
              border: "1px solid var(--border-color-light)",
            }}
          >
            <div style={{
              width: 44, height: 44, borderRadius: 10,
              background: "var(--french-blue)", color: "white",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 800, fontSize: "0.78rem",
            }}>
              {DAYS_SHORT[s.dayOfWeek]}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: "0.88rem" }}>
                {s.startTime} – {s.endTime}
              </div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                {s.room ? `Room ${s.room}` : "Room TBD"}
                {s.instructor ? ` · ${s.instructor}` : ""}
              </div>
            </div>
          </div>
        ))}
      </div>
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
