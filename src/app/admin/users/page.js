import { cookies } from "next/headers";
import { getUsersForAdmin } from "@/features/admin/server/actions";
import { translations } from "@/shared/i18n/i18n";
import AdminUsersClient from "@/features/admin/components/AdminUsersClient";

export default async function AdminUsersPage() {
  const users = await getUsersForAdmin();
  const cookieStore = await cookies();
  const lang = cookieStore.get("language")?.value || "en";
  const t = (translations[lang] || translations.en).admin || translations.en.admin;

  return (
    <div>
      <h1 style={{ margin: "0 0 20px", fontSize: 20, fontWeight: 900 }}>
        {t?.nav?.users || "User Management"}
      </h1>
      <AdminUsersClient users={users} />
    </div>
  );
}
