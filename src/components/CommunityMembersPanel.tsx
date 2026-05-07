"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import UiIcon from "@/components/UiIcon";
import {
  approveJoinRequest,
  rejectJoinRequest,
  removeMember,
  setMemberRole,
} from "@/app/actions/community";

export type Member = {
  userId: string;
  fullName: string | null;
  avatarUrl: string | null;
  image: string | null;
  role: string;
  joinedAt?: Date | string | null;
};

export type JoinRequest = {
  id: string;
  userId: string;
  fullName: string | null;
  avatarUrl: string | null;
  image: string | null;
  faculty: string | null;
  message: string | null;
  createdAt: Date | string | null;
};

type Props = {
  communityId: string;
  ownerId: string;
  members: Member[];
  requests: JoinRequest[];
  currentUserId: string;
  canManage: boolean;
  isOwner: boolean;
  initialTab?: "members" | "requests";
};

export default function CommunityMembersPanel({
  communityId,
  ownerId,
  members,
  requests,
  currentUserId,
  canManage,
  isOwner,
  initialTab = "members",
}: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"members" | "requests">(initialTab);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [open]);

  const filteredMembers = members.filter((m) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return m.fullName?.toLowerCase().includes(q);
  });

  const moderators = filteredMembers.filter(
    (m) => m.role === "owner" || m.role === "admin" || m.role === "moderator"
  );
  const regular = filteredMembers.filter(
    (m) => !(m.role === "owner" || m.role === "admin" || m.role === "moderator")
  );

  return (
    <>
      <button
        type="button"
        className="btn btn-secondary"
        style={{ minHeight: 44, padding: "0 16px" }}
        onClick={() => {
          setTab("members");
          setOpen(true);
        }}
      >
        <UiIcon name="users" size={16} />
        <span style={{ marginLeft: 6 }}>
          Members · {members.length}
        </span>
      </button>

      {canManage && requests.length > 0 ? (
        <button
          type="button"
          className="btn btn-secondary"
          style={{ minHeight: 44, padding: "0 16px", position: "relative" }}
          onClick={() => {
            setTab("requests");
            setOpen(true);
          }}
        >
          <UiIcon name="user-plus" size={16} />
          <span style={{ marginLeft: 6 }}>Requests</span>
          <span
            className="uf-role-badge blue"
            style={{ marginLeft: 8 }}
            aria-label={`${requests.length} pending`}
          >
            {requests.length}
          </span>
        </button>
      ) : null}

      {open ? (
        <div className="uf-members-overlay" role="dialog" aria-modal="true">
          <div className="uf-members-panel">
            <div className="uf-members-panel-header">
              <h3 className="uf-members-panel-title">Community members</h3>
              <button
                type="button"
                className="uf-members-panel-close"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                <UiIcon name="close" size={18} />
              </button>
            </div>

            <div className="uf-members-panel-tabs">
              <button
                type="button"
                className={`uf-community-tab ${tab === "members" ? "is-active" : ""}`}
                onClick={() => setTab("members")}
              >
                <UiIcon name="users" size={14} />
                <span>Members</span>
                <span className="uf-community-tab-count">{members.length}</span>
              </button>

              {canManage ? (
                <button
                  type="button"
                  className={`uf-community-tab ${tab === "requests" ? "is-active" : ""}`}
                  onClick={() => setTab("requests")}
                >
                  <UiIcon name="user-plus" size={14} />
                  <span>Requests</span>
                  {requests.length > 0 ? (
                    <span className="uf-community-tab-count">
                      {requests.length}
                    </span>
                  ) : null}
                </button>
              ) : null}
            </div>

            {tab === "members" ? (
              <>
                <div
                  style={{
                    padding: "10px 16px",
                    borderBottom: "1px solid var(--border-color-light)",
                  }}
                >
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search members..."
                    style={{
                      width: "100%",
                      height: 38,
                      padding: "0 12px",
                      borderRadius: 10,
                      border: "1px solid var(--border-color)",
                      fontSize: 14,
                    }}
                  />
                </div>

                <div className="uf-members-panel-body">
                  {moderators.length > 0 ? (
                    <>
                      <div
                        style={{
                          padding: "8px 12px",
                          fontSize: 11,
                          color: "var(--text-muted)",
                          fontWeight: 900,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                        }}
                      >
                        Moderators & owner
                      </div>
                      {moderators.map((m) => (
                        <MemberRow
                          key={m.userId}
                          member={m}
                          ownerId={ownerId}
                          communityId={communityId}
                          currentUserId={currentUserId}
                          isOwner={isOwner}
                          isPending={isPending}
                          onRoleChange={(fd) =>
                            startTransition(async () => {
                              await setMemberRole(fd);
                            })
                          }
                          onRemove={(fd) =>
                            startTransition(async () => {
                              await removeMember(fd);
                            })
                          }
                        />
                      ))}
                    </>
                  ) : null}

                  {regular.length > 0 ? (
                    <>
                      <div
                        style={{
                          padding: "8px 12px",
                          fontSize: 11,
                          color: "var(--text-muted)",
                          fontWeight: 900,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                        }}
                      >
                        Members
                      </div>
                      {regular.map((m) => (
                        <MemberRow
                          key={m.userId}
                          member={m}
                          ownerId={ownerId}
                          communityId={communityId}
                          currentUserId={currentUserId}
                          isOwner={isOwner}
                          isPending={isPending}
                          onRoleChange={(fd) =>
                            startTransition(async () => {
                              await setMemberRole(fd);
                            })
                          }
                          onRemove={(fd) =>
                            startTransition(async () => {
                              await removeMember(fd);
                            })
                          }
                        />
                      ))}
                    </>
                  ) : null}

                  {filteredMembers.length === 0 ? (
                    <div className="uf-empty-state" style={{ padding: 40 }}>
                      <p className="uf-empty-description">No members found.</p>
                    </div>
                  ) : null}
                </div>
              </>
            ) : (
              <div className="uf-members-panel-body">
                {requests.length === 0 ? (
                  <div className="uf-empty-state" style={{ padding: 40 }}>
                    <div className="uf-empty-icon">
                      <UiIcon name="user-plus" size={32} />
                    </div>
                    <h3 className="uf-empty-title">No pending requests</h3>
                    <p className="uf-empty-description">
                      When someone asks to join, you&apos;ll see their request
                      here.
                    </p>
                  </div>
                ) : (
                  <div style={{ padding: "10px 12px" }}>
                    {requests.map((r) => (
                      <div key={r.id} className="uf-request-card">
                        <Link
                          href={`/profile/${r.userId}`}
                          className="uf-sidebar-member-row"
                          style={{ textDecoration: "none" }}
                        >
                          <Avatar name={r.fullName} src={r.image || r.avatarUrl} />
                          <div style={{ minWidth: 0 }}>
                            <div className="uf-sidebar-member-name">
                              {r.fullName || "Student"}
                            </div>
                            <div className="uf-member-meta">
                              {r.faculty || ""}
                            </div>
                          </div>
                        </Link>

                        {r.message ? (
                          <p className="uf-request-message">{r.message}</p>
                        ) : null}

                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            flexWrap: "wrap",
                          }}
                        >
                          <form
                            action={(fd) =>
                              startTransition(async () => {
                                fd.append("requestId", r.id);
                                await approveJoinRequest(fd);
                              })
                            }
                          >
                            <button
                              type="submit"
                              className="uf-chip-btn primary"
                              disabled={isPending}
                            >
                              <UiIcon name="check" size={14} />
                              Approve
                            </button>
                          </form>
                          <form
                            action={(fd) =>
                              startTransition(async () => {
                                fd.append("requestId", r.id);
                                await rejectJoinRequest(fd);
                              })
                            }
                          >
                            <button
                              type="submit"
                              className="uf-chip-btn danger"
                              disabled={isPending}
                            >
                              <UiIcon name="close" size={14} />
                              Reject
                            </button>
                          </form>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}

function MemberRow({
  member,
  ownerId,
  communityId,
  currentUserId,
  isOwner,
  isPending,
  onRoleChange,
  onRemove,
}: {
  member: Member;
  ownerId: string;
  communityId: string;
  currentUserId: string;
  isOwner: boolean;
  isPending: boolean;
  onRoleChange: (fd: FormData) => void;
  onRemove: (fd: FormData) => void;
}) {
  const isOwnerRow = member.userId === ownerId || member.role === "owner" || member.role === "admin";
  const isMod = member.role === "moderator";
  const isSelf = member.userId === currentUserId;

  const badge = isOwnerRow
    ? { label: "Owner", cls: "gold" }
    : isMod
      ? { label: "Moderator", cls: "blue" }
      : null;

  return (
    <div className="uf-member-row">
      <Avatar name={member.fullName} src={member.image || member.avatarUrl} />
      <div style={{ minWidth: 0 }}>
        <Link
          href={`/profile/${member.userId}`}
          className="uf-member-name"
          style={{ textDecoration: "none" }}
        >
          {member.fullName || "Student"}
        </Link>
        <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 2 }}>
          {badge ? (
            <span className={`uf-role-badge ${badge.cls}`}>{badge.label}</span>
          ) : (
            <span className="uf-member-meta">Member</span>
          )}
        </div>
      </div>

      {!isOwnerRow && isOwner && !isSelf ? (
        <div style={{ display: "flex", gap: 6 }}>
          {isMod ? (
            <form
              action={(fd) => {
                fd.append("communityId", communityId);
                fd.append("targetUserId", member.userId);
                fd.append("role", "member");
                onRoleChange(fd);
              }}
            >
              <button
                type="submit"
                className="uf-chip-btn"
                disabled={isPending}
              >
                Demote
              </button>
            </form>
          ) : (
            <form
              action={(fd) => {
                fd.append("communityId", communityId);
                fd.append("targetUserId", member.userId);
                fd.append("role", "moderator");
                onRoleChange(fd);
              }}
            >
              <button
                type="submit"
                className="uf-chip-btn"
                disabled={isPending}
              >
                Make moderator
              </button>
            </form>
          )}
          <form
            action={(fd) => {
              fd.append("communityId", communityId);
              fd.append("targetUserId", member.userId);
              onRemove(fd);
            }}
          >
            <button
              type="submit"
              className="uf-chip-btn danger"
              disabled={isPending}
              aria-label="Remove member"
              title="Remove member"
            >
              <UiIcon name="x" size={14} />
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function Avatar({ name, src }: { name: string | null; src: string | null }) {
  const initial = (name || "S").charAt(0).toUpperCase();
  return (
    <div className="uf-community-avatar tiny" style={{ borderRadius: 999 }}>
      {src ? (
        <img
          src={src}
          alt={name || ""}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        initial
      )}
    </div>
  );
}
