//Author: Brandon Christian
//Date: 2/24/2026
//Base file for general input functions and 
//Component merging audio/video components

import styles from "./test.module.css";
import { AudioMeter } from "./userAudio";
import { CameraBox } from "./userVideo";

export async function StartStream(useAudio: boolean, useVideo: boolean) {

    //obtain the user's camera and audio feed
    let stream = await navigator.mediaDevices.getUserMedia({
        audio: useAudio,
        video: useVideo,
    });

    return stream
}

//Camera and Audio Meter display
export function AudioMeterAndCameraBox({ recordAudio, audioRef, recordVideo, storeVideoRef }: {
    recordAudio: boolean;
    audioRef: React.RefObject<Blob | null>;
    recordVideo: boolean;
    storeVideoRef: React.RefObject<Blob | null>;
}) {

    return (
        <div className={`${styles.centered_column} outline-2 rounded w-3/4 p-2`}>
            <CameraBox recordVideo={recordVideo} storeVideoRef={storeVideoRef}/>
            <AudioMeter recordAudio={recordAudio} audioRef={audioRef} />
        </div>

    )
}

export function StartRecording(mediaRecorder: MediaRecorder) {
    let chunks: Blob[] = []

    //Use media recorder to push the data as its recorded into "chunks"
    //which is actiely updated
    mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
            chunks.push(event.data);
        }
    };

    mediaRecorder.start();

    return chunks;
}

//Wrapper functions to remove the need to understand the "isAudio" parameter
export async function StopRecordingVideo(mediaRecorder: MediaRecorder, chunks: Blob[]) {
    return StopRecording(mediaRecorder, chunks, false);
}

export async function StopRecordingAudio(mediaRecorder: MediaRecorder, chunks: Blob[]) {
    return StopRecording(mediaRecorder, chunks, true);
}

async function StopRecording(mediaRecorder: MediaRecorder, chunks: Blob[], isAudio: boolean) {
    //On cleanup, return the final audio/video blob and stop the recording

    const blobType = isAudio ? 'audio/webm' : 'video/webm';

    return new Promise<Blob>(resolve => {
        mediaRecorder.onstop = () => {
            const dataBlob: Blob = new Blob(chunks, { type: blobType });

            console.log("Final video blob size:", dataBlob.size);

            resolve(dataBlob);

        };

        mediaRecorder.stop();
    });
}



