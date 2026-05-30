import type { CSSProperties } from "react";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/shared/auth/session";
import { getPostById } from "@/features/feed/server/queries";
import PostCard from "@/features/feed/components/PostCard";
import { PageShell } from "@/shared/ui/Layout";

const backWrapStyle: CSSProperties = { marginBottom: 14 };
const backLinkStyle: CSSProperties = {
  color: "#0b3aa8",
  fontWeight: 700,
  fontSize: 14,
  textDecoration: "none",
};

export default async function PostPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;

  const session = await getSession();
  const userId = session?.userId as string | undefined;

  if (!userId) {
    redirect("/login");
  }

  const { post, currentUser } = await getPostById(postId, userId);

  if (!post) {
    notFound();
  }

  return (
    <PageShell variant="narrow">
      <div style={backWrapStyle}>
        <Link href="/feed" style={backLinkStyle}>
          ← К ленте
        </Link>
      </div>

      <PostCard post={post} currentUser={currentUser} />
    </PageShell>
  );
}
