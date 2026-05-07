//Author: Brandon Christian
//Date: 3/19/2026
//Set feedback value of table entry

import { NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";
import { auth } from "src/server/auth"


export async function POST(
    req: NextRequest,
    { params }: { params: { sessionId: string } }
) {
    const { sessionId } = params;

    const session = await auth();

    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const rawFeedback = formData.get("feedback") as string;

    let feedback: unknown;
    try {
        feedback = JSON.parse(rawFeedback);
    } catch {
        return NextResponse.json({ error: "Invalid feedback format" }, { status: 400 });
    }

    const interviewSession = await db.interviewSession.update({
        where: {
            userId: session.user.id,
            id: sessionId,
        },
        data: {
            feedback: feedback
        }
    });

    if (interviewSession) {
        return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false }, { status: 500 });
}
    