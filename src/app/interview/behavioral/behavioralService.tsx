//Author: Brandon Christian
//Date: 1-30-2026-1/31/2026
//Handles API or DB requests between the user and the server
//and send result to client

//Date: 2/17/2026-2/19/2026
//GET prompt from DB
//Change api point "store" to "end"

//Date: 4/6/2026-4/14/2026
//Volume analysis
//Response feedback reformat


import type { FeedbackItem } from "./feedbackItem";
import { CombineFeedback } from "./feedbackItem";
import { AnalysisResultToFBItems, CreateFeedbackItem } from "./feedbackItem";
import type { AnalysisResponse, VolumeAnalysisResponse, FillerAnalysisResponse, BasicAnalysisResponse } from "../../api/behavioral/analyze/analysisResponse";

type RawVideoAnalysis = {
    summary?: {
        video?: { sample_fps?: number; sampled_frames?: number };
        posture?: { valid_frames?: number; good_frames?: number; good_percent?: number };
        eye_contact?: { valid_frames?: number; good_frames?: number; good_percent?: number };
        facial_expression?: { valid_frames?: number; good_frames?: number; good_percent?: number };
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

//Wrapper function to simplify calls to behavioral service
export async function SendAudioVideoToServer(sessionId: string, audioData: Blob, videoData: Blob) {

    const audioAnalysisResponse = await SendBlobToServer(sessionId, audioData, "/api/behavioral/uploadAudio", "audio");
    const videoFeedback = await AnalyzeVideo(sessionId, videoData);

    const audioFeedback = await AudioAnalysisToFBItem(audioAnalysisResponse);
    const allFeedback = CombineFeedback(audioFeedback, videoFeedback.feedback);

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

    //return the data to the user
    return {
        allFeedback,
        rawVideoAnalysis: videoFeedback.rawAnalysis ?? null
    };
}

// Audio API returns { volumeAnalysis, fillerAnalysis, wordCountAnalysis } — parse each sub-array explicitly
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

    return CombineFeedback(CombineFeedback(volumeFBItems, fillerFBItems), wordCountFBItems);
}

// Step 1: Fetch Railway URL + secret from auth-gated Vercel endpoint (stays server-side)
// Step 2: POST video blob directly to Railway (bypasses Vercel payload limit)
// Step 3: POST raw JSON to thin Vercel route for DB averaging + transformation
async function AnalyzeVideo(sessionId: string, videoData: Blob) {
    const configResponse = await fetch("/api/behavioral/videoAnalysisConfig");
    if (!configResponse.ok) throw new Error("Could not fetch video analyzer config");
    const { url: analyzerUrl, secret } = await configResponse.json() as { url: string; secret: string };

    const videoForm = new FormData();
    videoForm.append("video", videoData);

    const headers: Record<string, string> = {};
    if (secret) headers["X-Analyzer-Secret"] = secret;

    const railwayResponse = await fetch(`${analyzerUrl}/analyze-video`, {
        method: "POST",
        body: videoForm,
        headers,
    });

    if (!railwayResponse.ok) {
        throw new Error(`Video analysis failed: ${railwayResponse.status}`);
    }

    const rawAnalysis = await railwayResponse.json();

    const processResponse = await fetch("/api/behavioral/processVideoFeedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawAnalysis, sessionId }),
    });

    if (!processResponse.ok) {
        throw new Error(`Video feedback processing failed: ${processResponse.status}`);
    }

    const processed = await processResponse.json();
    const fbItems: FeedbackItem[] = AnalysisResultToFBItems(JSON.stringify(processed.feedback));

    return {
        feedback: fbItems,
        rawAnalysis: processed.rawAnalysis as RawVideoAnalysis,
    };
}

async function SendBlobToServer(sessionId: string, data: Blob, apiURL: string, formDataKey: string) {
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
        //throw err;
    }

}

//Various functions related to handling a behavioral session on the DB including
//creating, modifying, and deleting by calling different API endpoints

export async function PauseSession(sessionId: string, audioData: Blob, videoData: any) {
    const formData = new FormData();

    formData.append(
        "audio",
        audioData
    );

    formData.append(
        "video",
        videoData
    );

    formData.append(
        "sessionId",
        sessionId
    );

    const response = await fetch("/api/behavioral/pause", {
        method: "POST",
        body: formData
    })

    return response.json();
}

export async function AbandonSession(sessionId: string) {
    const response = await fetch(`/api/behavioral/abandon/${sessionId}`, {
        method: "POST"
    });

    return response.json();
}

export async function CreateSession(prompt: string) {
    console.log("Creating session POST")

    const response = await fetch("/api/behavioral/create", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },

        body: JSON.stringify({ prompt }),
    });

    console.log("Created session POST")

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

    formData.append(
        "audio",
        blob
    );

    const response = await fetch(`/api/behavioral/analyze`, {
        method: "POST",
        body: formData
    });

    return response.json();
}
