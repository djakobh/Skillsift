//Author: Brandon Christian
//Date: 2/2/2026
//Initial creation

//Date 2/3/2026
//Overview display

//Date 2/5/2026
//separate from item display
//Deprecate report


"use client";

import type { InterviewItem } from "./interviewItem";
import { CreateTestInterviewItems } from "./interviewItem";
import { GetCurrentUserInterviewData } from "./overviewService";
import { useState, useEffect, useRef} from "react";
import { InterviewItemBox } from "./displayInterviewItem";
import { DateDisplay, FilterDisplay, FilterItems } from "./listFilter";

/*
enum InterviewListState {
    ALL,
    FAVORITE
}*/

export function DisplayInterviewList() {
    //helps type useState and provides placeholder
    const testItems = CreateTestInterviewItems();

    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState(testItems);
    const [filteredItems, setFilteredItems] = useState(testItems);

    const [filterType, setFilter] = useState("all");

    const [startDate, setStart] = useState("");
    const [endDate, setEnd] = useState("");

    
    //wrap in useEffect so that it only runs once on initial render
    //else setItems causes it to run again in a loop
    useEffect(() => {

        //wrap in async func
        //so we can call data fetch synchronously
        (async () => {
            const asyncItems = await GetCurrentUserInterviewData(); 

            //keep list of all items before any filtering
            setItems(asyncItems);
            setFilteredItems(asyncItems);
            setLoading(false);
        })();
    }, []);

    useEffect(() => {
        const filtered = FilterItems(startDate, endDate, filterType, items);
        setFilteredItems(filtered);
    }, [startDate, endDate, filterType])

    //const [state, setState] = useState(InterviewListState.ALL);

    return (
        <main>
            <DateDisplay startDate={startDate} endDate={endDate} setStartDate={setStart} setEndDate={setEnd} />
            <FilterDisplay filterType={filterType} setFilterType={setFilter} />
            <InterviewList items={filteredItems} loading={loading} /> 
        </main>
    )
}

function InterviewList({ items, loading }: { items: InterviewItem[], loading: boolean }) {

    if (loading) {
        return (
            <div>
                Loading sessions.
            </div>
        ) 
    }

    if (items.length == 0) {
        return (
            <div>
                No past sessions.
            </div>
        )
    }

    return (
        <div>
            {items?.map(
                (item, i) => (
                    <div key={`${i}`}>
                        <InterviewItemBox item={item} />
                    </div>
                )
            )}
        </div>
    );
}

