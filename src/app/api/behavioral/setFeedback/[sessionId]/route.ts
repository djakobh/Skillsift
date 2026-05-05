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

    const formData = await req.formData();
    const rawFeedback = formData.get("feedback") as string;
    const feedback = JSON.parse(rawFeedback);

    const session = await auth();

    console.log("interiew session id: " + sessionId)

    if (session && session.user) {
        //Update the first session whose ID matches the one we
        //created at session start for this user
        const interviewSession = await db.interviewSession.update({
            where: {
                userId: session.user.id,
                id: sessionId,
            },
            data: {
                feedback: feedback
            }
        });

        //Return if successful
        if (interviewSession) {

            return NextResponse.json(
                {
                    success: true
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
            success: false
        }
    );
}
    