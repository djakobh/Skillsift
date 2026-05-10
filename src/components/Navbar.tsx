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

  // Close dropdown when clicking outside
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
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/" });
  };

  const leftNavLinks = [
    { href: "/resume", label: "Resume Scanner", id: "nav-resume" },
    { href: "/interview/behavioral", label: "Behavioral", id: "nav-behavioral" },
    { href: "/technical", label: "Technical", id: "nav-technical" },
    { href: "/jobs", label: "Job Tracker", id: "nav-jobs" },
    { href: "/history", label: "History", id: "nav-history" },
  ];

  const rightNavLinks = [
    { href: "/signup", label: "Sign Up" },
    { href: "/login", label: "Login" },
  ];

  return (
    <nav className="bg-white shadow-md mb-12">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Left Side - Logo and Nav Links */}
          <div className="flex items-center space-x-6">
            <Link href="/" className="flex items-center">
              <Image
                src="/images/landing/skill-skift-card.png"
                alt="SkillSift Logo"
                width={100}
                height={40}
                className="object-contain"
              />
            </Link>
            <div className="hidden space-x-4 md:flex">
              {leftNavLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  id={link.id}
                  className={`rounded px-3 py-2 transition-colors ${
                    pathname === link.href
                      ? "bg-orange-500 text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Right Side - Auth Links */}
          <div className="flex items-center space-x-4">
            {session?.user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  id="nav-account"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center justify-center rounded-full border-2 border-orange-500 p-2 text-orange-500 transition-colors hover:bg-orange-50"
                  aria-label="Account Menu"
                >
                  <User className="h-5 w-5" />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5">
                    <div className="py-1">
                      <Link
                        href="/account"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <Settings className="mr-3 h-4 w-4" />
                        Account Settings
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="flex w-full items-center px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <LogOut className="mr-3 h-4 w-4" />
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
                  className={`rounded px-4 py-2 transition-colors ${
                    pathname === link.href
                      ? "bg-orange-500 text-white"
                      : link.label === "Sign Up"
                        ? "bg-orange-500 text-white hover:bg-orange-600"
                        : "text-gray-700 hover:bg-gray-100"
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
