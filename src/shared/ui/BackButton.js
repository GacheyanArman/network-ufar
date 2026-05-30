"use client";

import { useRouter } from "next/navigation";

const backBtnStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  height: "38px",
  padding: "0 14px 0 10px",
  borderRadius: "10px",
  background: "#ffffff",
  border: "1px solid #d9e2ef",
  color: "#0f172a",
  fontSize: "14px",
  fontWeight: 700,
  cursor: "pointer",
  marginBottom: "16px",
  transition: "background 0.15s ease, border-color 0.15s ease",
};

export default function BackButton({ label = "Back", fallback = "/" }) {
  const router = useRouter();

  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallback);
    }
  };

  return (
    <button type="button" onClick={goBack} style={backBtnStyle} aria-label={label}>
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M15 18l-6-6 6-6" />
      </svg>
      <span>{label}</span>
    </button>
  );
}
