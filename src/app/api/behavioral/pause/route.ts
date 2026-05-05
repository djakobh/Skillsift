//Author: Brandon Christian
//Date: 3/18/2026
//Save new entry including audio and video data
//and associate it with specific sessionId
//pause a behavioral session

//packages for video download/upload:
//npm install @aws-sdk/s3-request-presigner
//npm install @aws-sdk/client-s3

import { NextRequest, NextResponse } from "next/server";
import { auth } from "src/server/auth";
import { PauseSession } from "./pauseSession";


export async function POST(
    req: NextRequest
) { 
    const session = await auth();

    if (session && session.user) {
        return PauseSession(req, session.user.id);
    }

    //Failed to authenticate user
    return NextResponse.json(
        {
            success: false
        }
    );
}






