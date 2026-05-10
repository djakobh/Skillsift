//Author: Brandon Christian
//Date: 12/12/2025

//Date: 1/31/2026
//send recorded audio for processing and receive

//Date 2/19/2026
//Move to main.tsx


"use client";
import { useState, useRef } from "react";
import styles from "./test.module.css";
import React from "react";
import { GetPrompt, CreateSession } from "./behavioralService";
import { BIStart } from "./start";
import { BIActive } from "./active";
import { BIEnd } from "./end";
import BehavioralTour from "~/components/tutorial-tour/BehavioralTour";

//-------------------------------------
//  Functionality
//-------------------------------------

export async function OnStartInterviewClicked(): Promise<any> {

    //Get Interview Prompt from server
    const prompt = await GetPrompt();

    if (!prompt.success) {
        console.log("Failed to get prompt.");

        throw new Error("Fetch Prompt Failed.")
    }

    console.log("prompt got. creating new session")

    //Create a new session on the server
    const newSession = await CreateSession(prompt.prompt);

    if (!newSession) {
        console.log("Failed to create new session!");

        throw new Error("Create Session Failed.");
    }

    console.log("New session created. ID: " + newSession.id);

    prompt.session = newSession;

    return prompt;
};

export function OnFailedStartInterview(error: any) {
    console.log(error);
}




export function OnFailedEndInterview() {
    console.log("Faled End Interview");
}

//-------------------------------------
//  View
//-------------------------------------


export function BehavioralInterview() {

   return (

        <main className={`${styles.centered_column} pt-12`}>
            <h1>Behavioral Interview Session</h1>
            <p className="description">
                Simulate an authentic interview experience.
                Your responses will be evaluated for clairty, tone, and professionalism.
            </p>
            <ViewSwitcher />
            <br />
            <BehavioralTour />
        </main>


    )
}


export enum BIPageState {
    START,
    ACTIVE,
    END
}

//returns a function that will resolve with a blob once the blob ref is no longer null
//This allows future components to call this function expecting to get a unique promise
function waitForData(dataRef: React.RefObject<Blob|null>, message: string): () => Promise<Blob> {

    return () => {
        return new Promise((resolve) => {
            if (dataRef.current) {
                resolve(dataRef.current);
                return;
            }

            const intervalDelay = 50;

            //wait for 50 ticks before checking again
            const interval = setInterval(() => {
                if (dataRef.current) {
                    clearInterval(interval);
                    resolve(dataRef.current);
                }
                else {
                    console.log(message);
                }
            }, intervalDelay);
        });
    }
}


function ViewSwitcher() {

    /*
        Switch between page states for Before, During, and After the interview.
        Also pass recorded data and the prompt between page states.
    */

    const [pageState, setPageState] = useState(BIPageState.START);

    //Data maintained between page states
    const [interviewPrompt, setInterviewPrompt] = useState("no prompt.");
    const [sessionId, setSessionId] = useState("");

    //ref to store actual data recorded
    const audioRef = useRef<Blob | null>(null);
    const storeVideoRef = useRef<Blob | null>(null);

    //use deferred promise so that BIEnd can wait until
    //the data is ready from BIActive before attempting to upload
    //returns a unique promise that holds until the data is null
    //then resolves to the data
    const waitForAudio = waitForData(audioRef, "Waiting for audio...");
    const waitForVideo = waitForData(storeVideoRef, "Waiting for video...");

    const [usePause, setPause] = useState(false);
    const [isResume, setResume] = useState(false);


    switch (pageState) {
        case BIPageState.START:
            return (<BIStart changeState={setPageState} changePrompt={setInterviewPrompt} audioRef={audioRef} setSessionId={setSessionId} storeVideoRef={storeVideoRef} setResume={setResume} />);

        case BIPageState.ACTIVE:
            return (<BIActive changeState={setPageState} prompt={interviewPrompt} audioRef={audioRef} storeVideoRef={storeVideoRef} sessionId={sessionId} setPause={setPause} resumedBefore={isResume} />);

        case BIPageState.END:
            console.log("Loading END with id: " + sessionId);
            return (<BIEnd changeState={setPageState} waitForAudio={waitForAudio} waitForVideo={waitForVideo} sessionId={sessionId} usePause={usePause} />);
    }
}



