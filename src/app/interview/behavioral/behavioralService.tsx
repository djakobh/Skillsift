//Author: Brandon Christian
//Date: 1-30-2026
//Handle API or DB requests between the user and the server

//Date: 1-31-2026
//Send result to client

//Date: 2/17/2026
//GET prompt from DB

//Date: 2/19/2026
//Change api point "store" to "end"

//Alexander Tu
//Date: 04/25/26
//updated to handle object shape uploadVideo.ts

import type { FeedbackItem } from "./feedbackItem";
import { CombineFeedback } from "./feedbackItem";
import { AnalysisResultToFBItems } from "./feedbackItem";
import type {
    AnalysisResponse,
    VolumeAnalysisResponse,
    FillerAnalysisResponse,
    BasicAnalysisResponse
} from "../../api/behavioral/analyze/analysisResponse";

type RawVideoAnalysis = {
    summary?: {
        video?: {
            sample_fps?: number;
            sampled_frames?: number;
        };
        posture?: {
            valid_frames?: number;
            good_frames?: number;
            good_percent?: number;
        };
        eye_contact?: {
            valid_frames?: number;
            good_frames?: number;
            good_percent?: number;
        };
        facial_expression?: {
            valid_frames?: number;
            good_frames?: number;
            good_percent?: number;
        };
    };
    segments?: Array<{
        id?: string;
        category: string;
        startSec: number;
        endSec: number;
        isGood: boolean;
        scoreAvg?: number | null;
        note?: string | null;
        createdAt?: string;
    }>;
    error?: string;
};

type UploadResult = {
    feedback: FeedbackItem[];
    rawAnalysis?: RawVideoAnalysis;
};

//Wrapper function to simplify calls to behavioral service
export async function SendAudioVideoToServer(sessionId: string, audioData: Blob, videoData: Blob) {

    const audioAnalysisResponse = await SendToServer(sessionId, audioData, "/api/behavioral/uploadAudio", "audio");
    const videoAnalysisResponse = await SendToServer(sessionId, videoData, "/api/behavioral/uploadVideo", "video");

    const audioFeedback = await AudioAnalysisToFBItem(audioAnalysisResponse);
    const videoResult = await VideoAnalysisToFBItem(videoAnalysisResponse);

    const allFeedback = CombineFeedback(audioFeedback, videoResult.feedback);

    const formData = new FormData();

    formData.append(
        "feedback",
        JSON.stringify(allFeedback)
    );

    //save the feedback items in the DB
    await fetch(`/api/behavioral/setFeedback/${sessionId}`, {
        method: "POST",
        body: formData
    });

    return {
        allFeedback,
        rawVideoAnalysis: videoResult.rawAnalysis ?? null
    };
}

async function AudioAnalysisToFBItem(audioAnalysisResponse: Response) {
    const audioAnalysisData: AnalysisResponse = await audioAnalysisResponse.json();

    const volumeData: VolumeAnalysisResponse = audioAnalysisData.volumeAnalysis;
    const fillerData: FillerAnalysisResponse = audioAnalysisData.fillerAnalysis;
    const wordcountData: BasicAnalysisResponse = audioAnalysisData.wordCountAnalysis;

    const volumeFBItems: FeedbackItem[] = AnalysisResultToFBItems(
        JSON.stringify(volumeData.feedbackItems)
    );

    const fillerFBItems: FeedbackItem[] = AnalysisResultToFBItems(
        JSON.stringify(fillerData.feedbackItems)
    );

    const wordCountFBItems: FeedbackItem[] = AnalysisResultToFBItems(
        JSON.stringify(wordcountData.feedbackItems)
    );

    const ab = CombineFeedback(volumeFBItems, fillerFBItems);
    const bc = CombineFeedback(ab, wordCountFBItems);

    return bc;
}

async function VideoAnalysisToFBItem(videoAnalysisResponse: Response): Promise<UploadResult> {
    const videoResponseData = await videoAnalysisResponse.json();

    // NEW format (with rawAnalysis)
    if (videoResponseData.feedback) {
        const fbItems: FeedbackItem[] = AnalysisResultToFBItems(
            JSON.stringify(videoResponseData.feedback)
        );

        return {
            feedback: fbItems,
            rawAnalysis: videoResponseData.rawAnalysis
        };
    }

    // OLD fallback format
    const fbItems: FeedbackItem[] = AnalysisResultToFBItems(
        JSON.stringify(videoResponseData)
    );

    return {
        feedback: fbItems
    };
}

async function SendToServer(sessionId: string, data: Blob, apiURL: string, formDataKey: string): Promise<Response> {
    //Attach data to form data
    //in order to send it to the api
    console.log("Send blob to " + apiURL);

    const formData = new FormData();

    formData.append(
        formDataKey,
        data
    );

    formData.append(
        "sessionId",
        sessionId
    );

    //obtain json analysis of the feedback data
    const response = await fetch(apiURL, {
        method: "POST",
        body: formData
    });

    console.log("got response from " + apiURL);

    return response;
}


//Get prompt from database
export async function GetPrompt() {
    try {
        console.log("getting prompt");

        const response = await fetch("/api/behavioral/prompt", {
            method: "GET"
        });

        console.log("got prompt");

        const json = response.json();

        console.log(json);

        return json;
    } catch (err) {
        return ({
            success: true,
            prompt: "TODO: fill DB with prompts."
        });
    }
}

//Various functions related to handling a behavioral session on the DB including
//creating, modifying, and deleting by calling different API endpoints

export async function PauseSession(sessionId: string, audioData: Blob, videoData: any) {
    const formData = new FormData();

    formData.append("audio", audioData);
    formData.append("video", videoData);
    formData.append("sessionId", sessionId);

    const response = await fetch("/api/behavioral/pause", {
        method: "POST",
        body: formData
    });

    return response.json();
}

export async function AbandonSession(sessionId: string) {
    const response = await fetch(`/api/behavioral/abandon/${sessionId}`, {
        method: "POST"
    });

    return response.json();
}

export async function CreateSession(prompt: string) {
    console.log("Creating session POST");

    const response = await fetch("/api/behavioral/create", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
    });

    console.log("Created session POST");

    return response.json();
}

export async function EndSession(sessionId: string) {
    const response = await fetch(`/api/behavioral/end/${sessionId}`, {
        method: "POST"
    });

    return response.json();
}

export async function FindPausedSession() {
    const response = await fetch(`/api/behavioral/resume`, {
        method: "GET"
    });

    return response.json();
}

export async function ResumeSession(sessionId: string) {
    const response = await fetch(`/api/behavioral/resume/${sessionId}`, {
        method: "POST"
    });

    return response.json();
}

export async function AnalyzeAudio(blob: Blob) {
    const formData = new FormData();

    formData.append("audio", blob);

    const response = await fetch(`/api/behavioral/analyze`, {
        method: "POST",
        body: formData
    });

    return response.json();
}