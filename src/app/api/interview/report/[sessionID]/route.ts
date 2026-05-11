//Author: Brandon Christian
//Date: 2/4/2026
//initial creation

import { NextResponse } from "next/server";
import { db } from "~/server/db";
import { auth } from "~/server/auth";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ sessionID: string }> }
) {
    const session = await auth();

    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sessionID } = await params;

    const report = await db.interviewReport.findFirst({
        where: { sessionId: sessionID },
    });

    if (!report) {
        return NextResponse.json({ error: "No report found" }, { status: 404 });
    }

    if (report.userId !== session.user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(report);
}
