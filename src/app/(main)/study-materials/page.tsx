import { redirect } from "next/navigation";
import { getSession } from "@/shared/auth/session";
import { getMaterials, getOpenMaterialRequests } from "@/features/materials/server/actions";
import { PageShell } from "@/shared/ui/Layout";
import MaterialsPageClient from "@/features/materials/components/MaterialsPageClient";

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
    <PageShell>
      <MaterialsPageClient
        materials={materials}
        openRequests={openRequests}
        currentUserId={session.userId as string}
      />
    </PageShell>
  );
}
