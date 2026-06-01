"use client";

<<<<<<< HEAD
import { useState, useEffect, useMemo, useTransition, useCallback } from "react";
=======
import { useState, useMemo, useTransition, useCallback } from "react";
>>>>>>> bade7c6844d8ae0ad73fb233bf09d978b200e3a6
import UiIcon from "@/shared/ui/UiIcon";
import {
  toggleSaveMaterial,
  uploadMaterial,
  trackMaterialDownload,
  deleteMaterial,
} from "@/features/materials/server/actions";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
  averageRating: number;
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

type Props = {
  materials: Material[];
  openRequests: OpenRequest[];
  currentUserId: string;
  enrolledCourseCodes: string[];
  allCourses: { id: string; name: string; code: string }[];
};

const TYPES_MAP = [
  { value: "lecture_notes", label: "Lecture notes" },
  { value: "exam_prep", label: "Exam prep" },
  { value: "past_questions", label: "Homework" },
  { value: "slides", label: "Book / PDF" },
  { value: "template", label: "Template" },
  { value: "useful_link", label: "Link" },
];

const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year", "Master Students"];

const getTypeName = (type: string) => {
  switch (type) {
    case "lecture_notes": return "Lecture notes";
    case "exam_prep": return "Exam prep";
    case "past_questions": return "Homework";
    case "slides": return "Book / PDF";
    case "template": return "Template";
    case "useful_link": return "Link";
    default: return "Other";
  }
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

export default function MaterialsPageClient({
  materials: initialMaterials,
  openRequests,
  currentUserId,
  enrolledCourseCodes = [],
  allCourses = [],
}: Props) {
  const router = useRouter();
  const [materials, setMaterials] = useState<Material[]>(initialMaterials);
  const [searchQuery, setSearchQuery] = useState("");
  const [quickFilter, setQuickFilter] = useState("recently_added");
  const [activeTab, setActiveTab] = useState<"browse" | "saved" | "requests">("browse");

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
<<<<<<< HEAD

  // Lock background (body) scrolling while the upload modal is open
  useEffect(() => {
    if (!isUploadModalOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isUploadModalOpen]);
=======
>>>>>>> bade7c6844d8ae0ad73fb233bf09d978b200e3a6
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const [uploadSourceType, setUploadSourceType] = useState<"file" | "link">("file");
<<<<<<< HEAD
  const [uploadFileName, setUploadFileName] = useState("");
=======
>>>>>>> bade7c6844d8ae0ad73fb233bf09d978b200e3a6
  const [showOptionalUploadFields, setShowOptionalUploadFields] = useState(false);

  // ------------------- Filtering & Sorting -------------------
  const filteredMaterials = useMemo(() => {
    let list = materials;

    // Apply search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          (m.description && m.description.toLowerCase().includes(q)) ||
          (m.course && m.course.toLowerCase().includes(q)) ||
          (m.subject && m.subject.toLowerCase().includes(q))
      );
    }

    // Apply quick filters
    if (quickFilter === "my_courses") {
      list = list.filter((m) => m.course && enrolledCourseCodes.includes(m.course.toLowerCase()));
    } else if (quickFilter === "this_semester") {
      const fourMonthsAgo = new Date();
      fourMonthsAgo.setMonth(fourMonthsAgo.getMonth() - 4);
      list = list.filter((m) => new Date(m.createdAt) >= fourMonthsAgo);
    } else if (quickFilter === "exam_prep") {
      list = list.filter((m) => m.type === "exam_prep");
    }

    // Apply sorting
    list = [...list].sort((a, b) => {
      if (quickFilter === "most_useful") {
        return b.downloadsCount - a.downloadsCount || b.averageRating - a.averageRating;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return list;
  }, [materials, searchQuery, quickFilter, enrolledCourseCodes]);

  const displayedMaterials = useMemo(() => {
    if (activeTab === "saved") {
      return filteredMaterials.filter((m) => m.isSaved);
    }
    return filteredMaterials;
  }, [filteredMaterials, activeTab]);

  // ------------------- Handlers -------------------
  const handleToggleSave = useCallback(async (id: string, e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setMaterials((prev) =>
      prev.map((m) => (m.id === id ? { ...m, isSaved: !m.isSaved } : m))
    );
    try {
      await toggleSaveMaterial(id);
    } catch {
      // Rollback
      setMaterials((prev) =>
        prev.map((m) => (m.id === id ? { ...m, isSaved: !m.isSaved } : m))
      );
    }
  }, []);

  const handleDownload = useCallback(async (id: string, fileUrl: string | null) => {
    if (!fileUrl) return;
    try {
      const res = await trackMaterialDownload(id);
      if (res.ok && res.fileUrl) {
        window.open(res.fileUrl, "_blank");
      } else {
        window.open(fileUrl, "_blank");
      }
    } catch {
      window.open(fileUrl, "_blank");
    }
    router.refresh();
  }, [router]);

  const handleDelete = useCallback(async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this material?")) return;
    try {
      await deleteMaterial(id);
      setMaterials((prev) => prev.filter((m) => m.id !== id));
    } catch (err: any) {
      alert(err.message || "Failed to delete");
    }
  }, []);

  const handleUploadSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUploadError("");
    setIsUploading(true);

    const fd = new FormData(e.currentTarget);
    try {
      const res = await uploadMaterial(fd);
      if (res.ok) {
        setIsUploadModalOpen(false);
        router.refresh();
        // Light-weight fallback to reload parent state
        window.location.reload();
      }
    } catch (err: any) {
      setUploadError(err.message || "Failed to upload material");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="study-materials-page" style={{ maxWidth: 960, margin: "0 auto", padding: "16px 8px" }}>
      {/* Header Banner */}
      <div
        className="card"
        style={{
          padding: "24px 32px",
<<<<<<< HEAD
          color: "var(--text-primary)",
=======
          background: "linear-gradient(135deg, var(--french-navy) 0%, #1e293b 100%)",
          borderRadius: 16,
          color: "white",
>>>>>>> bade7c6844d8ae0ad73fb233bf09d978b200e3a6
          marginBottom: 24,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
<<<<<<< HEAD
          <h1 style={{ fontSize: "1.6rem", fontWeight: 800, margin: "0 0 4px", color: "var(--french-navy)" }}>
            Study Materials
          </h1>
          <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", margin: 0, maxWidth: 480 }}>
=======
          <h1 style={{ fontSize: "1.6rem", fontWeight: 800, margin: "0 0 4px", color: "white" }}>
            Study Materials
          </h1>
          <p style={{ fontSize: "0.88rem", opacity: 0.85, margin: 0, maxWidth: 480 }}>
>>>>>>> bade7c6844d8ae0ad73fb233bf09d978b200e3a6
            Share and download lecture notes, summaries, exam preparation guides, and academic files.
          </p>
        </div>
        <button
          onClick={() => {
            setUploadError("");
            setIsUploadModalOpen(true);
          }}
          className="btn btn-primary"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 20px",
            background: "var(--french-blue)",
            border: "none",
            borderRadius: 8,
            color: "white",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <UiIcon name="upload" size={16} />
          Upload Material
        </button>
      </div>

      {/* Main Tabs */}
      <div
        style={{
          display: "flex",
          gap: 8,
          borderBottom: "1px solid var(--border-color-light)",
          marginBottom: 20,
        }}
      >
        <button
          onClick={() => setActiveTab("browse")}
          style={{
            padding: "12px 18px",
            background: "none",
            border: "none",
            borderBottom: activeTab === "browse" ? "3px solid var(--french-blue)" : "3px solid transparent",
            color: activeTab === "browse" ? "var(--french-navy)" : "var(--text-secondary)",
            fontWeight: 600,
            fontSize: "0.92rem",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <UiIcon name="search" size={16} />
          Browse
        </button>
        <button
          onClick={() => setActiveTab("saved")}
          style={{
            padding: "12px 18px",
            background: "none",
            border: "none",
            borderBottom: activeTab === "saved" ? "3px solid var(--french-blue)" : "3px solid transparent",
            color: activeTab === "saved" ? "var(--french-navy)" : "var(--text-secondary)",
            fontWeight: 600,
            fontSize: "0.92rem",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <UiIcon name="bookmark" size={16} />
          Saved Files
        </button>
        {openRequests.length > 0 && (
          <button
            onClick={() => setActiveTab("requests")}
            style={{
              padding: "12px 18px",
              background: "none",
              border: "none",
              borderBottom: activeTab === "requests" ? "3px solid var(--french-blue)" : "3px solid transparent",
              color: activeTab === "requests" ? "var(--french-navy)" : "var(--text-secondary)",
              fontWeight: 600,
              fontSize: "0.92rem",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <UiIcon name="comment" size={16} />
            Requests ({openRequests.length})
          </button>
        )}
      </div>

      {activeTab !== "requests" ? (
        <>
          {/* Search bar & quick filters */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ position: "relative", width: "100%", marginBottom: 16 }}>
              <span
                style={{
                  position: "absolute",
                  left: 14,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-muted)",
                  display: "inline-flex",
                }}
              >
                <UiIcon name="search" size={18} />
              </span>
              <input
                type="text"
                placeholder="Search materials by title, description, or course code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 16px 12px 42px",
                  borderRadius: 10,
                  border: "1px solid var(--border-color)",
                  background: "var(--bg-card)",
                  color: "var(--text-primary)",
                  fontSize: "0.95rem",
                  boxShadow: "var(--shadow-inset-soft)",
                }}
              />
            </div>

            {/* Quick filter pills */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[
                { id: "recently_added", label: "Recently Added", icon: "clock" },
                { id: "my_courses", label: "My Courses", icon: "graduation" },
                { id: "this_semester", label: "This Semester", icon: "calendar" },
                { id: "exam_prep", label: "Exam Prep", icon: "file-text" },
                { id: "most_useful", label: "Most Useful", icon: "star" },
              ].map((f) => {
                const active = quickFilter === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => setQuickFilter(f.id)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "8px 14px",
                      borderRadius: 999,
                      border: "1px solid",
                      borderColor: active ? "var(--french-navy)" : "var(--border-color-light)",
                      background: active ? "var(--french-navy)" : "var(--bg-card)",
                      color: active ? "white" : "var(--text-secondary)",
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <UiIcon name={f.icon} size={14} />
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Materials Grid / List */}
          {displayedMaterials.length === 0 ? (
            <div
              className="card"
              style={{
                padding: "48px 24px",
                textAlign: "center",
                background: "var(--bg-card)",
                borderRadius: 12,
                border: "1px dashed var(--border-color)",
              }}
            >
<<<<<<< HEAD
              <div style={{ display: "flex", justifyContent: "center", color: "var(--text-muted)", opacity: 0.4, marginBottom: 12 }}>
                <UiIcon name="folder" size={48} />
              </div>
=======
              <div style={{ fontSize: "2.5rem", marginBottom: 12, opacity: 0.6 }}>📁</div>
>>>>>>> bade7c6844d8ae0ad73fb233bf09d978b200e3a6
              <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--french-navy)", margin: "0 0 6px" }}>
                {activeTab === "saved" ? "No saved materials" : "No materials found"}
              </h3>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", margin: "0 0 16px" }}>
                {activeTab === "saved"
                  ? "Files you bookmark will show up here for fast access."
                  : searchQuery
                  ? "Try adjusting your search terms or filters."
                  : "Be the first to upload study notes for your courses."}
              </p>
              {!searchQuery && activeTab !== "saved" && (
                <button
                  onClick={() => setIsUploadModalOpen(true)}
                  className="btn btn-secondary btn-sm"
                  style={{ fontWeight: 600 }}
                >
                  Upload the first material
                </button>
              )}
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))",
                gap: 16,
              }}
            >
              {displayedMaterials.map((m) => (
                <div
                  key={m.id}
                  className="card material-card"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    padding: 16,
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-color-light)",
                    borderRadius: 12,
                    boxShadow: "var(--shadow-soft)",
                    position: "relative",
                  }}
                >
                  {/* Card Header Badges */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 12,
                    }}
                  >
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {m.course && (
                        <span
                          style={{
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            background: "var(--french-blue-soft)",
                            color: "var(--french-blue)",
                            padding: "3px 8px",
                            borderRadius: 6,
                          }}
                        >
                          {m.course}
                        </span>
                      )}
                      <span
                        style={{
                          fontSize: "0.72rem",
                          fontWeight: 600,
                          background: "var(--bg-hover)",
                          color: "var(--text-secondary)",
                          padding: "3px 8px",
                          borderRadius: 6,
                        }}
                      >
                        {getTypeName(m.type)}
                      </span>
                    </div>

                    {/* Bookmark Save Button */}
                    <button
                      onClick={(e) => handleToggleSave(m.id, e)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: m.isSaved ? "var(--warning)" : "var(--text-muted)",
                        padding: 4,
                        display: "inline-flex",
                      }}
                    >
                      <UiIcon name={m.isSaved ? "star-filled" : "bookmark"} size={16} />
                    </button>
                  </div>

                  {/* Title and Description */}
                  <h3
                    style={{
                      fontSize: "0.95rem",
                      fontWeight: 700,
                      color: "var(--french-navy)",
                      margin: "0 0 6px",
                      lineHeight: 1.4,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {m.title}
                  </h3>

                  {m.description && (
                    <p
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--text-secondary)",
                        margin: "0 0 16px",
                        lineHeight: 1.5,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {m.description}
                    </p>
                  )}

                  {/* Footer Row */}
                  <div
                    style={{
                      marginTop: "auto",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingTop: 12,
                      borderTop: "1px solid var(--border-color-light)",
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 500 }}>
                        {m.ownerName || "UFAR Student"}
                      </span>
                      <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", opacity: 0.8 }}>
                        {timeAgo(m.createdAt)}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {currentUserId === m.ownerId && (
                        <button
                          onClick={(e) => handleDelete(m.id, e)}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "var(--danger)",
                            padding: 6,
                            display: "inline-flex",
                          }}
                          title="Delete file"
                        >
                          <UiIcon name="trash" size={14} />
                        </button>
                      )}
                      {m.fileUrl && (
                        <button
                          onClick={() => handleDownload(m.id, m.fileUrl)}
                          className="btn btn-sm btn-outline"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            fontSize: "0.78rem",
                            padding: "5px 10px",
                            borderRadius: 6,
                          }}
                        >
                          <UiIcon name="download" size={12} />
                          {m.type === "useful_link" ? "Open" : "Get"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* Simple Requests List Tab */
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {openRequests.map((r) => (
            <div
              key={r.id}
              className="card"
              style={{
                padding: 16,
                background: "var(--bg-card)",
                border: "1px solid var(--border-color-light)",
                borderRadius: 12,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div>
                <h4 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--french-navy)", margin: "0 0 4px" }}>
                  {r.subject} {r.materialType ? `(${getTypeName(r.materialType)})` : ""}
                </h4>
                <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", margin: "0 0 6px" }}>
                  {r.description}
                </p>
                <div style={{ display: "flex", gap: 8, fontSize: "0.72rem", color: "var(--text-muted)" }}>
                  <span>Requested by {r.requesterName}</span>
                  <span>•</span>
                  <span>{timeAgo(r.createdAt)}</span>
                </div>
              </div>
              <Link
                href={`/study-materials?request=${r.id}`}
                className="btn btn-sm btn-primary"
                onClick={() => {
                  setUploadError("");
                  setIsUploadModalOpen(true);
                }}
                style={{ fontSize: "0.78rem" }}
              >
                Upload File
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Simple Upload Modal */}
      {isUploadModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.4)",
            backdropFilter: "blur(4px)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => setIsUploadModalOpen(false)}
        >
          <form
            onSubmit={handleUploadSubmit}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-color)",
              borderRadius: 16,
              padding: 24,
              maxWidth: 480,
              width: "100%",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <h2 style={{ fontSize: "1.2rem", fontWeight: 800, margin: "0 0 18px", color: "var(--french-navy)" }}>
              Upload Study Material
            </h2>

            {uploadError && (
              <div
                style={{
                  background: "var(--danger-soft)",
                  color: "var(--danger)",
                  padding: "10px 12px",
                  borderRadius: 6,
                  fontSize: "0.82rem",
                  marginBottom: 16,
                  fontWeight: 500,
                }}
              >
                {uploadError}
              </div>
            )}

            {/* Title Field */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "var(--french-navy)", marginBottom: 6 }}>
                Title *
              </label>
              <input
                type="text"
                name="title"
                required
                placeholder="e.g. FIN-301 Midterm Summary Notes"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid var(--border-color)",
                  background: "var(--bg-card)",
                  color: "var(--text-primary)",
                  fontSize: "0.88rem",
                }}
              />
            </div>

            {/* Course Selector */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "var(--french-navy)", marginBottom: 6 }}>
                Course *
              </label>
              <select
                name="courseId"
                required
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid var(--border-color)",
                  background: "var(--bg-card)",
                  color: "var(--text-primary)",
                  fontSize: "0.88rem",
                }}
              >
                <option value="">Select course...</option>
                {allCourses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} - {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Material Type Selector */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "var(--french-navy)", marginBottom: 6 }}>
                Type *
              </label>
              <select
                name="type"
                required
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid var(--border-color)",
                  background: "var(--bg-card)",
                  color: "var(--text-primary)",
                  fontSize: "0.88rem",
                }}
              >
                {TYPES_MAP.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Source Tab Switcher: File vs Link */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "var(--french-navy)", marginBottom: 6 }}>
                Source *
              </label>
              <div style={{ display: "flex", gap: 6, background: "var(--bg-hover)", padding: 3, borderRadius: 8, marginBottom: 10 }}>
                <button
                  type="button"
                  onClick={() => setUploadSourceType("file")}
                  style={{
                    flex: 1,
                    padding: "6px 12px",
                    borderRadius: 6,
                    border: "none",
                    background: uploadSourceType === "file" ? "var(--bg-card)" : "transparent",
                    color: "var(--text-primary)",
                    fontWeight: 600,
                    fontSize: "0.82rem",
                    cursor: "pointer",
                  }}
                >
                  Upload File
                </button>
                <button
                  type="button"
                  onClick={() => setUploadSourceType("link")}
                  style={{
                    flex: 1,
                    padding: "6px 12px",
                    borderRadius: 6,
                    border: "none",
                    background: uploadSourceType === "link" ? "var(--bg-card)" : "transparent",
                    color: "var(--text-primary)",
                    fontWeight: 600,
                    fontSize: "0.82rem",
                    cursor: "pointer",
                  }}
                >
                  Provide Link
                </button>
              </div>

              {uploadSourceType === "file" ? (
<<<<<<< HEAD
                <label htmlFor="material-file-input" className="material-file-drop">
                  <UiIcon name="upload" size={26} color="var(--french-gold)" />
                  <span className="material-file-drop-title">
                    {uploadFileName || "Click to choose a file"}
                  </span>
                  <span className="material-file-drop-hint">
                    PDF, DOCX, PPTX or image files
                  </span>
                  <input
                    id="material-file-input"
                    className="material-file-input-hidden"
                    type="file"
                    name="file"
                    required
                    onChange={(e) => setUploadFileName(e.target.files?.[0]?.name ?? "")}
=======
                <input
                  type="file"
                  name="file"
                  required
>>>>>>> bade7c6844d8ae0ad73fb233bf09d978b200e3a6
                  style={{
                    fontSize: "0.85rem",
                    color: "var(--text-secondary)",
                    width: "100%",
                  }}
                />
<<<<<<< HEAD
                </label>
=======
>>>>>>> bade7c6844d8ae0ad73fb233bf09d978b200e3a6
              ) : (
                <input
                  type="url"
                  name="link"
                  required
                  placeholder="https://drive.google.com/... or any URL"
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1px solid var(--border-color)",
                    background: "var(--bg-card)",
                    color: "var(--text-primary)",
                    fontSize: "0.88rem",
                  }}
                />
              )}
            </div>

            {/* Collapsible Optional Section */}
            <div style={{ marginBottom: 20 }}>
              <button
                type="button"
                onClick={() => setShowOptionalUploadFields(!showOptionalUploadFields)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--french-blue)",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: 0,
                }}
              >
                <UiIcon name={showOptionalUploadFields ? "chevron-up" : "chevron-down"} size={14} />
                {showOptionalUploadFields ? "Hide Optional Details" : "Add Optional Details"}
              </button>

              {showOptionalUploadFields && (
                <div
                  style={{
                    marginTop: 12,
                    padding: 12,
                    background: "var(--bg-hover)",
                    borderRadius: 8,
                    border: "1px solid var(--border-color-light)",
                  }}
                >
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>
                      Description
                    </label>
                    <textarea
                      name="description"
                      rows={2}
                      placeholder="Describe what these study notes cover..."
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        borderRadius: 6,
                        border: "1px solid var(--border-color)",
                        background: "var(--bg-card)",
                        color: "var(--text-primary)",
                        fontSize: "0.82rem",
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>
                      Tags (comma-separated)
                    </label>
                    <input
                      type="text"
                      name="tags"
                      placeholder="e.g. midterm, formula-sheet"
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        borderRadius: 6,
                        border: "1px solid var(--border-color)",
                        background: "var(--bg-card)",
                        color: "var(--text-primary)",
                        fontSize: "0.82rem",
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>
                      Year
                    </label>
                    <select
                      name="year"
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        borderRadius: 6,
                        border: "1px solid var(--border-color)",
                        background: "var(--bg-card)",
                        color: "var(--text-primary)",
                        fontSize: "0.82rem",
                      }}
                    >
                      <option value="">Select year...</option>
                      {YEARS.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Buttons */}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                disabled={isUploading}
                className="btn btn-secondary"
                style={{ padding: "8px 16px", borderRadius: 8, fontSize: "0.85rem", fontWeight: 600 }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUploading}
                className="btn btn-primary"
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  background: "var(--french-blue)",
                  border: "none",
                  color: "white",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {isUploading ? (
                  <>
                    <UiIcon name="loader" size={14} className="animate-spin" />
                    Uploading...
                  </>
                ) : (
                  "Upload"
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
