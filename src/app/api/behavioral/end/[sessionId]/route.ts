//Author: Brandon Christian
//Date: 2/17/2026
//update existing session with final information

import { NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";
import { auth } from "src/server/auth"


export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ sessionId: string }> }
) {
    const { sessionId } = await params;

    const session = await auth();

    console.log("interiew session id: " + sessionId)

    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const interviewSession = await db.interviewSession.update({
        where: {
            userId: session.user.id,
            id: sessionId,
        },
        data: {
            completedAt: new Date(),
            status: "COMPLETED"
        }
    });

    if (interviewSession) {
        return NextResponse.json({ success: true, session: interviewSession });
    }

    return NextResponse.json({ success: false, session: null }, { status: 500 });
}
    