#!/usr/bin/env node

/**
 * Sweep through JSX/TSX/JS/TS files under src/ and replace hardcoded hex
 * color literals (inside string literals) with their design-system tokens.
 *
 * - Only replaces patterns of the form `"#hex"` or `'#hex'` — i.e. an
 *   exact quoted string equal to one hex value. This avoids touching
 *   `box-shadow: "0 2px 0 0 #d4af37"`, comments, gradients, etc.
 *
 * - Does NOT touch .css files (those are the source of truth) and skips
 *   public/, node_modules/, migrations/, etc.
 *
 * - Case-insensitive on the hex digits.
 *
 * Run from the repo root: `node scripts/unify-colors.js`
 */

const fs = require("node:fs");
const path = require("node:path");

const MAP = {
  // Whites → card surface
  "#ffffff": "var(--bg-card)",
  "#fff": "var(--bg-card)",
  // Brand blues
  "#0b3aa8": "var(--french-blue-deep)",
  "#062fae": "var(--french-blue-deep)",
  "#2c5aa0": "var(--french-blue)",
  "#2563eb": "var(--french-blue)",
  "#3b82f6": "var(--french-blue)",
  "#1d4ed8": "var(--french-blue)",
  "#1e3a5f": "var(--french-navy)",
  "#0a1931": "var(--french-navy)",
  "#1e3a8a": "var(--french-navy)",
  // Gold accent
  "#d4af37": "var(--french-gold)",
  "#e5a93c": "var(--french-gold)",
  "#b8860b": "var(--french-gold)",
  "#fef9e7": "var(--french-gold-soft)",
  "#fcf3d9": "var(--french-gold-soft)",
  // Text scale
  "#0f172a": "var(--text-primary)",
  "#1a202e": "var(--text-primary)",
  "#1e293b": "var(--text-primary)",
  "#334155": "var(--text-primary)",
  "#475569": "var(--text-primary)",
  "#64748b": "var(--text-secondary)",
  "#94a3b8": "var(--text-muted)",
  "#cbd5e1": "var(--text-muted)",
  // Borders / dividers
  "#e2e8f0": "var(--border-color)",
  "#d9e2ef": "var(--border-color)",
  "#eef2f7": "var(--border-color-light)",
  // Light blue-tinted surfaces
  "#f0f4fb": "var(--french-blue-soft)",
  "#f0f4f8": "var(--french-blue-soft)",
  "#eef4ff": "var(--french-blue-soft)",
  "#eff6ff": "var(--french-blue-soft)",
  "#eef3ff": "var(--french-blue-soft)",
  "#e7edf5": "var(--french-blue-soft)",
  "#e8eef9": "var(--french-blue-soft)",
  // Generic light surfaces
  "#f8fafc": "var(--bg-soft)",
  "#fafbfd": "var(--bg-soft)",
  "#f4f7fb": "var(--bg-soft)",
  "#f1f5f9": "var(--bg-hover)",
  "#f3f4f8": "var(--bg-hover)",
  // Status — danger
  "#dc2626": "var(--danger)",
  "#ef4444": "var(--danger)",
  "#b91c1c": "var(--danger)",
  "#991b1b": "var(--danger)",
  "#e11d48": "var(--danger)",
  "#fef2f2": "var(--danger-soft)",
  "#fecaca": "var(--danger-soft)",
  // Status — success
  "#16a34a": "var(--success)",
  "#22c55e": "var(--success)",
  "#059669": "var(--success)",
  "#065f46": "var(--success)",
  "#ecfdf5": "var(--success-soft)",
  "#dcfce7": "var(--success-soft)",
  // Status — warning
  "#f59e0b": "var(--warning)",
  "#d97706": "var(--warning)",
  "#fef3c7": "var(--warning-soft)",
  // Purple (used for friend/event notifications)
  "#7c3aed": "var(--purple)",
  "#f5f3ff": "var(--purple-soft)",
  // Secondary gray/navy shades
  "#545f71": "var(--text-secondary)",
  "#a0aabf": "var(--text-muted)",
  "#0d1b2a": "var(--french-navy)",
  // Extra light surfaces
  "#fff7f7": "var(--danger-soft)",
  "#fef3f2": "var(--danger-soft)",
  "#fff1f2": "var(--danger-soft)",
  "#f0fdf4": "var(--success-soft)",
};

const ROOTS = ["src/app", "src/features", "src/shared", "src/components"];
const EXTS = new Set([".ts", ".tsx", ".js", ".jsx"]);
const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  "dist",
  "build",
  "migrations",
  "drizzle",
  "public",
]);

function listFiles(dir, out = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      listFiles(full, out);
    } else if (entry.isFile() && EXTS.has(path.extname(entry.name))) {
      out.push(full);
    }
  }
  return out;
}

function buildRegex(hex) {
  // Match "#hex" or '#hex' (case-insensitive on the hex digits).
  const body = hex.slice(1).replace(/[a-f0-9]/gi, (ch) => `[${ch.toLowerCase()}${ch.toUpperCase()}]`);
  return new RegExp(`(["'])#${body}\\1`, "g");
}

const PATTERNS = Object.entries(MAP).map(([hex, token]) => ({
  hex,
  token,
  re: buildRegex(hex),
}));

const files = ROOTS.flatMap((r) => listFiles(r));
let totalReplacements = 0;
const perFile = [];

for (const file of files) {
  let src = fs.readFileSync(file, "utf8");
  let fileCount = 0;
  for (const { token, re } of PATTERNS) {
    src = src.replace(re, (match, quote) => {
      fileCount += 1;
      return `${quote}${token}${quote}`;
    });
  }
  if (fileCount > 0) {
    fs.writeFileSync(file, src);
    perFile.push({ file, count: fileCount });
    totalReplacements += fileCount;
  }
}

perFile
  .sort((a, b) => b.count - a.count)
  .forEach(({ file, count }) => {
    console.log(`${count.toString().padStart(4)}  ${file}`);
  });
console.log(`\n${totalReplacements} replacements in ${perFile.length} files.`);
