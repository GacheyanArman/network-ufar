"use client";

import { useState, useTransition } from "react";
import { blockUser, unblockUser } from "@/features/profile/server/block";

type BlockButtonProps = {
  userId: string;
  userName: string;
  isBlocked: boolean;
};

export default function BlockButton({ userId, userName, isBlocked: initialBlocked }: BlockButtonProps) {
  const [isBlocked, setIsBlocked] = useState(initialBlocked);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleBlock() {
    if (isBlocked) {
      // Unblock directly
      startTransition(async () => {
        const formData = new FormData();
        formData.append("blockedId", userId);

        const result = await unblockUser(formData);

        if (result.success) {
          setIsBlocked(false);
        } else {
          alert(result.error || "Failed to unblock user");
        }
      });
    } else {
      // Show confirmation for blocking
      setShowConfirm(true);
    }
  }

  function confirmBlock() {
    startTransition(async () => {
      const formData = new FormData();
      formData.append("blockedId", userId);

      const result = await blockUser(formData);

      if (result.success) {
        setIsBlocked(true);
        setShowConfirm(false);
      } else {
        alert(result.error || "Failed to block user");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={handleBlock}
        disabled={isPending}
        className={isBlocked ? "btn-secondary" : "btn-danger"}
        style={{
          padding: "8px 16px",
          borderRadius: "8px",
          border: "none",
          fontWeight: 700,
          fontSize: "14px",
          cursor: isPending ? "not-allowed" : "pointer",
          opacity: isPending ? 0.6 : 1,
        }}
      >
        {isPending ? "..." : isBlocked ? "Unblock" : "Block User"}
      </button>

      {showConfirm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setShowConfirm(false)}
        >
          <div
            style={{
              background: "white",
              borderRadius: "16px",
              padding: "24px",
              maxWidth: "400px",
              width: "100%",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 12px", fontSize: "18px", fontWeight: 800 }}>
              Block {userName}?
            </h3>

            <p style={{ margin: "0 0 20px", color: "var(--text-secondary)", fontSize: "14px", lineHeight: 1.5 }}>
              They won&apos;t be able to see your posts, send you messages, or interact with your content.
              You won&apos;t see their content either.
            </p>

            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                disabled={isPending}
                style={{
                  padding: "10px 20px",
                  borderRadius: "8px",
                  border: "1px solid var(--border-color)",
                  background: "white",
                  fontWeight: 700,
                  fontSize: "14px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmBlock}
                disabled={isPending}
                style={{
                  padding: "10px 20px",
                  borderRadius: "8px",
                  border: "none",
                  background: "var(--danger, #dc2626)",
                  color: "white",
                  fontWeight: 700,
                  fontSize: "14px",
                  cursor: isPending ? "not-allowed" : "pointer",
                  opacity: isPending ? 0.6 : 1,
                }}
              >
                {isPending ? "Blocking..." : "Block"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
