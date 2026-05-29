"use client";

import { useTheme } from "@/components/shared/ThemeProvider";
import { useSyncExternalStore } from "react";
import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";

const subscribe = () => () => {};

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);

  const toggle = () => setTheme(resolvedTheme === "dark" ? "light" : "dark");

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggle}
      aria-label={mounted ? `Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode` : "Toggle theme"}
      className="h-9 w-9 p-0 rounded-full hover:bg-accent hover:scale-110 active:scale-95 transition-all"
    >
      {mounted ? (
        resolvedTheme === "dark"
          ? <Sun className="h-4.5 w-4.5 text-yellow-400" />
          : <Moon className="h-4.5 w-4.5 text-primary" />
      ) : (
        <span className="h-4 w-4 block" />
      )}
    </Button>
  );
}
