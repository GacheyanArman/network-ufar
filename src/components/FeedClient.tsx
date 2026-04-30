"use client";

import { useOptimistic, useEffect, useRef, useState } from "react";
import PostCard from "@/components/PostCard";
import PostComposer from "@/components/PostComposer";

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
  initialPosts: FeedPost[];
  currentUser: CurrentUser;
};

export default function FeedClient({
  initialPosts,
  currentUser,
}: FeedClientProps) {
  const [posts, addOptimisticPost] = useOptimistic<FeedPost[], FeedPost>(
    initialPosts,
    (currentPosts, newPost) => [newPost, ...currentPosts]
  );

  const [allPosts, setAllPosts] = useState<FeedPost[]>(initialPosts);
  const [displayedPosts, setDisplayedPosts] = useState<FeedPost[]>(initialPosts.slice(0, 10));
  const [hasMore, setHasMore] = useState(initialPosts.length > 10);
  const [isLoading, setIsLoading] = useState(false);
  const [sortBy, setSortBy] = useState<"ranked" | "recent" | "popular">("ranked");
  const [filterBy, setFilterBy] = useState<"all" | "friends" | "media">("all");
  const observerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setAllPosts(posts);
    applyFiltersAndSort(posts);
  }, [posts, sortBy, filterBy]);

  function applyFiltersAndSort(postsToFilter: FeedPost[]) {
    let filtered = [...postsToFilter];

    // Apply filters
    if (filterBy === "friends") {
      filtered = filtered.filter(
        (post) => post.feedReason === "From your friend" || post.authorId === currentUser.id
      );
    } else if (filterBy === "media") {
      filtered = filtered.filter((post) => post.imageUrl);
    }

    // Apply sorting
    if (sortBy === "recent") {
      filtered.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
    } else if (sortBy === "popular") {
      filtered.sort((a, b) => {
        const scoreA = (a.likesCount || 0) * 2 + (a.commentsCount || 0) * 3;
        const scoreB = (b.likesCount || 0) * 2 + (b.commentsCount || 0) * 3;
        return scoreB - scoreA;
      });
    }
    // "ranked" uses the default feedScore order

    setAllPosts(filtered);
    setDisplayedPosts(filtered.slice(0, 10));
    setHasMore(filtered.length > 10);
  }

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, isLoading, displayedPosts.length]);

  function loadMore() {
    setIsLoading(true);

    setTimeout(() => {
      const currentLength = displayedPosts.length;
      const nextPosts = allPosts.slice(0, currentLength + 10);
      setDisplayedPosts(nextPosts);
      setHasMore(nextPosts.length < allPosts.length);
      setIsLoading(false);
    }, 300);
  }

  return (
    <section className="card old-feed-card">
      <div className="old-feed-header">
        <div>
          <strong>My News</strong>
          <span>› Top News</span>
        </div>
        <a href="#recent-posts">View Most Recent</a>
      </div>

      <div style={{ padding: "16px", borderBottom: "1px solid var(--border-color)" }}>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <label style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-secondary)" }}>
              Sort:
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              style={{
                padding: "6px 12px",
                borderRadius: "8px",
                border: "1px solid var(--border-color)",
                fontSize: "14px",
                background: "var(--bg-primary)",
              }}
            >
              <option value="ranked">Ranked for You</option>
              <option value="recent">Most Recent</option>
              <option value="popular">Most Popular</option>
            </select>
          </div>

          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <label style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-secondary)" }}>
              Filter:
            </label>
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value as any)}
              style={{
                padding: "6px 12px",
                borderRadius: "8px",
                border: "1px solid var(--border-color)",
                fontSize: "14px",
                background: "var(--bg-primary)",
              }}
            >
              <option value="all">All Posts</option>
              <option value="friends">Friends Only</option>
              <option value="media">Media Posts</option>
            </select>
          </div>
        </div>
      </div>

      <div className="old-feed-composer">
        <PostComposer
          currentUser={currentUser}
          onOptimisticPost={addOptimisticPost}
        />
      </div>

      <div id="recent-posts" className="old-feed-list">
        {displayedPosts.length === 0 ? (
          <div className="old-feed-empty">
            No posts yet. Be the first to post something.
          </div>
        ) : (
          <>
            {displayedPosts.map((post: FeedPost) => (
              <PostCard key={post.id} post={post} currentUser={currentUser} />
            ))}

            {hasMore && (
              <div
                ref={observerRef}
                style={{
                  padding: "20px",
                  textAlign: "center",
                  color: "var(--text-secondary)",
                }}
              >
                {isLoading ? "Loading more posts..." : ""}
              </div>
            )}

            {!hasMore && displayedPosts.length > 0 && (
              <div
                style={{
                  padding: "20px",
                  textAlign: "center",
                  color: "var(--text-muted)",
                  fontSize: "14px",
                }}
              >
                You've reached the end
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}