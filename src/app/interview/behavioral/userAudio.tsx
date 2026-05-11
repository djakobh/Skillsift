//Author: Brandon Christian
//Date: 12/12/2025
//Initial Creation

//Date: 1/29/2026
//Modified to record audio input

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

    useEffect(() => {
        console.log("call use effect");

        let Cleanup: (() => void) | undefined;

        (async () => {
            Cleanup = await SetupAudioAsync(
                setError,
                setLevel,
                recordAudio,
                audioRef
            );
        })();

        return () => {
            if (Cleanup)
                Cleanup();
        };
    }, []);

    if (error) {
        return (
            <div className="w-full max-w-xs rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                {error}
            </div>
        );
    }

    const barColor = level > 70 ? "#ef4444" : level > 30 ? "#FF6900" : "#22c55e";

    return (
        <div className="w-full max-w-xs">
            <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Mic Level</span>
                <span className="text-xs text-gray-400">{level}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                    className="h-2 rounded-full transition-all duration-75"
                    style={{ width: `${level}%`, backgroundColor: barColor }}
                />
            </div>
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
        const stream: MediaStream = await StartStream(true, false);
        const StopMeter = await StartAudioMeter(stream, setLevel);

        const cleanup = async () => {
            stream?.getTracks().forEach(track => track.stop());
            StopMeter();
        }

        if (recordAudio)
        {
            console.log("Start audio recording")

            const options = { mimeType: 'audio/webm' };
            let mediaRecorder: MediaRecorder = new MediaRecorder(stream, options);
            let chunks: Blob[] = StartRecording(mediaRecorder);

            return async () => {

                console.log("About to stop recording");

                const data: Blob = await StopRecordingAudio(mediaRecorder, chunks);

                cleanup();

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
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();

    analyser.fftSize = 256;

    source.connect(analyser);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    let animationId: number | null = null;

    const updateMeter = () => {
        analyser.getByteTimeDomainData(dataArray);

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
