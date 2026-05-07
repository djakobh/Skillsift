"use client";

import { useEffect, useState } from "react";
import { Settings } from "lucide-react";

const LANGUAGE_OPTIONS = ["JavaScript", "TypeScript", "Python", "Java", "C#", "C++"];

const inputClass =
  "rounded-lg border border-gray-200 p-2.5 text-sm text-gray-800 focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400 bg-white w-full";

export default function SettingsPage() {
  const [language, setLanguage] = useState("JavaScript");
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
        body: JSON.stringify({ languagePref: language }),
      });
      if (res.ok) setSaved(true);
    } catch (err) {
      console.error("Error saving language", err);
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

        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button type="submit" className="btn-primary btn-sm" disabled={saving || loading}>
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </form>
    </>
  );
}
