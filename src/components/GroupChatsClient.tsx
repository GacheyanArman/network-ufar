"use client";

import { useState } from "react";
import { createGroupChat, joinGroupChat, leaveGroupChat } from "@/app/actions/groupChats";
import { useRouter } from "next/navigation";

export default function GroupChatsClient({ allGroupChats, membershipSet, currentUserId }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();

  const handleCreateGroup = async (formData) => {
    await createGroupChat(formData);
    setIsModalOpen(false);
    router.refresh();
  };

  const handleJoinGroup = async (formData) => {
    await joinGroupChat(formData);
    router.refresh();
  };

  const handleLeaveGroup = async (formData) => {
    await leaveGroupChat(formData);
    router.refresh();
  };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <h1>Group Chats</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px", margin: "8px 0 0" }}>
            Join groups by faculty, course, or interest
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn btn-primary"
        >
          Create Group
        </button>
      </div>

      {/* Group List */}
      {allGroupChats.length === 0 ? (
        <div className="old-empty">
          <div style={{ fontSize: "48px", marginBottom: "16px", opacity: 0.3 }}>
            👥
          </div>
          <h3 style={{ margin: "0 0 8px", fontSize: "18px", fontWeight: 800 }}>
            No groups found
          </h3>
          <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "14px" }}>
            Create the first group for your faculty or course!
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
          {allGroupChats.map((group) => {
            const isMember = membershipSet.has(group.id);

            return (
              <div
                key={group.id}
                style={{
                  border: "1px solid var(--border-color)",
                  borderRadius: "12px",
                  padding: "16px",
                  background: "var(--bg-primary)",
                }}
              >
                <div style={{ display: "flex", alignItems: "start", gap: "12px", marginBottom: "12px" }}>
                  <div
                    style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "50%",
                      background: "var(--french-blue)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "24px",
                      flexShrink: 0,
                    }}
                  >
                    👥
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ margin: "0 0 4px", fontSize: "16px", fontWeight: 900 }}>
                      {group.name}
                    </h3>
                    <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                      {group.memberCount} {group.memberCount === 1 ? "member" : "members"}
                    </div>
                  </div>
                </div>

                {group.description && (
                  <p
                    style={{
                      margin: "0 0 12px",
                      fontSize: "14px",
                      color: "var(--text-secondary)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                    }}
                  >
                    {group.description}
                  </p>
                )}

                {(group.faculty || group.course) && (
                  <div style={{ display: "flex", gap: "8px", marginBottom: "12px", flexWrap: "wrap" }}>
                    {group.faculty && (
                      <span
                        style={{
                          padding: "4px 8px",
                          borderRadius: "6px",
                          background: "var(--bg-secondary)",
                          fontSize: "12px",
                          fontWeight: 600,
                        }}
                      >
                        🏛️ {group.faculty}
                      </span>
                    )}
                    {group.course && (
                      <span
                        style={{
                          padding: "4px 8px",
                          borderRadius: "6px",
                          background: "var(--bg-secondary)",
                          fontSize: "12px",
                          fontWeight: 600,
                        }}
                      >
                        📚 {group.course}
                      </span>
                    )}
                  </div>
                )}

                <div style={{ display: "flex", gap: "8px" }}>
                  {isMember ? (
                    <>
                      <a
                        href={`/messages?group=${group.id}`}
                        className="btn btn-primary"
                        style={{ flex: 1, textAlign: "center", textDecoration: "none" }}
                      >
                        Open Chat
                      </a>
                      <form action={handleLeaveGroup} style={{ flex: 1 }}>
                        <input type="hidden" name="groupChatId" value={group.id} />
                        <button type="submit" className="btn btn-secondary" style={{ width: "100%" }}>
                          Leave
                        </button>
                      </form>
                    </>
                  ) : (
                    <form action={handleJoinGroup} style={{ width: "100%" }}>
                      <input type="hidden" name="groupChatId" value={group.id} />
                      <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>
                        Join Group
                      </button>
                    </form>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Group Modal */}
      {isModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsModalOpen(false);
            }
          }}
        >
          <div className="card" style={{ maxWidth: "500px", width: "90%", padding: "24px" }}>
            <h2 style={{ margin: "0 0 16px", fontSize: "20px", fontWeight: 900 }}>
              Create Group Chat
            </h2>

            <form action={handleCreateGroup}>
              <label style={{ display: "block", marginBottom: "16px" }}>
                <span style={{ display: "block", marginBottom: "8px", fontWeight: 700 }}>
                  Group Name *
                </span>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="e.g., Computer Science 2024"
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "1px solid var(--border-color)",
                  }}
                />
              </label>

              <label style={{ display: "block", marginBottom: "16px" }}>
                <span style={{ display: "block", marginBottom: "8px", fontWeight: 700 }}>
                  Description
                </span>
                <textarea
                  name="description"
                  rows={3}
                  placeholder="What is this group about?"
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "1px solid var(--border-color)",
                    resize: "vertical",
                  }}
                />
              </label>

              <label style={{ display: "block", marginBottom: "16px" }}>
                <span style={{ display: "block", marginBottom: "8px", fontWeight: 700 }}>
                  Faculty
                </span>
                <input
                  type="text"
                  name="faculty"
                  placeholder="e.g., Computer Science"
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "1px solid var(--border-color)",
                  }}
                />
              </label>

              <label style={{ display: "block", marginBottom: "16px" }}>
                <span style={{ display: "block", marginBottom: "8px", fontWeight: 700 }}>
                  Course/Year
                </span>
                <input
                  type="text"
                  name="course"
                  placeholder="e.g., 2024, Year 3"
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "1px solid var(--border-color)",
                  }}
                />
              </label>

              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
