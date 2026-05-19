"use client";

import { useActionState } from "react";
import { requestPasswordReset } from "@/features/auth/server/actions";
import Link from "next/link";
import {
  AuthShell,
  authInputStyle,
  authLabelStyle,
  authButtonStyle,
  authErrorStyle,
  authSuccessStyle,
  authLinkStyle,
} from "@/features/auth/components/AuthShell";

export default function ForgotPasswordPage() {
  const [state, formAction, isPending] = useActionState(requestPasswordReset, null);

  return (
    <AuthShell
      title="Recover Access"
      subtitle="We'll send recovery instructions to your email"
      footer={
        <Link href="/login" style={authLinkStyle}>
          Back to entrance
        </Link>
      }
    >
      {state?.success ? (
        <div style={authSuccessStyle}>
          If an account exists with that email, recovery instructions have been sent. Check your inbox.
        </div>
      ) : (
        <form
          action={formAction}
          style={{ display: "flex", flexDirection: "column", gap: "18px" }}
        >
          <div>
            <label htmlFor="email" style={authLabelStyle}>
              UFAR Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="name@ufar.com"
              required
              style={authInputStyle}
              onFocus={(e) => {
                e.target.style.borderBottomColor = "var(--french-gold)";
                e.target.style.boxShadow = "0 2px 0 0 #d4af37";
              }}
              onBlur={(e) => {
                e.target.style.borderBottomColor = "rgba(255,255,255,0.18)";
                e.target.style.boxShadow = "none";
              }}
            />
          </div>

          {state?.error && <div style={authErrorStyle}>{state.error}</div>}

          <button type="submit" disabled={isPending} style={authButtonStyle(isPending)}>
            {isPending ? "Sending..." : "Send Instructions"}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
