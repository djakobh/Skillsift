//Author: Brandon Christia[n
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
        <div>
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

    //Add each item to the appropriate category
    //possibly multiple if defined
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

    //display nothing
    if (items.length == 0)
        return null;

    const splitFeedback = (data: FeedbackItem[]) => {
        const middle = Math.ceil(data.length / 2); // rounds up if odd
        const firstHalf = data.slice(0, middle);
        const secondHalf = data.slice(middle);

        return [firstHalf, secondHalf];
    };

    const [firstHalf, secondHalf] = splitFeedback(items);

    return (
        <DisplayBox title="Statistics">
            <div className="flex flex-row gap-4 p-2">
                <div className="flex flex-col">
                    {firstHalf?.map(

                        (item: FeedbackItem, i) => (
                            <div key={`${i}`} className="p-1">
                                <h3>{item.key}</h3>
                                <span>{item.score?.toString()}</span>
                            </div>
                        )
                    )}
                </div>
                <div className="flex flex-col">
                    {secondHalf?.map(

                        (item: FeedbackItem, i) => (
                            <div key={`${i}`} className="p-1">
                                <h3>{item.key}</h3>
                                <span>{item.score?.toString()}</span>
                            </div>
                        )
                    )}
                </div>
            </div>
        </DisplayBox>

    );
}

function DisplayContentFeedback({ items }: { items: FeedbackItem[] }) {

    //display nothing
    if (items.length == 0)
        return null;

    //sort by key
    //for each (map) display a list

    const contentItemsByKey: Record<string, FeedbackItem[]> = SortItemsByKey(items);

    return (
        <div>
            {
                Object.entries(contentItemsByKey).map(([key, itemsByKey]) => (
                    <DisplayBox title={key} key={key}>
                        <ContentDisplay items={itemsByKey} />
                    </DisplayBox> )
                )
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
    //Display items in a list
    //dont use asterisk if only one item

    return (
        <div className="flex flex-row gap-4 p-2">
            <div className="flex flex-col">
                {items?.map(

                    (item, i) => (
                        <div key={`${i}`} className="p-1">
                            <span>{items.length > 1 && "* "} {item.content}</span>
                        </div>
                    )
                )}
            </div>
        </div>
    );
}

function DisplayGraphFeedback({ items }: { items: FeedbackItem[] }) {

    //display nothing
    if (items.length == 0)
        return null;

    return (
        <div>
            graph feedback
        </div>
    )
}

function DisplayBox({ title, children }: { title: string; children: ReactNode }) {
    return (
        <div>
            <h2>{title}</h2>
            <hr />
            {children}
        </div>
    )
};




