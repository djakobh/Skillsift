"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useSession } from "next-auth/react";

type ThemeContextType = {
  isDark: boolean;
  toggle: () => void;
};

const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  toggle: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);
  const { data: session } = useSession();

  // On mount: read from localStorage so dark mode applies before any DB fetch
  useEffect(() => {
    const stored = localStorage.getItem("skillsift-theme");
    if (stored === "dark") {
      setIsDark(true);
      document.documentElement.classList.add("dark");
    } else if (stored === "light") {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  // When user is authenticated, sync from DB and update localStorage
  useEffect(() => {
    if (!session?.user?.email) return;
    fetch("/api/account/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { prefersDarkMode?: boolean } | null) => {
        if (data && typeof data.prefersDarkMode === "boolean") {
          setIsDark(data.prefersDarkMode);
          document.documentElement.classList.toggle("dark", data.prefersDarkMode);
          localStorage.setItem("skillsift-theme", data.prefersDarkMode ? "dark" : "light");
        }
      })
      .catch(() => {});
  }, [session?.user?.email]);

  const toggle = async () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("skillsift-theme", next ? "dark" : "light");

    if (session?.user) {
      try {
        await fetch("/api/account/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prefersDarkMode: next }),
        });
      } catch {
        // silently fail — preference is already saved in localStorage
      }
    }
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
