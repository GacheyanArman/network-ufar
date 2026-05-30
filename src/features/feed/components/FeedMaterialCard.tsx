"use client";

import Link from "next/link";
import type { FeedMaterialItem } from "@/features/feed/server/queries";

export default function FeedMaterialCard({ item }: { item: FeedMaterialItem }) {
  const typeIcon: Record<string, string> = {
    lecture_notes: "📝", summary: "📋", slides: "📊", past_questions: "❓",
    exam_prep: "🎯", formula_sheet: "📐", template: "📄", case_study: "💼",
    cheat_sheet: "📌", language_practice: "🌍", useful_link: "🔗",
  };

  return (
    <div className="card" style={{ padding: "16px 18px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
        <div
          style={{
            width: "42px",
            height: "42px",
            borderRadius: "12px",
            background: "var(--french-blue-soft)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.2rem",
            flexShrink: 0,
          }}
        >
          {typeIcon[item.typeField] || "📎"}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
            <span
              style={{
                fontSize: "0.66rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "var(--french-blue)",
                background: "rgba(44,90,160,0.08)",
                padding: "2px 8px",
                borderRadius: "5px",
              }}
            >
              {item.feedReason}
            </span>
          </div>
          <Link href={`/study-materials`} style={{ textDecoration: "none", color: "var(--text-primary)" }}>
            <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, lineHeight: 1.3 }}>
              {item.title}
            </h4>
          </Link>
          {item.course && (
            <p style={{ margin: "2px 0 0", fontSize: "0.82rem", color: "var(--text-secondary)" }}>
              {item.course}{item.faculty ? ` · ${item.faculty}` : ""}
            </p>
          )}
          <div style={{ display: "flex", gap: "14px", marginTop: "6px", fontSize: "0.80rem", color: "var(--text-muted)" }}>
            <span>⬇ {item.downloadsCount}</span>
            <span>👍 {item.helpfulCount}</span>
            {item.ratingAvg > 0 && <span>⭐ {item.ratingAvg}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
