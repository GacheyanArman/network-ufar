import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { db } from "@/shared/db/db";
import { communities } from "@/shared/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/shared/auth/session";
import { getCommunityContext } from "@/features/communities/server/queries";
import { updateCommunity, deleteCommunity } from "@/features/communities/server/actions";
import UiIcon from "@/shared/ui/UiIcon";

export default async function CommunitySettingsPage({ params }) {
  const session = await getSession();
  if (!session?.userId) redirect("/login");

  const { id } = await params;

  const [community] = await db
    .select()
    .from(communities)
    .where(eq(communities.id, id))
    .limit(1);

  if (!community) notFound();

  const ctx = await getCommunityContext(id, session.userId);
  if (!ctx.isOwner) redirect(`/communities/${id}`);

  const firstInterest = (community.interests || "").split(",")[0]?.trim();
  const groupType = ["faculty_group", "year_group", "club", "student_council", "interest_group"].includes(firstInterest) ? firstInterest : "interest_group";
  const userInterests = (community.interests || "")
    .split(/[,;]+/)
    .map((t) => t.trim())
    .filter((t) => !["faculty_group", "year_group", "club", "student_council", "interest_group"].includes(t))
    .filter(Boolean)
    .join(", ");

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
      <Link href={`/communities/${id}`} className="uf-community-back">
        <UiIcon name="arrow-left" size={18} />
        Back to group
      </Link>

      <div className="card" style={{ padding: 28 }}>
        <h1
          style={{
            margin: "0 0 4px 0",
            fontSize: 24,
            fontWeight: 950,
            letterSpacing: "-0.02em",
            color: "var(--text-primary)",
          }}
        >
          Group settings
        </h1>
        <p
          style={{
            margin: "0 0 20px 0",
            color: "var(--text-secondary)",
            fontSize: 15,
          }}
        >
          Update your group details, rules, and privacy.
        </p>

        <form
          action={updateCommunity}
          style={{ display: "flex", flexDirection: "column", gap: 18 }}
        >
          <input type="hidden" name="communityId" value={id} />

          <Field
            label="Group name"
            name="name"
            defaultValue={community.name}
            required
            maxLength={80}
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
              defaultValue={groupType}
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

          <Field
            label="Description"
            name="description"
            defaultValue={community.description || ""}
            textarea
            rows={3}
            maxLength={500}
          />

          <Field
            label="Rules — one rule per line"
            name="rules"
            defaultValue={community.rules || ""}
            textarea
            rows={6}
            maxLength={2000}
            hint="These rules will be shown in the sidebar. Numbering is added automatically."
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
              defaultValue={community.facultyTag || ""}
              maxLength={80}
            />
            <Field
              label="Year tag"
              name="yearTag"
              defaultValue={community.yearTag || ""}
              maxLength={20}
              placeholder="e.g. 2nd Year"
            />
          </div>

          <Field
            label="Interests (comma-separated)"
            name="interests"
            defaultValue={userInterests}
            maxLength={240}
            placeholder="finance, marketing, crypto"
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
              defaultChecked={community.isPrivate}
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
                Private group
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "var(--text-secondary)",
                  marginTop: 2,
                }}
              >
                Only approved members can see posts and participate.
              </div>
            </div>
          </label>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
            }}
          >
            <Link href={`/communities/${id}`} className="btn btn-secondary">
              Cancel
            </Link>
            <button type="submit" className="btn btn-primary">
              Save changes
            </button>
          </div>
        </form>
      </div>

      <div
        className="card"
        style={{
          padding: 22,
          border: "1px solid #fca5a5",
          background: "var(--danger-soft)",
        }}
      >
        <h3
          style={{
            margin: "0 0 8px 0",
            color: "var(--danger)",
            fontSize: 16,
            fontWeight: 900,
          }}
        >
          Danger zone
        </h3>
        <p
          style={{
            margin: "0 0 14px 0",
            color: "#7f1d1d",
            fontSize: 14,
          }}
        >
          Deleting the group is irreversible. All posts, members and
          requests will be removed.
        </p>
        <form action={deleteCommunity}>
          <input type="hidden" name="communityId" value={id} />
          <button
            type="submit"
            className="btn btn-secondary"
            style={{
              borderColor: "var(--danger-soft)",
              color: "var(--danger)",
            }}
          >
            Delete group
          </button>
        </form>
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
