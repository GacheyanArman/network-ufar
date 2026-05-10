"use client";

import UiIcon from "./UiIcon";

interface ActionButton {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary";
}

interface ActionEmptyStateProps {
  icon?: string;
  title: string;
  hint: string;
  actions?: ActionButton[];
}

export default function ActionEmptyState({
  icon,
  title,
  hint,
  actions,
}: ActionEmptyStateProps) {
  return (
    <div
      style={{
        padding: "40px 20px",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
        borderRadius: 12,
        border: "1px dashed var(--border-color)",
        background: "var(--bg-subtle, #f8f9fb)",
      }}
    >
      {icon && (
        <span style={{ color: "var(--text-muted)", opacity: 0.6 }}>
          <UiIcon name={icon} size={48} />
        </span>
      )}
      <h3
        style={{
          margin: 0,
          fontSize: "1.05rem",
          fontWeight: 800,
          color: "var(--text-primary)",
        }}
      >
        {title}
      </h3>
      <p
        style={{
          margin: 0,
          color: "var(--text-secondary)",
          fontSize: "0.9rem",
          maxWidth: 420,
          lineHeight: 1.5,
        }}
      >
        {hint}
      </p>
      {actions && actions.length > 0 && (
        <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap", justifyContent: "center" }}>
          {actions.map((a, i) => {
            const cls =
              a.variant === "secondary" ? "btn btn-secondary" : "btn btn-primary";
            if (a.href) {
              return (
                <a
                  key={i}
                  href={a.href}
                  className={cls}
                  style={{ textDecoration: "none" }}
                >
                  {a.label}
                </a>
              );
            }
            return (
              <button key={i} className={cls} onClick={a.onClick}>
                {a.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
