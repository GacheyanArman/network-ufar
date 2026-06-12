import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/shared/auth/session";
import { getUnifiedFeed } from "@/features/feed/server/queries";
import FeedClient from "@/features/feed/components/FeedClient";
import { PageShell } from "@/shared/ui/Layout";
import FeedLoading from "./loading";

async function FeedContent({ userId }: { userId: string }) {
  const { currentUser, items, myCommunityIds } = await getUnifiedFeed(userId);

  if (!currentUser) {
    redirect("/login");
  }

  return (
    <FeedClient
      initialItems={items}
      currentUser={currentUser}
      myCommunityIds={myCommunityIds}
    />
  );
}

export default async function FeedPage() {
  const session = await getSession();
  const userId = session?.userId as string | undefined;

  if (!userId) {
    redirect("/login");
  }

  return (
    <PageShell variant="narrow">
      <Suspense fallback={<FeedLoading />}>
        <FeedContent userId={userId} />
      </Suspense>
    </PageShell>
  );
}
