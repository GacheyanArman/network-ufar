"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import UiIcon from "@/shared/ui/UiIcon";
import ScheduleClient from "@/features/courses/components/ScheduleClient";

type EnrolledCourse = {
  courseId: string;
  courseName: string;
  courseCode: string;
  courseDescription: string | null;
  courseCredits: number | null;
  facultyName: string | null;
  role: string;
  materialsCount: number;
  scheduleSnippet: string | null;
  instructor: string | null;
  status: "active" | "finished" | "upcoming";
  nextClassSnippet: string | null;
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
type FilterStatus = "all" | "active" | "finished" | "upcoming";

export default function CoursesHub({
  enrolledCourses,
  scheduleEntries,
  currentUserId,
  activeSemesterName,
}: CoursesHubProps) {
  const [tab, setTab] = useState<TabView>("courses");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");

  const filteredCourses = useMemo(() => {
    return enrolledCourses.filter((course) => {
      // Status Filter
      if (statusFilter !== "all" && course.status !== statusFilter) return false;
      
      // Search
      if (search) {
        const q = search.toLowerCase();
        if (
          !course.courseName.toLowerCase().includes(q) &&
          !course.courseCode.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [enrolledCourses, search, statusFilter]);

  const activeCoursesCount = enrolledCourses.filter(c => c.status === "active").length;

  return (
    <div className="courses-hub-wrapper">
      {/* Top Level Header and Quick Actions */}
      <div className="courses-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 style={{ fontSize: "2rem", margin: "0 0 8px 0", color: "var(--french-navy)" }}>My Courses</h1>
          {activeSemesterName && (
            <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "1rem" }}>
              {activeSemesterName}
            </p>
          )}
        </div>
        <div className="courses-tabs" role="tablist" style={{ margin: 0 }}>
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
      </div>

      {tab === "courses" ? (
        <>
          {/* Summary Block */}
          {enrolledCourses.length > 0 && (
            <div className="courses-summary-grid">
              <div className="courses-summary-card">
                <div className="courses-summary-card-icon">
                  <UiIcon name="book" size={24} />
                </div>
                <div className="courses-summary-card-content">
                  <span className="courses-summary-card-value">{enrolledCourses.length}</span>
                  <span className="courses-summary-card-label">Total Enrolled</span>
                </div>
              </div>
              <div className="courses-summary-card">
                <div className="courses-summary-card-icon" style={{ background: "rgba(34, 197, 94, 0.1)", color: "rgb(21, 128, 61)" }}>
                  <UiIcon name="list" size={24} />
                </div>
                <div className="courses-summary-card-content">
                  <span className="courses-summary-card-value">{activeCoursesCount}</span>
                  <span className="courses-summary-card-label">Active Courses</span>
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="courses-quick-actions">
            <Link href="/communities" className="btn btn-outline" style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", padding: "8px 16px", border: "1px solid #cbd5e1" }}>
              <UiIcon name="users" size={14} /> Ask classmates
            </Link>
            <Link href="/calendar" className="btn btn-outline" style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", padding: "8px 16px", border: "1px solid #cbd5e1" }}>
              <UiIcon name="plus" size={14} /> Add deadline
            </Link>
          </div>

          {/* Filters Bar */}
          {enrolledCourses.length > 0 && (
            <div className="courses-filters-bar">
              <input
                type="text"
                placeholder="Search courses by name or code..."
                className="courses-search-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                className="input"
                style={{ width: "auto", minWidth: "150px" }}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as FilterStatus)}
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="upcoming">Upcoming</option>
                <option value="finished">Finished</option>
              </select>
            </div>
          )}

          {/* Courses Grid */}
          <CoursesGrid courses={filteredCourses} totalCourses={enrolledCourses.length} />
        </>
      ) : (
        <ScheduleClient entries={scheduleEntries} currentUserId={currentUserId} />
      )}
    </div>
  );
}

function CoursesGrid({ courses, totalCourses }: { courses: EnrolledCourse[], totalCourses: number }) {
  if (totalCourses === 0) {
    return (
      <div className="courses-empty-state">
        <div className="courses-empty-icon">
          <UiIcon name="book" size={32} />
        </div>
        <h3 className="courses-empty-title">No enrolled courses</h3>
        <p className="courses-empty-desc">
          You haven't enrolled in any courses for the current semester. Browse the catalog to find your next class.
        </p>
        <div className="courses-empty-actions">
          <Link href="/onboarding" className="btn btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
            <UiIcon name="plus" size={16} /> Enroll in new course
          </Link>
          <Link href="/search" className="btn btn-outline" style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
            <UiIcon name="search" size={16} /> Browse catalog
          </Link>
        </div>
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="courses-empty-state" style={{ padding: "48px 24px", background: "transparent", border: "none" }}>
        <p className="courses-empty-desc">No courses match your current filters.</p>
      </div>
    );
  }

  return (
    <div className="courses-grid-layout">
      {courses.map((c) => (
        <Link
          key={c.courseId}
          href={`/courses/${c.courseId}`}
          className="course-hub-card"
        >
          <div className="course-hub-card-header">
            <span className="course-hub-card-code">{c.courseCode}</span>
            <div className="course-hub-card-badges">
              {c.status === "active" && (
                <span className="course-hub-badge course-hub-badge--active">Active</span>
              )}
              {c.status === "upcoming" && (
                <span className="course-hub-badge course-hub-badge--upcoming">Upcoming</span>
              )}
              {c.status === "finished" && (
                <span className="course-hub-badge course-hub-badge--finished">Finished</span>
              )}
              {c.role !== "student" && (
                <span className="course-hub-badge course-hub-badge--role">
                  {c.role === "professor" ? "Professor" : "TA"}
                </span>
              )}
            </div>
          </div>
          
          <h2 className="course-hub-card-title">{c.courseName}</h2>
          
          {c.instructor && (
            <div className="course-hub-card-instructor">
              <div className="course-hub-card-instructor-avatar">
                {c.instructor.charAt(0).toUpperCase()}
              </div>
              <span>{c.instructor}</span>
            </div>
          )}

          <div className="course-hub-card-meta">
            {c.nextClassSnippet ? (
              <div className="course-hub-card-schedule course-hub-card-schedule--highlight">
                <UiIcon name="clock" size={14} />
                Next: {c.nextClassSnippet}
              </div>
            ) : c.scheduleSnippet ? (
              <div className="course-hub-card-schedule">
                <UiIcon name="calendar" size={14} />
                {c.scheduleSnippet}
              </div>
            ) : null}

            {c.materialsCount > 0 && (
              <div className="course-hub-card-schedule">
                <UiIcon name="folder" size={14} />
                {c.materialsCount} new material{c.materialsCount > 1 ? "s" : ""}
              </div>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
