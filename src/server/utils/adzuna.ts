// Adzuna API client for the job suggestions feature.
// Wraps the public Adzuna search endpoint with a small in-memory
// cache, timeout, and normalized response shape. Intended to be
// called only from server-side route handlers (never the client)
// so the app_id / app_key stay private.

import { env } from "~/env";

// ============================================
// Types
// ============================================

export interface AdzunaSearchParams {
  keyword?: string;
  location?: string;
  salaryMin?: number;
  salaryMax?: number;
  fullTime?: boolean;
  partTime?: boolean;
  contract?: boolean;
  permanent?: boolean;
  page?: number;
  country?: string; // ISO 3166-1 alpha-2 (us, gb, ...)
  resultsPerPage?: number;
}

export interface AdzunaJob {
  id: string;
  title: string;
  company: string | null;
  location: string | null;
  description: string;
  salaryMin: number | null;
  salaryMax: number | null;
  redirectUrl: string;
  createdAt: string | null;
  category: string | null;
  contractType: string | null;
  contractTime: string | null;
}

export interface AdzunaSearchResult {
  jobs: AdzunaJob[];
  totalCount: number;
  page: number;
  resultsPerPage: number;
}

export class AdzunaError extends Error {
  status: number;
  code: "not_configured" | "rate_limited" | "timeout" | "upstream" | "invalid";
  constructor(
    message: string,
    code: AdzunaError["code"],
    status = 502,
  ) {
    super(message);
    this.name = "AdzunaError";
    this.code = code;
    this.status = status;
  }
}

// ============================================
// Simple in-memory cache with TTL
// ============================================

// Module-level cache — scoped to the Node process. Good enough to
// avoid redundant calls on quick page refreshes; Adzuna data is not
// time-critical, and a short TTL keeps results reasonably fresh.
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_ENTRIES = 50;

type CacheEntry = { value: AdzunaSearchResult; expiresAt: number };
const cache = new Map<string, CacheEntry>();

function cacheKey(params: AdzunaSearchParams): string {
  return JSON.stringify(params);
}

function getCached(key: string): AdzunaSearchResult | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function setCached(key: string, value: AdzunaSearchResult): void {
  if (cache.size >= MAX_CACHE_ENTRIES) {
    // Drop the oldest key to bound memory. Map preserves insertion order.
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ============================================
// Public API
// ============================================

export function isAdzunaConfigured(): boolean {
  return Boolean(env.ADZUNA_APP_ID && env.ADZUNA_APP_KEY);
}

export async function searchAdzuna(
  params: AdzunaSearchParams,
): Promise<AdzunaSearchResult> {
  if (!env.ADZUNA_APP_ID || !env.ADZUNA_APP_KEY) {
    throw new AdzunaError(
      "Adzuna API credentials are not configured",
      "not_configured",
      503,
    );
  }

  const key = cacheKey(params);
  const cached = getCached(key);
  if (cached) return cached;

  const country = (params.country ?? "us").toLowerCase();
  const page = Math.max(1, params.page ?? 1);
  const resultsPerPage = Math.min(
    Math.max(params.resultsPerPage ?? 12, 1),
    50,
  );

  const url = new URL(
    `https://api.adzuna.com/v1/api/jobs/${country}/search/${page}`,
  );
  url.searchParams.set("app_id", env.ADZUNA_APP_ID);
  url.searchParams.set("app_key", env.ADZUNA_APP_KEY);
  url.searchParams.set("results_per_page", String(resultsPerPage));
  url.searchParams.set("content-type", "application/json");
  if (params.keyword) url.searchParams.set("what", params.keyword);
  if (params.location) url.searchParams.set("where", params.location);
  if (params.salaryMin != null)
    url.searchParams.set("salary_min", String(params.salaryMin));
  if (params.salaryMax != null)
    url.searchParams.set("salary_max", String(params.salaryMax));
  if (params.fullTime) url.searchParams.set("full_time", "1");
  if (params.partTime) url.searchParams.set("part_time", "1");
  if (params.contract) url.searchParams.set("contract", "1");
  if (params.permanent) url.searchParams.set("permanent", "1");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
  } catch (err) {
    clearTimeout(timeout);
    const aborted =
      err instanceof Error && err.name === "AbortError";
    throw new AdzunaError(
      aborted ? "Adzuna request timed out" : "Failed to reach Adzuna",
      aborted ? "timeout" : "upstream",
      504,
    );
  }
  clearTimeout(timeout);

  if (res.status === 429) {
    throw new AdzunaError(
      "Adzuna rate limit exceeded; try again in a moment",
      "rate_limited",
      429,
    );
  }
  if (!res.ok) {
    throw new AdzunaError(
      `Adzuna returned HTTP ${res.status}`,
      "upstream",
      502,
    );
  }

  let raw: unknown;
  try {
    raw = await res.json();
  } catch {
    throw new AdzunaError("Adzuna returned invalid JSON", "invalid", 502);
  }

  const parsed = parseAdzunaResponse(raw, page, resultsPerPage);
  setCached(key, parsed);
  return parsed;
}

// ============================================
// Response parsing
// ============================================

function parseAdzunaResponse(
  raw: unknown,
  page: number,
  resultsPerPage: number,
): AdzunaSearchResult {
  if (!raw || typeof raw !== "object") {
    throw new AdzunaError("Adzuna response was not an object", "invalid");
  }
  const obj = raw as Record<string, unknown>;
  const results = Array.isArray(obj.results) ? obj.results : [];
  const totalCount =
    typeof obj.count === "number" ? obj.count : results.length;

  const jobs: AdzunaJob[] = [];
  for (const r of results) {
    if (!r || typeof r !== "object") continue;
    const j = r as Record<string, unknown>;
    const id = typeof j.id === "string" ? j.id : j.id != null ? String(j.id) : null;
    const title = typeof j.title === "string" ? j.title : null;
    const redirectUrl =
      typeof j.redirect_url === "string" ? j.redirect_url : null;
    if (!id || !title || !redirectUrl) continue;

    const company =
      typeof j.company === "object" && j.company !== null
        ? ((j.company as Record<string, unknown>).display_name as
            | string
            | undefined) ?? null
        : null;
    const location =
      typeof j.location === "object" && j.location !== null
        ? ((j.location as Record<string, unknown>).display_name as
            | string
            | undefined) ?? null
        : null;
    const description =
      typeof j.description === "string" ? j.description : "";
    const salaryMin =
      typeof j.salary_min === "number" ? Math.round(j.salary_min) : null;
    const salaryMax =
      typeof j.salary_max === "number" ? Math.round(j.salary_max) : null;
    const createdAt = typeof j.created === "string" ? j.created : null;
    const category =
      typeof j.category === "object" && j.category !== null
        ? ((j.category as Record<string, unknown>).label as
            | string
            | undefined) ?? null
        : null;
    const contractType =
      typeof j.contract_type === "string" ? j.contract_type : null;
    const contractTime =
      typeof j.contract_time === "string" ? j.contract_time : null;

    jobs.push({
      id,
      title,
      company,
      location,
      description,
      salaryMin,
      salaryMax,
      redirectUrl,
      createdAt,
      category,
      contractType,
      contractTime,
    });
  }

  return { jobs, totalCount, page, resultsPerPage };
}
