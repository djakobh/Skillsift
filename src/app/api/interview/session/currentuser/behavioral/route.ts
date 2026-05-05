// Author: Brandon Christian
// Date: 4/23/2026

// Fetch user sessions only Behavioral

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
            type: "BEHAVIORAL"
      },
      include: {
        responses: true,
      },
    });
 
    return NextResponse.json(sessions);
  }
 
  return NextResponse.json([]);
}