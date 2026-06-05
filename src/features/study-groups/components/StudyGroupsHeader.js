"use client";

import { useState } from "react";
import Link from "next/link";
import UiIcon from "@/shared/ui/UiIcon";
import CreateGroupModal from "@/shared/ui/CreateGroupModal";

export default function StudyGroupsHeader({ title, subtitle, createLabel }) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <Link href="/communities" className="uf-community-back" style={{ marginBottom: 8 }}>
        <UiIcon name="arrow-left" size={18} />
        Back to Groups
      </Link>

      <div className="uf-sg-header">
        <div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="btn btn-primary"
          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <UiIcon name="plus" size={16} />
          {createLabel}
        </button>
      </div>

      {showModal && (
        <CreateGroupModal
          mode="study-group"
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
