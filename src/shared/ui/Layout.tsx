import React from "react";
import UiIcon from "./UiIcon";

export function Badge({
  children,
  variant = "navy",
  className = "",
}: {
  children: React.ReactNode;
  variant?: "navy" | "gold" | "success" | "danger" | "gray";
  className?: string;
}) {
  return (
    <span className={`badge-base badge-${variant} ${className}`.trim()}>
      {children}
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = "",
}: {
  icon: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`empty-state ${className}`.trim()}>
      <div className="empty-state-icon">
        <UiIcon name={icon} size={32} />
      </div>
      <h3 className="empty-state-title">{title}</h3>
      {description && <p className="empty-state-desc">{description}</p>}
      {action && <div>{action}</div>}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
  className = "",
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={`page-header ${className}`.trim()}>
      <div className="page-header-inner">
        <div>
          <h1 className="page-header-title">{title}</h1>
          {description && <p className="page-header-desc">{description}</p>}
        </div>
        {action && <div className="page-header-action">{action}</div>}
      </div>
    </header>
  );
}

/**
 * SectionHeader — smaller heading for in-page subsections.
 * Use for "Recent Posts", "Filters", "Stats" type headings inside a page.
 */
export function SectionHeader({
  title,
  description,
  action,
  className = "",
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`section-header ${className}`.trim()}>
      <div>
        <h2 className="section-header-title">{title}</h2>
        {description && <p className="section-header-desc">{description}</p>}
      </div>
      {action && <div className="section-header-action">{action}</div>}
    </div>
  );
}

/**
 * PageShell — consistent page-level container with horizontal padding,
 * max-width and bottom padding. Wrap every top-level page in this so
 * gutters/widths match across the entire app.
 *
 * Variants:
 *  - default: 1100px (most content pages)
 *  - narrow: 760px (feed, profile, single-column forms)
 *  - wide: 1320px (dashboards, admin tables)
 */
export function PageShell({
  children,
  variant = "default",
  className = "",
}: {
  children: React.ReactNode;
  variant?: "default" | "narrow" | "wide";
  className?: string;
}) {
  const variantClass =
    variant === "narrow"
      ? "page-shell-narrow"
      : variant === "wide"
        ? "page-shell-wide"
        : "";
  return (
    <div className={`page-shell ${variantClass} ${className}`.trim()}>
      {children}
    </div>
  );
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <UiIcon name="x" size={24} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
