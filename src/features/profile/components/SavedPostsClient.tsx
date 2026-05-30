"use client";

import PostCard from "@/features/feed/components/PostCard";

type CurrentUser = {
  id: string;
  fullName: string;
  faculty?: string | null;
  image?: string | null;
  avatarUrl?: string | null;
};

type SavedPost = {
  id: string;
  content: string;
  imageUrl?: string | null;
  mediaType?: "image" | "video" | null;
  createdAt?: Date | string | null;
  authorId: string;
  authorName: string;
  authorImage?: string | null;
  likesCount: number;
  commentsCount: number;
  likedByMe?: boolean;
  savedByMe?: boolean;
};

type SavedPostsClientProps = {
  posts: SavedPost[];
  currentUser: CurrentUser;
};

export default function SavedPostsClient({
  posts,
  currentUser,
}: SavedPostsClientProps) {
  return (
    <>
      {posts.map((post) => (
        <PostCard key={post.id} post={post} currentUser={currentUser} />
      ))}
    </>
  );
}
