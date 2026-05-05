// Alvin Ngo student work report 3
// API routes for a single job application (get, update, delete).
// All routes verify ownership — users can only access their own applications.
// PUT automatically logs status changes to the StatusHistory table.

import { NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";
import { auth } from "~/server/auth";

// GET /api/jobs/[id] — Get single job with its full status change history
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Next.js 15 requires awaiting dynamic route params
  const { id } = await params;

  const job = await db.jobApplication.findUnique({
    where: { id },
    include: {
      statusHistory: {
        orderBy: { changedAt: "desc" },
      },
    },
  });

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  // Ownership check — prevent users from viewing other users' applications
  if (job.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(job);
}

// PUT /api/jobs/[id] — Update all fields of a job application
// Also creates a StatusHistory record if the status changed
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Fetch existing record to verify ownership and detect status changes
  const existing = await db.jobApplication.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
  if (existing.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { company, position, jobDescription, jobUrl, salaryMin, salaryMax, location, status, notes, appliedAt } = body;

  if (!company || !position) {
    return NextResponse.json({ error: "Company and position are required" }, { status: 400 });
  }

  if (salaryMin != null && salaryMax != null && Number(salaryMin) > Number(salaryMax)) {
    return NextResponse.json({ error: "Minimum salary cannot exceed maximum salary" }, { status: 400 });
  }

  if (jobUrl && !/^https?:\/\/.+/.test(jobUrl)) {
    return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
  }

  // If status changed, log the transition in StatusHistory for the timeline
  if (status && status !== existing.status) {
    await db.statusHistory.create({
      data: {
        jobApplicationId: id,
        fromStatus: existing.status,
        toStatus: status,
      },
    });
  }

  const updated = await db.jobApplication.update({
    where: { id },
    data: {
      company,
      position,
      jobDescription: jobDescription || null,
      jobUrl: jobUrl || null,
      salaryMin: salaryMin != null ? parseInt(salaryMin) : null,
      salaryMax: salaryMax != null ? parseInt(salaryMax) : null,
      location: location || null,
      // Fall back to existing status if none provided
      status: status || existing.status,
      notes: notes || null,
      appliedAt: appliedAt ? new Date(appliedAt) : null,
    },
  });

  return NextResponse.json(updated);
}

// DELETE /api/jobs/[id] — Delete a job application
// StatusHistory records are cascade-deleted via the Prisma schema relation
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await db.jobApplication.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
  if (existing.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.jobApplication.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
