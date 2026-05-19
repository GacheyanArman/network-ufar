"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerUser } from "@/features/auth/server/actions";
import {
  AuthShell,
  authErrorStyle,
} from "@/features/auth/components/AuthShell";

export default function RegisterPage() {
  const [state, formAction, isPending] = useActionState(registerUser, null);

  return (
    <AuthShell
      title="Join the Network"
      subtitle="Reserved for UFAR students"
      footer={
        <>
          Already inside?{" "}
          <Link href="/login" className="auth-link">
            Enter
          </Link>
        </>
      }
    >
      <form
        action={formAction}
        style={{ display: "flex", flexDirection: "column", gap: "18px" }}
      >
        <div>
          <label htmlFor="fullName" className="auth-label">
            Full Name
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            placeholder="Your name"
            required
            className="auth-input"
          />
        </div>

        <div>
          <label htmlFor="email" className="auth-label">
            Email Address
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
          <label htmlFor="inviteCode" className="auth-label">
            Invite Code (Optional)
          </label>
          <input
            id="inviteCode"
            name="inviteCode"
            type="text"
            placeholder="For non-UFAR emails"
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
            placeholder="Minimum 8 characters"
            required
            minLength={8}
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
          {isPending ? "Joining…" : "Join"}
        </button>
      </form>
    </AuthShell>
  );
}
