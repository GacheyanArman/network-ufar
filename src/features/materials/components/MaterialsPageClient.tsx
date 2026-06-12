"use client";

import * as React from "react";
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import UiIcon from "@/shared/ui/UiIcon";
import {
  toggleSaveMaterial,
  uploadMaterial,
  trackMaterialDownload,
  trackMaterialView,
  deleteMaterial,
  rateMaterial,
  getMaterialComments,
  createMaterialComment,
  deleteMaterialComment,
  requestMaterial,
  supportMaterialRequest,
} from "@/features/materials/server/actions";
import styles from "./MaterialsPageClient.module.css";

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
  userName?: string | null;
  userAvatar?: string | null;
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
  { value: "summary", label: "Summary" },
  { value: "slides", label: "Slides" },
  { value: "past_questions", label: "Past exams" },
  { value: "exam_prep", label: "Exam prep" },
  { value: "template", label: "Template" },
  { value: "project_example", label: "Project example" },
  { value: "useful_link", label: "Link" },
];

const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year", "Master Students"];
const URGENCIES = ["low", "medium", "high"];

const getTypeName = (type: string) => {
  const found = TYPES_MAP.find((t) => t.value === type);
  return found ? found.label : "Other";
};

const getTypeIcon = (type: string) => {
  switch (type) {
    case "lecture_notes":
    case "summary":
      return "file-text";
    case "exam_prep":
      return "book-open";
    case "past_questions":
      return "file-text";
    case "slides":
      return "file-pdf";
    case "template":
    case "project_example":
      return "file";
    case "useful_link":
      return "share";
    default:
      return "file";
  }
};

const timeAgo = (input: Date | string) => {
  const d = typeof input === "string" ? new Date(input) : input;
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return Math.floor(diff / 60) + "m ago";
  if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
  if (diff < 30 * 86400) return Math.floor(diff / 86400) + "d ago";
  return d.toLocaleDateString();
};

/* ------------------------------------------------------------------ */
/* Rating stars                                                        */
/* ------------------------------------------------------------------ */
function RatingStars({
  myRating,
  average,
  count,
  onRate,
}: {
  myRating: number;
  average: number;
  count: number;
  onRate: (rating: number) => void;
}) {
  const [hover, setHover] = useState(0);
  const display = hover || myRating || Math.round(average);
  return (
    <div className={styles.rating}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={styles.starBtn}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRate(n);
          }}
          title={"Rate " + n + " / 5"}
        >
          <UiIcon name={n <= display ? "star-filled" : "star"} size={15} />
        </button>
      ))}
      <span className={styles.ratingValue}>
        {count > 0 ? average.toFixed(1) + " (" + count + ")" : "No ratings"}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Material card                                                       */
/* ------------------------------------------------------------------ */
function MaterialCard({
  m,
  currentUserId,
  onToggleSave,
  onDelete,
  onDownload,
  onRate,
}: {
  m: Material;
  currentUserId: string;
  onToggleSave: (id: string, e: React.MouseEvent) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  onDownload: (m: Material) => void;
  onRate: (id: string, rating: number) => void;
}) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<MaterialComment[] | null>(null);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);
  const viewedRef = useRef(false);

  const toggleComments = useCallback(async () => {
    const next = !commentsOpen;
    setCommentsOpen(next);
    if (next) {
      if (!viewedRef.current) {
        viewedRef.current = true;
        trackMaterialView(m.id).catch(() => {});
      }
      if (comments === null) {
        setLoadingComments(true);
        try {
          const rows = (await getMaterialComments(m.id)) as MaterialComment[];
          setComments(rows);
        } catch {
          setComments([]);
        } finally {
          setLoadingComments(false);
        }
      }
    }
  }, [commentsOpen, comments, m.id]);

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = newComment.trim();
    if (!content || posting) return;
    setPosting(true);
    try {
      const res = await createMaterialComment(m.id, content);
      setComments((prev) => [
        {
          id: res.id,
          content,
          createdAt: res.createdAt,
          userId: currentUserId,
          userName: "You",
          userAvatar: null,
        },
        ...(prev || []),
      ]);
      setNewComment("");
    } catch (err: any) {
      alert(err?.message || "Failed to post comment");
    } finally {
      setPosting(false);
    }
  };

  const removeComment = async (commentId: string) => {
    if (!confirm("Delete this comment?")) return;
    try {
      await deleteMaterialComment(commentId);
      setComments((prev) => (prev || []).filter((c) => c.id !== commentId));
    } catch (err: any) {
      alert(err?.message || "Failed to delete comment");
    }
  };

  return (
    <div className={"card " + styles.card}>
      {/* Header: badges + save */}
      <div className={styles.cardHead}>
        <div className={styles.badges}>
          <span className={styles.typeIcon}>
            <UiIcon name={getTypeIcon(m.type)} size={18} />
          </span>
          {m.course && <span className={styles.badge}>{m.course}</span>}
          <span className={styles.badge + " " + styles.badgeType}>
            {getTypeName(m.type)}
          </span>
          {m.isVerified && (
            <span className={styles.typeIcon} title="Verified">
              <UiIcon name="shield-check" size={15} />
            </span>
          )}
        </div>
        <button
          className={
            styles.saveBtn + (m.isSaved ? " " + styles.saveBtnActive : "")
          }
          onClick={(e) => onToggleSave(m.id, e)}
          title={m.isSaved ? "Remove from saved" : "Save"}
        >
          <UiIcon name="bookmark" size={16} />
        </button>
      </div>

      {/* Title + description */}
      <h3 className={styles.title}>{m.title}</h3>
      {m.description && <p className={styles.desc}>{m.description}</p>}

      {/* Metadata */}
      {(m.subject || m.year || m.professorCourse) && (
        <div className={styles.meta}>
          {m.subject && (
            <span className={styles.metaItem}>
              <UiIcon name="book" size={12} /> {m.subject}
            </span>
          )}
          {m.year && (
            <span className={styles.metaItem}>
              <UiIcon name="graduation" size={12} /> {m.year}
            </span>
          )}
          {m.professorCourse && (
            <span className={styles.metaItem}>
              <UiIcon name="user-tie" size={12} /> {m.professorCourse}
            </span>
          )}
        </div>
      )}

      {/* Stats: rating + views + downloads + comments toggle */}
      <div className={styles.stats}>
        <RatingStars
          myRating={m.myRating}
          average={m.averageRating}
          count={m.ratingCount}
          onRate={(r) => onRate(m.id, r)}
        />
        <span className={styles.stat} title="Views">
          <UiIcon name="eye" size={14} /> {m.viewsCount}
        </span>
        <span className={styles.stat} title="Downloads">
          <UiIcon name="download" size={14} /> {m.downloadsCount}
        </span>
        <button className={styles.statBtn} onClick={toggleComments}>
          <UiIcon name="comment" size={14} /> Comments
          {comments ? " (" + comments.length + ")" : ""}
        </button>
      </div>

      {/* Footer: owner + actions */}
      <div className={styles.footer}>
        <div className={styles.owner}>
          {m.ownerAvatar ? (
            <Image
              className={styles.ownerAvatar}
              src={m.ownerAvatar}
              alt=""
              width={32}
              height={32}
            />
          ) : (
            <span className={styles.ownerAvatarBlank}>
              <UiIcon name="user" size={14} />
            </span>
          )}
          <div className={styles.ownerText}>
            <span className={styles.ownerName}>
              {m.ownerName || "UFAR Student"}
            </span>
            <span className={styles.time}>{timeAgo(m.createdAt)}</span>
          </div>
        </div>
        <div className={styles.actions}>
          {currentUserId === m.ownerId && (
            <button
              className={styles.iconBtn + " " + styles.dangerBtn}
              onClick={(e) => onDelete(m.id, e)}
              title="Delete"
            >
              <UiIcon name="trash" size={14} />
            </button>
          )}
          {m.fileUrl && (
            <button
              className="btn btn-sm btn-primary"
              onClick={() => onDownload(m)}
            >
              <UiIcon
                name={m.type === "useful_link" ? "share" : "download"}
                size={13}
              />
              {m.type === "useful_link" ? "Open" : "Get"}
            </button>
          )}
        </div>
      </div>

      {/* Comments */}
      {commentsOpen && (
        <div className={styles.commentsWrap}>
          <form className={styles.commentForm} onSubmit={submitComment}>
            <textarea
              className={styles.commentInput}
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={1}
            />
            <button
              type="submit"
              className="btn btn-sm btn-primary"
              disabled={posting || !newComment.trim()}
            >
              <UiIcon name="send" size={13} />
            </button>
          </form>

          {loadingComments ? (
            <p className={styles.commentEmpty}>Loading comments...</p>
          ) : comments && comments.length > 0 ? (
            <div className={styles.commentList}>
              {comments.map((c) => (
                <div key={c.id} className={styles.commentItem}>
                  {c.userAvatar ? (
                    <Image
                      className={styles.commentAvatar}
                      src={c.userAvatar}
                      alt=""
                      width={28}
                      height={28}
                    />
                  ) : (
                    <span className={styles.commentAvatarBlank}>
                      <UiIcon name="user" size={14} />
                    </span>
                  )}
                  <div className={styles.commentBody}>
                    <div className={styles.commentTop}>
                      <span className={styles.commentName}>
                        {c.userName || "UFAR Student"}
                      </span>
                      <span className={styles.commentTime}>
                        {timeAgo(c.createdAt)}
                      </span>
                      {c.userId === currentUserId && (
                        <button
                          className={styles.commentDelete}
                          onClick={() => removeComment(c.id)}
                          title="Delete comment"
                        >
                          <UiIcon name="trash" size={12} />
                        </button>
                      )}
                    </div>
                    <p className={styles.commentText}>{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className={styles.commentEmpty}>
              No comments yet. Be the first to ask or share something.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */
export default function MaterialsPageClient({
  materials: initialMaterials,
  openRequests: initialRequests,
  currentUserId,
  enrolledCourseCodes = [],
  allCourses = [],
}: Props) {
  const router = useRouter();
  const [materials, setMaterials] = useState<Material[]>(initialMaterials);
  const [requests, setRequests] = useState<OpenRequest[]>(initialRequests);
  const [searchQuery, setSearchQuery] = useState("");
  const [quickFilter, setQuickFilter] = useState("latest");
  const [courseFilter, setCourseFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [activeTab, setActiveTab] = useState<"browse" | "saved" | "requests">(
    "browse"
  );

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [requestError, setRequestError] = useState("");

  const [uploadSourceType, setUploadSourceType] = useState<"file" | "link">(
    "file"
  );
  const [showOptionalUploadFields, setShowOptionalUploadFields] =
    useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const modalFileInputRef = useRef<HTMLInputElement>(null);

  // Lock body scroll when any modal is open
  useEffect(() => {
    const open = isUploadModalOpen || isRequestModalOpen;
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isUploadModalOpen, isRequestModalOpen]);

  // ------------------- Filtering & sorting -------------------
  const displayedMaterials = useMemo(() => {
    let list = materials;

    if (activeTab === "saved") {
      list = list.filter((m) => m.isSaved);
    }

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

    if (courseFilter) {
      list = list.filter(
        (m) => m.course && m.course.toLowerCase() === courseFilter.toLowerCase()
      );
    }

    if (typeFilter) {
      list = list.filter((m) => m.type === typeFilter);
    }

    if (quickFilter === "my_courses") {
      list = list.filter(
        (m) => m.course && enrolledCourseCodes.includes(m.course.toLowerCase())
      );
    } else if (quickFilter === "verified") {
      list = list.filter((m) => m.isVerified);
    }

    list = [...list].sort((a, b) => {
      if (quickFilter === "popular") {
        return (
          b.downloadsCount - a.downloadsCount ||
          b.averageRating - a.averageRating
        );
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return list;
  }, [
    materials,
    searchQuery,
    quickFilter,
    courseFilter,
    typeFilter,
    enrolledCourseCodes,
    activeTab,
  ]);

  // ------------------- Handlers -------------------
  const handleToggleSave = useCallback(
    async (id: string, e?: React.MouseEvent) => {
      e?.preventDefault();
      e?.stopPropagation();
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

  const handleRate = useCallback(async (id: string, rating: number) => {
    let rollback: Material | null = null;
    setMaterials((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m;
        rollback = m;
        const hadRating = m.myRating > 0;
        const newSum = hadRating
          ? m.ratingSum - m.myRating + rating
          : m.ratingSum + rating;
        const newCount = hadRating ? m.ratingCount : m.ratingCount + 1;
        const newAvg =
          newCount > 0 ? Math.round((newSum / newCount) * 10) / 10 : 0;
        return {
          ...m,
          myRating: rating,
          ratingSum: newSum,
          ratingCount: newCount,
          averageRating: newAvg,
        };
      })
    );
    try {
      await rateMaterial(id, rating);
    } catch (err: any) {
      if (rollback) {
        setMaterials((prev) =>
          prev.map((m) => (m.id === id ? (rollback as Material) : m))
        );
      }
      alert(err?.message || "Failed to rate");
    }
  }, []);

  const handleDownload = useCallback(async (m: Material) => {
    if (!m.fileUrl) return;
    setMaterials((prev) =>
      prev.map((x) =>
        x.id === m.id ? { ...x, downloadsCount: x.downloadsCount + 1 } : x
      )
    );
    try {
      const res = await trackMaterialDownload(m.id);
      window.open(res.ok && res.fileUrl ? res.fileUrl : m.fileUrl, "_blank");
    } catch {
      window.open(m.fileUrl, "_blank");
    }
  }, []);

  const handleDelete = useCallback(async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this material?")) return;
    try {
      await deleteMaterial(id);
      setMaterials((prev) => prev.filter((m) => m.id !== id));
    } catch (err: any) {
      alert(err?.message || "Failed to delete");
    }
  }, []);

  const handleSupport = useCallback(async (id: string) => {
    setRequests((prev) =>
      prev.map((r) =>
        r.id === id
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
    } catch {
      setRequests((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                isSupportedByMe: false,
                supportersCount: Math.max(0, r.supportersCount - 1),
              }
            : r
        )
      );
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
        setSelectedFileName(null);
        setShowOptionalUploadFields(false);
        router.refresh();
      }
    } catch (err: any) {
      setUploadError(err?.message || "Failed to upload material");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRequestSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setRequestError("");
    setIsRequesting(true);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await requestMaterial(fd);
      if (res.ok) {
        setIsRequestModalOpen(false);
        router.refresh();
      }
    } catch (err: any) {
      setRequestError(err?.message || "Failed to submit request");
    } finally {
      setIsRequesting(false);
    }
  };

  const openUpload = () => {
    setUploadError("");
    setIsUploadModalOpen(true);
  };

  const QUICK_FILTERS = [
    { id: "latest", label: "Latest", icon: "clock" },
    { id: "popular", label: "Popular", icon: "trending-up" },
    { id: "my_courses", label: "My Courses", icon: "graduation" },
    { id: "verified", label: "Verified", icon: "check" },
  ];

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={"card " + styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.headerTitle}>Study Materials</h1>
          <p className={styles.headerSub}>
            Notes, summaries, slides, past exams, exam prep, templates and
            project examples — shared by students, for students.
          </p>
          <Link href="/library" className={styles.libraryLink}>
            <UiIcon name="book-open" size={16} />
            Official books, reading lists &amp; databases — UFAR Library
          </Link>
        </div>
        <button className="btn btn-primary" onClick={openUpload}>
          <UiIcon name="upload" size={16} />
          Upload Material
        </button>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={
            styles.tab + (activeTab === "browse" ? " " + styles.tabActive : "")
          }
          onClick={() => setActiveTab("browse")}
        >
          <UiIcon name="search" size={16} />
          Browse
        </button>
        <button
          className={
            styles.tab + (activeTab === "saved" ? " " + styles.tabActive : "")
          }
          onClick={() => setActiveTab("saved")}
        >
          <UiIcon name="bookmark" size={16} />
          Saved
        </button>
        <button
          className={
            styles.tab +
            (activeTab === "requests" ? " " + styles.tabActive : "")
          }
          onClick={() => setActiveTab("requests")}
        >
          <UiIcon name="comment" size={16} />
          Requests ({requests.length})
        </button>
      </div>

      {activeTab !== "requests" ? (
        <>
          {/* Toolbar */}
          <div className={styles.toolbar}>
            <div className={styles.searchWrap}>
              <span className={styles.searchIcon}>
                <UiIcon name="search" size={18} />
              </span>
              <input
                className={styles.searchInput}
                type="text"
                placeholder="Search by title, description, or course code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className={styles.pills}>
              {QUICK_FILTERS.map((f) => (
                <button
                  key={f.id}
                  className={
                    styles.pill +
                    (quickFilter === f.id ? " " + styles.pillActive : "")
                  }
                  onClick={() => setQuickFilter(f.id)}
                >
                  <UiIcon name={f.icon} size={14} />
                  {f.label}
                </button>
              ))}
              <select
                className={styles.filterSelect}
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
                aria-label="Filter by course"
              >
                <option value="">All courses</option>
                {allCourses.map((c) => (
                  <option key={c.id} value={c.code}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </select>
              <select
                className={styles.filterSelect}
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                aria-label="Filter by type"
              >
                <option value="">All types</option>
                {TYPES_MAP.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Grid / empty */}
          {displayedMaterials.length === 0 ? (
            <div className={"card " + styles.empty}>
              <span className={styles.emptyIcon}>
                <UiIcon name="folder" size={48} />
              </span>
              <h3 className={styles.emptyTitle}>
                {activeTab === "saved"
                  ? "No saved materials"
                  : "No materials found"}
              </h3>
              <p className={styles.emptyText}>
                {activeTab === "saved"
                  ? "Files you save will show up here for fast access."
                  : searchQuery
                  ? "Try adjusting your search terms or filters."
                  : "Be the first to upload study notes for your courses."}
              </p>
              {activeTab !== "saved" && !searchQuery && (
                <button className="btn btn-secondary btn-sm" onClick={openUpload}>
                  Upload the first material
                </button>
              )}
            </div>
          ) : (
            <div className={styles.grid}>
              {displayedMaterials.map((m) => (
                <MaterialCard
                  key={m.id}
                  m={m}
                  currentUserId={currentUserId}
                  onToggleSave={handleToggleSave}
                  onDelete={handleDelete}
                  onDownload={handleDownload}
                  onRate={handleRate}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        /* Requests tab */
        <>
          <div className={styles.requestsHead}>
            <h3 className={styles.requestsTitle}>Open material requests</h3>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                setRequestError("");
                setIsRequestModalOpen(true);
              }}
            >
              <UiIcon name="plus" size={14} />
              Request a material
            </button>
          </div>

          {requests.length === 0 ? (
            <div className={"card " + styles.empty}>
              <span className={styles.emptyIcon}>
                <UiIcon name="comment" size={48} />
              </span>
              <h3 className={styles.emptyTitle}>No open requests</h3>
              <p className={styles.emptyText}>
                Need notes you can&apos;t find? Post a request and let other
                students help.
              </p>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setRequestError("");
                  setIsRequestModalOpen(true);
                }}
              >
                Request a material
              </button>
            </div>
          ) : (
            <div className={styles.requestList}>
              {requests.map((r) => {
                const urgencyClass =
                  r.urgency === "high"
                    ? styles.urgencyHigh
                    : r.urgency === "low"
                    ? styles.urgencyLow
                    : styles.urgencyMedium;
                return (
                  <div key={r.id} className={"card " + styles.requestCard}>
                    <div className={styles.requestInfo}>
                      <h4 className={styles.requestTitle}>
                        {r.subject || "Material request"}
                        {r.materialType && (
                          <span
                            className={styles.badge + " " + styles.badgeType}
                          >
                            {getTypeName(r.materialType)}
                          </span>
                        )}
                        <span
                          className={styles.urgencyBadge + " " + urgencyClass}
                        >
                          {r.urgency}
                        </span>
                      </h4>
                      {r.description && (
                        <p className={styles.requestDesc}>{r.description}</p>
                      )}
                      <div className={styles.requestMeta}>
                        <span>Requested by {r.requesterName || "a student"}</span>
                        <span>&middot;</span>
                        <span>{timeAgo(r.createdAt)}</span>
                        {r.year && (
                          <>
                            <span>&middot;</span>
                            <span>{r.year}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className={styles.requestActions}>
                      <span className={styles.supportCount}>
                        <UiIcon name="users" size={13} />
                        {r.supportersCount} need this
                      </span>
                      {!r.isMine && (
                        <button
                          className="btn btn-sm btn-outline"
                          disabled={r.isSupportedByMe}
                          onClick={() => handleSupport(r.id)}
                        >
                          <UiIcon
                            name={r.isSupportedByMe ? "check" : "thumbs-up"}
                            size={13}
                          />
                          {r.isSupportedByMe ? "Supported" : "I need this too"}
                        </button>
                      )}
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={openUpload}
                      >
                        <UiIcon name="upload" size={13} />
                        Fulfill
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Upload modal */}
      {isUploadModalOpen && (
        <div
          className={styles.modalOverlay}
          onClick={() => setIsUploadModalOpen(false)}
        >
          <form
            className={styles.modalCard}
            onSubmit={handleUploadSubmit}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className={styles.modalTitle}>Upload Study Material</h2>
            {uploadError && <div className={styles.modalError}>{uploadError}</div>}

            <div className={styles.field}>
              <label className={styles.label}>Title *</label>
              <input
                className={styles.input}
                type="text"
                name="title"
                required
                placeholder="e.g. FIN-301 Midterm Summary Notes"
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Course *</label>
              <select className={styles.select} name="courseId" required>
                <option value="">Select course...</option>
                {allCourses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} - {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Type *</label>
              <select className={styles.select} name="type" required>
                {TYPES_MAP.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Source *</label>
              <div className={styles.sourceToggle}>
                <button
                  type="button"
                  className={
                    styles.sourceBtn +
                    (uploadSourceType === "file"
                      ? " " + styles.sourceBtnActive
                      : "")
                  }
                  onClick={() => setUploadSourceType("file")}
                >
                  Upload File
                </button>
                <button
                  type="button"
                  className={
                    styles.sourceBtn +
                    (uploadSourceType === "link"
                      ? " " + styles.sourceBtnActive
                      : "")
                  }
                  onClick={() => setUploadSourceType("link")}
                >
                  Provide Link
                </button>
              </div>

              {uploadSourceType === "file" ? (
                <>
                  <input
                    ref={modalFileInputRef}
                    className={styles.hiddenFileInput}
                    type="file"
                    name="file"
                    required
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      setSelectedFileName(file ? file.name : null);
                    }}
                  />
                  <div
                    className={styles.dropzone}
                    onClick={() => modalFileInputRef.current?.click()}
                  >
                    <span className={styles.dropIcon}>
                      <UiIcon name="upload" size={28} />
                    </span>
                    <div className={styles.dropMain}>
                      {selectedFileName || "Click to choose a file"}
                    </div>
                    <div className={styles.dropSub}>
                      {selectedFileName
                        ? "Click to change file"
                        : "PDF, DOCX, PPTX, images, and more"}
                    </div>
                  </div>
                </>
              ) : (
                <input
                  className={styles.input}
                  type="url"
                  name="link"
                  required
                  placeholder="https://drive.google.com/... or any URL"
                />
              )}
            </div>

            <div className={styles.field}>
              <button
                type="button"
                className={styles.optionalToggle}
                onClick={() =>
                  setShowOptionalUploadFields(!showOptionalUploadFields)
                }
              >
                <UiIcon
                  name={showOptionalUploadFields ? "chevron-up" : "chevron-down"}
                  size={14}
                />
                {showOptionalUploadFields
                  ? "Hide optional details"
                  : "Add optional details"}
              </button>

              {showOptionalUploadFields && (
                <div className={styles.optionalBody}>
                  <div>
                    <label className={styles.label}>Description</label>
                    <textarea
                      className={styles.textarea}
                      name="description"
                      rows={2}
                      placeholder="Describe what these notes cover..."
                    />
                  </div>
                  <div>
                    <label className={styles.label}>Tags (comma-separated)</label>
                    <input
                      className={styles.input}
                      type="text"
                      name="tags"
                      placeholder="e.g. midterm, formula-sheet"
                    />
                  </div>
                  <div>
                    <label className={styles.label}>Year</label>
                    <select className={styles.select} name="year">
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

            <div className={styles.modalButtons}>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={isUploading}
                onClick={() => setIsUploadModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isUploading}
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

      {/* Request modal */}
      {isRequestModalOpen && (
        <div
          className={styles.modalOverlay}
          onClick={() => setIsRequestModalOpen(false)}
        >
          <form
            className={styles.modalCard}
            onSubmit={handleRequestSubmit}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className={styles.modalTitle}>Request a Material</h2>
            {requestError && (
              <div className={styles.modalError}>{requestError}</div>
            )}

            <div className={styles.field}>
              <label className={styles.label}>Subject *</label>
              <input
                className={styles.input}
                type="text"
                name="subject"
                required
                placeholder="e.g. Microeconomics"
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Type</label>
              <select className={styles.select} name="materialType">
                {TYPES_MAP.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Year</label>
              <select className={styles.select} name="year">
                <option value="">Select year...</option>
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Urgency</label>
              <select className={styles.select} name="urgency" defaultValue="medium">
                {URGENCIES.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Details</label>
              <textarea
                className={styles.textarea}
                name="description"
                rows={3}
                placeholder="Describe exactly what you need (topic, professor, chapter)..."
              />
            </div>

            <div className={styles.modalButtons}>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={isRequesting}
                onClick={() => setIsRequestModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isRequesting}
              >
                {isRequesting ? (
                  <>
                    <UiIcon name="loader" size={14} className="animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit request"
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
