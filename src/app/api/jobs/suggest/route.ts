// GET /api/jobs/suggest — Proxy route that queries the Adzuna API
// on behalf of the authenticated user. Filters dismissed jobs out,
// optionally returns a derived search profile built from the user's
// tracked JobApplication records so the UI can auto-populate filters.
//
// Query params:
//   keyword, location        strings
//   salaryMin, salaryMax     integers
//   jobType                  "full_time" | "part_time" | "contract" | "permanent"
//   page                     integer (1-based, default 1)
//   country                  Adzuna country code (default "us")
//   profile                  "1" to also compute and return the search profile
//
// Response: { jobs, totalCount, page, resultsPerPage, profile? }

import { NextRequest, NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import {
  AdzunaError,
  isAdzunaConfigured,
  searchAdzuna,
  type AdzunaSearchParams,
} from "~/server/utils/adzuna";
import { buildJobSearchProfile } from "~/server/utils/job-profile";

const RESULTS_PER_PAGE = 12;

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const keyword = searchParams.get("keyword")?.trim() || undefined;
  const location = searchParams.get("location")?.trim() || undefined;
  const salaryMin = parseIntOrNull(searchParams.get("salaryMin"));
  const salaryMax = parseIntOrNull(searchParams.get("salaryMax"));
  const jobType = searchParams.get("jobType") ?? undefined;
  const page = Math.max(1, parseIntOrNull(searchParams.get("page")) ?? 1);
  const country = searchParams.get("country")?.trim().toLowerCase() || "us";
  const includeProfile = searchParams.get("profile") === "1";

  // Validate salary range
  if (salaryMin != null && salaryMax != null && salaryMin > salaryMax) {
    return NextResponse.json(
      { error: "Minimum salary cannot exceed maximum salary" },
      { status: 400 },
    );
  }

  // Build the search profile — also used as a fallback keyword when the
  // user has not typed one yet (first-load experience).
  let profile = null as ReturnType<typeof buildJobSearchProfile> | null;
  if (includeProfile || !keyword) {
    const trackedJobs = await db.jobApplication.findMany({
      where: { userId: session.user.id },
      select: {
        position: true,
        jobDescription: true,
        location: true,
        salaryMin: true,
        salaryMax: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    profile = buildJobSearchProfile(trackedJobs);
  }

  const effectiveKeyword =
    keyword ?? (profile?.hasData ? profile.keyword : "");

  if (!isAdzunaConfigured()) {
    return NextResponse.json(
      {
        error:
          "Adzuna API credentials are not configured. Set ADZUNA_APP_ID and ADZUNA_APP_KEY.",
      },
      { status: 503 },
    );
  }

  const adzunaParams: AdzunaSearchParams = {
    keyword: effectiveKeyword || undefined,
    location,
    salaryMin: salaryMin ?? undefined,
    salaryMax: salaryMax ?? undefined,
    fullTime: jobType === "full_time",
    partTime: jobType === "part_time",
    contract: jobType === "contract",
    permanent: jobType === "permanent",
    page,
    country,
    resultsPerPage: RESULTS_PER_PAGE,
  };

  let result;
  try {
    result = await searchAdzuna(adzunaParams);
  } catch (err) {
    if (err instanceof AdzunaError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      );
    }
    console.error("Unexpected Adzuna failure:", err);
    return NextResponse.json(
      { error: "Failed to load suggestions" },
      { status: 500 },
    );
  }

  // Filter out jobs the user has dismissed
  const dismissed = await db.dismissedJob.findMany({
    where: { userId: session.user.id },
    select: { adzunaJobId: true },
  });
  const dismissedIds = new Set(dismissed.map((d) => d.adzunaJobId));
  const filteredJobs = result.jobs.filter((j) => !dismissedIds.has(j.id));

  return NextResponse.json({
    jobs: filteredJobs,
    totalCount: result.totalCount,
    page: result.page,
    resultsPerPage: result.resultsPerPage,
    profile: includeProfile ? profile : undefined,
  });
}

function parseIntOrNull(raw: string | null): number | null {
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}
