"use client";

import { useState } from "react";
import { createScheduleEntry, deleteScheduleEntry } from "@/features/courses/server/schedule";
import { useRouter } from "next/navigation";

const DAYS_OF_WEEK = [
  { id: 0, name: "Monday", short: "Mon" },
  { id: 1, name: "Tuesday", short: "Tue" },
  { id: 2, name: "Wednesday", short: "Wed" },
  { id: 3, name: "Thursday", short: "Thu" },
  { id: 4, name: "Friday", short: "Fri" },
  { id: 5, name: "Saturday", short: "Sat" },
  { id: 6, name: "Sunday", short: "Sun" },
];

interface ScheduleEntry {
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
}

interface ScheduleClientProps {
  entries: ScheduleEntry[];
  currentUserId: string;
}

export default function ScheduleClient({ entries, currentUserId }: ScheduleClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();

  const handleDelete = async (formData: FormData) => {
    await deleteScheduleEntry(formData);
    router.refresh();
  };

  const handleCreate = async (formData: FormData) => {
    await createScheduleEntry(formData);
    setIsModalOpen(false);
    router.refresh();
  };

  const scheduleByDay = new Map<number, ScheduleEntry[]>();
  DAYS_OF_WEEK.forEach((day) => {
    scheduleByDay.set(day.id, []);
  });

  entries.forEach((entry) => {
    scheduleByDay.get(entry.dayOfWeek)?.push(entry);
  });

  return (
    <div className="card">
      <div style={{ padding: "20px", borderBottom: "1px solid var(--border-color)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ margin: "0 0 8px", fontSize: "24px", fontWeight: 900 }}>
              Class Schedule
            </h1>
            <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "14px" }}>
              View and manage your weekly class schedule
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn btn-primary"
          >
            Add Class
          </button>
        </div>
      </div>

      {entries.length === 0 ? (
        <div style={{ padding: "60px 20px", textAlign: "center" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px", opacity: 0.3 }}>
            📚
          </div>
          <h3 style={{ margin: "0 0 8px", fontSize: "18px", fontWeight: 800 }}>
            No classes scheduled
          </h3>
          <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "14px" }}>
            Add your first class to get started!
          </p>
        </div>
      ) : (
        <div style={{ padding: "16px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
            {DAYS_OF_WEEK.map((day) => {
              const dayEntries = scheduleByDay.get(day.id) || [];

              return (
                <div
                  key={day.id}
                  style={{
                    border: "1px solid var(--border-color)",
                    borderRadius: "12px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      padding: "12px 16px",
                      background: "var(--french-blue)",
                      color: "white",
                      fontWeight: 900,
                      fontSize: "16px",
                    }}
                  >
                    {day.name}
                  </div>

                  <div style={{ padding: "12px" }}>
                    {dayEntries.length === 0 ? (
                      <div
                        style={{
                          padding: "20px",
                          textAlign: "center",
                          color: "var(--text-muted)",
                          fontSize: "14px",
                        }}
                      >
                        No classes
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {dayEntries.map((entry) => {
                          const isCreator = entry.createdBy === currentUserId;

                          return (
                            <div
                              key={entry.id}
                              style={{
                                padding: "12px",
                                borderRadius: "8px",
                                border: "1px solid var(--border-color)",
                                background: "var(--bg-primary)",
                              }}
                            >
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "8px" }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontWeight: 900, fontSize: "14px", marginBottom: "4px" }}>
                                    {entry.courseName}
                                  </div>
                                  {entry.courseCode && (
                                    <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>
                                      {entry.courseCode}
                                    </div>
                                  )}
                                </div>
                                {isCreator && (
                                  <form action={handleDelete}>
                                    <input type="hidden" name="entryId" value={entry.id} />
                                    <button
                                      type="submit"
                                      style={{
                                        background: "none",
                                        border: "none",
                                        color: "var(--error-color)",
                                        cursor: "pointer",
                                        fontSize: "12px",
                                        padding: "4px",
                                      }}
                                    >
                                      ✕
                                    </button>
                                  </form>
                                )}
                              </div>

                              <div style={{ fontSize: "13px", color: "var(--text-primary)", marginBottom: "4px" }}>
                                ⏰ {entry.startTime} - {entry.endTime}
                              </div>

                              {entry.instructor && (
                                <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "2px" }}>
                                  👤 {entry.instructor}
                                </div>
                              )}

                              {entry.room && (
                                <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "2px" }}>
                                  📍 {entry.room}
                                </div>
                              )}

                              {entry.faculty && (
                                <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                                  🏛️ {entry.faculty}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsModalOpen(false);
            }
          }}
        >
          <div className="card" style={{ maxWidth: "600px", width: "90%", padding: "24px", maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ margin: "0 0 16px", fontSize: "20px", fontWeight: 900 }}>
              Add Class to Schedule
            </h2>

            <form action={handleCreate}>
              <label style={{ display: "block", marginBottom: "16px" }}>
                <span style={{ display: "block", marginBottom: "8px", fontWeight: 700 }}>Course Name *</span>
                <input
                  type="text"
                  name="courseName"
                  required
                  placeholder="e.g., Introduction to Computer Science"
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border-color)" }}
                />
              </label>

              <label style={{ display: "block", marginBottom: "16px" }}>
                <span style={{ display: "block", marginBottom: "8px", fontWeight: 700 }}>Course Code</span>
                <input
                  type="text"
                  name="courseCode"
                  placeholder="e.g., CS101"
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border-color)" }}
                />
              </label>

              <label style={{ display: "block", marginBottom: "16px" }}>
                <span style={{ display: "block", marginBottom: "8px", fontWeight: 700 }}>Instructor</span>
                <input
                  type="text"
                  name="instructor"
                  placeholder="e.g., Dr. Smith"
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border-color)" }}
                />
              </label>

              <label style={{ display: "block", marginBottom: "16px" }}>
                <span style={{ display: "block", marginBottom: "8px", fontWeight: 700 }}>Room</span>
                <input
                  type="text"
                  name="room"
                  placeholder="e.g., Room 301"
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border-color)" }}
                />
              </label>

              <label style={{ display: "block", marginBottom: "16px" }}>
                <span style={{ display: "block", marginBottom: "8px", fontWeight: 700 }}>Day of Week *</span>
                <select
                  name="dayOfWeek"
                  required
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border-color)" }}
                >
                  {DAYS_OF_WEEK.map((day) => (
                    <option key={day.id} value={day.id}>
                      {day.name}
                    </option>
                  ))}
                </select>
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                <label>
                  <span style={{ display: "block", marginBottom: "8px", fontWeight: 700 }}>Start Time *</span>
                  <input
                    type="time"
                    name="startTime"
                    required
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border-color)" }}
                  />
                </label>

                <label>
                  <span style={{ display: "block", marginBottom: "8px", fontWeight: 700 }}>End Time *</span>
                  <input
                    type="time"
                    name="endTime"
                    required
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border-color)" }}
                  />
                </label>
              </div>

              <label style={{ display: "block", marginBottom: "16px" }}>
                <span style={{ display: "block", marginBottom: "8px", fontWeight: 700 }}>Faculty</span>
                <input
                  type="text"
                  name="faculty"
                  placeholder="e.g., Computer Science"
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border-color)" }}
                />
              </label>

              <label style={{ display: "block", marginBottom: "16px" }}>
                <span style={{ display: "block", marginBottom: "8px", fontWeight: 700 }}>Semester</span>
                <input
                  type="text"
                  name="semester"
                  placeholder="e.g., Spring 2026"
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border-color)" }}
                />
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                <input
                  type="checkbox"
                  name="isPublic"
                  value="true"
                  defaultChecked
                  style={{ width: "18px", height: "18px" }}
                />
                <span style={{ fontSize: "14px", fontWeight: 700 }}>
                  Make this schedule public (visible to all students)
                </span>
              </label>

              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Add Class
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
