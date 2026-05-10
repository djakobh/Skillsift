//Author: Brandon Christian
//Date: 1-30-2026
//Recieve post request from behavioralService.tsx (client) containing the recorded audio
//Date: 1-31-2026
//Send result to client 

import { NextRequest, NextResponse } from "next/server";
import { ProcessAudioToText, ProcessTextToTokens } from "./audioProcess";
import { db } from "~/server/db";
import { TestAnalyzeVolume } from "../analyze/analyze";

export async function POST(req: NextRequest) {

    //extract the audio from the formData sent
    const formData = await req.formData();
    const audio = formData.get("audio") as File;

    if (!audio || !(audio instanceof File)) {
        return NextResponse.json(
            { error: "No audio file received" },
            { status: 400 }
        );
    }


    //Process Audio
    let text = await ProcessAudioToText(audio);

    //gather all text transcripts of all StoredBehaioralSessions and combine with result text
    const sessionId = formData.get("sessionId") as string;

    const storedSessions = await db.storedBehavioralSession.findMany({
        where: {
            sessionId: sessionId,
        }
    });

    storedSessions.forEach(
        (storedSession) => {
            if (storedSession.transcript) {
                text = text + " " + storedSession.transcript;
            }
        }
    );

    const tokensByCount = ProcessTextToTokens(text);

    //TODO: replace with full analysis
    //for now, test volume, output to console
    const audioFeedbackItems = await TestAnalyzeVolume(audio, tokensByCount, text);


    //TODO: combine audioFeedbackItems with video feedbackItems
    

    //send to behavioralSerice.tsx
    return NextResponse.json(audioFeedbackItems);
}