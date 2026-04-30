import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { academicCalendar, users } from "@/lib/schema";
import { getSession } from "@/lib/session";
import { eq, gte, or } from "drizzle-orm";
import { createCalendarEntry, deleteCalendarEntry } from "@/app/actions/calendar";

export default async function CalendarPage() {
  const session = await getSession();

  if (!session?.userId) {
    redirect("/login");
  }

  // Get upcoming calendar entries (public + user's own)
  const entries = await db
    .select({
      id: academicCalendar.id,
      title: academicCalendar.title,
      description: academicCalendar.description,
      eventType: academicCalendar.eventType,
      course: academicCalendar.course,
      dueDate: academicCalendar.dueDate,
      isPublic: academicCalendar.isPublic,
      createdBy: academicCalendar.createdBy,
      creatorName: users.fullName,
      creatorImage: users.image,
      createdAt: academicCalendar.createdAt,
    })
    .from(academicCalendar)
    .innerJoin(users, eq(academicCalendar.createdBy, users.id))
    .where(
      or(
        eq(academicCalendar.isPublic, true),
        eq(academicCalendar.createdBy, session.userId)
      )
    )
    .orderBy(academicCalendar.dueDate)
    .limit(100);

  // Group entries by month
  const entriesByMonth = new Map();
  entries.forEach((entry) => {
    const date = new Date(entry.dueDate);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (!entriesByMonth.has(monthKey)) {
      entriesByMonth.set(monthKey, []);
    }
    entriesByMonth.get(monthKey)?.push(entry);
  });

  const sortedMonths = Array.from(entriesByMonth.keys()).sort();

  const eventTypeColors = {
    exam: "#e74c3c",
    assignment: "#3498db",
    lecture: "#2ecc71",
    holiday: "#f39c12",
    deadline: "#e67e22",
    other: "#95a5a6",
  };

  const eventTypeIcons = {
    exam: "📝",
    assignment: "📚",
    lecture: "🎓",
    holiday: "🎉",
    deadline: "⏰",
    other: "📌",
  };

  return (
    <div className="card" style={{ maxWidth: "1000px", margin: "0 auto" }}>
      <div style={{ padding: "20px", borderBottom: "1px solid var(--border-color)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ margin: "0 0 8px", fontSize: "24px", fontWeight: 900 }}>
              Academic Calendar
            </h1>
            <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "14px" }}>
              Track exams, assignments, and important academic dates
            </p>
          </div>
          <button
            onClick={() => {
              const modal = document.getElementById("create-calendar-modal");
              if (modal) modal.style.display = "flex";
            }}
            className="btn btn-primary"
          >
            Add Entry
          </button>
        </div>
      </div>

      {entries.length === 0 ? (
        <div style={{ padding: "60px 20px", textAlign: "center" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px", opacity: 0.3 }}>
            📅
          </div>
          <h3 style={{ margin: "0 0 8px", fontSize: "18px", fontWeight: 800 }}>
            No calendar entries
          </h3>
          <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "14px" }}>
            Add your first exam, assignment, or deadline!
          </p>
        </div>
      ) : (
        <div style={{ padding: "16px" }}>
          {sortedMonths.map((monthKey) => {
            const monthEntries = entriesByMonth.get(monthKey) || [];
            const [year, month] = monthKey.split("-");
            const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            });

            return (
              <div key={monthKey} style={{ marginBottom: "32px" }}>
                <h2 style={{ margin: "0 0 16px", fontSize: "18px", fontWeight: 900, color: "var(--text-primary)" }}>
                  {monthName}
                </h2>

                <div style={{ display: "grid", gap: "12px" }}>
                  {monthEntries.map((entry) => {
                    const dueDate = new Date(entry.dueDate);
                    const isCreator = entry.createdBy === session.userId;
                    const isPast = dueDate < new Date();
                    const color = eventTypeColors[entry.eventType];
                    const icon = eventTypeIcons[entry.eventType];

                    return (
                      <div
                        key={entry.id}
                        style={{
                          padding: "16px",
                          borderRadius: "12px",
                          border: `2px solid ${color}`,
                          background: isPast ? "var(--bg-secondary)" : "var(--bg-primary)",
                          opacity: isPast ? 0.6 : 1,
                        }}
                      >
                        <div style={{ display: "flex", gap: "16px", alignItems: "start" }}>
                          <div
                            style={{
                              width: "50px",
                              textAlign: "center",
                              padding: "8px",
                              borderRadius: "8px",
                              background: color,
                              color: "white",
                              flexShrink: 0,
                            }}
                          >
                            <div style={{ fontSize: "12px", fontWeight: 700 }}>
                              {dueDate.toLocaleDateString("en-US", { month: "short" })}
                            </div>
                            <div style={{ fontSize: "20px", fontWeight: 900 }}>
                              {dueDate.getDate()}
                            </div>
                          </div>

                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                              <span style={{ fontSize: "18px" }}>{icon}</span>
                              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 900 }}>
                                {entry.title}
                              </h3>
                            </div>

                            <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "8px" }}>
                              <span style={{
                                display: "inline-block",
                                padding: "2px 8px",
                                borderRadius: "4px",
                                background: color,
                                color: "white",
                                marginRight: "8px",
                                textTransform: "capitalize",
                              }}>
                                {entry.eventType}
                              </span>
                              {dueDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                              {entry.course && ` • ${entry.course}`}
                              {!entry.isPublic && " • Private"}
                            </div>

                            {entry.description && (
                              <p style={{ margin: "0 0 8px", fontSize: "14px", color: "var(--text-primary)" }}>
                                {entry.description}
                              </p>
                            )}

                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                              <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                                Added by {entry.creatorName}
                              </div>

                              {isCreator && (
                                <form action={deleteCalendarEntry}>
                                  <input type="hidden" name="entryId" value={entry.id} />
                                  <button
                                    type="submit"
                                    className="btn btn-secondary"
                                    style={{ fontSize: "12px", padding: "4px 12px", color: "var(--error-color)" }}
                                  >
                                    Delete
                                  </button>
                                </form>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Calendar Entry Modal */}
      <div
        id="create-calendar-modal"
        style={{
          display: "none",
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.5)",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            e.currentTarget.style.display = "none";
          }
        }}
      >
        <div className="card" style={{ maxWidth: "600px", width: "90%", padding: "24px", maxHeight: "90vh", overflowY: "auto" }}>
          <h2 style={{ margin: "0 0 16px", fontSize: "20px", fontWeight: 900 }}>
            Add Calendar Entry
          </h2>

          <form action={createCalendarEntry}>
            <label style={{ display: "block", marginBottom: "16px" }}>
              <span style={{ display: "block", marginBottom: "8px", fontWeight: 700 }}>Title</span>
              <input
                type="text"
                name="title"
                required
                placeholder="e.g., Midterm Exam - Computer Science"
                style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border-color)" }}
              />
            </label>

            <label style={{ display: "block", marginBottom: "16px" }}>
              <span style={{ display: "block", marginBottom: "8px", fontWeight: 700 }}>Type</span>
              <select
                name="eventType"
                required
                style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border-color)" }}
              >
                <option value="exam">📝 Exam</option>
                <option value="assignment">📚 Assignment</option>
                <option value="lecture">🎓 Lecture</option>
                <option value="holiday">🎉 Holiday</option>
                <option value="deadline">⏰ Deadline</option>
                <option value="other">📌 Other</option>
              </select>
            </label>

            <label style={{ display: "block", marginBottom: "16px" }}>
              <span style={{ display: "block", marginBottom: "8px", fontWeight: 700 }}>Course (Optional)</span>
              <input
                type="text"
                name="course"
                placeholder="e.g., CS101"
                style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border-color)" }}
              />
            </label>

            <label style={{ display: "block", marginBottom: "16px" }}>
              <span style={{ display: "block", marginBottom: "8px", fontWeight: 700 }}>Description (Optional)</span>
              <textarea
                name="description"
                placeholder="Additional details..."
                rows={3}
                style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border-color)", resize: "vertical" }}
              />
            </label>

            <label style={{ display: "block", marginBottom: "16px" }}>
              <span style={{ display: "block", marginBottom: "8px", fontWeight: 700 }}>Due Date & Time</span>
              <input
                type="datetime-local"
                name="dueDate"
                required
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
                Make this entry public (visible to all students)
              </span>
            </label>

            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => {
                  const modal = document.getElementById("create-calendar-modal");
                  if (modal) modal.style.display = "none";
                }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Add Entry
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
