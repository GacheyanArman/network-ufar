"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import UiIcon from "@/shared/ui/UiIcon";
import { useLanguage } from "@/contexts/LanguageContext";
import { getFacultyLabel } from "@/features/profile/server/utils";

// Map result type → UiIcon name
const TYPE_ICON = {
  user: "user",
  community: "users",
  event: "calendar",
  material: "graduation",
  library: "book",
  post: "message",
  calendar: "calendar",
  photo: "camera",
  album: "image",
};

// Coloured background/icon for non-avatar result types
const TYPE_STYLE = {
  event: { bg: "#fce7f3", color: "#9d174d" },
  material: { bg: "#e8eef9", color: "#0b3aa8" },
  library: { bg: "#d1fae5", color: "#065f46" },
  post: { bg: "#ede9fe", color: "#6d28d9" },
  calendar: { bg: "#fef9c3", color: "#92400e" },
  photo: { bg: "#ede9fe", color: "#6d28d9" },
  album: { bg: "#ede9fe", color: "#6d28d9" },
};

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchRef = useRef(null);
  const inputRef = useRef(null);
  const router = useRouter();
  const abortRef = useRef(null);
  const { language, t } = useLanguage();

  // Close on outside click
  useEffect(() => {
    function onMouseDown(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  // Synchronously clear when query too short (avoids effect cascade)
  const trimmedQuery = query.trim();
  const [prevTrimmed, setPrevTrimmed] = useState(trimmedQuery);
  if (prevTrimmed !== trimmedQuery) {
    setPrevTrimmed(trimmedQuery);
    if (trimmedQuery.length < 2) {
      setResults([]);
      setIsOpen(false);
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }
  }

  // Debounced search fetch
  useEffect(() => {
    if (trimmedQuery.length < 2) return;
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    const id = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(trimmedQuery)}`,
          { signal: abortRef.current.signal },
        );
        if (res.ok) {
          const data = await res.json();
          setResults(data.results || []);
          setIsOpen(true);
          setSelectedIndex(-1);
        }
      } catch (err) {
        if (err.name !== "AbortError") console.error("Search error:", err);
      } finally {
        setIsLoading(false);
      }
    }, 200);

    return () => {
      clearTimeout(id);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [trimmedQuery]);

  function navigate(result) {
    return (
      result.href ||
      (result.type === "user"
        ? `/profile/${result.id}`
        : result.type === "community"
          ? `/communities/${result.id}`
          : `/search?q=${encodeURIComponent(trimmedQuery)}`)
    );
  }

  function handleKeyDown(e) {
    if (!isOpen || results.length === 0) {
      if (e.key === "Enter" && trimmedQuery) {
        router.push(`/search?q=${encodeURIComponent(trimmedQuery)}`);
        setIsOpen(false);
        inputRef.current?.blur();
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((p) => Math.min(p + 1, results.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((p) => Math.max(p - 1, -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && results[selectedIndex]) {
          router.push(navigate(results[selectedIndex]));
          setIsOpen(false);
          setQuery("");
          inputRef.current?.blur();
        } else if (trimmedQuery) {
          router.push(`/search?q=${encodeURIComponent(trimmedQuery)}`);
          setIsOpen(false);
          inputRef.current?.blur();
        }
        break;
      case "Escape":
        setIsOpen(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  }

  function handleResultClick() {
    setIsOpen(false);
    setQuery("");
    setSelectedIndex(-1);
  }

  // Decide whether this result type shows an avatar image or a coloured icon
  const hasImage = (r) =>
    (r.type === "user" ||
      r.type === "community" ||
      r.type === "photo" ||
      r.type === "album") &&
    r.image;

  const iconStyle = (type) =>
    TYPE_STYLE[type] || { bg: "var(--bg-hover)", color: "var(--text-secondary)" };

  return (
    <div className="uf-search-container" ref={searchRef}>
      <style>{searchStyles}</style>

      {/* Input row */}
      <div className="uf-search-input-wrapper">
        <span className="uf-search-icon">
          <UiIcon name="search" size={18} />
        </span>

        <input
          ref={inputRef}
          type="text"
          className="uf-search-input"
          placeholder={language === "fr" ? "Rechercher…" : language === "hy" ? "Որոնել…" : "Search…"}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (trimmedQuery.length >= 2 && results.length > 0) setIsOpen(true);
          }}
        />

        {isLoading && (
          <span className="uf-search-loading">
            <UiIcon name="loader" size={16} />
          </span>
        )}

        {query && !isLoading && (
          <button
            type="button"
            className="uf-search-clear"
            aria-label="Clear search"
            onClick={() => {
              setQuery("");
              setResults([]);
              setIsOpen(false);
              inputRef.current?.focus();
            }}
          >
            <UiIcon name="x" size={14} />
          </button>
        )}
      </div>

      {/* Results dropdown */}
      {isOpen && results.length > 0 && (
        <div className="uf-search-dropdown">
          {results.map((result, index) => (
            <Link
              key={`${result.type}-${result.id}`}
              href={navigate(result)}
              className={`uf-search-result${index === selectedIndex ? " selected" : ""}`}
              onClick={handleResultClick}
            >
              {/* Avatar / icon */}
              <div
                className={`uf-search-result-avatar uf-search-result-avatar--${result.type}`}
                style={
                  !hasImage(result)
                    ? {
                        background: iconStyle(result.type).bg,
                        color: iconStyle(result.type).color,
                        borderRadius: 12,
                      }
                    : undefined
                }
              >
                {hasImage(result) ? (
                  <Image
                    src={result.image}
                    alt={result.name || ""}
                    width={40}
                    height={40}
                  />
                ) : (
                  <UiIcon name={TYPE_ICON[result.type] || "search"} size={18} />
                )}
              </div>

              {/* Name + subtitle */}
              <div className="uf-search-result-info">
                <strong>{result.name}</strong>
                <span>
                  {result.type === "user"
                    ? result.faculty
                      ? getFacultyLabel(result.faculty, language)
                      : result.username
                        ? `@${result.username}`
                        : "Student"
                    : result.subtitle || result.description || ""}
                </span>
              </div>

              {/* Type badge */}
              <div className="uf-search-result-type">
                <UiIcon name={TYPE_ICON[result.type] || "search"} size={14} />
              </div>
            </Link>
          ))}

          {/* See all link */}
          {trimmedQuery && (
            <Link
              href={`/search?q=${encodeURIComponent(trimmedQuery)}`}
              className="uf-search-see-all"
              onClick={() => {
                setIsOpen(false);
                setQuery("");
              }}
            >
              <UiIcon name="search" size={16} />
              <span>
                {t("searchPage.seeAll")} &ldquo;{trimmedQuery}&rdquo;
              </span>
            </Link>
          )}
        </div>
      )}

      {/* No results state */}
      {isOpen &&
        trimmedQuery.length >= 2 &&
        results.length === 0 &&
        !isLoading && (
          <div className="uf-search-dropdown">
            <div className="uf-search-empty">
              <UiIcon name="search" size={24} />
              <p>
                {t("searchPage.noResults")} &ldquo;{trimmedQuery}&rdquo;
              </p>
            </div>
          </div>
        )}
    </div>
  );
}

const searchStyles = `
.uf-search-container {
  position: relative;
  width: 100%;
}

.uf-search-input-wrapper {
  position: relative;
  width: 100%;
  height: 42px;
}

.uf-search-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.uf-search-input {
  width: 100%;
  height: 42px;
  padding: 0 40px 0 40px;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  background: #f8fafc;
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
  outline: none;
  transition: all 0.2s ease;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.8);
}

.uf-search-input::placeholder {
  color: #94a3b8;
  font-weight: 500;
}

.uf-search-input:focus {
  background: #ffffff;
  border-color: #0b3aa8;
  box-shadow: 0 0 0 3px rgba(11,58,168,0.1);
}

.uf-search-loading {
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: #0b3aa8;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: translateY(-50%) rotate(0deg); }
  to   { transform: translateY(-50%) rotate(360deg); }
}

.uf-search-clear {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  line-height: 1;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  transition: all 0.15s ease;
  padding: 0;
}

.uf-search-clear:hover {
  background: var(--bg-hover);
  color: #0f172a;
}

.uf-search-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  background: #ffffff;
  border: 1px solid var(--border-color);
  border-radius: 16px;
  box-shadow: 0 12px 32px rgba(15,23,42,0.12), 0 4px 8px rgba(15,23,42,0.08);
  max-height: 480px;
  overflow-y: auto;
  z-index: 1000;
  animation: slideDown 0.18s ease;
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: translateY(0); }
}

.uf-search-result {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 14px;
  text-decoration: none;
  color: #0f172a;
  transition: background 0.12s ease;
  border-bottom: 1px solid var(--border-color-light);
}

.uf-search-result:last-of-type {
  border-bottom: none;
}

.uf-search-result:hover,
.uf-search-result.selected {
  background: #f8fafc;
}

.uf-search-result.selected {
  background: #eef4ff;
}

.uf-search-result-avatar {
  width: 40px;
  height: 40px;
  border-radius: 999px;
  background: linear-gradient(135deg, #0b3aa8 0%, #062fae 100%);
  color: #ffffff;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  font-size: 15px;
  flex-shrink: 0;
}

.uf-search-result-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.uf-search-result-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.uf-search-result-info strong {
  font-size: 14px;
  font-weight: 800;
  color: #0f172a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.uf-search-result-info span {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.uf-search-result-type {
  width: 26px;
  height: 26px;
  border-radius: 8px;
  background: var(--bg-hover);
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.uf-search-see-all {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  text-decoration: none;
  color: #0b3aa8;
  font-size: 13px;
  font-weight: 800;
  border-top: 1px solid var(--border-color);
  transition: background 0.12s ease;
}

.uf-search-see-all:hover {
  background: #eef4ff;
}

.uf-search-empty {
  padding: 28px 20px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.uf-search-empty svg {
  color: #cbd5e1;
}

.uf-search-empty p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 600;
}
`;
