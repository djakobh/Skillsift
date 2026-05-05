//Author: Brandon Christian
//Date: 3/18/2026
//Save new entry including audio and video data
//and associate it with specific sessionId
//pause a behavioral session

//packages for video download/upload:
//npm install @aws-sdk/s3-request-presigner
//npm install @aws-sdk/client-s3

import { NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";
import { ProcessAudioToText } from "../uploadAudio/audioProcess"
import { GetVideoFeedback } from "../uploadVideo/uploadVideo";


export async function PauseSession(
    req: NextRequest, userId: string
) { 

    //extract the audio video and session id from the formData sent
    const formData = await req.formData();
    const sessionId = formData.get("sessionId") as string;

    console.log("pausing session id: " + sessionId)

    //Update the first session whose ID matches the one we
    //created at session start for this user
    const interviewSession = await db.interviewSession.update({
        where: {
            userId: userId,
            id: sessionId,
        },
        data: {
            pausedAt: new Date()
        }
    });

    if (interviewSession) {

        const audio = formData.get("audio") as Blob;
        const video = formData.get("video") as Blob;

        //convert audio to text to save it in more compact form
        const textTranscript = await ProcessAudioToText(audio);

        //store the video itself on an aws server for later
        //const videoURL = await StoreVideoData(video, session.user.id, sessionId);
        const videoFeedback = await GetVideoFeedback(video);

        //store the transcript and partial feedback on the DB
        const savedData = await db.storedBehavioralSession.create({
            data: {
                transcript: textTranscript,
                feedback: videoFeedback,
                //videoURL: videoURL,
                session: {
                    connect: {
                        id: sessionId,
                    },
                }
            }
        });

        //Return if successful
        if (savedData) {

            return NextResponse.json(
                {
                    success: true
                }
            );
        }
    }

}






