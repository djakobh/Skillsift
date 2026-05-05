// Alvin Ngo work report 3

import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import path from "path";

export type SolutionsMap = Record<string, Record<string, string>>;

function loadSolutions(): SolutionsMap {
  const filePath = path.join(process.cwd(), "prisma/data/solutions.json");
  const raw = readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as SolutionsMap;
}

export async function GET() {
  try {
    const solutions = loadSolutions();
    return NextResponse.json(solutions);
  } catch (error) {
    console.error("Failed to load solutions:", error);
    return NextResponse.json({ error: "Failed to load solutions" }, { status: 500 });
  }
}
