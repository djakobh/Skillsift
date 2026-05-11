//Author: Brandon Christian
//Date: 2/24/2026
//user video recording components

import { useEffect, useRef } from "react";
import { useState } from "react";
import { StartStream, StartRecording, StopRecordingVideo } from "./userInput";


//Camera component
// recordVideo: whether to actual record video data or just display the camera feed
// storeVideoRef: ref to where the final video data is stored
export function CameraBox({ recordVideo, storeVideoRef }: {
    recordVideo: boolean,
    storeVideoRef: React.RefObject<Blob | null>;
}) {
    //ref for the video component to display the current video frame
    const activeVideoRef = useRef<HTMLVideoElement | null>(null);

    const [error, setError] = useState<string | null>(null);

    useEffect(() => {

        let Cleanup: (() => void) | undefined;

        (async () => {
            Cleanup = await SetupVideoAsync(
                setError,
                recordVideo,
                activeVideoRef,
                storeVideoRef
            );
        })();

        return () => {
            if (Cleanup)
                Cleanup();
        };
    }, [])

    if (error) {
        return (
            <div className="w-full rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
            </div>
        );
    }

    return (
        <video
            ref={activeVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full rounded-lg"
            style={{ backgroundColor: "#000" }}
        />
    )
}

async function SetupVideoAsync(
    setError: React.Dispatch<React.SetStateAction<string | null>>,
    recordVideo: boolean,
    activeVideoRef: React.RefObject<HTMLVideoElement | null>,
    storeVideoRef: React.RefObject<Blob | null>
) {

    let stream: MediaStream;

    try {
        stream = await StartStream(true, true);

        if (activeVideoRef.current) {
            activeVideoRef.current.srcObject = stream;
        }
    } catch (err) {
        setError('Camera access denied or unavailable.');
        console.error(err);
        return () => { };
    }

    const cleanup = async () => {
        stream?.getTracks().forEach(track => track.stop());
    }


    if (recordVideo) {

        let mediaRecorder: MediaRecorder = new MediaRecorder(stream);
        let chunks: Blob[] = StartRecording(mediaRecorder);

        return async () => {

            const data: Blob = await StopRecordingVideo(mediaRecorder, chunks);

            cleanup();

            if (storeVideoRef)
                storeVideoRef.current = data;
        }

    }
    else {

        return cleanup;
    }
}
