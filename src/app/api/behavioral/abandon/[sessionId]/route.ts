//Author: Brandon Christian
//Date: 3/16/2026
//update existing session to be abandoned

import { NextRequest, NextResponse } from "next/server";
import { auth } from "src/server/auth"
import { AbandonSession } from "./abandonSession";


export async function POST(
    request: NextRequest,
    { params }: { params: { sessionId: string } }
) {
    const { sessionId } = params;
    const session = await auth();


    if (session && session.user) {
        return AbandonSession(sessionId, session.user.id);
    }

    //Failed to authenticate the user
    return NextResponse.json(
        {
            success: false,
            session: null
        }
    );
}
