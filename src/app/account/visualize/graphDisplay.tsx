//Author: Brandon Christian
//Date: 3/2/2026

"use client";

export type GraphItem = {
    type: string,
    name: string,
    points: GraphPoint[]
}

export type GraphPoint = {
    date: number,
    value: number
}

import { useState, useEffect } from "react";
import { GetGraphDataAsync } from "./visualizeService";
import { useRef } from "react";
import {
    Chart,
    LineController,
    LineElement,
    BarController,
    BarElement,
    PointElement,
    LinearScale,
    TimeScale,
    Tooltip,
    Legend,
} from "chart.js";

import "chartjs-adapter-date-fns";

Chart.register(
    LineController,
    LineElement,
    BarController,
    BarElement,
    PointElement,
    LinearScale,
    TimeScale,
    Tooltip,
    Legend
);


export function Display() {

    const [loading, setLoading] = useState(true);
    const test_items: GraphItem[] = [];
    const [graphData, setGraphData] = useState(test_items);

    useEffect(
        () => {

            (async () => {
                GetGraphDataAsync(
                    setLoading,
                    setGraphData
                );
            })();

        },
        []);

    return (
        <GraphList loading={loading} graphs={graphData} />
    );
}


function GraphList({ loading, graphs }: { loading: boolean, graphs: GraphItem[] }) {

    //single message if empty or loading
    if (graphs.length == 0) {

        if (loading) {
            return (
                <div>
                    Loading sessions.
                </div>
            )
        }
        else {
            return (
                <div>
                    No past sessions.
                </div>
            )
        }

    }

    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [filterType, setFilterType] = useState("all")


    //map each graph item to the graph display
    return (
        <div>
            <FilterDisplay filterType={filterType} setFilterType={setFilterType}/>
            <DateDisplay startDate={startDate} endDate={endDate} setStartDate={setStartDate} setEndDate={setEndDate} />
            {graphs?.map(
                (graph, i) => (
                    <div key={`${i}`}>
                        <GraphItemDisplay graph={graph} startDate={startDate} endDate={endDate} filterType={filterType} />
                    </div>
                )
            )}
        </div>
    );
}

function DateDisplay({ startDate, endDate, setStartDate, setEndDate }: {
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
            <hr/>
        </div>
    );
}

function FilterDisplay({ filterType, setFilterType }: {
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
                <option value="behavioral">Behavioral</option>
                <option value="technical">Technical</option>
            </select>
            <hr />
        </div>
    );
}

function GraphItemDisplay({ graph, startDate, endDate, filterType}
    : {
        graph: GraphItem,
        startDate: string,
        endDate: string,
        filterType: string
    }) {

    //Convert the GraphPoints into a form readable
    //by chart.js

    if (graph.points.length == 0) {
        return (
            <br/>
        )
    }

    //Convert into format used by graph points
    const startDateStamp = StringToTimestamp(startDate);
    const endDateStamp = StringToTimestamp(endDate);

    console.log("start to end is " + startDateStamp + " to " + endDateStamp);
    console.log("start to end date is " + startDate + " to " + endDate);

    const graphXYPoints: any[] = [];

    graph.points.forEach(
        (point: GraphPoint) => {
            const xyPoint = { x: point.date, y: point.value }

            //if both start and end are valid, also filter by date
            if (startDateStamp != -1 && endDateStamp != -1) {

                if (xyPoint.x >= startDateStamp && xyPoint.x <= endDateStamp) {
                    graphXYPoints.push(xyPoint);
                }
            }
            else {
                graphXYPoints.push(xyPoint);
            }

            
        }
    )

    //0 is behavioral 1 is technical
    if (filterType != "all") {
        if (filterType == "behavioral") {
            if (graph.type != "0") {
                return (
                    <br />
                );
            }
        }
        else if (filterType == "technical") {
            if (graph.type != "1") {
                return (
                    <br />
                );
            }
        }
    }


    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const chartRef = useRef<Chart | null>(null);


    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        //use bar graph for count graphs
        const gtype = graph.name.includes("Count") ? "bar" : "line";

        // Destroy previous chart on re-render to avoid duplicates
        chartRef.current?.destroy();

        //fill the chart with the data
        chartRef.current = new Chart(canvas, {
            type: gtype,
            data: {
                datasets: [
                    {
                        label: "Values",
                        data: graphXYPoints,
                        borderColor: "orange",
                        backgroundColor: "orange",
                        fill: false,
                    },
                ],
            },
            options: {
                parsing: false,
                scales: {
                    x: {
                        type: "time",
                        time: {
                            unit: "day",
                            displayFormats: { day: "MMM d" },
                        },
                    },
                    y: { beginAtZero: true },
                },
            },
        });

        return () => {
            chartRef.current?.destroy();
            chartRef.current = null;
        };
    }, [graphXYPoints]);

    return (
        <div>
            <div>{CapitalizeTitle(graph.name)}</div>
            <canvas ref={canvasRef} />
        </div>
    );


}

function StringToTimestamp(date: string) {
    //return -1 for not set dates
    if (date == '')
        return -1;

    const timestamp = new Date(date).getTime();
    return timestamp;
}

function GraphPointDisplay({ point }: { point: GraphPoint }) {
    return (
        <div>
            * Date: {point.date}, Value: {point.value}
        </div>
    )
}

function CapitalizeTitle(text: string) {

    //lowercase, split by spaces, capitlize first letter, then rejoin

    text = text.toLowerCase();

    const words = text.split(' ');

    const capitalizedWords = words.map(word => {
        if (word.length === 0) return ''; // Handle multiple spaces
        // Get the first character and convert to uppercase, then add the rest of the word
        return word.charAt(0).toUpperCase() + word.slice(1);
    });

    return capitalizedWords.join(' ');
}
