import { redirect } from "next/navigation";

// Blocked users are now managed inside Settings → Privacy.
export default function BlockedUsersPage() {
  redirect("/settings?tab=privacy");
}
