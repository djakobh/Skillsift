import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await db.userSettings.findUnique({
    where: { userId: session.user.id },
  });

  return NextResponse.json(settings);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { prefersDarkMode, languagePref } = await request.json();

  const updated = await db.userSettings.update({
    where: { userId: session.user.id },
    data: {
      ...(typeof prefersDarkMode === "boolean" && { prefersDarkMode }),
      ...(typeof languagePref === "string" && { languagePref }),
    },
  });

  return NextResponse.json(updated);
}
