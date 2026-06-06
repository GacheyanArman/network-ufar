"use client";

import PostCard from "@/features/feed/components/PostCard";

type CurrentUser = {
  id: string;
  fullName: string;
  faculty?: string | null;
  image?: string | null;
  avatarUrl?: string | null;
};

type ProfilePost = {
  id: string;
  content: string;
  imageUrl?: string | null;
  mediaType?: "image" | "video" | null;
  createdAt?: Date | string | null;
  authorId: string;
  authorName?: string;
  authorImage?: string | null;
  likesCount: number;
  commentsCount: number;
  likedByMe?: boolean;
  savedByMe?: boolean;
};

type ProfilePostsClientProps = {
  posts: ProfilePost[];
  currentUser: CurrentUser;
};

export default function ProfilePostsClient({
  posts,
  currentUser,
}: ProfilePostsClientProps) {
  return (
    <>
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={{
            id: post.id,
            content: post.content || "",
            imageUrl: post.imageUrl || null,
            mediaType: post.mediaType || null,
            createdAt: post.createdAt,
            authorId: post.authorId,
            authorName: post.authorName || currentUser.fullName || "User",
            authorImage: post.authorImage || currentUser.image || null,
            likesCount: post.likesCount || 0,
            commentsCount: post.commentsCount || 0,
            repostsCount: 0,
            viewsCount: 0,
            likedByMe: post.likedByMe || false,
            savedByMe: post.savedByMe || false,
            comments: [],
            communityName: null,
          }}
          currentUser={currentUser}
        />
      ))}
    </>
  );
}
