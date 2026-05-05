import { NextResponse } from "next/server";
import { db } from "~/server/db";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json();

    if (!token) return NextResponse.json({ error: "Missing token" });

    const existingToken = await db.verificationToken.findUnique({
      where: { token },
    });

    // check if token exists and isn't expired
    if (!existingToken || new Date(existingToken.expires) < new Date()) {
      return NextResponse.json({ error: "Invalid or expired token" });
    }

    const user = await db.user.findUnique({
      where: { email: existingToken.identifier },
    });

    if (!user) return NextResponse.json({ error: "User not found" });

    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user and delete the token in a transaction
    await db.$transaction([
      db.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      }),
      db.verificationToken.delete({
        where: { token },
      }),
    ]);

    return NextResponse.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("RESET_PASSWORD_ERROR", error);
    return NextResponse.json({ error: "Internal server error" });
  }
}