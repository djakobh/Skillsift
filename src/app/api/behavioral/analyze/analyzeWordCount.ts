// Author: Brandon Christian
// Date: 4/16/2026
// Check for filler words

import type { AnalysisItem } from "./analysisItem";
import  { AnalysisType } from "./analysisItem";
import { CreateAnalysisItemScore, CreateAnalysisItemContent } from "./analysisItem";
import type { BasicAnalysisResponse } from "./analysisResponse";


enum FeedbackMessage {
    NoWords = "No words detected. Is your mic working?",
    FewWords = "Very few words used. Try talking for longer.",
    Repetitive = "High amounts of reptition. Try using a variety of words.",
}

export function GetWordCountAnalysis(tokens: Record<string, number>, text: string) {

    const analysisItems: AnalysisItem[] = [];

    const wordCountItem: AnalysisItem = GetWordCount(tokens);
    analysisItems.push(wordCountItem);

    if (wordCountItem.score != null) {
        const repititionItem: AnalysisItem = GetRepitition(tokens, wordCountItem.score);
        analysisItems.push(repititionItem);

        const minWords = 50;

        if (wordCountItem.score < minWords) {

            if (wordCountItem.score == 0) {
                const countNotesItem: AnalysisItem = CreateAnalysisItemContent(AnalysisType.Notes, FeedbackMessage.NoWords);
                analysisItems.push(countNotesItem);
            }
            else {
                const countNotesItem: AnalysisItem = CreateAnalysisItemContent(AnalysisType.Notes, FeedbackMessage.FewWords);
                analysisItems.push(countNotesItem);
            }

            if (repititionItem.score != null && repititionItem.score < 2.5) {
                const countNotesItem: AnalysisItem = CreateAnalysisItemContent(AnalysisType.Notes, FeedbackMessage.Repetitive);
                analysisItems.push(countNotesItem);
            }

            
        }
    }

    const transcriptItem = CreateAnalysisItemContent(AnalysisType.Transcript, text);
    analysisItems.push(transcriptItem);

    const fillerResponse: BasicAnalysisResponse = {
        feedbackItems: analysisItems
    }

    return fillerResponse;
}

function GetWordCount(tokens: Record<string, number>) {

    //tally all word counts

    //return as analysis Item
    const score = WordCount(tokens);

    return CreateAnalysisItemScore(AnalysisType.WordCount, score);

}

function WordCount(tokens: Record<string, number>) {

    let score = 0;

    Object.entries(tokens).forEach(
        ([key, value]) => {
            score += value;
        }
    )

    return score;
}

function GetRepitition(tokens: Record<string, number>, count: number) {
    let totalRepitition = 0;
    const repititionThreshold = 0.05;

    //wods that are at least 5% of the total words
    //are "reptitive"

    Object.entries(tokens).forEach(
        ([key, value]) => {
            if (value / count >= repititionThreshold) {
                totalRepitition += value / count;
            }
        }
    )

    //lose score for more than 30% and have 0 score
    //at 50% repitition
    const maxThreshold = 0.5;
    const minThreshold = 0.3;
    let score = 0;

    if (totalRepitition <= minThreshold) {
        score = 1;
    }
    else if (totalRepitition >= maxThreshold) {
        score = 0;
    }
    else {
        //1 at min and 0 at max
        score = -1 * totalRepitition * (maxThreshold - minThreshold) + 1;
    }

    score = score * 5; //put into range of 5

    return CreateAnalysisItemScore(AnalysisType.Repitition, score);
}


