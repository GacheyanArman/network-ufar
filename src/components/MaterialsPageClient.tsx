"use client";

import { useState, useMemo, useEffect } from "react";
import UiIcon from "@/components/UiIcon";
import { getMyMaterials, toggleSaveMaterial, uploadMaterial, requestMaterial } from "@/app/actions/materials";

type Material = {
  id: string;
  title: string;
  description: string | null;
  fileUrl: string | null;
  type: string;
  faculty: string | null;
  year: string | null;
  subject: string | null;
  professorCourse: string | null;
  isVerified: boolean;
  downloadsCount: number;
  helpfulCount: number;
  createdAt: Date;
  ownerId: string;
  ownerName?: string;
  ownerAvatar?: string | null;
};

type MaterialsPageClientProps = {
  materials: Material[];
  savedMaterialIds: string[];
  currentUserId: string;
};

const FACULTIES = ["Law", "Finance", "Marketing", "Management", "Informatics", "French Language", "General Education"];
const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year", "Master Students"];
const TYPES = ["lecture_notes", "summary", "slides", "past_questions", "exam_prep", "formula_sheet", "template", "case_study", "project_example", "cheat_sheet", "language_practice", "useful_link", "other"];

const getSubjectList = (faculty: string) => {
  switch (faculty) {
    case "Finance": return ["Accounting", "Corporate Finance", "Statistics", "Economics", "Business Law"];
    case "Law": return ["Civil Law", "Criminal Law", "Constitutional Law", "International Law", "French Law"];
    case "Marketing": return ["Consumer Behavior", "Digital Marketing", "Brand Management", "Market Research"];
    case "Management": return ["Strategy", "HR Management", "Operations", "Project Management"];
    case "Informatics": return ["Programming", "Databases", "Algorithms", "Web Development", "Data Analysis"];
    default: return [];
  }
};

const formatType = (type: string) => {
  return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

export default function MaterialsPageClient({
  materials: initialMaterials,
  savedMaterialIds: initialSavedIds,
  currentUserId
}: MaterialsPageClientProps) {
  const [activeTab, setActiveTab] = useState<"browse" | "my_materials">("browse");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterFaculty, setFilterFaculty] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterSubject, setFilterSubject] = useState("");
  const [filterType, setFilterType] = useState("");
  
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set(initialSavedIds));
  const [myMaterials, setMyMaterials] = useState<{uploaded: any[], saved: any[], requested: any[]} | null>(null);
  
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (activeTab === "my_materials" && !myMaterials) {
      getMyMaterials().then(data => setMyMaterials(data));
    }
  }, [activeTab]);

  const filteredMaterials = useMemo(() => {
    return initialMaterials.filter((m) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!m.title.toLowerCase().includes(q) && 
            !m.description?.toLowerCase().includes(q) && 
            !m.subject?.toLowerCase().includes(q)) {
          return false;
        }
      }
      if (filterFaculty && m.faculty !== filterFaculty) return false;
      if (filterYear && m.year !== filterYear) return false;
      if (filterSubject && m.subject !== filterSubject) return false;
      if (filterType && m.type !== filterType) return false;
      
      return true;
    });
  }, [initialMaterials, searchQuery, filterFaculty, filterYear, filterSubject, filterType]);

  const handleToggleSave = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Optimistic update
    const newSaved = new Set(savedIds);
    if (newSaved.has(id)) newSaved.delete(id);
    else newSaved.add(id);
    setSavedIds(newSaved);
    
    await toggleSaveMaterial(id);
  };

  const handleUploadSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsUploading(true);
    try {
      const formData = new FormData(e.currentTarget);
      await uploadMaterial(formData);
      setIsUploadModalOpen(false);
      alert("Material uploaded successfully! It will be visible after moderator approval.");
    } catch (err: any) {
      alert("Upload failed: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRequestSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsUploading(true);
    try {
      const formData = new FormData(e.currentTarget);
      await requestMaterial(formData);
      setIsRequestModalOpen(false);
      alert("Material requested successfully!");
    } catch (err: any) {
      alert("Request failed: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="materials-container" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      
      {/* Header */}
      <div className="card" style={{ padding: "32px", background: "linear-gradient(135deg, var(--bg-main) 0%, var(--bg-hover) 100%)", borderRadius: "16px", border: "1px solid var(--border-color)", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "relative", zIndex: 1 }}>
          <h1 style={{ fontSize: "2.5rem", marginBottom: "8px", color: "var(--text-primary)" }}>Study Materials</h1>
          <p style={{ fontSize: "1.1rem", color: "var(--text-secondary)", maxWidth: "600px", marginBottom: "24px" }}>
            Find notes, summaries, slides, exam prep files and study resources shared by UFAR students.
          </p>
          
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button className="btn btn-primary" onClick={() => setIsUploadModalOpen(true)} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", borderRadius: "8px", fontWeight: "600" }}>
              <UiIcon name="upload" /> Upload Material
            </button>
            <button className="btn btn-secondary" onClick={() => setIsRequestModalOpen(true)} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", borderRadius: "8px", fontWeight: "600" }}>
              <UiIcon name="plus" /> Request Material
            </button>
          </div>
        </div>
        <div style={{ position: "absolute", right: "-20px", top: "-40px", opacity: 0.05, transform: "scale(2.5)", pointerEvents: "none" }}>
          <UiIcon name="folder" size={200} />
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "16px", borderBottom: "1px solid var(--border-color)", paddingBottom: "2px" }}>
        <button 
          onClick={() => setActiveTab("browse")}
          style={{
            padding: "12px 24px",
            background: "none",
            border: "none",
            borderBottom: activeTab === "browse" ? "3px solid var(--primary-color)" : "3px solid transparent",
            color: activeTab === "browse" ? "var(--primary-color)" : "var(--text-secondary)",
            fontWeight: "600",
            fontSize: "1rem",
            cursor: "pointer",
            transition: "all 0.2s"
          }}
        >
          Browse Materials
        </button>
        <button 
          onClick={() => setActiveTab("my_materials")}
          style={{
            padding: "12px 24px",
            background: "none",
            border: "none",
            borderBottom: activeTab === "my_materials" ? "3px solid var(--primary-color)" : "3px solid transparent",
            color: activeTab === "my_materials" ? "var(--primary-color)" : "var(--text-secondary)",
            fontWeight: "600",
            fontSize: "1rem",
            cursor: "pointer",
            transition: "all 0.2s"
          }}
        >
          My Materials
        </button>
      </div>

      {activeTab === "browse" && (
        <div style={{ display: "flex", gap: "24px", alignItems: "flex-start" }}>
          {/* Filters Sidebar */}
          <div className="card" style={{ padding: "20px", width: "280px", flexShrink: 0, position: "sticky", top: "80px", borderRadius: "12px" }}>
            <h3 style={{ marginBottom: "20px", fontSize: "1.2rem", display: "flex", alignItems: "center", gap: "8px" }}>
              <UiIcon name="filter" /> Filters
            </h3>
            
            <div style={{ marginBottom: "20px" }}>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }}><UiIcon name="search" /></span>
                <input 
                  type="text" 
                  placeholder="Search materials..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px 10px 40px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-main)", color: "var(--text-primary)" }}
                />
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "500", fontSize: "0.9rem", color: "var(--text-secondary)" }}>Faculty</label>
                <select 
                  value={filterFaculty} 
                  onChange={(e) => { setFilterFaculty(e.target.value); setFilterSubject(""); }}
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-main)", color: "var(--text-primary)" }}
                >
                  <option value="">All Faculties</option>
                  {FACULTIES.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>

              {filterFaculty && getSubjectList(filterFaculty).length > 0 && (
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "500", fontSize: "0.9rem", color: "var(--text-secondary)" }}>Subject</label>
                  <select 
                    value={filterSubject} 
                    onChange={(e) => setFilterSubject(e.target.value)}
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-main)", color: "var(--text-primary)" }}
                  >
                    <option value="">All Subjects</option>
                    {getSubjectList(filterFaculty).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "500", fontSize: "0.9rem", color: "var(--text-secondary)" }}>Year</label>
                <select 
                  value={filterYear} 
                  onChange={(e) => setFilterYear(e.target.value)}
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-main)", color: "var(--text-primary)" }}
                >
                  <option value="">All Years</option>
                  {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "500", fontSize: "0.9rem", color: "var(--text-secondary)" }}>Material Type</label>
                <select 
                  value={filterType} 
                  onChange={(e) => setFilterType(e.target.value)}
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-main)", color: "var(--text-primary)" }}
                >
                  <option value="">All Types</option>
                  {TYPES.map(t => <option key={t} value={t}>{formatType(t)}</option>)}
                </select>
              </div>
              
              <button 
                onClick={() => { setSearchQuery(""); setFilterFaculty(""); setFilterYear(""); setFilterSubject(""); setFilterType(""); }}
                style={{ background: "none", border: "none", color: "var(--primary-color)", cursor: "pointer", textAlign: "left", padding: "0", fontWeight: "500", marginTop: "8px" }}
              >
                Clear all filters
              </button>
            </div>
          </div>

          {/* Materials Grid */}
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ fontSize: "1.3rem", fontWeight: "600" }}>
                {filteredMaterials.length} {filteredMaterials.length === 1 ? "Result" : "Results"}
              </h2>
            </div>

            {filteredMaterials.length === 0 ? (
              <div className="card" style={{ padding: "60px 20px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", borderRadius: "12px" }}>
                <span style={{ display: "inline-block", color: "var(--border-color)", marginBottom: "16px" }}><UiIcon name="folder" size={64} /></span>
                <h3 style={{ marginBottom: "8px", color: "var(--text-primary)" }}>No materials found</h3>
                <p style={{ color: "var(--text-secondary)", marginBottom: "24px" }}>Try adjusting your filters or request a new material.</p>
                <button className="btn btn-primary" onClick={() => setIsRequestModalOpen(true)}>Request Material</button>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px" }}>
                {filteredMaterials.map((m) => (
                  <div key={m.id} className="card" style={{ padding: "0", display: "flex", flexDirection: "column", overflow: "hidden", borderRadius: "12px", border: "1px solid var(--border-color)", transition: "transform 0.2s, box-shadow 0.2s" }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.08)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
                  >
                    <div style={{ padding: "20px", display: "flex", flexDirection: "column", flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                        <span style={{ background: "rgba(var(--primary-rgb), 0.1)", color: "var(--primary-color)", padding: "4px 10px", borderRadius: "20px", fontSize: "0.75rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                          {formatType(m.type)}
                        </span>
                        <button 
                          onClick={(e) => handleToggleSave(m.id, e)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: savedIds.has(m.id) ? "var(--primary-color)" : "var(--text-secondary)", transition: "color 0.2s" }}
                        >
                          <UiIcon name="bookmark" size={22} />
                        </button>
                      </div>
                      
                      <h3 style={{ fontSize: "1.1rem", marginBottom: "8px", lineHeight: "1.4", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {m.title}
                      </h3>
                      
                      {m.description && (
                        <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "16px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                          {m.description}
                        </p>
                      )}
                      
                      <div style={{ marginTop: "auto", display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "16px" }}>
                        {m.subject && <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", background: "var(--bg-hover)", padding: "2px 8px", borderRadius: "4px" }}><span style={{marginRight: "4px"}}><UiIcon name="book" size={12} /></span>{m.subject}</span>}
                        {m.faculty && <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", background: "var(--bg-hover)", padding: "2px 8px", borderRadius: "4px" }}><span style={{marginRight: "4px"}}><UiIcon name="building" size={12} /></span>{m.faculty}</span>}
                        {m.year && <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", background: "var(--bg-hover)", padding: "2px 8px", borderRadius: "4px" }}><span style={{marginRight: "4px"}}><UiIcon name="calendar" size={12} /></span>{m.year}</span>}
                      </div>
                      
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "16px", borderTop: "1px solid var(--border-color)", marginTop: "auto" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          {m.isVerified && <span title="Verified Material"><span style={{ color: "var(--success)" }}><UiIcon name="check-circle" size={16} /></span></span>}
                          <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{m.ownerName}</span>
                        </div>
                        <a 
                          href={m.fileUrl || "#"} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="btn btn-primary" 
                          style={{ padding: "6px 12px", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "6px", textDecoration: "none", borderRadius: "6px" }}
                        >
                          <UiIcon name="download" size={16} /> Open
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "my_materials" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
          {!myMaterials ? (
            <div style={{ padding: "40px", textAlign: "center" }}>Loading your materials...</div>
          ) : (
            <>
              {/* Uploaded */}
              <div>
                <h3 style={{ fontSize: "1.3rem", marginBottom: "16px", borderBottom: "1px solid var(--border-color)", paddingBottom: "8px" }}>Uploaded by Me</h3>
                {myMaterials.uploaded.length === 0 ? (
                  <p style={{ color: "var(--text-secondary)" }}>You haven't uploaded any materials yet.</p>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "16px" }}>
                    {myMaterials.uploaded.map(m => (
                      <div key={m.id} className="card" style={{ padding: "16px", border: "1px solid var(--border-color)", borderRadius: "8px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                          <span style={{ fontSize: "0.8rem", fontWeight: "bold", color: "var(--text-secondary)", textTransform: "uppercase" }}>{formatType(m.type)}</span>
                          <span style={{ fontSize: "0.8rem", color: m.status === "approved" ? "var(--success)" : m.status === "rejected" ? "var(--danger)" : "var(--warning)", fontWeight: "600", padding: "2px 8px", borderRadius: "12px", background: "var(--bg-hover)" }}>
                            {m.status}
                          </span>
                        </div>
                        <h4 style={{ marginBottom: "8px" }}>{m.title}</h4>
                        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{new Date(m.createdAt).toLocaleDateString()}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Saved */}
              <div>
                <h3 style={{ fontSize: "1.3rem", marginBottom: "16px", borderBottom: "1px solid var(--border-color)", paddingBottom: "8px" }}>Saved Materials</h3>
                {myMaterials.saved.length === 0 ? (
                  <p style={{ color: "var(--text-secondary)" }}>You haven't saved any materials yet.</p>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px" }}>
                    {myMaterials.saved.map(m => (
                      <div key={m.id} className="card" style={{ padding: "16px", border: "1px solid var(--border-color)", borderRadius: "8px", display: "flex", flexDirection: "column" }}>
                         <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                            <span style={{ background: "rgba(var(--primary-rgb), 0.1)", color: "var(--primary-color)", padding: "4px 10px", borderRadius: "20px", fontSize: "0.75rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                              {formatType(m.type)}
                            </span>
                            <button 
                              onClick={async (e) => {
                                await handleToggleSave(m.id, e);
                                setMyMaterials(prev => prev ? { ...prev, saved: prev.saved.filter(s => s.id !== m.id) } : prev);
                              }}
                              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--primary-color)" }}
                            >
                              <UiIcon name="bookmark" size={22} />
                            </button>
                         </div>
                         <h4 style={{ marginBottom: "8px" }}>{m.title}</h4>
                         {m.subject && <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "16px" }}>{m.subject}</span>}
                         <a href={m.fileUrl || "#"} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ marginTop: "auto", textAlign: "center", padding: "8px", borderRadius: "6px", textDecoration: "none" }}>Open Material</a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Modals */}
      {isUploadModalOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={() => setIsUploadModalOpen(false)}>
          <div className="card" style={{ width: "100%", maxWidth: "600px", maxHeight: "90vh", overflowY: "auto", padding: "32px", borderRadius: "16px" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <h2 style={{ fontSize: "1.5rem" }}>Upload Study Material</h2>
              <button onClick={() => setIsUploadModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.5rem", color: "var(--text-secondary)" }}>&times;</button>
            </div>
            
            <form onSubmit={handleUploadSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>Title *</label>
                <input type="text" name="title" required placeholder="e.g. Accounting Midterm Summary" style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-main)", color: "var(--text-primary)" }} />
              </div>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>Faculty</label>
                  <select name="faculty" style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-main)", color: "var(--text-primary)" }}>
                    <option value="">Select Faculty</option>
                    {FACULTIES.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>Year</label>
                  <select name="year" style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-main)", color: "var(--text-primary)" }}>
                    <option value="">Select Year</option>
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>Material Type *</label>
                  <select name="type" required style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-main)", color: "var(--text-primary)" }}>
                    <option value="">Select Type</option>
                    {TYPES.map(t => <option key={t} value={t}>{formatType(t)}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>Subject</label>
                  <input type="text" name="subject" placeholder="e.g. Corporate Finance" style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-main)", color: "var(--text-primary)" }} />
                </div>
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>Description</label>
                <textarea name="description" rows={3} placeholder="Brief description of what this material contains..." style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-main)", color: "var(--text-primary)", resize: "vertical" }}></textarea>
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>File *</label>
                <input type="file" name="file" required style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px dashed var(--primary-color)", background: "rgba(var(--primary-rgb), 0.05)", color: "var(--text-primary)" }} />
              </div>

              <div style={{ background: "rgba(var(--warning-rgb), 0.1)", padding: "16px", borderRadius: "8px", display: "flex", gap: "12px", alignItems: "flex-start", marginTop: "8px" }}>
                <input type="checkbox" required id="integrity" style={{ marginTop: "4px" }} />
                <label htmlFor="integrity" style={{ fontSize: "0.9rem", color: "var(--text-primary)", lineHeight: "1.4" }}>
                  I confirm this material does not violate exam rules, copyright rules or UFAR academic policies.
                </label>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "16px" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsUploadModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={isUploading}>{isUploading ? "Uploading..." : "Submit for Moderation"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isRequestModalOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={() => setIsRequestModalOpen(false)}>
          <div className="card" style={{ width: "100%", maxWidth: "500px", padding: "32px", borderRadius: "16px" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <h2 style={{ fontSize: "1.5rem" }}>Request Material</h2>
              <button onClick={() => setIsRequestModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.5rem", color: "var(--text-secondary)" }}>&times;</button>
            </div>
            
            <form onSubmit={handleRequestSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>Subject / Topic *</label>
                <input type="text" name="subject" required placeholder="e.g. Civil Law Notes" style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-main)", color: "var(--text-primary)" }} />
              </div>
              
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>Material Type Needed</label>
                <select name="materialType" style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-main)", color: "var(--text-primary)" }}>
                  <option value="">Any</option>
                  {TYPES.map(t => <option key={t} value={t}>{formatType(t)}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>Urgency</label>
                <select name="urgency" style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-main)", color: "var(--text-primary)" }}>
                  <option value="low">Low (Whenever possible)</option>
                  <option value="medium">Medium (Within a few weeks)</option>
                  <option value="high">High (Exam is coming soon)</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>Description</label>
                <textarea name="description" rows={3} placeholder="Please provide more details on what exactly you need..." style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-main)", color: "var(--text-primary)", resize: "vertical" }}></textarea>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "16px" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsRequestModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={isUploading}>{isUploading ? "Submitting..." : "Submit Request"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
