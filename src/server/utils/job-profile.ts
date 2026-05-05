// Derives a search profile (keywords, locations, salary range, common titles)
// from a user's tracked JobApplication records. The profile is used to seed
// the Adzuna suggestions feed so the first page of results resembles what
// the user has already been applying to.
//
// Reuses the ATS keyword-matcher dictionaries by running extractKeywords
// across titles + descriptions of tracked jobs.

import { extractKeywords } from "./keyword-matcher";

// Minimal shape of a JobApplication record used when building a profile.
// We avoid importing the generated Prisma type so this helper stays
// independent of the generated client's output path.
type TrackedJob = {
  position: string;
  jobDescription: string | null;
  location: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
};

export interface JobSearchProfile {
  keyword: string; // space-joined top keywords suitable for Adzuna `what`
  topKeywords: string[];
  topTitles: string[];
  topLocations: string[];
  salaryMin: number | null;
  salaryMax: number | null;
  hasData: boolean;
}

// How many top items to return in each list
const MAX_KEYWORDS = 5;
const MAX_TITLES = 3;
const MAX_LOCATIONS = 3;

export function buildJobSearchProfile(jobs: TrackedJob[]): JobSearchProfile {
  if (jobs.length === 0) {
    return {
      keyword: "",
      topKeywords: [],
      topTitles: [],
      topLocations: [],
      salaryMin: null,
      salaryMax: null,
      hasData: false,
    };
  }

  // Keyword frequency across position + description text
  const keywordCounts = new Map<string, number>();
  for (const job of jobs) {
    const text = [job.position, job.jobDescription].filter(Boolean).join(" ");
    if (!text) continue;
    const kws = extractKeywords(text);
    for (const kw of kws) {
      keywordCounts.set(kw, (keywordCounts.get(kw) ?? 0) + 1);
    }
  }

  const topKeywords = [...keywordCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_KEYWORDS)
    .map(([k]) => k);

  // Pick common title words (case-insensitive) to offer as a title hint
  const titleCounts = countNormalized(jobs.map((j) => j.position));
  const topTitles = [...titleCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_TITLES)
    .map(([k]) => k);

  const locationCounts = countNormalized(
    jobs.map((j) => j.location ?? "").filter((v) => v.length > 0),
  );
  const topLocations = [...locationCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_LOCATIONS)
    .map(([k]) => k);

  // Salary range: use median-ish bounds — floor of min salaries, ceil of max
  const mins = jobs
    .map((j) => j.salaryMin)
    .filter((n): n is number => typeof n === "number" && n > 0);
  const maxes = jobs
    .map((j) => j.salaryMax)
    .filter((n): n is number => typeof n === "number" && n > 0);
  const salaryMin = mins.length ? Math.min(...mins) : null;
  const salaryMax = maxes.length ? Math.max(...maxes) : null;

  const keyword = topKeywords.slice(0, 3).join(" ");

  return {
    keyword,
    topKeywords,
    topTitles,
    topLocations,
    salaryMin,
    salaryMax,
    hasData: true,
  };
}

// Collapse trivial variations (case, whitespace) and tally occurrences.
function countNormalized(values: string[]): Map<string, number> {
  const byNormalized = new Map<string, { display: string; count: number }>();
  for (const raw of values) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    const existing = byNormalized.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      byNormalized.set(key, { display: trimmed, count: 1 });
    }
  }
  const out = new Map<string, number>();
  for (const { display, count } of byNormalized.values()) {
    out.set(display, count);
  }
  return out;
}
