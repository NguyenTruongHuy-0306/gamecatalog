"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  useSyncExternalStore,
} from "react";

type Theme = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

const MEDIA = "(prefers-color-scheme: dark)";
export const THEME_STORAGE_KEY = "theme";

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "system",
  resolvedTheme: "light",
  setTheme: () => {},
});

// Subscribe to the system prefers-color-scheme media query
const mediaSubscribe = (cb: () => void) => {
  const mq = window.matchMedia(MEDIA);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
const mediaSnapshot = () => (window.matchMedia(MEDIA).matches ? "dark" : "light") as ResolvedTheme;
const mediaServerSnapshot = () => "light" as ResolvedTheme;

function applyTheme(resolved: ResolvedTheme, animate = false) {
  const root = document.documentElement;
  if (animate) {
    root.classList.add("theme-transitioning");
    root.classList.remove("light", "dark");
    root.classList.add(resolved);
    root.style.colorScheme = resolved;
    setTimeout(() => root.classList.remove("theme-transitioning"), 350);
  } else {
    // Suppress transitions on initial load to prevent a flash
    const style = document.createElement("style");
    style.textContent = "*,*::before,*::after{transition:none!important}";
    document.head.appendChild(style);
    root.classList.remove("light", "dark");
    root.classList.add(resolved);
    root.style.colorScheme = resolved;
    window.getComputedStyle(root); // force layout flush
    setTimeout(() => document.head.removeChild(style), 1);
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Lazy initializer reads localStorage — runs only on the client (safe for SSR)
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return "system";
    try {
      return (localStorage.getItem(THEME_STORAGE_KEY) as Theme) || "system";
    } catch {
      return "system";
    }
  });

  // Derive system preference via useSyncExternalStore — no setState in any effect
  const systemTheme = useSyncExternalStore(
    mediaSubscribe,
    mediaSnapshot,
    mediaServerSnapshot,
  );
  const resolvedTheme: ResolvedTheme =
    theme === "system" ? systemTheme : (theme as ResolvedTheme);

  const isFirstApply = useRef(true);

  // Apply theme class to <html>; pure DOM side-effect, no setState needed
  useEffect(() => {
    const animate = !isFirstApply.current;
    isFirstApply.current = false;
    applyTheme(resolvedTheme, animate);
  }, [resolvedTheme]);

  const setTheme = useCallback((t: Theme) => {
    try { localStorage.setItem(THEME_STORAGE_KEY, t); } catch {}
    setThemeState(t);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
