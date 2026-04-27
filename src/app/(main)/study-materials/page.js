import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { studyMaterials, users } from "@/lib/schema";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import MaterialUploader from "@/components/MaterialUploader";
import { deleteMaterial } from "@/app/actions/material";

function isImage(url) {
  if (!url) return false;
  const ext = url.split('.').pop().toLowerCase();
  return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
}

export default async function StudyMaterialsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const materials = await db
    .select({
      id: studyMaterials.id,
      title: studyMaterials.title,
      description: studyMaterials.description,
      fileUrl: studyMaterials.fileUrl,
      ownerId: studyMaterials.ownerId,
      ownerName: users.fullName,
      createdAt: studyMaterials.createdAt,
    })
    .from(studyMaterials)
    .innerJoin(users, eq(studyMaterials.ownerId, users.id))
    .orderBy(desc(studyMaterials.createdAt));

  return (
    <section className="old-page">
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.8rem', letterSpacing: '-0.04em' }}>Library & Materials</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Photos of notes, PDF books, and shared documents.</p>
      </div>

      <MaterialUploader />

      <div className="old-list">
        {materials.length === 0 ? (
          <div className="old-empty">No materials shared yet.</div>
        ) : (
          materials.map((item) => (
            <div className="card" key={item.id} style={{ padding: '16px', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div className="old-avatar tiny" style={{ background: 'var(--ufar-blue)' }}>
                    {isImage(item.fileUrl) ? "🖼️" : "📄"}
                  </div>
                  <div>
                    <strong style={{ display: 'block', fontSize: '1.1rem' }}>{item.title}</strong>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      Shared by {item.ownerName} • {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {item.ownerId === session.userId && (
                  <form action={deleteMaterial}>
                    <input type="hidden" name="materialId" value={item.id} />
                    <button type="submit" style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontWeight: 'bold' }}>Delete</button>
                  </form>
                )}
              </div>

              {item.description && <p style={{ fontSize: '0.95rem', margin: 0 }}>{item.description}</p>}

              {isImage(item.fileUrl) && (
                <div style={{ marginTop: '8px' }}>
                  <a href={item.fileUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block' }}>
                    <img 
                      src={item.fileUrl} 
                      alt={item.title} 
                      style={{ 
                        maxWidth: '100%', 
                        maxHeight: '300px', 
                        borderRadius: '12px', 
                        border: '1px solid var(--border-color-light)', 
                        cursor: 'zoom-in' 
                      }}
                    />
                  </a>
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <a 
                  href={item.fileUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ textDecoration: 'none', background: 'var(--bg-main)', color: 'var(--text-primary)', padding: '8px 16px', borderRadius: '20px', fontSize: '0.9rem', fontWeight: 'bold', border: '1px solid var(--border-color)' }}
                >
                  👁️ View / Open
                </a>
                <a 
                  href={item.fileUrl} 
                  download 
                  className="btn-primary-old" 
                  style={{ textDecoration: 'none', padding: '8px 16px', fontSize: '0.9rem' }}
                >
                  ⬇️ Download
                </a>
              </div>

            </div>
          ))
        )}
      </div>
    </section>
  );
}