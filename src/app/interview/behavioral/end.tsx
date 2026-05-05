//Author: Brandon Christian
//Date: 12/12/2025

//Date: 1/31/2026
//send recorded audio for processing and receive

//Date: 2/19/2025
//Move to end.tsx

import { useState, useEffect, useRef } from "react";
import styles from "./test.module.css";
import React from "react";
import type { ReactNode } from "react";
import type { FeedbackItem } from "./feedbackItem";
import { BIPageState } from "./main";
import { SendAudioVideoToServer, EndSession, PauseSession } from "./behavioralService";
import { DisplayFeedbackItems } from "./feedbackDisplay";


export function BIEnd({ changeState, waitForAudio, waitForVideo, sessionId, usePause }: {
    changeState: React.Dispatch<React.SetStateAction<BIPageState>>;
    usePause: boolean;
    waitForAudio: () => Promise<Blob>;
    waitForVideo: () => Promise<Blob>;
    sessionId: string;
}) {
    //Helps set useState typing
    const test_items : FeedbackItem[] = [
        { key: "None", content: "Eye Contact", score: 1 }
    ];

    //Modified for UC 1 to include loading and error states
    const [data, setFeedbackData] = useState(test_items);
    const [loading, setLoading] = useState(false);
    const [usePauseScreen, setUsePauseScreen] = useState(false);
    const [error, setError] = useState(false);
    const [video, setVideo] = useState<Blob | null>(null);
    const [audio, setAudio] = useState<Blob | null>(null);

    const effectHasRun = useRef(false);

    useEffect(() => { //Call once on page state load

        //Prevent multiple runs during dev mode
        if (effectHasRun.current) return;

        effectHasRun.current = true;

        console.log("CALLING USE EFFECT FOR BI END");

        async function UploadAudio() {
            try {
                setLoading(true);

                //Try and Wait For Upload
                //Send the audio data previously set by the useEffect cleanup in
                //The Active page state to the server to be transcribed.
                console.log("Waiting for audioData to resolve.")

                const audioData = await waitForAudio(); //await for the audio data to be sent by BIActive
                const videoData = await waitForVideo(); //await for the audio data to be sent by BIActive

                console.log("Waiting for audioData to be analyzed with session ID: " + sessionId)

                if (usePause) {
                    //Pause session instead of ending it
                    const result = await PauseSession(sessionId, audioData, videoData);

                    if (!result.success)
                        setError(true);
                    else
                        setUsePauseScreen(true);

                }
                else {

                    const result = await SendAudioVideoToServer(sessionId, audioData, videoData); //await for the audio data to be uploaded
                    await EndSession(sessionId);   //update session with completed state

                    console.log("Completed audio upload and session end.")

                    //store data in useState
                    setFeedbackData(result);
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
            <div>
                Session successfully paused. It is now safe to leave this screen.
            </div>
        );
    }

    return (
        <div className={`${styles.centered_column} w-full`}>

            <RecordedVideoBox video={video} audio={audio} />

            {loading && (
                <div>
                Loading feedback...
                </div>
            )}

            {!loading && !error && (
                <div className={`${styles.centered_column} w-full`}>
                    <button className="orange_button" onClick={RestartInterviewButton}>Restart Interview</button>
                    {/* <DataDisplay data={data} /> */}
                    <DisplayFeedbackItems items={data}/>
                </div>
            )}

            {error  && (
                <div>
                    Failed to load feedback!
                </div>
            )}

            
        </div>
    );

}

function RecordedVideoBox({ video, audio }: { video: Blob | null , audio: Blob | null}) {

    let hasVideo = false;
    let videoURL: string = "";

    if (video) {
        videoURL = URL.createObjectURL(video);
        hasVideo = true;
    }


    return (
        <div className={`${styles.centered_column} outline-2 rounded w-3/4 p-2`}>
            {hasVideo && (
                <VideoPlayer src={videoURL} />
            )}
            {!hasVideo && (
                <div>
                    Loading Video...
                </div>
            )}
            
        </div>  
    );
}

interface VideoPlayerProps {
    src?: string;
    width?: number;
    height?: number;
    controls?: boolean;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
    src,
    width = 640,
    height = 360,
    controls = true,
}) => {
    return (
        <video
            width={width}
            height={height}
            controls={controls}
            style={{
                backgroundColor: "#000", // shows black box if no video
                display: "block",
            }}
        >
            {src ? <source src={src} type="video/mp4" /> : null}
            Your browser does not support the video tag.
        </video>
    );
};



