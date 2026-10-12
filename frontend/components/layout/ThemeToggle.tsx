"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="w-9 h-9" aria-hidden />;

  const isDark = resolvedTheme === "dark";

  const toggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    const newTheme = isDark ? "light" : "dark";
    const x = e.clientX;
    const y = e.clientY;

    // Fallback for browsers without View Transitions
    if (!document.startViewTransition) {
      setTheme(newTheme);
      return;
    }

    const transition = document.startViewTransition(() => {
      setTheme(newTheme);
    });

    transition.ready.then(() => {
      const radius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y)
      );

      // EXACT original smooth radial wipe
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${radius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 650,
          easing: "ease-in-out",
          pseudoElement: "::view-transition-new(root)",
        }
      );
    });
  };

  return (
    <button
      type="button"
      aria-label="Toggle theme"
      onClick={toggle}
      className="group relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-none border-2 border-foreground/80 bg-transparent text-foreground shadow-[3px_3px_0_0_currentColor] transition-all duration-300 ease-out hover:-translate-x-[2px] hover:-translate-y-[2px] hover:bg-foreground hover:text-background hover:shadow-[6px_6px_0_0_currentColor] active:translate-x-[3px] active:translate-y-[3px] active:bg-foreground active:text-background active:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {/* Brutalist hard background wipe */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 origin-left scale-x-0 bg-foreground transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100 group-active:scale-x-100"
      />

      {/* Energetic & Smooth Icon Swap */}
      <Sun
        className={`absolute h-4 w-4 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] will-change-transform group-hover:text-background group-active:text-background ${
          isDark
            ? "rotate-0 scale-100 opacity-100"
            : "rotate-90 scale-0 opacity-0"
        }`}
      />
      <Moon
        className={`absolute h-4 w-4 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] will-change-transform group-hover:text-background group-active:text-background ${
          isDark
            ? "-rotate-90 scale-0 opacity-0"
            : "rotate-0 scale-100 opacity-100"
        }`}
      />
    </button>
  );
}