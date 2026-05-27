"use client";

import { useCallback, useOptimistic, useEffect, useRef, useState } from "react";
import PostCard from "@/features/feed/components/PostCard";
import PostComposer from "@/features/feed/components/PostComposer";
import { useLanguage } from "@/contexts/LanguageContext";
import type { UnifiedFeedItem } from "@/features/feed/server/queries";

type CurrentUser = {
  id: string;
  fullName: string;
  faculty?: string | null;
  image?: string | null;
  avatarUrl?: string | null;
};

type PostComment = {
  id: string;
  postId: string;
  content: string;
  createdAt?: Date | string | null;
  authorId: string;
  authorName?: string | null;
  authorImage?: string | null;
};

type FeedPost = {
  id: string;
  content: string;
  imageUrl?: string | null;
  mediaType?: "image" | "video" | null;
  createdAt?: Date | string | null;
  authorId: string;
  communityId?: string | null;
  likesCount: number;
  commentsCount: number;
  authorName: string;
  authorFaculty?: string | null;
  authorImage?: string | null;
  communityName?: string | null;
  likedByMe?: boolean;
  savedByMe?: boolean;
  comments?: PostComment[];
  feedScore?: number;
  feedReason?: string;
  isOptimistic?: boolean;
};

type FeedClientProps = {
  initialItems: UnifiedFeedItem[];
  currentUser: CurrentUser;
};

type FilterMode = "all" | "questions" | "announcements" | "my_courses";

/**
 * Renders a post item, wrapping announcements in a visual badge.
 */
function renderFeedItem(item: UnifiedFeedItem, currentUser: CurrentUser) {
  if (item.type === "post" || item.type === "announcement") {
    return (
      <div key={`${item.type}-${item.id}`} className="feed-post-wrapper">
        {item.type === "announcement" && (
          <div className="feed-type-badge feed-type-badge--announcement">
            📢 Announcement
          </div>
        )}
        {"postType" in item && (item as any).postType === "question" && (
          <div className="feed-type-badge feed-type-badge--question">
            ❓ Question
          </div>
        )}
        <PostCard post={item} currentUser={currentUser} />
      </div>
    );
  }

  // For non-post types that slip through, render them normally
  return null;
}

/**
 * Filters items to show only posts & announcements (academic feed).
 * Further filters by tab selection.
 */
function filterItems(items: UnifiedFeedItem[], filter: FilterMode): UnifiedFeedItem[] {
  // First, only keep posts and announcements (no photos, events, materials, etc.)
  const academic = items.filter(
    (i) => i.type === "post" || i.type === "announcement"
  );

  switch (filter) {
    case "questions":
      return academic.filter(
        (i) => i.type === "post" && "postType" in i && (i as any).postType === "question"
      );
    case "announcements":
      return academic.filter((i) => i.type === "announcement");
    case "my_courses":
      // Show posts that have a communityId (course-related) or are from a community
      return academic.filter(
        (i) => (i as any).communityId || (i as any).communityName
      );
    default:
      return academic;
  }
}

export default function FeedClient({ initialItems, currentUser }: FeedClientProps) {
  const { t } = useLanguage();

  const [items, addOptimisticPost] = useOptimistic(
    initialItems,
    (current: UnifiedFeedItem[], newPost: FeedPost): UnifiedFeedItem[] => {
      const feedItem: UnifiedFeedItem = {
        type: "post",
        id: newPost.id,
        content: newPost.content,
        imageUrl: newPost.imageUrl ?? null,
        createdAt: newPost.createdAt ? new Date(newPost.createdAt) : new Date(),
        authorId: newPost.authorId,
        communityId: newPost.communityId ?? null,
        likesCount: newPost.likesCount,
        commentsCount: newPost.commentsCount,
        authorName: newPost.authorName,
        authorFaculty: newPost.authorFaculty ?? null,
        authorImage: newPost.authorImage ?? null,
        communityName: newPost.communityName ?? null,
        likedByMe: newPost.likedByMe ?? false,
        savedByMe: newPost.savedByMe ?? false,
        comments: (newPost.comments ?? []).map((c) => ({
          id: c.id,
          postId: c.postId,
          content: c.content,
          createdAt: c.createdAt ?? null,
          authorId: c.authorId,
          authorName: c.authorName ?? null,
          authorImage: c.authorImage ?? null,
        })),
        feedScore: newPost.feedScore ?? 0,
        feedReason: newPost.feedReason ?? "Your post",
      };
      return [feedItem, ...current];
    }
  );

  const [filterBy, setFilterBy] = useState<FilterMode>("all");
  const filtered = filterItems(items, filterBy);
  const [displayed, setDisplayed] = useState<UnifiedFeedItem[]>(filtered.slice(0, 15));
  const [hasMore, setHasMore] = useState(filtered.length > 15);
  const [isLoading, setIsLoading] = useState(false);
  const observerRef = useRef<HTMLDivElement>(null);

  // Reset pagination whenever filter or items change
  const filterKey = `${items.length}:${filterBy}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (prevFilterKey !== filterKey) {
    setPrevFilterKey(filterKey);
    const newFiltered = filterItems(items, filterBy);
    setDisplayed(newFiltered.slice(0, 15));
    setHasMore(newFiltered.length > 15);
  }

  const loadMore = useCallback(() => {
    setIsLoading(true);
    setTimeout(() => {
      const currentLength = displayed.length;
      const next = filtered.slice(0, currentLength + 10);
      setDisplayed(next);
      setHasMore(next.length < filtered.length);
      setIsLoading(false);
    }, 200);
  }, [displayed.length, filtered]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );
    if (observerRef.current) observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [hasMore, isLoading, loadMore]);

  const TABS: { value: FilterMode; label: string; icon: string }[] = [
    { value: "all", label: t("feed.tabAll") || "All", icon: "" },
    { value: "questions", label: t("feed.tabQuestions") || "Questions", icon: "❓" },
    { value: "announcements", label: t("feed.tabAnnouncements") || "Announcements", icon: "📢" },
    { value: "my_courses", label: t("feed.tabMyCourses") || "My Courses", icon: "📚" },
  ];

  return (
    <div className="feed-container">
      {/* Post Composer */}
      <div className="feed-composer-wrap">
        <PostComposer currentUser={currentUser} onOptimisticPost={addOptimisticPost} />
      </div>

      {/* Filter Tabs */}
      <div className="feed-tabs" role="tablist" aria-label="Feed filters">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            role="tab"
            aria-selected={filterBy === tab.value}
            onClick={() => setFilterBy(tab.value)}
            className={`feed-tab ${filterBy === tab.value ? "feed-tab--active" : ""}`}
          >
            {tab.icon && <span className="feed-tab-icon">{tab.icon}</span>}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Feed Items */}
      <div className="feed-items">
        {displayed.length === 0 ? (
          <div className="feed-empty">
            <div className="feed-empty-icon">
              {filterBy === "questions" ? "❓" : filterBy === "announcements" ? "📢" : "📝"}
            </div>
            <p className="feed-empty-title">
              {filterBy === "questions"
                ? (t("feed.noQuestions") || "No questions yet")
                : filterBy === "announcements"
                ? (t("feed.noAnnouncements") || "No announcements yet")
                : (t("feed.noPosts") || "No posts yet")}
            </p>
            <p className="feed-empty-hint">
              {t("feed.beFirst") || "Be the first to share something!"}
            </p>
          </div>
        ) : (
          <>
            {displayed.map((item) => renderFeedItem(item, currentUser))}

            {hasMore && (
              <div ref={observerRef} className="feed-loading">
                {isLoading ? (t("common.loading") || "Loading...") : ""}
              </div>
            )}

            {!hasMore && displayed.length > 0 && (
              <div className="feed-end">
                {t("feed.reachedEnd") || "You\u2019ve reached the end"}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
