"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { User } from "lucide-react";

const inputClass =
  "rounded-lg border border-gray-200 p-2.5 text-sm text-gray-800 focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400 bg-white w-full";

const readonlyClass =
  "rounded-lg border border-gray-100 p-2.5 text-sm bg-gray-50 text-gray-400 flex-1 cursor-not-allowed";

export default function AccountDetailsPage() {
  const { data: session, update } = useSession();
  const [username, setUsername] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user?.name) setUsername(session.user.name);
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
      {/* Section header */}
      <div className="flex items-center gap-3 mb-6 pb-5 border-b border-gray-100">
        <div className="flex items-center justify-center w-9 h-9 rounded-full border-2 border-orange-400 text-orange-500 bg-white flex-shrink-0">
          <User className="h-4 w-4" />
        </div>
        <div>
          <h3 className="m-0 text-gray-900">Account Details</h3>
          <p className="text-xs text-gray-400 m-0 mt-0.5">Update your name and credentials.</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">
          {error}
        </div>
      )}
      {saved && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-700">
          Changes saved successfully.
        </div>
      )}

      <form className="flex flex-col gap-5" onSubmit={handleSave}>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter username"
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email Address</label>
          <div className="flex items-center gap-3">
            <input
              type="email"
              value={session?.user?.email ?? ""}
              readOnly
              className={readonlyClass}
            />
            <Link href="/forgot-password" className="text-sm text-orange-500 hover:text-orange-600 shrink-0 font-medium">
              Change
            </Link>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Password</label>
          <div className="flex items-center gap-3">
            <input
              type="password"
              value="placeholder"
              readOnly
              className={readonlyClass}
            />
            <Link href="/forgot-password" className="text-sm text-orange-500 hover:text-orange-600 shrink-0 font-medium">
              Reset
            </Link>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary btn-sm"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </>
  );
}
