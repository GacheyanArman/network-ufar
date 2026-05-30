"use client";

import { Suspense } from "react";
import { useActionState } from "react";
import { resetPassword } from "@/features/auth/server/actions";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  AuthShell,
  authInputStyle,
  authLabelStyle,
  authButtonStyle,
  authErrorStyle,
  authLinkStyle,
} from "@/features/auth/components/AuthShell";

const focusIn = (e) => {
  e.target.style.borderBottomColor = "var(--french-blue)";
  e.target.style.boxShadow = "0 2px 0 0 #2c5aa0";
};
const focusOut = (e) => {
  e.target.style.borderBottomColor = "rgba(255,255,255,0.18)";
  e.target.style.boxShadow = "none";
};

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [state, formAction, isPending] = useActionState(resetPassword, null);

  if (!token) {
    return (
      <AuthShell
        title="Link Expired"
        subtitle="This recovery link is invalid or has expired"
        footer={
          <Link href="/forgot-password" style={authLinkStyle}>
            Request a new link
          </Link>
        }
      />
    );
  }

  return (
    <AuthShell
      title="Choose a New Password"
      subtitle="Create a strong password to secure your account"
      footer={
        <Link href="/login" style={authLinkStyle}>
          Back to entrance
        </Link>
      }
    >
      <form
        action={formAction}
        style={{ display: "flex", flexDirection: "column", gap: "18px" }}
      >
        <input type="hidden" name="token" value={token} />

        <div>
          <label htmlFor="password" style={authLabelStyle}>
            New Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="Minimum 8 characters"
            required
            minLength={8}
            style={authInputStyle}
            onFocus={focusIn}
            onBlur={focusOut}
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" style={authLabelStyle}>
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            minLength={8}
            style={authInputStyle}
            onFocus={focusIn}
            onBlur={focusOut}
          />
        </div>

        {state?.error && <div style={authErrorStyle}>{state.error}</div>}

        <button type="submit" disabled={isPending} style={authButtonStyle(isPending)}>
          {isPending ? "Updating..." : "Update Password"}
        </button>
      </form>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "var(--french-navy)" }} />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
