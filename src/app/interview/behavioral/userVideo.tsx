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

    //render error message on camera fail
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {

        let Cleanup: (() => void) | undefined;

        //Setup video recording
        //And return cleanup function
        (async () => {
            Cleanup = await SetupVideoAsync(
                setError,
                recordVideo,
                activeVideoRef,
                storeVideoRef
            );
        })();

        //Run cleanup on component end
        return () => {
            if (Cleanup)
                Cleanup();
        };
    }, [])

    if (error) {
        return <p>{error}</p>
    }

    return (
        <video
            ref={activeVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full max-w-md rounded"
        />
    )
}

async function SetupVideoAsync(
    setError: React.Dispatch<React.SetStateAction<string | null>>,
    recordVideo: boolean,
    activeVideoRef: React.RefObject<HTMLVideoElement | null>,
    storeVideoRef: React.RefObject<Blob | null>
) {
    /*
    setError: set render error on camera fail
    recordVideo: whether to record video data or just display camera feed
    activeVideoRef: ref object for the video displayer component
    storeVideoRef: ref storing the result video data
    */

    let stream: MediaStream;

    try {
        stream = await StartStream(true, true); //record audio and video together

        if (activeVideoRef.current) {
            activeVideoRef.current.srcObject = stream;
        }
    } catch (err) {
        setError('Camera access denied or unavailable');
        console.error(err);
        return () => { }; //exit if failed, nothing to cleanup
    }

    const cleanup = async () => {
        // Stop camera when component unmounts
        stream?.getTracks().forEach(track => track.stop());
    }


    if (recordVideo) {
       
        //start actual recording of video with the current stream
        let mediaRecorder: MediaRecorder = new MediaRecorder(stream);
        let chunks: Blob[] = StartRecording(mediaRecorder);

        return async () => {
            //Additional cleanup code if recording

            const data: Blob = await StopRecordingVideo(mediaRecorder, chunks);

            cleanup();

            //triggers await in BIEnd for audio data to end
            if (storeVideoRef)
                storeVideoRef.current = data;
        }

    }
    else {

        return cleanup;
    }
}



