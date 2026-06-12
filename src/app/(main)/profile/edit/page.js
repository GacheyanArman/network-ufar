import { db } from "@/shared/db/db";
import { users } from "@/shared/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/shared/auth/session";
import { redirect } from "next/navigation";
import ProfileEditForm from "@/features/profile/components/ProfileEditForm";

export default async function EditProfilePage({ searchParams }) {
  const session = await getSession();

  if (!session?.userId) {
    redirect("/login");
  }

  const params = await searchParams;
  const error = params?.error ? decodeURIComponent(params.error) : "";

  const [currentUser] = await db
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      username: users.username,
      faculty: users.faculty,
      year: users.year,
      bio: users.bio,
      image: users.image,
      avatarUrl: users.avatarUrl,
      coverImage: users.coverImage,
      studyGroup: users.studyGroup,
      privacyLevel: users.privacyLevel,
      relationshipStatus: users.relationshipStatus,
      lookingFor: users.lookingFor,
    })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  if (!currentUser) {
    redirect("/login");
  }

  return <ProfileEditForm user={currentUser} error={error} />;
}