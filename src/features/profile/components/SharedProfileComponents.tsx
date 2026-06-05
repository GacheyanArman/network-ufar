import React from "react";
import Link from "next/link";
import UiIcon from "@/shared/ui/UiIcon";

export function TabLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      className={active ? "uf-tab-link active" : "uf-tab-link"}
    >
      {children}
    </Link>
  );
}

export function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="uf-info-block">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

interface MaterialCardProps {
  material: {
    id: string;
    title: string;
    description: string | null;
    fileUrl: string | null;
    type: string | null;
    course: string | null;
    createdAt: Date | null;
    ownerName?: string | null;
    status?: string | null;
    downloadsCount?: number | null;
  };
  showStatus?: boolean;
}

export function MaterialCard({ material, showStatus }: MaterialCardProps) {
  const m = material;
  const statusColor =
    m.status === "approved"
      ? "#16a34a"
      : m.status === "rejected"
      ? "#dc2626"
      : "#d97706";

  return (
    <div className="uf-card uf-material-card">
      <div className="uf-material-card-header">
        {m.course ? (
          <span className="uf-material-badge">{m.course}</span>
        ) : null}
        <span className="uf-material-type-badge">
          {(m.type || "other").replace(/_/g, " ")}
        </span>
        {showStatus && m.status ? (
          <span
            className="uf-material-status-badge"
            style={{ color: statusColor, borderColor: statusColor }}
          >
            {m.status}
          </span>
        ) : null}
      </div>

      <h3 className="uf-material-title">{m.title}</h3>

      {m.description ? (
        <p className="uf-material-desc">{m.description}</p>
      ) : null}

      <div className="uf-material-footer">
        <span className="uf-material-meta">
          {m.ownerName || "You"}
          {" · "}
          {m.createdAt
            ? new Date(m.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })
            : ""}
        </span>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {m.downloadsCount != null && (
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              <UiIcon name="download" size={14} /> {m.downloadsCount}
            </span>
          )}
          {m.fileUrl ? (
            <a
              href={m.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="uf-material-download-btn"
            >
              Open
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}

interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  actionHref?: string;
  actionText?: string;
}

export function EmptyState({
  icon = "info",
  title,
  description,
  actionHref,
  actionText,
}: EmptyStateProps) {
  const isEmoji = icon.length <= 2;
  return (
    <div className="uf-card uf-profile-empty">
      <div className="uf-empty-icon" style={{ display: "flex", justifyContent: "center", color: "var(--text-secondary)" }}>
        {isEmoji ? icon : <UiIcon name={icon} size={42} />}
      </div>
      <h2>{title}</h2>
      <p>{description}</p>
      {actionHref && actionText && (
        <Link href={actionHref} className="uf-empty-action-btn">
          {actionText}
        </Link>
      )}
    </div>
  );
}

interface ProfileCompletenessProps {
  user: {
    avatarUrl?: string | null;
    image?: string | null;
    bio?: string | null;
    faculty?: string | null;
    year?: string | null;
    fullName?: string | null;
    username?: string | null;
    coverImage?: string | null;
  };
  coursesCount: number;
}

export function ProfileCompleteness({
  user,
  coursesCount,
}: ProfileCompletenessProps) {
  const steps = [
    { label: "Full name", done: !!user.fullName },
    { label: "Username", done: !!user.username },
    { label: "Avatar", done: !!(user.avatarUrl || user.image) },
    { label: "Cover photo", done: !!user.coverImage },
    { label: "Faculty", done: !!user.faculty },
    { label: "Academic year", done: !!user.year },
    { label: "Bio", done: !!user.bio },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  const pct = Math.round((doneCount / steps.length) * 100);

  if (pct === 100) return null;

  return (
    <div className="uf-card uf-completeness-widget">
      <div className="uf-completeness-header">
        <h3 className="uf-completeness-title">Profile Completeness</h3>
        <span className="uf-completeness-pct">{pct}%</span>
      </div>
      <div className="uf-completeness-bar">
        <div className="uf-completeness-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="uf-completeness-list">
        {steps.map((step, idx) => (
          <div
            key={idx}
            className={`uf-completeness-item ${step.done ? "done" : ""}`}
          >
            <div className="uf-completeness-icon">
              {step.done ? <UiIcon name="check" size={14} /> : <UiIcon name="more" size={14} />}
            </div>
            <span>{step.label}</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 16 }}>
        <Link href="/profile/edit" className="uf-empty-action-btn" style={{ display: "inline-block" }}>
          Complete Profile
        </Link>
      </div>
    </div>
  );
}
