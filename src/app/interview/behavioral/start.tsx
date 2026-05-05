//Author: Brandon Christian
//Date: 12/12/2025

//Date: 1/31/2026
//send recorded audio for processing and receive

//Date: 2/19/2026
//Move to start.tsx

//Date: 3/17/2026
//implement resume feature

import styles from "./test.module.css";
import React from "react";
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
            //Try and Wait For Upload
            setLoading(true);
            const result = await OnStartInterviewClicked();

            //Set response as prompt
            //and set used session id
            changePrompt(result.prompt);
            setSessionId(result.session.id)

            //Change state if successful
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

            //Check guard to ensure useEffect only ever runs once
            if (hasRun.current) return;
            hasRun.current = true;

            console.log("start effect ran")

            async function CheckForResumeSession() {
                const findResp = await FindPausedSession();

                if (findResp.success) {

                    if (!findResp.canResume) {

                        //Abandon if previously resumed
                        AbandonSession(findResp.session.id);
                        setLoading(false);
                    }
                    else {
                        function ContinueToActivePage() {

                            //Set resume date
                            ResumeSession(findResp.session.id);

                            //tell other components we are resuming a session
                            setResume(true);

                            changePrompt(findResp.session.prompt);
                            setSessionId(findResp.session.id);
                            changeState(BIPageState.ACTIVE);
                        }

                        function AllowNewSession() {
                            AbandonSession(findResp.session.id);
                            setLoading(false);
                        }

                        //Wait for user input to confirm or deny this session
                        //load is set to true to prevent clicking new session during this time
                        PromptToResume(findResp.session, ContinueToActivePage, AllowNewSession);
                    }
                }
                else {
                    //no session to resume, allow new session
                    setLoading(false);
                }
            }

            CheckForResumeSession();
            

        }, []
    );

    return (
        <div className={`${styles.centered_column} w-full`}>
            <AudioMeterAndCameraBox recordAudio={false} audioRef={audioRef} recordVideo={false} storeVideoRef={storeVideoRef} />
            {!loading && (
                <button className="orange_button" onClick={StartInterviewButton}>Start Interview</button>
            )}

            {loading && (
                <div>loading...</div>
            ) }
            
        </div>
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