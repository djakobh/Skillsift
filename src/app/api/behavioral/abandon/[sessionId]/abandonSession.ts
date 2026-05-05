//Author: Brandon Christian
//Date: 3/20/2026
//update existing session to be abandoned
//separate into own file

import { NextResponse } from "next/server";
import { db } from "~/server/db";
//import { ClearVideoData } from "../../pause/manageVideoStorage"


export async function AbandonSession(
    sessionId: string, userId: string
) {

        //Update the first session whose ID matches the one we
        //created at session start for this user
        const interviewSession = await db.interviewSession.update({
            where: {
                userId: userId,
                id: sessionId,
            },
            data: {
                completedAt: new Date(),
                status: "ABANDONED",
                savedData: {
                    deleteMany: {}
                }
            },
            include: {
                savedData: true
            }
        });

        //Return if successful
        if (interviewSession) {

            //DeleteAllVideoData(interviewSession.savedData);

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

/*
function DeleteAllVideoData(storedSessions: any[]) {
    storedSessions.forEach(
        (session) => {
            if (session.videoURL)
                ClearVideoData(session.videoURL);
        }
    )
}*/
