// Dylan Hartley
// 12/12/2025
// initial template

// Brandon Christian
// 4/23/2026
// fetch interviews filter and display overview

"use client"

import Link from "next/link";
import { useState, useEffect } from "react";

import { GetUserBehavioralSessions } from "./behavioralHistoryService";

import { DisplayFeedbackItems } from "../../interview/behavioral/feedbackDisplay";

import { FilterItems, FilterDisplay , DateDisplay} from "../../account/overview/listFilter"

export function BehavioralInterviewHistoryPageContents() {
  return (
    <main className="min-h-screen bg-white p-8">
     <Header/>
     <ResultsContainer/>
    </main>
  );
}

function Header() {
    return (
        <div className="mx-auto max-w-7xl">
            <Link
                href="/history"
                className="mb-6 inline-block text-sm text-gray-600 hover:text-black"
            >
                ← Back to History
            </Link>
            <h1 className="mb-4 text-3xl font-bold">Behavioral Interview History</h1>
            <p className="mb-12 text-sm text-gray-600">
                Access all your behavioral interview sessions and improve your soft skills.
            </p>
        </div>
    )
}

function ResultsContainer() {

    const test_list: any[] = [];
    const [items, setItems] = useState(test_list);
    const [filteredItems, setFilteredItems] = useState(test_list);
    const [empty, setEmpty] = useState(true);
    const [loaded, setLoaded] = useState(false);

    //const sessions = GetUserBehavioralSessions();

    //wrap in useEffect so that it only runs once on initial render
    //else setItems causes it to run again in a loop
    useEffect(() => {

        //wrap in async func
        //so we can call data fetch synchronously
        (async () => {
            const asyncItems = await GetUserBehavioralSessions();

            //keep list of all items before any filtering
            setItems(asyncItems);
            setFilteredItems(asyncItems);
            setLoaded(true);
            setEmpty(asyncItems.length == 0);
        })();
    }, []);

    const [filterType, setFilter] = useState("all");

    const [startDate, setStart] = useState("");
    const [endDate, setEnd] = useState("");



    //Run any time the filters change
    useEffect(() => {
        const filtered = FilterItems(startDate, endDate, filterType, items);
        setFilteredItems(filtered);
    }, [startDate, endDate, filterType])

    return (
        < div className = "mx-auto max-w-7xl" >
            <div className="rounded-lg border-2 border-black bg-white p-6">

                <Count count={items.length} />

                <hr className="-mx-6 mb-6 border-t-2 border-black" />


                <DateDisplay startDate={startDate} endDate={endDate} setStartDate={setStart} setEndDate={setEnd} />
                <FilterDisplay filterType={filterType} setFilterType={setFilter} />

                <br/>

                {!loaded && (
                    <div>Loading sessions...</div>
                ) }

                {loaded && empty && (
                    <EmptyList/>
                )}

                {loaded && !empty && (
                    <FilledList sessions={filteredItems}/>
                ) }

            </div>
      </div >
    );
}

function Count({ count }: {count: number}) {
    return (
        <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold">All Behavioral Interviews</h2>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium">
                {count} Total
            </span>
        </div>
    )
}

function EmptyList() {
    return (
        <div className="space-y-6 py-12 text-center text-gray-500">
            <p className="text-sm">No behavioral interviews yet</p>
            <p className="text-xs">Start a behavioral interview to see your results here!</p>
            <Link
                href="/interview/behavioral"
                className="inline-block rounded-full bg-orange-500 px-6 py-2 text-sm text-white hover:bg-orange-600"
            >
                Start Interview
            </Link>
        </div>
    )
}

function FilledList({ sessions }: { sessions: any[] }) {
    return (
        <div className="space-y-4">
            {sessions.map((s, index) => (
                <ListItem key={index} s={s} />
            ))}
        </div>
    );
}

function ListItem({ s }: { s: any }) {
    // Determine status badge color and label
    let statusColor = "bg-yellow-100 text-yellow-700";
    let statusLabel = "In Progress";

    if (s.status === "COMPLETED") {
        statusColor = "bg-green-100 text-green-700";
        statusLabel = "Completed";
    } else if (s.status === "ABANDONED") {
        statusColor = "bg-red-100 text-red-600";
        statusLabel = "Abandoned";
    }

    const [display, setDisplay] = useState(false);

    return (
        <div className=" rounded-lg border border-gray-200 p-4">
        
            <div
                key={s.id}
                className="flex items-center justify-between"
            >
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                            {formatDate(s.startedAt)}
                        </span>
                        <span className={"rounded-full px-2 py-0.5 text-xs font-medium " + statusColor}>
                            {statusLabel}
                        </span>
                    </div>

                    <p className="text-xs text-gray-500">
                        Time spent: {formatDuration(s.startedAt, s.completedAt, s.pausedAt, s.resumedAt)}
                    </p>

                    {s.responses.length > 0 && (
                        <p className="text-xs text-gray-500">
                            {s.responses.length} question{s.responses.length !== 1 ? "s" : ""} attempted
                        </p>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {s.status === "IN_PROGRESS" && (
                        <Link
                            href={"/interview/behavioral"}
                            className="rounded-full bg-orange-500 px-4 py-1 text-xs text-white hover:bg-orange-600"
                        >
                            Resume
                        </Link>
                    )}
                    {s.status === "COMPLETED" && (
                        <button className="rounded-full bg-gray-500 px-4 py-1 text-xs text-white hover:bg-gray-600" onClick={() => setDisplay(!display)}>View Results</button>
                    )}
                </div>


            </div>
        
            {
                display && (
                    <div>
                        <br/>
                        <hr/>
                        <OverviewBox item={s} />
                    </div>
                )
            }
        </div>
       
    );
}

function OverviewBox({  item }: { item: any }) {

    return (
        <div>
            {
                item.feedback && (
                    <div>
                        <div>Feedback: </div>
                        <div className={`p-2 m-1 border rounded-md w-auto`}>
                            <DisplayFeedbackItems items={item.feedback} />
                        </div>
                    </div>
                )
            }

            {!item.feedback && (
                <div>
                    No feedback.
                </div>
            ) }
        </div>
    );
}

function formatDate(date: Date) {
    let newDate = new Date(date); //date seems to be string instead of date object, so convert it

    const formattedDate = newDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });

    return formattedDate;

}

//Author: Justin Do
function formatDuration(startedAt: Date, completedAt: Date | null, pausedAt: Date | null, resumedAt: Date | null) {


    const endTime = completedAt ? new Date(completedAt).getTime() : Date.now();
    let pausedMs = 0;

    if (pausedAt != null && resumedAt != null) {
        pausedMs = new Date(resumedAt).getTime() - new Date(pausedAt).getTime();
    }
    else if (pausedAt != null && resumedAt == null) {
        pausedMs = endTime - new Date(pausedAt).getTime();
    }

    const activeMs = endTime - new Date(startedAt).getTime() - pausedMs;
    const totalSeconds = Math.floor(activeMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return minutes + "m " + seconds + "s";
}

