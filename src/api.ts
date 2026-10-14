const API_BASE_URL = "https://api.iqbible.com/api/v2";

const API_KEY =
  typeof import.meta !== "undefined" &&
  "env" in import.meta &&
  typeof import.meta.env.VITE_IQBIBLE_API_KEY === "string"
    ? import.meta.env.VITE_IQBIBLE_API_KEY
    : undefined;

export interface BibleVersion {
  version_id: string;
  title: string;
  description: string;
  license: string;
  canon_id: number;
  language_code: string;
  language_name: string;
  language_stage: string;
  language_family: string;
  audio_count: number;
  words_of_jesus_count: number;
}

export interface BookInfo {
  id: number;
  name: string;
  usfm: string;
}

export interface ChapterVerseCount {
  chapter: number;
  verse_count: number;
}

export interface BookMetaResponse {
  version: string;
  book_id: number;
  chapter_count: number;
  chapters: ChapterVerseCount[];
}

export interface WordsOfJesusSegment {
  text: string;
  is_jesus: boolean;
}

export interface Verse {
  id: string;
  book_number: number;
  chapter_number: number;
  verse_number: number;
  text: string;
  has_words_of_jesus?: boolean;
  segments?: WordsOfJesusSegment[];
}

export interface Passage {
  version: string;
  book: string;
  chapter: number;
  count: number;
  data: Verse[];
}

export interface ParseCitationResponse {
  citation: string;
  book: string;
  name_en: string;
  chapter: number;
  count: number;
  verses: number[];
  version?: string;
  data?: Verse[];
}

export interface ApiError {
  status: string;
  error: {
    status: number;
    code: string;
    message: string;
    detail?: string;
    hint?: string;
    path: string;
    method: string;
  };
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  remainingMonth: number;
}

export class BibleApi {
  apiKey: string | undefined = API_KEY;
  lastRateLimit: RateLimitInfo | null = null;

  setApiKey(key: string) {
    this.apiKey = key;
  }

  private parseRateLimit(response: Response): RateLimitInfo | null {
    const limit = response.headers.get("X-RateLimit-Limit");
    const remaining = response.headers.get("X-RateLimit-Remaining");
    const remainingMonth = response.headers.get("X-RateLimit-Remaining-Month");
    if (!limit || !remaining || !remainingMonth) return null;
    return {
      limit: parseInt(limit, 10),
      remaining: parseInt(remaining, 10),
      remainingMonth: parseInt(remainingMonth, 10),
    };
  }

  private async request<T>(
    path: string,
    useAuth: boolean = true
  ): Promise<{ data: T; rateLimit: RateLimitInfo | null }> {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (useAuth && this.apiKey) {
      headers["X-IQBible-API-Key"] = this.apiKey;
    }

    const response = await fetch(`${API_BASE_URL}${path}`, { headers });

    const rateLimit = this.parseRateLimit(response);
    if (rateLimit) {
      this.lastRateLimit = rateLimit;
    }

    if (!response.ok) {
      let errorBody: ApiError;
      try {
        errorBody = (await response.json()) as ApiError;
      } catch {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const code = errorBody.error?.code ?? "unknown_error";
      const message = errorBody.error?.message ?? response.statusText;
      const hint = errorBody.error?.hint;
      const fullMessage = hint ? `${message} ${hint}` : message;

      if (code === "quota_exceeded" || code === "overage_limit_reached") {
        const retryAfter = response.headers.get("Retry-After");
        throw new ApiQuotaError(fullMessage, retryAfter);
      }

      throw new ApiErrorImpl(message, response.status, code, fullMessage);
    }

    const data = (await response.json()) as T;
    return { data, rateLimit };
  }

  async listVersions(): Promise<BibleVersion[]> {
    const { data } = await this.request<{ status: string; count: number; data: BibleVersion[] }>(
      "/bibles?language_code=eng"
    );
    return data.data.sort((a, b) => a.title.localeCompare(b.title));
  }

  async listBooks(version: string): Promise<BookInfo[]> {
    const { data } = await this.request<{ version: string; count: number; data: BookInfo[] }>(
      `/bibles/${encodeURIComponent(version)}/books`
    );
    return data.data;
  }

  async getBookMeta(version: string, book: string): Promise<BookMetaResponse> {
    const { data } = await this.request<BookMetaResponse>(
      `/bibles/${encodeURIComponent(version)}/${encodeURIComponent(book)}/meta`
    );
    return data;
  }

  async fetchPassage(
    version: string,
    book: string,
    chapter: number,
    verseRange: string,
    includeWordsOfJesus: boolean = true
  ): Promise<Passage> {
    const params = new URLSearchParams();
    if (includeWordsOfJesus) {
      params.set("include", "words_of_jesus");
    }
    const query = params.toString();
    const { data } = await this.request<Passage>(
      `/bibles/${encodeURIComponent(version)}/${encodeURIComponent(book)}/${chapter}/${encodeURIComponent(verseRange)}${query ? `?${query}` : ""}`
    );
    return data;
  }

  async parseCitation(
    citation: string,
    version?: string
  ): Promise<ParseCitationResponse> {
    const params = new URLSearchParams({ citation });
    if (version) {
      params.set("version", version);
      params.set("hydrate", "true");
    }
    const { data } = await this.request<ParseCitationResponse>(
      `/parse/citation?${params.toString()}`,
      false
    );
    return data;
  }
}

export class ApiErrorImpl extends Error {
  status: number;
  code: string;
  message: string;

  constructor(message: string, status: number, code: string, detail: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.message = detail;
  }
}

export class ApiQuotaError extends Error {
  retryAfter: string | null;
  code = "quota_exceeded";

  constructor(message: string, retryAfter: string | null) {
    super(message);
    this.name = "ApiQuotaError";
    this.retryAfter = retryAfter;
  }
}

export const bibleApi = new BibleApi();
