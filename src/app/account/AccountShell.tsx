"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Shield, Settings } from "lucide-react";
import { useState } from "react";

const sidebarItems = [
  { label: "Account Details", href: "/account/details", icon: User },
  { label: "Privacy", href: "/account/privacy", icon: Shield },
  { label: "Settings", href: "/account/settings", icon: Settings },
];

export default function AccountShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isDark, setIsDark] = useState(false);

  return (
    <main className="page-blob-bg min-h-screen pt-12 pb-16">
      <div className="mx-auto max-w-5xl px-6">

        {/* Page header */}
        <div className="page-animate text-center mb-8" style={{ animationDelay: "0.05s" }}>
          <h1 className="m-0">Account Settings</h1>
          <p className="description m-0 mt-1">Manage your profile, privacy, and preferences.</p>
        </div>

        <div className="page-animate flex items-start gap-6" style={{ animationDelay: "0.15s" }}>
          {/* Sidebar */}
          <aside className="w-56 flex-shrink-0">
            <div className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden">
              <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide m-0">General</p>
              </div>
              <nav className="p-2 flex flex-col gap-1">
                {sidebarItems.map(({ label, href, icon: Icon }) => {
                  const isActive = pathname === href;
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                        isActive
                          ? "bg-orange-500 text-white shadow-sm"
                          : "text-gray-600 hover:bg-orange-50 hover:text-orange-600"
                      }`}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      {label}
                    </Link>
                  );
                })}
              </nav>
            {/* Dark mode toggle */}
            <div className="border-t border-gray-100 p-3 flex justify-center">
              <button
                onClick={() => setIsDark(!isDark)}
                className="flex items-center gap-2 px-3 py-1 rounded-full border border-gray-300 bg-white shadow-sm text-xs font-medium text-gray-600"
              >
                <span>☾</span>
                <div className={`flex items-center w-12 h-6 rounded-full px-0.5 transition-colors ${isDark ? "bg-orange-400 justify-end" : "bg-gray-300 justify-start"}`}>
                  <span className="h-5 w-5 rounded-full bg-white shadow" />
                </div>
                <span>{isDark ? "On" : "Off"}</span>
              </button>
            </div>
            </div>
          </aside>

          {/* Content card */}
          <div className="flex-1 border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden">
            <div className="p-8">
              {children}
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}
