import { redirect } from "next/navigation";
import { getSession } from "@/shared/auth/session";
import { getCachedUserBasicInfo } from "@/shared/cache/cache";
import TodayDashboard from "@/features/dashboard/components/TodayDashboard";

export default async function HomePage() {
  const session = await getSession();
  const userId = session?.userId as string | undefined;

  if (!userId) {
    redirect("/login");
  }

  // Reuse the cached user info already fetched by the layout — same memo
  // key, so this is essentially free.
  const cachedUser = await getCachedUserBasicInfo(userId);

  return (
    <TodayDashboard
      userId={userId}
      currentUser={cachedUser}
    />
  );
}
