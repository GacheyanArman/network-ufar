import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { communities, communityMembers } from "@/lib/schema";
import { getSession } from "@/lib/session";
import { eq, inArray } from "drizzle-orm";
import { getEventsList } from "@/app/actions/events";
import { getUserRole, isStaff } from "@/lib/roles";
import EventsPageClient from "@/components/EventsPageClient";

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

  return (
    <EventsPageClient
      events={initialEvents}
      myCommunities={myCommunities}
      filterCommunities={filterCommunities}
      currentUserId={session.userId}
    />
  );
}
