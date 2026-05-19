import { redirect } from "next/navigation";
import { and, eq, gt, sql } from "drizzle-orm";
import { db } from "@/shared/db/db";
import {
  photoAlbums,
  stories,
  users,
} from "@/shared/db/schema";
import { getSession } from "@/shared/auth/session";
import { fetchPhotoFeed } from "@/features/photos/server/queries";
import { getActiveStoryAuthors } from "@/features/feed/server/story";
import { getUserRole, isStaff } from "@/shared/auth/roles";
import CampusMomentsFeed from "@/features/feed/components/CampusMomentsFeed";
import { PageShell } from "@/shared/ui/Layout";

export const dynamic = "force-dynamic";

export default async function PhotosPage() {
  const session = await getSession();
  if (!session?.userId) redirect("/login");
  const userId = session.userId as string;

  const [me] = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      image: users.image,
    })
    .from(users)
    .where(eq(users.id, userId));

  const role = await getUserRole(userId);

  // Feed: latest approved, public photos.
  const feed = await fetchPhotoFeed({
    viewerId: userId,
    scope: "public",
    limit: 20,
    withComments: true,
  });

  // Active story authors (24h window).
  const storyAuthors = await getActiveStoryAuthors(userId);

  // Has the viewer posted an active story themselves?
  const ownActiveStoryRows = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(stories)
    .where(and(eq(stories.ownerId, userId), gt(stories.expiresAt, new Date())));
  const hasOwnStory = (ownActiveStoryRows[0]?.count ?? 0) > 0;

  // Albums I own (used for upload modal selector).
  const userAlbums = await db
    .select({ id: photoAlbums.id, title: photoAlbums.title })
    .from(photoAlbums)
    .where(eq(photoAlbums.ownerId, userId));

  return (
    <PageShell variant="narrow">
      <CampusMomentsFeed
        photos={feed}
        storyAuthors={storyAuthors}
        hasOwnStory={hasOwnStory}
        currentUserId={userId}
        currentUserName={me?.fullName ?? "You"}
        currentUserAvatar={me?.image ?? null}
        userAlbums={userAlbums}
        isStaff={isStaff(role)}
      />
    </PageShell>
  );
}
