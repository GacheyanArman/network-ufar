import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/shared/auth/session";
import { createCommunity } from "@/features/communities/server/actions";
import UiIcon from "@/shared/ui/UiIcon";

export default async function CreateCommunityPage() {
  const session = await getSession();
  if (!session?.userId) redirect("/login");

  return (
    <div
      style={{
        maxWidth: 720,
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: 20,
      }}
    >
      <Link href="/communities" className="uf-community-back">
        <UiIcon name="arrow-left" size={18} />
<<<<<<< HEAD
        Back to Groups
=======
        Back to Communities
>>>>>>> bade7c6844d8ae0ad73fb233bf09d978b200e3a6
      </Link>

      <div className="card" style={{ padding: 28 }}>
        <div style={{ marginBottom: 24 }}>
          <h1
            style={{
              margin: "0 0 6px 0",
              color: "var(--text-primary)",
              fontSize: 26,
              fontWeight: 950,
              letterSpacing: "-0.02em",
            }}
          >
<<<<<<< HEAD
            Create Group
=======
            Create Community
>>>>>>> bade7c6844d8ae0ad73fb233bf09d978b200e3a6
          </h1>
          <p
            style={{
              margin: 0,
              color: "var(--text-secondary)",
              fontSize: 15,
            }}
          >
<<<<<<< HEAD
            Start a space for discussions, study groups, materials, and events.
=======
            Start a space for discussions, questions, study groups, materials
            and events.
>>>>>>> bade7c6844d8ae0ad73fb233bf09d978b200e3a6
          </p>
        </div>

        <form
          action={createCommunity}
          style={{ display: "flex", flexDirection: "column", gap: 18 }}
        >
          <Field
<<<<<<< HEAD
            label="Group name"
=======
            label="Community name"
>>>>>>> bade7c6844d8ae0ad73fb233bf09d978b200e3a6
            name="name"
            required
            maxLength={80}
            placeholder="e.g. Finance · 2nd Year"
            hint="Choose a clear, descriptive name that students can easily find."
          />

<<<<<<< HEAD
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
              style={{
                width: "100%",
                padding: "12px 14px",
                border: "1px solid var(--border-color)",
                borderRadius: 12,
                background: "var(--bg-card)",
                fontFamily: "inherit",
                fontSize: 15,
                color: "var(--text-primary)",
              }}
            >
              <option value="faculty_group">Faculty Group</option>
              <option value="year_group">Year Group</option>
              <option value="club">Club</option>
              <option value="student_council">Student Council</option>
              <option value="interest_group">Interest Group</option>
            </select>
          </div>

=======
>>>>>>> bade7c6844d8ae0ad73fb233bf09d978b200e3a6
          <Field
            label="Description"
            name="description"
            textarea
            rows={3}
            maxLength={500}
<<<<<<< HEAD
            placeholder="What is this group about?"
=======
            placeholder="What is this community about?"
>>>>>>> bade7c6844d8ae0ad73fb233bf09d978b200e3a6
          />

          <Field
            label="Rules — one rule per line"
            name="rules"
            textarea
            rows={5}
            maxLength={2000}
            placeholder={`Be respectful\nNo spam\nStay on topic`}
            hint="Numbering will be added automatically on the sidebar."
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
            />
            <Field
              label="Year tag"
              name="yearTag"
              maxLength={20}
              placeholder="e.g. 2nd Year"
            />
          </div>

          <Field
            label="Interests (comma-separated)"
            name="interests"
            maxLength={240}
            placeholder="finance, startups, crypto"
<<<<<<< HEAD
            hint="Used to recommend this group to relevant students."
=======
            hint="Used to recommend this community to relevant students."
>>>>>>> bade7c6844d8ae0ad73fb233bf09d978b200e3a6
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
<<<<<<< HEAD
                Make group private
=======
                Make community private
>>>>>>> bade7c6844d8ae0ad73fb233bf09d978b200e3a6
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
              htmlFor="avatar"
              style={{
                fontWeight: 800,
                fontSize: 14,
                color: "var(--text-primary)",
              }}
            >
              Avatar
            </label>
            <label
              htmlFor="avatar"
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
                id="avatar"
                name="avatar"
                accept="image/*"
                style={{ display: "none" }}
              />
            </label>
            <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>
              Optional. PNG or JPG, max 5 MB.
            </span>
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              justifyContent: "flex-end",
              paddingTop: 4,
            }}
          >
            <Link href="/communities" className="btn btn-secondary">
              Cancel
            </Link>
            <button type="submit" className="btn btn-primary">
<<<<<<< HEAD
              Create Group
=======
              Create Community
>>>>>>> bade7c6844d8ae0ad73fb233bf09d978b200e3a6
            </button>
          </div>
        </form>
      </div>

      <div className="card uf-sidebar-card" style={{ padding: 22 }}>
        <h3 className="uf-sidebar-title">Tips for a great community</h3>
        <ul
          style={{
            margin: 0,
            padding: 0,
            listStyle: "none",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {[
            "Use clear names (e.g. “Finance · 2nd Year” instead of just “Finance”).",
            "Add rules so everyone knows what's on-topic.",
            "Tag your faculty and year — students will see it in recommendations.",
            "Add interests keywords to reach the right audience.",
          ].map((line) => (
            <li
              key={line}
              style={{
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
                color: "var(--text-secondary)",
                fontSize: 14,
                lineHeight: 1.5,
              }}
            >
              <span style={{ color: "var(--success)", flexShrink: 0 }}>
                <UiIcon name="check" size={18} />
              </span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

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
}) {
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
          style={{ ...inputStyle, resize: "none", minHeight: 100 }}
        />
      ) : (
        <input
          type="text"
          name={name}
          defaultValue={defaultValue}
          required={required}
          maxLength={maxLength}
          placeholder={placeholder}
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
