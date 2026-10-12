"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";

/**
 * Smooth scrolling for the whole app.
 * - Skipped entirely when the user prefers reduced motion.
 * - Driven by GSAP's ticker so Lenis and any GSAP animation share one frame loop.
 * - Uses `autoRaf: false` so Lenis does NOT create its own RAF loop.
 */
export function LenisProvider({ children }: { children: ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    // Respect reduced motion preference
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({
      duration: 1.2,                          // slightly longer for smoother feel
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // expo ease-out
      smoothWheel: true,
      wheelMultiplier: 1.0,                   // natural wheel speed
      touchMultiplier: 1.5,                   // slightly faster on touch
      infinite: false,
      autoRaf: false,                         // driven by GSAP ticker
    });

    lenisRef.current = lenis;

    // Sync Lenis with GSAP's ticker
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    // Optional: expose lenis on window for debugging
    // (window as any).__lenis = lenis;

    return () => {
      gsap.ticker.remove(tick);
      gsap.ticker.lagSmoothing(500, 33); // restore GSAP defaults
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  return <>{children}</>;
}

export default LenisProvider;