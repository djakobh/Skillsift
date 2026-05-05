//Author: Brandon Christian
//Date: 3/16/2026

import { useState } from "react";
import type { InterviewItem } from "./interviewItem";

export function DateDisplay({ startDate, endDate, setStartDate, setEndDate }: {
    startDate: string,
    endDate: string,
    setStartDate: React.Dispatch<React.SetStateAction<string>>;
    setEndDate: React.Dispatch<React.SetStateAction<string>>;
}) {


    const handleStartDate = (event: any) => {
        setStartDate(event.target.value);
    };

    const handleEndDate = (event: any) => {
        setEndDate(event.target.value);
    };


    return (
        <div>
            Date Range:
            <input
                type="date"
                id="start-input"
                value={startDate}
                onChange={handleStartDate}
            />
            To
            <input
                type="date"
                id="end-input"
                value={endDate}
                onChange={handleEndDate}
            />
            <hr />
        </div>
    );
}

export function FilterDisplay({ filterType, setFilterType }: {
    filterType: string,
    setFilterType: React.Dispatch<React.SetStateAction<string>>;
}) {

    return (
        <div>
            Filter:
            <select
                id="filter-input"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
            >
                <option value="all">All</option>
                <option value="favorite">Favorite</option>
                <option value="completed">Completed</option>
            </select>
            <hr />
        </div>
    );
}

export function FilterItems(startDate: string, endDate: string, filterType: string, items: any[]) {
    const start = StringToTimestamp(startDate);
    const end = StringToTimestamp(endDate);

    let filteredByDate: any[] = items;

    if (start != -1 && end != -1) {

        const byDate: any[] = [];

        filteredByDate.forEach((item) => {
            const timestamp = new Date(item.startedAt).getTime();
            console.log("item dates: " + timestamp + " range: " + start + " to " + end);

            if (timestamp >= start && timestamp <= end) {
                byDate.push(item);
            }
        })


        filteredByDate = byDate;
    }

    let finalFilter: any[] = filteredByDate;

    filteredByDate.forEach((item) => {

        console.log("item stats: " + item.type);

    });

    if (filterType == "all") {
        //do nothing
    }
    else if (filterType == "favorite") {
        finalFilter = filteredByDate.filter(item => item.isFavorite == true);
    }
    else if (filterType == "completed") {
        finalFilter = filteredByDate.filter(item => item.status == "COMPLETED");
    }
    else if (filterType == "behavioral") {
        finalFilter = filteredByDate.filter(item => item.type == "BEHAVIORAL");
    }
    else if (filterType == "technical") {
        finalFilter = filteredByDate.filter(item => item.type == "TECHNICAL");
    }

    return finalFilter;
}

function StringToTimestamp(date: string) {
    //return -1 for not set dates
    if (date == '')
        return -1;

    const timestamp = new Date(date).getTime();
    return timestamp;
}