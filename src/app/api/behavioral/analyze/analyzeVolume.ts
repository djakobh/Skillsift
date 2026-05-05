// Author: Brandon Christian
// Date: 4/6/2026
//Check the volume of the audio blob over time

import decode from 'audio-decode';
import type { AnalysisItem } from "./analysisItem";
import { CreateAnalysisItemScore, CreateAnalysisItemContent } from "./analysisItem";
import type { VolumeAnalysisResponse } from "./analysisResponse";


//Decode the blob and extract the volume from each sample

//INPUT: audio blob in webm format (from userAudio.tsx)
//OUTPUT: array of volumes at each sample in the data

export async function GetVolume(blob: Blob) {

    //Array of amplitudes from -1 to 1 of the volume of each sample
    const decodedData = await DecodeAudio(blob);

    //extract the first channel
    //assume there is only one channel in the audio
    //const rawPCM = decodedData.getChannelData(0);
    const rawPCM = decodedData.channelData[0];

    //Map each sample's raw amplitude to its abs and store in an arrayBuffer
    if (rawPCM != undefined) {
        const volumes = rawPCM.map((sample: any) => Math.abs(sample));

        //average volumes for each second of audio
        const sampleRate = decodedData.sampleRate;
        const sampleLengthSeconds = 0.5;
        const averageVolumesPerSecond = AverageVolume(volumes, sampleRate, sampleLengthSeconds)

        //1. average volumes for each second of audio
        //2. locate sections of audio of being quiet or silent for more than 1s
        //3. provide analysis feedback based on frequency and proportion of silent sections over the whole audio

        return AnalyzeVolume(averageVolumesPerSecond, sampleLengthSeconds);
    }

    return AnalyzeVolume([0], 0.5);
}

//Convert blob into decoded audio data
//using audio-decode package
async function DecodeAudio(blob: Blob) {
    const arrayBuffer = await blob.arrayBuffer();
    const decodedData = await decode(arrayBuffer);
        
    return decodedData;
}

//find average volume of each second of audio data
function AverageVolume(volumes: Float32Array<ArrayBuffer>, sampleRate: number, sampleTime: number) {
    console.log("Volume length: " + volumes.length + " sample rate: " + sampleRate + " seconds: " + volumes.length / sampleRate);

    const averageVolumes = [];

    let total = 0;
    let cur = 0;

    volumes.forEach(
        (volume) => {
            total += volume;
            cur += 1;

            if (cur >= sampleRate * sampleTime) {
                const avg = total / cur;
                const trunc = Math.trunc(avg * 1000) / 1000
                averageVolumes.push(trunc);

                total = 0;
                cur = 0;
            }
        }
    );

    //one last average 
    if (cur != 0) {
        const avg = total / cur;
        const trunc = Math.trunc(avg * 1000) / 1000
        averageVolumes.push(trunc);
    }
    

    return averageVolumes;
}


//Analyze volume for periods of quiet

//INPUT: array of average volume of samples over certain
//intervals (currently 0.5s)

//OUTPUT: numerical score based on number of pauses from 1 to 5

enum FeedbackMessage {
    NoTalk = "You didn't talk at all during the session. Is your mic working?",
    LongPause = "Don't pause for too long inbetween sentences.",
    ShortTalk = "Try talking for longer during throughout the session.",
    LongPreTalk = "Make sure to start the session promptly after clicking start!",
    LongPostTalk = "Don't wait too long to end the interview after finishing."
}

async function AnalyzeVolume(averageVolumes: number[], sampleLengthSeconds: number) {

    const talkingVolumeThreshold = 0.001;

    //Sample is "quiet" or "talking" based on talkingVolumeThreshold
    //A random quiet or loud sample is not part of total samples
    //unless there are at least two of them in a row
    //There is also forgiveness for the start and end
    //of the session where a pause is allowed.

    let sampleSections: any[] = [];
    let currentSamples = 0;
    let inPause = true;

    averageVolumes.forEach(
        (volume) => {

            if (volume <= talkingVolumeThreshold) {

                //Add or switch if not in pause
                if (inPause) {
                    currentSamples++;
                }
                else {
                    sampleSections.push(currentSamples);
                    currentSamples = 0;
                    inPause = true;
                }

            }
            else {

                //switch if in pause or add
                if (inPause) {
                    sampleSections.push(currentSamples);
                    currentSamples = 0;
                    inPause = false;
                }
                else {
                    currentSamples++;
                }
            }
            
        }
    );


    let preTalkSamples = sampleSections[0];
    let pauseSamples = 0;
    let talkSamples = 0;
    let postTalkSamples = sampleSections[sampleSections.length - 1];

    //In case last section is talk and not pause
    if (sampleSections.length - 1 % 2 == 1) {
        postTalkSamples = 0;
    }


    //alternate between pause and talk
    //assume we start with talk at 1
    //we may not end with pause, account for that
    for (let i = 1; i < sampleSections.length; i++) {

        //talk samples are odd
        if (i % 2 == 1) {
            talkSamples += sampleSections[i];
        }
        //pause samples are even
        //dont parse the last sample if it is even
        else if (i != sampleSections.length - 1) {
            pauseSamples += sampleSections[i];
        }

    }

    //array to hold feedback items including score and notes
    const analysisItems: AnalysisItem[] = [];

    //Calculate score based on proportion of talk samples
    //to pause + talk sample count
    const totalValidSamples = averageVolumes.length - preTalkSamples - postTalkSamples;
    let score = 0;

    //In case there are 0 pause or talk samples, avoid dividing by zero
    if (totalValidSamples != 0) {
        score = talkSamples / totalValidSamples;
    }
    else {
        const item = CreateAnalysisItemContent("Notes", FeedbackMessage.NoTalk); 
        analysisItems.push(item);
    }

    console.log("pre: " + preTalkSamples + "pause: " + pauseSamples + "talk: " + talkSamples + "post: " + postTalkSamples + " score: " + score);

    //Max score if talking for at least 60% of valid samples
    const maxScoreThreshold = 0.60;
    let normalizedScore = score / maxScoreThreshold;

    //Apply penalty for any unsually large pause sections (excluding start and end)
    const maxPauseSectionSeconds = 5;
    const penaltyAmount = 0.1;

    for (let i = 1; i < sampleSections.length - 1; i++) {
        //even is pause section
        if (i % 2 == 0) {

            const pauseLength = sampleSections[i] * sampleLengthSeconds;

            if (pauseLength > maxPauseSectionSeconds) {

                const item = CreateAnalysisItemContent("Notes", FeedbackMessage.LongPause); 
                analysisItems.push(item);

                normalizedScore -= penaltyAmount;
                break;
            }
        }
    }


    //Apply penalty for unusually short total talking sections 
    const minTalkingTime = 20;
    const totalTalkingTime = talkSamples * sampleLengthSeconds;

    if (totalTalkingTime < minTalkingTime) {
        const item = CreateAnalysisItemContent("Notes", FeedbackMessage.ShortTalk); 
        analysisItems.push(item);

        normalizedScore -= penaltyAmount;
    }

    //keep in range 0 to 1 then mult by 5
    const normalizedScoreClamped = Math.max(0, Math.min(1, normalizedScore)) * 5;
    const volumeItem = CreateAnalysisItemScore("Volume", normalizedScoreClamped);
    analysisItems.push(volumeItem);

    //Add notes if pre or post talk is too long

    const maxPrePauseTime = 15;
    const preTalkTime = preTalkSamples * sampleLengthSeconds;

    if (preTalkTime > maxPrePauseTime) {
        const item = CreateAnalysisItemContent("Notes", FeedbackMessage.LongPreTalk);
        analysisItems.push(item);
    }

    const maxPostTalkTime = 10;
    const postTalkTime = postTalkSamples * sampleLengthSeconds;

    if (postTalkTime > maxPostTalkTime) {
        const item = CreateAnalysisItemContent("Notes", FeedbackMessage.LongPostTalk);
        analysisItems.push(item);
    }

    console.log("Final score: " + normalizedScoreClamped);

    const volumeAnalysisResponse: VolumeAnalysisResponse = {
        feedbackItems: analysisItems,
        volume: averageVolumes
    }

    return volumeAnalysisResponse;
}
