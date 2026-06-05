"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createCommunity } from "@/features/communities/server/actions";
import { createStudyGroup } from "@/features/study-groups/server/actions";
import UiIcon from "@/shared/ui/UiIcon";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function CreateGroupModal({ mode = "community", onClose }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState(null);

  const isCommunity = mode === "community";

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);
  const title = isCommunity ? "Create Group" : "Create Study Group";
  const subtitle = isCommunity
    ? "Start a space for discussions, study groups, materials, and events."
    : "Organize a study session with fellow students.";

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.target);

    startTransition(async () => {
      try {
        if (isCommunity) {
          await createCommunity(fd);
        } else {
          const result = await createStudyGroup(fd);
          if (!result.ok) {
            setError("Failed to create study group");
            return;
          }
        }
        router.refresh();
        onClose();
      } catch (err) {
        setError(err.message || "Something went wrong");
      }
    });
  };

  const inputStyle = {
    width: "100%",
    padding: "12px 14px",
    border: "1px solid var(--border-color)",
    borderRadius: 12,
    background: "var(--bg-card)",
    fontFamily: "inherit",
    fontSize: 15,
    color: "var(--text-primary)",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.55)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: 600,
          maxHeight: "92vh",
          overflowY: "auto",
          padding: 0,
          borderRadius: 14,
          background: "var(--bg-main)",
          textAlign: "left",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div
          style={{
            padding: "24px 28px",
            borderBottom: "1px solid var(--border-color-light)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "sticky",
            top: 0,
            background: "var(--bg-card)",
            zIndex: 10,
          }}
        >
          <div>
            <h2
              style={{
                margin: "0 0 4px 0",
                color: "var(--text-primary)",
                fontSize: 22,
                fontWeight: 950,
                letterSpacing: "-0.02em",
              }}
            >
              {title}
            </h2>
            <p
              style={{
                margin: 0,
                color: "var(--text-secondary)",
                fontSize: 14,
              }}
            >
              {subtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              border: "none",
              background: "var(--bg-hover)",
              color: "var(--text-secondary)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              transition: "all 0.2s ease",
            }}
          >
            <UiIcon name="x" size={18} />
          </button>
        </div>

        {/* ── Form ── */}
        <form
          onSubmit={handleSubmit}
          style={{
            padding: 28,
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
        >
          {error && (
            <div
              style={{
                padding: "12px 16px",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: 12,
                color: "#991b1b",
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              {error}
            </div>
          )}

          {/* ── Community-specific fields ── */}
          {isCommunity && (
            <>
              <Field
                label="Group name"
                name="name"
                required
                maxLength={80}
                placeholder="e.g. Finance · 2nd Year"
                hint="Choose a clear, descriptive name that students can easily find."
                inputStyle={inputStyle}
              />

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label
                  style={{
                    fontWeight: 800,
                    fontSize: 14,
                    color: "var(--text-primary)",
                  }}
                >
                  Group type *
                </label>
                <select
                  name="groupType"
                  required
                  style={inputStyle}
                >
                  <option value="faculty_group">Faculty Group</option>
                  <option value="year_group">Year Group</option>
                  <option value="club">Club</option>
                  <option value="student_council">Student Council</option>
                  <option value="interest_group">Interest Group</option>
                </select>
              </div>

              <Field
                label="Description"
                name="description"
                textarea
                rows={3}
                maxLength={500}
                placeholder="What is this group about?"
                inputStyle={inputStyle}
              />

              <Field
                label="Rules — one rule per line"
                name="rules"
                textarea
                rows={5}
                maxLength={2000}
                placeholder={`Be respectful\nNo spam\nStay on topic`}
                hint="Numbering will be added automatically on the sidebar."
                inputStyle={inputStyle}
              />

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 14,
                }}
              >
                <Field
                  label="Faculty tag"
                  name="facultyTag"
                  maxLength={80}
                  placeholder="Law, Finance, Marketing..."
                  inputStyle={inputStyle}
                />
                <Field
                  label="Year tag"
                  name="yearTag"
                  maxLength={20}
                  placeholder="e.g. 2nd Year"
                  inputStyle={inputStyle}
                />
              </div>

              <Field
                label="Interests (comma-separated)"
                name="interests"
                maxLength={240}
                placeholder="finance, startups, crypto"
                hint="Used to recommend this group to relevant students."
                inputStyle={inputStyle}
              />

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 14px",
                  background: "var(--bg-soft)",
                  border: "1px solid var(--border-color)",
                  borderRadius: 12,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  name="isPrivate"
                  value="true"
                  style={{ width: 18, height: 18 }}
                />
                <div>
                  <div
                    style={{
                      fontWeight: 900,
                      fontSize: 14,
                      color: "var(--text-primary)",
                    }}
                  >
                    Make group private
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: "var(--text-secondary)",
                      marginTop: 2,
                    }}
                  >
                    Students will need approval to join and view posts.
                  </div>
                </div>
              </label>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label
                  htmlFor="cg-avatar"
                  style={{
                    fontWeight: 800,
                    fontSize: 14,
                    color: "var(--text-primary)",
                  }}
                >
                  Avatar
                </label>
                <label
                  htmlFor="cg-avatar"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "12px 16px",
                    border: "1px dashed var(--border-color)",
                    borderRadius: 12,
                    background: "var(--bg-card)",
                    color: "var(--text-secondary)",
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  <UiIcon name="image" size={18} />
                  <span>Choose file…</span>
                  <input
                    type="file"
                    id="cg-avatar"
                    name="avatar"
                    accept="image/*"
                    style={{ display: "none" }}
                  />
                </label>
                <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                  Optional. PNG or JPG, max 5 MB.
                </span>
              </div>
            </>
          )}

          {/* ── Study-group-specific fields ── */}
          {!isCommunity && (
            <>
              <Field
                label="Title"
                name="title"
                required
                maxLength={80}
                placeholder="e.g. Statistics Exam Prep"
                hint="Choose a clear, descriptive title that students can easily find."
                inputStyle={inputStyle}
              />

              <Field
                label="Subject"
                name="subject"
                maxLength={80}
                placeholder="e.g. Statistics, Accounting"
                inputStyle={inputStyle}
              />

              <Field
                label="Faculty"
                name="faculty"
                maxLength={80}
                placeholder="e.g. Finance, Computer Science"
                inputStyle={inputStyle}
              />

              <Field
                label="Description"
                name="description"
                textarea
                rows={3}
                maxLength={1000}
                placeholder="What will you study? Who should join?"
                inputStyle={inputStyle}
              />

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 14,
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label
                    style={{
                      fontWeight: 800,
                      fontSize: 14,
                      color: "var(--text-primary)",
                    }}
                  >
                    Meeting Day
                  </label>
                  <select name="meetingDay" style={inputStyle}>
                    <option value="">Select day</option>
                    {DAYS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <Field
                  label="Meeting Time"
                  name="meetingTime"
                  placeholder="e.g. 18:00"
                  inputStyle={inputStyle}
                />
              </div>

              <Field
                label="Location"
                name="location"
                placeholder="e.g. UFAR Library, Room 301"
                inputStyle={inputStyle}
              />

              <Field
                label="Online Link"
                name="onlineLink"
                placeholder="e.g. Zoom/Google Meet link"
                inputStyle={inputStyle}
              />

              <Field
                label="Max Members"
                name="maxMembers"
                type="number"
                placeholder="10"
                min={2}
                max={100}
                inputStyle={inputStyle}
              />
            </>
          )}

          {/* ── Actions ── */}
          <div
            style={{
              display: "flex",
              gap: 10,
              justifyContent: "flex-end",
              paddingTop: 4,
            }}
          >
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isPending}
              style={{
                opacity: isPending ? 0.6 : 1,
                cursor: isPending ? "not-allowed" : "pointer",
              }}
            >
              {isPending
                ? "Creating…"
                : isCommunity
                  ? "Create Group"
                  : "Create Study Group"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Reusable field sub-component ── */
function Field({
  label,
  name,
  defaultValue,
  required,
  maxLength,
  placeholder,
  hint,
  textarea,
  rows,
  type = "text",
  min,
  max,
  inputStyle,
}) {
  const style = {
    ...inputStyle,
    ...(textarea ? { resize: "none", minHeight: 100 } : {}),
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label
        style={{
          fontWeight: 800,
          fontSize: 14,
          color: "var(--text-primary)",
        }}
      >
        {label}
        {required ? " *" : null}
      </label>
      {textarea ? (
        <textarea
          name={name}
          defaultValue={defaultValue}
          required={required}
          maxLength={maxLength}
          placeholder={placeholder}
          rows={rows || 4}
          style={style}
        />
      ) : (
        <input
          type={type}
          name={name}
          defaultValue={defaultValue}
          required={required}
          maxLength={maxLength}
          placeholder={placeholder}
          min={min}
          max={max}
          style={inputStyle}
        />
      )}
      {hint ? (
        <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>
          {hint}
        </span>
      ) : null}
    </div>
  );
}
