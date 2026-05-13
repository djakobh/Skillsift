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
        const segments: Array<{ category: string; scoreAvg?: number | null; isGood?: boolean }> =
            rawAnalysis.segments ?? [];

        // Prefer summary.good_percent; fall back to averaging scoreAvg across segments per category
        function scoreForCategory(cat: string): number {
            const fromSummary = summary[cat]?.good_percent;
            if (typeof fromSummary === "number" && fromSummary > 0) return fromSummary;

            const catSegments = segments.filter((s) => s.category === cat && typeof s.scoreAvg === "number");
            if (catSegments.length === 0) return 0;
            const total = catSegments.reduce((sum, s) => sum + (s.scoreAvg ?? 0), 0);
            return total / catSegments.length;
        }

        const baseItems: FeedbackItem[] = [
            {
                category: "Posture",
                content: "Estimated from body position over time.",
                score: scoreForCategory("posture"),
            },
            {
                category: "Eye Contact",
                content: "Estimated from face orientation over time.",
                score: scoreForCategory("eye_contact"),
            },
            {
                category: "Facial Expression",
                content: "Estimated from facial engagement over time.",
                score: scoreForCategory("facial_expression"),
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
