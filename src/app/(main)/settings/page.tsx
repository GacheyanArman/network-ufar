import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/shared/db/db";
import { getSession } from "@/shared/auth/session";
import { notificationPreferences, users } from "@/shared/db/schema";
import ProfileSettingsClient from "@/features/profile/components/ProfileSettingsClient";

export const metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  const session = await getSession();

  if (!session?.userId) {
    redirect("/login");
  }

  const currentUserId = session.userId as string;

  const [currentUser] = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      username: users.username,
      email: users.email,
      image: users.image,
      avatarUrl: users.avatarUrl,
      role: users.role,
      emailVerified: users.emailVerified,
      privacyLevel: users.privacyLevel,
      createdAt: users.createdAt,
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

  return (
    <div className="uf-settings-page" style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", marginBottom: 24 }}>Settings</h1>
      <div className="uf-card" style={{ padding: "24px", background: "#ffffff", borderRadius: "16px", border: "1px solid #d9e2ef", boxShadow: "0 2px 10px rgba(15, 23, 42, 0.04)" }}>
        <ProfileSettingsClient user={currentUser} prefs={prefs} />
      </div>
    </div>
  );
}
