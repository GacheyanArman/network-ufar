"use client";

import { usePathname } from "next/navigation";

export default function MainShell({ children, rightPanel }) {
  const pathname = usePathname();

  const isMessagesPage = pathname === "/messages";
  const isProfilePage = pathname.startsWith("/profile");

  return (
    <div
      className={[
        "app-container",
        "simple-layout",
        isMessagesPage ? "simple-layout-messages" : "",
        isProfilePage ? "simple-layout-profile" : "",
      ].join(" ")}
    >
      {children}

      {!isMessagesPage && rightPanel}
    </div>
  );
}