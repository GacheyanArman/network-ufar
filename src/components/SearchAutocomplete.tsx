"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export default function SearchAutocomplete() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const router = useRouter();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/search-suggestions?q=${encodeURIComponent(query)}`);
        if (response.ok) {
          const data = await response.json();
          setSuggestions(data);
          setIsOpen(true);
        }
      } catch (error) {
        console.error("Error fetching suggestions:", error);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0) {
        handleSelect(suggestions[selectedIndex]);
      } else {
        handleSubmit(e as any);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  }

  function handleSelect(item: any) {
    if (item.type === "user") {
      router.push(`/profile/${item.id}`);
    } else if (item.type === "post") {
      router.push(`/?highlight=${item.id}`);
    } else if (item.type === "community") {
      router.push(`/communities?community=${item.id}`);
    }
    setIsOpen(false);
    setQuery("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query)}`);
      setIsOpen(false);
    }
  }

  return (
    <div ref={wrapperRef} style={{ position: "relative", width: "100%" }}>
      <form onSubmit={handleSubmit} className="search-page-form">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search users, posts, communities..."
          autoComplete="off"
        />
        <button type="submit" className="btn-primary-old">
          Search
        </button>
      </form>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            background: "var(--bg-primary)",
            border: "1px solid var(--border-color)",
            borderRadius: "12px",
            marginTop: "8px",
            maxHeight: "400px",
            overflowY: "auto",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
            zIndex: 100,
          }}
        >
          {isLoading ? (
            <div style={{ padding: "16px", textAlign: "center", color: "var(--text-secondary)" }}>
              Loading...
            </div>
          ) : suggestions.length === 0 ? (
            <div style={{ padding: "16px", textAlign: "center", color: "var(--text-secondary)" }}>
              No suggestions found
            </div>
          ) : (
            suggestions.map((item, index) => (
              <div
                key={`${item.type}-${item.id}`}
                onClick={() => handleSelect(item)}
                style={{
                  padding: "12px 16px",
                  cursor: "pointer",
                  background: index === selectedIndex ? "var(--bg-secondary)" : "transparent",
                  borderBottom: index < suggestions.length - 1 ? "1px solid var(--border-color)" : "none",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                }}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                {item.type === "user" && (
                  <>
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "50%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "50%",
                          background: "var(--french-blue)",
                          color: "white",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "14px",
                          fontWeight: 700,
                        }}
                      >
                        {item.name?.charAt(0).toUpperCase() || "U"}
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: "14px" }}>{item.name}</div>
                      {item.faculty && (
                        <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                          {item.faculty}
                        </div>
                      )}
                    </div>
                    <span
                      style={{
                        fontSize: "11px",
                        color: "var(--text-muted)",
                        textTransform: "uppercase",
                      }}
                    >
                      User
                    </span>
                  </>
                )}

                {item.type === "post" && (
                  <>
                    <div
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "8px",
                        background: "var(--bg-secondary)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "16px",
                      }}
                    >
                      📝
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "14px", color: "var(--text-primary)" }}>
                        {item.content.slice(0, 60)}
                        {item.content.length > 60 ? "..." : ""}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: "11px",
                        color: "var(--text-muted)",
                        textTransform: "uppercase",
                      }}
                    >
                      Post
                    </span>
                  </>
                )}

                {item.type === "community" && (
                  <>
                    {item.avatar ? (
                      <img
                        src={item.avatar}
                        alt={item.name}
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "8px",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "8px",
                          background: "var(--bg-secondary)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "14px",
                          fontWeight: 700,
                        }}
                      >
                        {item.name?.charAt(0).toUpperCase() || "C"}
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: "14px" }}>{item.name}</div>
                      {item.description && (
                        <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                          {item.description.slice(0, 40)}
                          {item.description.length > 40 ? "..." : ""}
                        </div>
                      )}
                    </div>
                    <span
                      style={{
                        fontSize: "11px",
                        color: "var(--text-muted)",
                        textTransform: "uppercase",
                      }}
                    >
                      Community
                    </span>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
