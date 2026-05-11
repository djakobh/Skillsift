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
            }

            if (item.content != null && item.content != "") {
                contentItems.push(item);
            }

            if (item.graph != null) {
                graphItems.push(item);
            }
        }
    )

    return itemsByType;
}

function DisplayScoreFeedback({ items }: { items: FeedbackItem[] }) {

    if (items.length == 0)
        return null;

    return (
        <DisplayBox title="Statistics">
            <div className="grid grid-cols-2 gap-3">
                {items.map((item: FeedbackItem, i) => (
                    <div key={i} className="flex flex-col gap-0.5 p-3 rounded-lg bg-gray-50 border border-gray-100">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{item.key}</span>
                        <span className="text-lg font-bold text-gray-900">{item.score?.toString()}</span>
                    </div>
                ))}
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
