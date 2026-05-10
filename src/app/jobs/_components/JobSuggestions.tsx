// Embeddable Adzuna-powered suggestion feed.
// Fetches /api/jobs/suggest, auto-populates filters from the user's tracked
// JobApplication profile on first load, and renders a grid of cards with
// "View Posting", "Add to Tracker", and "Not Interested" actions plus
// pagination and a refresh button.
//
// Designed to live inline inside the Job Tracker page — `onJobAdded` lets
// the parent refresh its own table when a suggestion is saved.

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2,
  ExternalLink,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  X,
} from "lucide-react";

type AdzunaJob = {
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
};

type SearchProfile = {
  keyword: string;
  topKeywords: string[];
  topTitles: string[];
  topLocations: string[];
  salaryMin: number | null;
  salaryMax: number | null;
  hasData: boolean;
};

type SuggestResponse = {
  jobs: AdzunaJob[];
  totalCount: number;
  page: number;
  resultsPerPage: number;
  profile?: SearchProfile;
};

const JOB_TYPES = [
  { value: "", label: "Any type" },
  { value: "full_time", label: "Full-time" },
  { value: "part_time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "permanent", label: "Permanent" },
] as const;

function formatSalary(min: number | null, max: number | null) {
  if (!min && !max) return null;
  const fmt = (n: number) => "$" + n.toLocaleString();
  if (min && max) return `${fmt(min)} - ${fmt(max)}`;
  if (min) return `${fmt(min)}+`;
  return `Up to ${fmt(max!)}`;
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

export default function JobSuggestions({
  onJobAdded,
}: {
  onJobAdded?: () => void;
}) {
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");
  const [salaryMin, setSalaryMin] = useState<number>(0);
  const [salaryMax, setSalaryMax] = useState<number>(250_000);
  const [jobType, setJobType] = useState<string>("");
  const [page, setPage] = useState(1);

  const [jobs, setJobs] = useState<AdzunaJob[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [resultsPerPage, setResultsPerPage] = useState(12);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoPopulated, setAutoPopulated] = useState(false);

  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [dismissingId, setDismissingId] = useState<string | null>(null);

  const fetchSuggestions = useCallback(
    async (opts: { page: number; includeProfile: boolean }) => {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (keyword.trim()) params.set("keyword", keyword.trim());
      if (location.trim()) params.set("location", location.trim());
      if (salaryMin > 0) params.set("salaryMin", String(salaryMin));
      if (salaryMax > 0 && salaryMax < 1_000_000)
        params.set("salaryMax", String(salaryMax));
      if (jobType) params.set("jobType", jobType);
      params.set("page", String(opts.page));
      if (opts.includeProfile) params.set("profile", "1");

      try {
        const res = await fetch(`/api/jobs/suggest?${params.toString()}`);
        const data = (await res.json()) as
          | SuggestResponse
          | { error: string; code?: string };

        if (!res.ok) {
          const msg = "error" in data ? data.error : "Failed to load suggestions";
          setError(msg);
          setJobs([]);
          setTotalCount(0);
          return;
        }

        const payload = data as SuggestResponse;
        setJobs(payload.jobs);
        setTotalCount(payload.totalCount);
        setResultsPerPage(payload.resultsPerPage);

        if (opts.includeProfile && payload.profile && !autoPopulated) {
          const p = payload.profile;
          if (p.hasData) {
            if (!keyword && p.keyword) setKeyword(p.keyword);
            if (!location && p.topLocations[0])
              setLocation(p.topLocations[0]);
            if (p.salaryMin != null && salaryMin === 0)
              setSalaryMin(p.salaryMin);
            if (p.salaryMax != null && salaryMax === 250_000)
              setSalaryMax(p.salaryMax);
          }
          setAutoPopulated(true);
        }
      } catch {
        setError("Network error. Please try again.");
        setJobs([]);
        setTotalCount(0);
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [keyword, location, salaryMin, salaryMax, jobType, autoPopulated],
  );

  // Initial load: ask for the search profile
  useEffect(() => {
    if (!autoPopulated) {
      fetchSuggestions({ page: 1, includeProfile: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refetch once after the profile seeded the filters
  useEffect(() => {
    if (autoPopulated) {
      fetchSuggestions({ page: 1, includeProfile: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPopulated]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalCount / resultsPerPage)),
    [totalCount, resultsPerPage],
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchSuggestions({ page: 1, includeProfile: false });
  };

  const handleRefresh = () => {
    fetchSuggestions({ page, includeProfile: false });
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setPage(newPage);
    fetchSuggestions({ page: newPage, includeProfile: false });
  };

  const handleAddToTracker = async (job: AdzunaJob) => {
    setAddingId(job.id);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: job.company ?? "Unknown",
          position: job.title,
          jobDescription: stripHtml(job.description) || null,
          jobUrl: job.redirectUrl,
          salaryMin: job.salaryMin,
          salaryMax: job.salaryMax,
          location: job.location,
          status: "SAVED",
        }),
      });
      if (res.ok) {
        setAddedIds((prev) => new Set(prev).add(job.id));
        onJobAdded?.();
      }
    } finally {
      setAddingId(null);
    }
  };

  const handleDismiss = async (job: AdzunaJob) => {
    setDismissingId(job.id);
    try {
      const res = await fetch("/api/jobs/dismiss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adzunaJobId: job.id }),
      });
      if (res.ok) {
        setJobs((prev) => prev.filter((j) => j.id !== job.id));
      }
    } finally {
      setDismissingId(null);
    }
  };

  return (
    <section id="suggestions" className="mt-10">
      {/* Section header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="mb-1 flex items-center gap-2 text-2xl font-bold">
            <Sparkles className="h-6 w-6 text-orange-500" />
            Suggested Jobs
          </h2>
          <p className="text-sm text-gray-600">
            Personalized listings from Adzuna based on your tracked applications.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="flex items-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <form
        onSubmit={handleSearch}
        className="mb-6 rounded-lg border-2 border-black bg-white p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold">Filters</h3>
          {totalCount > 0 && (
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium">
              {totalCount.toLocaleString()} Matches
            </span>
          )}
        </div>
        <hr className="-mx-6 mb-6 border-t-2 border-black" />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Keywords
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="e.g. React, Python, Data Engineer"
                className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Location
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. San Francisco, Remote"
                className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Salary range (${salaryMin.toLocaleString()} – $
              {salaryMax.toLocaleString()})
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={500_000}
                step={5_000}
                value={salaryMin}
                onChange={(e) =>
                  setSalaryMin(
                    Math.min(Number(e.target.value), salaryMax - 5_000),
                  )
                }
                className="w-full accent-orange-500"
              />
              <input
                type="range"
                min={0}
                max={500_000}
                step={5_000}
                value={salaryMax}
                onChange={(e) =>
                  setSalaryMax(
                    Math.max(Number(e.target.value), salaryMin + 5_000),
                  )
                }
                className="w-full accent-orange-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Job type
            </label>
            <select
              value={jobType}
              onChange={(e) => setJobType(e.target.value)}
              className="w-full rounded-md border border-gray-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            >
              {JOB_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="rounded-full bg-orange-500 px-6 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-60"
          >
            Search
          </button>
        </div>
      </form>

      {loading ? (
        <SkeletonGrid />
      ) : error ? (
        <ErrorState message={error} onRetry={handleRefresh} />
      ) : jobs.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {jobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                added={addedIds.has(job.id)}
                adding={addingId === job.id}
                dismissing={dismissingId === job.id}
                onAdd={() => handleAddToTracker(job)}
                onDismiss={() => handleDismiss(job)}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              onChange={handlePageChange}
              disabled={loading}
            />
          )}
        </>
      )}
    </section>
  );
}

function JobCard({
  job,
  added,
  adding,
  dismissing,
  onAdd,
  onDismiss,
}: {
  job: AdzunaJob;
  added: boolean;
  adding: boolean;
  dismissing: boolean;
  onAdd: () => void;
  onDismiss: () => void;
}) {
  const salary = formatSalary(job.salaryMin, job.salaryMax);
  const snippet = stripHtml(job.description).slice(0, 220);
  return (
    <div className="flex flex-col rounded-lg border-2 border-black bg-white p-5 transition hover:shadow-md">
      <div className="mb-3 flex items-start justify-between gap-2">
        <h3 className="text-base font-bold leading-snug">{job.title}</h3>
        <button
          onClick={onDismiss}
          disabled={dismissing}
          title="Not interested"
          className="-mr-1 -mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-2 flex items-center gap-2 text-sm text-gray-700">
        <Building2 className="h-4 w-4 text-gray-400" />
        <span className="truncate">{job.company ?? "Unknown company"}</span>
      </div>
      {job.location && (
        <div className="mb-2 flex items-center gap-2 text-sm text-gray-600">
          <MapPin className="h-4 w-4 text-gray-400" />
          <span className="truncate">{job.location}</span>
        </div>
      )}
      {salary && (
        <div className="mb-3 text-sm font-medium text-green-700">{salary}</div>
      )}

      <p className="mb-4 flex-1 text-xs leading-relaxed text-gray-600">
        {snippet}
        {snippet.length >= 220 ? "…" : ""}
      </p>

      <div className="mt-auto flex gap-2">
        <a
          href={job.redirectUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-1 items-center justify-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          View Posting
        </a>
        <button
          onClick={onAdd}
          disabled={adding || added}
          className={`flex flex-1 items-center justify-center gap-1 rounded-md px-3 py-2 text-xs font-medium text-white ${
            added
              ? "bg-green-600"
              : "bg-orange-500 hover:bg-orange-600 disabled:opacity-60"
          }`}
        >
          <Plus className="h-3.5 w-3.5" />
          {added ? "Added" : adding ? "Adding..." : "Add to Tracker"}
        </button>
      </div>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col rounded-lg border-2 border-black bg-white p-5"
        >
          <div className="mb-3 h-5 w-3/4 animate-pulse rounded bg-gray-200" />
          <div className="mb-2 h-4 w-1/2 animate-pulse rounded bg-gray-200" />
          <div className="mb-2 h-4 w-1/3 animate-pulse rounded bg-gray-200" />
          <div className="mb-3 h-4 w-1/4 animate-pulse rounded bg-gray-200" />
          <div className="mb-1 h-3 w-full animate-pulse rounded bg-gray-100" />
          <div className="mb-1 h-3 w-full animate-pulse rounded bg-gray-100" />
          <div className="mb-4 h-3 w-2/3 animate-pulse rounded bg-gray-100" />
          <div className="mt-auto flex gap-2">
            <div className="h-8 flex-1 animate-pulse rounded bg-gray-200" />
            <div className="h-8 flex-1 animate-pulse rounded bg-gray-200" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border-2 border-dashed border-gray-300 bg-white py-16 text-center">
      <Sparkles className="mx-auto mb-4 h-10 w-10 text-gray-300" />
      <p className="mb-1 text-sm font-medium text-gray-700">
        No matching jobs found
      </p>
      <p className="text-xs text-gray-500">
        Try widening your keyword, location, or salary filters.
      </p>
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-lg border-2 border-red-200 bg-red-50 py-12 text-center">
      <p className="mb-2 text-sm font-semibold text-red-700">
        Couldn&rsquo;t load suggestions
      </p>
      <p className="mb-4 text-xs text-red-600">{message}</p>
      <button
        onClick={onRetry}
        className="rounded-full bg-red-600 px-5 py-2 text-xs font-medium text-white hover:bg-red-700"
      >
        Try again
      </button>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  onChange,
  disabled,
}: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
  disabled: boolean;
}) {
  return (
    <div className="mt-8 flex items-center justify-center gap-3">
      <button
        onClick={() => onChange(page - 1)}
        disabled={disabled || page <= 1}
        className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40"
      >
        Previous
      </button>
      <span className="text-sm text-gray-600">
        Page <span className="font-semibold">{page}</span> of{" "}
        <span className="font-semibold">{totalPages}</span>
      </span>
      <button
        onClick={() => onChange(page + 1)}
        disabled={disabled || page >= totalPages}
        className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40"
      >
        Next
      </button>
    </div>
  );
}
