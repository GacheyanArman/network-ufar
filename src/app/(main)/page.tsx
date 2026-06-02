import { redirect } from "next/navigation";
import { getSession } from "@/shared/auth/session";

export default async function HomePage() {
  const session = await getSession();
  const userId = session?.userId as string | undefined;

  if (!userId) {
    redirect("/login");
  }

  redirect("/today");
}
