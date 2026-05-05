// Alvin Ngo
// 12/12/2025

import { NextResponse } from "next/server";
import { db } from "~/server/db";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Please enter email and password." },
        { status: 400 }
      );
    }

    // check if user is existing
    const existing = await db.user.findUnique({
      where: { email },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Email already in use." },
        { status: 409 }
      );
    }

    const hashed = await bcrypt.hash(password, 10);

    // create user
    const user = await db.user.create({
      data: {
        email,
        password: hashed,
      },
      select: {
        id: true,
        email: true,
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (err) {
    console.error("SIGNUP ERROR:", err);
    return NextResponse.json(
      { error: "Error." },
      { status: 500 }
    );
  }
}
