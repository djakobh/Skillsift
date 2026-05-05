//Alvin - serves questions from consolidated-questions.json file

// TODO: replace with database query, right now it loads from json to test

import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import path from "path";

export interface QuestionSummary {
  id: string;
  title: string;
  difficulty: string;
  category: string;
  description: string;
  functionName: string;
  params: { name: string; type: string }[];
  outputType: string;
  starterCode: Record<string, string>;
}

function loadQuestions(): QuestionSummary[] {
  const filePath = path.join(process.cwd(), "prisma/data/consolidated-questions.json");
  const raw = readFileSync(filePath, "utf-8");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const all: any[] = JSON.parse(raw);
  return all.map((q) => ({
    id: q.id,
    title: q.title,
    difficulty: q.difficulty,
    category: q.category,
    description: q.description,
    functionName: q.functionName,
    params: q.params,
    outputType: q.outputType,
    starterCode: q.starterCode ?? {},
  }));
}

export async function GET() {
  try {
    const questions = loadQuestions();
    return NextResponse.json(questions);
  } catch (error) {
    console.error("Failed to load questions:", error);
    return NextResponse.json({ error: "Failed to load questions" }, { status: 500 });
  }
}
