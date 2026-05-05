// Author: Brandon Christian
// Date: 4/6/2026

import { GetVolume } from "./analyzeVolume";
import type { AnalysisResponse } from "./analysisResponse";
import { GetFillerAnalysis } from "./analyzeFiller";
import { GetWordCountAnalysis } from "./analyzeWordCount";

export async function TestAnalyzeVolume(blob: Blob, tokens: Record<string, number>, text: string ) {
    const volumeAnalysisResponse = await GetVolume(blob);
    const fillerAnalysisResponse = GetFillerAnalysis(tokens);
    const wordCountAnalysisResponse = GetWordCountAnalysis(tokens, text);

    const analysisResponse: AnalysisResponse = {
        volumeAnalysis: volumeAnalysisResponse,
        fillerAnalysis: fillerAnalysisResponse,
        wordCountAnalysis: wordCountAnalysisResponse
    }

    //return to uploadAudio
    return analysisResponse;
}