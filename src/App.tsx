import React, { useState, useEffect, useCallback, useRef } from "react";
import { bibleApi, type BibleVersion, type BookInfo, type BookMetaResponse, type Passage, type ParseCitationResponse, ApiQuotaError, ApiErrorImpl } from "./api";
import { type ParsedReference, type PassageContext, splitReferences, calculateContextRange, getVerseRangeString, formatReference, getPassageKey, isApiAvailable, getStoredApiKey, setStoredApiKey, clearStoredApiKey } from "./utils";
import { PassageDisplay } from "./components/PassageDisplay";
import { NotesPanel } from "./components/NotesPanel";
import { InputArea } from "./components/InputArea";
import { HeaderBar } from "./components/HeaderBar";
import { StatusBar } from "./components/StatusBar";

interface FetchedPassage {
  reference: ParsedReference;
  context: PassageContext;
  passage: Passage | null;
  loading: boolean;
  error: string | null;
}

const DEFAULT_VERSION = "eng_kjv";
const DEFAULT_CONTEXT_SIZE = 5;
const CONTEXT_OPTIONS = [0, 3, 5, 10, 15];

const App: React.FC = () => {
  const [version, setVersion] = useState<string>(DEFAULT_VERSION);
  const [versions, setVersions] = useState<BibleVersion[]>([]);
  const [booksByVersion, setBooksByVersion] = useState<Map<string, BookInfo[]>>(new Map());
  const [bookMetaByVersionBook, setBookMetaByVersionBook] = useState<Map<string, BookMetaResponse>>(new Map());
  const [contextSize, setContextSize] = useState<number>(DEFAULT_CONTEXT_SIZE);
  const [inputValue, setInputValue] = useState<string>("");
  const [passages, setPassages] = useState<FetchedPassage[]>([]);
  const [currentPassageIndex, setCurrentPassageIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [rateLimitInfo, setRateLimitInfo] = useState<{ remaining: number; remainingMonth: number; limit: number } | null>(null);
  const [apiKey, setApiKey] = useState<string>(getStoredApiKey() ?? "");

  const versionsLoadedRef = useRef<boolean>(false);
  const apiKeyLoadedRef = useRef<boolean>(false);

  useEffect(() => {
    if (!versionsLoadedRef.current) {
      versionsLoadedRef.current = true;
      loadVersions();
    }
    if (!apiKeyLoadedRef.current) {
      apiKeyLoadedRef.current = true;
      const storedKey = getStoredApiKey();
      if (storedKey) {
        bibleApi.setApiKey(storedKey);
        setApiKey(storedKey);
      }
    }
  }, []);

  const loadVersions = useCallback(async () => {
    try {
      const vers = await bibleApi.listVersions();
      setVersions(vers);
      if (vers.some((v) => v.version_id === DEFAULT_VERSION)) {
        setVersion(DEFAULT_VERSION);
      } else if (vers.length > 0) {
        setVersion(vers[0].version_id);
      }
    } catch (err) {
      if (err instanceof ApiQuotaError) {
        setError(`Rate limit exceeded. Retry after ${err.retryAfter ?? "a moment"}.`);
      } else if (err instanceof ApiErrorImpl) {
        setError(`API error: ${err.message}`);
      } else {
        setError("Failed to load Bible versions.");
      }
    }
  }, []);

    const loadBooksForVersion = useCallback(async (ver: string): Promise<BookInfo[]> => {
    if (booksByVersion.has(ver)) {
      return booksByVersion.get(ver)!;
    }
    const books = await bibleApi.listBooks(ver);
    setBooksByVersion((prev) => new Map(prev.set(ver, books)));
    if (bibleApi.lastRateLimit) {
      setRateLimitInfo({
        remaining: bibleApi.lastRateLimit.remaining,
        remainingMonth: bibleApi.lastRateLimit.remainingMonth,
        limit: bibleApi.lastRateLimit.limit,
      });
    }
    return books;
  }, [booksByVersion]);

  const loadBookMeta = useCallback(async (ver: string, book: string): Promise<BookMetaResponse> => {
    const cacheKey = `${ver}:${book}`;
    if (bookMetaByVersionBook.has(cacheKey)) {
      return bookMetaByVersionBook.get(cacheKey)!;
    }
    const meta = await bibleApi.getBookMeta(ver, book);
    setBookMetaByVersionBook((prev) => new Map(prev.set(cacheKey, meta)));
    if (bibleApi.lastRateLimit) {
      setRateLimitInfo({
        remaining: bibleApi.lastRateLimit.remaining,
        remainingMonth: bibleApi.lastRateLimit.remainingMonth,
        limit: bibleApi.lastRateLimit.limit,
      });
    }
    return meta;
  }, [bookMetaByVersionBook]);

  const parseReference = useCallback(async (raw: string): Promise<ParsedReference | null> => {
    try {
      const result: ParseCitationResponse = await bibleApi.parseCitation(raw, version);
      if (!result.book || !result.chapter || !result.verses || result.verses.length === 0) {
        return null;
      }
      const sortedVerses = [...result.verses].sort((a, b) => a - b);
      const startVerse = sortedVerses[0];
      const endVerse = sortedVerses[sortedVerses.length - 1];
      return {
        original: raw,
        book: result.book,
        bookName: result.name_en,
        chapter: result.chapter,
        startVerse,
        endVerse,
      };
    } catch (err) {
      console.error(`Failed to parse citation "${raw}":`, err);
      return null;
    }
  }, [version]);

  const fetchPassageWithContext = useCallback(async (ref: ParsedReference): Promise<FetchedPassage> => {
    try {
      const books = await loadBooksForVersion(version);
      const bookExists = books.some((b) => b.usfm === ref.book || b.name === ref.bookName || String(b.id) === ref.book);
      if (!bookExists) {
        return {
          reference: ref,
          context: createPassageContext(ref, ref.startVerse, ref.endVerse, ref.endVerse),
          passage: null,
          loading: false,
          error: `Book "${ref.bookName}" is not available in version "${version}".`,
        };
      }

      const meta = await loadBookMeta(version, ref.book);
      const chapterEntry = meta.chapters.find((c) => c.chapter === ref.chapter);
      const chapterVerseCount = chapterEntry ? chapterEntry.verse_count : ref.endVerse;

      const { contextStart, contextEnd } = calculateContextRange(ref.startVerse, ref.endVerse, contextSize, chapterVerseCount);

      const context: PassageContext = {
        reference: ref,
        contextStart,
        contextEnd,
        chapterVerseCount,
      };

      const verseRange = getVerseRangeString(contextStart, contextEnd);
      const passage = await bibleApi.fetchPassage(version, ref.book, ref.chapter, verseRange);

      return {
        reference: ref,
        context,
        passage,
        loading: false,
        error: null,
      };
    } catch (err) {
      if (err instanceof ApiQuotaError) {
        return {
          reference: ref,
          context: createPassageContext(ref, ref.startVerse, ref.endVerse, ref.endVerse),
          passage: null,
          loading: false,
          error: `Rate limit exceeded. Retry after ${err.retryAfter ?? "a moment"}.`,
        };
      }
      if (err instanceof ApiErrorImpl) {
        let msg = `API error (${err.code}): ${err.message}`;
        if (err.code === "version_not_found" || err.code === "chapter_not_found") {
          msg = `The passage "${formatReference(ref)}" could not be found in version "${version}".`;
        }
        return {
          reference: ref,
          context: createPassageContext(ref, ref.startVerse, ref.endVerse, ref.endVerse),
          passage: null,
          loading: false,
          error: msg,
        };
      }
      return {
        reference: ref,
        context: createPassageContext(ref, ref.startVerse, ref.endVerse, ref.endVerse),
        passage: null,
        loading: false,
        error: "Failed to fetch passage. Please check your API key and network connection.",
      };
    }
  }, [version, contextSize, loadBooksForVersion, loadBookMeta]);

  const loadReferences = useCallback(async () => {
    const refs = splitReferences(inputValue);
    if (refs.length === 0) {
      setError("Please enter at least one Bible reference.");
      return;
    }

    if (!isApiAvailable()) {
      setError("API key not configured. Enter your IQ Bible API key in settings.");
      return;
    }

    setLoading(true);
    setError(null);
    setPassages([]);
    setCurrentPassageIndex(0);

    const allResults: FetchedPassage[] = [];

    for (let i = 0; i < refs.length; i++) {
      const raw = refs[i];
      setLoadingMessage(`Parsing reference (${i + 1}/${refs.length})...`);
      const parsed = await parseReference(raw);
      if (parsed) {
        setLoadingMessage(`Fetching passage (${allResults.length}/${refs.length})...`);
        const fetched = await fetchPassageWithContext(parsed);
        allResults.push(fetched);
        setPassages([...allResults]);
      } else {
        allResults.push({
          reference: {
            original: raw,
            book: "",
            bookName: "",
            chapter: 1,
            startVerse: 1,
            endVerse: 1,
          },
          context: createPassageContext(
            { original: raw, book: "", bookName: "", chapter: 1, startVerse: 1, endVerse: 1 },
            1,
            1,
            1
          ),
          passage: null,
          loading: false,
          error: `Could not parse "${raw}". Please check the format.`,
        });
        setPassages([...allResults]);
      }
    }

    setLoading(false);
    setLoadingMessage("");
  }, [inputValue, parseReference, fetchPassageWithContext]);

  const updateApiKey = (key: string) => {
    if (key) {
      bibleApi.setApiKey(key);
      setStoredApiKey(key);
    } else {
      clearStoredApiKey();
    }
    setApiKey(key);
  };

  const currentPassage = passages[currentPassageIndex];

  const goToPrev = () => {
    setCurrentPassageIndex((prev) => Math.max(0, prev - 1));
  };

  const goToNext = () => {
    setCurrentPassageIndex((prev) => Math.min(passages.length - 1, prev + 1));
  };

  const currentPassageKey = currentPassage
    ? getPassageKey(version, currentPassage.reference.book, currentPassage.reference.chapter, currentPassage.reference.startVerse, currentPassage.reference.endVerse)
    : null;

  const notesKey = currentPassageKey ?? "";

  return (
    <div className="app">
      <HeaderBar
        version={version}
        versions={versions}
        onVersionChange={setVersion}
        contextSize={contextSize}
        contextOptions={CONTEXT_OPTIONS}
        onContextSizeChange={setContextSize}
        apiKey={apiKey}
        onApiKeyChange={updateApiKey}
      />
      <StatusBar
        loading={loading}
        loadingMessage={loadingMessage}
        error={error}
        rateLimitInfo={rateLimitInfo}
        passageCount={passages.length}
        currentIndex={currentPassageIndex}
      />
      <main className="main-content">
        <InputArea
          value={inputValue}
          onChange={setInputValue}
          onSubmit={loadReferences}
          loading={loading}
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.ctrlKey) {
              loadReferences();
            }
          }}
        />
        <div className="content-area">
          <div className="passage-section">
            {passages.length > 0 && (
              <div className="navigation-bar">
                <button
                  className="nav-button"
                  onClick={goToPrev}
                  disabled={currentPassageIndex === 0 || loading}
                  aria-label="Previous passage"
                >
                  ← Previous
                </button>
                <span className="passage-counter">
                  {currentPassageIndex + 1} of {passages.length}
                </span>
                <button
                  className="nav-button"
                  onClick={goToNext}
                  disabled={currentPassageIndex >= passages.length - 1 || loading}
                  aria-label="Next passage"
                >
                  Next →
                </button>
              </div>
            )}
            {currentPassage ? (
              <PassageDisplay
                passage={currentPassage.passage}
                reference={currentPassage.reference}
                context={currentPassage.context}
                error={currentPassage.error}
                loading={currentPassage.loading}
              />
            ) : (
              <div className="empty-state">
                <p>Enter Bible references above and click "Load Passages" to begin.</p>
                <p className="hint">Examples: John 3:16, Romans 8:28-30, Genesis 1:1-5</p>
              </div>
            )}
          </div>
          <NotesPanel
            key={notesKey}
            passageKey={notesKey}
            reference={currentPassage?.reference ?? null}
            version={version}
          />
        </div>
      </main>
    </div>
  );
};

function createPassageContext(
  ref: ParsedReference,
  contextStart: number,
  contextEnd: number,
  chapterVerseCount: number
): PassageContext {
  return {
    reference: ref,
    contextStart,
    contextEnd,
    chapterVerseCount,
  };
}

export default App;
