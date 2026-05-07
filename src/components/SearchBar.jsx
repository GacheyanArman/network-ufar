"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import UiIcon from "./UiIcon";

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchRef = useRef(null);
  const inputRef = useRef(null);
  const router = useRouter();
  const abortControllerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const trimmedQuery = query.trim();

    if (trimmedQuery.length < 2) {
      setResults([]);
      setIsOpen(false);
      setIsLoading(false);
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setIsLoading(true);

    const timeoutId = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(trimmedQuery)}`,
          { signal: abortControllerRef.current.signal }
        );

        if (response.ok) {
          const data = await response.json();
          setResults(data.results || []);
          setIsOpen(true);
          setSelectedIndex(-1);
        }
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Search error:", error);
        }
      } finally {
        setIsLoading(false);
      }
    }, 200); // Debounce 200ms

    return () => {
      clearTimeout(timeoutId);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [query]);

  function handleKeyDown(e) {
    if (!isOpen || results.length === 0) {
      if (e.key === "Enter" && query.trim()) {
        router.push(`/search?q=${encodeURIComponent(query.trim())}`);
        setIsOpen(false);
        inputRef.current?.blur();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < results.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && results[selectedIndex]) {
          const result = results[selectedIndex];
          if (result.type === "user") {
            router.push(`/profile/${result.id}`);
          } else if (result.type === "community") {
            router.push(`/communities/${result.id}`);
          }
          setIsOpen(false);
          setQuery("");
          inputRef.current?.blur();
        } else if (query.trim()) {
          router.push(`/search?q=${encodeURIComponent(query.trim())}`);
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

  function handleResultClick(result) {
    setIsOpen(false);
    setQuery("");
    setSelectedIndex(-1);
  }

  return (
    <div className="uf-search-container" ref={searchRef}>
      <style>{searchStyles}</style>

      <div className="uf-search-input-wrapper">
        <span className="uf-search-icon">
          <UiIcon name="search" size={18} />
        </span>

        <input
          ref={inputRef}
          type="text"
          className="uf-search-input"
          placeholder="Search people, communities..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (query.trim().length >= 2 && results.length > 0) {
              setIsOpen(true);
            }
          }}
        />

        {isLoading && (
          <span className="uf-search-loading">
            <UiIcon name="loader" size={16} />
          </span>
        )}

        {query && !isLoading && (
          <button
            className="uf-search-clear"
            onClick={() => {
              setQuery("");
              setResults([]);
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            type="button"
          >
            ×
          </button>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="uf-search-dropdown">
          {results.map((result, index) => (
            <Link
              key={`${result.type}-${result.id}`}
              href={
                result.type === "user"
                  ? `/profile/${result.id}`
                  : `/communities/${result.id}`
              }
              className={`uf-search-result ${
                index === selectedIndex ? "selected" : ""
              }`}
              onClick={() => handleResultClick(result)}
            >
              <div className="uf-search-result-avatar">
                {result.image ? (
                  <img src={result.image} alt={result.name} />
                ) : (
                  <span>{result.name?.[0] || "?"}</span>
                )}
              </div>

              <div className="uf-search-result-info">
                <strong>{result.name}</strong>
                <span>
                  {result.type === "user"
                    ? result.faculty || result.username || "Student"
                    : result.description || "Community"}
                </span>
              </div>

              <div className="uf-search-result-type">
                {result.type === "user" ? (
                  <UiIcon name="user" size={14} />
                ) : (
                  <UiIcon name="users" size={14} />
                )}
              </div>
            </Link>
          ))}

          {query.trim() && (
            <Link
              href={`/search?q=${encodeURIComponent(query.trim())}`}
              className="uf-search-see-all"
              onClick={() => {
                setIsOpen(false);
                setQuery("");
              }}
            >
              <UiIcon name="search" size={16} />
              <span>See all results for "{query.trim()}"</span>
            </Link>
          )}
        </div>
      )}

      {isOpen && query.trim().length >= 2 && results.length === 0 && !isLoading && (
        <div className="uf-search-dropdown">
          <div className="uf-search-empty">
            <UiIcon name="search" size={24} />
            <p>No results found for "{query.trim()}"</p>
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
  border: 1px solid #e2e8f0;
  border-radius: 999px;
  background: #f8fafc;
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
  outline: none;
  transition: all 0.2s ease;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.uf-search-input::placeholder {
  color: #94a3b8;
  font-weight: 500;
}

.uf-search-input:focus {
  background: #ffffff;
  border-color: #0b3aa8;
  box-shadow: 0 0 0 3px rgba(11, 58, 168, 0.1);
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
  to { transform: translateY(-50%) rotate(360deg); }
}

.uf-search-clear {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: #64748b;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  transition: all 0.2s ease;
}

.uf-search-clear:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.uf-search-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.12), 0 4px 8px rgba(15, 23, 42, 0.08);
  max-height: 480px;
  overflow-y: auto;
  z-index: 1000;
  animation: slideDown 0.2s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.uf-search-result {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  text-decoration: none;
  color: #0f172a;
  transition: all 0.15s ease;
  border-bottom: 1px solid #f1f5f9;
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
  box-shadow: 0 2px 8px rgba(11, 58, 168, 0.16);
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
  color: #64748b;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.uf-search-result-type {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: #f1f5f9;
  color: #64748b;
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
  border-top: 1px solid #e2e8f0;
  transition: all 0.15s ease;
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
  color: #64748b;
  font-size: 13px;
  font-weight: 600;
}
`;
