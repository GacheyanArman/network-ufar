import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
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
      gender: users.gender,
      relationshipStatus: users.relationshipStatus,
      birthDate: users.birthDate,
      interests: users.interests,
      languages: users.languages,
      lookingFor: users.lookingFor,
      onboardingComplete: users.onboardingComplete,
    })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  if (!user) redirect("/login");
  if (user.onboardingComplete) redirect("/");

  return (
    <OnboardingClient
      initialFaculty={user.faculty || ""}
      initialYear={user.year || ""}
      initialGroup={user.studyGroup || ""}
      initialGender={user.gender || ""}
      initialRelationshipStatus={user.relationshipStatus || ""}
      initialBirthDate={user.birthDate ? user.birthDate.toISOString().split("T")[0] : ""}
      initialInterests={user.interests || ""}
      initialLanguages={user.languages || ""}
      initialLookingFor={user.lookingFor || ""}
    />
  );
}
