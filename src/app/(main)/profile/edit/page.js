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
<<<<<<< HEAD
      year: users.year,
      bio: users.bio,
      image: users.image,
      coverImage: users.coverImage,
=======
      bio: users.bio,
      image: users.image,
      coverImage: users.coverImage,
      gender: users.gender,
      relationshipStatus: users.relationshipStatus,
      birthDate: users.birthDate,
>>>>>>> bade7c6844d8ae0ad73fb233bf09d978b200e3a6
    })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  if (!currentUser) {
    redirect("/login");
  }

  return <ProfileEditForm user={currentUser} error={error} />;
}