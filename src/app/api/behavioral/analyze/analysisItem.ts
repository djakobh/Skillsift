// Author: Brandon Christian
// Date: 4/14/2026
// Data structure to store the parts of an analysisItem that will be sent to the client as feedback

export enum AnalysisType {
    Notes = "Notes",
    Transcript = "Transcript",
    Repitition = "Repitition",
    WordCount = "Word Count",
    WordChoice = "Word Choice"
}

export type AnalysisItem = {
    category: string,
    content?: string,
    score?: number,
    graph?: any[]
}

export function CreateAnalysisItemContent(category: string, content: string) {
    const item: AnalysisItem = { category: category, content: content }
    return item;
}

export function CreateAnalysisItemScore(category: string, score: number) {
    const item: AnalysisItem = { category: category, score: score }
    return item;
}

export function CreateAnalysisItemGraph(category: string, graph: any[]) {
    const item: AnalysisItem = { category: category, graph: graph }
    return item;
}