"use client";

import {
  useState,
  useTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import {
  rsvpToEvent,
  createEventComment,
  deleteEventComment,
  getEventQrToken,
  addCoOrganizer,
  removeCoOrganizer,
  searchEventCoOrganizerCandidates,
} from "@/app/actions/events";
import UiIcon from "@/components/UiIcon";
import PhotoUploadModal from "@/components/PhotoUploadModal";
import { createPhotoPost } from "@/app/actions/photo";
import { useLanguage } from "@/contexts/LanguageContext";
import { getFacultyLabel } from "@/lib/profile-utils";

type EventDetail = {
  id: string;
  title: string;
  description: string | null;
  eventType: string;
  location: string | null;
  startTime: string | null;
  endTime: string | null;
  imageUrl: string | null;
  coverImageUrl: string | null;
  maxAttendees: number | null;
  enableWaitlist: boolean;
  isCancelled: boolean;
  qrToken: string | null;
  organizerId: string;
  organizerName: string;
  organizerImage: string | null;
  communityId: string | null;
  communityName: string | null;
};

type Attendee = {
  userId: string;
  name: string;
  avatar: string | null;
  image: string | null;
  status?: string;
  waitlistPosition?: number | null;
};

type Comment = {
  id: string;
  content: string;
  createdAt: string;
  userId: string;
  userName: string;
  userImage: string | null;
  userAvatar: string | null;
};

type CoOrganizer = { userId: string; name: string; image: string | null };

type CoOrganizerCandidate = {
  id: string;
  name: string;
  username: string | null;
  image: string | null;
  avatar: string | null;
  faculty: string | null;
};

type Props = {
  event: EventDetail;
  coOrganizers: CoOrganizer[];
  rsvpCounts: { going: number; interested: number; waitlisted: number };
  myRsvpStatus: "going" | "interested" | "not_going" | "waitlisted" | null;
  myWaitlistPosition: number | null;
  canManage: boolean;
  isCheckedIn: boolean;
  checkInCount: number;
  isFull: boolean;
  isPast: boolean;
  attendees: {
    going: Attendee[];
    interested: Attendee[];
    waitlisted: Attendee[];
  };
  comments: Comment[];
  currentUserId: string;
};

function interpolate(
  template: string,
  values: Record<string, string | number>,
) {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

export default function EventDetailClient({
  event,
  coOrganizers: initialCoOrganizers,
  rsvpCounts: initialCounts,
  myRsvpStatus: initialStatus,
  myWaitlistPosition: initialWaitlist,
  canManage,
  isCheckedIn,
  checkInCount,
  isFull: initialFull,
  isPast,
  attendees: initialAttendees,
  comments: initialComments,
  currentUserId,
}: Props) {
  const { t, locale } = useLanguage();
  const [counts, setCounts] = useState(initialCounts);
  const [status, setStatus] = useState(initialStatus);
  const [waitlistPos, setWaitlistPos] = useState(initialWaitlist);
  const [comments, setComments] = useState(initialComments);
  const [coOrganizersState, setCoOrganizersState] =
    useState(initialCoOrganizers);
  const [newComment, setNewComment] = useState("");
  const [posting, startPosting] = useTransition();
  const [showAttendees, setShowAttendees] = useState<
    "going" | "interested" | "waitlisted" | null
  >(null);
  const [showQr, setShowQr] = useState(false);
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  const photoUploadedRef = useRef(false);
  const [showCoOrganizerManager, setShowCoOrganizerManager] = useState(false);

  const isFull =
    event.maxAttendees != null &&
    event.maxAttendees > 0 &&
    counts.going >= event.maxAttendees;

  const handleRsvp = useCallback(
    async (target: "going" | "interested" | "not_going") => {
      setCounts((prev) => {
        let { going, interested, waitlisted } = prev;
        if (status === "going") going = Math.max(0, going - 1);
        if (status === "interested") interested = Math.max(0, interested - 1);
        if (status === "waitlisted") waitlisted = Math.max(0, waitlisted - 1);

        let nextStatus: typeof status = target;
        if (target === "going") {
          if (
            event.maxAttendees != null &&
            event.maxAttendees > 0 &&
            going >= event.maxAttendees &&
            event.enableWaitlist
          ) {
            nextStatus = "waitlisted";
            waitlisted += 1;
          } else {
            going += 1;
          }
        } else if (target === "interested") {
          interested += 1;
        }
        setStatus(nextStatus);
        return { going, interested, waitlisted };
      });

      const fd = new FormData();
      fd.set("eventId", event.id);
      fd.set("status", target);
      try {
        const res = await rsvpToEvent(fd);
        if ((res as any)?.error) {
          alert((res as any).error);
        } else if ((res as any)?.waitlistPosition !== undefined) {
          setWaitlistPos((res as any).waitlistPosition);
          if ((res as any).status) {
            setStatus((res as any).status);
          }
        }
      } catch (err) {
        console.error("rsvpToEvent failed:", err);
      }
    },
    [event.id, event.maxAttendees, event.enableWaitlist, status],
  );

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    const content = newComment.trim();
    if (!content) return;
    startPosting(async () => {
      const fd = new FormData();
      fd.set("eventId", event.id);
      fd.set("content", content);
      const res = await createEventComment(fd);
      if ((res as any)?.error) {
        alert((res as any).error);
        return;
      }
      const id = (res as any).id;
      const createdAt =
        typeof (res as any).createdAt === "string"
          ? (res as any).createdAt
          : new Date((res as any).createdAt).toISOString();
      setComments((prev) => [
        {
          id,
          content,
          createdAt,
          userId: currentUserId,
          userName: "You",
          userImage: null,
          userAvatar: null,
        },
        ...prev,
      ]);
      setNewComment("");
    });
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm(t("events.detail.deleteCommentConfirm"))) return;
    const fd = new FormData();
    fd.set("commentId", commentId);
    const res = await deleteEventComment(fd);
    if ((res as any)?.error) {
      alert((res as any).error);
      return;
    }
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  };

  const handleShare = async () => {
    const url =
      typeof window !== "undefined"
        ? window.location.origin + `/events/${event.id}`
        : `/events/${event.id}`;
    const shareData = {
      title: event.title,
      text: interpolate(t("events.share.text"), { title: event.title }),
      url,
    };
    try {
      if (
        typeof navigator !== "undefined" &&
        typeof navigator.share === "function"
      ) {
        await navigator.share(shareData);
        return;
      }
    } catch {
    }
    try {
      await navigator.clipboard.writeText(url);
      alert(t("events.share.copied"));
    } catch {
      prompt(t("events.share.prompt"), url);
    }
  };

  return (
    <>
      <header
        style={{
          background: "#fff",
          borderRadius: 16,
          overflow: "hidden",
          border: "1px solid var(--border-color-light)",
          marginBottom: 20,
        }}
      >
        {event.coverImageUrl && (
          <img
            src={event.coverImageUrl}
            alt=""
            style={{
              width: "100%",
              maxHeight: 320,
              objectFit: "cover",
              display: "block",
              opacity: event.isCancelled ? 0.6 : 1,
            }}
          />
        )}
        <div style={{ padding: 20 }}>
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <span
              style={{
                display: "inline-block",
                padding: "4px 10px",
                borderRadius: 999,
                background: "var(--french-blue-soft, #e8eef9)",
                color: "var(--french-blue, #2c5aa0)",
                fontSize: 11,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: 0.6,
              }}
            >
              {t(`events.categories.${event.eventType}`)}
            </span>
            {event.communityName && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: 11,
                  fontWeight: 800,
                  color: "var(--text-secondary)",
                  background: "var(--bg-hover, #f1f5f9)",
                  padding: "4px 10px",
                  borderRadius: 999,
                }}
              >
                <UiIcon name="users" size={12} /> {event.communityName}
              </span>
            )}
            {event.isCancelled && (
              <span
                style={{
                  background: "#dc2626",
                  color: "#fff",
                  borderRadius: 999,
                  padding: "4px 10px",
                  fontSize: 11,
                  fontWeight: 800,
                }}
              >
                {t("events.cancelled")}
              </span>
            )}
            {isPast && !event.isCancelled && (
              <span
                style={{
                  background: "rgba(0,0,0,0.55)",
                  color: "#fff",
                  borderRadius: 999,
                  padding: "4px 10px",
                  fontSize: 11,
                  fontWeight: 800,
                }}
              >
                {t("events.pastEvent")}
              </span>
            )}
          </div>
          <h1
            style={{
              margin: "10px 0 6px",
              fontSize: "clamp(22px, 4vw, 28px)",
              fontWeight: 900,
              letterSpacing: "-0.02em",
            }}
          >
            {event.title}
          </h1>
          <div style={{ color: "var(--text-secondary)", fontSize: 14 }}>
            {event.startTime ? new Date(event.startTime).toLocaleString(locale) : ""}
            {event.location ? ` · ${event.location}` : ""}
          </div>
          {event.description && (
            <p
              style={{
                marginTop: 12,
                lineHeight: 1.6,
                color: "var(--text-primary)",
                whiteSpace: "pre-wrap",
              }}
            >
              {event.description}
            </p>
          )}

          <div
            style={{
              display: "flex",
              gap: 8,
              marginTop: 14,
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={() => setShowAttendees("going")}
              style={countBtn(true)}
            >
              <strong>{counts.going}</strong> {t("events.detail.going")}
            </button>
            <button
              type="button"
              onClick={() => setShowAttendees("interested")}
              style={countBtn()}
            >
              <strong>{counts.interested}</strong> {t("events.detail.interested")}
            </button>
            {counts.waitlisted > 0 && (
              <button
                type="button"
                onClick={() => setShowAttendees("waitlisted")}
                style={countBtn()}
              >
                <strong>{counts.waitlisted}</strong> {t("events.detail.waitlist")}
              </button>
            )}
            {event.maxAttendees && event.maxAttendees > 0 && (
              <span style={countBtn(false, true)}>
                {interpolate(t("events.detail.capacity"), {
                  going: counts.going,
                  capacity: event.maxAttendees,
                })}
              </span>
            )}
            {checkInCount > 0 && (
              <span
                style={{
                  ...countBtn(false, true),
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <UiIcon name="check-circle" size={13} />{" "}
                {interpolate(t("events.detail.checkedInCount"), {
                  count: checkInCount,
                })}
              </span>
            )}
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              marginTop: 14,
              flexWrap: "wrap",
            }}
          >
            {!isPast && !event.isCancelled && (
              <>
                <RsvpButton
                  active={status === "going" || status === "waitlisted"}
                  onClick={() => handleRsvp("going")}
                  text={
                    isFull && status !== "going" && status !== "waitlisted"
                      ? event.enableWaitlist
                        ? t("events.card.joinWaitlist")
                        : t("events.card.full")
                      : t("events.card.youAreGoing")
                  }
                  disabled={
                    isFull &&
                    !event.enableWaitlist &&
                    status !== "going" &&
                    status !== "waitlisted"
                  }
                />
                <RsvpButton
                  active={status === "interested"}
                  onClick={() => handleRsvp("interested")}
                  text={t("events.card.interested")}
                  variant="secondary"
                />
                {status && status !== "not_going" && (
                  <button
                    type="button"
                    onClick={() => handleRsvp("not_going")}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 8,
                      border: "1px solid var(--border-color)",
                      background: "var(--bg-main)",
                      color: "var(--text-secondary)",
                      fontSize: "0.85rem",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {t("events.card.cancelRsvp")}
                  </button>
                )}
              </>
            )}
            {isPast && !event.isCancelled && (
              <button
                type="button"
                onClick={() => {
                  photoUploadedRef.current = false;
                  setShowPhotoUpload(true);
                }}
                style={secondaryActionStyle}
              >
                <UiIcon name="camera" size={14} /> {t("events.detail.sharePhotos")}
              </button>
            )}
            <button
              type="button"
              onClick={handleShare}
              style={secondaryActionStyle}
            >
              <UiIcon name="share" size={14} /> {t("events.detail.share")}
            </button>
            {canManage && (
              <>
                <button
                  type="button"
                  onClick={() => setShowCoOrganizerManager(true)}
                  style={secondaryActionStyle}
                >
                  <UiIcon name="user-plus" size={14} /> {t("events.detail.coOrganizers")}
                </button>
                <button
                  type="button"
                  onClick={() => setShowQr(true)}
                  style={secondaryActionStyle}
                >
                  <UiIcon name="camera" size={14} /> {t("events.detail.showQr")}
                </button>
              </>
            )}
            {isCheckedIn && (
              <span
                style={{
                  padding: "8px 14px",
                  borderRadius: 8,
                  background: "rgba(22,163,74,0.1)",
                  color: "#16a34a",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <UiIcon name="check-circle" size={14} /> {t("events.detail.checkedIn")}
              </span>
            )}
          </div>

          {status === "waitlisted" && waitlistPos != null && (
            <div
              style={{
                marginTop: 14,
                padding: "10px 14px",
                borderRadius: 10,
                background: "rgba(217,119,6,0.08)",
                border: "1px solid rgba(217,119,6,0.25)",
                color: "#9a3412",
                fontSize: "0.9rem",
              }}
            >
              {interpolate(t("events.detail.waitlistBanner"), {
                position: waitlistPos,
              })}
            </div>
          )}
        </div>
      </header>

      {coOrganizersState.length > 0 && (
        <section style={{ marginBottom: 20 }}>
          <h2 style={sectionTitle}>{t("events.detail.coOrganizers")}</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {coOrganizersState.map((c) => (
              <div
                key={c.userId}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 10px",
                  background: "#fff",
                  border: "1px solid var(--border-color-light)",
                  borderRadius: 999,
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                <Avatar src={c.image} name={c.name} size={24} />
                {c.name}
              </div>
            ))}
          </div>
        </section>
      )}

      {showAttendees && (
        <AttendeeListModal
          tab={showAttendees}
          attendees={initialAttendees}
          onClose={() => setShowAttendees(null)}
        />
      )}

      {showQr && (
        <QrCheckInModal eventId={event.id} onClose={() => setShowQr(false)} />
      )}
      {showPhotoUpload && (
        <PhotoUploadModal
          albums={[]}
          eventId={event.id}
          onClose={() => {
            setShowPhotoUpload(false);
            if (photoUploadedRef.current) window.location.reload();
          }}
          onUpload={async (formData) => {
            await createPhotoPost(formData);
            photoUploadedRef.current = true;
          }}
        />
      )}
      {showCoOrganizerManager && (
        <CoOrganizerManagerModal
          eventId={event.id}
          coOrganizers={coOrganizersState}
          onAdded={(candidate) =>
            setCoOrganizersState((prev) => [
              ...prev,
              {
                userId: candidate.id,
                name: candidate.name,
                image: candidate.image || candidate.avatar,
              },
            ])
          }
          onRemoved={(userId) =>
            setCoOrganizersState((prev) =>
              prev.filter((c) => c.userId !== userId),
            )
          }
          onClose={() => setShowCoOrganizerManager(false)}
        />
      )}

      <section style={{ marginBottom: 20 }}>
        <h2 style={sectionTitle}>
          <span
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <UiIcon name="comment" size={16} /> {t("events.detail.discussion")}{" "}
            {comments.length > 0 ? `(${comments.length})` : ""}
          </span>
        </h2>
        <form
          onSubmit={handleSubmitComment}
          style={{ display: "flex", gap: 8, marginBottom: 12 }}
        >
          <input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={t("events.detail.addComment")}
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
            disabled={posting || !newComment.trim()}
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              border: "none",
              background: "var(--french-blue, #2563eb)",
              color: "#fff",
              fontWeight: 700,
              cursor: posting || !newComment.trim() ? "default" : "pointer",
              opacity: posting || !newComment.trim() ? 0.6 : 1,
            }}
          >
            {posting ? t("events.detail.sending") : t("events.detail.send")}
          </button>
        </form>
        {comments.length === 0 ? (
          <div
            style={{
              padding: "24px 16px",
              textAlign: "center",
              color: "var(--text-secondary)",
              background: "#fff",
              border: "1px dashed var(--border-color)",
              borderRadius: 12,
              fontSize: "0.9rem",
            }}
          >
            {t("events.detail.noComments")}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {comments.map((c) => (
              <div
                key={c.id}
                style={{
                  background: "#fff",
                  border: "1px solid var(--border-color-light)",
                  borderRadius: 10,
                  padding: 12,
                  display: "flex",
                  gap: 10,
                }}
              >
                <Avatar
                  src={c.userImage || c.userAvatar}
                  name={c.userName}
                  size={32}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <strong style={{ fontSize: 13 }}>{c.userName}</strong>
                    <span
                      style={{
                        fontSize: 11,
                        color: "var(--text-muted, #94a3b8)",
                      }}
                    >
                      {timeAgo(t, locale, c.createdAt)}
                    </span>
                    {(c.userId === currentUserId || canManage) && (
                      <button
                        type="button"
                        onClick={() => handleDeleteComment(c.id)}
                        style={{
                          marginLeft: "auto",
                          background: "none",
                          border: "none",
                          color: "var(--text-muted)",
                          cursor: "pointer",
                          fontSize: 12,
                        }}
                      >
                        {t("events.detail.delete")}
                      </button>
                    )}
                  </div>
                  <p
                    style={{
                      margin: "2px 0 0",
                      fontSize: 14,
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
        )}
      </section>
    </>
  );
}

function AttendeeListModal({
  tab,
  attendees,
  onClose,
}: {
  tab: "going" | "interested" | "waitlisted";
  attendees: {
    going: Attendee[];
    interested: Attendee[];
    waitlisted: Attendee[];
  };
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const [active, setActive] = useState(tab);
  const list = attendees[active] || [];
  const titleMap = {
    going: t("events.detail.going"),
    interested: t("events.detail.interested"),
    waitlisted: t("events.detail.waitlist"),
  } as const;

  return (
    <div
      onMouseDown={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.55)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 480,
          maxHeight: "90vh",
          overflow: "hidden",
          background: "#fff",
          borderRadius: 14,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            padding: "14px 16px",
            borderBottom: "1px solid var(--border-color)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900 }}>
            {t("events.detail.attendees")}
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: "none",
              background: "none",
              cursor: "pointer",
              fontSize: 22,
              color: "var(--text-secondary)",
            }}
          >
            ×
          </button>
        </div>
        <div
          style={{
            display: "flex",
            gap: 4,
            padding: "0 16px",
            borderBottom: "1px solid var(--border-color-light)",
          }}
        >
          {(["going", "interested", "waitlisted"] as const).map((tb) => (
            <button
              key={tb}
              type="button"
              onClick={() => setActive(tb)}
              style={{
                padding: "12px 14px",
                background: "none",
                border: "none",
                borderBottom:
                  tb === active
                    ? "2px solid var(--french-blue, #2563eb)"
                    : "2px solid transparent",
                color:
                  tb === active
                    ? "var(--french-blue, #2563eb)"
                    : "var(--text-secondary)",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              {titleMap[tb]} ({attendees[tb].length})
            </button>
          ))}
        </div>
        <div style={{ overflowY: "auto", padding: 8 }}>
          {list.length === 0 ? (
            <div
              style={{
                padding: 32,
                textAlign: "center",
                color: "var(--text-secondary)",
                fontSize: 14,
              }}
            >
              {t("events.detail.noListMembers")}
            </div>
          ) : (
            list.map((a) => (
              <div
                key={a.userId}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 12px",
                  borderRadius: 8,
                }}
              >
                <Avatar src={a.image || a.avatar} name={a.name} size={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                      textOverflow: "ellipsis",
                      overflow: "hidden",
                    }}
                  >
                    {a.name}
                  </div>
                </div>
                {active === "waitlisted" && a.waitlistPosition != null && (
                  <span
                    style={{
                      fontSize: 12,
                      color: "var(--text-secondary)",
                      fontWeight: 700,
                    }}
                  >
                    #{a.waitlistPosition}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function CoOrganizerManagerModal({
  eventId,
  coOrganizers,
  onAdded,
  onRemoved,
  onClose,
}: {
  eventId: string;
  coOrganizers: CoOrganizer[];
  onAdded: (candidate: CoOrganizerCandidate) => void;
  onRemoved: (userId: string) => void;
  onClose: () => void;
}) {
  const { t, language } = useLanguage();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CoOrganizerCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    let alive = true;
    const timer = setTimeout(() => {
      searchEventCoOrganizerCandidates(eventId, q)
        .then((data) => {
          if (alive) setResults(data as CoOrganizerCandidate[]);
        })
        .catch((err) => {
          if (alive) setError(err?.message || t("events.coOrganizerModal.searchFailed"));
        })
        .finally(() => {
          if (alive) setLoading(false);
        });
    }, 250);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [eventId, query, t]);

  const handleAdd = async (candidate: CoOrganizerCandidate) => {
    setError(null);
    const res = await addCoOrganizer(eventId, candidate.id);
    if ((res as any)?.error) {
      setError((res as any).error);
      return;
    }
    onAdded(candidate);
    setResults((prev) => prev.filter((r) => r.id !== candidate.id));
  };

  const handleRemove = async (userId: string) => {
    setError(null);
    const res = await removeCoOrganizer(eventId, userId);
    if ((res as any)?.error) {
      setError((res as any).error);
      return;
    }
    onRemoved(userId);
  };

  return (
    <div onMouseDown={onClose} style={modalOverlayStyle}>
      <div
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 520,
          maxHeight: "90vh",
          overflowY: "auto",
          background: "#fff",
          borderRadius: 14,
          padding: 18,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 12,
          }}
        >
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900 }}>
            {t("events.coOrganizerModal.title")}
          </h3>
          <button type="button" onClick={onClose} style={iconButtonStyle}>
            <UiIcon name="x" size={18} />
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: "8px 10px",
              borderRadius: 8,
              background: "rgba(220,38,38,0.08)",
              color: "#b91c1c",
              fontSize: 13,
              marginBottom: 10,
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {coOrganizers.length === 0 ? (
            <div
              style={{
                padding: 14,
                border: "1px dashed var(--border-color)",
                borderRadius: 10,
                color: "var(--text-secondary)",
                fontSize: 13,
              }}
            >
              {t("events.coOrganizerModal.none")}
            </div>
          ) : (
            coOrganizers.map((c) => (
              <div key={c.userId} style={personRowStyle}>
                <Avatar src={c.image} name={c.name} size={34} />
                <strong style={{ flex: 1, fontSize: 14 }}>{c.name}</strong>
                <button
                  type="button"
                  onClick={() => handleRemove(c.userId)}
                  style={smallSecondaryButtonStyle}
                >
                  {t("events.coOrganizerModal.remove")}
                </button>
              </div>
            ))
          )}
        </div>

        <div style={{ marginTop: 16 }}>
          <label
            style={{
              display: "block",
              fontSize: 12,
              fontWeight: 800,
              color: "var(--text-secondary)",
              marginBottom: 6,
              textTransform: "uppercase",
              letterSpacing: 0.4,
            }}
          >
            {t("events.coOrganizerModal.addMember")}
          </label>
          <input
            value={query}
            onChange={(e) => {
              const next = e.target.value;
              setQuery(next);
              const searchable = next.trim().length >= 2;
              setLoading(searchable);
              if (!searchable) setResults([]);
            }}
            placeholder={t("events.coOrganizerModal.searchPlaceholder")}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid var(--border-color)",
              background: "var(--bg-main)",
              color: "var(--text-primary)",
            }}
          />
          <div
            style={{
              marginTop: 8,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {loading && (
              <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                {t("events.coOrganizerModal.searching")}
              </div>
            )}
            {!loading && query.trim().length >= 2 && results.length === 0 && (
              <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                {t("events.coOrganizerModal.noResults")}
              </div>
            )}
            {results.map((candidate) => (
              <div key={candidate.id} style={personRowStyle}>
                <Avatar
                  src={candidate.image || candidate.avatar}
                  name={candidate.name}
                  size={34}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 14 }}>
                    {candidate.name}
                  </div>
                  <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>
                    {candidate.username
                      ? `@${candidate.username}`
                      : candidate.faculty ? getFacultyLabel(candidate.faculty, language) : "UFAR Network"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleAdd(candidate)}
                  style={smallPrimaryButtonStyle}
                >
                  {t("events.coOrganizerModal.add")}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function QrCheckInModal({
  eventId,
  onClose,
}: {
  eventId: string;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getEventQrToken(eventId)
      .then((tk) => {
        if (alive) setToken(tk);
      })
      .catch((e) => {
        if (alive) setError(e?.message || "Failed to load QR token");
      });
    return () => {
      alive = false;
    };
  }, [eventId]);

  const url = useMemo(() => {
    if (!token) return null;
    if (typeof window === "undefined") return null;
    return `${window.location.origin}/events/${eventId}/checkin?token=${token}`;
  }, [eventId, token]);

  const qrSrc = url
    ? `https://chart.googleapis.com/chart?chs=300x300&cht=qr&choe=UTF-8&chl=${encodeURIComponent(
        url,
      )}`
    : null;

  return (
    <div
      onMouseDown={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.6)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 14,
          padding: 20,
          maxWidth: 400,
          width: "100%",
          textAlign: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10,
          }}
        >
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900 }}>
            {t("events.detail.qrTitle")}
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: "none",
              background: "none",
              cursor: "pointer",
              fontSize: 22,
              color: "var(--text-secondary)",
            }}
          >
            ×
          </button>
        </div>
        <p
          style={{
            margin: "4px 0 14px",
            color: "var(--text-secondary)",
            fontSize: 13,
          }}
        >
          {t("events.detail.qrDescription")}
        </p>
        {error ? (
          <div style={{ color: "#dc2626", fontWeight: 700 }}>{error}</div>
        ) : !qrSrc ? (
          <div
            style={{
              width: 300,
              height: 300,
              margin: "0 auto",
              background: "#f1f5f9",
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-secondary)",
            }}
          >
            {t("events.detail.generating")}
          </div>
        ) : (
          <>
            <img
              src={qrSrc}
              alt="QR check-in"
              width={300}
              height={300}
              style={{
                width: 300,
                height: 300,
                display: "block",
                margin: "0 auto",
                borderRadius: 12,
                border: "1px solid var(--border-color)",
              }}
            />
            <div
              style={{
                marginTop: 12,
                fontSize: 12,
                color: "var(--text-secondary)",
                wordBreak: "break-all",
              }}
            >
              {url}
            </div>
            <button
              type="button"
              onClick={() => {
                if (url) navigator.clipboard.writeText(url);
              }}
              style={{
                marginTop: 12,
                padding: "8px 14px",
                borderRadius: 8,
                border: "1px solid var(--border-color)",
                background: "var(--bg-main)",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              {t("events.detail.copyLink")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function RsvpButton({
  active,
  onClick,
  text,
  variant = "primary",
  disabled = false,
}: {
  active: boolean;
  onClick: () => void;
  text: string;
  variant?: "primary" | "secondary";
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        padding: "8px 16px",
        borderRadius: 8,
        border: active
          ? "1px solid var(--french-blue, #2563eb)"
          : "1px solid var(--border-color)",
        background: active
          ? variant === "primary"
            ? "var(--french-blue, #2563eb)"
            : "var(--french-blue-soft, rgba(37,99,235,0.12))"
          : "var(--bg-main)",
        color: active && variant === "primary" ? "#fff" : "var(--text-primary)",
        fontWeight: 800,
        fontSize: "0.85rem",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {text}
    </button>
  );
}

function Avatar({
  src,
  name,
  size = 32,
}: {
  src: string | null | undefined;
  name: string;
  size?: number;
}) {
  const initials = (name || "?")
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: src
          ? `center/cover no-repeat url(${src})`
          : "var(--bg-hover, #e2e8f0)",
        color: "var(--text-secondary)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 800,
        fontSize: Math.max(10, size / 3),
        flexShrink: 0,
      }}
      aria-label={name}
    >
      {!src && initials}
    </div>
  );
}

function timeAgo(t: (key: string) => string, locale: string, iso: string) {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return t("common.timeAgo.justNow");
  if (diff < 3600) return interpolate(t("common.timeAgo.minutesAgo"), { n: Math.floor(diff / 60) });
  if (diff < 86400) return interpolate(t("common.timeAgo.hoursAgo"), { n: Math.floor(diff / 3600) });
  if (diff < 30 * 86400) return interpolate(t("common.timeAgo.daysAgo"), { n: Math.floor(diff / 86400) });
  return d.toLocaleDateString(locale);
}

function countBtn(primary = false, readOnly = false): React.CSSProperties {
  return {
    border: "1px solid var(--border-color-light)",
    borderRadius: 999,
    padding: "6px 12px",
    background: primary
      ? "var(--french-blue-soft, #e8eef9)"
      : "var(--bg-hover, #f1f5f9)",
    color: "var(--text-primary)",
    fontSize: 13,
    cursor: readOnly ? "default" : "pointer",
  };
}

const sectionTitle: React.CSSProperties = {
  margin: "0 0 10px",
  fontSize: 16,
  fontWeight: 900,
};

const secondaryActionStyle: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: 8,
  border: "1px solid var(--border-color)",
  background: "var(--bg-main)",
  color: "var(--text-primary)",
  fontSize: "0.85rem",
  fontWeight: 700,
  cursor: "pointer",
  display: "inline-flex",
  gap: 6,
  alignItems: "center",
};

const modalOverlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,23,42,0.6)",
  zIndex: 1000,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
};

const iconButtonStyle: React.CSSProperties = {
  border: "none",
  background: "none",
  cursor: "pointer",
  color: "var(--text-secondary)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

const personRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid var(--border-color-light)",
  background: "var(--bg-main)",
};

const smallPrimaryButtonStyle: React.CSSProperties = {
  padding: "7px 11px",
  borderRadius: 8,
  border: "none",
  background: "var(--french-blue, #2563eb)",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
  fontSize: 12,
};

const smallSecondaryButtonStyle: React.CSSProperties = {
  ...smallPrimaryButtonStyle,
  border: "1px solid var(--border-color)",
  background: "var(--bg-hover, #f1f5f9)",
  color: "var(--text-primary)",
};
