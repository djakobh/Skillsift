// Receives raw video analysis JSON from the client (after it POSTs directly to Railway)
// and transforms it into FeedbackItems with DB averaging — no video blob, stays under size limits.

import { NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";

export const runtime = "nodejs";

type FeedbackItem = {
    category: string;
    content: string;
    score: number;
};

export async function POST(req: NextRequest) {
    try {
        const { rawAnalysis, sessionId } = await req.json() as {
            rawAnalysis: any;
            sessionId: string;
        };

        if (!rawAnalysis || !sessionId) {
            return NextResponse.json({ error: "Missing rawAnalysis or sessionId" }, { status: 400 });
        }

        const summary = rawAnalysis.summary ?? {};

        const baseItems: FeedbackItem[] = [
            {
                category: "Posture",
                content: "Estimated from body position over time.",
                score: summary.posture?.good_percent ?? 0,
            },
            {
                category: "Eye Contact",
                content: "Estimated from face orientation over time.",
                score: summary.eye_contact?.good_percent ?? 0,
            },
            {
                category: "Facial Expression",
                content: "Estimated from facial engagement over time.",
                score: summary.facial_expression?.good_percent ?? 0,
            },
        ];

        const averagedItems = await averageFeedbackItems(baseItems, sessionId);

        return NextResponse.json({
            feedback: averagedItems,
            rawAnalysis,
        });
    } catch (err: any) {
        console.error("processVideoFeedback error:", err);
        return NextResponse.json({ error: err?.message ?? "Processing failed" }, { status: 500 });
    }
}

async function averageFeedbackItems(baseItems: FeedbackItem[], sessionId: string) {
    const feedbackSets: FeedbackItem[][] = [baseItems];

    const storedSessions = await db.storedBehavioralSession.findMany({
        where: { sessionId },
    });

    storedSessions.forEach((session) => {
        if (session.feedback) {
            feedbackSets.push(session.feedback as FeedbackItem[]);
        }
    });

    const totals: Record<string, number> = {};
    const counts: Record<string, number> = {};

    feedbackSets.forEach((items) => {
        items.forEach((item) => {
            if (item.category && typeof item.score === "number") {
                totals[item.category] = (totals[item.category] ?? 0) + item.score;
                counts[item.category] = (counts[item.category] ?? 0) + 1;
            }
        });
    });

    return baseItems.map((item) => ({
        ...item,
        score: counts[item.category] ? (totals[item.category] ?? item.score) / counts[item.category]! : item.score,
    }));
}
