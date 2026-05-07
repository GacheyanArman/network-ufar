/**
 * Extract hashtags from arbitrary user text.
 * Supports unicode letters/digits (incl. Russian, Armenian).
 * Returns lowercased, deduplicated tags WITHOUT the leading `#`.
 */
export function extractHashtags(text?: string | null, max = 12): string[] {
  if (!text) return [];
  const matches = text.match(/#([\p{L}\p{N}_]{2,40})/gu) || [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of matches) {
    const tag = raw.slice(1).toLowerCase();
    if (!seen.has(tag)) {
      seen.add(tag);
      out.push(tag);
      if (out.length >= max) break;
    }
  }
  return out;
}

/**
 * Render caption text where #tags are turned into links to /photos/tags/[tag].
 * Returns React-friendly token array; component decides how to render.
 */
export type CaptionToken =
  | { type: "text"; value: string }
  | { type: "tag"; value: string };

export function tokenizeCaption(text?: string | null): CaptionToken[] {
  if (!text) return [];
  const tokens: CaptionToken[] = [];
  const regex = /#([\p{L}\p{N}_]{2,40})/gu;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      tokens.push({ type: "text", value: text.slice(last, match.index) });
    }
    tokens.push({ type: "tag", value: match[1].toLowerCase() });
    last = match.index + match[0].length;
  }
  if (last < text.length) {
    tokens.push({ type: "text", value: text.slice(last) });
  }
  return tokens;
}
