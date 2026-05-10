// Author: Brandon Christian
// Date: 4/14/2026
// Data structure to store the parts of the volumeAnalysis thats returned to the client

import type { AnalysisItem } from "./analysisItem"

export type VolumeAnalysisResponse = {
    feedbackItems: AnalysisItem[],
    volume: number[]
}

export type FillerAnalysisResponse = {
    feedbackItems: AnalysisItem[],
    fillerWords: string[]
}

export type BasicAnalysisResponse = {
    feedbackItems: AnalysisItem[]
}

export type AnalysisResponse = {
    volumeAnalysis: VolumeAnalysisResponse,
    fillerAnalysis: FillerAnalysisResponse,
    wordCountAnalysis: BasicAnalysisResponse
}