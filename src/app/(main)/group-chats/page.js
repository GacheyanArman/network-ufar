import { redirect } from "next/navigation";

// Group chats live inside Messages now — this route only redirects.
export default function GroupChatsPage() {
  redirect("/messages");
}
