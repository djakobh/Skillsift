//Author: Brandon Christian
//Date: 3/16/2026
//update existing session to be abandoned

import { NextRequest, NextResponse } from "next/server";
import { auth } from "src/server/auth"
import { AbandonSession } from "./abandonSession";


export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ sessionId: string }> }
) {
    const { sessionId } = await params;
    const session = await auth();


    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return AbandonSession(sessionId, session.user.id);
}
