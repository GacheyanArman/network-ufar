"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { verifyEmailCode } from "@/app/actions/auth";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const [state, formAction, isPending] = useActionState(verifyEmailCode, null);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background:
          "linear-gradient(135deg, #eef3ff 0%, #f8fafc 45%, #ffffff 100%)",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: "430px", // Единая ширина для всех экранов Auth
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: "22px",
          padding: "34px",
          boxShadow: "0 24px 70px rgba(15, 23, 42, 0.12)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div
            style={{
              width: "58px",
              height: "58px",
              borderRadius: "18px",
              background: "#0b3aa8",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.6rem",
              fontWeight: "900",
              margin: "0 auto 16px",
              boxShadow: "0 10px 25px rgba(11, 58, 168, 0.2)",
            }}
          >
            U
          </div>
          <h1
            style={{
              margin: "0 0 8px",
              fontSize: "1.65rem",
              color: "#0f172a",
              fontWeight: "800",
              letterSpacing: "-0.03em",
            }}
          >
            Check your email
          </h1>
          <p style={{ margin: 0, color: "#475569", fontSize: "0.95rem" }}>
            We sent a 6-digit code to <br />
            <strong style={{ color: "#0f172a", wordBreak: "break-all" }}>{email}</strong>
          </p>
        </div>

        <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <input type="hidden" name="email" value={email} />

          <input
            name="code"
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            autoComplete="one-time-code"
            style={{
              width: "100%",
              height: "64px",
              background: "#f8fafc",
              border: "2px solid #e2e8f0",
              borderRadius: "14px",
              color: "#0f172a",
              textAlign: "center",
              letterSpacing: "14px",
              fontSize: "1.8rem",
              fontWeight: "800",
              outline: "none",
              transition: "border-color 0.2s ease, box-shadow 0.2s ease",
            }}
            placeholder="••••••"
            onFocus={(e) => {
              e.target.style.borderColor = "#0b3aa8";
              e.target.style.boxShadow = "0 0 0 4px rgba(11, 58, 168, 0.1)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "#e2e8f0";
              e.target.style.boxShadow = "none";
            }}
            required
          />

          {state?.error && (
            <div
              style={{
                color: "#b42318",
                fontSize: "0.88rem",
                textAlign: "center",
                background: "#fef3f2",
                border: "1px solid #fecdca",
                padding: "10px",
                borderRadius: "12px",
              }}
            >
              {state.error}
            </div>
          )}

          <button
            type="submit"
            disabled={isPending || !email}
            style={{
              width: "100%",
              height: "48px",
              border: "none",
              borderRadius: "12px",
              background: isPending ? "#94a3b8" : "#0b3aa8",
              color: "white",
              fontSize: "0.95rem",
              fontWeight: "800",
              cursor: isPending ? "not-allowed" : "pointer",
              marginTop: "8px",
              boxShadow: "0 12px 28px rgba(11, 58, 168, 0.24)",
              transition: "background 0.2s ease",
            }}
          >
            {isPending ? "Verifying..." : "Verify Code"}
          </button>
        </form>
      </section>
    </main>
  );
}