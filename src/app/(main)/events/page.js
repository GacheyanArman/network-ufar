import { redirect } from "next/navigation";
import { db } from "@/shared/db/db";
import { communities, communityMembers, courses, courseEnrollments } from "@/shared/db/schema";
import { getSession } from "@/shared/auth/session";
import { eq, inArray } from "drizzle-orm";
import { getEventsList } from "@/features/events/server/actions";
import { getUserRole, isStaff } from "@/shared/auth/roles";
import { PageShell } from "@/shared/ui/Layout";
import EventsPageClient from "@/features/events/components/EventsPageClient";

export const metadata = {
  title: "Events | UFAR Network",
  description:
    "Discover and RSVP to academic events, workshops, club meetups, parties, sports and more at UFAR.",
};

export default async function EventsPage() {
  const session = await getSession();
  if (!session?.userId) redirect("/login");

  // Initial render shows the "upcoming" feed. The client can switch filters
  // by re-fetching via server actions.
  const initialEvents = await getEventsList({ filter: "upcoming" });

  // Communities the user can create events for. Members can still discover
  // their community events via the "Community" filter; only owners/moderators
  // and platform staff can publish on behalf of a community.
  const role = await getUserRole(session.userId);
  const staff = isStaff(role);
  const memberships = staff
    ? []
    : await db
        .select({
          communityId: communityMembers.communityId,
          memberRole: communityMembers.role,
        })
        .from(communityMembers)
        .where(eq(communityMembers.userId, session.userId));
  const memberCommunityIds = memberships.map((m) => m.communityId);
  const manageableCommunityIds = memberships
    .filter((m) => m.memberRole === "owner" || m.memberRole === "moderator")
    .map((m) => m.communityId);
  const allCommunities = staff
    ? await db
        .select({ id: communities.id, name: communities.name })
        .from(communities)
    : [];
  const filterCommunities = staff
    ? allCommunities
    : memberCommunityIds.length > 0
      ? await db
          .select({ id: communities.id, name: communities.name })
          .from(communities)
          .where(inArray(communities.id, memberCommunityIds))
      : [];
  const myCommunities = staff
    ? allCommunities
    : manageableCommunityIds.length > 0
      ? filterCommunities.filter((c) => manageableCommunityIds.includes(c.id))
      : [];

  const myCourses = await db
    .select({
      id: courses.id,
      name: courses.name,
      code: courses.code,
    })
    .from(courseEnrollments)
    .innerJoin(courses, eq(courseEnrollments.courseId, courses.id))
    .where(eq(courseEnrollments.userId, session.userId));

  return (
    <PageShell>
      <EventsPageClient
        events={initialEvents}
        myCommunities={myCommunities}
        filterCommunities={filterCommunities}
        myCourses={myCourses}
        currentUserId={session.userId}
      />
    </PageShell>
  );
}
