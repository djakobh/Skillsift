//Author: Brandon Christian
//Date: 3/19/2026
//set resume date of existing session

import { NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";
import { auth } from "src/server/auth"


export async function POST(
    request: NextRequest,
    { params }: { params: { sessionId: string } }
) {
    const { sessionId } = params;

    const session = await auth();

    if (session && session.user) {

        //Update resumed date
        const interviewSession = await db.interviewSession.update({
            where: {
                userId: session.user.id,
                id: sessionId,
            },
            data: {
                resumedAt: new Date()
            }
        });

        //Return if successful
        if (interviewSession) {

            return NextResponse.json(
                {
                    success: true,
                    session: interviewSession
                }
            );
        }
        else {
            console.log("failed to find session. id: " + sessionId)
        }
        
    }

    //Failed to update session for some reason
    return NextResponse.json(
        {
            success: false,
            session: null
        }
    );
}
