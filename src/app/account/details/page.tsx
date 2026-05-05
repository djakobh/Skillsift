"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function AccountDetailsPage() {
  const { data: session, update } = useSession();
  const [username, setUsername] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user?.name) {
      setUsername(session.user.name);
    }
  }, [session?.user?.name]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const res = await fetch("/api/account/details", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save.");
        return;
      }

      await update({ name: username });
      setSaved(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <h1 className="text-3xl font-bold text-center mb-6">Account Details</h1>

      <div className="flex flex-col items-center mb-8">
        <div className="w-28 h-28 rounded-full border border-gray-500 text-gray-700 flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-14 h-14"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M16 17a4 4 0 10-8 0m8 0a4 4 0 00-8 0m8 0H8m4-8a4 4 0 110-8 4 4 0 010 8z"
            />
          </svg>
        </div>
      </div>

      <form className="space-y-6" onSubmit={handleSave}>
        {error && (
          <p className="text-sm text-red-600 bg-red-50 p-2 rounded text-center">{error}</p>
        )}
        {saved && (
          <p className="text-sm text-green-600 bg-green-50 p-2 rounded text-center">Changes saved.</p>
        )}

        {/* Username */}
        <div className="flex flex-col">
          <label className="text-sm font-medium mb-1">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter username"
            className="border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>

        {/* Email — read-only, shown from session */}
        <div className="flex flex-col">
          <label className="text-sm font-medium mb-1">Email Address</label>
          <div className="flex items-center gap-3">
            <input
              type="email"
              value={session?.user?.email ?? ""}
              readOnly
              className="border border-gray-200 rounded-md p-2 text-sm bg-gray-50 text-gray-500 flex-1 cursor-not-allowed"
            />
            <Link
              href="/forgot-password"
              className="text-sm text-orange-500 hover:underline shrink-0"
            >
              Change Email
            </Link>
          </div>
        </div>

        {/* Password — blurred placeholder + reset link */}
        <div className="flex flex-col">
          <label className="text-sm font-medium mb-1">Password</label>
          <div className="flex items-center gap-3">
            <input
              type="password"
              value="placeholder"
              readOnly
              className="border border-gray-200 rounded-md p-2 text-sm bg-gray-50 text-gray-400 flex-1 cursor-not-allowed"
            />
            <Link
              href="/forgot-password"
              className="text-sm text-orange-500 hover:underline shrink-0"
            >
              Reset Password
            </Link>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-center gap-4 mt-6">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-orange-400 text-white rounded-md hover:bg-orange-500 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </>
  );
}
