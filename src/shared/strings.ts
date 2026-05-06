const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "for",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "that",
  "the",
  "this",
  "to",
  "with",
]);

export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function unique(values: Iterable<string>): string[] {
  return [...new Set([...values].map((value) => value.trim()).filter(Boolean))];
}

export function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .split(/[^a-z0-9_+#]+/)
    .map((part) => normalizeToken(part.trim()))
    .filter((part) => part.length > 1 && !STOP_WORDS.has(part));
}

function normalizeToken(token: string): string {
  if (token.endsWith("ied") && token.length > 5) {
    return `${token.slice(0, -3)}y`;
  }
  if (token.endsWith("ed") && token.length > 4) {
    return token.slice(0, -2);
  }
  return token;
}

export function titleFromMarkdown(markdown: string): string | undefined {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match?.[1]?.trim();
}
