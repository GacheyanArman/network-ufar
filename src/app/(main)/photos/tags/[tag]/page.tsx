import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { hashtags as hashtagsTable } from "@/lib/schema";
import { getSession } from "@/lib/session";
import { fetchPhotoFeed } from "@/lib/photo-feed";
import { getUserRole, isStaff } from "@/lib/roles";
import PhotoFeedCard from "@/components/PhotoFeedCard";
import UiIcon from "@/components/UiIcon";

export const dynamic = "force-dynamic";

interface TagPageProps {
  params: Promise<{ tag: string }>;
}

export default async function HashtagPage({ params }: TagPageProps) {
  const { tag: rawTag } = await params;
  const tag = decodeURIComponent(rawTag).toLowerCase();

  const session = await getSession();
  if (!session?.userId) redirect("/login");
  const userId = session.userId as string;

  const [meta] = await db
    .select({ usageCount: hashtagsTable.usageCount })
    .from(hashtagsTable)
    .where(eq(hashtagsTable.tag, tag));

  const photos = await fetchPhotoFeed({
    viewerId: userId,
    hashtag: tag,
    scope: "public",
    limit: 60,
    withComments: false,
  });

  const role = await getUserRole(userId);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "16px 12px 48px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          marginBottom: 20,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: "var(--french-blue-soft, #e8eef9)",
            color: "var(--french-blue, #2c5aa0)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 900,
            fontSize: 26,
          }}
        >
          #
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, letterSpacing: "-0.02em" }}>
            #{tag}
          </h1>
          <p style={{ margin: "4px 0 0", color: "var(--text-secondary)", fontSize: 13 }}>
            {(meta?.usageCount ?? photos.length).toLocaleString()} moments tagged
          </p>
        </div>
        <Link
          href="/photos/explore"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 14px",
            borderRadius: 999,
            background: "#fff",
            border: "1px solid var(--border-color-light)",
            color: "var(--text-primary)",
            textDecoration: "none",
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          <UiIcon name="grid" size={14} /> Explore
        </Link>
      </div>

      {photos.length === 0 ? (
        <div
          style={{
            background: "#fff",
            border: "1px dashed var(--border-color)",
            borderRadius: 16,
            padding: "40px 16px",
            textAlign: "center",
            color: "var(--text-secondary)",
          }}
        >
          No moments yet for #{tag}. Be the first to use it in your caption!
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(min(320px, 100%), 1fr))",
            gap: 16,
            alignItems: "start",
          }}
        >
          {photos.map((p) => (
            <PhotoFeedCard
              key={p.id}
              photo={p}
              currentUserId={userId}
              canModerate={isStaff(role)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
