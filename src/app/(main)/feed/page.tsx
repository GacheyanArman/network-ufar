import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/shared/auth/session";
import { getUnifiedFeed } from "@/features/feed/server/queries";
import FeedClient from "@/features/feed/components/FeedClient";
import { PageShell } from "@/shared/ui/Layout";
import FeedLoading from "./loading";

const FILTER_MODES = ["all", "my_groups", "campus", "questions", "events", "materials"] as const;
type FilterMode = (typeof FILTER_MODES)[number];

async function FeedContent({ userId, initialFilter }: { userId: string; initialFilter: FilterMode }) {
  const { currentUser, items, myCommunityIds } = await getUnifiedFeed(userId);

  if (!currentUser) {
    redirect("/login");
  }

  return (
    <FeedClient
      initialItems={items}
      currentUser={currentUser}
      myCommunityIds={myCommunityIds}
      initialFilter={initialFilter}
    />
  );
}

export default async function FeedPage({
  searchParams,
}: {
  searchParams?: Promise<{ filter?: string }>;
}) {
  const session = await getSession();
  const userId = session?.userId as string | undefined;

  if (!userId) {
    redirect("/login");
  }

  const params = (await searchParams) || {};
  const initialFilter: FilterMode = FILTER_MODES.includes(params.filter as FilterMode)
    ? (params.filter as FilterMode)
    : "all";

  return (
    <PageShell variant="narrow">
      <Suspense fallback={<FeedLoading />}>
        <FeedContent userId={userId} initialFilter={initialFilter} />
      </Suspense>
    </PageShell>
  );
}
