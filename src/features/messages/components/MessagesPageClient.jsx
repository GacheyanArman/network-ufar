"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import UiIcon from "@/shared/ui/UiIcon";
import ChatHeaderMenu from "./ChatHeaderMenu";
import { useLanguage } from "@/contexts/LanguageContext";
import { getFacultyLabel } from "@/features/profile/server/utils";

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
  isGroupAdmin = false,
  initialTab = "",
  children,
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { language } = useLanguage();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsClient(true);
  }, []);

  // Live search state. Initial value comes from the server-rendered ?q= so
  // direct links keep working.
  const [query, setQuery] = useState(q || "");
  const [liveResults, setLiveResults] = useState(
    searchUsers.filter((u) => u.id !== sessionUserId)
  );
  const [searching, setSearching] = useState(false);
  const inflightRef = useRef(0);

  // Sync the loading flag / clear stale results synchronously when the query
  // changes, using the "store previous prop" pattern to keep this out of an effect.
  const trimmedQuery = query.trim();
  const [prevTrimmedQuery, setPrevTrimmedQuery] = useState(trimmedQuery);
  if (prevTrimmedQuery !== trimmedQuery) {
    setPrevTrimmedQuery(trimmedQuery);
    if (trimmedQuery.length < 2) {
      setLiveResults([]);
      setSearching(false);
    } else {
      setSearching(true);
    }
  }

  // Debounced fetch.
  useEffect(() => {
    if (trimmedQuery.length < 2) return;
    const reqId = ++inflightRef.current;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/search-suggestions?q=${encodeURIComponent(trimmedQuery)}`,
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
  }, [trimmedQuery, sessionUserId]);

  const handleOpenSidebar = () => {
    setIsSidebarOpen(true);
  };

  const closeSidebarOnMobile = () => {
    if (typeof window !== "undefined" && window.innerWidth <= 768) {
      setIsSidebarOpen(false);
    }
  };

  useEffect(() => {
    if ((selectedUserId || selectedGroupId) && typeof window !== "undefined" && window.innerWidth <= 768) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsSidebarOpen(false);
    }
  }, [selectedUserId, selectedGroupId]);

  const isSearching = query.trim().length >= 2;
  const showResults = isSearching;

  const localizations = {
    en: {
      noMessages: "No messages yet",
      startConversation: "Search for a student to start chatting",
      noCourseChats: "No course chats yet",
      direct: "Direct",
      groups: "Groups",
      courseChats: "Courses",
      unread: "Unread",
      noGroupChats: "No group chats yet",
      joinFromGroups: "Open the Chat tab in one of your groups to start chatting.",
      allCaughtUp: "All caught up!",
      noUnread: "You have no unread messages.",
      searchPlaceholder: "Search people or chats...",
      searchLabel: "Search Results",
      noMatches: "No matches found",
      tryDifferent: "Try a different name or course chat.",
      searchingPeople: "Searching students…",
      peopleSuggestions: "Student suggestions",
      joinFromCourses: "Join course chats from the Courses tab to ask questions and share notes.",
      selectChat: "Select a study chat",
      selectChatHint: "Choose a classmate, course chat, or search for a student to start."
    },
    fr: {
      noMessages: "Pas encore de messages",
      startConversation: "Rechercher un étudiant pour discuter",
      noCourseChats: "Pas encore de discussions de cours",
      direct: "Direct",
      groups: "Groupes",
      courseChats: "Cours",
      unread: "Non lus",
      noGroupChats: "Pas encore de discussions de groupe",
      joinFromGroups: "Ouvrez l’onglet Chat d’un de vos groupes pour commencer à discuter.",
      allCaughtUp: "Tout est à jour !",
      noUnread: "Vous n’avez aucun message non lu.",
      searchPlaceholder: "Rechercher des personnes ou des discussions...",
      searchLabel: "Résultats de recherche",
      noMatches: "Aucun résultat trouvé",
      tryDifferent: "Essayez un autre nom ou discussion de cours.",
      searchingPeople: "Recherche d’étudiants…",
      peopleSuggestions: "Suggestions d’étudiants",
      joinFromCourses: "Rejoignez les discussions de cours depuis l’onglet Cours pour poser des questions et partager des notes.",
      selectChat: "Sélectionnez une discussion d’étude",
      selectChatHint: "Choisissez un camarade, une discussion de cours ou recherchez un étudiant."
    },
    hy: {
      noMessages: "Հաղորդագրություններ չկան",
      startConversation: "Փնտրեք ուսանողի զրույցը սկսելու համար",
      noCourseChats: "Դասընթացների զրույցներ չկան",
      direct: "Ուղղակի",
      groups: "Խմբեր",
      courseChats: "Դասընթացներ",
      unread: "Չկարդացած",
      noGroupChats: "Խմբային զրույցներ դեռ չկան",
      joinFromGroups: "Բացեք ձեր խմբերից մեկի Chat բաժինը՝ զրույցը սկսելու համար։",
      allCaughtUp: "Ամեն ինչ կարդացված է",
      noUnread: "Չկարդացած հաղորդագրություններ չկան։",
      searchPlaceholder: "Որոնել մարդկանց կամ զրույցներ...",
      searchLabel: "Որոնման արդյունքներ",
      noMatches: "Համընկնումներ չգտնվեցին",
      tryDifferent: "Փորձեք այլ անուն կամ դասընթացի զրույց:",
      searchingPeople: "Ուսանողների որոնում…",
      peopleSuggestions: "Ուսանողների առաջարկներ",
      joinFromCourses: "Դասընթացների զրույցներին միացեք Courses բաժնից՝ հարցեր տալու և նյութեր կիսելու համար։",
      selectChat: "Ընտրեք ուսումնական զրույց",
      selectChatHint: "Ընտրեք համակուրսեցու, դասընթացի զրույց կամ փնտրեք ուսանողի։"
    }
  };

  const dict = localizations[language] || localizations.en;

  // Course chats are tied to a course; the rest are group chats (incl. groups from the Groups section).
  const tabForGroupId = (gid) =>
    userGroupChats.find((g) => g.id === gid)?.course ? "courses" : "groups";

  const [activeTab, setActiveTab] = useState(
    selectedGroupId
      ? tabForGroupId(selectedGroupId)
      : ["direct", "groups", "courses", "unread"].includes(initialTab)
        ? initialTab
        : "direct"
  );

  const [prevSelectedGroupId, setPrevSelectedGroupId] = useState(selectedGroupId);
  const [prevSelectedUserId, setPrevSelectedUserId] = useState(selectedUserId);

  if (prevSelectedGroupId !== selectedGroupId || prevSelectedUserId !== selectedUserId) {
    setPrevSelectedGroupId(selectedGroupId);
    setPrevSelectedUserId(selectedUserId);
    if (selectedGroupId) {
      setActiveTab(tabForGroupId(selectedGroupId));
    } else if (selectedUserId) {
      setActiveTab("direct");
    }
  }

  const groupChatsList = userGroupChats.filter((g) => !g.course);
  const courseChatsList = userGroupChats.filter((g) => g.course);

  const directUnreadTotal = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
  const groupsUnreadTotal = groupChatsList.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
  const coursesUnreadTotal = courseChatsList.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
  const unreadTotal = directUnreadTotal + groupsUnreadTotal + coursesUnreadTotal;

  const unreadConversations = conversations.filter((c) => (c.unreadCount || 0) > 0);
  const unreadGroupChats = userGroupChats.filter((g) => (g.unreadCount || 0) > 0);

  const renderConversationItem = ({ user, lastMessage, unreadCount }) => (
    <Link
      key={user.id}
      href={`/messages?user=${user.id}`}
      className={`tg-chat-item ${user.id === selectedUserId ? "active" : ""}`}
      onClick={closeSidebarOnMobile}
    >
      <div className="tg-chat-avatar">
        {user.image ? (
          <Image src={user.image} alt={user.fullName} width={52} height={52} />
        ) : (
          <span>{user.fullName?.[0] || "U"}</span>
        )}
      </div>

      <div className="tg-chat-content">
        <div className="tg-chat-top">
          <h3 className="tg-chat-name">{user.fullName}</h3>
          <span className="tg-chat-time">
            {isClient && lastMessage ? new Date(lastMessage.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }) : ""}
          </span>
        </div>
        <div className="tg-chat-bottom">
          <p className="tg-chat-preview">
            {lastMessage ? (lastMessage.senderId === sessionUserId ? "You: " : "") : ""}
            {lastMessage ? lastMessage.content : ""}
          </p>
          {unreadCount > 0 && (
            <span className="tg-unread-badge">{unreadCount}</span>
          )}
        </div>
      </div>
    </Link>
  );

  const renderGroupChatItem = (group) => (
    <Link
      key={group.id}
      href={`/messages?group=${group.id}`}
      className={`tg-chat-item ${group.id === selectedGroupId ? "active" : ""}`}
      onClick={closeSidebarOnMobile}
    >
      <div className="tg-chat-avatar tg-group-avatar">
        {group.avatar ? (
          <Image src={group.avatar} alt={group.name} width={52} height={52} />
        ) : (
          <UiIcon name="users" size={20} />
        )}
      </div>

      <div className="tg-chat-content">
        <div className="tg-chat-top">
          <h3 className="tg-chat-name">{group.name}</h3>
          <span className="tg-chat-time">
            {isClient && group.lastMessage
              ? new Date(group.lastMessage.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : isClient
              ? new Date(group.createdAt).toLocaleDateString()
              : ""}
          </span>
        </div>
        <div className="tg-chat-bottom">
          <p className="tg-chat-preview">
            {group.lastMessage ? `${group.lastMessage.senderName}: ` : ""}
            {group.lastMessage ? group.lastMessage.content : ""}
          </p>
          {group.unreadCount > 0 && (
            <span className="tg-unread-badge">{group.unreadCount}</span>
          )}
        </div>
      </div>
    </Link>
  );

  const localDirectMatches = isSearching
    ? conversations.filter(c => c.user?.fullName?.toLowerCase().includes(trimmedQuery.toLowerCase()))
    : [];

  const localGroupMatches = isSearching
    ? userGroupChats.filter(g => 
        g.name.toLowerCase().includes(trimmedQuery.toLowerCase()) || 
        g.course?.toLowerCase().includes(trimmedQuery.toLowerCase())
      )
    : [];

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
                  placeholder={dict.searchPlaceholder}
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

          <div className="tg-tabs-container">
            <button
              type="button"
              className={`tg-tab-btn ${activeTab === "direct" ? "active" : ""}`}
              onClick={() => setActiveTab("direct")}
            >
              {dict.direct}
              {directUnreadTotal > 0 && (
                <span className="tg-tab-unread-badge">{directUnreadTotal}</span>
              )}
            </button>
            <button
              type="button"
              className={`tg-tab-btn ${activeTab === "groups" ? "active" : ""}`}
              onClick={() => setActiveTab("groups")}
            >
              {dict.groups}
              {groupsUnreadTotal > 0 && (
                <span className="tg-tab-unread-badge">{groupsUnreadTotal}</span>
              )}
            </button>
            <button
              type="button"
              className={`tg-tab-btn ${activeTab === "courses" ? "active" : ""}`}
              onClick={() => setActiveTab("courses")}
            >
              {dict.courseChats}
              {coursesUnreadTotal > 0 && (
                <span className="tg-tab-unread-badge">{coursesUnreadTotal}</span>
              )}
            </button>
            <button
              type="button"
              className={`tg-tab-btn ${activeTab === "unread" ? "active" : ""}`}
              onClick={() => setActiveTab("unread")}
            >
              {dict.unread}
              {unreadTotal > 0 && (
                <span className="tg-tab-unread-badge">{unreadTotal}</span>
              )}
            </button>
          </div>

          <div className="tg-chat-list">
            {/* Search results take over the list while user is typing. */}
            {showResults ? (
              <>
                {localDirectMatches.length > 0 && (
                  <>
                    <div className="tg-section-title">{dict.direct}</div>
                    {localDirectMatches.map(({ user, lastMessage, unreadCount }) => (
                      <Link
                        key={user.id}
                        href={`/messages?user=${user.id}`}
                        className={`tg-chat-item ${user.id === selectedUserId ? "active" : ""}`}
                        onClick={() => {
                          setQuery("");
                          closeSidebarOnMobile();
                        }}
                      >
                        <div className="tg-chat-avatar">
                          {user.image ? (
                            <Image src={user.image} alt={user.fullName} width={52} height={52} />
                          ) : (
                            <span>{user.fullName?.[0] || "U"}</span>
                          )}
                        </div>

                        <div className="tg-chat-content">
                          <div className="tg-chat-top">
                            <h3 className="tg-chat-name">{user.fullName}</h3>
                            <span className="tg-chat-time">
                              {isClient && lastMessage ? new Date(lastMessage.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              }) : ""}
                            </span>
                          </div>
                          <div className="tg-chat-bottom">
                            <p className="tg-chat-preview">
                              {lastMessage ? (lastMessage.senderId === sessionUserId ? "You: " : "") : ""}
                              {lastMessage ? lastMessage.content : dict.startConversation}
                            </p>
                            {unreadCount > 0 && (
                              <span className="tg-unread-badge">{unreadCount}</span>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </>
                )}

                {localGroupMatches.length > 0 && (
                  <>
                    <div className="tg-section-title">{dict.courseChats}</div>
                    {localGroupMatches.map((group) => (
                      <Link
                        key={group.id}
                        href={`/messages?group=${group.id}`}
                        className={`tg-chat-item ${group.id === selectedGroupId ? "active" : ""}`}
                        onClick={() => {
                          setQuery("");
                          closeSidebarOnMobile();
                        }}
                      >
                        <div className="tg-chat-avatar tg-group-avatar">
                          {group.avatar ? (
                            <Image src={group.avatar} alt={group.name} width={52} height={52} />
                          ) : (
                            <UiIcon name="users" size={20} />
                          )}
                        </div>

                        <div className="tg-chat-content">
                          <div className="tg-chat-top">
                            <h3 className="tg-chat-name">{group.name}</h3>
                            <span className="tg-chat-time">
                              {isClient && group.lastMessage ? new Date(group.lastMessage.createdAt).toLocaleDateString() : ""}
                            </span>
                          </div>
                          <div className="tg-chat-bottom">
                            <p className="tg-chat-preview">
                              {group.lastMessage ? `${group.lastMessage.senderName}: ` : ""}
                              {group.lastMessage ? group.lastMessage.content : ""}
                            </p>
                            {group.unreadCount > 0 && (
                              <span className="tg-unread-badge">{group.unreadCount}</span>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </>
                )}

                <div className="tg-section-title">
                  {searching ? dict.searchingPeople : dict.peopleSuggestions}
                </div>
                {liveResults.length === 0 && localDirectMatches.length === 0 && localGroupMatches.length === 0 && !searching ? (
                  <div className="tg-empty-state">
                    <div className="tg-empty-icon">
                      <UiIcon name="search" size={36} />
                    </div>
                    <h3>{dict.noMatches}</h3>
                    <p>{dict.tryDifferent}</p>
                  </div>
                ) : (
                  liveResults
                    .filter(u => !localDirectMatches.some(m => m.user.id === u.id))
                    .map((user) => (
                      <Link
                        key={user.id}
                        href={`/messages?user=${user.id}`}
                        className="tg-chat-item"
                        onClick={() => {
                          setQuery("");
                          closeSidebarOnMobile();
                        }}
                      >
                        <div className="tg-chat-avatar">
                          {user.image ? (
                            <Image src={user.image} alt={user.fullName} width={52} height={52} />
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
            ) : activeTab === "groups" ? (
              <>
                {/* Group Chats Section */}
                {groupChatsList.length === 0 ? (
                  <div className="tg-empty-state">
                    <div className="tg-empty-icon">
                      <UiIcon name="users" size={36} />
                    </div>
                    <h3>{dict.noGroupChats}</h3>
                    <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                      {dict.joinFromGroups}
                    </p>
                  </div>
                ) : (
                  groupChatsList.map(renderGroupChatItem)
                )}
              </>
            ) : activeTab === "courses" ? (
              <>
                {/* Course Chats Section */}
                {courseChatsList.length === 0 ? (
                  <div className="tg-empty-state">
                    <div className="tg-empty-icon">
                      <UiIcon name="book-open" size={36} />
                    </div>
                    <h3>{dict.noCourseChats}</h3>
                    <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                      {dict.joinFromCourses}
                    </p>
                  </div>
                ) : (
                  courseChatsList.map(renderGroupChatItem)
                )}
              </>
            ) : activeTab === "unread" ? (
              <>
                {/* Unread Section */}
                {unreadConversations.length === 0 && unreadGroupChats.length === 0 ? (
                  <div className="tg-empty-state">
                    <div className="tg-empty-icon">
                      <UiIcon name="check" size={36} />
                    </div>
                    <h3>{dict.allCaughtUp}</h3>
                    <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                      {dict.noUnread}
                    </p>
                  </div>
                ) : (
                  <>
                    {unreadConversations.map(renderConversationItem)}
                    {unreadGroupChats.map(renderGroupChatItem)}
                  </>
                )}
              </>
            ) : (
              <>
                {/* Direct Messages Section */}
                {conversations.length === 0 ? (
                  <div className="tg-empty-state">
                    <div className="tg-empty-icon">
                      <UiIcon name="message" size={48} />
                    </div>
                    <h3>{dict.noMessages}</h3>
                    <p>{dict.startConversation}</p>
                  </div>
                ) : (
                  conversations.map(renderConversationItem)
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
              <h2>{dict.selectChat}</h2>
              <p>{dict.selectChatHint}</p>
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
                        <Image src={activeUser.image} alt={activeUser.fullName} width={48} height={48} />
                      ) : (
                        <span>{activeUser.fullName?.[0] || "U"}</span>
                      )
                    ) : activeGroup?.avatar ? (
                      <Image src={activeGroup.avatar} alt={activeGroup.name} width={48} height={48} />
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
                    <ChatHeaderMenu kind="group" targetId={activeGroup.id} isGroupAdmin={isGroupAdmin} />
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
