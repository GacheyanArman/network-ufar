import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { communities } from "@/lib/schema";
import { getSession } from "@/lib/session";
import { createCommunity } from "@/app/actions/community";
import UiIcon from "@/components/UiIcon";
import Link from "next/link";

export default async function CreateCommunityPage() {
  const session = await getSession();
  if (!session?.userId) redirect("/login");

  return (
    <div style={{ maxWidth: "720px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "20px" }}>
      <div style={{ marginBottom: "8px" }}>
        <Link href="/communities" style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          color: "var(--text-secondary)",
          fontSize: "14px",
          fontWeight: "800",
          textDecoration: "none",
          transition: "color 0.2s ease"
        }}>
          <UiIcon name="arrow-left" size={20} />
          Back to Communities
        </Link>
      </div>

      <div className="card" style={{ padding: "32px" }}>
        <div style={{ marginBottom: "32px" }}>
          <h1 style={{ margin: "0 0 8px 0", color: "var(--text-primary)", fontSize: "28px", fontWeight: "950", letterSpacing: "-0.02em" }}>
            Create Community
          </h1>
          <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "15px" }}>
            Start a new community for UFAR students
          </p>
        </div>

        <form action={createCommunity} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label htmlFor="name" style={{ color: "var(--text-primary)", fontSize: "14px", fontWeight: "800" }}>
              Community Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              placeholder="e.g., Finance — 2nd Year, French Club, Career & Internships"
              maxLength={80}
              required
              style={{
                width: "100%",
                padding: "12px 16px",
                border: "1px solid var(--border-color)",
                borderRadius: "12px",
                background: "#ffffff",
                color: "var(--text-primary)",
                fontSize: "15px",
                fontFamily: "inherit",
                transition: "all 0.2s ease"
              }}
            />
            <span style={{ color: "var(--text-secondary)", fontSize: "13px", lineHeight: "1.4" }}>
              Choose a clear, descriptive name that students can easily find
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label htmlFor="description" style={{ color: "var(--text-primary)", fontSize: "14px", fontWeight: "800" }}>
              Description
            </label>
            <textarea
              id="description"
              name="description"
              placeholder="What is this community about? What topics will be discussed?"
              maxLength={500}
              rows={4}
              style={{
                width: "100%",
                padding: "12px 16px",
                border: "1px solid var(--border-color)",
                borderRadius: "12px",
                background: "#ffffff",
                color: "var(--text-primary)",
                fontSize: "15px",
                fontFamily: "inherit",
                resize: "none",
                lineHeight: "1.5",
                transition: "all 0.2s ease"
              }}
            />
            <span style={{ color: "var(--text-secondary)", fontSize: "13px", lineHeight: "1.4" }}>
              Help students understand what your community is for
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label htmlFor="avatar" style={{ color: "var(--text-primary)", fontSize: "14px", fontWeight: "800" }}>
              Community Avatar
            </label>
            <label htmlFor="avatar" style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "10px",
              padding: "12px 16px",
              border: "1px solid var(--border-color)",
              borderRadius: "12px",
              background: "#ffffff",
              color: "var(--text-secondary)",
              fontSize: "14px",
              fontWeight: "700",
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}>
              <UiIcon name="image" size={20} />
              <span>Choose file...</span>
              <input
                type="file"
                id="avatar"
                name="avatar"
                accept="image/*"
                style={{ display: "none" }}
              />
            </label>
            <span style={{ color: "var(--text-secondary)", fontSize: "13px", lineHeight: "1.4" }}>
              Optional: Upload an image to represent your community
            </span>
          </div>

          <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", paddingTop: "8px", alignItems: "center" }}>
            <Link href="/communities" className="btn btn-secondary" style={{ textDecoration: "none" }}>
              Cancel
            </Link>
            <button type="submit" className="btn btn-primary">
              Create Community
            </button>
          </div>
        </form>
      </div>

      <div className="card" style={{ padding: "24px", background: "var(--bg-soft)", borderColor: "var(--border-color)" }}>
        <h3 style={{ margin: "0 0 16px 0", color: "var(--text-primary)", fontSize: "16px", fontWeight: "900" }}>
          Tips for Creating a Great Community
        </h3>
        <ul style={{
          margin: 0,
          padding: 0,
          listStyle: "none",
          display: "flex",
          flexDirection: "column",
          gap: "12px"
        }}>
          <li style={{ display: "flex", alignItems: "flex-start", gap: "10px", color: "#475569", fontSize: "14px", lineHeight: "1.5" }}>
            <div style={{ flexShrink: 0, marginTop: "2px", color: "#059669" }}>
              <UiIcon name="check" size={18} />
            </div>
            <span>Use clear, specific names (e.g., "Finance — 2nd Year" instead of just "Finance")</span>
          </li>
          <li style={{ display: "flex", alignItems: "flex-start", gap: "10px", color: "#475569", fontSize: "14px", lineHeight: "1.5" }}>
            <div style={{ flexShrink: 0, marginTop: "2px", color: "#059669" }}>
              <UiIcon name="check" size={18} />
            </div>
            <span>Write a helpful description so students know what to expect</span>
          </li>
          <li style={{ display: "flex", alignItems: "flex-start", gap: "10px", color: "#475569", fontSize: "14px", lineHeight: "1.5" }}>
            <div style={{ flexShrink: 0, marginTop: "2px", color: "#059669" }}>
              <UiIcon name="check" size={18} />
            </div>
            <span>Consider creating communities for faculties, years, clubs, or specific interests</span>
          </li>
          <li style={{ display: "flex", alignItems: "flex-start", gap: "10px", color: "#475569", fontSize: "14px", lineHeight: "1.5" }}>
            <div style={{ flexShrink: 0, marginTop: "2px", color: "#059669" }}>
              <UiIcon name="check" size={18} />
            </div>
            <span>Keep the community focused on a specific topic or group</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
