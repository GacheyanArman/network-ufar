import { asc, desc, eq, inArray, or, and, ilike, isNull, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/shared/db/db";
import { messages, users, groupChats, groupChatMembers, messageReads } from "@/shared/db/schema";
import { getSession } from "@/shared/auth/session";
import MessagesClient from "@/features/messages/components/MessagesClient";
import MessagesPageClient from "@/features/messages/components/MessagesPageClient";
import MessagesNotificationBridge from "@/features/notifications/components/MessagesNotificationBridge";
import UiIcon from "@/shared/ui/UiIcon";
import Link from "next/link";
import { cookies } from "next/headers";
import { translations } from "@/shared/i18n/i18n";

export default async function MessagesPage({ searchParams }) {
  const session = await getSession();
  if (!session?.userId) redirect("/login");

  const cookieStore = await cookies();
  const lang = cookieStore.get("language")?.value || "en";
  const es = (translations[lang] || translations.en).emptyStates;

  const params = await searchParams;
  const activeUserId = params?.user?.toString() || "";
  const activeGroupId = params?.group?.toString() || "";
  const q = params?.q?.toString().trim() || "";

  // Get current user info
  const [currentUser] = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      image: users.image,
    })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

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

  // Get unread counts for direct conversations
  const dmUnreadRows = partnerIds.length > 0
    ? await db
        .select({
          senderId: messages.senderId,
          count: sql`COUNT(*)::int`,
        })
        .from(messages)
        .where(
          and(
            eq(messages.receiverId, session.userId),
            eq(messages.isRead, false),
            isNull(messages.groupChatId),
            inArray(messages.senderId, partnerIds)
          )
        )
        .groupBy(messages.senderId)
    : [];
  const dmUnreadMap = new Map(dmUnreadRows.map((r) => [r.senderId, r.count]));

  // Get unread counts and last messages for group/course chats
  const groupIds = userGroupChats.map((g) => g.id);
  const groupUnreadMap = new Map();
  const groupLastMessageMap = new Map();

  if (groupIds.length > 0) {
    const groupUnreadRows = await db
      .select({
        groupChatId: messages.groupChatId,
        count: sql`COUNT(*)::int`,
      })
      .from(messages)
      .where(
        and(
          inArray(messages.groupChatId, groupIds),
          sql`${messages.senderId} <> ${session.userId}`,
          sql`NOT EXISTS (
            SELECT 1 FROM ${messageReads}
            WHERE ${messageReads.messageId} = ${messages.id}
              AND ${messageReads.userId} = ${session.userId}
          )`
        )
      )
      .groupBy(messages.groupChatId);
    for (const r of groupUnreadRows) {
      if (r.groupChatId) {
        groupUnreadMap.set(r.groupChatId, r.count);
      }
    }

    // Get last message for each group/course chat
    const lastGroupMessages = await db
      .select({
        id: messages.id,
        groupChatId: messages.groupChatId,
        content: messages.content,
        createdAt: messages.createdAt,
        senderId: messages.senderId,
        senderName: users.fullName,
      })
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(inArray(messages.groupChatId, groupIds))
      .orderBy(desc(messages.createdAt));

    for (const msg of lastGroupMessages) {
      if (msg.groupChatId && !groupLastMessageMap.has(msg.groupChatId)) {
        groupLastMessageMap.set(msg.groupChatId, msg);
      }
    }
  }

  // Enrich conversations and group chats with unreadCount and lastMessage
  const conversations = partnerIds
    .map((id) => ({
      user: usersById.get(id),
      lastMessage: conversationsMap.get(id),
      unreadCount: dmUnreadMap.get(id) || 0,
    }))
    .filter((item) => item.user);

  const enrichedGroupChats = userGroupChats.map((group) => {
    const lastMsg = groupLastMessageMap.get(group.id);
    return {
      ...group,
      unreadCount: groupUnreadMap.get(group.id) || 0,
      lastMessage: lastMsg
        ? {
            content: lastMsg.content,
            createdAt: lastMsg.createdAt instanceof Date ? lastMsg.createdAt.toISOString() : lastMsg.createdAt,
            senderName: lastMsg.senderName,
            senderId: lastMsg.senderId,
          }
        : null,
    };
  });

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
          lastSeenAt: users.lastSeenAt,
        })
        .from(users)
        .where(eq(users.id, selectedUserId))
        .limit(1)
    : [];

  // Group-admin check: required for the GroupMembersPanel to show admin controls.
  let isGroupAdmin = false;
  if (selectedGroupId) {
    const [member] = await db
      .select({ role: groupChatMembers.role })
      .from(groupChatMembers)
      .where(
        and(
          eq(groupChatMembers.groupChatId, selectedGroupId),
          eq(groupChatMembers.userId, session.userId)
        )
      )
      .limit(1);
    isGroupAdmin = member?.role === "admin";
  }

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

  const historyFields = {
    id: messages.id,
    senderId: messages.senderId,
    receiverId: messages.receiverId,
    groupChatId: messages.groupChatId,
    content: messages.content,
    attachmentUrl: messages.attachmentUrl,
    attachmentType: messages.attachmentType,
    status: messages.status,
    createdAt: messages.createdAt,
    editedAt: messages.editedAt,
    deletedAt: messages.deletedAt,
    deletedForEveryone: messages.deletedForEveryone,
    senderName: users.fullName,
    senderImage: users.image,
  };

  const historyRaw =
    selectedUserId && activeUser
      ? await db
          .select(historyFields)
          .from(messages)
          .innerJoin(users, eq(messages.senderId, users.id))
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
          .limit(60)
      : selectedGroupId && activeGroup
      ? await db
          .select(historyFields)
          .from(messages)
          .innerJoin(users, eq(messages.senderId, users.id))
          .where(eq(messages.groupChatId, selectedGroupId))
          .orderBy(asc(messages.createdAt))
          .limit(60)
      : [];

  // Serialize Date -> ISO so it can cross the server/client boundary.
  const history = historyRaw.map((m) => ({
    ...m,
    createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : m.createdAt,
    editedAt: m.editedAt instanceof Date ? m.editedAt.toISOString() : m.editedAt,
    deletedAt: m.deletedAt instanceof Date ? m.deletedAt.toISOString() : m.deletedAt,
    content: m.deletedForEveryone ? "" : m.content,
    attachmentUrl: m.deletedForEveryone ? null : m.attachmentUrl,
    attachmentType: m.deletedForEveryone ? null : m.attachmentType,
  }));

  const presenceLastSeenAt =
    activeUser?.lastSeenAt instanceof Date
      ? activeUser.lastSeenAt.toISOString()
      : activeUser?.lastSeenAt ?? null;

  return (
    <>
      <style>{messagesStyles}</style>
      <MessagesNotificationBridge
        currentUserId={session.userId}
        activeUserId={selectedUserId || undefined}
        activeGroupId={selectedGroupId || undefined}
      />
      <MessagesPageClient
        userGroupChats={enrichedGroupChats}
        conversations={conversations}
        searchUsers={searchUsers}
        selectedUserId={selectedUserId}
        selectedGroupId={selectedGroupId}
        activeUser={activeUser}
        activeGroup={activeGroup}
        sessionUserId={session.userId}
        q={q}
      >
        {(selectedUserId && activeUser) || (selectedGroupId && activeGroup) ? (
          <MessagesClient
            initialHistory={history}
            currentUserId={session.userId}
            selectedUserId={selectedUserId}
            selectedGroupId={selectedGroupId}
            presenceLastSeenAt={presenceLastSeenAt}
            isGroupAdmin={isGroupAdmin}
          />
        ) : (
          <div className="tg-empty-history">
            <div className="tg-empty-icon">
              <UiIcon name="message" size={48} />
            </div>
            <h3>{es.messages.noChat}</h3>
            <p>{es.messages.noChatHint}</p>
            <Link href="/search" className="btn btn-primary" style={{ marginTop: 12, textDecoration: "none" }}>
              {es.messages.startChat}
            </Link>
          </div>
        )}
      </MessagesPageClient>
    </>
  );
}

const messagesStyles = `
.tg-messenger {
  display: grid;
  grid-template-columns: 380px 1fr;
  height: calc(100vh - var(--topbar-height) - 48px);
  background: #ffffff;
  border-radius: 18px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(15, 23, 42, 0.04);
  border: 1px solid #d9e2ef;
  transition: grid-template-columns 0.3s ease;
}

.tg-messenger.tg-sidebar-hidden {
  grid-template-columns: 0 1fr;
}

.tg-sidebar {
  background: #ffffff;
  border-right: 1px solid #e7edf5;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.tg-sidebar.hidden {
  transform: translateX(-100%);
  opacity: 0;
  pointer-events: none;
}

.tg-menu-btn-open {
  margin-right: 12px;
}

.tg-sidebar-header {
  padding: 16px;
  border-bottom: 1px solid #e7edf5;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.tg-menu-btn {
  width: 40px;
  height: 40px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  border-radius: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.tg-menu-btn:hover {
  background: var(--bg-hover);
  color: #0f172a;
}

.tg-search-form {
  flex: 1;
}

.tg-search-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.tg-search-wrapper svg {
  position: absolute;
  left: 12px;
  color: #94a3b8;
  pointer-events: none;
}

.tg-search-input {
  width: 100%;
  height: 40px;
  padding: 0 16px 0 40px;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: #f8fafc;
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
  outline: none;
  transition: all 0.2s ease;
}

.tg-search-input::placeholder {
  color: #94a3b8;
  font-weight: 500;
}

.tg-search-input:focus {
  background: #ffffff;
  border-color: #0b3aa8;
  box-shadow: 0 0 0 3px rgba(11, 58, 168, 0.1);
}

.tg-search-clear {
  position: absolute;
  right: 8px;
  width: 24px;
  height: 24px;
  border: none;
  background: var(--border-color);
  color: #475569;
  border-radius: 50%;
  cursor: pointer;
  font-size: 16px;
  font-weight: 700;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
.tg-search-clear:hover {
  background: #cbd5e1;
}

.tg-chat-list {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

.tg-chat-list::-webkit-scrollbar {
  width: 6px;
}

.tg-chat-list::-webkit-scrollbar-track {
  background: transparent;
}

.tg-chat-list::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.tg-chat-list::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

.tg-section-title {
  padding: 12px 16px 8px;
  font-size: 13px;
  font-weight: 800;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.tg-chat-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  text-decoration: none;
  color: #0f172a;
  transition: all 0.15s ease;
  border-left: 3px solid transparent;
  cursor: pointer;
}

.tg-chat-item:hover {
  background: #f8fafc;
}

.tg-chat-item.active {
  background: #eef4ff;
  border-left-color: #0b3aa8;
}

.tg-chat-avatar {
  width: 52px;
  height: 52px;
  border-radius: 999px;
  background: linear-gradient(135deg, #0b3aa8 0%, #062fae 100%);
  color: #ffffff;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  font-size: 18px;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(11, 58, 168, 0.16);
}

.tg-chat-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.tg-group-avatar {
  background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%);
  box-shadow: 0 2px 8px rgba(124, 58, 237, 0.16);
}

.tg-chat-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tg-chat-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.tg-chat-name {
  margin: 0;
  font-size: 15px;
  font-weight: 800;
  color: #0f172a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tg-chat-time {
  font-size: 12px;
  color: #94a3b8;
  font-weight: 600;
  flex-shrink: 0;
}

.tg-chat-bottom {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tg-chat-preview {
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.tg-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 40px 24px;
  text-align: center;
}

.tg-empty-icon {
  width: 80px;
  height: 80px;
  border-radius: 999px;
  background: var(--bg-hover);
  color: #cbd5e1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tg-empty-state h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 900;
  color: #0f172a;
}

.tg-empty-state p {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary);
  font-weight: 600;
  max-width: 280px;
}

.tg-chat-area {
  display: flex;
  flex-direction: column;
  background: #f8fafc;
  overflow: hidden;
}

.tg-empty-chat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  padding: 40px;
  text-align: center;
}

.tg-empty-chat .tg-empty-icon {
  width: 120px;
  height: 120px;
}

.tg-empty-chat h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 950;
  color: #0f172a;
}

.tg-empty-chat p {
  margin: 0;
  font-size: 15px;
  color: var(--text-secondary);
  font-weight: 600;
  max-width: 360px;
}

.tg-chat-header {
  padding: 16px 20px;
  background: #ffffff;
  border-bottom: 1px solid #e7edf5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-shrink: 0;
}

.tg-chat-header-info {
  display: flex;
  align-items: center;
  gap: 14px;
  flex: 1;
  min-width: 0;
}

.tg-chat-header-avatar {
  width: 48px;
  height: 48px;
  border-radius: 999px;
  background: linear-gradient(135deg, #0b3aa8 0%, #062fae 100%);
  color: #ffffff;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  font-size: 18px;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(11, 58, 168, 0.16);
}

.tg-chat-header-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.tg-chat-header-text {
  flex: 1;
  min-width: 0;
}

.tg-chat-header-text h2 {
  margin: 0 0 4px;
  font-size: 16px;
  font-weight: 900;
  color: #0f172a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tg-chat-header-text span {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 600;
}

.tg-chat-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.tg-message-search-wrapper {
  display: flex;
  align-items: center;
  gap: 0;
  position: relative;
}

.tg-message-search-input {
  position: absolute;
  right: 48px;
  width: 0;
  height: 40px;
  padding: 0;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: #f8fafc;
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
  outline: none;
  transition: width 0.3s ease, padding 0.3s ease, opacity 0.3s ease;
  opacity: 0;
  overflow: hidden;
  pointer-events: none;
}

.tg-message-search-input:focus,
.tg-message-search-input:not(:placeholder-shown) {
  width: 160px;
  padding: 0 12px;
  opacity: 1;
  pointer-events: auto;
}

.tg-message-search-input::placeholder {
  color: #94a3b8;
  font-weight: 500;
}

.tg-message-search-input:focus {
  background: #ffffff;
  border-color: #0b3aa8;
  box-shadow: 0 0 0 3px rgba(11, 58, 168, 0.1);
}

.tg-header-btn {
  width: 40px;
  height: 40px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  border-radius: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
  position: relative;
  z-index: 1;
}

.tg-header-btn:hover {
  background: var(--bg-hover);
  color: #0f172a;
}

.tg-messages-container {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 20px;
}

.tg-messages-container::-webkit-scrollbar {
  width: 8px;
}

.tg-messages-container::-webkit-scrollbar-track {
  background: transparent;
}

.tg-messages-container::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

.tg-messages-container::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

.tg-empty-history {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 60px 24px;
  text-align: center;
  height: 100%;
}

.tg-empty-history .tg-empty-icon {
  width: 96px;
  height: 96px;
}

.tg-empty-history h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 900;
  color: #0f172a;
}

.tg-empty-history p {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary);
  font-weight: 600;
}

.tg-input-area {
  padding: 16px 20px;
  background: #ffffff;
  border-top: 1px solid #e7edf5;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.tg-attach-btn {
  width: 40px;
  height: 40px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  border-radius: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.tg-attach-btn:hover {
  background: var(--bg-hover);
  color: #0f172a;
}

.tg-message-input {
  flex: 1;
  height: 44px;
  padding: 0 16px;
  border: 1px solid var(--border-color);
  border-radius: 22px;
  background: #f8fafc;
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
  outline: none;
  transition: all 0.2s ease;
  font-family: inherit;
}

.tg-message-input::placeholder {
  color: #94a3b8;
  font-weight: 500;
}

.tg-message-input:focus {
  background: #ffffff;
  border-color: #0b3aa8;
  box-shadow: 0 0 0 3px rgba(11, 58, 168, 0.1);
}

.tg-send-btn {
  width: 44px;
  height: 44px;
  border: none;
  background: linear-gradient(135deg, #0b3aa8 0%, #062fae 100%);
  color: #ffffff;
  border-radius: 999px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(11, 58, 168, 0.24);
}

.tg-send-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(11, 58, 168, 0.32);
}

.tg-send-btn:active {
  transform: translateY(0);
}

@media (max-width: 1024px) {
  .tg-messenger {
    grid-template-columns: 320px 1fr;
  }
}

@media (max-width: 768px) {
  .tg-messenger {
    grid-template-columns: 1fr;
    height: calc(100vh - var(--topbar-height) - 24px);
  }

  .tg-sidebar {
    display: none;
  }

  .tg-chat-area {
    border-radius: 18px;
  }
}

.tg-messages-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tg-message {
  display: flex;
  width: 100%;
  margin-bottom: 4px;
}

.tg-message-own {
  justify-content: flex-end;
}

.tg-message-other {
  justify-content: flex-start;
}

.tg-message-bubble {
  max-width: 65%;
  padding: 10px 14px;
  border-radius: 16px;
  position: relative;
  word-wrap: break-word;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
}

.tg-message-own .tg-message-bubble {
  background: linear-gradient(135deg, #0b3aa8 0%, #062fae 100%);
  color: #ffffff;
  border-bottom-right-radius: 4px;
}

.tg-message-other .tg-message-bubble {
  background: #ffffff;
  color: #0f172a;
  border: 1px solid #e7edf5;
  border-bottom-left-radius: 4px;
}

.tg-message-text {
  margin: 0 0 6px;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.5;
  word-break: break-word;
}

.tg-message-own .tg-message-text {
  color: #ffffff;
}

.tg-message-other .tg-message-text {
  color: #0f172a;
}

.tg-message-time {
  font-size: 11px;
  font-weight: 600;
  opacity: 0.7;
  display: block;
  text-align: right;
}

.tg-message-own .tg-message-time {
  color: #ffffff;
}

.tg-message-other .tg-message-time {
  color: var(--text-secondary);
}

.tg-message-wrapper {
  transition: all 0.3s ease;
}

.tg-message-highlighted {
  animation: pulse 0.5s ease;
}

.tg-message-current-match .tg-message-bubble {
  box-shadow: 0 0 0 3px rgba(11, 58, 168, 0.3);
  animation: highlight-pulse 1s ease infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

@keyframes highlight-pulse {
  0%, 100% { box-shadow: 0 0 0 3px rgba(11, 58, 168, 0.3); }
  50% { box-shadow: 0 0 0 5px rgba(11, 58, 168, 0.5); }
}

.tg-highlight {
  background: #fef08a;
  color: #854d0e;
  padding: 2px 4px;
  border-radius: 4px;
  font-weight: 700;
}

.tg-message-own .tg-highlight {
  background: rgba(255, 255, 255, 0.3);
  color: #ffffff;
}

.tg-search-navigation {
  position: absolute;
  bottom: 80px;
  right: 20px;
  background: #ffffff;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 8px 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.12);
  z-index: 10;
}

/* ---- New chat features (real-time, edit, presence, etc.) ---- */
.tg-chat-search-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid #e7edf5;
  background: #fff;
  flex-wrap: wrap;
}
.tg-chat-search-wrapper {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 200px;
}
.tg-chat-search-wrapper > svg {
  color: #94a3b8;
  flex-shrink: 0;
}
.tg-chat-search-input {
  flex: 1;
  height: 32px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: var(--bg-hover);
  font-size: 13px;
  outline: none;
}
.tg-chat-search-input:focus {
  background: #fff;
  border-color: #cbd5e1;
}
.tg-chat-search-meta {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 700;
}
.tg-chat-search-meta button {
  width: 26px;
  height: 26px;
  border: 1px solid var(--border-color);
  background: #fff;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
}
.tg-chat-search-meta button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.tg-chat-search-members {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: #fff;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}
.tg-chat-presence {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  color: var(--text-secondary);
}
.tg-presence-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #cbd5e1;
}
.tg-presence-dot.online {
  background: #22c55e;
  box-shadow: 0 0 0 3px rgba(34,197,94,0.18);
}

.tg-loading-more {
  text-align: center;
  font-size: 12px;
  color: var(--text-secondary);
  padding: 8px;
}

/* Avatar inside group messages */
.tg-msg-avatar {
  align-self: flex-end;
  margin-right: 6px;
}
.tg-msg-sender-name {
  font-size: 11px;
  font-weight: 800;
  color: #0b3aa8;
  margin-bottom: 4px;
}

/* Message bubble actions */
.tg-message-bubble {
  position: relative;
}
.tg-msg-menu-btn {
  position: absolute;
  top: 4px;
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 6px;
  background: rgba(0,0,0,0.0);
  color: inherit;
  cursor: pointer;
  opacity: 0;
  transition: opacity .15s ease, background .15s ease;
  font-size: 14px;
  font-weight: 700;
  line-height: 1;
}
.tg-msg-menu-btn-right { right: 4px; }
.tg-msg-menu-btn-left  { left: 4px; }
.tg-message-bubble:hover .tg-msg-menu-btn {
  opacity: 0.7;
  background: rgba(0,0,0,0.08);
}
.tg-message-own .tg-msg-menu-btn {
  color: #fff;
}
.tg-message-own .tg-message-bubble:hover .tg-msg-menu-btn {
  background: rgba(255,255,255,0.16);
}
.tg-msg-menu {
  position: absolute;
  top: 28px;
  z-index: 6;
  min-width: 180px;
  background: #fff;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(15,23,42,0.16);
  padding: 4px;
  display: flex;
  flex-direction: column;
}
.tg-msg-menu-right { right: 4px; }
.tg-msg-menu-left  { left: 4px; }

/* Chat header dropdown menu */
.tg-chat-header-menu {
  position: absolute;
  top: 44px;
  right: 0;
  z-index: 20;
  min-width: 200px;
  background: #fff;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  box-shadow: 0 12px 32px rgba(15,23,42,0.18);
  padding: 4px;
  display: flex;
  flex-direction: column;
}
.tg-chat-header-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border: none;
  background: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
  text-decoration: none;
  text-align: left;
  width: 100%;
}
.tg-chat-header-menu-item:hover {
  background: var(--bg-hover);
}
.tg-chat-header-menu-item.danger {
  color: #b91c1c;
}
.tg-chat-header-menu-item.danger:hover {
  background: #fee2e2;
}
.tg-msg-menu button {
  text-align: left;
  background: none;
  border: none;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
}
.tg-msg-menu button:hover {
  background: var(--bg-hover);
}

.tg-msg-edit textarea {
  width: 100%;
  border: 1px solid rgba(255,255,255,0.4);
  background: rgba(255,255,255,0.1);
  color: inherit;
  border-radius: 8px;
  padding: 6px 8px;
  font-size: 14px;
  font-family: inherit;
  resize: none;
}
.tg-message-other .tg-msg-edit textarea {
  border-color: #cbd5e1;
  background: #fff;
}
.tg-msg-edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
  margin-top: 6px;
}
.tg-msg-edit-actions button {
  font-size: 12px;
  font-weight: 800;
  border: none;
  border-radius: 6px;
  padding: 4px 10px;
  cursor: pointer;
  background: rgba(255,255,255,0.2);
  color: inherit;
}
.tg-msg-edit-actions button.primary {
  background: #fff;
  color: #0b3aa8;
}
.tg-message-other .tg-msg-edit-actions button {
  background: var(--bg-hover);
  color: #0f172a;
}
.tg-message-other .tg-msg-edit-actions button.primary {
  background: #0b3aa8;
  color: #fff;
}

.tg-msg-edited {
  opacity: 0.65;
  font-style: italic;
}
.tg-msg-status {
  margin-left: 6px;
  font-size: 11px;
  font-weight: 800;
}
.tg-msg-status.seen {
  color: #38bdf8;
}
.tg-message-tombstone {
  opacity: 0.7;
  font-style: italic;
}

.tg-msg-image img {
  display: block;
  max-width: 100%;
  max-height: 260px;
  border-radius: 12px;
  margin-bottom: 6px;
}
.tg-msg-file {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
  color: inherit;
  padding: 6px 10px;
  border-radius: 8px;
  background: rgba(255,255,255,0.18);
  margin-bottom: 6px;
}
.tg-message-other .tg-msg-file {
  background: var(--bg-hover);
}

/* Attachment preview chip */
.tg-attachment-preview {
  position: absolute;
  left: 16px;
  bottom: 64px;
  background: #fff;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 6px 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 700;
  color: #0f172a;
  box-shadow: 0 4px 12px rgba(15,23,42,0.12);
  max-width: 70%;
}
.tg-attachment-preview .tg-attachment-name {
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  max-width: 200px;
}
.tg-attachment-preview button {
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 16px;
  color: var(--text-secondary);
  line-height: 1;
}

/* Typing indicator */
.tg-typing-indicator {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 8px 14px;
  margin: 6px 0;
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 700;
}
.tg-typing-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #94a3b8;
  animation: tg-bounce 1.2s infinite ease-in-out;
}
.tg-typing-dot:nth-child(2) { animation-delay: 0.15s; }
.tg-typing-dot:nth-child(3) { animation-delay: 0.3s; }
.tg-typing-text { margin-left: 6px; }
@keyframes tg-bounce {
  0%, 80%, 100% { transform: scale(0.6); opacity: .6; }
  40% { transform: scale(1); opacity: 1; }
}

/* Mobile polish */
@media (max-width: 640px) {
  .tg-message-bubble { max-width: 80%; }
  .tg-chat-search-input { font-size: 16px; } /* avoid iOS zoom on focus */
  .tg-message-input { font-size: 16px; }
  .tg-msg-menu-btn { opacity: 0.65; } /* always visible since no hover on mobile */
}

.tg-search-counter {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-secondary);
  min-width: 60px;
  text-align: center;
}

.tg-search-nav-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: #f8fafc;
  color: #0f172a;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 700;
  transition: all 0.2s ease;
}

.tg-search-nav-btn:hover:not(:disabled) {
  background: #0b3aa8;
  color: #ffffff;
}

.tg-search-nav-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.tg-search-close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: #94a3b8;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  transition: all 0.2s ease;
  margin-left: 4px;
}

.tg-search-close-btn:hover {
  background: #fee2e2;
  color: #dc2626;
}

.tg-chat-area {
  position: relative;
}

/* Simplification UI styles */
.tg-tabs-container {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  background: #ffffff;
  border-bottom: 1px solid #e7edf5;
}

.tg-tab-btn {
  flex: 1;
  padding: 8px 12px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 800;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.2s ease;
}

.tg-tab-btn:hover {
  background: var(--bg-hover);
  color: #0f172a;
}

.tg-tab-btn.active {
  background: var(--french-blue-soft, #eef4ff);
  color: var(--french-blue, #0b3aa8);
}

.tg-tab-unread-badge {
  background: var(--danger, #ef4444);
  color: #ffffff;
  font-size: 10px;
  font-weight: 900;
  padding: 2px 6px;
  border-radius: 999px;
  line-height: 1;
}

.tg-unread-badge {
  background: var(--french-blue, #0b3aa8);
  color: #ffffff;
  font-size: 11px;
  font-weight: 900;
  padding: 2px 7px;
  border-radius: 999px;
  line-height: 1.2;
  margin-left: auto;
  flex-shrink: 0;
}
`;
