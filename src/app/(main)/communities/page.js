import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { communities, users } from "@/lib/schema";
import { createCommunity } from "@/app/actions/content";

export default async function CommunitiesPage() {
  const realCommunities = await db
    .select({
      id: communities.id,
      name: communities.name,
      description: communities.description,
      createdAt: communities.createdAt,
      ownerName: users.fullName,
    })
    .from(communities)
    .innerJoin(users, eq(communities.ownerId, users.id))
    .orderBy(desc(communities.createdAt));

  return (
    <section className="card old-page">
      <h1>Communities</h1>
      <p>Create real communities. Nothing is shown by default.</p>

      <form action={createCommunity} className="old-create-box">
        <input name="name" placeholder="Community name" required />
        <textarea name="description" placeholder="Description" />
        <button type="submit" className="btn-primary-old">
          Create community
        </button>
      </form>

      {realCommunities.length === 0 ? (
        <div className="old-empty">
          No communities yet. Create the first one.
        </div>
      ) : (
        <div className="old-list">
          {realCommunities.map((community) => (
            <div className="old-list-item" key={community.id}>
              <div className="old-avatar">{community.name[0]}</div>
              <div>
                <strong>{community.name}</strong>
                <span>
                  {community.description || "No description"} · by{" "}
                  {community.ownerName}
                </span>
              </div>
              <button>Open</button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}