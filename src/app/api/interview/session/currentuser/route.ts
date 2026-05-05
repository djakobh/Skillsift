// Author: Brandon Christian
// Date: 2/2/2026 — Initial creation
// Date: 2/3/2026 — Add user ID fetch
// Date: 2/4/2026 — Update route to interview/session/currentuser

import { NextResponse } from "next/server";
import { db } from "~/server/db";
import { auth } from "src/server/auth";

// GET — fetch all sessions for the current user
export async function GET() {
  const session = await auth();
 
  if (session && session.user) {
    const id = session.user.id;
 
    const sessions = await db.interviewSession.findMany({
      where: {
        userId: id,
      },
      include: {
        responses: true,
      },
    });
 
    return NextResponse.json(sessions);
  }
 
  return NextResponse.json([]);
}

// create a new interview session
export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" });
    }

    const { question1Id, question2Id } = await req.json();

    if (!question1Id || !question2Id) {
      return NextResponse.json({ error: "Two question IDs are required" });
    }

    const interviewSession = await db.interviewSession.create({
      data: {
        userId: session.user.id,
        type: "TECHNICAL",
        question1Id,
        question2Id,
        startedAt: new Date(),
      },
      select: {
        id: true,
        startedAt: true,
        question1Id: true,
        question2Id: true,
      },
    });

    return NextResponse.json(interviewSession);
  } catch (err) {
    console.error("SESSION CREATE ERROR:", err);
    return NextResponse.json({ error: "Failed to create session" });
  }
}