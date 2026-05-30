"use client";

import { useEffect, useId, useRef, useState } from "react";
import UiIcon from "@/shared/ui/UiIcon";
import SearchBar from "@/features/search/components/SearchBar";
import { useLanguage } from "@/contexts/LanguageContext";

export default function TopbarSearch() {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const dropdownId = useId();
  const { t } = useLanguage();

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);

        requestAnimationFrame(() => {
          buttonRef.current?.focus();
        });
      }
    };

    const onClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("mousedown", onClickOutside);

    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("mousedown", onClickOutside);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        const input = dropdownRef.current?.querySelector("input");
        if (input) {
          input.focus();
        }
      }, 50);

      return () => clearTimeout(timer);
    }
  }, [open]);

  return (
    <div ref={wrapRef} className="topbar-icon-wrap">
      <button
        ref={buttonRef}
        type="button"
        className={`action-icon-btn topbar-action-icon ${open ? "is-active" : ""}`}
        aria-label={t("nav.search")}
        aria-expanded={open}
        aria-controls={dropdownId}
        onClick={() => setOpen((v) => !v)}
      >
        <UiIcon name="search" size={20} />
      </button>

      {open && (
        <div
          ref={dropdownRef}
          id={dropdownId}
          className="topbar-dropdown topbar-dropdown-search"
          role="dialog"
          aria-label={t("nav.search")}
        >
          <SearchBar />
        </div>
      )}
    </div>
  );
}