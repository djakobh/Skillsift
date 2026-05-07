// Alvin Ngo
// 12/12/2025

"use client";

import React, { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, username }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Sign up failed.");
      } else {
        const signInRes = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });

        if (signInRes?.ok) {
          router.push("/");
        } else {
          setError("Account created but login failed. Please try logging in manually.");
        }
      }
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-blob-bg flex flex-col items-center justify-center min-h-screen">
      <form
        onSubmit={handleSignup}
        className="page-animate flex flex-col gap-4 w-full max-w-sm bg-white p-8 rounded-xl shadow-sm border border-gray-200"
      >
        <div className="flex flex-col items-center gap-3 mb-2">
          <img
            src="/images/landing/skill-skift-card.png"
            alt="SkillSift Card"
            className="h-16 w-auto mb-1"
          />
          <h1 className="text-2xl font-semibold">Sign Up</h1>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>
        )}

        <input
          className="border rounded p-3 w-full"
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />

        <input
          className="border rounded p-3 w-full"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          className="border rounded p-3 w-full"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={1}
          required
        />

        <button
          className="btn-primary w-full justify-center disabled:opacity-60"
          type="submit"
          disabled={loading}
        >
          {loading ? "Creating account..." : "Sign Up"}
        </button>

        <p className="text-sm text-center mt-2">
          Already have an account?{" "}
          <Link href="/login" className="text-orange-500 hover:text-orange-600 underline">
            Login
          </Link>
        </p>
      </form>
    </main>
  );
}
