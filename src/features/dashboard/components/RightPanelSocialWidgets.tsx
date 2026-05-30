import Link from "next/link";
import Image from "next/image";
import { followUser } from "@/features/profile/server/follow";
import { getFacultyLabel } from "@/features/profile/server/utils";
import {
  getCachedFollowingSummary,
  getCachedPeopleYouMayKnow,
} from "@/shared/cache/cache";

type Props = {
  userId: string;
  lang: string;
};

export default async function RightPanelSocialWidgets({ userId, lang }: Props) {
  const [followingSummary, peopleYouMayKnow] = await Promise.all([
    getCachedFollowingSummary(userId, 5),
    getCachedPeopleYouMayKnow(userId, 5),
  ]);

  async function handleFollow(data: FormData) {
    "use server";
    await followUser(data);
  }

  return (
    <>
      <div className="card">
        <div className="old-widget-head">
          <h4 className="widget-title">You may also know</h4>
          <Link href="/friends" className="old-widget-link">
            View all
          </Link>
        </div>

        {peopleYouMayKnow.length === 0 ? (
          <div className="empty-state-mini">
            <p>No suggestions.</p>
          </div>
        ) : (
          <div className="mini-user-list">
            {peopleYouMayKnow.map((user) => (
              <div className="mini-user-row" key={user.id}>
                <Link
                  href={`/profile/${user.id}`}
                  className="mini-user-avatar"
                  style={{ textDecoration: "none" }}
                >
                  {user.image || user.avatarUrl ? (
                    <Image
                      src={(user.image || user.avatarUrl) as string}
                      alt={user.fullName}
                      width={40}
                      height={40}
                    />
                  ) : (
                    user.fullName?.[0] || "U"
                  )}
                </Link>

                <Link
                  href={`/profile/${user.id}`}
                  className="mini-user-main"
                >
                  <strong>{user.fullName}</strong>
                  <span>{user.reason}</span>
                </Link>

                <form action={handleFollow}>
                  <input type="hidden" name="targetId" value={user.id} />
                  <button className="btn btn-secondary">Follow</button>
                </form>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card" style={{ padding: "0" }}>
        <div
          className="old-widget-head"
          style={{ padding: "8px 8px 0" }}
        >
          <h4 className="widget-title" style={{ borderBottom: "none" }}>
            FOLLOWING
          </h4>
          <span className="old-widget-count">
            {followingSummary.count}
          </span>
        </div>

        {followingSummary.users.length === 0 ? (
          <div className="empty-state-mini" style={{ padding: "8px" }}>
            <p>You are not following anyone yet.</p>
          </div>
        ) : (
          <div
            className="mini-user-list"
            style={{ padding: "0 8px 8px" }}
          >
            {followingSummary.users.map((user) => (
              <Link
                href={`/profile/${user.id}`}
                className="mini-user-row mini-user-row-link"
                key={user.id}
              >
                <div className="mini-user-avatar">
                  {user.image || user.avatarUrl ? (
                    <Image
                      src={(user.image || user.avatarUrl) as string}
                      alt={user.fullName}
                      width={40}
                      height={40}
                    />
                  ) : (
                    user.fullName?.[0] || "U"
                  )}
                </div>

                <div className="mini-user-main">
                  <strong>{user.fullName}</strong>
                  <span>
                    {user.faculty
                      ? getFacultyLabel(user.faculty, lang)
                      : user.username || "Student"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
