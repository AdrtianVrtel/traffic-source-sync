const foldChar = (ch: string): string => {
  const lower = ch.toLowerCase();
  const base = lower.normalize("NFD").replace(/\p{M}/gu, "");
  const out = base || lower;
  return out.length === ch.length ? out : ch;
};

export const fold = (text: string): string => Array.from(text).map(foldChar).join("");

export interface TermMatch {
  start: number;
  end: number;
}

export function findTermMatches(text: string, term: string): TermMatch[] {
  const needle = fold(term.trim());
  if (!needle) return [];

  const haystack = fold(text);
  const matches: TermMatch[] = [];
  let from = 0;

  while (true) {
    const index = haystack.indexOf(needle, from);
    if (index === -1) break;
    matches.push({ start: index, end: index + needle.length });
    from = index + needle.length;
  }

  return matches;
}

const collapseWhitespace = (text: string) => text.replace(/\s+/g, " ").trim();

export interface ExtractedSnippet {
  snippet: string;
  matched: boolean;
}

export function extractSnippet(rawText: string, term: string, windowSize = 320): ExtractedSnippet {
  const text = collapseWhitespace(rawText);
  if (!text) return { snippet: "", matched: false };

  const [match] = findTermMatches(text, term);

  if (!match) {
    const truncated = text.length > windowSize ? `${text.slice(0, windowSize).trimEnd()}…` : text;
    return { snippet: truncated, matched: false };
  }

  const context = Math.floor((windowSize - (match.end - match.start)) / 2);
  let start = Math.max(0, match.start - context);
  let end = Math.min(text.length, match.end + context);

  if (start > 0) {
    const spaceIndex = text.indexOf(" ", start);
    if (spaceIndex !== -1 && spaceIndex < match.start) start = spaceIndex + 1;
  }
  if (end < text.length) {
    const spaceIndex = text.lastIndexOf(" ", end);
    if (spaceIndex > match.end) end = spaceIndex;
  }

  const snippet = text.slice(start, end).trim();
  return {
    snippet: `${start > 0 ? "…" : ""}${snippet}${end < text.length ? "…" : ""}`,
    matched: true,
  };
}
