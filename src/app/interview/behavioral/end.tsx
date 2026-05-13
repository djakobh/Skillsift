//Author: Brandon Christian
//Date: 12/12/2025

//Date: 1/31/2026
//send recorded audio for processing and receive

//Date: 2/19/2025
//Move to end.tsx

import { useState, useEffect, useRef } from "react";
import React from "react";
import type { FeedbackItem } from "./feedbackItem";
import { BIPageState } from "./main";
import { SendAudioVideoToServer, EndSession, PauseSession } from "./behavioralService";
import { DisplayFeedbackItems } from "./feedbackDisplay";
import VideoPlayerWithOverlay from "~/components/VideoPlayerWithOverlay";


export function BIEnd({ changeState, waitForAudio, waitForVideo, sessionId, usePause }: {
    changeState: React.Dispatch<React.SetStateAction<BIPageState>>;
    usePause: boolean;
    waitForAudio: () => Promise<Blob>;
    waitForVideo: () => Promise<Blob>;
    sessionId: string;
}) {
    const test_items: FeedbackItem[] = [
        { key: "None", content: "Eye Contact", score: 1 }
    ];

    const [data, setFeedbackData] = useState(test_items);
    const [loading, setLoading] = useState(false);
    const [usePauseScreen, setUsePauseScreen] = useState(false);
    const [error, setError] = useState(false);
    const [video, setVideo] = useState<Blob | null>(null);
    const [audio, setAudio] = useState<Blob | null>(null);
    const [rawVideoAnalysis, setRawVideoAnalysis] = useState<any>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);

    const effectHasRun = useRef(false);

    useEffect(() => {
        return () => {
            if (videoUrl) URL.revokeObjectURL(videoUrl);
        };
    }, [videoUrl]);

    useEffect(() => {

        if (effectHasRun.current) return;

        effectHasRun.current = true;

        console.log("CALLING USE EFFECT FOR BI END");

        async function UploadAudio() {
            try {
                setLoading(true);

                console.log("Waiting for audioData to resolve.")

                const audioData = await waitForAudio();
                const videoData = await waitForVideo();

                console.log("Waiting for audioData to be analyzed with session ID: " + sessionId)

                if (usePause) {
                    const result = await PauseSession(sessionId, audioData, videoData);

                    if (!result.success)
                        setError(true);
                    else
                        setUsePauseScreen(true);

                }
                else {

                    const result = await SendAudioVideoToServer(sessionId, audioData, videoData);
                    await EndSession(sessionId);

                    console.log("Completed audio upload and session end.")

                    setFeedbackData(result.allFeedback);
                    setRawVideoAnalysis(result.rawVideoAnalysis);
                    setVideoUrl(URL.createObjectURL(videoData));
                    setVideo(videoData);
                    setAudio(audioData);
                }

                setLoading(false);

            } catch (err) {
                setLoading(false);
                setError(true);
                console.error(err);
            }
        }

        UploadAudio();
    },

    [])

    const RestartInterviewButton = async () => {
        changeState(BIPageState.START);
    };


    if (usePauseScreen) {
        return (
            <main className="page-blob-bg min-h-screen flex items-center justify-center px-6">
                <div className="page-animate border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm w-full max-w-md">
                    <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
                        <p className="text-sm font-semibold text-gray-800 m-0">Session Paused</p>
                    </div>
                    <div className="px-6 py-8 text-center">
                        <p className="text-gray-600 m-0">Your session has been paused. It is safe to leave this page and resume later.</p>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="page-blob-bg min-h-screen pt-12 pb-16">
            <div className="mx-auto max-w-3xl px-6 flex flex-col gap-6">

                {/* Page header */}
                <div className="page-animate text-center" style={{ animationDelay: "0.05s" }}>
                    <h1>Interview Complete</h1>
                    <p className="description">Review your recorded session and feedback below.</p>
                </div>

                {/* Video card */}
                <div className="page-animate border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm" style={{ animationDelay: "0.1s" }}>
                    <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
                        <p className="text-sm font-semibold text-gray-800 m-0">Recorded Session</p>
                        <p className="text-xs text-gray-500 m-0 mt-0.5">Playback your interview recording.</p>
                    </div>
                    <div className="p-6 flex justify-center">
                        <RecordedVideoBox video={video} audio={audio} />
                    </div>
                </div>

                {/* Loading */}
                {loading && (
                    <div className="page-animate border border-gray-200 rounded-xl bg-white shadow-sm px-6 py-10 flex flex-col items-center gap-3" style={{ animationDelay: "0.15s" }}>
                        <div className="w-6 h-6 border-2 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
                        <p className="text-sm text-gray-500 m-0">Analyzing your interview...</p>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="page-animate border border-red-200 rounded-xl bg-red-50 px-6 py-5" style={{ animationDelay: "0.15s" }}>
                        <p className="text-sm text-red-600 font-medium m-0">Failed to load feedback. Please try again.</p>
                    </div>
                )}

                {/* Feedback */}
                {!loading && !error && (
                    <div className="page-animate" style={{ animationDelay: "0.2s" }}>
                        <DisplayFeedbackItems items={data} />
                    </div>
                )}

                {/* Detailed Video Analysis */}
                {!loading && !error && videoUrl && rawVideoAnalysis?.segments && (
                    <div className="page-animate border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm" style={{ animationDelay: "0.25s" }}>
                        <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
                            <p className="text-sm font-semibold text-gray-800 m-0">Detailed Video Analysis</p>
                            <p className="text-xs text-gray-500 m-0 mt-0.5">Posture, eye contact, and facial expression over time.</p>
                        </div>
                        <div className="p-6">
                            <VideoPlayerWithOverlay
                                videoSrc={videoUrl}
                                segments={rawVideoAnalysis.segments}
                                title=""
                            />
                        </div>
                    </div>
                )}

                {/* Restart button */}
                {!loading && (
                    <div className="page-animate flex justify-center" style={{ animationDelay: "0.3s" }}>
                        <button className="btn-primary" onClick={RestartInterviewButton}>
                            Start New Interview
                        </button>
                    </div>
                )}

            </div>
        </main>
    );

}

function RecordedVideoBox({ video, audio }: { video: Blob | null, audio: Blob | null }) {

    if (!video) {
        return (
            <div className="flex items-center gap-2 text-sm text-gray-400 py-8">
                <div className="w-4 h-4 border-2 border-gray-200 border-t-gray-400 rounded-full animate-spin" />
                Loading video...
            </div>
        );
    }

    const videoURL = URL.createObjectURL(video);

    return (
        <video
            controls
            className="w-full max-w-lg rounded-lg"
            style={{ backgroundColor: "#000" }}
        >
            <source src={videoURL} type="video/mp4" />
            Your browser does not support the video tag.
        </video>
    );
}
