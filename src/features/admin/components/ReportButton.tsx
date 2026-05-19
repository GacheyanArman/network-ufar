"use client";

import { useState } from "react";
import { reportContent } from "@/features/admin/server/reports";

export default function ReportButton({
  postId,
  commentId,
  reportedUserId
}: {
  postId?: string;
  commentId?: string;
  reportedUserId?: string;
}) {
  const [showModal, setShowModal] = useState(false);
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData();
    if (postId) formData.append("postId", postId);
    if (commentId) formData.append("commentId", commentId);
    if (reportedUserId) formData.append("reportedUserId", reportedUserId);
    formData.append("reason", reason);
    if (description) formData.append("description", description);

    const result = await reportContent(formData);

    if (result.success) {
      alert("Report submitted successfully");
      setShowModal(false);
      setReason("");
      setDescription("");
    } else {
      alert(result.error || "Failed to submit report");
    }

    setIsSubmitting(false);
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="btn btn-secondary"
        style={{ fontSize: "13px", padding: "4px 12px" }}
      >
        Report
      </button>

      {showModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            className="card"
            style={{
              maxWidth: "500px",
              width: "90%",
              padding: "24px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ margin: "0 0 16px", fontSize: "20px", fontWeight: 900 }}>
              Report Content
            </h2>

            <form onSubmit={handleSubmit}>
              <label style={{ display: "block", marginBottom: "16px" }}>
                <span style={{ display: "block", marginBottom: "8px", fontWeight: 700 }}>
                  Reason
                </span>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "1px solid var(--border-color)",
                  }}
                >
                  <option value="">Select a reason</option>
                  <option value="spam">Spam</option>
                  <option value="harassment">Harassment</option>
                  <option value="inappropriate_content">Inappropriate Content</option>
                  <option value="hate_speech">Hate Speech</option>
                  <option value="violence">Violence</option>
                  <option value="misinformation">Misinformation</option>
                  <option value="other">Other</option>
                </select>
              </label>

              <label style={{ display: "block", marginBottom: "16px" }}>
                <span style={{ display: "block", marginBottom: "8px", fontWeight: 700 }}>
                  Additional Details (Optional)
                </span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide more context about this report..."
                  maxLength={500}
                  rows={4}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "1px solid var(--border-color)",
                    resize: "none",
                  }}
                />
              </label>

              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn btn-secondary"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting || !reason}
                >
                  {isSubmitting ? "Submitting..." : "Submit Report"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
