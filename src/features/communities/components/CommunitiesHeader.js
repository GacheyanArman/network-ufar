"use client";

import { useState } from "react";
import UiIcon from "@/shared/ui/UiIcon";
import CreateGroupModal from "@/shared/ui/CreateGroupModal";

export default function CommunitiesHeader({ rawQuery, tab }) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <div className="card" style={{ padding: 24 }}>
        <h1
          style={{
            margin: "0 0 6px 0",
            fontSize: 26,
            fontWeight: 950,
            letterSpacing: "-0.02em",
            color: "var(--text-primary)",
          }}
        >
          Groups
        </h1>
        <p
          style={{
            margin: "0 0 16px 0",
            color: "var(--text-secondary)",
            fontSize: 15,
          }}
        >
          Find and join faculty groups, course groups, clubs, and study groups.
        </p>

        <form
          method="get"
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: 1, minWidth: 280, position: "relative" }}>
            <span
              style={{
                position: "absolute",
                left: 14,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)",
              }}
            >
              <UiIcon name="search" size={18} />
            </span>
            <input
              type="search"
              name="q"
              defaultValue={rawQuery}
              placeholder="Search groups, faculty, clubs..."
              style={{
                width: "100%",
                height: 44,
                padding: "0 16px 0 42px",
                border: "1px solid var(--border-color)",
                borderRadius: 12,
                fontSize: 15,
                background: "var(--bg-card)",
              }}
            />
          </div>
          {tab && <input type="hidden" name="tab" value={tab} />}
          <button type="submit" className="btn btn-secondary">
            Search
          </button>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="btn btn-primary"
            style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
          >
            <UiIcon name="plus" size={18} />
            Create Group
          </button>
        </form>
      </div>

      {showModal && (
        <CreateGroupModal
          mode="community"
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
