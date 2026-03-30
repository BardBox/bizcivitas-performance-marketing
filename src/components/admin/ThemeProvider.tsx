"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

type Theme = "dark" | "light" | "system";

const STORAGE_KEY = "bizcivitas_admin_settings";

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: "dark" | "light";
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  resolvedTheme: "dark",
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return (parsed.theme as Theme) || "dark";
  } catch {
    return "dark";
  }
}

function getSystemTheme(): "dark" | "light" {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(resolved: "dark" | "light") {
  const html = document.documentElement;
  if (resolved === "dark") {
    html.classList.add("dark");
  } else {
    html.classList.remove("dark");
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [resolvedTheme, setResolvedTheme] = useState<"dark" | "light">("dark");

  const resolve = useCallback((t: Theme): "dark" | "light" => {
    return t === "system" ? getSystemTheme() : t;
  }, []);

  /* Bootstrap from localStorage on mount */
  useEffect(() => {
    const stored = getStoredTheme();
    const resolved = resolve(stored);
    setThemeState(stored);
    setResolvedTheme(resolved);
    applyTheme(resolved);
  }, [resolve]);

  /* Listen for system preference changes when theme is "system" */
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (theme === "system") {
        const resolved = getSystemTheme();
        setResolvedTheme(resolved);
        applyTheme(resolved);
      }
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  /* Listen for settings changes from other tabs or the settings page */
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      try {
        const parsed = e.newValue ? JSON.parse(e.newValue) : {};
        const newTheme: Theme = parsed.theme || "dark";
        const resolved = resolve(newTheme);
        setThemeState(newTheme);
        setResolvedTheme(resolved);
        applyTheme(resolved);
      } catch {}
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [resolve]);

  const setTheme = useCallback(
    (t: Theme) => {
      // Persist inside the existing settings object
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const existing = raw ? JSON.parse(raw) : {};
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...existing, theme: t }));
      } catch {}
      const resolved = resolve(t);
      setThemeState(t);
      setResolvedTheme(resolved);
      applyTheme(resolved);
    },
    [resolve]
  );

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
