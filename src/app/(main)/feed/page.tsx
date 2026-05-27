import { redirect } from "next/navigation";
import { getSession } from "@/shared/auth/session";
import { getUnifiedFeed } from "@/features/feed/server/queries";
import FeedClient from "@/features/feed/components/FeedClient";
import { PageHeader, PageShell } from "@/shared/ui/Layout";

export default async function FeedPage() {
  const session = await getSession();
  const userId = session?.userId as string | undefined;

  if (!userId) {
    redirect("/login");
  }

  const { currentUser, items } = await getUnifiedFeed(userId);

  if (!currentUser) {
    redirect("/login");
  }

  // FeedClient handles both populated and empty states internally and always
  // renders the PostComposer, so users can create the first post when their
  // feed is empty.
  return (
    <PageShell variant="narrow">
      <PageHeader
        title="Campus Feed"
      />
      <FeedClient initialItems={items} currentUser={currentUser} />
    </PageShell>
  );
}
