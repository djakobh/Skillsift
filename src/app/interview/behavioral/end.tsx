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
import VideoPlayerWithOverlay from "../../../components/VideoPlayerWithOverlay";
import { DisplayFeedbackItems } from "./feedbackDisplay";


export function BIEnd({ changeState, waitForAudio, waitForVideo, sessionId, usePause }: {
    changeState: React.Dispatch<React.SetStateAction<BIPageState>>;
    usePause: boolean;
    waitForAudio: () => Promise<Blob>;
    waitForVideo: () => Promise<Blob>;
    sessionId: string;
}) {
    //Helps set useState typing
    const test_items: FeedbackItem[] = [
        { key: FeedbackCategory.NONE, content: "Eye Contact", score: 1 }
    ];

    //Modified for UC 1 to include loading and error states
    const hasUploadedRef = useRef(false);
    const [data, setFeedbackData] = useState<FeedbackItem[]>(test_items);
    const [loading, setLoading] = useState(false);
    const [usePauseScreen, setUsePauseScreen] = useState(false);
    const [error, setError] = useState(false);
    const [video, setVideo] = useState<Blob | null>(null);
    const [audio, setAudio] = useState<Blob | null>(null);
    const [rawVideoAnalysis, setRawVideoAnalysis] = useState<any>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);

    useEffect(() => {
        return () => {
            if (videoUrl) {
                URL.revokeObjectURL(videoUrl);
            }
        };
    }, [videoUrl]);

    const effectHasRun = useRef(false);

    useEffect(() => { //Call once on page state load

        if (hasUploadedRef.current) {
            return;
        }

        hasUploadedRef.current = true;

        console.log("CALLING USE EFFECT FOR BI END");

        async function UploadAudio() {
            try {
                setLoading(true);

                //Try and Wait For Upload
                //Send the audio data previously set by the useEffect cleanup in
                //The Active page state to the server to be transcribed.
                console.log("Waiting for audioData to resolve.");

                const audioData = await waitForAudio(); //await for the audio data to be sent by BIActive
                const videoData = await waitForVideo(); //await for the video data to be sent by BIActive

                console.log("Waiting for audioData to be analyzed with session ID: " + sessionId);
                console.log("VIDEO SIZE:", videoData.size);
                console.log("VIDEO TYPE:", videoData.type);

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

                    console.log("Completed audio upload and session end.");
                    console.log("RAW ANALYSIS:", result.rawVideoAnalysis);

                    //store data in useState
                    setFeedbackData(result.allFeedback);
                    setRawVideoAnalysis(result.rawVideoAnalysis);
                    setVideo(videoData);
                    setAudio(audioData);
                    setVideoUrl(URL.createObjectURL(videoData));
                }

                setLoading(false);

            } catch (err) {
                setLoading(false);
                setError(true);
                console.error(err);
            }
        }

        UploadAudio();
    }, [sessionId, usePause, waitForAudio, waitForVideo]);

    const RestartInterviewButton = async () => {
        changeState(BIPageState.START);
    };

    const DataDisplay = ({ data }: { data: FeedbackItem[] }) => {

        const notes = data.filter(item => item.key === FeedbackCategory.NOTES);
        const otherData = data.filter(item => item.key !== FeedbackCategory.NOTES);

        const DisplayBox = ({ title, children }: { title: string; children: ReactNode }) => {

            return (
                <div className="outline-2 rounded w-full">
                    <h2>{title}</h2>
                    <hr/>
                    {children}
                </div>
            )
        };

        const FeedbackList = ({ data }: { data: FeedbackItem[] }) => {

            const splitFeedback = (data: FeedbackItem[]) => {
                const middle = Math.ceil(data.length / 2); // rounds up if odd
                const firstHalf = data.slice(0, middle);
                const secondHalf = data.slice(middle);

                return [firstHalf, secondHalf];
            };

            const [firstHalf, secondHalf] = splitFeedback(data);

            return (
                <div className="flex flex-row gap-4 p-2">
                    <div className="flex flex-col">
                        {firstHalf?.map(

                            (item, i) => (
                                <div key={`${i}`} className="p-1">
                                    <h3>{item.key}</h3>
                                    <span>{item.score.toString()}</span>
                                </div>
                            )
                        )}
                    </div>
                    <div className="flex flex-col">
                        {secondHalf?.map(

                            (item, i) => (
                                <div key={`${i}`} className="p-1">
                                    <h3>{item.key}</h3>
                                    <span>{item.score.toString()}</span>
                                </div>
                            )
                        )}
                    </div>                </div>
            );

        };

        return (
            <div className="w-3/4 flex flex-row gap-4">
                <DisplayBox title="Notes">
                    {notes[0]?.content}
                </DisplayBox>

                <DisplayBox title="Statistics">
                    <FeedbackList data={otherData}/>

                    {videoUrl && rawVideoAnalysis?.segments && (
                        <div className="mt-6">
                            <VideoPlayerWithOverlay
                                videoSrc={videoUrl}
                                segments={rawVideoAnalysis.segments}
                                title="Detailed Video Analysis"
                            />
                        </div>
                    )}
                </DisplayBox>
            </div>
        );
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

            <RecordedVideoBox videoUrl={videoUrl} audio={audio} />

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

function RecordedVideoBox({ videoUrl, audio }: { videoUrl: string | null , audio: Blob | null}) {

    const hasVideo = !!videoUrl;

    return (
        <div className={`${styles.centered_column} outline-2 rounded w-3/4 p-2`}>
            {hasVideo && (
                <VideoPlayer src={videoUrl ?? undefined} />
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
            src={src}
            width={width}
            height={height}
            controls={controls}
            style={{
                backgroundColor: "#000", // shows black box if no video
                display: "block",
            }}
        >
            Your browser does not support the video tag.
        </video>
    );
};