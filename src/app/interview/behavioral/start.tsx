//Author: Brandon Christian
//Date: 12/12/2025

//Date: 1/31/2026
//send recorded audio for processing and receive

//Date: 2/19/2026
//Move to start.tsx

//Date: 3/17/2026
//implement resume feature

import React from "react";
import { Video } from "lucide-react";
import { AudioMeterAndCameraBox } from "./userInput";
import { BIPageState, OnStartInterviewClicked, OnFailedStartInterview } from "./main";
import { useState, useEffect, useRef } from "react";
import { AbandonSession, ResumeSession, FindPausedSession } from "./behavioralService";



export function BIStart({ changeState, changePrompt, audioRef, setSessionId, storeVideoRef, setResume }: {
    changeState: React.Dispatch<React.SetStateAction<BIPageState>>;
    changePrompt: React.Dispatch<React.SetStateAction<string>>;
    audioRef: React.RefObject<Blob | null>; //Unused but necessary for the component format
    storeVideoRef: React.RefObject<Blob | null>; //Unused but necessary for the component format
    setSessionId: React.Dispatch<React.SetStateAction<string>>;
    setResume: React.Dispatch<React.SetStateAction<boolean>>;
}) {

    const StartInterviewButton = async () => {
        try {
            setLoading(true);
            const result = await OnStartInterviewClicked();

            changePrompt(result.prompt);
            setSessionId(result.session.id)

            changeState(BIPageState.ACTIVE);
        } catch (error) {

            OnFailedStartInterview(error);
            setLoading(false);

        }
    };

    const [loading, setLoading] = useState(true);
    const hasRun = useRef(false);

    //Check for existing in progress session before allowing new one to be created
    useEffect(
        () => {

            if (hasRun.current) return;
            hasRun.current = true;

            console.log("start effect ran")

            async function CheckForResumeSession() {
                const findResp = await FindPausedSession();

                if (findResp.success) {

                    if (!findResp.canResume) {

                        AbandonSession(findResp.session.id);
                        setLoading(false);
                    }
                    else {
                        function ContinueToActivePage() {

                            ResumeSession(findResp.session.id);

                            setResume(true);

                            changePrompt(findResp.session.prompt);
                            setSessionId(findResp.session.id);
                            changeState(BIPageState.ACTIVE);
                        }

                        function AllowNewSession() {
                            AbandonSession(findResp.session.id);
                            setLoading(false);
                        }

                        PromptToResume(findResp.session, ContinueToActivePage, AllowNewSession);
                    }
                }
                else {
                    setLoading(false);
                }
            }

            CheckForResumeSession();

        }, []
    );

    return (
        <main className="page-blob-bg min-h-screen pt-12 pb-16">
            <div className="mx-auto max-w-2xl px-6 flex flex-col gap-6">

                {/* Page header */}
                <div className="page-animate text-center" style={{ animationDelay: "0.05s" }}>
                    <h1>Behavioral Interview</h1>
                    <p className="description">
                        Simulate an authentic interview experience. Your responses will be evaluated for clarity, tone, and professionalism.
                    </p>
                </div>

                {/* Camera & mic check card */}
                <div className="page-animate border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm" style={{ animationDelay: "0.15s" }}>
                    <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex items-center gap-3">
                        <Video className="h-4 w-4 text-gray-400" />
                        <div>
                            <p className="text-sm font-semibold text-gray-800 m-0">Camera & Microphone Check</p>
                            <p className="text-xs text-gray-500 m-0 mt-0.5">Make sure your camera and microphone are working before you begin.</p>
                        </div>
                    </div>
                    <div className="p-6 flex flex-col items-center gap-5">
                        <AudioMeterAndCameraBox
                            recordAudio={false}
                            audioRef={audioRef}
                            recordVideo={false}
                            storeVideoRef={storeVideoRef}
                        />

                        {loading ? (
                            <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                                <div className="w-4 h-4 border-2 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
                                Checking for existing sessions...
                            </div>
                        ) : (
                            <button className="btn-primary" onClick={StartInterviewButton}>
                                Start Interview
                            </button>
                        )}
                    </div>
                </div>

            </div>
        </main>
    );
}

function PromptToResume(session: any, onConfirm: () => void, onDeny: () => void) {
    const formattedDate = new Date(session.pausedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    const result = window.confirm("There is an in progress session started on " + formattedDate + ". Resume?");

    if (result) {
        onConfirm();
    } else {
        onDeny();
    }
}
