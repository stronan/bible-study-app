export interface ParsedReference {
  original: string;
  book: string;
  bookName: string;
  chapter: number;
  startVerse: number;
  endVerse: number;
}

export interface PassageContext {
  reference: ParsedReference;
  contextStart: number;
  contextEnd: number;
  chapterVerseCount: number;
}

export function splitReferences(input: string): string[] {
  const trimmed = input.trim();
  if (!trimmed) return [];
  return trimmed
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function calculateContextRange(
  startVerse: number,
  endVerse: number,
  contextSize: number,
  chapterVerseCount: number
): { contextStart: number; contextEnd: number } {
  const contextStart = Math.max(1, startVerse - contextSize);
  const contextEnd = Math.min(chapterVerseCount, endVerse + contextSize);
  return { contextStart, contextEnd };
}

export function getVerseRangeString(start: number, end: number): string {
  if (start === end) return String(start);
  return `${start}-${end}`;
}

export function isTargetVerse(
  verseNumber: number,
  startVerse: number,
  endVerse: number
): boolean {
  return verseNumber >= startVerse && verseNumber <= endVerse;
}

export function formatReference(ref: ParsedReference): string {
  if (ref.startVerse === ref.endVerse) {
    return `${ref.bookName} ${ref.chapter}:${ref.startVerse}`;
  }
  return `${ref.bookName} ${ref.chapter}:${ref.startVerse}-${ref.endVerse}`;
}

export function formatContextReference(
  ref: ParsedReference,
  contextStart: number,
  contextEnd: number
): string {
  const fullRef = `${ref.bookName} ${ref.chapter}:${contextStart}-${contextEnd}`;
  const targetRef = formatReference(ref);
  return `${fullRef} (${targetRef})`;
}

export function getPassageKey(
  version: string,
  book: string,
  chapter: number,
  startVerse: number,
  endVerse: number
): string {
  return `notes:${version}:${book}:${chapter}:${startVerse}-${endVerse}`;
}

export function isApiAvailable(): boolean {
  const hasEnvKey =
    typeof import.meta !== "undefined" &&
    "env" in import.meta &&
    typeof import.meta.env.VITE_IQBIBLE_API_KEY === "string" &&
    import.meta.env.VITE_IQBIBLE_API_KEY.length > 0;
  if (hasEnvKey) return true;

  const storedKey = getStoredApiKey();
  return storedKey !== null && storedKey.length > 0;
}

export function getStoredApiKey(): string | null {
  try {
    return localStorage.getItem("api_key");
  } catch {
    return null;
  }
}

export function setStoredApiKey(key: string): void {
  try {
    localStorage.setItem("api_key", key);
  } catch {
    /* localStorage unavailable */
  }
}

export function clearStoredApiKey(): void {
  try {
    localStorage.removeItem("api_key");
  } catch {
    /* localStorage unavailable */
  }
}
