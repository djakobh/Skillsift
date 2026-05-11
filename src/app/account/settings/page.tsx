"use client";

import { useEffect, useState } from "react";
import { Settings } from "lucide-react";

const LANGUAGE_OPTIONS = ["JavaScript", "TypeScript", "Python", "Java", "C#", "C++"];

const FONT_SCALE_OPTIONS = [
  { label: "Small", value: 0.9 },
  { label: "Default", value: 1.0 },
  { label: "Large", value: 1.15 },
  { label: "Extra Large", value: 1.3 },
];

const inputClass =
  "rounded-lg border border-gray-200 p-2.5 text-sm text-gray-800 focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400 bg-white w-full";

export default function SettingsPage() {
  const [language, setLanguage] = useState("JavaScript");
  const [fontScale, setFontScale] = useState(1.0);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/account/settings");
        if (!res.ok) return;
        const data = await res.json();
        if (data?.languagePref) setLanguage(data.languagePref);
        if (typeof data?.fontScale === "number") setFontScale(data.fontScale);
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
    setSaved(false);
    try {
      const res = await fetch("/api/account/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ languagePref: language, fontScale }),
      });
      if (res.ok) {
        document.documentElement.style.setProperty("--font-scale", String(fontScale));
        setSaved(true);
      }
    } catch (err) {
      console.error("Error saving settings", err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {/* Section header */}
      <div className="flex items-center gap-3 mb-6 pb-5 border-b border-gray-100">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-50 border border-orange-100 flex-shrink-0">
          <Settings className="h-5 w-5 text-orange-500" />
        </div>
        <div>
          <h3 className="m-0 text-gray-900">Settings</h3>
          <p className="text-xs text-gray-400 m-0 mt-0.5">Customize your account preferences and defaults.</p>
        </div>
      </div>

      {saved && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-700">
          Settings saved successfully.
        </div>
      )}

      <form className="flex flex-col gap-5" onSubmit={handleSave}>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Preferred Language
          </label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            disabled={loading}
            className={inputClass}
          >
            {LANGUAGE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          <p className="text-xs text-gray-400 m-0">Used as the default language in technical interviews.</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Text Size
          </label>
          <div className="flex flex-wrap gap-2">
            {FONT_SCALE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setFontScale(opt.value)}
                disabled={loading}
                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                  fontScale === opt.value
                    ? "bg-orange-500 text-white border-orange-500 shadow-sm"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-orange-50 hover:border-orange-300"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 m-0">Current scale: {fontScale}x</p>
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button type="submit" className="btn-primary btn-sm" disabled={saving || loading}>
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </form>
    </>
  );
}
