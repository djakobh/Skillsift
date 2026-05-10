// Author: Brandon Christian
// Date: 4/16/2026
// Check for filler words

import type { AnalysisItem } from "./analysisItem";
import { AnalysisType } from "./analysisItem";
import { CreateAnalysisItemScore, CreateAnalysisItemContent } from "./analysisItem";
import type { FillerAnalysisResponse } from "./analysisResponse";


//Count filler words and count
type FillerData = {
    fillerAmount: number,
    nonFillerAmount: number,
    fillerWords: string[]
}

enum FeedbackMessage {
    NoUse = "Little to no use of filler words. Great!",
    SomeUse = "Avoid usage of words such as ",
    TooMuchUse = "Excessive usage of filler words such as "
}

export function GetFillerAnalysis(tokens: Record<string, number>) {

    const analysisItems: AnalysisItem[] = [];

    //find filler words and total amount of filler and non filler
    const fillerData : FillerData = CountFiller(tokens);

    //score based on total amount of filler relative to total
    //amount of non filler
    const scoreItem: AnalysisItem = GetScoreItem(fillerData.fillerAmount, fillerData.nonFillerAmount);
    analysisItems.push(scoreItem);

    //leave notes about filler words used if any
    if (scoreItem.score) {
        const notesItem: AnalysisItem = GetNotesItem(scoreItem.score, fillerData.fillerWords)
        analysisItems.push(notesItem);
    }

    const fillerResponse : FillerAnalysisResponse = {
        feedbackItems: analysisItems,
        fillerWords: fillerData.fillerWords
    }

    return fillerResponse;
}

function GetScoreItem(fillerAmount: number, nonFillerAmount: number) {

    const total = fillerAmount + nonFillerAmount;

    //avoid divide by zero
    if (total == 0)
        return CreateAnalysisItemScore(AnalysisType.WordChoice, 0);

    const ratio = fillerAmount / (nonFillerAmount + fillerAmount);

    //10% filler words = 0 score
    //0% filler words = 1 score
    //keep within 0 to 5
    const scoreThreshold = 0.1;
    const score = Math.max(0, Math.min(1, ratio / scoreThreshold)) * 5;

    return CreateAnalysisItemScore(AnalysisType.WordChoice, score);
}

function GetNotesItem(score: number, fillerWords: string[]) {
    if (score >= 4) {
        return CreateAnalysisItemContent(AnalysisType.Notes, FeedbackMessage.NoUse);
    }
    else if (score >= 2.5) {
        //append word list to message
        const message = ConstructMessage(FeedbackMessage.SomeUse, fillerWords);

        return CreateAnalysisItemContent(AnalysisType.Notes, message);
    }
    else {
        //append word list to message
        const message = ConstructMessage(FeedbackMessage.TooMuchUse, fillerWords);

        return CreateAnalysisItemContent(AnalysisType.Notes, message);
    }
}

function ConstructMessage(start: string, fillerWords: string[]) {
    let i = 1;

    let msg = start;

    for (const word of fillerWords) {
        if (i == 1) {
            msg += word;
        }
        else if (i == fillerWords.length) {
            msg += " and " + word;
        }
        else {
            msg += ", " + word;
        }

        i += 1;
    }

    return msg;
}

function CountFiller(tokens: Record<string, number>) {
    let fillerAmount = 0;
    let nonFillerAmount = 0;

    let fillerWords: string[] = [];

    if (tokens) {
        Object.entries(tokens).forEach(
            ([word, amount]) => {

                if (IsFillerWord(word)) {
                    fillerAmount += amount;
                    fillerWords.push(word);
                }
                else {
                    nonFillerAmount += amount;
                }
            }
        )
    }

    const data: FillerData = { fillerAmount: fillerAmount, nonFillerAmount: nonFillerAmount, fillerWords: fillerWords };
    return data;
}

function IsFillerWord(token: string) {

    const fillerWords: string[] = ["uh", "um", "like"];

    for (const word of fillerWords) {
        if (token.startsWith(word)) {
            return true;
        }
    }

    return false;
}
