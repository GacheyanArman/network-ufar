import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ilike, or, and, ne, sql, notInArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { users, communities, blockedUsers } from "@/lib/schema";
import UiIcon from "@/components/UiIcon";
import SearchBar from "@/components/SearchBar";
import { getFacultyLabel } from "@/lib/profile-utils";

export default async function SearchPage({ searchParams }) {
  const session = await getSession();

  if (!session?.userId) {
    redirect("/login");
  }

  const cookieStore = await cookies();
  const lang = cookieStore.get("language")?.value || "en";

  const params = await searchParams;
  const query = params?.q?.trim() || "";

  // Если нет query, показываем пустую страницу поиска
  if (!query) {
    return (
      <div className="uf-search-page">
        <style>{searchPageStyles}</style>

        <div className="uf-search-header">
          <h1>Search</h1>
          <p>Find people, communities, and more.</p>
        </div>

        <div className="uf-card uf-search-bar-card">
          <SearchBar />
        </div>

        <div className="uf-card uf-search-empty-state">
          <div className="uf-search-empty-icon">
            <UiIcon name="search" size={48} />
          </div>
          <h2>Start searching</h2>
          <p>Type in the search box above to find students, teachers, and communities.</p>
        </div>
      </div>
    );
  }

  const searchPattern = `%${query}%`;

  // Get blocked user IDs
  const blockedUserIds = new Set();
  const blockedRows = await db
    .select({
      blockedId: blockedUsers.blockedId,
      blockerId: blockedUsers.blockerId,
    })
    .from(blockedUsers)
    .where(
      or(
        sql`${blockedUsers.blockerId} = ${session.userId}`,
        sql`${blockedUsers.blockedId} = ${session.userId}`
      )
    );

  for (const row of blockedRows) {
    if (row.blockerId === session.userId) {
      blockedUserIds.add(row.blockedId);
    } else {
      blockedUserIds.add(row.blockerId);
    }
  }

  // Параллельный поиск пользователей и сообществ
  const [usersResults, communitiesResults] = await Promise.all([
    db
      .select({
        id: users.id,
        fullName: users.fullName,
        username: users.username,
        faculty: users.faculty,
        image: users.image,
      })
      .from(users)
      .where(
        blockedUserIds.size > 0
          ? and(
              ne(users.id, session.userId),
              notInArray(users.id, Array.from(blockedUserIds)),
              or(
                ilike(users.fullName, searchPattern),
                ilike(users.username, searchPattern),
                ilike(users.email, searchPattern),
                ilike(users.faculty, searchPattern)
              )
            )
          : and(
              ne(users.id, session.userId),
              or(
                ilike(users.fullName, searchPattern),
                ilike(users.username, searchPattern),
                ilike(users.email, searchPattern),
                ilike(users.faculty, searchPattern)
              )
            )
      )
      .orderBy(users.fullName)
      .limit(50),

    db
      .select({
        id: communities.id,
        name: communities.name,
        description: communities.description,
        imageUrl: communities.imageUrl,
      })
      .from(communities)
      .where(
        or(
          ilike(communities.name, searchPattern),
          ilike(communities.description, searchPattern)
        )
      )
      .orderBy(communities.name)
      .limit(50),
  ]);

  const totalResults = usersResults.length + communitiesResults.length;

  return (
    <div className="uf-search-page">
      <style>{searchPageStyles}</style>

      <div className="uf-search-header">
        <h1>Search Results</h1>
        <p>
          Found {totalResults} result{totalResults === 1 ? "" : "s"} for "{query}"
        </p>
      </div>

      <div className="uf-card uf-search-bar-card">
        <SearchBar />
      </div>

      {totalResults === 0 ? (
        <div className="uf-card uf-search-empty-state">
          <div className="uf-search-empty-icon">
            <UiIcon name="search" size={48} />
          </div>
          <h2>No results found</h2>
          <p>Try searching with different keywords or check your spelling.</p>
        </div>
      ) : (
        <div className="uf-search-results">
          {usersResults.length > 0 && (
            <section className="uf-card uf-search-section">
              <h2 className="uf-search-section-title">
                <UiIcon name="user" size={20} />
                People ({usersResults.length})
              </h2>

              <div className="uf-search-grid">
                {usersResults.map((user) => (
                  <Link
                    key={user.id}
                    href={`/profile/${user.id}`}
                    className="uf-search-user-card"
                  >
                    <div className="uf-search-user-avatar">
                      {user.image ? (
                        <img src={user.image} alt={user.fullName} />
                      ) : (
                        <span>{user.fullName?.[0] || "U"}</span>
                      )}
                    </div>

                    <div className="uf-search-user-info">
                      <strong>{user.fullName}</strong>
                      <span>
                        {user.username ? `@${user.username}` : user.faculty ? getFacultyLabel(user.faculty, lang) : "Student"}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {communitiesResults.length > 0 && (
            <section className="uf-card uf-search-section">
              <h2 className="uf-search-section-title">
                <UiIcon name="users" size={20} />
                Communities ({communitiesResults.length})
              </h2>

              <div className="uf-search-grid">
                {communitiesResults.map((community) => (
                  <Link
                    key={community.id}
                    href={`/communities/${community.id}`}
                    className="uf-search-user-card"
                  >
                    <div className="uf-search-user-avatar">
                      {community.imageUrl ? (
                        <img src={community.imageUrl} alt={community.name} />
                      ) : (
                        <span>{community.name?.[0] || "C"}</span>
                      )}
                    </div>

                    <div className="uf-search-user-info">
                      <strong>{community.name}</strong>
                      <span>{community.description || "Community"}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

const searchPageStyles = `
.uf-search-page {
  width: 100%;
  min-width: 0;
}

.uf-card {
  background: #ffffff;
  border: 1px solid #d9e2ef;
  border-radius: 18px;
  box-shadow: 0 2px 12px rgba(15, 23, 42, 0.04);
}

.uf-search-header {
  margin-bottom: 24px;
}

.uf-search-header h1 {
  margin: 0 0 8px;
  font-size: 28px;
  font-weight: 950;
  letter-spacing: -0.03em;
  color: #0f172a;
}

.uf-search-header p {
  margin: 0;
  font-size: 15px;
  color: #64748b;
  font-weight: 600;
}

.uf-search-bar-card {
  padding: 20px;
  margin-bottom: 24px;
  overflow: visible;
}

.uf-search-bar-card .uf-search-container {
  max-width: 100%;
}

.uf-search-bar-card .uf-search-input-wrapper {
  height: 48px;
}

.uf-search-bar-card .uf-search-input {
  height: 48px;
  font-size: 15px;
  padding: 0 48px 0 48px;
}

.uf-search-bar-card .uf-search-icon {
  left: 18px;
}

.uf-search-bar-card .uf-search-clear,
.uf-search-bar-card .uf-search-loading {
  right: 18px;
}

.uf-search-results {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.uf-search-section {
  padding: 24px;
}

.uf-search-section-title {
  margin: 0 0 20px;
  font-size: 18px;
  font-weight: 900;
  color: #0f172a;
  display: flex;
  align-items: center;
  gap: 10px;
}

.uf-search-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.uf-search-user-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px;
  border-radius: 12px;
  background: #f8fafc;
  border: 1px solid #e7edf5;
  text-decoration: none;
  transition: all 0.2s ease;
}

.uf-search-user-card:hover {
  background: #eef4ff;
  border-color: #d4e3ff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(11, 58, 168, 0.08);
}

.uf-search-user-avatar {
  width: 56px;
  height: 56px;
  border-radius: 999px;
  background: linear-gradient(135deg, #0b3aa8 0%, #062fae 100%);
  color: #ffffff;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  font-size: 20px;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(11, 58, 168, 0.16);
}

.uf-search-user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.uf-search-user-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.uf-search-user-info strong {
  font-size: 15px;
  font-weight: 900;
  color: #0f172a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.uf-search-user-info span {
  font-size: 13px;
  color: #64748b;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.uf-search-empty-state {
  padding: 80px 24px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.uf-search-empty-icon {
  width: 96px;
  height: 96px;
  border-radius: 999px;
  background: #f1f5f9;
  color: #cbd5e1;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
}

.uf-search-empty-state h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 950;
  color: #0f172a;
}

.uf-search-empty-state p {
  margin: 0;
  max-width: 420px;
  font-size: 15px;
  color: #64748b;
  font-weight: 600;
  line-height: 1.6;
}

@media (max-width: 768px) {
  .uf-search-header h1 {
    font-size: 24px;
  }

  .uf-search-grid {
    grid-template-columns: 1fr;
  }

  .uf-search-section {
    padding: 18px;
  }

  .uf-search-bar-card {
    padding: 16px;
  }
}
`;
