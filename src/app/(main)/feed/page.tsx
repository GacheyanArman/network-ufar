import { redirect } from "next/navigation";
import { getSession } from "@/shared/auth/session";
import { getUnifiedFeed } from "@/features/feed/server/queries";
import FeedClient from "@/features/feed/components/FeedClient";
import { PageShell } from "@/shared/ui/Layout";

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

  return (
    <PageShell variant="narrow">
      <FeedClient initialItems={items} currentUser={currentUser} />
    </PageShell>
  );
}
