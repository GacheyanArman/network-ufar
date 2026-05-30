import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { db } from "@/shared/db/db";
import { getSession } from "@/shared/auth/session";
import { users, notificationPreferences } from "@/shared/db/schema";
import SettingsClient from "@/features/profile/components/SettingsClient";

export default async function SettingsPage() {
  const session = await getSession();

  if (!session?.userId) {
    redirect("/login");
  }

  const currentUserId = session.userId as string;

  const [currentUser] = await db
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      image: users.image,
    })
    .from(users)
    .where(eq(users.id, currentUserId))
    .limit(1);

  if (!currentUser) {
    redirect("/login");
  }

  const [prefRow] = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, currentUserId))
    .limit(1);

  const prefs = {
    academic: prefRow?.academic ?? true,
    events: prefRow?.events ?? true,
    photos: prefRow?.photos ?? true,
    messages: prefRow?.messages ?? true,
    materials: prefRow?.materials ?? true,
    social: prefRow?.social ?? true,
  };

  return <SettingsClient user={currentUser} prefs={prefs} />;
}
