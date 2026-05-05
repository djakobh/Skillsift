//Author: Brandon Christian
//Date: 2/4/2026
//initial creation

import { NextResponse } from "next/server";
import { db } from "~/server/db";

export async function GET(
    request: Request,
    { params }: { params: { sessionID: string } }
) {
    const { sessionID } = params;

    //TODO: match by user ID also
    const report = await db.interviewReport.findFirst({
        where: {
            sessionId: sessionID,
        },
    });

    if (report)
        return NextResponse.json(report);

    return NextResponse.json(
        { error: "No report found" },
        { status: 404 }
    );
}