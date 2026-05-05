// Alvin Ngo student work report 3
// API routes for job application CRUD (list and create).
// GET supports filtering by status, searching by company/position,
// and sorting by various fields via query params.
// POST creates a new job application for the authenticated user.

import { NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";
import { auth } from "~/server/auth";

// GET /api/jobs — List all jobs for current user
// Supports query params: status, search, sortBy, sortOrder
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Extract filter/sort params from the URL query string
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const search = searchParams.get("search");
  const sortBy = searchParams.get("sortBy") || "createdAt";
  const sortOrder = searchParams.get("sortOrder") || "desc";

  // Build the Prisma where clause dynamically based on provided filters
  const where: Record<string, unknown> = { userId: session.user.id };

  if (status) {
    where.status = status;
  }

  // Case-insensitive search across company and position fields
  if (search) {
    where.OR = [
      { company: { contains: search, mode: "insensitive" } },
      { position: { contains: search, mode: "insensitive" } },
    ];
  }

  // Only allow sorting by whitelisted fields to prevent injection
  const orderBy: Record<string, string> = {};
  if (sortBy === "company" || sortBy === "status" || sortBy === "createdAt" || sortBy === "appliedAt") {
    orderBy[sortBy] = sortOrder === "asc" ? "asc" : "desc";
  } else {
    orderBy.createdAt = "desc";
  }

  const jobs = await db.jobApplication.findMany({
    where,
    orderBy,
    include: {
      // Include count of status history entries for each job
      _count: {
        select: { statusHistory: true },
      },
    },
  });

  return NextResponse.json(jobs);
}

// POST /api/jobs — Create a new job application
// Required fields: company, position. All others are optional.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { company, position, jobDescription, jobUrl, salaryMin, salaryMax, location, status, notes, appliedAt } = body;

  // Validate required fields
  if (!company || !position) {
    return NextResponse.json({ error: "Company and position are required" }, { status: 400 });
  }

  // Validate salary range logic (only if both are provided)
  if (salaryMin != null && salaryMax != null && salaryMin > salaryMax) {
    return NextResponse.json({ error: "Minimum salary cannot exceed maximum salary" }, { status: 400 });
  }

  // Validate URL format if provided
  if (jobUrl && !/^https?:\/\/.+/.test(jobUrl)) {
    return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
  }

  try {
    const job = await db.jobApplication.create({
      data: {
        userId: session.user.id,
        company,
        position,
        jobDescription: jobDescription || null,
        jobUrl: jobUrl || null,
        // Convert salary to number, handling empty strings from form inputs
        salaryMin: salaryMin != null && salaryMin !== "" ? Number(salaryMin) : null,
        salaryMax: salaryMax != null && salaryMax !== "" ? Number(salaryMax) : null,
        location: location || null,
        status: status || "SAVED",
        notes: notes || null,
        appliedAt: appliedAt ? new Date(appliedAt) : null,
      },
    });

    return NextResponse.json(job, { status: 201 });
  } catch (err) {
    console.error("Failed to create job application:", err);
    return NextResponse.json({ error: "Failed to create job application" }, { status: 500 });
  }
}
