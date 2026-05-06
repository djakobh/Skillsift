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
        background: 'rgba(255, 255, 255, 0.80)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow: '0 8px 40px rgba(0, 0, 0, 0.18)',
        position: pathname === '/' ? 'relative' : 'sticky',
        top: pathname === '/' ? undefined : 0,
        zIndex: 50,
      }}
    >
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo - left */}
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
          <div className="hidden flex-1 items-center justify-center space-x-1 md:flex">
            {leftNavLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded px-3 py-2 transition-colors ${
                  pathname === link.href
                    ? "bg-orange-500 text-white"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Auth - right */}
          <div className="flex items-center space-x-3">
            {session?.user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center justify-center rounded-full border-2 border-orange-500 p-2 text-orange-500 transition-colors hover:bg-orange-50 dark:hover:bg-orange-950"
                  aria-label="Account Menu"
                >
                  <User className="h-5 w-5" />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-md bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 dark:ring-gray-700">
                    <div className="py-1">
                      <Link
                        href="/account"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <Settings className="mr-3 h-4 w-4" />
                        Account Settings
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="flex w-full items-center px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
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
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
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
