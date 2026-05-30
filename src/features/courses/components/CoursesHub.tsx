"use client";

import { useState } from "react";
import Link from "next/link";
import UiIcon from "@/shared/ui/UiIcon";
import ScheduleClient from "@/features/courses/components/ScheduleClient";

const DAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type EnrolledCourse = {
  courseId: string;
  courseName: string;
  courseCode: string;
  courseDescription: string | null;
  courseCredits: number | null;
  facultyName: string | null;
  role: string;
  materialsCount: number;
  scheduleSnippet: string | null; // e.g. "Mon 09:00 - 10:30"
};

type ScheduleEntry = {
  id: string;
  courseName: string;
  courseCode: string | null;
  instructor: string | null;
  room: string | null;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  faculty: string | null;
  semester: string | null;
  isPublic: boolean;
  createdBy: string;
  creatorName: string;
  createdAt: Date;
};

type CoursesHubProps = {
  enrolledCourses: EnrolledCourse[];
  scheduleEntries: ScheduleEntry[];
  currentUserId: string;
  activeSemesterName: string | null;
};

type TabView = "courses" | "schedule";

export default function CoursesHub({
  enrolledCourses,
  scheduleEntries,
  currentUserId,
  activeSemesterName,
}: CoursesHubProps) {
  const [tab, setTab] = useState<TabView>("courses");

  return (
    <div className="courses-hub">
      {/* Header */}
      <div className="courses-header">
        <div className="courses-header-left">
          <h1>My Courses</h1>
          {activeSemesterName && (
            <span className="courses-semester-badge">
              <UiIcon name="calendar" size={14} />
              {activeSemesterName}
            </span>
          )}
        </div>
        {false && (
        <Link
          href="/calendar"
          className="btn btn-primary"
          style={{ display: "inline-flex", alignItems: "center", gap: "8px", textDecoration: "none", fontSize: "0.82rem", padding: "8px 16px" }}
        >
          <UiIcon name="calendar" size={14} />
          View Academic Calendar
          <UiIcon name="plus" size={12} />
        </Link>
        )}
      </div>

      {/* Tabs */}
      <div className="courses-tabs" role="tablist">
        <button
          role="tab"
          aria-selected={tab === "courses"}
          onClick={() => setTab("courses")}
          className={`courses-tab ${tab === "courses" ? "courses-tab--active" : ""}`}
          style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
        >
          <UiIcon name="graduation" size={16} />
          My Courses
        </button>
        <button
          role="tab"
          aria-selected={tab === "schedule"}
          onClick={() => setTab("schedule")}
          className={`courses-tab ${tab === "schedule" ? "courses-tab--active" : ""}`}
          style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
        >
          <UiIcon name="calendar" size={16} />
          Weekly Schedule
        </button>
      </div>

      {/* Content */}
      {tab === "courses" ? (
        <CoursesGrid courses={enrolledCourses} />
      ) : (
        <ScheduleClient entries={scheduleEntries} currentUserId={currentUserId} />
      )}
    </div>
  );
}

function CoursesGrid({ courses }: { courses: EnrolledCourse[] }) {
  return (
    <div className="card courses-card">
      {courses.length === 0 ? (
        <div className="course-empty">
        <div className="course-empty-icon" style={{ display: "flex", justifyContent: "center", color: "var(--text-muted)", opacity: 0.4 }}>
          <UiIcon name="graduation" size={48} />
        </div>
        <p className="course-empty-text" style={{ fontWeight: 600, fontSize: "1rem", color: "var(--french-navy)", marginBottom: 6 }}>
          No courses enrolled yet
        </p>
        <p className="course-empty-text">
          Your enrolled courses will appear here when the semester starts.
        </p>
        <Link href="/calendar" className="btn btn-primary course-empty-cta">
          <UiIcon name="calendar" size={14} />
          View Academic Calendar
          <UiIcon name="plus" size={12} />
        </Link>
        </div>
      ) : (
        <div className="courses-grid">
      {courses.map((c) => (
        <Link
          key={c.courseId}
          href={`/schedule/course/${c.courseId}`}
          className="course-card"
        >
          <p className="course-card-name">{c.courseName}</p>
          <p className="course-card-code">{c.courseCode}</p>

          <div className="course-card-meta">
            {c.facultyName && (
              <span className="course-card-badge">
                <UiIcon name="book" size={12} />
                {c.facultyName}
              </span>
            )}
            {c.courseCredits != null && (
              <span className="course-card-badge">
                {c.courseCredits} credits
              </span>
            )}
            {c.materialsCount > 0 && (
              <span className="course-card-badge course-card-badge--materials">
                <UiIcon name="folder" size={12} />
                {c.materialsCount} materials
              </span>
            )}
            {c.role !== "student" && (
              <span className="course-card-badge course-card-badge--role">
                {c.role === "professor" ? "Professor" : "TA"}
              </span>
            )}
          </div>

          {c.scheduleSnippet && (
            <div className="course-card-schedule">
              <UiIcon name="clock" size={14} />
              {c.scheduleSnippet}
            </div>
          )}
        </Link>
      ))}
        </div>
      )}
    </div>
  );
}
