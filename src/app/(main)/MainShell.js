"use client";

import { usePathname } from "next/navigation";

export default function MainShell({ children, rightPanel }) {
  const pathname = usePathname();
  const isMessagesPage = pathname === "/messages";

  return (
    <div
      className={
        isMessagesPage
          ? "app-container simple-layout simple-layout-messages"
          : "app-container simple-layout"
      }
    >
      {children}

      {!isMessagesPage && rightPanel}
    </div>
  );
}