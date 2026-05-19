import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/shared/db/db";
import { lostFoundItems, users } from "@/shared/db/schema";
import { getSession } from "@/shared/auth/session";
import LostFoundClient from "@/features/lost-found/components/LostFoundClient";

export default async function LostFoundPage() {
  const session = await getSession();
  if (!session?.userId) redirect("/login");

  const items = await db
    .select({
      id: lostFoundItems.id,
      title: lostFoundItems.title,
      type: lostFoundItems.type,
      description: lostFoundItems.description,
      location: lostFoundItems.location,
      itemDate: lostFoundItems.itemDate,
      imageUrl: lostFoundItems.imageUrl,
      contact: lostFoundItems.contact,
      status: lostFoundItems.status,
      ownerId: lostFoundItems.ownerId,
      ownerName: users.fullName,
      createdAt: lostFoundItems.createdAt,
    })
    .from(lostFoundItems)
    .leftJoin(users, eq(lostFoundItems.ownerId, users.id))
    .orderBy(desc(lostFoundItems.createdAt))
    .limit(100);

  return <LostFoundClient items={items} currentUserId={session.userId} />;
}
