"use client";

import { useCallback, useOptimistic, useEffect, useRef, useState } from "react";
import PostCard from "@/features/feed/components/PostCard";
import PostComposer from "@/features/feed/components/PostComposer";
import FeedEventCard from "@/features/feed/components/FeedEventCard";
import FeedPhotoCard from "@/features/feed/components/FeedPhotoCard";
import FeedStudyGroupCard from "@/features/feed/components/FeedStudyGroupCard";
import FeedMaterialCard from "@/features/feed/components/FeedMaterialCard";
import FeedBirthdayCard from "@/features/feed/components/FeedBirthdayCard";
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
  comments?: PostComment[];
  feedScore?: number;
  feedReason?: string;
  isOptimistic?: boolean;
};

type FeedClientProps = {
  initialItems: UnifiedFeedItem[];
  currentUser: CurrentUser;
};

type FilterMode = "all" | "posts" | "events" | "media" | "materials";

const FILTER_OPTIONS: { value: FilterMode; label: string }[] = [
  { value: "all", label: "All" },
  { value: "posts", label: "Posts" },
  { value: "events", label: "Events" },
  { value: "media", label: "Media" },
  { value: "materials", label: "Materials" },
];

function renderFeedItem(item: UnifiedFeedItem) {
  switch (item.type) {
    case "post":
      return <PostCard key={`post-${item.id}`} post={item} />;
    case "announcement":
      return (
        <div key={`ann-${item.id}`} style={{ position: "relative" }}>
          <div
            style={{
              position: "absolute",
              top: "12px",
              right: "12px",
              zIndex: 2,
              background: "linear-gradient(135deg, var(--french-blue), var(--french-navy))",
              color: "var(--bg-card)",
              fontSize: "0.68rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              padding: "3px 10px",
              borderRadius: "6px",
            }}
          >
            📌 Announcement
          </div>
          <PostCard post={item} />
        </div>
      );
    case "event":
      return <FeedEventCard key={`event-${item.id}`} item={item} />;
    case "photo":
      return <FeedPhotoCard key={`photo-${item.id}`} item={item} />;
    case "study_group":
      return <FeedStudyGroupCard key={`group-${item.id}`} item={item} />;
    case "material":
      return <FeedMaterialCard key={`mat-${item.id}`} item={item} />;
    case "birthday":
      return <FeedBirthdayCard key={`bday-${item.id}`} item={item} />;
    default:
      return null;
  }
}

function filterItems(items: UnifiedFeedItem[], filter: FilterMode): UnifiedFeedItem[] {
  if (filter === "all") return items;
  if (filter === "posts") return items.filter((i) => i.type === "post" || i.type === "announcement");
  if (filter === "events") return items.filter((i) => i.type === "event");
  if (filter === "media") return items.filter((i) => i.type === "photo" || (i.type === "post" && i.imageUrl));
  if (filter === "materials") return items.filter((i) => i.type === "material" || i.type === "study_group");
  return items;
}

export default function FeedClient({ initialItems, currentUser }: FeedClientProps) {
  const postItems = initialItems.filter((i): i is UnifiedFeedItem & { type: "post" } => i.type === "post");

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
  const [displayed, setDisplayed] = useState<UnifiedFeedItem[]>(initialItems.slice(0, 12));
  const [hasMore, setHasMore] = useState(initialItems.length > 12);
  const [isLoading, setIsLoading] = useState(false);
  const observerRef = useRef<HTMLDivElement>(null);

  const filtered = filterItems(items, filterBy);

  // Reset pagination whenever the underlying items or filter change.
  // Using the "store previous prop" pattern so we don't run setState inside an effect.
  const filterKey = `${items.length}:${filterBy}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (prevFilterKey !== filterKey) {
    setPrevFilterKey(filterKey);
    setDisplayed(filtered.slice(0, 12));
    setHasMore(filtered.length > 12);
  }

  const loadMore = useCallback(() => {
    setIsLoading(true);
    setTimeout(() => {
      const currentLength = displayed.length;
      const next = filtered.slice(0, currentLength + 10);
      setDisplayed(next);
      setHasMore(next.length < filtered.length);
      setIsLoading(false);
    }, 300);
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

  return (
    <section className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--border-color-light)" }}>
        <PostComposer currentUser={currentUser} onOptimisticPost={addOptimisticPost} />
      </div>

      <div
        style={{
          display: "flex",
          gap: "6px",
          padding: "8px 18px 12px",
          borderBottom: "1px solid var(--border-color-light)",
          flexWrap: "wrap",
        }}
      >
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilterBy(opt.value)}
            style={{
              border: "none",
              borderRadius: "8px",
              background: filterBy === opt.value
                ? "linear-gradient(135deg, var(--french-blue), var(--french-navy))"
                : "var(--bg-hover)",
              color: filterBy === opt.value ? "var(--bg-card)" : "var(--text-secondary)",
              fontSize: "0.80rem",
              fontWeight: filterBy === opt.value ? 700 : 500,
              padding: "5px 14px",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div>
        {displayed.length === 0 ? (
          <div style={{ padding: "32px 18px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.92rem" }}>
            No items match this filter.
          </div>
        ) : (
          <>
            {displayed.map((item) => renderFeedItem(item))}

            {hasMore && (
              <div
                ref={observerRef}
                style={{ padding: "20px", textAlign: "center", color: "var(--text-secondary)", fontSize: "0.86rem" }}
              >
                {isLoading ? "Loading more..." : ""}
              </div>
            )}

            {!hasMore && displayed.length > 0 && (
              <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.86rem" }}>
                You&apos;ve reached the end
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
