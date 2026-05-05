"use client";

import { useEffect, useState } from "react";

const LANGUAGE_OPTIONS = [
  "JavaScript",
  "TypeScript",
  "Python",
  "Java",
  "C#",
  "C++",
];

export default function SettingsPage() {
  const [language, setLanguage] = useState("JavaScript");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load current settings when the page mounts
  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/account/settings");
        if (!res.ok) {
          console.error("Failed to load settings", await res.text());
          return;
        }
        const data = await res.json();
        if (data?.languagePref) {
          setLanguage(data.languagePref);
        }
      } catch (err) {
        console.error("Error loading settings", err);
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/account/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ languagePref: language }),
      });

      if (!res.ok) {
        console.error("Failed to save language", await res.text());
      }
    } catch (err) {
      console.error("Error saving language", err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <h1 className="text-3xl font-bold text-center mb-6">Settings</h1>

      <p className="text-sm text-gray-600 mb-6 text-center">
        Customize your account preferences and defaults.
      </p>

      <form className="space-y-4" onSubmit={handleSave}>
        <div>
          <label className="block text-sm font-medium mb-1">
            Preferred Language
          </label>
          <select
            className="border border-gray-300 rounded-md p-2 text-sm w-full"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            disabled={loading}
          >
            {LANGUAGE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-center gap-4 mt-6">
          <button
            type="submit"
            className="px-6 py-2 bg-orange-400 text-white rounded-md hover:bg-orange-500 disabled:opacity-60"
            disabled={saving || loading}
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
          <button
            type="button"
            className="px-6 py-2 text-sm text-gray-600 hover:underline"
          >
            Cancel
          </button>
        </div>
      </form>
    </>
  );
}
