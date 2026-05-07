import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { 
  libraryResources, 
  libraryReadingLists, 
  libraryReadingListItems,
  librarySavedResources,
  users 
} from "@/lib/schema";
import { getSession } from "@/lib/session";
import { eq, desc } from "drizzle-orm";
import LibraryPageClient from "@/components/LibraryPageClient";

export const metadata = {
  title: "UFAR Library | Network",
  description: "Find books, reading lists, academic resources and useful library information.",
};

export default async function LibraryPage() {
  const session = await getSession();

  if (!session?.userId) {
    redirect("/login");
  }

  // Fetch approved resources
  const resources = await db
    .select({
      id: libraryResources.id,
      title: libraryResources.title,
      author: libraryResources.author,
      type: libraryResources.type,
      faculty: libraryResources.faculty,
      subject: libraryResources.subject,
      description: libraryResources.description,
      availability: libraryResources.availability,
      locationOrLink: libraryResources.locationOrLink,
      isFeatured: libraryResources.isFeatured,
      createdAt: libraryResources.createdAt,
    })
    .from(libraryResources)
    .where(eq(libraryResources.status, "approved"))
    .orderBy(desc(libraryResources.createdAt));

  // Fetch reading lists
  const readingLists = await db
    .select({
      id: libraryReadingLists.id,
      title: libraryReadingLists.title,
      description: libraryReadingLists.description,
      faculty: libraryReadingLists.faculty,
      subject: libraryReadingLists.subject,
      professorOrCourse: libraryReadingLists.professorOrCourse,
      createdAt: libraryReadingLists.createdAt,
    })
    .from(libraryReadingLists)
    .orderBy(desc(libraryReadingLists.createdAt));

  // Fetch reading list items to attach to reading lists
  const listItems = await db
    .select({
      id: libraryReadingListItems.id,
      listId: libraryReadingListItems.listId,
      resourceId: libraryReadingListItems.resourceId,
      priority: libraryReadingListItems.priority,
    })
    .from(libraryReadingListItems);

  // Attach items to reading lists
  const readingListsWithItems = readingLists.map(list => {
    const items = listItems.filter(item => item.listId === list.id);
    return {
      ...list,
      items,
    };
  });

  // Fetch user's saved resources
  const savedItems = await db
    .select({
      resourceId: librarySavedResources.resourceId,
      listId: librarySavedResources.listId,
    })
    .from(librarySavedResources)
    .where(eq(librarySavedResources.userId, session.userId));

  const savedResourceIds = savedItems.filter(i => i.resourceId).map(i => i.resourceId);
  const savedListIds = savedItems.filter(i => i.listId).map(i => i.listId);

  return (
    <LibraryPageClient
      resources={resources}
      readingLists={readingListsWithItems}
      savedResourceIds={savedResourceIds}
      savedListIds={savedListIds}
      currentUserId={session.userId}
    />
  );
}