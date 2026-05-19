import { db } from "@/shared/db/db";
import { courses, posts, studyMaterials, academicCalendar, studyGroups, users } from "@/shared/db/schema";
import { eq, desc, and } from "drizzle-orm";
import Link from "next/link";
import UiIcon from "@/shared/ui/UiIcon";
import { notFound } from "next/navigation";

export default async function CourseHubPage({ params }: { params: { courseId: string } }) {
  const { courseId } = await params;
  
  const [course] = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1);
  if (!course) notFound();

  // Fetch Announcements
  const announcements = await db
    .select({
      id: posts.id,
      content: posts.content,
      createdAt: posts.createdAt,
      authorName: users.fullName,
      isPinned: posts.isPinned,
    })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .where(and(eq(posts.courseId, courseId), eq(posts.postType, "announcement")))
    .orderBy(desc(posts.isPinned), desc(posts.createdAt))
    .limit(3);

  // Fetch Materials
  const materials = await db
    .select()
    .from(studyMaterials)
    .where(and(eq(studyMaterials.courseId, courseId), eq(studyMaterials.status, "approved")))
    .orderBy(desc(studyMaterials.isPinned), desc(studyMaterials.createdAt))
    .limit(5);

  // Fetch Deadlines
  const deadlines = await db
    .select()
    .from(academicCalendar)
    .where(eq(academicCalendar.courseId, courseId))
    .orderBy(academicCalendar.dueDate)
    .limit(5);

  // Fetch Discussions
  const discussions = await db
    .select({
      id: posts.id,
      content: posts.content,
      createdAt: posts.createdAt,
      authorName: users.fullName,
    })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .where(and(eq(posts.courseId, courseId), eq(posts.postType, "question")))
    .orderBy(desc(posts.createdAt))
    .limit(5);

  // Fetch Study Groups
  const groups = await db
    .select()
    .from(studyGroups)
    .where(eq(studyGroups.courseId, courseId))
    .limit(3);

  return (
    <div style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto" }}>
      <header style={{ marginBottom: "32px", background: "var(--text-primary)", color: "var(--bg-card)", padding: "32px", borderRadius: "20px" }}>
        <div style={{ display: "inline-block", background: "rgba(255,255,255,0.1)", padding: "6px 12px", borderRadius: "8px", fontSize: "0.9rem", fontWeight: "bold", marginBottom: "16px" }}>
          {course.code}
        </div>
        <h1 style={{ margin: "0 0 12px", fontSize: "2.5rem", fontWeight: "900" }}>{course.name}</h1>
        <p style={{ margin: 0, opacity: 0.8, maxWidth: "600px", lineHeight: 1.5 }}>
          {course.description || "Course materials, discussions, and deadlines."}
        </p>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px", alignItems: "start" }}>
        
        {/* LEFT COLUMN */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          
          {/* Announcements */}
          <section style={{ background: "var(--bg-card)", padding: "24px", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h2 style={{ margin: 0, fontSize: "1.3rem", display: "flex", alignItems: "center", gap: "8px" }}>
                <UiIcon name="bell" size={20} color="var(--french-blue-deep)" /> Announcements
              </h2>
            </div>
            {announcements.length === 0 ? (
              <p style={{ color: "var(--text-secondary)", margin: 0 }}>No announcements yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {announcements.map(a => (
                  <div key={a.id} style={{ padding: "16px", background: a.isPinned ? "var(--french-blue-soft)" : "var(--bg-soft)", borderRadius: "12px", border: a.isPinned ? "1px solid #bfdbfe" : "none" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                      <strong>{a.authorName}</strong>
                      <span>{new Date(a.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p style={{ margin: 0, color: "var(--text-primary)", lineHeight: 1.5 }}>{a.content}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Materials */}
          <section style={{ background: "var(--bg-card)", padding: "24px", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h2 style={{ margin: 0, fontSize: "1.3rem", display: "flex", alignItems: "center", gap: "8px" }}>
                <UiIcon name="file-text" size={20} color="var(--french-blue-deep)" /> Latest Materials
              </h2>
              <Link href={`/materials?course=${course.id}`} style={{ color: "var(--french-blue-deep)", textDecoration: "none", fontSize: "0.9rem", fontWeight: "bold" }}>View All</Link>
            </div>
            {materials.length === 0 ? (
              <p style={{ color: "var(--text-secondary)", margin: 0 }}>No materials uploaded yet.</p>
            ) : (
              <div style={{ display: "grid", gap: "12px" }}>
                {materials.map(m => (
                  <Link key={m.id} href={`/materials/${m.id}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px", background: m.isPinned ? "var(--french-blue-soft)" : "var(--bg-card)", border: m.isPinned ? "1px solid #bfdbfe" : "1px solid #e2e8f0", borderRadius: "12px", textDecoration: "none", color: "inherit" }}>
                    <div>
                      <h3 style={{ margin: "0 0 4px", fontSize: "1.1rem", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
                        {m.title}
                        {m.isPinned && <UiIcon name="pin" size={16} color="var(--french-blue-deep)" />}
                      </h3>
                      <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-secondary)" }}>{m.type} • {m.downloadsCount} downloads</p>
                    </div>
                    <UiIcon name="chevron-right" size={20} color="var(--text-muted)" />
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Discussions */}
          <section style={{ background: "var(--bg-card)", padding: "24px", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h2 style={{ margin: 0, fontSize: "1.3rem", display: "flex", alignItems: "center", gap: "8px" }}>
                <UiIcon name="message-square" size={20} color="var(--french-blue-deep)" /> Questions & Discussions
              </h2>
              <button style={{ padding: "6px 12px", background: "var(--bg-hover)", border: "none", borderRadius: "6px", fontWeight: "bold", color: "var(--text-primary)", cursor: "pointer" }}>Ask Question</button>
            </div>
            {discussions.length === 0 ? (
              <p style={{ color: "var(--text-secondary)", margin: 0 }}>No discussions yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {discussions.map(d => (
                  <div key={d.id} style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: "16px" }}>
                    <p style={{ margin: "0 0 8px", color: "var(--text-primary)", lineHeight: 1.5, fontWeight: "500" }}>{d.content}</p>
                    <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                      Asked by {d.authorName} • {new Date(d.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          
          {/* Deadlines */}
          <section style={{ background: "var(--bg-card)", padding: "24px", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
            <h2 style={{ margin: "0 0 16px", fontSize: "1.3rem", display: "flex", alignItems: "center", gap: "8px" }}>
              <UiIcon name="calendar" size={20} color="var(--french-blue-deep)" /> Upcoming Deadlines
            </h2>
            {deadlines.length === 0 ? (
              <p style={{ color: "var(--text-secondary)", margin: 0 }}>No upcoming deadlines.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {deadlines.map(d => (
                  <div key={d.id} style={{ display: "flex", gap: "12px", padding: "12px", background: "var(--bg-soft)", borderRadius: "8px" }}>
                    <div style={{ background: "#e0e7ff", color: "#4f46e5", padding: "8px", borderRadius: "8px", textAlign: "center", minWidth: "48px" }}>
                      <div style={{ fontSize: "0.75rem", fontWeight: "bold", textTransform: "uppercase" }}>{new Date(d.dueDate).toLocaleString('en-US', { month: 'short' })}</div>
                      <div style={{ fontSize: "1.2rem", fontWeight: "900" }}>{new Date(d.dueDate).getDate()}</div>
                    </div>
                    <div>
                      <h4 style={{ margin: "0 0 4px", color: "var(--text-primary)" }}>{d.title}</h4>
                      <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-secondary)" }}>{d.eventType}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Study Groups */}
          <section style={{ background: "var(--bg-card)", padding: "24px", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h2 style={{ margin: 0, fontSize: "1.3rem", display: "flex", alignItems: "center", gap: "8px" }}>
                <UiIcon name="users" size={20} color="var(--french-blue-deep)" /> Study Groups
              </h2>
            </div>
            {groups.length === 0 ? (
              <p style={{ color: "var(--text-secondary)", margin: 0 }}>No study groups created yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {groups.map(g => (
                  <Link key={g.id} href={`/study-groups/${g.id}`} style={{ padding: "12px", border: "1px solid #e2e8f0", borderRadius: "8px", textDecoration: "none", color: "inherit", display: "block" }}>
                    <h4 style={{ margin: "0 0 4px", color: "var(--text-primary)" }}>{g.title}</h4>
                    <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-secondary)" }}>{g.membersCount} members</p>
                  </Link>
                ))}
              </div>
            )}
            <button style={{ width: "100%", marginTop: "16px", padding: "10px", background: "var(--bg-soft)", border: "1px solid #e2e8f0", borderRadius: "8px", fontWeight: "bold", color: "var(--french-blue-deep)", cursor: "pointer" }}>
              Create Group
            </button>
          </section>
        </div>

      </div>
    </div>
  );
}
