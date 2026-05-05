//Author: Dylan Hartley
//Date: 12/12/2025

"use client";

import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";

export default function Home() {
  const { data: session } = useSession();

  return (
    <main className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="flex flex-col items-center px-8 py-16">
        {/* Logo */}
        <div className="mb-6">
          <Image
            src="/images/landing/skill-skift-card.png"
            alt="SkillSift Logo"
            width={300}
            height={120}
            className="object-contain"
          />
        </div>

        {/* Tagline */}
        <p className="mb-8 text-center text-lg text-gray-700">
          Prepare for your job interviews with Artificial Intelligence
        </p>

        {/* CTA Buttons */}
        {!session?.user && (
          <>
            <Link
              href="/signup"
              className="mb-3 rounded bg-orange-500 px-16 py-3 text-lg font-semibold text-white transition hover:bg-orange-600"
            >
              Sign Up
            </Link>
            <Link
              href="/login"
              className="text-sm text-gray-600 hover:underline"
            >
              Or Login
            </Link>
          </>
        )}
      </div>

      {/* Feature Cards Section */}
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-8 py-12 md:grid-cols-3">
        {/* AI Interview Card */}
        <div className="flex flex-col items-center text-center">
          <div className="mb-15 flex h-48 w-full items-center justify-center">
            <Image
              src="/images/landing/interview-card.png"
              alt="AI Interview"
              width={250}
              height={250}
              className="object-contain"
            />
          </div>
          <h3 className="mb-3 text-xl font-bold">AI Interview</h3>
          <p className="text-sm text-gray-600">
            Practice for your interview to see how your body language and
            answers can improve
          </p>
        </div>

        {/* Technical Questions Card */}
        <div className="flex flex-col items-center text-center">
          <div className="mb-15 flex h-48 w-full items-center justify-center">
            <Image
              src="/images/landing/technical-card.png"
              alt="Technical Questions"
              width={250}
              height={250}
              className="object-contain"
            />
          </div>
          <h3 className="mb-3 text-xl font-bold">Technical Questions</h3>
          <p className="text-sm text-gray-600">
            Practice your hard skills with sample questions
          </p>
        </div>

        {/* Resume Report Card */}
        <div className="flex flex-col items-center text-center">
          <div className="mb-15 flex h-48 w-full items-center justify-center">
            <Image
              src="/images/landing/resume-card.png"
              alt="Resume Report"
              width={250}
              height={250}
              className="object-contain"
            />
          </div>
          <h3 className="mb-3 text-xl font-bold">Resume Report</h3>
          <p className="text-sm text-gray-600">
            Upload your Resume to be graded and reviewed for any missing
            information that companies look for!
          </p>
        </div>
      </div>
    </main>
  );
}
