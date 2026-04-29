import { redirect } from "next/navigation";
import FeedClient from "@/components/FeedClient";
import { getRankedFeedPosts } from "@/lib/feed";
import { getSession } from "@/lib/session";

export default async function Home() {
  const session = await getSession();
  const userId = session?.userId;

  if (typeof userId !== "string" || userId.length === 0) {
    redirect("/login");
  }

  const { currentUser, posts } = await getRankedFeedPosts(userId, 80);

  if (!currentUser) {
    redirect("/login");
  }

  return <FeedClient initialPosts={posts} currentUser={currentUser} />;
}