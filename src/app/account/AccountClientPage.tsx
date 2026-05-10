/*---OBSOLETE---*/
"use client";

import { useState, Dispatch, SetStateAction } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type AccountClientPageProps = {
  user?: {
    name?: string;
    email?: string;
  };
};

export default function AccountClientPage({ user }: AccountClientPageProps) {
  const [isDark, setIsDark] = useState(false);
  const [activeItem, setActiveItem] = useState("Account Details");

  const pageBg = isDark ? "bg-neutral-900 text-white" : "bg-white text-gray-900";

  return (
    <main
      className={`min-h-screen w-full flex items-center justify-center transition-colors ${pageBg}`}
    >
      {/* Centered row: [sidebar] [card] [spacer] */}
      <div className="flex items-start gap-8">
        {/* LEFT: Sidebar + dark-mode toggle stacked */}
        <div className="flex flex-col items-center gap-4">
          <Sidebar
            isDark={isDark}
            activeItem={activeItem}
            setActiveItem={setActiveItem}
          />
          <DarkModeToggle isDark={isDark} setIsDark={setIsDark} />
        </div>

        {/* MIDDLE: Account card (this will be visually centered on the page) */}
        <div
          className={`w-full max-w-xl border border-black rounded-xl p-10 shadow-lg ${
            isDark ? "bg-neutral-800" : "bg-white"
          }`}
        >
          <h1 className="text-3xl font-bold text-center mb-6">Account Details</h1>
          <ProfileSection isDark={isDark} />
          <AccountForm user={user} />
        </div>

        {/* RIGHT: Invisible spacer to balance the sidebar width */}
        <div className="w-64" aria-hidden="true" />
      </div>
    </main>
  );
}


/* ────────────────────────────── */
/* Sidebar + Dark Mode Toggle    */
/* ────────────────────────────── */

type SidebarProps = {
  isDark: boolean;
  activeItem: string;
  setActiveItem: Dispatch<SetStateAction<string>>;
};

function Sidebar({ isDark }: { isDark: boolean }) {
  const pathname = usePathname();

  const items = [
    { label: "Account Details", href: "/AccountClientPage" },
    { label: "Privacy", href: "/account/privacy" },
    { label: "Settings", href: "/account/settings" },
  ];

  return (
    <aside
      className={`w-64 rounded-xl shadow-md p-4 space-y-4 ${
        isDark ? "bg-neutral-800" : "bg-gray-100"
      }`}
    >
      <h2 className="text-sm font-semibold mb-2">General</h2>

      {items.map(({ label, href }) => {
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
            className={`flex w-full items-center gap-3 px-4 py-3 rounded-md
              text-left text-sm font-medium border
              ${isActive ? activeClasses : inactiveClasses}`}
          >
            <span className="w-5 h-5 rounded-full border border-gray-400" />
            <span>{label}</span>
          </Link>
        );
      })}
    </aside>
  );
}


type DarkModeToggleProps = {
  isDark: boolean;
  setIsDark: Dispatch<SetStateAction<boolean>>;
};

function DarkModeToggle({ isDark, setIsDark }: DarkModeToggleProps) {
  return (
    <button
      onClick={() => setIsDark((v) => !v)}
      className={`flex items-center gap-2 px-3 py-1 rounded-full border shadow-sm text-xs font-medium
      ${isDark ? "bg-neutral-700 border-neutral-500" : "bg-white border-gray-300"}`}
    >
      <span>☾</span>
      <div
        className={`relative w-12 h-6 rounded-full transition-colors ${
          isDark ? "bg-orange-400" : "bg-gray-300"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            isDark ? "translate-x-6" : "translate-x-0.5"
          }`}
        />
      </div>
      <span>{isDark ? "On" : "Off"}</span>
    </button>
  );
}

/* ────────────────────────────── */
/* Profile + Form                */
/* ────────────────────────────── */

function ProfileSection({ isDark }: { isDark: boolean }) {
  return (
    <div className="flex flex-col items-center mb-8">
      {/* Profile icon */}
      <div
        className={`w-28 h-28 rounded-full border flex items-center justify-center ${
          isDark ? "border-gray-300 text-gray-100" : "border-gray-500 text-gray-700"
        }`}
      >
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

      {/* Round button */}
      <button className="mt-4 px-4 py-1 bg-orange-400 text-white text-sm font-medium rounded-full hover:bg-orange-500">
        Change Picture
      </button>
    </div>
  );
}

function AccountForm({ user }: { user?: { name?: string; email?: string } }) {
  return (
    <form className="space-y-6">
      {/* Row 1 */}
      <div className="grid grid-cols-2 gap-4">
        <InputField label="First Name" placeholder="Alex" />
        <InputField label="Last Name" placeholder="Dos" />
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-2 gap-4">
        <InputField
          label="Username"
          placeholder={user?.name || "Username"}
        />
        <InputField label="Password" type="password" placeholder="********" />
      </div>

      {/* Row 3 */}
      <div className="grid grid-cols-2 gap-4">
        <InputField
          label="Email Address"
          placeholder={user?.email || "yourmail@example.com"}
        />
        <InputField label="Phone Number" placeholder="555-555-5555" />
      </div>

      {/* Buttons */}
      <div className="flex justify-center gap-4 mt-6">
        <button className="px-6 py-2 bg-orange-400 text-white rounded-md hover:bg-orange-500">
          Save Changes
        </button>
        <button
          type="button"
          className="px-6 py-2 text-sm text-gray-600 hover:underline"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function InputField({
  label,
  placeholder,
  type = "text",
}: {
  label: string;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="flex flex-col">
      <label className="text-sm font-medium mb-1">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        className="border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
      />
    </div>
  );
}
