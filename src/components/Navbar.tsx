// Dylan Hartley
// 12/12/2025

"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { User, Settings, LogOut } from "lucide-react";
import { useState, useRef, useEffect } from "react";

export default function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/" });
  };

  const leftNavLinks = [
    { href: "/resume", label: "Resume Scanner" },
    { href: "/interview/behavioral", label: "Behavioral" },
    { href: "/technical", label: "Technical" },
    { href: "/jobs", label: "Job Tracker" },
    { href: "/history", label: "History" },
  ];

  const rightNavLinks = [
    { href: "/signup", label: "Sign Up" },
    { href: "/login", label: "Login" },
  ];

  return (
    <nav
      style={{
        background: "rgba(255, 255, 255, 0.85)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        boxShadow: "0 1px 0 0 rgba(0,0,0,0.06), 0 4px 24px rgba(0,0,0,0.06)",
        position: pathname === "/" ? "relative" : "sticky",
        top: pathname === "/" ? undefined : 0,
        zIndex: 50,
      }}
    >
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-16 items-center justify-between">

          {/* Logo */}
          <Link href="/" className="flex items-center shrink-0">
            <Image
              src="/images/landing/skillsift-split-circle.png"
              alt="SkillSift"
              width={36}
              height={36}
              className="object-contain"
            />
          </Link>

          {/* Nav links - centered */}
          <div className="hidden flex-1 items-center justify-center gap-1 md:flex">
            {leftNavLinks.map((link) => {
              const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
              const href = session?.user ? link.href : "/signup";
              return (
                <Link
                  key={link.href}
                  href={href}
                  className={`relative rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-orange-500 text-white shadow-sm"
                      : "text-gray-600 hover:text-gray-900 hover:bg-orange-50"
                  }`}
                >
                  {link.label}
                  {isActive && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white opacity-60" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Auth - right */}
          <div className="flex items-center gap-2">
            {session?.user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className={`flex items-center justify-center rounded-full w-9 h-9 border-2 transition-all duration-200 ${
                    dropdownOpen
                      ? "border-orange-500 bg-orange-500 text-white shadow-md"
                      : "border-orange-400 text-orange-500 hover:border-orange-500 hover:bg-orange-50"
                  }`}
                  aria-label="Account Menu"
                >
                  <User className="h-4 w-4" />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-52 rounded-xl bg-white shadow-lg border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                    {/* Dropdown header */}
                    <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide m-0">Account</p>
                    </div>
                    <div className="py-1">
                      <Link
                        href="/account"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors duration-150"
                      >
                        <Settings className="h-4 w-4 text-gray-400" />
                        Account Settings
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors duration-150"
                      >
                        <LogOut className="h-4 w-4 text-gray-400" />
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              rightNavLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
                    link.label === "Sign Up"
                      ? "bg-orange-500 text-white hover:bg-orange-600 shadow-sm"
                      : "text-gray-600 hover:text-gray-900 hover:bg-orange-50"
                  }`}
                >
                  {link.label}
                </Link>
              ))
            )}
          </div>

        </div>
      </div>
    </nav>
  );
}
