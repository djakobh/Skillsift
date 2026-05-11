"use client";

import { useEffect, useRef, useState } from "react";

// Debounced location autocomplete via Nominatim (OpenStreetMap).
// Shows city/state/country suggestions, US results show "City, State".
export function LocationInput({
  value,
  onChange,
  placeholder = "e.g. Remote, San Francisco, CA",
  className = "",
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (val.trim().length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val)}&format=json&limit=5&addressdetails=1`,
          { headers: { "Accept-Language": "en" } }
        );
        const data = await res.json() as Array<{
          address?: { city?: string; town?: string; village?: string; state?: string; country?: string; country_code?: string };
        }>;
        const seen = new Set<string>();
        const results: string[] = [];
        for (const item of data) {
          const a = item.address ?? {};
          const city = a.city ?? a.town ?? a.village ?? "";
          const state = a.state ?? "";
          const country = (a.country_code ?? "").toUpperCase();
          if (!city) continue;
          const label = country === "US"
            ? state ? `${city}, ${state}` : city
            : state ? `${city}, ${state}, ${country}` : `${city}, ${country}`;
          if (!seen.has(label)) { seen.add(label); results.push(label); }
        }
        setSuggestions(results);
        setOpen(results.length > 0);
      } catch {
        // silently fail
      }
    }, 350);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <input
        type="text"
        value={value}
        onChange={handleChange}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        className="w-full rounded-md border border-gray-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
        placeholder={placeholder}
        autoComplete="off"
      />
      {open && (
        <ul className="absolute left-0 top-full z-50 mt-1 w-full rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5">
          {suggestions.map((s) => (
            <li key={s}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); onChange(s); setOpen(false); }}
                className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
