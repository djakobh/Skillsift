import { NextResponse } from "next/server";
import { db } from "~/server/db";
import { auth } from "~/server/auth";

export async function POST(req: Request) {

    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { content } = await req.json();

        const report = await db.resumeAnalysis.create({
            data: {
                userId: session.user.id,
                resumeName: "test",
                jobDescription: "test",
                feedback: content,
            },
            select: { id: true },
        });

        return NextResponse.json(report, { status: 201 });
    } catch (err) {
        console.error("FEEDBACK POST ERROR:", err);
        return NextResponse.json({ error: "Error" }, { status: 500 });
    }
}

export async function DELETE() {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const result = await db.resumeAnalysis.deleteMany({
            where: {
                userId: session.user.id,
            },
        });

        return NextResponse.json({
            deletedCount: result.count,
        });
    } catch (err) {
        console.error("FEEDBACK DELETE ERROR:", err);
        return NextResponse.json(
            { error: "Error deleting records" },
            { status: 500 }
        );
    }
}