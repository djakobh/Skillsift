import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

export const runtime = "nodejs";

const UPLOAD_DIR = path.join(process.cwd(), "tmp_uploads");

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await db.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const row = await db.videoUpload.findUnique({ where: { id: params.id } });
  if (!row || row.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const filePath = path.join(UPLOAD_DIR, row.storageKey);
  const buf = await fs.readFile(filePath);

  return new NextResponse(buf, {
    headers: {
      "Content-Type": row.mimeType,
      "Content-Disposition": `inline; filename="${row.originalName}"`,
      "Cache-Control": "no-store",
    },
  });
}
