import { asc, desc, eq, inArray, or, and, ilike, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { messages, users, groupChats, groupChatMembers } from "@/lib/schema";
import { getSession } from "@/lib/session";
import { sendMessage } from "@/app/actions/messages";
import { sendGroupMessage } from "@/app/actions/groupChats";
import MessagesClient from "@/components/MessagesClient";

export default async function MessagesPage({ searchParams }) {
  const session = await getSession();
  if (!session?.userId) redirect("/login");

  const params = await searchParams;
  const activeUserId = params?.user?.toString() || "";
  const activeGroupId = params?.group?.toString() || "";
  const q = params?.q?.toString().trim() || "";

  // Get user's group chats
  const userGroupChats = await db
    .select({
      id: groupChats.id,
      name: groupChats.name,
      description: groupChats.description,
      avatar: groupChats.avatar,
      faculty: groupChats.faculty,
      course: groupChats.course,
      creatorId: groupChats.creatorId,
      createdAt: groupChats.createdAt,
    })
    .from(groupChats)
    .innerJoin(groupChatMembers, eq(groupChats.id, groupChatMembers.groupChatId))
    .where(eq(groupChatMembers.userId, session.userId))
    .orderBy(desc(groupChats.updatedAt));

  // Get recent direct messages
  const recentMessages = await db
    .select({
      id: messages.id,
      senderId: messages.senderId,
      receiverId: messages.receiverId,
      content: messages.content,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .where(
      and(
        or(
          eq(messages.senderId, session.userId),
          eq(messages.receiverId, session.userId)
        ),
        isNull(messages.groupChatId)
      )
    )
    .orderBy(desc(messages.createdAt))
    .limit(200);

  const conversationsMap = new Map();

  for (const message of recentMessages) {
    const partnerId =
      message.senderId === session.userId
        ? message.receiverId
        : message.senderId;

    if (!conversationsMap.has(partnerId)) {
      conversationsMap.set(partnerId, message);
    }
  }

  const partnerIds = Array.from(conversationsMap.keys());

  const partnerRows =
    partnerIds.length > 0
      ? await db
          .select({
            id: users.id,
            fullName: users.fullName,
            faculty: users.faculty,
            image: users.image,
          })
          .from(users)
          .where(inArray(users.id, partnerIds))
      : [];

  const usersById = new Map(partnerRows.map((user) => [user.id, user]));

  const conversations = partnerIds
    .map((id) => ({
      user: usersById.get(id),
      lastMessage: conversationsMap.get(id),
    }))
    .filter((item) => item.user);

  const searchUsers = q
    ? await db
        .select({
          id: users.id,
          fullName: users.fullName,
          faculty: users.faculty,
          image: users.image,
        })
        .from(users)
        .where(and(ilike(users.fullName, `%${q}%`)))
        .limit(10)
    : [];

  const selectedUserId = activeUserId || conversations[0]?.user?.id || "";
  const selectedGroupId = activeGroupId || "";

  const [activeUser] = selectedUserId
    ? await db
        .select({
          id: users.id,
          fullName: users.fullName,
          faculty: users.faculty,
          image: users.image,
        })
        .from(users)
        .where(eq(users.id, selectedUserId))
        .limit(1)
    : [];

  const [activeGroup] = selectedGroupId
    ? await db
        .select({
          id: groupChats.id,
          name: groupChats.name,
          description: groupChats.description,
          avatar: groupChats.avatar,
          faculty: groupChats.faculty,
          course: groupChats.course,
        })
        .from(groupChats)
        .where(eq(groupChats.id, selectedGroupId))
        .limit(1)
    : [];

  const history =
    selectedUserId && activeUser
      ? await db
          .select({
            id: messages.id,
            senderId: messages.senderId,
            receiverId: messages.receiverId,
            content: messages.content,
            createdAt: messages.createdAt,
          })
          .from(messages)
          .where(
            and(
              or(
                and(
                  eq(messages.senderId, session.userId),
                  eq(messages.receiverId, selectedUserId)
                ),
                and(
                  eq(messages.senderId, selectedUserId),
                  eq(messages.receiverId, session.userId)
                )
              ),
              isNull(messages.groupChatId)
            )
          )
          .orderBy(asc(messages.createdAt))
          .limit(100)
      : selectedGroupId && activeGroup
      ? await db
          .select({
            id: messages.id,
            senderId: messages.senderId,
            receiverId: messages.receiverId,
            content: messages.content,
            createdAt: messages.createdAt,
          })
          .from(messages)
          .where(eq(messages.groupChatId, selectedGroupId))
          .orderBy(asc(messages.createdAt))
          .limit(100)
      : [];

  return (
    <div className="messenger-card">
      <aside className="messenger-sidebar">
        <form className="messenger-search-header">
          <input
            type="text"
            name="q"
            defaultValue={q}
            className="messenger-search-input"
            placeholder="Search students..."
          />
        </form>

        <div className="chat-list-container">
          {/* Group Chats Section */}
          {userGroupChats.length > 0 && (
            <div style={{ marginBottom: "16px" }}>
              <div
                style={{
                  padding: "8px 14px",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "var(--text-secondary)",
                  textTransform: "uppercase",
                }}
              >
                Group Chats
              </div>
              {userGroupChats.map((group) => (
                <a
                  key={group.id}
                  href={`/messages?group=${group.id}`}
                  style={{
                    display: "block",
                    padding: "14px",
                    textDecoration: "none",
                    color: "var(--text-primary)",
                    background:
                      group.id === selectedGroupId
                        ? "var(--bg-main)"
                        : "transparent",
                    borderBottom: "1px solid var(--border-color-light)",
                  }}
                >
                  <strong>👥 {group.name}</strong>
                  {group.faculty && (
                    <p
                      style={{
                        margin: "4px 0 0",
                        color: "var(--text-secondary)",
                        fontSize: "0.84rem",
                      }}
                    >
                      {group.faculty}
                      {group.course && ` • ${group.course}`}
                    </p>
                  )}
                </a>
              ))}
            </div>
          )}

          {/* Direct Messages Section */}
          <div
            style={{
              padding: "8px 14px",
              fontSize: "12px",
              fontWeight: 700,
              color: "var(--text-secondary)",
              textTransform: "uppercase",
            }}
          >
            Direct Messages
          </div>

          {q && searchUsers.length > 0 && (
            <div
              style={{
                padding: "10px",
                borderBottom: "1px solid var(--border-color-light)",
              }}
            >
              {searchUsers
                .filter((user) => user.id !== session.userId)
                .map((user) => (
                  <a
                    key={user.id}
                    href={`/messages?user=${user.id}`}
                    style={{
                      display: "block",
                      padding: "10px",
                      textDecoration: "none",
                      color: "var(--text-primary)",
                      borderRadius: "8px",
                    }}
                  >
                    <strong>{user.fullName}</strong>
                    <div
                      style={{
                        color: "var(--text-secondary)",
                        fontSize: "0.82rem",
                      }}
                    >
                      {user.faculty || "Student"}
                    </div>
                  </a>
                ))}
            </div>
          )}

          {conversations.length === 0 && !q ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                padding: "20px",
                textAlign: "center",
                color: "var(--text-secondary)",
              }}
            >
              <span
                style={{
                  fontSize: "2rem",
                  opacity: "0.5",
                  marginBottom: "10px",
                }}
              >
                📭
              </span>
              <p style={{ fontSize: "0.9rem", fontWeight: "500" }}>
                No recent chats
              </p>
              <p style={{ fontSize: "0.8rem", marginTop: "4px" }}>
                Search for a student to start messaging.
              </p>
            </div>
          ) : (
            conversations.map(({ user, lastMessage }) => (
              <a
                key={user.id}
                href={`/messages?user=${user.id}`}
                style={{
                  display: "block",
                  padding: "14px",
                  textDecoration: "none",
                  color: "var(--text-primary)",
                  background:
                    user.id === selectedUserId
                      ? "var(--bg-main)"
                      : "transparent",
                  borderBottom: "1px solid var(--border-color-light)",
                }}
              >
                <strong>{user.fullName}</strong>
                <p
                  style={{
                    margin: "4px 0 0",
                    color: "var(--text-secondary)",
                    fontSize: "0.84rem",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {lastMessage.content}
                </p>
              </a>
            ))
          )}
        </div>
      </aside>

      <main className="messenger-chat-area">
        <div className="chat-window-header">
          <span style={{ fontWeight: "600", color: "var(--text-primary)" }}>
            {activeUser
              ? activeUser.fullName
              : activeGroup
              ? `👥 ${activeGroup.name}`
              : "New Message"}
          </span>
        </div>

        <div className="chat-messages-history">
          {!activeUser && !activeGroup ? (
            <div className="empty-state-mini">
              <span
                style={{
                  fontSize: "2rem",
                  display: "block",
                  marginBottom: "10px",
                  opacity: "0.5",
                }}
              >
                💬
              </span>
              <p style={{ fontSize: "1rem", color: "var(--text-secondary)" }}>
                Choose a conversation.
              </p>
            </div>
          ) : history.length === 0 ? (
            <div className="empty-state-mini">
              <span
                style={{
                  fontSize: "2rem",
                  display: "block",
                  marginBottom: "10px",
                  opacity: "0.5",
                }}
              >
                💬
              </span>
              <p style={{ fontSize: "1rem", color: "var(--text-secondary)" }}>
                No messages here yet.
              </p>
            </div>
          ) : (
            <MessagesClient
              initialHistory={history}
              currentUserId={session.userId}
              selectedUserId={selectedUserId}
              selectedGroupId={selectedGroupId}
            />
          )}
        </div>

        <form
          action={activeGroup ? sendGroupMessage : sendMessage}
          className="chat-input-area"
        >
          <button type="button" className="btn-attach" disabled>
            📎
          </button>

          {activeUser && (
            <input type="hidden" name="receiverId" value={selectedUserId} />
          )}
          {activeGroup && (
            <input type="hidden" name="groupChatId" value={selectedGroupId} />
          )}

          <input
            type="text"
            name="content"
            className="chat-message-input"
            placeholder={
              activeUser || activeGroup
                ? "Write a message..."
                : "Select a chat first"
            }
            disabled={!activeUser && !activeGroup}
            maxLength={2000}
          />

          <button
            className="btn btn-send"
            disabled={!activeUser && !activeGroup}
          >
            Send
          </button>
        </form>
      </main>
    </div>
  );
}
