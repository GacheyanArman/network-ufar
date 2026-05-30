"use client";

import { usePathname } from "next/navigation";

export default function HideRightPanelOnMessages() {
  const pathname = usePathname();

  if (pathname !== "/messages") {
    return null;
  }

  return (
    <style jsx global>{`
      .sidebar-right,
      .simple-help-panel {
        display: none !important;
      }

      .app-container,
      .old-social-grid,
      .simple-layout {
        grid-template-columns: 250px minmax(0, 1fr) !important;
      }

      .main-content,
      .simple-main {
        width: 100% !important;
        max-width: none !important;
      }

      @media (max-width: 760px) {
        .app-container,
        .old-social-grid,
        .simple-layout {
          grid-template-columns: 1fr !important;
        }
      }
    `}</style>
  );
}