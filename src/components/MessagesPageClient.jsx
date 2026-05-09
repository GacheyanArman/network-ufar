"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import UiIcon from "./UiIcon";
import ChatHeaderMenu from "./ChatHeaderMenu";
import { useLanguage } from "@/contexts/LanguageContext";
import { getFacultyLabel } from "@/lib/profile-utils";

export default function MessagesPageClient({
  userGroupChats,
  conversations,
  searchUsers,
  selectedUserId,
  selectedGroupId,
  activeUser,
  activeGroup,
  sessionUserId,
  q,
  children,
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { language } = useLanguage();

  // Live search state. Initial value comes from the server-rendered ?q= so
  // direct links keep working.
  const [query, setQuery] = useState(q || "");
  const [liveResults, setLiveResults] = useState(
    searchUsers.filter((u) => u.id !== sessionUserId)
  );
  const [searching, setSearching] = useState(false);
  const inflightRef = useRef(0);

  // Debounced fetch.
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setLiveResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    const reqId = ++inflightRef.current;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/search-suggestions?q=${encodeURIComponent(trimmed)}`,
          { credentials: "same-origin" }
        );
        if (!res.ok) return;
        const data = await res.json();
        if (reqId !== inflightRef.current) return; // stale
        const onlyUsers = (Array.isArray(data) ? data : [])
          .filter((x) => x?.type === "user" && x.id !== sessionUserId)
          .map((u) => ({
            id: u.id,
            fullName: u.name,
            faculty: u.faculty,
            image: u.image,
          }));
        setLiveResults(onlyUsers);
      } catch {
        /* ignore */
      } finally {
        if (reqId === inflightRef.current) setSearching(false);
      }
    }, 200);

    return () => clearTimeout(t);
  }, [query, sessionUserId]);

  const handleOpenSidebar = () => {
    setIsSidebarOpen(true);
  };

  const isSearching = query.trim().length >= 2;
  const showResults = isSearching;

  return (
    <>
      <div className={`tg-messenger ${!isSidebarOpen ? 'tg-sidebar-hidden' : ''}`}>
        <aside className={`tg-sidebar ${!isSidebarOpen ? 'hidden' : ''}`}>
          <div className="tg-sidebar-header">
            <button
              className="tg-menu-btn"
              type="button"
              onClick={() => setIsSidebarOpen(false)}
            >
              <UiIcon name="x" size={24} />
            </button>
            <div className="tg-search-form">
              <div className="tg-search-wrapper">
                <UiIcon name="search" size={18} />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="tg-search-input"
                  placeholder="Search"
                  autoComplete="off"
                />
                {query && (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={() => setQuery("")}
                    className="tg-search-clear"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="tg-chat-list">
            {/* Search results take over the list while user is typing. */}
            {showResults ? (
              <>
                <div className="tg-section-title">
                  {searching ? "Searching…" : `Results (${liveResults.length})`}
                </div>
                {liveResults.length === 0 && !searching ? (
                  <div className="tg-empty-state">
                    <div className="tg-empty-icon">
                      <UiIcon name="search" size={36} />
                    </div>
                    <h3>No matches</h3>
                    <p>Try a different name or faculty.</p>
                  </div>
                ) : (
                  liveResults.map((user) => (
                    <Link
                      key={user.id}
                      href={`/messages?user=${user.id}`}
                      className="tg-chat-item"
                      onClick={() => setQuery("")}
                    >
                      <div className="tg-chat-avatar">
                        {user.image ? (
                          <img src={user.image} alt={user.fullName} />
                        ) : (
                          <span>{user.fullName?.[0] || "U"}</span>
                        )}
                      </div>

                      <div className="tg-chat-content">
                        <div className="tg-chat-top">
                          <h3 className="tg-chat-name">{user.fullName}</h3>
                        </div>
                        <div className="tg-chat-bottom">
                          <p className="tg-chat-preview">
                            {user.faculty ? getFacultyLabel(user.faculty, language) : "Student"}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </>
            ) : (
              <>
                {/* Group Chats Section */}
                {userGroupChats.length > 0 &&
                  userGroupChats.map((group) => (
                    <Link
                      key={group.id}
                      href={`/messages?group=${group.id}`}
                      className={`tg-chat-item ${group.id === selectedGroupId ? "active" : ""}`}
                    >
                      <div className="tg-chat-avatar tg-group-avatar">
                        {group.avatar ? (
                          <img src={group.avatar} alt={group.name} />
                        ) : (
                          <UiIcon name="users" size={20} />
                        )}
                      </div>

                      <div className="tg-chat-content">
                        <div className="tg-chat-top">
                          <h3 className="tg-chat-name">{group.name}</h3>
                          <span className="tg-chat-time">
                            {new Date(group.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="tg-chat-bottom">
                          <p className="tg-chat-preview">
                            {group.faculty ? getFacultyLabel(group.faculty, language) : "Group chat"}
                            {group.course && ` • ${group.course}`}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}

                {/* Direct Messages */}
                {conversations.length === 0 ? (
                  <div className="tg-empty-state">
                    <div className="tg-empty-icon">
                      <UiIcon name="message" size={48} />
                    </div>
                    <h3>No messages yet</h3>
                    <p>Search for a student to start chatting</p>
                  </div>
                ) : (
                  conversations.map(({ user, lastMessage }) => (
                    <Link
                      key={user.id}
                      href={`/messages?user=${user.id}`}
                      className={`tg-chat-item ${user.id === selectedUserId ? "active" : ""}`}
                    >
                      <div className="tg-chat-avatar">
                        {user.image ? (
                          <img src={user.image} alt={user.fullName} />
                        ) : (
                          <span>{user.fullName?.[0] || "U"}</span>
                        )}
                      </div>

                      <div className="tg-chat-content">
                        <div className="tg-chat-top">
                          <h3 className="tg-chat-name">{user.fullName}</h3>
                          <span className="tg-chat-time">
                            {new Date(lastMessage.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <div className="tg-chat-bottom">
                          <p className="tg-chat-preview">
                            {lastMessage.senderId === sessionUserId && "You: "}
                            {lastMessage.content}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </>
            )}
          </div>
        </aside>

        <main className="tg-chat-area">
          {!activeUser && !activeGroup ? (
            <div className="tg-empty-chat">
              <div className="tg-empty-icon">
                <UiIcon name="message" size={64} />
              </div>
              <h2>Select a chat to start messaging</h2>
              <p>Choose a conversation from the list or search for someone new</p>
            </div>
          ) : (
            <>
              <div className="tg-chat-header">
                {!isSidebarOpen && (
                  <button
                    className="tg-menu-btn tg-menu-btn-open"
                    type="button"
                    onClick={handleOpenSidebar}
                  >
                    <UiIcon name="menu" size={24} />
                  </button>
                )}

                <div className="tg-chat-header-info">
                  <div className="tg-chat-header-avatar">
                    {activeUser ? (
                      activeUser.image ? (
                        <img src={activeUser.image} alt={activeUser.fullName} />
                      ) : (
                        <span>{activeUser.fullName?.[0] || "U"}</span>
                      )
                    ) : activeGroup?.avatar ? (
                      <img src={activeGroup.avatar} alt={activeGroup.name} />
                    ) : (
                      <UiIcon name="users" size={20} />
                    )}
                  </div>

                  <div className="tg-chat-header-text">
                    <h2>
                      {activeUser
                        ? activeUser.fullName
                        : activeGroup
                        ? activeGroup.name
                        : ""}
                    </h2>
                    <span>
                      {activeUser
                        ? activeUser.faculty ? getFacultyLabel(activeUser.faculty, language) : "Student"
                        : activeGroup
                        ? `${activeGroup.faculty ? getFacultyLabel(activeGroup.faculty, language) : "Group"}${activeGroup.course ? ` • ${activeGroup.course}` : ""}`
                        : ""}
                    </span>
                  </div>
                </div>

                <div className="tg-chat-header-actions">
                  {activeUser && (
                    <ChatHeaderMenu kind="user" targetId={activeUser.id} />
                  )}
                  {activeGroup && (
                    <ChatHeaderMenu kind="group" targetId={activeGroup.id} />
                  )}
                </div>
              </div>

              {children}
            </>
          )}
        </main>
      </div>
    </>
  );
}
