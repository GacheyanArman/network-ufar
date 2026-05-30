import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/shared/auth/session";
import { fetchPhotoFeed } from "@/features/photos/server/queries";
import { getUserRole, isStaff } from "@/shared/auth/roles";
import PhotoFeedCard from "@/features/photos/components/PhotoFeedCard";
import UiIcon from "@/shared/ui/UiIcon";

export const dynamic = "force-dynamic";

export default async function SavedPhotosPage() {
  const session = await getSession();
  if (!session?.userId) redirect("/login");
  const userId = session.userId as string;

  const photos = await fetchPhotoFeed({
    viewerId: userId,
    scope: "saved",
    limit: 50,
    withComments: true,
  });

  const role = await getUserRole(userId);

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "16px 12px 48px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: "clamp(22px, 4vw, 28px)",
              fontWeight: 900,
              letterSpacing: "-0.02em",
            }}
          >
            Saved moments
          </h1>
          <p style={{ margin: "4px 0 0", color: "var(--text-secondary)", fontSize: 13 }}>
            Only you can see your saved Campus Moments.
          </p>
        </div>
        <Link
          href="/photos"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 14px",
            borderRadius: 999,
            background: "var(--bg-card)",
            border: "1px solid var(--border-color-light)",
            color: "var(--text-primary)",
            textDecoration: "none",
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          <UiIcon name="news" size={14} /> Back to feed
        </Link>
      </div>

      {photos.length === 0 ? (
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px dashed var(--border-color)",
            borderRadius: 16,
            padding: "40px 16px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "var(--french-blue-soft, #e8eef9)",
              color: "var(--french-blue, #2c5aa0)",
              margin: "0 auto 12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <UiIcon name="bookmark" size={26} />
          </div>
          <p style={{ margin: 0, fontWeight: 800 }}>Nothing saved yet.</p>
          <p style={{ margin: "6px 0 0", color: "var(--text-secondary)", fontSize: 13 }}>
            Tap the bookmark icon on any moment to save it for later.
          </p>
        </div>
      ) : (
        photos.map((p) => (
          <PhotoFeedCard
            key={p.id}
            photo={p}
            currentUserId={userId}
            canModerate={isStaff(role)}
          />
        ))
      )}
    </div>
  );
}
