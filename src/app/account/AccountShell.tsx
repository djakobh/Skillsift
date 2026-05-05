"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const sidebarItems = [
  { label: "Account Details", href: "/account/details" },
  { label: "Privacy", href: "/account/privacy" },
  { label: "Settings", href: "/account/settings" },
];

export default function AccountShell({
  initialDarkMode,
  children,
}: {
  initialDarkMode: boolean;
  children: React.ReactNode;
}) {
  const [isDark, setIsDark] = useState(initialDarkMode);
  const pathname = usePathname();

  const pageBg = isDark ? "bg-neutral-900 text-white" : "bg-white text-gray-900";

  async function handleToggle() {
  const next = !isDark;
  setIsDark(next);

  try {
    await fetch("/api/account/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prefersDarkMode: next }),
    });
  } catch (e) {
    console.error("Failed to save dark mode", e);
  }
}


  return (
    <main
      className={`min-h-screen w-full flex justify-center pt-20 transition-colors ${pageBg}`}
    >
      <div className="flex items-start gap-8">
        {/* LEFT: sidebar + toggle */}
        <div className="flex flex-col items-center gap-4">
          <aside
            className={`w-64 rounded-xl shadow-md p-4 space-y-4 ${
              isDark ? "bg-neutral-800" : "bg-gray-100"
            }`}
          >
            <h2 className="text-sm font-semibold mb-2">General</h2>

            {sidebarItems.map(({ label, href }) => {
              const isActive = pathname === href;

              const activeClasses = isDark
                ? "bg-orange-500 border-orange-300 text-white shadow-md"
                : "bg-white border-gray-400 shadow-sm";

              const inactiveClasses = isDark
                ? "bg-neutral-700 border-neutral-600 hover:bg-neutral-600"
                : "bg-gray-200 border-gray-300 hover:bg-gray-300";

              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex w-full items-center gap-3 px-4 py-3 rounded-md text-left text-sm font-medium border ${
                    isActive ? activeClasses : inactiveClasses
                  }`}
                >
                  <span className="w-5 h-5 rounded-full border border-gray-400" />
                  <span>{label}</span>
                </Link>
              );
            })}
          </aside>

          <DarkModeToggle isDark={isDark} onToggle={handleToggle} />
        </div>

        {/* CARD */}
        <div
          className={`w-full max-w-2xl border border-black rounded-xl p-10 shadow-lg ${
            isDark ? "bg-neutral-800" : "bg-white"
          }`}
        >
          {children}
        </div>

        <div className="w-64" aria-hidden="true" />
      </div>
    </main>
  );
}

function DarkModeToggle({
  isDark,
  onToggle,
}: {
  isDark: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-2 px-3 py-1 rounded-full border shadow-sm text-xs font-medium
      ${isDark ? "bg-neutral-700 border-neutral-500" : "bg-white border-gray-300"}`}
    >
      <span>☾</span>
      <div
        className={`flex items-center w-12 h-6 rounded-full px-0.5 transition-colors ${
          isDark ? "bg-orange-400 justify-end" : "bg-gray-300 justify-start"
        }`}
      >
        <span className="h-5 w-5 rounded-full bg-white shadow" />
      </div>
      <span>{isDark ? "On" : "Off"}</span>
    </button>
  );
}
