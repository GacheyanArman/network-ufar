"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createStudyGroup } from "@/app/actions/study-groups";
import UiIcon from "@/components/UiIcon";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function CreateStudyGroupPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    startTransition(async () => {
      try {
        const result = await createStudyGroup(fd);
        if (result.ok) router.push("/study-groups");
      } catch (err) {
        alert(err.message || "Failed");
      }
    });
  };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "0 12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button
          type="button"
          onClick={() => router.back()}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", padding: 8 }}
        >
          <UiIcon name="arrow-left" size={20} />
        </button>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#0f172a" }}>
          Create Study Group
        </h1>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <CardInput label="Title *" name="title" placeholder="e.g. Statistics Exam Prep" required />
        <CardInput label="Subject" name="subject" placeholder="e.g. Statistics, Accounting" />
        <CardInput label="Faculty" name="faculty" placeholder="e.g. Finance, Computer Science" />

        <div style={{ background: "#fff", border: "1px solid #d9e2ef", borderRadius: 14, padding: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 800, color: "#0f172a", display: "block", marginBottom: 8 }}>
            Description
          </label>
          <textarea
            name="description"
            placeholder="What will you study? Who should join?"
            maxLength={1000}
            rows={3}
            style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: 10, padding: 10, fontSize: 14, resize: "none", fontFamily: "inherit" }}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ background: "#fff", border: "1px solid #d9e2ef", borderRadius: 14, padding: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 800, color: "#0f172a", display: "block", marginBottom: 8 }}>
              Meeting Day
            </label>
            <select name="meetingDay" style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: 8, padding: 8, fontSize: 14 }}>
              <option value="">Select day</option>
              {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <CardInput label="Meeting Time" name="meetingTime" placeholder="e.g. 18:00" />
        </div>

        <CardInput label="Location" name="location" placeholder="e.g. UFAR Library, Room 301" />
        <CardInput label="Online Link" name="onlineLink" placeholder="e.g. Zoom/Google Meet link" />
        <CardInput label="Max Members" name="maxMembers" type="number" placeholder="10" min={2} max={100} />

        <button
          type="submit"
          disabled={isPending}
          style={{
            padding: "14px 24px",
            borderRadius: 12,
            background: "#0b3aa8",
            color: "#fff",
            border: "none",
            fontSize: 15,
            fontWeight: 800,
            cursor: isPending ? "not-allowed" : "pointer",
            opacity: isPending ? 0.6 : 1,
          }}
        >
          {isPending ? "Creating…" : "Create Study Group"}
        </button>
      </form>
    </div>
  );
}

function CardInput({ label, name, placeholder, required, type = "text", min, max }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #d9e2ef", borderRadius: 14, padding: 16 }}>
      <label style={{ fontSize: 13, fontWeight: 800, color: "#0f172a", display: "block", marginBottom: 8 }}>
        {label}
      </label>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        min={min}
        max={max}
        style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: 8, padding: 8, fontSize: 14 }}
      />
    </div>
  );
}
