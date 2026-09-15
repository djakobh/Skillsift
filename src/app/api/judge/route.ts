import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { handleAuthenticatedJudgeRequest } from "~/lib/judgeHandler";
import { auth } from "~/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }
  return handleAuthenticatedJudgeRequest(request, session.user.id);
}
