//Author: Brandon Christian
//Date: 1-30-2026-1/31/2026
//Handles API or DB requests between the user and the server
//and send result to client

//Date: 2/17/2026-2/19/2026
//GET prompt from DB
//Change api point "store" to "end"

//Date: 4/6/2026-4/14/2026
//Volume analysis
//esponse feedback reformat


import type { FeedbackItem } from "./feedbackItem";
import { CombineFeedback } from "./feedbackItem";
import { AnalysisResultToFBItems, CreateFeedbackItem } from "./feedbackItem";
import type { AnalysisResponse, VolumeAnalysisResponse, FillerAnalysisResponse, BasicAnalysisResponse } from "../../api/behavioral/analyze/analysisResponse";

//Wrapper function to simplify calls to behavioral service
export async function SendAudioVideoToServer(sessionId: string, audioData: Blob, videoData: Blob) {

    const audioAnalysisResponse = await SendToServer(sessionId, audioData, "/api/behavioral/uploadAudio", "audio");
    const videoAnalysisResponse = await SendToServer(sessionId, videoData, "/api/behavioral/uploadVideo", "video");

    const audioFeedback = await AudioAnalysisToFBItem(audioAnalysisResponse);
    const videoFeedback = await VideoAnalysisToFBItem(videoAnalysisResponse);
    const allFeedback = CombineFeedback(audioFeedback, videoFeedback);

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
    return allFeedback;
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

async function VideoAnalysisToFBItem(videoAnalysisResponse: Response) {
    const videoResponseData = await videoAnalysisResponse.json();
    const fbItems: FeedbackItem[] = AnalysisResultToFBItems(JSON.stringify(videoResponseData));

    return fbItems;
}

async function SendToServer(sessionId: string, data: Blob, apiURL: string, formDataKey: string) {
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

    //Convert json to FeedbackItem objects
    /*const responseData = await response.json();
    const fbItems: FeedbackItem[] = AnalysisResultToFBItems(JSON.stringify(responseData));

    console.log("convert to fbItems from  " + apiURL);

    //send to end.tsx
    return fbItems;*/
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