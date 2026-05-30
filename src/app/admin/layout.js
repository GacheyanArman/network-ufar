import { redirect } from "next/navigation";
import { getSession } from "@/shared/auth/session";
import { getUserRole, isStaff } from "@/shared/auth/roles";
import { getAdminStats } from "@/features/admin/server/actions";
import AdminShell from "@/features/admin/components/AdminShell";

export default async function AdminLayout({ children }) {
  const session = await getSession();
  if (!session?.userId) redirect("/login");

  const role = await getUserRole(session.userId);
  if (!isStaff(role)) redirect("/");

  const stats = await getAdminStats();

  return <AdminShell stats={stats}>{children}</AdminShell>;
}
