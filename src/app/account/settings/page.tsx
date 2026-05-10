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

const FONT_SCALE_OPTIONS = [
  { label: "Small", value: 0.9 },
  { label: "Default", value: 1.0 },
  { label: "Large", value: 1.15 },
  { label: "Extra Large", value: 1.3 },
];

export default function SettingsPage() {
  const [language, setLanguage] = useState("JavaScript");
  const [fontScale, setFontScale] = useState(1.0);
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
        if (typeof data?.fontScale === "number") {
          setFontScale(data.fontScale);
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
        body: JSON.stringify({
          languagePref: language,
          fontScale,
        }),
      });

      if (!res.ok) {
        console.error("Failed to save settings", await res.text());
      } else {
        document.documentElement.style.setProperty("--font-scale", String(fontScale));
      }
    } catch (err) {
      console.error("Error saving settings", err);
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

        <div>
          <label className="block text-sm font-medium mb-2">
            Text Size
          </label>
          <div className="flex flex-wrap gap-2">
            {FONT_SCALE_OPTIONS.map((opt) => {
              const isActive = fontScale === opt.value;

              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFontScale(opt.value)}
                  className={`px-4 py-2 rounded-md border text-sm ${
                    isActive
                      ? "bg-orange-400 text-white border-orange-400"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
                  disabled={loading}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          <p className="text-xs text-gray-500 mt-2">
            Current scale: {fontScale}x
          </p>
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