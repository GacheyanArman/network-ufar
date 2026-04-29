"use client";

import { useOptimistic } from "react";
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

  return (
    <section className="card old-feed-card">
      <div className="old-feed-header">
        <div>
          <strong>My News</strong>
          <span>› Top News</span>
        </div>
        <a href="#recent-posts">View Most Recent</a>
      </div>

      <div className="old-feed-composer">
        <PostComposer
          currentUser={currentUser}
          onOptimisticPost={addOptimisticPost}
        />
      </div>

      <div id="recent-posts" className="old-feed-list">
        {posts.length === 0 ? (
          <div className="old-feed-empty">
            No posts yet. Be the first to post something.
          </div>
        ) : (
          posts.map((post: FeedPost) => (
            <PostCard key={post.id} post={post} currentUser={currentUser} />
          ))
        )}
      </div>
    </section>
  );
}