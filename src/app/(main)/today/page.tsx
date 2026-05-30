import { redirect } from "next/navigation";
import { getSession } from "@/shared/auth/session";
import { getCachedUserBasicInfo } from "@/shared/cache/cache";
import TodayDashboard from "@/features/dashboard/components/TodayDashboard";

export default async function TodayPage() {
  const session = await getSession();
  const userId = session?.userId as string | undefined;

  if (!userId) {
    redirect("/login");
  }

  // Reuse the cached user info
  const cachedUser = await getCachedUserBasicInfo(userId);

  return (
    <TodayDashboard
      userId={userId}
      currentUser={cachedUser}
    />
  );
}
