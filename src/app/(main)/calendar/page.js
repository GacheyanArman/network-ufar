import { redirect } from "next/navigation";
import { getSession } from "@/shared/auth/session";
import { getCalendarFeed } from "@/features/courses/server/calendar";
import CalendarPageClient from "@/features/courses/components/CalendarPageClient";

export const metadata = {
  title: "Calendar | UFAR Network",
  description:
    "Track your classes, exams, deadlines, events and study groups in one place.",
};

export default async function CalendarPage() {
  const session = await getSession();
  if (!session?.userId) redirect("/login");

  const { entries, myCommunities } = await getCalendarFeed();

  return (
    <CalendarPageClient
      entries={entries}
      myCommunities={myCommunities}
      currentUserId={session.userId}
    />
  );
}
