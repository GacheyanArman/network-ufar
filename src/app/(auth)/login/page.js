"use client";

import { useActionState } from "react";
import { loginUser } from "@/features/auth/server/actions";
import Link from "next/link";
import {
  AuthShell,
  authErrorStyle,
  authLinkStyle,
} from "@/features/auth/components/AuthShell";

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginUser, null);

  return (
    <AuthShell
      title="Enter the UFAR Network"
      subtitle="Your gateway to the community"
      footer={
        <>
          Not yet a member?{" "}
          <Link href="/register" className="auth-link">
            Request access
          </Link>
        </>
      }
    >
      <form
        action={formAction}
        style={{ display: "flex", flexDirection: "column", gap: "18px" }}
      >
        <div>
          <label htmlFor="email" className="auth-label">
            UFAR Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="name@ufar.com"
            required
            className="auth-input"
          />
        </div>

        <div>
          <label htmlFor="password" className="auth-label">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            className="auth-input"
          />
        </div>

        {state?.error && <div style={authErrorStyle}>{state.error}</div>}

        <button
          type="submit"
          disabled={isPending}
          className={`btn-base btn-lg ${isPending ? "btn-disabled" : ""}`}
          style={{
            width: "100%",
            background: isPending
              ? "rgba(255,255,255,0.08)"
              : "linear-gradient(135deg, #1e3a5f, #2c5aa0)",
            color: isPending ? "rgba(255,255,255,0.35)" : "var(--bg-card)",
            border: "1px solid rgba(212,175,55,0.25)",
            letterSpacing: "0.06em",
            marginTop: "6px",
          }}
        >
          {isPending ? "Entering…" : "Enter"}
        </button>

        <p style={{ textAlign: "center", margin: "4px 0 0" }}>
          <Link href="/forgot-password" className="auth-link" style={{ fontWeight: 500, fontSize: "0.82rem" }}>
            Lost your password?
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
