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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* 1. HEADER & ACTIONS (Breadcrumbs and Upload buttons) */}
      <div className="card" style={{ 
          padding: '16px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>Materials</h2>
            <span style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>/ Root</span>
        </div>
      </div>

      <MaterialUploader />

      {/* 2. FILE MANAGER VIEW */}
      <div className="card" style={{ padding: '0' }}>
        
        {/* Table Header (Data Grid style) */}
        <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '3fr 1fr 1fr', 
            padding: '12px 20px', 
            borderBottom: '1px solid var(--border-color-light)', 
            backgroundColor: 'var(--bg-main)', 
            color: 'var(--text-secondary)', 
            fontSize: '0.85rem', 
            fontWeight: '600', 
            textTransform: 'uppercase' 
        }}>
            <span>Name</span>
            <span>Date Modified</span>
            <span>Actions</span>
        </div>

        {materials.length === 0 ? (
            <div style={{ 
                padding: '80px 20px', 
                textAlign: 'center', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center' 
            }}>
              <span style={{ fontSize: '3.5rem', opacity: 0.3, display: 'block', marginBottom: '16px' }}>🗂️</span>
              <h3 style={{ color: 'var(--text-primary)', marginBottom: '8px' }}>This folder is empty</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', maxWidth: '400px', lineHeight: '1.5' }}>
                You haven't uploaded any study materials or created any folders yet. Use this space to organize your academic files and share them with peers.
              </p>
            </div>
        ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                {materials.map((item) => (
                    <div key={item.id} style={{ 
                        display: 'grid', 
                        gridTemplateColumns: '3fr 1fr 1fr', 
                        padding: '12px 20px', 
                        borderBottom: '1px solid var(--border-color-light)',
                        alignItems: 'center'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '1.5rem' }}>{isImage(item.fileUrl) ? "🖼️" : "📄"}</span>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <a href={item.fileUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-primary)', fontWeight: '500', textDecoration: 'none' }}>{item.title}</a>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>By {item.ownerName}</span>
                            </div>
                        </div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                            {new Date(item.createdAt).toLocaleDateString()}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <a href={item.fileUrl} download className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.8rem', textDecoration: 'none' }}>⬇️</a>
                            {item.ownerId === session.userId && (
                                <form action={deleteMaterial}>
                                    <input type="hidden" name="materialId" value={item.id} />
                                    <button type="submit" style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '1.2rem' }}>&times;</button>
                                </form>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>

    </div>
  );
}