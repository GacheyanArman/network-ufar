"use client";

import { useState } from "react";
import CreateGroupModal from "@/shared/ui/CreateGroupModal";

export default function StudyGroupsCreateButton({ label }) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="btn btn-primary"
        style={{ marginTop: "16px", display: "block", marginLeft: "auto", marginRight: "auto" }}
      >
        {label}
      </button>

      {showModal && (
        <CreateGroupModal
          mode="study-group"
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
