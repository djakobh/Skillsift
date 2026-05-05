// Alvin Ngo student work report 3
// Dedicated endpoint for quick inline status changes from the dashboard.
// Uses a Prisma transaction to atomically update the status AND log
// the change in StatusHistory, ensuring they always stay in sync.

import { NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";
import { auth } from "~/server/auth";

// PATCH /api/jobs/[id]/status — Quick status update with history tracking
// Body: { status: "APPLIED", note?: "Submitted via LinkedIn" }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { status, note } = body;

  if (!status) {
    return NextResponse.json({ error: "Status is required" }, { status: 400 });
  }

  const existing = await db.jobApplication.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
  if (existing.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Prevent no-op updates
  if (existing.status === status) {
    return NextResponse.json({ error: "Status is already " + status }, { status: 400 });
  }

  // Use a transaction so the history record and status update are atomic —
  // if either fails, neither is committed to the database
  const [, updated] = await db.$transaction([
    db.statusHistory.create({
      data: {
        jobApplicationId: id,
        fromStatus: existing.status,
        toStatus: status,
        note: note || null,
      },
    }),
    db.jobApplication.update({
      where: { id },
      data: { status },
    }),
  ]);

  return NextResponse.json(updated);
}
