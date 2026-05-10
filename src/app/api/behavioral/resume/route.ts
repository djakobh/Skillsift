//Author: Brandon Christian
//Date: 3/17/2026
//Find an in-progress session and return it

import { NextResponse } from "next/server";
import { db } from "~/server/db";
import { auth } from "src/server/auth"

export async function GET(
    request: Request
) {
    return GetPausedSession();
}


async function GetPausedSession() {
    const session = await auth();

    if (session && session.user) {
        const id = session.user.id;

        const inprogressSession = await db.interviewSession.findFirst({
            where: {
                userId: id,
                status: "IN_PROGRESS",
                type: "BEHAVIORAL",
                pausedAt: {
                    not: null
                }
            },
            include: {
                responses: false,
            }
        });

        //No session found
        if (!inprogressSession) {
            return NextResponse.json(
                {
                    success: false,
                    canResume: false,
                    session: null
                }
            );
        }

        //Session already resumed before
        if (inprogressSession.resumedAt != null) {
            return NextResponse.json(
                {
                    success: true,
                    canResume: false,
                    session: inprogressSession
                }
            );
        }

        return NextResponse.json(
            {
                success: true,
                canResume: true,
                session: inprogressSession
            }
        );
    }

    return NextResponse.json(
        {
            success: false,
            canResume: false,
            session: null
        }
    );
}