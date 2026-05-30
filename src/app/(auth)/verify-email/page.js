"use client";

import { Suspense } from "react";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { verifyEmailCode } from "@/features/auth/server/actions";
import {
  AuthShell,
  authButtonStyle,
  authErrorStyle,
} from "@/features/auth/components/AuthShell";

function VerifyEmailForm() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const [state, formAction, isPending] = useActionState(verifyEmailCode, null);

  return (
    <AuthShell
      title="Confirm Your Identity"
      subtitle={
        <>
          A verification code has been sent to
          <br />
          <strong style={{ color: "rgba(255,255,255,0.75)", wordBreak: "break-all" }}>
            {email}
          </strong>
        </>
      }
    >
      <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <input type="hidden" name="email" value={email} />

        <input
          name="code"
          type="text"
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          autoComplete="one-time-code"
          required
          style={{
            width: "100%",
            height: "68px",
            background: "rgba(255, 255, 255, 0.06)",
            border: "none",
            borderBottom: "2px solid rgba(44, 90, 160, 0.30)",
            borderRadius: "10px 10px 0 0",
            color: "var(--bg-card)",
            textAlign: "center",
            letterSpacing: "16px",
            fontSize: "2rem",
            fontWeight: 800,
            outline: "none",
            transition: "border-bottom-color 0.2s ease, box-shadow 0.2s ease",
          }}
          placeholder="\u2022\u2022\u2022\u2022\u2022\u2022"
          onFocus={(e) => {
            e.target.style.borderBottomColor = "var(--french-blue)";
            e.target.style.boxShadow = "0 2px 0 0 #2c5aa0";
          }}
          onBlur={(e) => {
            e.target.style.borderBottomColor = "rgba(44, 90, 160, 0.30)";
            e.target.style.boxShadow = "none";
          }}
        />

        {state?.error && <div style={authErrorStyle}>{state.error}</div>}

        <button type="submit" disabled={isPending || !email} style={authButtonStyle(isPending || !email)}>
          {isPending ? "Confirming..." : "Confirm"}
        </button>
      </form>
    </AuthShell>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "var(--french-navy)" }} />}>
      <VerifyEmailForm />
    </Suspense>
  );
}
