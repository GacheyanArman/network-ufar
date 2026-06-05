import Link from "next/link";
import Image from "next/image";
import { cookies } from "next/headers";
import { desc, eq, sql, and, ilike, or } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/shared/db/db";
import { studyGroups, studyGroupMembers, users } from "@/shared/db/schema";
import { getSession } from "@/shared/auth/session";
import { translations } from "@/shared/i18n/i18n";
import { getFacultyLabel } from "@/features/profile/server/utils";
import {
  joinStudyGroup,
  leaveStudyGroup,
  deleteStudyGroup,
} from "@/features/study-groups/server/actions";
import UiIcon from "@/shared/ui/UiIcon";
import StudyGroupsHeader from "@/features/study-groups/components/StudyGroupsHeader";
import StudyGroupsCreateButton from "@/features/study-groups/components/StudyGroupsCreateButton";

export default async function StudyGroupsPage({ searchParams }) {
  const session = await getSession();
  if (!session?.userId) redirect("/login");

  const cookieStore = await cookies();
  const lang = cookieStore.get("language")?.value || "en";
  const t = translations[lang]?.studyGroups || translations.en.studyGroups;

  const params = await searchParams;
  const q = params?.q?.trim() || "";
  const filter = params?.filter || "all";

  const pattern = q ? `%${q}%` : null;

  const statusFilter = filter === "all" ? undefined : eq(studyGroups.status, filter);

  const groups = await db
    .select({
      id: studyGroups.id,
      title: studyGroups.title,
      subject: studyGroups.subject,
      faculty: studyGroups.faculty,
      description: studyGroups.description,
      meetingDay: studyGroups.meetingDay,
      meetingTime: studyGroups.meetingTime,
      location: studyGroups.location,
      onlineLink: studyGroups.onlineLink,
      maxMembers: studyGroups.maxMembers,
      membersCount: studyGroups.membersCount,
      status: studyGroups.status,
      ownerId: studyGroups.ownerId,
      ownerName: users.fullName,
      ownerImage: users.image,
      createdAt: studyGroups.createdAt,
    })
    .from(studyGroups)
    .innerJoin(users, eq(studyGroups.ownerId, users.id))
    .where(
      and(
        statusFilter,
        pattern
          ? or(
              ilike(studyGroups.title, pattern),
              ilike(studyGroups.subject, pattern),
              ilike(studyGroups.faculty, pattern)
            )
          : undefined
      )
    )
    .orderBy(desc(studyGroups.createdAt))
    .limit(60);

  const membershipRows = await db
    .select({ groupId: studyGroupMembers.groupId })
    .from(studyGroupMembers)
    .where(eq(studyGroupMembers.userId, session.userId));

  const joinedSet = new Set(membershipRows.map((m) => m.groupId));

  return (
    <div className="uf-sg-page">
      <style>{pageCSS}</style>

      <StudyGroupsHeader title={t.title} subtitle={t.subtitle} createLabel={t.createGroup} />

      <div className="uf-sg-filters">
        {["all", "active", "completed", "cancelled"].map((f) => (
          <Link
            key={f}
            href={`/study-groups?filter=${f}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            className={`uf-sg-filter ${filter === f ? "active" : ""}`}
          >
            {t.filters?.[f] || f}
          </Link>
        ))}
      </div>

      {groups.length === 0 ? (
        <div className="uf-sg-empty">
          <div className="uf-sg-empty-icon">
            <UiIcon name="users" size={32} />
          </div>
          <h2>{t.emptyTitle}</h2>
          <p>{t.emptyHint}</p>
          <StudyGroupsCreateButton label={t.createFirst} />
        </div>
      ) : (
        <div className="uf-sg-grid">
          {groups.map((g) => {
            const isOwner = g.ownerId === session.userId;
            const isJoined = joinedSet.has(g.id);
            const isFull = g.maxMembers && g.membersCount >= g.maxMembers;

            return (
              <article key={g.id} className="uf-sg-card">
                <div className="uf-sg-card-header">
                  <span className={`uf-sg-status uf-sg-status--${g.status}`}>
                    {t.status?.[g.status] || g.status}
                  </span>
                  <span className="uf-sg-members">
                    <UiIcon name="users" size={14} />
                    {g.membersCount}/{g.maxMembers || "∞"}
                  </span>
                </div>

                <h3 className="uf-sg-card-title">{g.title}</h3>

                {g.subject && (
                  <div className="uf-sg-card-meta">
                    <UiIcon name="graduation" size={14} />
                    {g.subject}
                  </div>
                )}

                {(g.meetingDay || g.meetingTime) && (
                  <div className="uf-sg-card-meta">
                    <UiIcon name="clock" size={14} />
                    {[g.meetingDay, g.meetingTime].filter(Boolean).join(" ")}
                  </div>
                )}

                {g.location && (
                  <div className="uf-sg-card-meta">
                    <UiIcon name="map-pin" size={14} />
                    {g.location}
                  </div>
                )}

                {g.description && (
                  <p className="uf-sg-card-desc">
                    {g.description.length > 120
                      ? g.description.slice(0, 120) + "…"
                      : g.description}
                  </p>
                )}

                <div className="uf-sg-card-footer">
                  <div className="uf-sg-card-owner">
                    {g.ownerImage ? (
                      <Image src={g.ownerImage} alt={g.ownerName} width={24} height={24} className="uf-sg-owner-avatar" />
                    ) : (
                      <span className="uf-sg-owner-avatar uf-sg-owner-avatar--fallback">
                        {g.ownerName?.[0] || "U"}
                      </span>
                    )}
                    <span>{g.ownerName}</span>
                  </div>

                  <div className="uf-sg-card-actions">
                    {isOwner ? (
                      <form action={deleteStudyGroup}>
                        <input type="hidden" name="groupId" value={g.id} />
                        <button type="submit" className="btn btn-danger" style={{ minHeight: "36px", padding: "0 14px", fontSize: "13px" }}>
                          {t.deleteGroup}
                        </button>
                      </form>
                    ) : isJoined ? (
                      <form action={leaveStudyGroup}>
                        <input type="hidden" name="groupId" value={g.id} />
                        <button type="submit" className="btn btn-secondary" style={{ minHeight: "36px", padding: "0 14px", fontSize: "13px" }}>
                          {t.leaveGroup}
                        </button>
                      </form>
                    ) : (
                      <form action={joinStudyGroup}>
                        <input type="hidden" name="groupId" value={g.id} />
                        <button
                          type="submit"
                          className="btn btn-primary"
                          style={{ minHeight: "36px", padding: "0 14px", fontSize: "13px" }}
                          disabled={isFull || g.status !== "active"}
                        >
                          {isFull ? t.groupFull : g.status !== "active" ? t.status?.[g.status] : t.joinGroup}
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

const pageCSS = `
.uf-sg-page {
  max-width: 960px;
  margin: 0 auto;
  padding: 0 12px;
}

.uf-sg-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.uf-sg-header h1 {
  margin: 0;
  font-size: 26px;
  font-weight: 900;
  letter-spacing: -0.02em;
  color: #0f172a;
}

.uf-sg-header p {
  margin: 4px 0 0;
  font-size: 14px;
  color: var(--text-secondary);
}

.uf-sg-create-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 18px;
  border-radius: 10px;
  background: #0b3aa8;
  color: #fff;
  font-size: 14px;
  font-weight: 800;
  text-decoration: none;
  border: none;
  cursor: pointer;
  transition: background 160ms ease;
}

.uf-sg-create-btn:hover { background: #062fae; }

.uf-sg-filters {
  display: flex;
  gap: 6px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.uf-sg-filter {
  padding: 7px 14px;
  border-radius: 999px;
  border: 1px solid #d9e2ef;
  background: #fff;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
  transition: all 160ms ease;
}

.uf-sg-filter:hover { border-color: #b0bdd0; }

.uf-sg-filter.active {
  background: #0b3aa8;
  color: #fff;
  border-color: #0b3aa8;
}

.uf-sg-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.uf-sg-card {
  background: #fff;
  border: 1px solid #d9e2ef;
  border-radius: 16px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: box-shadow 160ms ease;
}

.uf-sg-card:hover {
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.06);
}

.uf-sg-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.uf-sg-status {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  padding: 3px 8px;
  border-radius: 6px;
}

.uf-sg-status--active { background: #ecfdf5; color: #065f46; }
.uf-sg-status--completed { background: #eef4ff; color: #0b3aa8; }
.uf-sg-status--cancelled { background: #fef2f2; color: #991b1b; }

.uf-sg-members {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 700;
  color: var(--text-secondary);
}

.uf-sg-card-title {
  margin: 0;
  font-size: 17px;
  font-weight: 900;
  color: #0f172a;
}

.uf-sg-card-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 600;
}

.uf-sg-card-desc {
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.uf-sg-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: auto;
  padding-top: 10px;
  border-top: 1px solid var(--border-color-light);
}

.uf-sg-card-owner {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
  color: #334155;
}

.uf-sg-owner-avatar {
  width: 24px;
  height: 24px;
  border-radius: 999px;
  object-fit: cover;
  background: #0b3aa8;
}

.uf-sg-owner-avatar--fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 11px;
  font-weight: 900;
}

.uf-sg-action-btn {
  padding: 7px 14px;
  border-radius: 8px;
  border: 1px solid #d9e2ef;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  transition: all 160ms ease;
}

.uf-sg-action-btn--join {
  background: #0b3aa8;
  color: #fff;
  border-color: #0b3aa8;
}

.uf-sg-action-btn--join:hover:not(:disabled) { background: #062fae; }

.uf-sg-action-btn--leave {
  background: #fff;
  color: var(--text-secondary);
}

.uf-sg-action-btn--leave:hover { background: #f8fafc; }

.uf-sg-action-btn--danger {
  background: #fff;
  color: #dc2626;
  border-color: #fecaca;
}

.uf-sg-action-btn--danger:hover { background: #fef2f2; }

.uf-sg-action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.uf-sg-empty {
  background: #fff;
  border: 1px dashed #d9e2ef;
  border-radius: 16px;
  padding: 48px 24px;
  text-align: center;
}

.uf-sg-empty-icon {
  width: 64px;
  height: 64px;
  border-radius: 999px;
  background: #eef4ff;
  color: #0b3aa8;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
}

.uf-sg-empty h2 {
  margin: 0 0 6px;
  font-size: 18px;
  font-weight: 900;
  color: #0f172a;
}

.uf-sg-empty p {
  margin: 0 0 16px;
  font-size: 14px;
  color: var(--text-secondary);
}

@media (max-width: 700px) {
  .uf-sg-grid {
    grid-template-columns: 1fr;
  }
}
`;
