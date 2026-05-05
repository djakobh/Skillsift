//Author: Brandon Christian
//Date: 3/20/2026 separate into own file

//import { DownloadVideoData } from "../pause/manageVideoStorage"

import { NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";

export async function GetVideoFeedback(videos: Blob) {

    //TODO: send video to facial analyis service

    const test_items = [
        { category: "Eye Contact", score: 1 },
        { category: "Confidence", score: 2 },
        { category: "Quality of Answers", score: 3 },
        { category: "Sociability", score: 4 },
        { category: "Clear Speach", score: 5 },

    ];

    return test_items;
}

export async function UploadVideo(req: NextRequest) {
    //extract the audio from the formData sent
    const formData = await req.formData();
    const video = formData.get("video") as Blob;


    if (!video || !(video instanceof Blob)) {
        return NextResponse.json(
            { error: "No video file received" },
            { status: 400 }
        );
    }

    //Get analysis of video from service
    const feedback_items: any[] = await GetVideoFeedback(video);

    const sessionId: string = formData.get("sessionId") as string;
    const averaged_items: any[] = await AverageFeedbackItems(feedback_items, sessionId);

    //send to behavioralSerice.tsx
    return NextResponse.json(averaged_items);
}

async function AverageFeedbackItems(base_items: any[], sessionId: string) {
    //collect all feedback items arrays into one array
    const feedback_sets: any[] = [base_items];

    const storedSessions = await db.storedBehavioralSession.findMany({
        where: {
            sessionId: sessionId,
        }
    });

    storedSessions.forEach(
        (session) => {
            if (session.feedback)
                feedback_sets.push(session.feedback);
        }
    )

    //total all values and average them, then set each as the score for final_items;
    const totals: Record<string, number> = {};
    const counts: Record<string, number> = {};

    feedback_sets.forEach(
        //for every set of feedback
        (feedback_items) => {

            //for every item in that set
            feedback_items.forEach(
                (item: any) => {

                    if (item.category != null && item.score != null) {

                        const key = item.category;
                        const value = item.score;

                        //add to or create if it doesnt exist
                        totals[key] = (totals[key] || 0) + value;
                        counts[key] = (counts[key] || 0) + 1;

                    }

                }
            );

        }
    );


    //set the average values as the true scores of the final items
    //const final_items: any[] = base_items;

    base_items.forEach(
        (item: any) => {

            const key = item.category;

            if (totals[key] != null && counts[key] != null) {
                item.score = totals[key] / counts[key];
            }
        }
    )

    return base_items;
}

/*
async function DownloadAllVideos(baseVideo: Blob, sessionId: string) {

    const storedSessions = await db.storedBehavioralSession.findMany({
        where: {
            sessionId: sessionId,
        }
    });

    const videos: Blob[] = [baseVideo];

    storedSessions.forEach(
        async (session) => {
            if (session.videoURL) {
                //labled as videoURL but actually storage key
                const videoData: Blob | null = await DownloadVideoData(session.videoURL);

                if (videoData) {
                    videos.push(videoData);
                }
            }
        }
    )

    return videos;
}*/
