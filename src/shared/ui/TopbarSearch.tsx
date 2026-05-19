"use client";

import { useEffect, useId, useRef, useState } from "react";
import UiIcon from "@/shared/ui/UiIcon";
import SearchBar from "@/features/search/components/SearchBar";

/**
 * Topbar search trigger — icon button that reveals the full SearchBar
 * autocomplete in a dropdown anchored to the icon. Closes on outside
 * click and on Escape; when closing via Escape, focus returns to the
 * button so keyboard users keep their place.
 */
export default function TopbarSearch() {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const dropdownId = useId();

  useEffect(() => {
    if (!open) return;

    function onClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        // Return focus to the trigger so keyboard navigation continues
        // from a sensible place.
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);

    // Move focus into the search input on open. Querying the dropdown is
    // safer than reaching inside SearchBar's internals — any focusable
    // input/button works.
    const focusable =
      dropdownRef.current?.querySelector<HTMLElement>("input, button");
    focusable?.focus();

    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="topbar-icon-wrap">
      <button
        ref={buttonRef}
        type="button"
        className="action-icon-btn topbar-action-icon"
        aria-label="Search"
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
          aria-label="Search"
        >
          <SearchBar />
        </div>
      )}
    </div>
  );
}
