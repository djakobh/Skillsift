import { NextResponse } from "next/server";
import { db } from "~/server/db"; 
import { sendPasswordResetEmail } from "~/server/utils/mail";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    const user = await db.user.findUnique({
      where: { email: email },
    });

    // Always return the same response to prevent user enumeration
    if (!user) {
      return NextResponse.json({ success: true });
    }

    const token = randomUUID();
    const expires = new Date(Date.now() + 3600000);

    await db.verificationToken.upsert({
      where: { token: token },
      update: {
        token: token,
        expires: expires
      },
      create: {
        identifier: email,
        token: token,
        expires: expires
      }
    });

    await sendPasswordResetEmail(email, token);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Forgot Password Error:", error);
    return NextResponse.json({ error: "Internal server error" });
  }
}