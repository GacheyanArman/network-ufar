"use client";

import { useState, useMemo, useTransition } from "react";
import { suggestResource, requestBook, toggleSaveResource, toggleSaveReadingList } from "@/app/actions/library";

type Resource = {
  id: string;
  title: string;
  author: string | null;
  type: string;
  faculty: string | null;
  subject: string | null;
  description: string | null;
  availability: string;
  locationOrLink: string | null;
  isFeatured: boolean;
  createdAt: Date;
};

type ReadingList = {
  id: string;
  title: string;
  description: string | null;
  faculty: string | null;
  subject: string | null;
  professorOrCourse: string | null;
  createdAt: Date;
  items: any[];
};

type Props = {
  resources: Resource[];
  readingLists: ReadingList[];
  savedResourceIds: string[];
  savedListIds: string[];
  currentUserId: string;
};

const FACULTIES = [
  "All Faculties",
  "Law",
  "Finance",
  "Marketing",
  "Management",
  "Informatics",
  "French Language",
  "General Education"
];

const RESOURCE_TYPES = [
  "book", "ebook", "article", "guide", "website_link", 
  "database", "video_lecture", "official_document", 
  "erasmus_resource", "language_resource", "other"
];

function formatType(type: string) {
  return type.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
}

export default function LibraryPageClient({
  resources,
  readingLists,
  savedResourceIds: initialSavedResourceIds,
  savedListIds: initialSavedListIds,
  currentUserId
}: Props) {
  const [activeTab, setActiveTab] = useState<"catalog" | "lists" | "saved">("catalog");
  const [query, setQuery] = useState("");
  const [filterFaculty, setFilterFaculty] = useState("All Faculties");
  const [filterType, setFilterType] = useState("All Types");
  
  const [showModal, setShowModal] = useState<"request" | "suggest" | null>(null);
  const [isPending, startTransition] = useTransition();

  const [savedResources, setSavedResources] = useState<Set<string>>(new Set(initialSavedResourceIds));
  const [savedLists, setSavedLists] = useState<Set<string>>(new Set(initialSavedListIds));

  // Filtered resources
  const filteredResources = useMemo(() => {
    const q = query.toLowerCase();
    return resources.filter(r => {
      const matchQ = !q || r.title.toLowerCase().includes(q) || (r.author || "").toLowerCase().includes(q) || (r.subject || "").toLowerCase().includes(q);
      const matchF = filterFaculty === "All Faculties" || r.faculty === filterFaculty;
      const matchT = filterType === "All Types" || r.type === filterType;
      return matchQ && matchF && matchT;
    });
  }, [resources, query, filterFaculty, filterType]);

  const featuredResources = useMemo(() => filteredResources.filter(r => r.isFeatured).slice(0, 4), [filteredResources]);

  // Actions
  const handleToggleSaveResource = (id: string) => {
    startTransition(() => {
      setSavedResources(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
      });
      toggleSaveResource(id);
    });
  };

  const handleToggleSaveList = (id: string) => {
    startTransition(() => {
      setSavedLists(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
      });
      toggleSaveReadingList(id);
    });
  };

  const handleSuggest = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isPending) return;
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      await suggestResource(fd);
      setShowModal(null);
      alert("Resource suggested successfully. Awaiting moderator approval.");
    });
  };

  const handleRequest = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isPending) return;
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      await requestBook(fd);
      setShowModal(null);
      alert("Book request submitted.");
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      
      {/* Header */}
      <section className="card" style={{ padding: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <h1 style={{ margin: "0 0 6px", fontSize: "30px", fontWeight: 950, color: "var(--french-navy)" }}>🏛 UFAR Library</h1>
            <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "15px" }}>
              Find books, reading lists, academic resources and useful library information.
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button type="button" className="btn btn-secondary" style={{ fontSize: "13px" }} onClick={() => setShowModal("request")}>📖 Request a Book</button>
            <button type="button" className="btn btn-secondary" style={{ fontSize: "13px" }} onClick={() => setShowModal("suggest")}>💡 Suggest Resource</button>
          </div>
        </div>

        {/* Quick Access */}
        <div style={{ display: "flex", gap: "10px", marginTop: "20px", overflowX: "auto", paddingBottom: "4px" }}>
          {["Library Hours", "Library Rules", "Digital Resources", "Research Help", "Erasmus Resources"].map(link => (
            <div key={link} style={{ 
              background: "var(--french-blue-soft)", color: "var(--french-navy)", 
              padding: "8px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: 800,
              whiteSpace: "nowrap", cursor: "pointer"
            }}>
              {link}
            </div>
          ))}
        </div>

        {/* Search & Filters */}
        <div style={{ display: "flex", gap: "10px", marginTop: "18px", flexWrap: "wrap" }}>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search books, authors, subjects..."
            style={{ flex: 1, minWidth: "200px", height: "44px", border: "1px solid var(--border-color)", borderRadius: "12px", padding: "0 16px", fontSize: "14px", outline: "none" }}
          />
          <select
            value={filterFaculty}
            onChange={e => setFilterFaculty(e.target.value)}
            style={{ height: "44px", border: "1px solid var(--border-color)", borderRadius: "12px", padding: "0 12px", fontSize: "14px", outline: "none", background: "#fff" }}
          >
            {FACULTIES.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            style={{ height: "44px", border: "1px solid var(--border-color)", borderRadius: "12px", padding: "0 12px", fontSize: "14px", outline: "none", background: "#fff" }}
          >
            <option value="All Types">All Types</option>
            {RESOURCE_TYPES.map(t => <option key={t} value={t}>{formatType(t)}</option>)}
          </select>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "6px", marginTop: "16px", borderBottom: "1px solid var(--border-color-light)", paddingBottom: "12px" }}>
          {(["catalog", "lists", "saved"] as const).map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              style={{
                border: "none",
                background: "transparent",
                padding: "8px 16px",
                fontSize: "14px",
                fontWeight: activeTab === t ? 900 : 700,
                color: activeTab === t ? "var(--french-blue)" : "var(--text-secondary)",
                cursor: "pointer",
                borderBottom: activeTab === t ? "2px solid var(--french-blue)" : "2px solid transparent",
                marginBottom: "-13px"
              }}
            >
              {t === "catalog" ? "Resource Catalog" : t === "lists" ? "Reading Lists" : "My Saved Resources"}
            </button>
          ))}
        </div>
      </section>

      {/* ── TAB CONTENT ── */}
      
      {activeTab === "catalog" && (
        <section>
          {featuredResources.length > 0 && !query && filterFaculty === "All Faculties" && filterType === "All Types" && (
            <div style={{ marginBottom: "24px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: 900, marginBottom: "12px" }}>Featured Resources</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
                {featuredResources.map(r => (
                  <ResourceCard key={r.id} resource={r} isSaved={savedResources.has(r.id)} onToggleSave={() => handleToggleSaveResource(r.id)} />
                ))}
              </div>
            </div>
          )}

          <h2 style={{ fontSize: "18px", fontWeight: 900, marginBottom: "12px" }}>All Resources</h2>
          {filteredResources.length === 0 ? (
            <div className="card" style={{ padding: "50px 24px", textAlign: "center" }}>
              <div style={{ fontSize: "40px", opacity: 0.3, marginBottom: "10px" }}>📚</div>
              <p style={{ margin: 0, color: "var(--text-secondary)", fontWeight: 700 }}>No resources found. Try another subject or request a book.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
              {filteredResources.map(r => (
                <ResourceCard key={r.id} resource={r} isSaved={savedResources.has(r.id)} onToggleSave={() => handleToggleSaveResource(r.id)} />
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === "lists" && (
        <section>
          <h2 style={{ fontSize: "18px", fontWeight: 900, marginBottom: "12px" }}>Reading Lists</h2>
          {readingLists.length === 0 ? (
            <div className="card" style={{ padding: "50px 24px", textAlign: "center" }}>
              <div style={{ fontSize: "40px", opacity: 0.3, marginBottom: "10px" }}>📋</div>
              <p style={{ margin: 0, color: "var(--text-secondary)", fontWeight: 700 }}>No reading lists available yet.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "16px" }}>
              {readingLists.map(l => (
                <ListCard key={l.id} list={l} isSaved={savedLists.has(l.id)} onToggleSave={() => handleToggleSaveList(l.id)} />
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === "saved" && (
        <section>
          <h2 style={{ fontSize: "18px", fontWeight: 900, marginBottom: "12px" }}>My Saved Resources</h2>
          
          <h3 style={{ fontSize: "15px", fontWeight: 800, marginBottom: "8px", color: "var(--text-secondary)" }}>Resources</h3>
          {savedResources.size === 0 ? (
            <p style={{ fontSize: "14px", color: "var(--text-muted)", marginBottom: "20px" }}>You haven't saved any resources yet.</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px", marginBottom: "24px" }}>
              {resources.filter(r => savedResources.has(r.id)).map(r => (
                <ResourceCard key={r.id} resource={r} isSaved={true} onToggleSave={() => handleToggleSaveResource(r.id)} />
              ))}
            </div>
          )}

          <h3 style={{ fontSize: "15px", fontWeight: 800, marginBottom: "8px", color: "var(--text-secondary)" }}>Reading Lists</h3>
          {savedLists.size === 0 ? (
            <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>You haven't saved any reading lists yet.</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "16px" }}>
              {readingLists.filter(l => savedLists.has(l.id)).map(l => (
                <ListCard key={l.id} list={l} isSaved={true} onToggleSave={() => handleToggleSaveList(l.id)} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── MODALS ── */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }} onMouseDown={() => setShowModal(null)}>
          <div className="card" style={{ width: "100%", maxWidth: "500px", maxHeight: "90vh", overflowY: "auto", padding: "24px" }} onMouseDown={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 950 }}>{showModal === "request" ? "📖 Request a Book" : "💡 Suggest a Resource"}</h2>
              <button type="button" className="btn btn-secondary" style={{ minHeight: "34px", padding: "0 12px" }} onClick={() => setShowModal(null)}>×</button>
            </div>
            
            <form onSubmit={showModal === "request" ? handleRequest : handleSuggest} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <label>
                <FieldLabel>Title</FieldLabel>
                <FieldInput name="title" required />
              </label>

              {showModal === "request" && (
                <label>
                  <FieldLabel>Author (Optional)</FieldLabel>
                  <FieldInput name="author" />
                </label>
              )}

              {showModal === "suggest" && (
                <label>
                  <FieldLabel>Resource Type</FieldLabel>
                  <select name="type" required style={fieldStyle}>
                    {RESOURCE_TYPES.map(t => <option key={t} value={t}>{formatType(t)}</option>)}
                  </select>
                </label>
              )}

              <div style={{ display: "flex", gap: "10px" }}>
                <label style={{ flex: 1 }}>
                  <FieldLabel>Faculty</FieldLabel>
                  <select name="faculty" required style={fieldStyle}>
                    {FACULTIES.filter(f => f !== "All Faculties").map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </label>
                <label style={{ flex: 1 }}>
                  <FieldLabel>Subject</FieldLabel>
                  <FieldInput name="subject" required />
                </label>
              </div>

              {showModal === "suggest" && (
                <label>
                  <FieldLabel>Short Description / Why is it useful?</FieldLabel>
                  <textarea name="description" rows={3} style={fieldStyle}></textarea>
                </label>
              )}

              {showModal === "request" && (
                <label>
                  <FieldLabel>Why is this resource needed?</FieldLabel>
                  <textarea name="reason" required rows={3} style={fieldStyle}></textarea>
                </label>
              )}

              {showModal === "request" && (
                <label>
                  <FieldLabel>Urgency</FieldLabel>
                  <select name="urgency" required style={fieldStyle}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </label>
              )}

              <label>
                <FieldLabel>Link (Optional)</FieldLabel>
                <FieldInput name={showModal === "request" ? "link" : "locationOrLink"} type="url" placeholder="https://..." />
              </label>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={isPending}>{isPending ? "Submitting..." : "Submit"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Subcomponents
function ResourceCard({ resource, isSaved, onToggleSave }: { resource: Resource; isSaved: boolean; onToggleSave: () => void }) {
  const isAvailable = ["available_in_library", "digital_access"].includes(resource.availability);
  
  return (
    <div className="card" style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", background: "var(--bg-soft)", padding: "2px 6px", borderRadius: "4px", color: "var(--french-navy)" }}>
          {formatType(resource.type)}
        </span>
        <button type="button" onClick={onToggleSave} style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: "18px", color: isSaved ? "var(--french-gold)" : "var(--border-color)", padding: 0 }}>
          {isSaved ? "★" : "☆"}
        </button>
      </div>
      <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 900, color: "var(--text-primary)" }}>{resource.title}</h3>
      {resource.author && <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>by {resource.author}</div>}
      
      <div style={{ fontSize: "12px", color: "var(--text-muted)", display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "4px" }}>
        {resource.faculty && <span>🏛 {resource.faculty}</span>}
        {resource.subject && <span>📚 {resource.subject}</span>}
      </div>

      <p style={{ margin: "4px 0 0", fontSize: "13px", color: "var(--text-secondary)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
        {resource.description || "No description provided."}
      </p>

      <div style={{ marginTop: "auto", paddingTop: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "12px", fontWeight: 700, color: isAvailable ? "var(--success)" : "var(--warning)", display: "flex", alignItems: "center", gap: "4px" }}>
          <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: isAvailable ? "var(--success)" : "var(--warning)" }}></div>
          {formatType(resource.availability)}
        </span>
        {resource.locationOrLink && (
          <a href={resource.locationOrLink} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ padding: "4px 12px", minHeight: "28px", fontSize: "12px" }}>
            Open
          </a>
        )}
      </div>
    </div>
  );
}

function ListCard({ list, isSaved, onToggleSave }: { list: ReadingList; isSaved: boolean; onToggleSave: () => void }) {
  return (
    <div className="card" style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 900, color: "var(--text-primary)" }}>{list.title}</h3>
        <button type="button" onClick={onToggleSave} style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: "18px", color: isSaved ? "var(--french-gold)" : "var(--border-color)", padding: 0 }}>
          {isSaved ? "★" : "☆"}
        </button>
      </div>
      
      <div style={{ fontSize: "12px", color: "var(--text-muted)", display: "flex", gap: "6px", flexWrap: "wrap" }}>
        {list.faculty && <span>🏛 {list.faculty}</span>}
        {list.subject && <span>📚 {list.subject}</span>}
        {list.professorOrCourse && <span>👨‍🏫 {list.professorOrCourse}</span>}
        <span>📝 {list.items.length} items</span>
      </div>

      <p style={{ margin: "4px 0 0", fontSize: "13px", color: "var(--text-secondary)" }}>
        {list.description || "No description provided."}
      </p>
    </div>
  );
}

// Helpers
const fieldStyle: React.CSSProperties = {
  width: "100%", border: "1px solid var(--border-color)", borderRadius: "8px",
  padding: "8px 12px", fontSize: "14px", outline: "none", marginTop: "4px"
};
function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span style={{ display: "block", color: "var(--text-primary)", fontSize: "13px", fontWeight: 900 }}>{children}</span>;
}
function FieldInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} style={fieldStyle} />;
}
