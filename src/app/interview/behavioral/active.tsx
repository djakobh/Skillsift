//Author: Brandon Christian
//Date: 12/12/2025

//Date: 1/31/2026
//send recorded audio for processing and receive

//Date: 2/19/2026
//Move to active.tsx


import { useEffect, useState } from "react";
import React from "react";
import { AudioMeterAndCameraBox } from "./userInput"
import { BIPageState, OnFailedEndInterview } from "./main";
import { AbandonSession, PauseSession } from "./behavioralService";



export function BIActive({ changeState, prompt, audioRef, storeVideoRef, sessionId, setPause, resumedBefore}: {
    changeState: React.Dispatch<React.SetStateAction<BIPageState>>;
    audioRef: React.RefObject<Blob | null>;
    storeVideoRef: React.RefObject<Blob | null>;
    prompt: string;
    sessionId: string;
    setPause: React.Dispatch<React.SetStateAction<boolean>>;
    resumedBefore: boolean
}) {
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        audioRef.current = null;
    }, []);

    const EndInterviewButton = async () => {
        try {
            setLoading(true);
            changeState(BIPageState.END);
        } catch (error) {
            console.log(error);
            OnFailedEndInterview();
            setLoading(false);
        }
    };

    const AbandonInterviewButton = async () => {
        try {
            setLoading(true);

            async function OnAbandonConfirm() {
                const resp = await AbandonSession(sessionId);
                window.location.href = "/";
            }

            function OnAbandonDeny() {
                setLoading(false);
            }

            const msg = "Abandoned sessions cannot be continued. Abandon?"

            Prompt(msg, OnAbandonConfirm, OnAbandonDeny);

        } catch (error) {
            console.log(error);
            OnFailedEndInterview();
            setLoading(false);
        }
    }

    const PauseInterviewButton = async () => {
        try {
            setLoading(true);

            function OnPauseConfirm() {
                setPause(true);
                changeState(BIPageState.END);
            }

            function OnPauseDeny() {
                setLoading(false);
            }

            const msg = "Session will be paused and exited to resume later. You can only pause once. Continue?";

            Prompt(msg, OnPauseConfirm, OnPauseDeny);

        } catch (error) {
            console.log(error);
            OnFailedEndInterview();
            setLoading(false);
        }
    }

    return (
        <main className="page-blob-bg h-screen flex flex-col overflow-hidden">
            <div className="flex flex-col flex-1 min-h-0 w-full max-w-6xl self-center px-3 pt-6 pb-3 gap-3">

                {/* Header bar */}
                <div className="page-animate bg-white border border-gray-200 rounded-xl shrink-0 shadow-sm" style={{ animationDelay: "0.05s" }}>
                    <div className="px-4 py-2.5 flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-800 m-0">Behavioral Interview</p>
                        {!loading ? (
                            <div className="flex items-center gap-2">
                                <button
                                    className="btn-outline btn-sm"
                                    style={{ color: "#ef4444", borderColor: "#fca5a5" }}
                                    onClick={AbandonInterviewButton}
                                >
                                    Abandon
                                </button>
                                <PauseButton onClick={PauseInterviewButton} resumedBefore={resumedBefore} />
                                <button className="btn-primary btn-sm" onClick={EndInterviewButton}>
                                    End Interview
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                <div className="w-4 h-4 border-2 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
                                Processing...
                            </div>
                        )}
                    </div>
                </div>

                {/* Prompt */}
                <div className="page-animate flex flex-col border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm shrink-0" style={{ animationDelay: "0.1s" }}>
                    <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
                        <p className="text-sm font-semibold text-gray-800 m-0">Interview Prompt</p>
                        <p className="text-xs text-gray-500 m-0 mt-0.5">Take your time to structure your response clearly.</p>
                    </div>
                    <div className="p-6 overflow-y-auto" style={{ maxHeight: "28vh" }}>
                        <p className="text-gray-700 leading-relaxed m-0 text-base">{prompt}</p>
                    </div>
                </div>

                {/* Camera + mic centered below */}
                <div className="page-animate flex flex-col items-center flex-1 min-h-0" style={{ animationDelay: "0.15s" }}>
                    <div className="flex flex-col border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm w-full max-w-lg">
                        <div className="bg-gray-50 border-b border-gray-200 px-4 py-2.5">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide m-0 text-center">Camera Preview</p>
                        </div>
                        <div className="p-4 flex flex-col items-center gap-3">
                            <AudioMeterAndCameraBox
                                recordAudio={true}
                                audioRef={audioRef}
                                recordVideo={true}
                                storeVideoRef={storeVideoRef}
                            />
                        </div>
                    </div>
                </div>

            </div>
        </main>
    );
}

function PauseButton({ onClick, resumedBefore }: {
    onClick: React.MouseEventHandler<HTMLButtonElement>;
    resumedBefore: boolean;
}) {
    if (!resumedBefore) {
        return (
            <button className="btn-ghost btn-sm" onClick={onClick}>
                Pause & Resume Later
            </button>
        );
    }
    return (
        <button
            className="btn-ghost btn-sm"
            disabled
            style={{ opacity: 0.4, cursor: "not-allowed" }}
        >
            Pause Used
        </button>
    );
}

function Prompt(text: string, onConfirm: () => void, onDeny: () => void) {

    const result = window.confirm(text);

    if (result) {
        onConfirm();
    } else {
        onDeny();
    }
}



