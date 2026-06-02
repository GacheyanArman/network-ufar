"use client";

import { useRouter } from "next/navigation";
import UiIcon from "@/shared/ui/UiIcon";

export default function BackButton() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.back()}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        fontSize: "0.85rem",
        color: "var(--text-secondary)",
        textDecoration: "none",
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: 0,
        marginBottom: "16px",
        fontWeight: 600,
      }}
    >
      <UiIcon name="arrow-left" size={14} /> Back
    </button>
  );
}
