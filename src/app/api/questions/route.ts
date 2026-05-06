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

function pickRandom<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function selectQuestions(questions: QuestionSummary[]): QuestionSummary[] {
  const easy = questions.filter(q => q.difficulty === "Easy");
  const medium = questions.filter(q => q.difficulty === "Medium");
  const hard = questions.filter(q => q.difficulty === "Hard");

  const combos: Array<() => QuestionSummary[]> = [
    () => [...pickRandom(easy, 2), ...pickRandom(hard, 1)],         // 2 easy + 1 hard
    () => [...pickRandom(easy, 1), ...pickRandom(medium, 1), ...pickRandom(hard, 1)], // 1 easy + 1 medium + 1 hard
    () => [...pickRandom(easy, 1), ...pickRandom(medium, 2)],        // 1 easy + 2 medium
  ];

  const pick = combos[Math.floor(Math.random() * combos.length)]!;
  return pick();
}

export async function GET() {
  try {
    const questions = loadQuestions();
    const selected = selectQuestions(questions);
    return NextResponse.json(selected);
  } catch (error) {
    console.error("Failed to load questions:", error);
    return NextResponse.json({ error: "Failed to load questions" }, { status: 500 });
  }
}
