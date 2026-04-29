"use client";

import { useOptimistic } from "react";
import PostCard from "@/components/PostCard";
import PostComposer from "@/components/PostComposer";

export default function FeedClient({ initialPosts, currentUser }) {
  const [posts, addOptimisticPost] = useOptimistic(
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
          posts.map((post) => (
            <PostCard key={post.id} post={post} currentUser={currentUser} />
          ))
        )}
      </div>
    </section>
  );
}