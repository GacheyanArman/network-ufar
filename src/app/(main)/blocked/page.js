import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { blockedUsers, users } from "@/lib/schema";
import { getSession } from "@/lib/session";
import { eq } from "drizzle-orm";
import BlockButton from "@/components/BlockButton";

export default async function BlockedUsersPage() {
  const session = await getSession();

  if (!session?.userId) {
    redirect("/login");
  }

  const blocked = await db
    .select({
      id: blockedUsers.id,
      blockedId: blockedUsers.blockedId,
      reason: blockedUsers.reason,
      createdAt: blockedUsers.createdAt,
      blockedUserName: users.fullName,
      blockedUserImage: users.image,
      blockedUserUsername: users.username,
    })
    .from(blockedUsers)
    .innerJoin(users, eq(blockedUsers.blockedId, users.id))
    .where(eq(blockedUsers.blockerId, session.userId));

  return (
    <div className="card" style={{ maxWidth: "800px", margin: "0 auto" }}>
      <div style={{ padding: "20px", borderBottom: "1px solid var(--border-color)" }}>
        <h1 style={{ margin: "0 0 8px", fontSize: "24px", fontWeight: 900 }}>
          Blocked Users
        </h1>
        <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "14px" }}>
          Manage users you've blocked. They can't see your content or interact with you.
        </p>
      </div>

      {blocked.length === 0 ? (
        <div style={{ padding: "60px 20px", textAlign: "center" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px", opacity: 0.3 }}>
            🚫
          </div>
          <h3 style={{ margin: "0 0 8px", fontSize: "18px", fontWeight: 800 }}>
            No blocked users
          </h3>
          <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "14px" }}>
            You haven't blocked anyone yet.
          </p>
        </div>
      ) : (
        <div style={{ padding: "16px" }}>
          {blocked.map((block) => {
            const initial = block.blockedUserName?.charAt(0).toUpperCase() || "U";

            return (
              <div
                key={block.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                  padding: "16px",
                  borderRadius: "12px",
                  border: "1px solid var(--border-color)",
                  marginBottom: "12px",
                }}
              >
                <Link
                  href={`/profile/${block.blockedId}`}
                  style={{ textDecoration: "none" }}
                >
                  {block.blockedUserImage ? (
                    <img
                      src={block.blockedUserImage}
                      alt={block.blockedUserName}
                      style={{
                        width: "48px",
                        height: "48px",
                        borderRadius: "50%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "48px",
                        height: "48px",
                        borderRadius: "50%",
                        background: "var(--french-blue)",
                        color: "white",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "18px",
                        fontWeight: 900,
                      }}
                    >
                      {initial}
                    </div>
                  )}
                </Link>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <Link
                    href={`/profile/${block.blockedId}`}
                    style={{ textDecoration: "none" }}
                  >
                    <strong
                      style={{
                        display: "block",
                        fontSize: "15px",
                        fontWeight: 800,
                        color: "var(--text-primary)",
                        marginBottom: "2px",
                      }}
                    >
                      {block.blockedUserName}
                    </strong>
                  </Link>

                  {block.blockedUserUsername && (
                    <span
                      style={{
                        display: "block",
                        fontSize: "14px",
                        color: "var(--text-secondary)",
                        marginBottom: "4px",
                      }}
                    >
                      @{block.blockedUserUsername}
                    </span>
                  )}

                  {block.reason && (
                    <p
                      style={{
                        margin: "4px 0 0",
                        fontSize: "13px",
                        color: "var(--text-muted)",
                      }}
                    >
                      Reason: {block.reason}
                    </p>
                  )}

                  <span
                    style={{
                      display: "block",
                      fontSize: "12px",
                      color: "var(--text-muted)",
                      marginTop: "4px",
                    }}
                  >
                    Blocked {new Date(block.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <BlockButton
                  userId={block.blockedId}
                  userName={block.blockedUserName}
                  isBlocked={true}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
