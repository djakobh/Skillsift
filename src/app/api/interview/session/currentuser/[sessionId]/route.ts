import { NextResponse } from "next/server";
import { db } from "~/server/db";
import { auth } from "~/server/auth";

// pause, resume, complete a session
export async function PATCH(
  req: Request,
  { params }: { params: { sessionId: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" });
    }

    const { sessionId } = params;
    const { action, responses } = await req.json();

    // Verify the session exists and belongs to this user
    const existing = await db.interviewSession.findUnique({
      where: { id: sessionId },
      select: {
        userId: true,
        pausedAt: true,
        totalPausedMs: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Session not found" });
    }

    if (existing.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" });
    }

    // PAUSE
    if (action === "pause") {
      const updated = await db.interviewSession.update({
        where: { id: sessionId },
        data: { pausedAt: new Date() },
        select: { id: true, pausedAt: true },
      });

      return NextResponse.json(updated);
    }

    // RESUME
    if (action === "resume") {
      let additionalPausedMs = 0;
      if (existing.pausedAt) {
        additionalPausedMs = Date.now() - existing.pausedAt.getTime();
      }

      const updated = await db.interviewSession.update({
        where: { id: sessionId },
        data: {
          pausedAt: null,
          resumedAt: new Date(),
          totalPausedMs: existing.totalPausedMs + additionalPausedMs,
        },
        select: { id: true, resumedAt: true, totalPausedMs: true },
      });

      return NextResponse.json(updated);
    }

    // COMPLETE
    if (action === "complete") {
      if (responses && responses.length > 0) {
        await db.interviewResponse.createMany({
          data: responses.map((r: { question: string; answer: string }) => ({
            sessionId,
            question: r.question,
            answer: r.answer,
          })),
        });
      }

      const updated = await db.interviewSession.update({
        where: { id: sessionId },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          pausedAt: null,
        },
        select: {
          id: true,
          completedAt: true,
          totalPausedMs: true,
          startedAt: true,
        },
      });

      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: "Invalid action" });
  } catch (err) {
    console.error("SESSION UPDATE ERROR:", err);
    return NextResponse.json({ error: "Failed to update session" });
  }
}

// fetch a session with its responses
export async function GET(
  _req: Request,
  { params }: { params: { sessionId: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" });
    }

    const { sessionId } = params;

    const interviewSession = await db.interviewSession.findUnique({
      where: { id: sessionId },
      include: { responses: true },
    });

    if (!interviewSession) {
      return NextResponse.json({ error: "Session not found" });
    }

    if (interviewSession.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" });
    }

    return NextResponse.json(interviewSession);
  } catch (err) {
    console.error("SESSION GET ERROR:", err);
    return NextResponse.json({ error: "Failed to fetch session" });
  }
}