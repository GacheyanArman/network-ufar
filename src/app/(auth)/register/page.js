"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerUser } from "@/app/actions/auth";

export default function RegisterPage() {
  const [state, formAction, isPending] = useActionState(registerUser, null);

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
          maxWidth: "460px",
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
              fontWeight: "800",
              margin: "0 auto 16px",
              boxShadow: "0 12px 30px rgba(11, 58, 168, 0.28)",
            }}
          >
            U
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: "1.75rem",
              lineHeight: 1.2,
              fontWeight: "800",
              color: "#0f172a",
            }}
          >
            Create account
          </h1>

          <p
            style={{
              margin: "8px 0 0",
              color: "#64748b",
              fontSize: "0.95rem",
            }}
          >
            Join UFARnet with your university email
          </p>
        </div>

        <form
          action={formAction}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <div>
            <label
              htmlFor="fullName"
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "0.88rem",
                fontWeight: "700",
                color: "#334155",
              }}
            >
              Full name
            </label>

            <input
              id="fullName"
              name="fullName"
              type="text"
              placeholder="Your name"
              required
              style={inputStyle}
            />
          </div>

          <div>
            <label
              htmlFor="email"
              style={labelStyle}
            >
              University Email
            </label>

            <input
              id="email"
              name="email"
              type="email"
              placeholder="student@ufar.com"
              required
              style={inputStyle}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              style={labelStyle}
            >
              Password
            </label>

            <input
              id="password"
              name="password"
              type="password"
              placeholder="Minimum 6 characters"
              required
              minLength={6}
              style={inputStyle}
            />
          </div>

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
            disabled={isPending}
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
              marginTop: "4px",
              boxShadow: "0 12px 28px rgba(11, 58, 168, 0.24)",
            }}
          >
            {isPending ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p
          style={{
            margin: "24px 0 0",
            textAlign: "center",
            color: "#475569",
            fontSize: "0.92rem",
          }}
        >
          Already have an account?{" "}
          <Link
            href="/login"
            style={{
              color: "#0b3aa8",
              fontWeight: "800",
              textDecoration: "none",
            }}
          >
            Log in
          </Link>
        </p>
      </section>
    </main>
  );
}

const labelStyle = {
  display: "block",
  marginBottom: "8px",
  fontSize: "0.88rem",
  fontWeight: "700",
  color: "#334155",
};

const inputStyle = {
  width: "100%",
  height: "46px",
  boxSizing: "border-box",
  border: "1px solid #cbd5e1",
  borderRadius: "12px",
  padding: "0 14px",
  fontSize: "0.95rem",
  outline: "none",
  background: "#f8fafc",
  color: "#0f172a",
};