import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getMaterials, getOpenMaterialRequests } from "@/app/actions/materials";
import MaterialsPageClient from "@/components/MaterialsPageClient";

export const metadata = {
  title: "Study Materials | UFAR Network",
  description:
    "Find notes, summaries, slides, exam prep files and study resources shared by UFAR students.",
};

// Server-render the materials list using the centralised server action so the
// page, the modal "Browse" tab and any future entry points stay in sync.
export default async function MaterialsPage() {
  const session = await getSession();
  if (!session?.userId) {
    redirect("/login");
  }

  const [materials, openRequests] = await Promise.all([
    getMaterials({ sort: "newest" }),
    getOpenMaterialRequests(),
  ]);

  return (
    <MaterialsPageClient
      materials={materials}
      openRequests={openRequests}
      currentUserId={session.userId as string}
    />
  );
}
