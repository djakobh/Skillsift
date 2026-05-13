//Author: Brandon Christian
//Date: 4/16/2026
//Format and display a list of FeedbackItems

import type { FeedbackItem } from "./feedbackItem";
import type { ReactNode } from "react";

enum FeedbackType {
    score = "score",
    content = "content",
    graph = "graph"
}

export function DisplayFeedbackItems({ items } : { items: FeedbackItem[] }) {

    const itemsByType: Record<FeedbackType, FeedbackItem[]> = SortFeedbackItems(items);

    return (
        <div className="flex flex-col gap-4">
            <DisplayScoreFeedback items={itemsByType[FeedbackType.score]}/>
            <DisplayContentFeedback items={itemsByType[FeedbackType.content]}/>
            <DisplayGraphFeedback items={itemsByType[FeedbackType.graph]}/>
        </div>
    )
}

function SortFeedbackItems(items: FeedbackItem[]) {
    const itemsByType: Record<string, FeedbackItem[]> = {};

    const scoreItems: FeedbackItem[] = [];
    const contentItems: FeedbackItem[] = [];
    const graphItems: FeedbackItem[] = [];

    itemsByType[FeedbackType.score] = scoreItems;
    itemsByType[FeedbackType.content] = contentItems;
    itemsByType[FeedbackType.graph] = graphItems;

    items.forEach(
        (item: FeedbackItem) => {
            if (item.score != null) {
                scoreItems.push(item);
            } else if (item.content != null && item.content !== "") {
                // Only show in content section if there's no score — score cards already show content
                contentItems.push(item);
            }

            if (item.graph != null) {
                graphItems.push(item);
            }
        }
    )

    return itemsByType;
}

const DEFAULT_DESCRIPTIONS: Record<string, string> = {
    "Word Count":        "Total number of words spoken during the interview.",
    "Repitition":        "Frequency of repeated words or phrases.",
    "Word Choice":       "Variety and appropriateness of vocabulary used.",
    "Volume":            "Consistency and clarity of speaking volume.",
    "Posture":           "Estimated from body position over time.",
    "Eye Contact":       "Estimated from face orientation over time.",
    "Facial Expression": "Estimated from facial engagement over time.",
};

function scoreDescriptor(score: number): { label: string; color: string } {
    if (score >= 0.7) return { label: "Good",             color: "text-green-600" };
    if (score >= 0.4) return { label: "Needs Attention",  color: "text-orange-500" };
    return              { label: "Needs Improvement",     color: "text-red-500" };
}

function DisplayScoreFeedback({ items }: { items: FeedbackItem[] }) {

    if (items.length == 0)
        return null;

    const visibleItems = items.filter((item) => item.key !== "Volume");

    return (
        <DisplayBox title="Statistics">
            <div className="flex flex-col gap-2">
                {visibleItems.map((item: FeedbackItem, i) => {
                    const { label, color } = scoreDescriptor(item.score ?? 0);
                    const description = item.content ?? DEFAULT_DESCRIPTIONS[item.key] ?? "";
                    return (
                        <div key={i} className="flex items-center gap-4 rounded-lg bg-gray-50 border border-gray-100 px-4 py-3">
                            <div className="flex-1">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-sm font-semibold text-gray-800">{item.key}:</span>
                                    <span className={`text-sm font-medium ${color}`}>{label}</span>
                                </div>
                                {description && (
                                    <p className="text-xs text-gray-500 m-0 mt-0.5">{description}</p>
                                )}
                            </div>
                            <span className="text-sm font-bold text-orange-500 shrink-0">
                                {(item.score ?? 0).toFixed(2)}
                            </span>
                        </div>
                    );
                })}
            </div>
        </DisplayBox>
    );
}

function DisplayContentFeedback({ items }: { items: FeedbackItem[] }) {

    if (items.length == 0)
        return null;

    const contentItemsByKey: Record<string, FeedbackItem[]> = SortItemsByKey(items);

    return (
        <div className="flex flex-col gap-4">
            {
                Object.entries(contentItemsByKey).map(([key, itemsByKey]) => (
                    <DisplayBox title={key} key={key}>
                        <ContentDisplay items={itemsByKey} />
                    </DisplayBox>
                ))
            }
        </div>
    )
}

function SortItemsByKey(items: FeedbackItem[]) {

    const itemsByKey: Record<string, FeedbackItem[]> = {};

    items.forEach(
        (item : FeedbackItem) => {
            const key = item.key;

            if (!itemsByKey[key]) {
                itemsByKey[key] = [];
            }

            itemsByKey[key].push(item);
        }
    )

    return itemsByKey;
}

function ContentDisplay({ items }: { items: FeedbackItem[] }) {
    return (
        <div className="flex flex-col gap-2">
            {items.map((item, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    {items.length > 1 && (
                        <span className="text-orange-400 mt-0.5 shrink-0 font-bold">*</span>
                    )}
                    <span className="leading-relaxed">{item.content}</span>
                </div>
            ))}
        </div>
    );
}

function DisplayGraphFeedback({ items }: { items: FeedbackItem[] }) {

    if (items.length == 0)
        return null;

    return (
        <DisplayBox title="Graph">
            <p className="text-sm text-gray-400 m-0">Graph feedback coming soon.</p>
        </DisplayBox>
    )
}

function DisplayBox({ title, children }: { title: string; children: ReactNode }) {
    return (
        <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
            <div className="bg-gray-50 border-b border-gray-200 px-5 py-3">
                <p className="text-sm font-semibold text-gray-800 m-0">{title}</p>
            </div>
            <div className="p-5">
                {children}
            </div>
        </div>
    );
}
