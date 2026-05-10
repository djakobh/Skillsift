//Author: Brandon Christian
//Date: 12/12/2025
//Initial Creation

//Date: 1/29/2026
//Modified to record audio input
//Add functions StartRecording, StopRecording, SendAudioToServer, SetupAudioAsync
//Modify functions AudioMeter

//Date: 1/31/2026
//send audio back with useState

//Date: 2/24/2026
//Separate into userAudio.tsx

import { useState, useEffect } from "react";
import { StartStream, StartRecording, StopRecordingAudio } from "./userInput"


//Audio Meter component
export function AudioMeter({ recordAudio, audioRef }: {
    recordAudio: boolean,
    audioRef: React.RefObject<Blob | null>
}) {
    const [level, setLevel] = useState(0);
    const [error, setError] = useState<string | null>(null);

    //console.log("setup audio meter");

    useEffect(() => {
        console.log("call use effect");

        //Either the cleanup effect or undefined if it never finished
        let Cleanup: (() => void) | undefined;

        //Run SetupAudioAsync
        //Wrap in async so it can be run synchronously within useEffect
        (async () => {
            Cleanup = await SetupAudioAsync(
                setError,
                setLevel,
                recordAudio,
                audioRef
            );
        })();

        //Run cleanup
        return () => {
            if (Cleanup)
                Cleanup();
        };
    }, []); //array empty so it runs automatically on render
     
    if (error) return <p>{error}</p>

    return (
        <div className="w-48">
            <div className="h-3 bg-gray-300 rounded">
                <div
                    className="h-3 bg-green-500 rounded transition-all"
                    style={{ width: `${level}%` }}
                />
            </div>
            <p className="text-sm mt-1">Level: {level}%</p>
        </div>
    )
}

//Setup audio meter and audio recording
async function SetupAudioAsync(
    setError: React.Dispatch<React.SetStateAction<string | null>>,
    setLevel: React.Dispatch<React.SetStateAction<number>>,
    recordAudio: boolean,
    audioRef: React.RefObject<Blob | null>
)
{
    console.log("setup audio async");

    try {
        const stream: MediaStream = await StartStream(true, false); //create audio stream
        const StopMeter = await StartAudioMeter(stream, setLevel); //start meter and return cleanup func

        const cleanup = async () => {
            stream?.getTracks().forEach(track => track.stop());
            StopMeter();
        }

        //if not recordAudio, then only cleanup audio meter
        if (recordAudio)
        {
            console.log("Start audio recording")

            const options = { mimeType: 'audio/webm' };  //Ensure webm format of audio
            let mediaRecorder: MediaRecorder = new MediaRecorder(stream, options);
            let chunks: Blob[] = StartRecording(mediaRecorder);

            //return cleanup function that stops the audio and sends it to the server
            return async () => {
                
                console.log("About to stop recording");

                const data: Blob = await StopRecordingAudio(mediaRecorder, chunks);

                cleanup();

                //triggers await in BIEnd for audio data to end
                if (audioRef)
                    audioRef.current = data;
            }
        }
        else
        {
            console.log("Start meter without recording");

            return cleanup;
        }
            
    }
    catch (err)
    {
        setError("Microphone is unavailable or denied.");
        console.error(err);
    }
}

async function StartAudioMeter(
    stream: MediaStream,
    setLevel: React.Dispatch<React.SetStateAction<number>>
)
{
    //Update the audio meter visuals
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();

    analyser.fftSize = 256;

    source.connect(analyser);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    let animationId: number | null = null;

    const updateMeter = () => {
        analyser.getByteTimeDomainData(dataArray);

        // RMS (volume)
        let sumSquares = 0;
        for (let i = 0; i < dataArray.length; i++) {

            const val = dataArray?.[i] ?? 128;
            const v = (val - 128) / 128;
            sumSquares += v * v;
        }

        const rms = Math.sqrt(sumSquares / dataArray.length);
        setLevel(Math.min(100, Math.round(rms * 100)));

        animationId = requestAnimationFrame(updateMeter);
    }

    updateMeter();

    const stopMeter = () => {

        if (animationId !== null) {
            cancelAnimationFrame(animationId);
        }

        audioContext.close();
    }

    return stopMeter;
}


