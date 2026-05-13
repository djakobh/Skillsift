// Returns the Railway analyzer URL and secret to authenticated users only.
// The client uses these to POST video directly to Railway, bypassing Vercel's payload limit.

import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { env } from "~/env";

export async function GET() {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
        url: env.ANALYZER_URL,
        secret: env.ANALYZER_SECRET ?? "",
    });
}
