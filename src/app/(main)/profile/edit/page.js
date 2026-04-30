import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import ProfileEditForm from "@/components/ProfileEditForm";

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
      bio: users.bio,
      image: users.image,
      coverImage: users.coverImage,
      gender: users.gender,
      relationshipStatus: users.relationshipStatus,
      birthDate: users.birthDate,
    })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  if (!currentUser) {
    redirect("/login");
  }

  return <ProfileEditForm user={currentUser} error={error} />;
}