import Link from "next/link";
import Image from "next/image";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { unifiedSearch } from "@/features/search/server/actions";
import { getSession } from "@/shared/auth/session";
import { translations } from "@/shared/i18n/i18n";
import { getFacultyLabel } from "@/features/profile/server/utils";
import UiIcon from "@/shared/ui/UiIcon";
import SearchBar from "@/features/search/components/SearchBar";
import BackButton from "./BackButton";

export default async function SearchPage({ searchParams }) {
  const session = await getSession();
  if (!session?.userId) redirect("/login");

  const cookieStore = await cookies();
  const lang = cookieStore.get("language")?.value || "en";
  const t = translations[lang]?.searchPage || translations.en.searchPage;
  const es = (translations[lang] || translations.en).emptyStates;

  const params = await searchParams;
  const query = params?.q?.trim() || "";

  if (!query) {
    return (
      <div className="uf-search-page">
        <style>{searchPageStyles}</style>

        <div className="uf-search-header">
          <BackButton />
          <h1>{t.title}</h1>
          <p>{t.subtitle}</p>
        </div>

        <div className="uf-card uf-search-bar-card">
          <SearchBar />
        </div>

        <div className="uf-card uf-search-empty-state">
          <div className="uf-search-empty-icon">
            <UiIcon name="search" size={48} />
          </div>
          <h2>{t.emptyTitle}</h2>
          <p>{t.emptyHint}</p>
        </div>
      </div>
    );
  }

  const results = await unifiedSearch(query);

  const totalResults =
    results.users.length +
    results.posts.length +
    results.communities.length +
    results.events.length +
    results.materials.length +
    results.library.length +
    results.photos.length +
    results.albums.length +
    results.calendar.length;

  return (
    <div className="uf-search-page">
      <style>{searchPageStyles}</style>

      <div className="uf-search-header">
        <BackButton />
        <h1>{t.resultsTitle}</h1>
        <p>
          {t.resultsCount
            .replace("{count}", String(totalResults))
            .replace("{query}", query)}
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
          <h2>{es.search.noResults}</h2>
          <p>{es.search.noResultsHint}</p>
          <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/friends" className="btn btn-secondary" style={{ textDecoration: "none", fontSize: "0.85rem" }}>
              {es.search.browsePeople}
            </Link>
            <Link href="/events" className="btn btn-secondary" style={{ textDecoration: "none", fontSize: "0.85rem" }}>
              {es.search.browseEvents}
            </Link>
            <Link href="/materials" className="btn btn-secondary" style={{ textDecoration: "none", fontSize: "0.85rem" }}>
              {es.search.browseMaterials}
            </Link>
          </div>
        </div>
      ) : (
        <div className="uf-search-results">
          {results.users.length > 0 && (
            <SearchSection
              icon="user"
              title={t.people}
              count={results.users.length}
              seeAll={`/friends?q=${encodeURIComponent(query)}`}
              seeAllLabel={t.seeAll}
            >
              {results.users.map((u) => (
                <Link
                  key={u.id}
                  href={`/profile/${u.id}`}
                  className="uf-search-item"
                >
                  <div className="uf-search-item-avatar">
                    {u.image ? (
                      <Image src={u.image} alt={u.fullName} width={44} height={44} />
                    ) : (
                      <span>{u.fullName?.[0] || "U"}</span>
                    )}
                  </div>
                  <div className="uf-search-item-info">
                    <strong>{u.fullName}</strong>
                    <span>
                      {u.username
                        ? `@${u.username}`
                        : u.faculty
                          ? getFacultyLabel(u.faculty, lang)
                          : "Student"}
                    </span>
                  </div>
                </Link>
              ))}
            </SearchSection>
          )}

          {results.materials.length > 0 && (
            <SearchSection
              icon="graduation"
              title={t.materials}
              count={results.materials.length}
              seeAll={`/study-materials?q=${encodeURIComponent(query)}`}
              seeAllLabel={t.seeAll}
            >
              {results.materials.map((m) => (
                <Link
                  key={m.id}
                  href={`/study-materials?id=${m.id}`}
                  className="uf-search-item"
                >
                  <div className="uf-search-item-icon-wrap" style={{ background: "var(--french-blue-soft)", color: "var(--french-blue-deep)" }}>
                    <UiIcon name="file" size={20} />
                  </div>
                  <div className="uf-search-item-info">
                    <strong>{m.title}</strong>
                    <span>
                      {[m.subject, m.course, m.faculty ? getFacultyLabel(m.faculty, lang) : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </div>
                  <div className="uf-search-item-badge">{m.type}</div>
                </Link>
              ))}
            </SearchSection>
          )}

          {results.calendar.length > 0 && (
            <SearchSection
              icon="calendar"
              title={t.calendar}
              count={results.calendar.length}
              seeAll={`/courses?tab=calendar`}
              seeAllLabel={t.seeAll}
            >
              {results.calendar.map((c) => (
                <Link
                  key={c.id}
                  href={`/courses?tab=calendar`}
                  className="uf-search-item"
                >
                  <div className="uf-search-item-icon-wrap" style={{ background: "var(--warning-soft)", color: "#92400e" }}>
                    <UiIcon name="calendar" size={20} />
                  </div>
                  <div className="uf-search-item-info">
                    <strong>{c.title}</strong>
                    <span>
                      {c.course
                        ? `${c.course} · `
                        : ""}
                      {new Date(c.dueDate).toLocaleDateString(lang, {
                        day: "numeric",
                        month: "long",
                      })}
                    </span>
                  </div>
                  <div className="uf-search-item-badge">{c.eventType}</div>
                </Link>
              ))}
            </SearchSection>
          )}

          {results.communities.length > 0 && (
            <SearchSection
              icon="users"
              title={t.communities}
              count={results.communities.length}
              seeAll={`/communities?q=${encodeURIComponent(query)}`}
              seeAllLabel={t.seeAll}
            >
              {results.communities.map((c) => (
                <Link
                  key={c.id}
                  href={`/communities/${c.id}`}
                  className="uf-search-item"
                >
                  <div className="uf-search-item-avatar">
                    {c.avatar ? (
                      <Image src={c.avatar} alt={c.name} width={44} height={44} />
                    ) : (
                      <span>{c.name?.[0] || "C"}</span>
                    )}
                  </div>
                  <div className="uf-search-item-info">
                    <strong>{c.name}</strong>
                    <span>{c.description || "Group"}</span>
                  </div>
                </Link>
              ))}
            </SearchSection>
          )}

          {results.events.length > 0 && (
            <SearchSection
              icon="calendar"
              title={t.events}
              count={results.events.length}
              seeAll={`/events?q=${encodeURIComponent(query)}`}
              seeAllLabel={t.seeAll}
            >
              {results.events.map((e) => (
                <Link
                  key={e.id}
                  href={`/events/${e.id}`}
                  className="uf-search-item"
                >
                  <div className="uf-search-item-icon-wrap" style={{ background: "#fce7f3", color: "#9d174d" }}>
                    <UiIcon name="calendar" size={20} />
                  </div>
                  <div className="uf-search-item-info">
                    <strong>
                      {e.isCancelled ? (
                        <span style={{ textDecoration: "line-through", opacity: 0.6 }}>{e.title}</span>
                      ) : (
                        e.title
                      )}
                    </strong>
                    <span>
                      {new Date(e.startTime).toLocaleDateString(lang, {
                        day: "numeric",
                        month: "long",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {e.location ? ` · ${e.location}` : ""}
                    </span>
                  </div>
                  <div className="uf-search-item-badge">{e.eventType}</div>
                </Link>
              ))}
            </SearchSection>
          )}

          {results.library.length > 0 && (
            <SearchSection
              icon="book"
              title={t.library}
              count={results.library.length}
              seeAll={`/library?q=${encodeURIComponent(query)}`}
              seeAllLabel={t.seeAll}
            >
              {results.library.map((l) => (
                <Link
                  key={l.id}
                  href={`/library?id=${l.id}`}
                  className="uf-search-item"
                >
                  <div className="uf-search-item-icon-wrap" style={{ background: "var(--success-soft)", color: "var(--success)" }}>
                    <UiIcon name="book" size={20} />
                  </div>
                  <div className="uf-search-item-info">
                    <strong>{l.title}</strong>
                    <span>
                      {[l.author, l.subject, l.faculty ? getFacultyLabel(l.faculty, lang) : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </div>
                  <div className="uf-search-item-badge">{l.type}</div>
                </Link>
              ))}
            </SearchSection>
          )}

          {results.posts.length > 0 && (
            <SearchSection
              icon="message"
              title={t.posts}
              count={results.posts.length}
              seeAll={`/?q=${encodeURIComponent(query)}`}
              seeAllLabel={t.seeAll}
            >
              {results.posts.map((p) => (
                <Link
                  key={p.id}
                  href={`/?highlight=${p.id}`}
                  className="uf-search-item"
                >
                  <div className="uf-search-item-avatar">
                    {p.authorImage ? (
                      <Image src={p.authorImage} alt={p.authorName} width={44} height={44} />
                    ) : (
                      <span>{p.authorName?.[0] || "U"}</span>
                    )}
                  </div>
                  <div className="uf-search-item-info">
                    <strong>{p.authorName}</strong>
                    <span>{truncate(p.content, 100)}</span>
                  </div>
                </Link>
              ))}
            </SearchSection>
          )}

          {results.photos.length > 0 && (
            <SearchSection
              icon="camera"
              title={t.photos}
              count={results.photos.length}
              seeAll={`/photos/explore?q=${encodeURIComponent(query)}`}
              seeAllLabel={t.seeAll}
            >
              {results.photos.map((p) => (
                <Link
                  key={p.id}
                  href={`/photos#${p.id}`}
                  className="uf-search-item"
                >
                  <div className="uf-search-item-thumb">
                    <Image src={p.imageUrl} alt={p.caption || "Photo"} width={44} height={44} />
                  </div>
                  <div className="uf-search-item-info">
                    <strong>{p.caption || "Campus moment"}</strong>
                    <span>{p.ownerName} · {p.likesCount} likes</span>
                  </div>
                </Link>
              ))}
            </SearchSection>
          )}

          {results.albums.length > 0 && (
            <SearchSection
              icon="image"
              title={t.albums}
              count={results.albums.length}
              seeAll={`/photos/albums?q=${encodeURIComponent(query)}`}
              seeAllLabel={t.seeAll}
            >
              {results.albums.map((a) => (
                <Link
                  key={a.id}
                  href={`/photos/albums/${a.id}`}
                  className="uf-search-item"
                >
                  <div className="uf-search-item-thumb">
                    {a.coverPhotoUrl ? (
                      <Image src={a.coverPhotoUrl} alt={a.title} width={44} height={44} />
                    ) : (
                      <span>{a.title?.[0] || "A"}</span>
                    )}
                  </div>
                  <div className="uf-search-item-info">
                    <strong>{a.title}</strong>
                    <span>{a.description || a.category || "Album"}</span>
                  </div>
                </Link>
              ))}
            </SearchSection>
          )}
        </div>
      )}
    </div>
  );
}

function SearchSection({ icon, title, count, seeAll, seeAllLabel, children }) {
  return (
    <section className="uf-card uf-search-section">
      <h2 className="uf-search-section-title">
        <UiIcon name={icon} size={20} />
        {title}
        <span className="uf-search-section-count">{count}</span>
      </h2>

      <div className="uf-search-list">{children}</div>

      {count > 3 && seeAll && (
        <Link href={seeAll} className="uf-search-section-see-all">
          {seeAllLabel} →
        </Link>
      )}
    </section>
  );
}

function truncate(str, max) {
  if (!str) return "";
  return str.length > max ? str.slice(0, max) + "…" : str;
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
  color: var(--text-secondary);
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
  gap: 20px;
}

.uf-search-section {
  padding: 20px;
}

.uf-search-section-title {
  margin: 0 0 14px;
  font-size: 17px;
  font-weight: 900;
  color: #0f172a;
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-color-light);
}

.uf-search-section-count {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-secondary);
  background: var(--bg-hover);
  padding: 2px 8px;
  border-radius: 999px;
  margin-left: auto;
}

.uf-search-list {
  display: flex;
  flex-direction: column;
}

.uf-search-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 8px;
  border-radius: 12px;
  text-decoration: none;
  color: inherit;
  transition: all 0.15s ease;
}

.uf-search-item + .uf-search-item {
  border-top: 1px solid #f8fafc;
}

.uf-search-item:hover {
  background: #f8fafc;
}

.uf-search-item-avatar {
  width: 44px;
  height: 44px;
  border-radius: 999px;
  background: linear-gradient(135deg, #0b3aa8 0%, #062fae 100%);
  color: #ffffff;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  font-size: 17px;
  flex-shrink: 0;
}

.uf-search-item-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.uf-search-item-icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-weight: 900;
  font-size: 18px;
}

.uf-search-item-thumb {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: var(--bg-hover);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-weight: 900;
  font-size: 16px;
  color: var(--text-secondary);
}

.uf-search-item-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.uf-search-item-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.uf-search-item-info strong {
  font-size: 14px;
  font-weight: 800;
  color: #0f172a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.uf-search-item-info span {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.uf-search-item-badge {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-secondary);
  background: var(--bg-hover);
  padding: 3px 8px;
  border-radius: 6px;
  text-transform: capitalize;
  flex-shrink: 0;
}

.uf-search-section-see-all {
  display: block;
  text-align: center;
  padding: 12px 0 0;
  margin-top: 8px;
  border-top: 1px solid var(--border-color-light);
  color: #0b3aa8;
  font-size: 13px;
  font-weight: 800;
  text-decoration: none;
  transition: color 0.15s ease;
}

.uf-search-section-see-all:hover {
  color: #062fae;
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
  background: var(--bg-hover);
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
  color: var(--text-secondary);
  font-weight: 600;
  line-height: 1.6;
}

@media (max-width: 768px) {
  .uf-search-header h1 {
    font-size: 24px;
  }

  .uf-search-section {
    padding: 18px;
  }

  .uf-search-bar-card {
    padding: 16px;
  }
}
`;
