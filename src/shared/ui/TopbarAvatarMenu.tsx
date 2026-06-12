"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/contexts/LanguageContext";
import UiIcon from "@/shared/ui/UiIcon";

type TopbarAvatarMenuProps = {
  name: string;
  image?: string;
  logoutAction: () => Promise<void>;
};

/**
 * Topbar avatar button with a small dropdown: Profile, Settings, Logout.
 * Keeps the topbar to exactly Search / Notifications / Avatar.
 */
export default function TopbarAvatarMenu({ name, image, logoutAction }: TopbarAvatarMenuProps) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointer(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const initial = (name || "U").charAt(0).toUpperCase();

  return (
    <div className="avatar-menu" ref={rootRef}>
      <button
        type="button"
        className="topbar-avatar-link avatar-menu-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={name}
        onClick={() => setOpen((v) => !v)}
      >
        {image ? (
          <Image src={image} alt={name} width={42} height={42} className="topbar-avatar-img" />
        ) : (
          <div className="avatar-blank-sm">{initial}</div>
        )}
      </button>

      {open ? (
        <div className="avatar-menu-dropdown" role="menu">
          <Link href="/profile" role="menuitem" className="avatar-menu-item" onClick={() => setOpen(false)}>
            <UiIcon name="user" size={16} />
            <span>{t("nav.myProfile")}</span>
          </Link>
          <Link href="/settings" role="menuitem" className="avatar-menu-item" onClick={() => setOpen(false)}>
            <UiIcon name="settings" size={16} />
            <span>{t("nav.settings")}</span>
          </Link>
          <div className="avatar-menu-divider" aria-hidden="true" />
          <form action={logoutAction}>
            <button type="submit" role="menuitem" className="avatar-menu-item avatar-menu-logout">
              <UiIcon name="logout" size={16} />
              <span>{t("common.logout")}</span>
            </button>
          </form>
        </div>
      ) : null}

      <style jsx>{`
        .avatar-menu {
          position: relative;
          display: flex;
          align-items: center;
        }

        .avatar-menu-trigger {
          border: none;
          background: transparent;
          padding: 0;
          cursor: pointer;
          display: flex;
          align-items: center;
        }

        .avatar-menu-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          min-width: 190px;
          background: #fff;
          border: 1px solid var(--border-color, #e2e8f0);
          border-radius: 12px;
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
          padding: 6px;
          z-index: 60;
        }

        .avatar-menu-dropdown :global(.avatar-menu-item) {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 9px 10px;
          border: none;
          background: transparent;
          border-radius: 8px;
          font-size: 14px;
          color: var(--text-primary, #0f172a);
          cursor: pointer;
          text-align: left;
          text-decoration: none;
        }

        .avatar-menu-dropdown :global(.avatar-menu-item:hover) {
          background: var(--bg-hover, #f1f5f9);
        }

        .avatar-menu-dropdown :global(.avatar-menu-logout) {
          color: var(--danger, #dc2626);
        }

        .avatar-menu-divider {
          height: 1px;
          margin: 4px 6px;
          background: var(--border-color, #e2e8f0);
        }
      `}</style>
    </div>
  );
}
