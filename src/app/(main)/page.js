import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  comments,
  communities,
  postLikes,
  posts,
  users,
} from "@/lib/schema";
import { getSession } from "@/lib/session";
import FeedClient from "@/components/FeedClient";

export default async function Home() {
  const session = await getSession();

  const [currentUser] = session?.userId
    ? await db
        .select({
          id: users.id,
          fullName: users.fullName,
          faculty: users.faculty,
          image: users.image,
        })
        .from(users)
        .where(eq(users.id, session.userId))
        .limit(1)
    : [];

  const allPosts = await db
    .select({
      id: posts.id,
      content: posts.content,
      imageUrl: posts.imageUrl,
      createdAt: posts.createdAt,
      authorId: posts.authorId,
      likesCount: posts.likesCount,
      commentsCount: posts.commentsCount,
      authorName: users.fullName,
      authorFaculty: users.faculty,
      authorImage: users.image,
      communityName: communities.name,
    })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .leftJoin(communities, eq(posts.communityId, communities.id))
    .orderBy(desc(posts.createdAt));

  const postIds = allPosts.map((post) => post.id);

  const likedRows =
    session?.userId && postIds.length > 0
      ? await db
          .select({ postId: postLikes.postId, userId: postLikes.userId })
          .from(postLikes)
          .where(inArray(postLikes.postId, postIds))
      : [];

  const likedPostIds = new Set(
    likedRows
      .filter((row) => row.userId === session?.userId)
      .map((row) => row.postId)
  );

  const postComments =
    postIds.length > 0
      ? await db
          .select({
            id: comments.id,
            postId: comments.postId,
            content: comments.content,
            createdAt: comments.createdAt,
            authorId: comments.authorId,
            authorName: users.fullName,
          })
          .from(comments)
          .innerJoin(users, eq(comments.authorId, users.id))
          .where(inArray(comments.postId, postIds))
          .orderBy(comments.createdAt)
      : [];

  const commentsByPost = new Map();
  for (const comment of postComments) {
    const list = commentsByPost.get(comment.postId) || [];
    list.push(comment);
    commentsByPost.set(comment.postId, list);
  }

  const normalizedPosts = allPosts.map((post) => ({
    ...post,
    likedByMe: likedPostIds.has(post.id),
    comments: commentsByPost.get(post.id) || [],
  }));

  return (
    <FeedClient
      initialPosts={normalizedPosts}
      currentUser={currentUser || null}
    />
  );
}
