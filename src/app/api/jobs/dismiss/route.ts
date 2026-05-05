// POST /api/jobs/dismiss — Record that the user dismissed an Adzuna
// suggestion. Dismissed job IDs are filtered out of future /api/jobs/suggest
// responses so the user does not see the same listing again.
//
// Body: { adzunaJobId: string }

import { NextRequest, NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const adzunaJobId =
    body && typeof body === "object" && "adzunaJobId" in body
      ? String((body as { adzunaJobId: unknown }).adzunaJobId ?? "").trim()
      : "";

  if (!adzunaJobId) {
    return NextResponse.json(
      { error: "adzunaJobId is required" },
      { status: 400 },
    );
  }

  // upsert keeps the request idempotent — repeated dismissals are no-ops.
  const record = await db.dismissedJob.upsert({
    where: {
      userId_adzunaJobId: {
        userId: session.user.id,
        adzunaJobId,
      },
    },
    create: {
      userId: session.user.id,
      adzunaJobId,
    },
    update: {},
  });

  return NextResponse.json(record, { status: 201 });
}
