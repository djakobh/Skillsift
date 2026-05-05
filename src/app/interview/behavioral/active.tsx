//Author: Brandon Christian
//Date: 12/12/2025

//Date: 1/31/2026
//send recorded audio for processing and receive

//Date: 2/19/2026
//Move to active.tsx


import { useEffect, useState } from "react";
import styles from "./test.module.css";
import React from "react";
import type { ReactNode } from "react";
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

            //Change state if successful, send data as we enter the next page
            //The audio data is triggered by the re-render for the next page state
            //A useEffect cleanUp for the audio recording will set the audioData as the new
            //Page is rendered

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
                //Update interview to be abandoned status
                const resp = await AbandonSession(sessionId);

                //navigate to home page
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
                //rather than pause here, continue to the next screen to allow the
                //recording to end naturally
                //use marker value to indicate we want to pause the session not end it in the next screen
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

    const DisplayBox = ({ title, children }: { title: string; children: ReactNode }) => {

        return (
            <div className="outline-2 rounded w-full">
                <h2>{title}</h2>
                <hr />
                {children}
            </div>
        )
    };

    return (
        <div className={`${styles.centered_column} w-3/4`}>
            <AudioMeterAndCameraBox recordAudio={true} audioRef={audioRef} recordVideo={true} storeVideoRef={storeVideoRef} />
            <DisplayBox title="Interview Prompt">
                <p>
                    {prompt}
                </p>
            </DisplayBox>
            {!loading && (
                <div className={`${styles.centered_row}`}>
                    <button className="orange_button" onClick={EndInterviewButton}>End Interview</button> 
                    <PauseButton onClick={PauseInterviewButton} resumedBefore={resumedBefore} />
                    <button className="orange_button" onClick={AbandonInterviewButton}>Abandon</button>
                </div>
            )}
            {loading && (
                <div>
                    loading...
                </div>
            ) }
           
            
        </div>
    );
}

function PauseButton({ onClick, resumedBefore }: {
    onClick: React.MouseEventHandler<HTMLButtonElement>
    resumedBefore: boolean
}) {

    if (!resumedBefore) {
        return (<button className="orange_button" onClick={onClick}>Pause and Resume Later</button>);
    }
    else {
        return (<button className="orange_button" >Pause Used</button>);
    }

}

function Prompt(text: string, onConfirm: () => void, onDeny: () => void) {

    const result = window.confirm(text);

    if (result) {
        onConfirm();
    } else {
        onDeny();
    }
}




