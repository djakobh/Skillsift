// Install the axios package by executing the command "npm install axios"
//Author: Brandon Christian
//Date: 1-30-2026
//Refactored from CS to be JS instead

import axios from "axios";
import TokenizeText from "./tokenizeText";

export async function ProcessAudioToText(audioData: Blob) {
    //Send audio blob to API
    //return "transcription disabled to avoid API costs during testing. Re-enable in audioProcess.ts"

    const text: string = await TranscribeAudioAsync(audioData);

    return text; 
}

export function ProcessTextToTokens(text: string) {
    //convert text into tokens and their count
    const tokensByCount = TokenizeText.textToTokensByCount(text);

    return tokensByCount;
}

const API_KEY =  process.env.ASSEMBLY_AI_API;

async function UploadAudioAsync(audioData: Blob) {
    //Upload the audioDataBlob to the API that will transcribe it for us
    //We must first upload the file and use the URL to ask it to transcribe

    const baseUrl = "https://api.assemblyai.com";

    console.log("Blob size:", audioData.size);
    console.log("Blob type:", audioData.type);

    //assemblyAI accepts buffer, not raw audio Blob
    const buffer = Buffer.from(await audioData.arrayBuffer());

    console.log("Buffer length:", buffer.length);

    console.log("about to upload to assembly ai")

    try {
        //Send the data to the API
        const uploadResponse = await axios.post(
            `${baseUrl}/v2/upload`,
            buffer,
            {
                headers: {
                    authorization: API_KEY,
                    "content-type": "application/octet-stream",
                },
                maxBodyLength: Infinity,
            }
        );

        //Get 
        const audioUrl = uploadResponse.data.upload_url;

        console.log("Audio URL:", audioUrl);

        return audioUrl;

    } catch (error: any) {
        console.error("Status:", error.response?.status);
        console.error("Headers:", error.response?.headers);
        console.error("Data:", error.response?.data);
        console.error("Full error:", error);
        throw error;
    }

}

//The following function was modified from template
//code providied by AssemblyAI (not AI-generated) to
//use their API
async function TranscribeAudioAsync(audioData: Blob)
{
    //Send the audioFile first to the API server to upload and get
    //A URL to the file in return

    const audioUrl = await UploadAudioAsync(audioData);
    //const audioUrl = "https://assembly.ai/wildfires.mp3";

    const headers = {
        authorization: API_KEY,
    };

    const data = {
        audio_url: audioUrl,
        speech_models: ["universal"],
    };

    //Then, send the URL to the API to ask it to transcribe it into text
    //For us

    const baseUrl = "https://api.assemblyai.com";
    const url = `${baseUrl}/v2/transcript`;
    const response = await axios.post(url, data, { headers: headers });

    const transcriptId = response.data.id;
    const pollingEndpoint = `${baseUrl}/v2/transcript/${transcriptId}`;

    while (true) {
        const pollingResponse = await axios.get(pollingEndpoint, {
            headers: headers,
        });
        const transcriptionResult = pollingResponse.data;

        if (transcriptionResult.status === "completed") {
            console.log(transcriptionResult.text);

            //Modification
            //Return result instead of only printing it to console
            return transcriptionResult.text;


        } else if (transcriptionResult.status === "error") {
            throw new Error(`Transcription failed: ${transcriptionResult.error}`);
        } else {
            await new Promise((resolve) => setTimeout(resolve, 3000));
        }
    }
}

