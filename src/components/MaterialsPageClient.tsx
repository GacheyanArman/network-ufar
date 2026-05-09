"use client";

import { useState, useMemo, useEffect, useTransition, useCallback, useRef } from "react";
import UiIcon from "@/components/UiIcon";
import {
  getMyMaterials,
  toggleSaveMaterial,
  uploadMaterial,
  requestMaterial,
  rateMaterial,
  trackMaterialDownload,
  trackMaterialView,
  getMaterialComments,
  createMaterialComment,
  deleteMaterialComment,
  deleteMaterial,
  supportMaterialRequest,
  type MaterialSort,
} from "@/app/actions/materials";

// ---------------------------------------------------------------------------
// Types — kept in sync with the server action return shape.
// ---------------------------------------------------------------------------

type Material = {
  id: string;
  title: string;
  description: string | null;
  fileUrl: string | null;
  type: string;
  faculty: string | null;
  course: string | null;
  year: string | null;
  subject: string | null;
  professorCourse: string | null;
  isVerified: boolean;
  viewsCount: number;
  downloadsCount: number;
  helpfulCount: number;
  ratingSum: number;
  ratingCount: number;
  averageRating: number;
  myRating: number;
  isSaved: boolean;
  createdAt: Date | string;
  ownerId: string;
  ownerName?: string | null;
  ownerAvatar?: string | null;
};

type OpenRequest = {
  id: string;
  userId: string;
  faculty: string | null;
  year: string | null;
  subject: string | null;
  materialType: string | null;
  topic: string | null;
  description: string | null;
  urgency: string;
  status: string;
  supportersCount: number;
  createdAt: Date | string;
  requesterName?: string | null;
  requesterAvatar?: string | null;
  isSupportedByMe: boolean;
  isMine: boolean;
};

type MaterialComment = {
  id: string;
  content: string;
  createdAt: Date | string;
  userId: string;
  userName: string;
  userAvatar?: string | null;
};

type Props = {
  materials: Material[];
  openRequests: OpenRequest[];
  currentUserId: string;
};

// ---------------------------------------------------------------------------
// Static option lists (kept in this file because they're UI taxonomy, not
// stored data, mirroring how the previous implementation worked).
// ---------------------------------------------------------------------------

const FACULTIES = [
  "Law",
  "Finance",
  "Marketing",
  "Management",
  "Informatics",
  "French Language",
  "General Education",
];
const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year", "Master Students"];
const TYPES = [
  "lecture_notes",
  "summary",
  "slides",
  "past_questions",
  "exam_prep",
  "formula_sheet",
  "template",
  "case_study",
  "project_example",
  "cheat_sheet",
  "language_practice",
  "useful_link",
  "other",
];
const SORTS: { value: MaterialSort; label: string; icon: string }[] = [
  { value: "newest", label: "Newest", icon: "clock" },
  { value: "most_downloaded", label: "Most downloaded", icon: "download" },
  { value: "top_rated", label: "Top rated", icon: "star" },
  { value: "most_viewed", label: "Most viewed", icon: "eye" },
];

const getSubjectList = (faculty: string) => {
  switch (faculty) {
    case "Finance":
      return ["Accounting", "Corporate Finance", "Statistics", "Economics", "Business Law"];
    case "Law":
      return ["Civil Law", "Criminal Law", "Constitutional Law", "International Law", "French Law"];
    case "Marketing":
      return ["Consumer Behavior", "Digital Marketing", "Brand Management", "Market Research"];
    case "Management":
      return ["Strategy", "HR Management", "Operations", "Project Management"];
    case "Informatics":
      return ["Programming", "Databases", "Algorithms", "Web Development", "Data Analysis"];
    default:
      return [];
  }
};

const formatType = (type: string) =>
  type.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

const formatNumber = (n: number) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
};

const timeAgo = (input: Date | string) => {
  const d = typeof input === "string" ? new Date(input) : input;
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 30 * 86400) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString();
};

// ---------------------------------------------------------------------------
// StarRating — small reusable component used both in read-only and
// interactive modes.
// ---------------------------------------------------------------------------

function StarRating({
  value,
  onChange,
  size = 16,
  readOnly = false,
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
  readOnly?: boolean;
}) {
  const [hover, setHover] = useState(0);
  const display = hover || value;

  return (
    <div
      role={readOnly ? "img" : "radiogroup"}
      aria-label={readOnly ? `Rated ${value} of 5` : "Rate this material"}
      style={{ display: "inline-flex", gap: 2 }}
    >
      {[1, 2, 3, 4, 5].map((i) => {
        const active = i <= display;
        return (
          <button
            key={i}
            type="button"
            disabled={readOnly}
            onMouseEnter={() => !readOnly && setHover(i)}
            onMouseLeave={() => !readOnly && setHover(0)}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!readOnly && onChange) onChange(i);
            }}
            aria-label={`${i} star${i > 1 ? "s" : ""}`}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              cursor: readOnly ? "default" : "pointer",
              color: active ? "#f5a623" : "var(--border-color)",
              lineHeight: 0,
              transition: "color 0.15s",
            }}
          >
            <UiIcon name={active ? "star-filled" : "star"} size={size} />
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small chip used for tags on cards.
// ---------------------------------------------------------------------------

function MetaChip({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: "0.75rem",
        color: "var(--text-secondary)",
        background: "var(--bg-hover)",
        padding: "3px 8px",
        borderRadius: 6,
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
      }}
    >
      <UiIcon name={icon} size={12} />
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main page component.
// ---------------------------------------------------------------------------

export default function MaterialsPageClient({
  materials: initialMaterials,
  openRequests: initialOpenRequests,
  currentUserId,
}: Props) {
  // ------------------- Tab + filter/sort state -------------------
  const [activeTab, setActiveTab] = useState<
    "browse" | "my_materials" | "requests"
  >("browse");

  const [materials, setMaterials] = useState<Material[]>(initialMaterials);
  const [openRequests, setOpenRequests] = useState<OpenRequest[]>(initialOpenRequests);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterFaculty, setFilterFaculty] = useState("");
  const [filterCourse, setFilterCourse] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterSubject, setFilterSubject] = useState("");
  const [filterType, setFilterType] = useState("");
  const [sort, setSort] = useState<MaterialSort>("newest");
  const [filtersOpen, setFiltersOpen] = useState(false); // mobile

  const [myMaterials, setMyMaterials] = useState<{
    uploaded: any[];
    saved: any[];
    requested: any[];
  } | null>(null);
  const [loadingMy, setLoadingMy] = useState(false);

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Detail/preview drawer state
  const [activeMaterial, setActiveMaterial] = useState<Material | null>(null);

  const [, startTransition] = useTransition();

  // Lazy-load "My materials" the first time the user opens the tab. We do
  // this in the click handler rather than in an effect so React 19 doesn't
  // flag a cascading-render warning.
  const ensureMyMaterialsLoaded = useCallback(() => {
    if (myMaterials || loadingMy) return;
    setLoadingMy(true);
    getMyMaterials()
      .then((data) => setMyMaterials(data))
      .finally(() => setLoadingMy(false));
  }, [myMaterials, loadingMy]);

  const handleSelectTab = useCallback(
    (tab: "browse" | "my_materials" | "requests") => {
      setActiveTab(tab);
      if (tab === "my_materials") ensureMyMaterialsLoaded();
    },
    [ensureMyMaterialsLoaded]
  );

  // ------------------- Client-side filtering + sorting -------------------
  // We keep the SSR ordering but re-apply the same logic on the client so
  // changes to filters/sort happen instantly. The server action remains the
  // source of truth for any full reload.
  const filteredMaterials = useMemo(() => {
    let list = materials.filter((m) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const haystack = [
          m.title,
          m.description ?? "",
          m.subject ?? "",
          m.professorCourse ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (filterFaculty && m.faculty !== filterFaculty) return false;
      if (filterCourse && m.course !== filterCourse) return false;
      if (filterYear && m.year !== filterYear) return false;
      if (filterSubject && m.subject !== filterSubject) return false;
      if (filterType && m.type !== filterType) return false;
      return true;
    });

    // Mirror server `sortToOrderBy` so the client experience is consistent.
    list = [...list].sort((a, b) => {
      switch (sort) {
        case "most_downloaded":
          return b.downloadsCount - a.downloadsCount;
        case "most_viewed":
          return b.viewsCount - a.viewsCount;
        case "top_rated": {
          // Push unrated items to the bottom.
          if (a.ratingCount === 0 && b.ratingCount === 0) return 0;
          if (a.ratingCount === 0) return 1;
          if (b.ratingCount === 0) return -1;
          return b.averageRating - a.averageRating;
        }
        case "newest":
        default:
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
      }
    });

    return list;
  }, [
    materials,
    searchQuery,
    filterFaculty,
    filterCourse,
    filterYear,
    filterSubject,
    filterType,
    sort,
  ]);

  // ------------------- Mutations -------------------

  const handleToggleSave = useCallback(
    async (id: string, e?: React.MouseEvent) => {
      e?.preventDefault();
      e?.stopPropagation();
      // Optimistic flip; rollback on failure.
      setMaterials((prev) =>
        prev.map((m) => (m.id === id ? { ...m, isSaved: !m.isSaved } : m))
      );
      try {
        await toggleSaveMaterial(id);
      } catch {
        setMaterials((prev) =>
          prev.map((m) => (m.id === id ? { ...m, isSaved: !m.isSaved } : m))
        );
      }
    },
    []
  );

  const handleRate = useCallback(
    async (id: string, rating: number) => {
      // Optimistic update of average + count.
      setMaterials((prev) =>
        prev.map((m) => {
          if (m.id !== id) return m;
          const wasRated = m.myRating > 0;
          const newCount = wasRated ? m.ratingCount : m.ratingCount + 1;
          const newSum = wasRated
            ? m.ratingSum - m.myRating + rating
            : m.ratingSum + rating;
          return {
            ...m,
            myRating: rating,
            ratingCount: newCount,
            ratingSum: newSum,
            averageRating:
              newCount > 0 ? Math.round((newSum / newCount) * 10) / 10 : 0,
          };
        })
      );
      // Keep the drawer in sync if it's the same material.
      setActiveMaterial((prev) => {
        if (!prev || prev.id !== id) return prev;
        const wasRated = prev.myRating > 0;
        const newCount = wasRated ? prev.ratingCount : prev.ratingCount + 1;
        const newSum = wasRated
          ? prev.ratingSum - prev.myRating + rating
          : prev.ratingSum + rating;
        return {
          ...prev,
          myRating: rating,
          ratingCount: newCount,
          ratingSum: newSum,
          averageRating:
            newCount > 0 ? Math.round((newSum / newCount) * 10) / 10 : 0,
        };
      });
      try {
        await rateMaterial(id, rating);
      } catch (err: any) {
        alert(err.message || "Could not rate this material");
      }
    },
    []
  );

  const handleDownload = useCallback(async (m: Material) => {
    if (!m.fileUrl) return;
    // Optimistic counter bump.
    setMaterials((prev) =>
      prev.map((x) =>
        x.id === m.id ? { ...x, downloadsCount: x.downloadsCount + 1 } : x
      )
    );
    setActiveMaterial((prev) =>
      prev && prev.id === m.id
        ? { ...prev, downloadsCount: prev.downloadsCount + 1 }
        : prev
    );
    // Open in new tab while server tracks the download.
    window.open(m.fileUrl, "_blank", "noopener,noreferrer");
    startTransition(() => {
      trackMaterialDownload(m.id).catch(() => {
        /* server-side rate-limit / conflict — counter resets on next reload */
      });
    });
  }, []);

  const handleOpenDetails = useCallback(async (m: Material) => {
    setActiveMaterial(m);
    // Optimistic view bump (we only track the view server-side once).
    setMaterials((prev) =>
      prev.map((x) =>
        x.id === m.id ? { ...x, viewsCount: x.viewsCount + 1 } : x
      )
    );
    startTransition(() => {
      trackMaterialView(m.id).catch(() => {});
    });
  }, []);

  const handleDeleteMaterial = useCallback(
    async (id: string) => {
      if (!confirm("Delete this material? This cannot be undone.")) return;
      try {
        await deleteMaterial(id);
        setMaterials((prev) => prev.filter((m) => m.id !== id));
        setActiveMaterial(null);
        if (myMaterials) {
          setMyMaterials({
            ...myMaterials,
            uploaded: myMaterials.uploaded.filter((m) => m.id !== id),
            saved: myMaterials.saved.filter((m) => m.id !== id),
          });
        }
      } catch (err: any) {
        alert(err.message || "Could not delete this material");
      }
    },
    [myMaterials]
  );

  const handleSupportRequest = useCallback(async (id: string) => {
    setOpenRequests((prev) =>
      prev.map((r) =>
        r.id === id && !r.isSupportedByMe
          ? {
              ...r,
              isSupportedByMe: true,
              supportersCount: r.supportersCount + 1,
            }
          : r
      )
    );
    try {
      await supportMaterialRequest(id);
    } catch (err: any) {
      alert(err.message || "Could not support this request");
    }
  }, []);

  const handleUploadSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsUploading(true);
    try {
      const formData = new FormData(e.currentTarget);
      await uploadMaterial(formData);
      setIsUploadModalOpen(false);
      alert("Material uploaded! It will be visible after moderator approval.");
    } catch (err: any) {
      alert("Upload failed: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRequestSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsUploading(true);
    try {
      const formData = new FormData(e.currentTarget);
      await requestMaterial(formData);
      setIsRequestModalOpen(false);
      alert("Material requested! Other students can now support your request.");
    } catch (err: any) {
      alert("Request failed: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setFilterFaculty("");
    setFilterCourse("");
    setFilterYear("");
    setFilterSubject("");
    setFilterType("");
    setSort("newest");
  };

  const hasActiveFilters =
    !!(searchQuery || filterFaculty || filterCourse || filterYear || filterSubject || filterType) ||
    sort !== "newest";

  // ------------------- Render -------------------

  return (
    <div className="materials-container" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* ======================== Hero header ======================== */}
      <div
        className="card"
        style={{
          padding: "clamp(20px, 4vw, 32px)",
          background:
            "linear-gradient(135deg, var(--bg-main) 0%, var(--bg-hover) 100%)",
          borderRadius: 16,
          border: "1px solid var(--border-color)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "relative", zIndex: 1 }}>
          <h1
            style={{
              fontSize: "clamp(1.6rem, 4vw, 2.5rem)",
              marginBottom: 8,
              color: "var(--text-primary)",
            }}
          >
            Study Materials
          </h1>
          <p
            style={{
              fontSize: "clamp(0.95rem, 1.5vw, 1.1rem)",
              color: "var(--text-secondary)",
              maxWidth: 640,
              marginBottom: 20,
            }}
          >
            Notes, summaries, slides, exam prep and study resources shared by UFAR
            students — rate them, save them, ask for what you need.
          </p>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              className="btn btn-primary"
              onClick={() => setIsUploadModalOpen(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 20px",
                borderRadius: 8,
                fontWeight: 600,
              }}
            >
              <UiIcon name="upload" /> Upload material
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => setIsRequestModalOpen(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 20px",
                borderRadius: 8,
                fontWeight: 600,
              }}
            >
              <UiIcon name="plus" /> Request material
            </button>
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            right: -20,
            top: -40,
            opacity: 0.05,
            transform: "scale(2.5)",
            pointerEvents: "none",
          }}
        >
          <UiIcon name="folder" size={200} />
        </div>
      </div>

      {/* ======================== Tabs ======================== */}
      <div
        style={{
          display: "flex",
          gap: 8,
          borderBottom: "1px solid var(--border-color)",
          paddingBottom: 2,
          overflowX: "auto",
        }}
      >
        {(
          [
            { id: "browse", label: "Browse", icon: "search" },
            { id: "my_materials", label: "My materials", icon: "bookmark" },
            { id: "requests", label: `Requests (${openRequests.length})`, icon: "comment" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleSelectTab(tab.id)}
            style={{
              padding: "12px 18px",
              background: "none",
              border: "none",
              borderBottom:
                activeTab === tab.id
                  ? "3px solid var(--primary-color)"
                  : "3px solid transparent",
              color:
                activeTab === tab.id
                  ? "var(--primary-color)"
                  : "var(--text-secondary)",
              fontWeight: 600,
              fontSize: "0.95rem",
              cursor: "pointer",
              transition: "all 0.2s",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              whiteSpace: "nowrap",
            }}
          >
            <UiIcon name={tab.icon} size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ======================== Browse tab ======================== */}
      {activeTab === "browse" && (
        <div className="materials-browse-grid">
          {/* ----- Filters sidebar ----- */}
          <aside
            className={`materials-filters ${filtersOpen ? "is-open" : ""}`}
          >
            <div className="card materials-filters-card">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <h3
                  style={{
                    fontSize: "1.1rem",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    margin: 0,
                  }}
                >
                  <UiIcon name="filter" /> Filters
                </h3>
                <button
                  className="materials-filters-close"
                  onClick={() => setFiltersOpen(false)}
                  aria-label="Close filters"
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--text-secondary)",
                  }}
                >
                  <UiIcon name="x" />
                </button>
              </div>

              <div style={{ marginBottom: 16, position: "relative" }}>
                <span
                  style={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--text-secondary)",
                  }}
                >
                  <UiIcon name="search" />
                </span>
                <input
                  type="text"
                  placeholder="Title, subject, professor…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px 10px 40px",
                    borderRadius: 8,
                    border: "1px solid var(--border-color)",
                    background: "var(--bg-main)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <FilterSelect
                  label="Faculty"
                  value={filterFaculty}
                  onChange={(v) => {
                    setFilterFaculty(v);
                    setFilterSubject("");
                  }}
                  options={[{ value: "", label: "All faculties" }, ...FACULTIES.map((f) => ({ value: f, label: f }))]}
                />
                {filterFaculty && getSubjectList(filterFaculty).length > 0 && (
                  <FilterSelect
                    label="Subject"
                    value={filterSubject}
                    onChange={setFilterSubject}
                    options={[
                      { value: "", label: "All subjects" },
                      ...getSubjectList(filterFaculty).map((s) => ({ value: s, label: s })),
                    ]}
                  />
                )}
                <FilterInput
                  label="Course / code"
                  value={filterCourse}
                  onChange={setFilterCourse}
                  placeholder="e.g. FIN-201"
                />
                <FilterSelect
                  label="Year"
                  value={filterYear}
                  onChange={setFilterYear}
                  options={[{ value: "", label: "All years" }, ...YEARS.map((y) => ({ value: y, label: y }))]}
                />
                <FilterSelect
                  label="Material type"
                  value={filterType}
                  onChange={setFilterType}
                  options={[
                    { value: "", label: "All types" },
                    ...TYPES.map((t) => ({ value: t, label: formatType(t) })),
                  ]}
                />

                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--primary-color)",
                      cursor: "pointer",
                      textAlign: "left",
                      padding: 0,
                      fontWeight: 500,
                      marginTop: 4,
                    }}
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            </div>
          </aside>

          {/* ----- Results ----- */}
          <section style={{ minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <h2 style={{ fontSize: "1.2rem", fontWeight: 600, margin: 0 }}>
                  {filteredMaterials.length}{" "}
                  {filteredMaterials.length === 1 ? "result" : "results"}
                </h2>
                <button
                  className="materials-filters-toggle"
                  onClick={() => setFiltersOpen(true)}
                  style={{
                    display: "none",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1px solid var(--border-color)",
                    background: "var(--bg-main)",
                    color: "var(--text-primary)",
                    cursor: "pointer",
                  }}
                >
                  <UiIcon name="filter" size={14} /> Filters
                </button>
              </div>

              <SortDropdown sort={sort} onChange={setSort} />
            </div>

            {filteredMaterials.length === 0 ? (
              <EmptyState
                icon="folder"
                title="No materials match your filters"
                hint="Try clearing some filters or request the material you need — other students get notified and can upload it."
                actionLabel="Request material"
                onAction={() => setIsRequestModalOpen(true)}
              />
            ) : (
              <div className="materials-grid">
                {filteredMaterials.map((m) => (
                  <MaterialCard
                    key={m.id}
                    material={m}
                    onOpen={() => handleOpenDetails(m)}
                    onToggleSave={(e) => handleToggleSave(m.id, e)}
                    onDownload={() => handleDownload(m)}
                    onRate={(r) => handleRate(m.id, r)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* ======================== My materials tab ======================== */}
      {activeTab === "my_materials" && (
        <MyMaterialsView
          loading={loadingMy}
          data={myMaterials}
          onUnsave={handleToggleSave}
          onDelete={handleDeleteMaterial}
          currentUserId={currentUserId}
        />
      )}

      {/* ======================== Requests tab ======================== */}
      {activeTab === "requests" && (
        <RequestsView
          requests={openRequests}
          onSupport={handleSupportRequest}
          onCreate={() => setIsRequestModalOpen(true)}
        />
      )}

      {/* ======================== Detail drawer ======================== */}
      {activeMaterial && (
        <MaterialDetailDrawer
          material={activeMaterial}
          currentUserId={currentUserId}
          onClose={() => setActiveMaterial(null)}
          onRate={(r) => handleRate(activeMaterial.id, r)}
          onDownload={() => handleDownload(activeMaterial)}
          onToggleSave={() => handleToggleSave(activeMaterial.id)}
          onDelete={() => handleDeleteMaterial(activeMaterial.id)}
        />
      )}

      {/* ======================== Modals ======================== */}
      {isUploadModalOpen && (
        <UploadModal
          onClose={() => setIsUploadModalOpen(false)}
          onSubmit={handleUploadSubmit}
          isUploading={isUploading}
        />
      )}
      {isRequestModalOpen && (
        <RequestModal
          onClose={() => setIsRequestModalOpen(false)}
          onSubmit={handleRequestSubmit}
          isUploading={isUploading}
        />
      )}

      <style jsx>{`
        .materials-browse-grid {
          display: grid;
          grid-template-columns: 280px 1fr;
          gap: 24px;
          align-items: flex-start;
        }
        .materials-filters {
          position: sticky;
          top: 80px;
        }
        .materials-filters-card {
          padding: 20px;
          border-radius: 12px;
        }
        .materials-filters-close {
          display: none;
        }
        .materials-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
        }
        @media (max-width: 900px) {
          .materials-browse-grid {
            grid-template-columns: 1fr;
          }
          .materials-filters {
            position: fixed;
            inset: 0;
            z-index: 1100;
            background: rgba(0, 0, 0, 0.5);
            display: none;
            top: 0;
          }
          .materials-filters.is-open {
            display: block;
          }
          .materials-filters-card {
            position: absolute;
            right: 0;
            top: 0;
            bottom: 0;
            width: min(360px, 90vw);
            border-radius: 0;
            overflow-y: auto;
          }
          .materials-filters-close {
            display: inline-flex;
          }
          :global(.materials-filters-toggle) {
            display: inline-flex !important;
          }
        }
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label style={{ display: "block" }}>
      <span
        style={{
          display: "block",
          marginBottom: 6,
          fontWeight: 500,
          fontSize: "0.85rem",
          color: "var(--text-secondary)",
        }}
      >
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: "9px 10px",
          borderRadius: 8,
          border: "1px solid var(--border-color)",
          background: "var(--bg-main)",
          color: "var(--text-primary)",
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function FilterInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label style={{ display: "block" }}>
      <span
        style={{
          display: "block",
          marginBottom: 6,
          fontWeight: 500,
          fontSize: "0.85rem",
          color: "var(--text-secondary)",
        }}
      >
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%",
          padding: "9px 10px",
          borderRadius: 8,
          border: "1px solid var(--border-color)",
          background: "var(--bg-main)",
          color: "var(--text-primary)",
        }}
      />
    </label>
  );
}

function SortDropdown({
  sort,
  onChange,
}: {
  sort: MaterialSort;
  onChange: (s: MaterialSort) => void;
}) {
  const [open, setOpen] = useState(false);
  // Position computed from the trigger button's bounding rect; the menu is
  // rendered with `position: fixed` so it always sits above any parent
  // stacking context / overflow.
  const [menuRect, setMenuRect] = useState<{ top: number; right: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const current = SORTS.find((s) => s.value === sort) || SORTS[0];

  // Close on click outside / on resize / on scroll. We re-position on scroll
  // and resize so the menu stays anchored to its trigger.
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const reposition = () => {
      if (!buttonRef.current) return;
      const r = buttonRef.current.getBoundingClientRect();
      setMenuRect({ top: r.bottom + 6, right: window.innerWidth - r.right });
    };
    window.addEventListener("click", close);
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open]);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!open && buttonRef.current) {
      const r = buttonRef.current.getBoundingClientRect();
      setMenuRect({ top: r.bottom + 6, right: window.innerWidth - r.right });
    }
    setOpen((v) => !v);
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        ref={buttonRef}
        onClick={toggle}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 12px",
          borderRadius: 8,
          border: "1px solid var(--border-color)",
          background: "var(--bg-main)",
          color: "var(--text-primary)",
          cursor: "pointer",
          fontSize: "0.9rem",
        }}
      >
        <UiIcon name={current.icon} size={14} />
        {current.label}
        <UiIcon name="chevron-down" size={14} />
      </button>
      {open && menuRect && (
        <div
          // Stop click propagation so the window-level "close" handler
          // doesn't fire when interacting with the menu itself.
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "fixed",
            top: menuRect.top,
            right: menuRect.right,
            background: "var(--bg-main)",
            border: "1px solid var(--border-color)",
            borderRadius: 8,
            boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
            // Above cards / empty states (which can sit at z-index 0..50)
            // but still below modals (1100) and the detail drawer (1200).
            zIndex: 1050,
            minWidth: 200,
            overflow: "hidden",
          }}
        >
          {SORTS.map((s) => (
            <button
              key={s.value}
              onClick={() => {
                onChange(s.value);
                setOpen(false);
              }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 12px",
                background: s.value === sort ? "var(--bg-hover)" : "none",
                border: "none",
                color: "var(--text-primary)",
                cursor: "pointer",
                textAlign: "left",
                fontSize: "0.9rem",
              }}
            >
              <UiIcon name={s.icon} size={14} />
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MaterialCard({
  material: m,
  onOpen,
  onToggleSave,
  onDownload,
  onRate,
}: {
  material: Material;
  onOpen: () => void;
  onToggleSave: (e: React.MouseEvent) => void;
  onDownload: () => void;
  onRate: (r: number) => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className="card"
      style={{
        padding: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        borderRadius: 12,
        border: "1px solid var(--border-color)",
        cursor: "pointer",
        transition: "transform 0.15s, box-shadow 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-3px)";
        e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.08)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "none";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div
        style={{
          padding: "16px 18px 0",
          display: "flex",
          flexDirection: "column",
          flex: 1,
          gap: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 8,
          }}
        >
          <span
            style={{
              background: "rgba(var(--primary-rgb), 0.1)",
              color: "var(--primary-color)",
              padding: "4px 10px",
              borderRadius: 20,
              fontSize: "0.7rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            {formatType(m.type)}
          </span>
          <button
            onClick={onToggleSave}
            aria-label={m.isSaved ? "Unsave material" : "Save material"}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: m.isSaved ? "var(--primary-color)" : "var(--text-secondary)",
              transition: "color 0.2s",
              padding: 0,
              lineHeight: 0,
            }}
          >
            <UiIcon name="bookmark" size={20} />
          </button>
        </div>

        <h3
          style={{
            fontSize: "1.05rem",
            margin: 0,
            lineHeight: 1.35,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {m.title}
          {m.isVerified && (
            <span
              title="Verified by moderators"
              style={{
                color: "var(--primary-color)",
                marginLeft: 6,
                verticalAlign: "middle",
                display: "inline-block",
              }}
            >
              <UiIcon name="check-circle" size={16} />
            </span>
          )}
        </h3>

        {m.description && (
          <p
            style={{
              fontSize: "0.85rem",
              color: "var(--text-secondary)",
              margin: 0,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              minHeight: "2.4em",
            }}
          >
            {m.description}
          </p>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {m.subject && <MetaChip icon="book">{m.subject}</MetaChip>}
          {m.faculty && <MetaChip icon="building">{m.faculty}</MetaChip>}
          {m.year && <MetaChip icon="calendar">{m.year}</MetaChip>}
          {m.course && <MetaChip icon="tag">{m.course}</MetaChip>}
        </div>

        {/* Rating row */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ display: "flex", alignItems: "center", gap: 8 }}
        >
          <StarRating value={m.myRating || Math.round(m.averageRating)} onChange={onRate} />
          <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
            {m.ratingCount > 0
              ? `${m.averageRating.toFixed(1)} (${m.ratingCount})`
              : "Be the first to rate"}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          marginTop: 12,
          padding: "12px 18px",
          borderTop: "1px solid var(--border-color)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 12,
            color: "var(--text-secondary)",
            fontSize: "0.8rem",
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <UiIcon name="eye" size={14} />
            {formatNumber(m.viewsCount)}
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <UiIcon name="download" size={14} />
            {formatNumber(m.downloadsCount)}
          </span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDownload();
          }}
          className="btn btn-primary"
          style={{
            padding: "6px 12px",
            fontSize: "0.85rem",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            borderRadius: 6,
            border: "none",
            cursor: "pointer",
          }}
          disabled={!m.fileUrl}
        >
          <UiIcon name="download" size={14} /> Download
        </button>
      </div>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  hint,
  actionLabel,
  onAction,
}: {
  icon: string;
  title: string;
  hint: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div
      className="card"
      style={{
        padding: "48px 20px",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        borderRadius: 12,
        gap: 12,
      }}
    >
      <span style={{ color: "var(--border-color)" }}>
        <UiIcon name={icon} size={56} />
      </span>
      <h3 style={{ margin: 0, color: "var(--text-primary)" }}>{title}</h3>
      <p style={{ color: "var(--text-secondary)", margin: 0, maxWidth: 420 }}>{hint}</p>
      {actionLabel && onAction && (
        <button
          className="btn btn-primary"
          onClick={onAction}
          style={{ marginTop: 8 }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

// --------------------- My materials view ---------------------

function MyMaterialsView({
  loading,
  data,
  onUnsave,
  onDelete,
  currentUserId,
}: {
  loading: boolean;
  data: { uploaded: any[]; saved: any[]; requested: any[] } | null;
  onUnsave: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  currentUserId: string;
}) {
  if (loading || !data) {
    return (
      <div
        style={{
          padding: 40,
          textAlign: "center",
          color: "var(--text-secondary)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
        }}
      >
        <UiIcon name="loader" size={32} />
        Loading your materials…
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      {/* Uploaded */}
      <section>
        <h3
          style={{
            fontSize: "1.15rem",
            marginBottom: 12,
            borderBottom: "1px solid var(--border-color)",
            paddingBottom: 8,
          }}
        >
          Uploaded by me
        </h3>
        {data.uploaded.length === 0 ? (
          <EmptyState
            icon="upload"
            title="You haven't uploaded any materials yet"
            hint="Share your notes with the community — uploads go through quick moderation."
          />
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: 16,
            }}
          >
            {data.uploaded.map((m: any) => (
              <div
                key={m.id}
                className="card"
                style={{
                  padding: 16,
                  border: "1px solid var(--border-color)",
                  borderRadius: 10,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      color: "var(--text-secondary)",
                      textTransform: "uppercase",
                    }}
                  >
                    {formatType(m.type)}
                  </span>
                  <span
                    style={{
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 12,
                      background: "var(--bg-hover)",
                      color:
                        m.status === "approved"
                          ? "var(--success, #16a34a)"
                          : m.status === "rejected"
                          ? "var(--danger, #dc2626)"
                          : "var(--warning, #f59e0b)",
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    {m.status}
                  </span>
                </div>
                <h4 style={{ margin: 0, fontSize: "0.95rem" }}>{m.title}</h4>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                    color: "var(--text-secondary)",
                    fontSize: "0.78rem",
                  }}
                >
                  <span>
                    <UiIcon name="eye" size={12} /> {formatNumber(m.viewsCount ?? 0)}
                  </span>
                  <span>
                    <UiIcon name="download" size={12} />{" "}
                    {formatNumber(m.downloadsCount ?? 0)}
                  </span>
                  {m.ratingCount > 0 && (
                    <span>
                      <UiIcon name="star-filled" size={12} />{" "}
                      {m.averageRating?.toFixed(1)} ({m.ratingCount})
                    </span>
                  )}
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: 4,
                  }}
                >
                  <span
                    style={{
                      color: "var(--text-secondary)",
                      fontSize: "0.78rem",
                    }}
                  >
                    {timeAgo(m.createdAt)}
                  </span>
                  <button
                    onClick={() => onDelete(m.id)}
                    aria-label="Delete material"
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--text-secondary)",
                      padding: 0,
                    }}
                  >
                    <UiIcon name="trash" size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Saved */}
      <section>
        <h3
          style={{
            fontSize: "1.15rem",
            marginBottom: 12,
            borderBottom: "1px solid var(--border-color)",
            paddingBottom: 8,
          }}
        >
          Saved
        </h3>
        {data.saved.length === 0 ? (
          <EmptyState
            icon="bookmark"
            title="No saved materials yet"
            hint="Bookmark materials you'd like to come back to and they'll show up here."
          />
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: 16,
            }}
          >
            {data.saved.map((m: any) => (
              <div
                key={m.id}
                className="card"
                style={{
                  padding: 16,
                  border: "1px solid var(--border-color)",
                  borderRadius: 10,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <span
                    style={{
                      background: "rgba(var(--primary-rgb), 0.1)",
                      color: "var(--primary-color)",
                      padding: "3px 8px",
                      borderRadius: 12,
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                    }}
                  >
                    {formatType(m.type)}
                  </span>
                  <button
                    onClick={() => onUnsave(m.id)}
                    aria-label="Unsave material"
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--primary-color)",
                      padding: 0,
                    }}
                  >
                    <UiIcon name="bookmark" size={20} />
                  </button>
                </div>
                <h4 style={{ margin: 0, fontSize: "0.95rem" }}>{m.title}</h4>
                {m.subject && (
                  <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                    {m.subject}
                  </span>
                )}
                {m.fileUrl && (
                  <a
                    href={m.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary"
                    style={{
                      marginTop: "auto",
                      textAlign: "center",
                      padding: "8px",
                      borderRadius: 6,
                      textDecoration: "none",
                    }}
                  >
                    Open material
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* My requests */}
      <section>
        <h3
          style={{
            fontSize: "1.15rem",
            marginBottom: 12,
            borderBottom: "1px solid var(--border-color)",
            paddingBottom: 8,
          }}
        >
          My requests
        </h3>
        {data.requested.length === 0 ? (
          <EmptyState
            icon="comment"
            title="No requests yet"
            hint="Can't find what you need? Send a request and other students can support or fulfil it."
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {data.requested.map((r: any) => (
              <div
                key={r.id}
                className="card"
                style={{
                  padding: 16,
                  borderRadius: 10,
                  border: "1px solid var(--border-color)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                  }}
                >
                  <strong>{r.subject || r.topic || "Material request"}</strong>
                  <UrgencyBadge urgency={r.urgency} />
                </div>
                {r.description && (
                  <p
                    style={{
                      color: "var(--text-secondary)",
                      fontSize: "0.9rem",
                      margin: "8px 0 0",
                    }}
                  >
                    {r.description}
                  </p>
                )}
                <div
                  style={{
                    marginTop: 8,
                    display: "flex",
                    gap: 12,
                    color: "var(--text-secondary)",
                    fontSize: "0.8rem",
                    flexWrap: "wrap",
                  }}
                >
                  <span>{timeAgo(r.createdAt)}</span>
                  <span>
                    <UiIcon name="users" size={12} />{" "}
                    {r.supportersCount} supporter{r.supportersCount === 1 ? "" : "s"}
                  </span>
                  <span>
                    Status: <strong>{r.status}</strong>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// --------------------- Open requests view ---------------------

function RequestsView({
  requests,
  onSupport,
  onCreate,
}: {
  requests: OpenRequest[];
  onSupport: (id: string) => Promise<void>;
  onCreate: () => void;
}) {
  if (requests.length === 0) {
    return (
      <EmptyState
        icon="comment"
        title="No open material requests"
        hint="Be the first to ask the community for the materials you need."
        actionLabel="Request material"
        onAction={onCreate}
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {requests.map((r) => (
        <div
          key={r.id}
          className="card"
          style={{
            padding: 16,
            borderRadius: 12,
            border: "1px solid var(--border-color)",
            display: "flex",
            gap: 16,
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: 1, minWidth: 240 }}>
            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <strong style={{ fontSize: "1rem" }}>
                {r.subject || r.topic || "Material request"}
              </strong>
              <UrgencyBadge urgency={r.urgency} />
              {r.materialType && (
                <span
                  style={{
                    fontSize: "0.7rem",
                    background: "var(--bg-hover)",
                    color: "var(--text-secondary)",
                    padding: "2px 8px",
                    borderRadius: 12,
                    textTransform: "uppercase",
                    fontWeight: 600,
                  }}
                >
                  {formatType(r.materialType)}
                </span>
              )}
            </div>
            {r.description && (
              <p
                style={{
                  margin: "6px 0 0",
                  fontSize: "0.9rem",
                  color: "var(--text-secondary)",
                }}
              >
                {r.description}
              </p>
            )}
            <div
              style={{
                marginTop: 8,
                color: "var(--text-secondary)",
                fontSize: "0.8rem",
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <span>by {r.requesterName || "Unknown"}</span>
              <span>{timeAgo(r.createdAt)}</span>
              {r.faculty && <span>{r.faculty}</span>}
              {r.year && <span>{r.year}</span>}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 8,
              minWidth: 160,
            }}
          >
            <span
              style={{
                fontSize: "0.85rem",
                color: "var(--text-secondary)",
              }}
            >
              <UiIcon name="users" size={14} /> {r.supportersCount} student
              {r.supportersCount === 1 ? "" : "s"} need this
            </span>
            <button
              onClick={() => onSupport(r.id)}
              disabled={r.isSupportedByMe || r.isMine}
              className="btn btn-primary"
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                border: "none",
                cursor:
                  r.isSupportedByMe || r.isMine ? "default" : "pointer",
                opacity: r.isSupportedByMe || r.isMine ? 0.6 : 1,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <UiIcon name="thumbs-up" size={14} />
              {r.isMine
                ? "Your request"
                : r.isSupportedByMe
                ? "Supported"
                : "I need this too"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function UrgencyBadge({ urgency }: { urgency: string }) {
  const palette: Record<string, { bg: string; color: string }> = {
    high: { bg: "rgba(220, 38, 38, 0.12)", color: "#dc2626" },
    medium: { bg: "rgba(245, 158, 11, 0.12)", color: "#b45309" },
    low: { bg: "rgba(22, 163, 74, 0.12)", color: "#16a34a" },
  };
  const p = palette[urgency] || palette.medium;
  return (
    <span
      style={{
        background: p.bg,
        color: p.color,
        padding: "2px 8px",
        borderRadius: 12,
        fontSize: "0.7rem",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: 0.5,
      }}
    >
      {urgency}
    </span>
  );
}

// --------------------- Detail drawer (with comments) ---------------------

function MaterialDetailDrawer({
  material,
  currentUserId,
  onClose,
  onRate,
  onDownload,
  onToggleSave,
  onDelete,
}: {
  material: Material;
  currentUserId: string;
  onClose: () => void;
  onRate: (r: number) => void;
  onDownload: () => void;
  onToggleSave: () => void;
  onDelete: () => void;
}) {
  // `comments === null` means "not yet loaded" — we don't keep a separate
  // loading flag so we don't have to call setState in an effect (React 19
  // strict rule).
  const [comments, setComments] = useState<MaterialComment[] | null>(null);
  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);
  const loading = comments === null;

  // Load comments lazily on open. Only setState happens inside the async
  // callback, never synchronously in the effect body.
  useEffect(() => {
    let alive = true;
    getMaterialComments(material.id).then((data) => {
      if (alive) setComments((data as any) ?? []);
    });
    return () => {
      alive = false;
    };
  }, [material.id]);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = newComment.trim();
    if (!content) return;
    setPosting(true);
    try {
      const res = await createMaterialComment(material.id, content);
      // Best-effort hydrate the new comment so the user sees it immediately.
      setComments((prev) => [
        {
          id: res.id,
          content,
          createdAt: res.createdAt as unknown as string,
          userId: currentUserId,
          userName: "You",
        },
        ...(prev ?? []),
      ]);
      setNewComment("");
    } catch (err: any) {
      alert(err.message || "Could not post comment");
    } finally {
      setPosting(false);
    }
  };

  const handleDeleteComment = async (id: string) => {
    if (!confirm("Delete this comment?")) return;
    try {
      await deleteMaterialComment(id);
      setComments((prev) => (prev ? prev.filter((c) => c.id !== id) : prev));
    } catch (err: any) {
      alert(err.message || "Could not delete comment");
    }
  };

  const isOwner = material.ownerId === currentUserId;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        zIndex: 1200,
        display: "flex",
        justifyContent: "flex-end",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="card"
        style={{
          width: "min(540px, 100%)",
          height: "100%",
          background: "var(--bg-main)",
          borderRadius: 0,
          padding: 0,
          display: "flex",
          flexDirection: "column",
          borderLeft: "1px solid var(--border-color)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--border-color)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span
            style={{
              background: "rgba(var(--primary-rgb), 0.1)",
              color: "var(--primary-color)",
              padding: "4px 10px",
              borderRadius: 20,
              fontSize: "0.7rem",
              fontWeight: 700,
              textTransform: "uppercase",
            }}
          >
            {formatType(material.type)}
          </span>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "1.5rem",
              color: "var(--text-secondary)",
            }}
          >
            <UiIcon name="x" />
          </button>
        </div>

        <div
          style={{
            padding: 20,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 16,
            flex: 1,
          }}
        >
          <div>
            <h2 style={{ marginBottom: 6, fontSize: "1.4rem" }}>
              {material.title}
              {material.isVerified && (
                <span
                  title="Verified by moderators"
                  style={{
                    color: "var(--primary-color)",
                    marginLeft: 8,
                    verticalAlign: "middle",
                    display: "inline-block",
                  }}
                >
                  <UiIcon name="check-circle" size={18} />
                </span>
              )}
            </h2>
            {material.description && (
              <p
                style={{
                  color: "var(--text-secondary)",
                  margin: 0,
                  fontSize: "0.95rem",
                  lineHeight: 1.5,
                }}
              >
                {material.description}
              </p>
            )}
          </div>

          {/* Stats row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 12,
            }}
          >
            <Stat
              icon="eye"
              label="Views"
              value={formatNumber(material.viewsCount)}
            />
            <Stat
              icon="download"
              label="Downloads"
              value={formatNumber(material.downloadsCount)}
            />
            <Stat
              icon="star-filled"
              label="Avg rating"
              value={
                material.ratingCount > 0
                  ? `${material.averageRating.toFixed(1)} (${material.ratingCount})`
                  : "—"
              }
            />
          </div>

          {/* Meta */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {material.subject && <MetaChip icon="book">{material.subject}</MetaChip>}
            {material.faculty && <MetaChip icon="building">{material.faculty}</MetaChip>}
            {material.year && <MetaChip icon="calendar">{material.year}</MetaChip>}
            {material.course && <MetaChip icon="tag">{material.course}</MetaChip>}
            {material.professorCourse && (
              <MetaChip icon="user">{material.professorCourse}</MetaChip>
            )}
          </div>

          {/* Rating block */}
          <div
            style={{
              padding: 12,
              borderRadius: 10,
              border: "1px solid var(--border-color)",
              background: "var(--bg-hover)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <span style={{ fontWeight: 600 }}>Your rating:</span>
              <StarRating value={material.myRating} onChange={onRate} size={20} />
              <span
                style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}
              >
                {material.myRating
                  ? `You rated this ${material.myRating}/5`
                  : "Tap a star to rate"}
              </span>
            </div>
          </div>

          {/* Actions row */}
          <div
            style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}
          >
            <button
              className="btn btn-primary"
              onClick={onDownload}
              disabled={!material.fileUrl}
              style={{
                padding: "10px 16px",
                borderRadius: 8,
                border: "none",
                cursor: material.fileUrl ? "pointer" : "not-allowed",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <UiIcon name="download" size={16} /> Download
            </button>
            <button
              onClick={onToggleSave}
              className="btn btn-secondary"
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                color: material.isSaved ? "var(--primary-color)" : undefined,
              }}
            >
              <UiIcon name="bookmark" size={16} />
              {material.isSaved ? "Saved" : "Save"}
            </button>
            {isOwner && (
              <button
                onClick={onDelete}
                style={{
                  marginLeft: "auto",
                  padding: "10px 12px",
                  background: "none",
                  border: "1px solid var(--border-color)",
                  color: "var(--text-secondary)",
                  borderRadius: 8,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <UiIcon name="trash" size={14} /> Delete
              </button>
            )}
          </div>

          {/* Comments */}
          <section>
            <h3
              style={{
                fontSize: "1rem",
                marginTop: 8,
                marginBottom: 8,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <UiIcon name="comment" size={16} />
              Comments {comments ? `(${comments.length})` : ""}
            </h3>

            <form
              onSubmit={handleSubmitComment}
              style={{ display: "flex", gap: 8, marginBottom: 12 }}
            >
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Leave a comment…"
                maxLength={1000}
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid var(--border-color)",
                  background: "var(--bg-main)",
                  color: "var(--text-primary)",
                }}
              />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={posting || !newComment.trim()}
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "none",
                  cursor:
                    posting || !newComment.trim() ? "default" : "pointer",
                  opacity: posting || !newComment.trim() ? 0.6 : 1,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <UiIcon name="send" size={14} />
                Send
              </button>
            </form>

            {loading ? (
              <div
                style={{
                  textAlign: "center",
                  color: "var(--text-secondary)",
                  padding: "20px 0",
                }}
              >
                Loading comments…
              </div>
            ) : comments && comments.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {comments.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "flex-start",
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background: "var(--bg-hover)",
                        backgroundImage: c.userAvatar
                          ? `url(${c.userAvatar})`
                          : undefined,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {!c.userAvatar && <UiIcon name="user" size={16} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <strong style={{ fontSize: "0.9rem" }}>
                          {c.userName || "User"}
                        </strong>
                        <span
                          style={{
                            color: "var(--text-secondary)",
                            fontSize: "0.78rem",
                          }}
                        >
                          {timeAgo(c.createdAt)}
                        </span>
                        {(c.userId === currentUserId || isOwner) && (
                          <button
                            onClick={() => handleDeleteComment(c.id)}
                            aria-label="Delete comment"
                            style={{
                              marginLeft: "auto",
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: "var(--text-secondary)",
                              padding: 0,
                            }}
                          >
                            <UiIcon name="trash" size={14} />
                          </button>
                        )}
                      </div>
                      <p
                        style={{
                          margin: "2px 0 0",
                          fontSize: "0.9rem",
                          color: "var(--text-primary)",
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                        }}
                      >
                        {c.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p
                style={{
                  color: "var(--text-secondary)",
                  textAlign: "center",
                  padding: "20px 0",
                  fontSize: "0.9rem",
                }}
              >
                No comments yet — be the first to share feedback.
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        background: "var(--bg-hover)",
        borderRadius: 10,
        padding: 10,
        textAlign: "center",
      }}
    >
      <div
        style={{
          color: "var(--text-secondary)",
          fontSize: "0.75rem",
          textTransform: "uppercase",
          letterSpacing: 0.4,
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          justifyContent: "center",
        }}
      >
        <UiIcon name={icon} size={12} /> {label}
      </div>
      <div style={{ marginTop: 4, fontSize: "1rem", fontWeight: 700 }}>
        {value}
      </div>
    </div>
  );
}

// --------------------- Modals ---------------------

function ModalShell({
  title,
  children,
  onClose,
  maxWidth = 600,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  maxWidth?: number;
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 1100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="card"
        style={{
          width: "100%",
          maxWidth,
          maxHeight: "90vh",
          overflowY: "auto",
          padding: 24,
          borderRadius: 14,
          background: "var(--bg-main)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <h2 style={{ fontSize: "1.3rem", margin: 0 }}>{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "1.5rem",
              color: "var(--text-secondary)",
            }}
          >
            <UiIcon name="x" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function UploadModal({
  onClose,
  onSubmit,
  isUploading,
}: {
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isUploading: boolean;
}) {
  const [faculty, setFaculty] = useState("");
  return (
    <ModalShell title="Upload study material" onClose={onClose}>
      <form
        onSubmit={onSubmit}
        style={{ display: "flex", flexDirection: "column", gap: 14 }}
      >
        <Field label="Title *">
          <input
            type="text"
            name="title"
            required
            placeholder="e.g. Accounting midterm summary"
            style={inputStyle}
          />
        </Field>

        <div style={twoColStyle}>
          <Field label="Faculty">
            <select
              name="faculty"
              value={faculty}
              onChange={(e) => setFaculty(e.target.value)}
              style={inputStyle}
            >
              <option value="">Select faculty</option>
              {FACULTIES.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Year">
            <select name="year" style={inputStyle}>
              <option value="">Select year</option>
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div style={twoColStyle}>
          <Field label="Material type *">
            <select name="type" required style={inputStyle}>
              <option value="">Select type</option>
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {formatType(t)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Subject">
            {faculty && getSubjectList(faculty).length > 0 ? (
              <select name="subject" style={inputStyle}>
                <option value="">Select subject</option>
                {getSubjectList(faculty).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                name="subject"
                placeholder="e.g. Corporate Finance"
                style={inputStyle}
              />
            )}
          </Field>
        </div>

        <div style={twoColStyle}>
          <Field label="Course / code">
            <input
              type="text"
              name="course"
              placeholder="e.g. FIN-201"
              style={inputStyle}
            />
          </Field>
          <Field label="Professor / lecture series">
            <input
              type="text"
              name="professorCourse"
              placeholder="e.g. Prof. Petrosyan — Microeconomics"
              style={inputStyle}
            />
          </Field>
        </div>

        <Field label="Description">
          <textarea
            name="description"
            rows={3}
            placeholder="Brief description of what this material contains…"
            style={{ ...inputStyle, resize: "none" }}
          />
        </Field>

        <Field label="File *">
          <input
            type="file"
            name="file"
            required
            style={{
              ...inputStyle,
              border: "1px dashed var(--primary-color)",
              background: "rgba(var(--primary-rgb), 0.05)",
            }}
          />
        </Field>

        <label
          style={{
            background: "rgba(var(--warning-rgb, 245, 158, 11), 0.1)",
            padding: 12,
            borderRadius: 8,
            display: "flex",
            gap: 10,
            alignItems: "flex-start",
            fontSize: "0.85rem",
            color: "var(--text-primary)",
            lineHeight: 1.4,
          }}
        >
          <input type="checkbox" required style={{ marginTop: 4 }} />
          <span>
            I confirm this material does not violate exam rules, copyright or
            UFAR academic policies.
          </span>
        </label>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            marginTop: 8,
          }}
        >
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            style={{ padding: "10px 16px", borderRadius: 8 }}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isUploading}
            style={{
              padding: "10px 16px",
              borderRadius: 8,
              border: "none",
              cursor: isUploading ? "default" : "pointer",
              opacity: isUploading ? 0.6 : 1,
            }}
          >
            {isUploading ? "Uploading…" : "Submit for moderation"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function RequestModal({
  onClose,
  onSubmit,
  isUploading,
}: {
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isUploading: boolean;
}) {
  return (
    <ModalShell title="Request material" onClose={onClose} maxWidth={520}>
      <form
        onSubmit={onSubmit}
        style={{ display: "flex", flexDirection: "column", gap: 14 }}
      >
        <Field label="Subject / topic *">
          <input
            type="text"
            name="subject"
            required
            placeholder="e.g. Civil Law — Spring midterm notes"
            style={inputStyle}
          />
        </Field>

        <div style={twoColStyle}>
          <Field label="Faculty">
            <select name="faculty" style={inputStyle}>
              <option value="">Any faculty</option>
              {FACULTIES.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Year">
            <select name="year" style={inputStyle}>
              <option value="">Any year</option>
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Material type">
          <select name="materialType" style={inputStyle}>
            <option value="">Any</option>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {formatType(t)}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Urgency">
          <select name="urgency" defaultValue="medium" style={inputStyle}>
            <option value="low">Low — whenever possible</option>
            <option value="medium">Medium — within a few weeks</option>
            <option value="high">High — exam is coming soon</option>
          </select>
        </Field>

        <Field label="Description">
          <textarea
            name="description"
            rows={3}
            placeholder="What exactly do you need? Topics, language, year of exam, etc."
            style={{ ...inputStyle, resize: "none" }}
          />
        </Field>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            marginTop: 4,
          }}
        >
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            style={{ padding: "10px 16px", borderRadius: 8 }}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isUploading}
            style={{
              padding: "10px 16px",
              borderRadius: 8,
              border: "none",
              cursor: isUploading ? "default" : "pointer",
              opacity: isUploading ? 0.6 : 1,
            }}
          >
            {isUploading ? "Submitting…" : "Submit request"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: "block" }}>
      <span style={{ display: "block", marginBottom: 6, fontWeight: 500 }}>
        {label}
      </span>
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid var(--border-color)",
  background: "var(--bg-main)",
  color: "var(--text-primary)",
};

const twoColStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 14,
};
