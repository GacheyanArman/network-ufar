import { redirect } from "next/navigation";
import { getSession } from "@/shared/auth/session";
import { db } from "@/shared/db/db";
import { users } from "@/shared/db/schema";
import { eq } from "drizzle-orm";
import OnboardingClient from "./OnboardingClient";

export default async function OnboardingPage() {
  const session = await getSession();
  if (!session?.userId) {
    redirect("/login");
  }

  const [user] = await db
    .select({
      faculty: users.faculty,
      year: users.year,
      studyGroup: users.studyGroup,
      onboardingComplete: users.onboardingComplete,
    })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  if (!user) redirect("/login");
  if (user.onboardingComplete) redirect("/today");

  return (
    <OnboardingClient
      initialFaculty={user.faculty || ""}
      initialYear={user.year || ""}
      initialGroup={user.studyGroup || ""}
    />
  );
}
