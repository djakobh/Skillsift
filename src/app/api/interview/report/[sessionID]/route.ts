//Author: Brandon Christian
//Date: 2/4/2026
//initial creation

import { NextResponse } from "next/server";
import { db } from "~/server/db";
import { auth } from "~/server/auth";

export async function GET(
    request: Request,
    { params }: { params: { sessionID: string } }
) {
    const session = await auth();

    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sessionID } = params;

    const report = await db.interviewReport.findFirst({
        where: {
            sessionId: sessionID,
        },
        include: {
            session: {
                select: { userId: true },
            },
        },
    });

    if (!report) {
        return NextResponse.json({ error: "No report found" }, { status: 404 });
    }

    // Ensure the report belongs to the authenticated user
    if (report.session?.userId !== session.user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Strip the nested session field before returning
    const { session: _session, ...safeReport } = report;
    return NextResponse.json(safeReport);
}
