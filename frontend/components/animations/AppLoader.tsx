"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { gsap } from "gsap";

const useIso = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/* ---------------------------- tuning knobs ---------------------------- */
const COLS = 8; // stairs
const NAV_SPEED = 1.35; // route-change playback speed (1 = same as first load)
const TITLE = "TestPilot AI";
const TAGLINE = "One file. One fix. Verified.";
const LOG = [
  "boot testpilot.core",
  "mount sandbox  [isolated]",
  "load analyzers  rootcause / diff / structure",
  "ready",
];
const CHECKS = ["Root cause", "Line diff", "Sandbox verified", "Structure map"];
const V_LINES = [16.6, 33.3, 50, 66.6, 83.3];
const H_LINES = [33.3, 66.6];

type Mode = "first" | "nav";

/* ====================================================================== */
/* One full cinematic run. Mount = play, onDone = unmount.                */
/* ====================================================================== */
function Stage({
  mode,
  pathname,
  logoSrc,
  mounted,
  onDone,
}: {
  mode: Mode;
  pathname: string;
  logoSrc: string;
  mounted: boolean;
  onDone: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const done = useRef(onDone);
  done.current = onDone;

  useIso(() => {
    const el = root.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const ctx = gsap.context(() => {
      /* ---- reduced motion: no choreography, just a short fade ---- */
      if (reduce) {
        gsap.set(".ld-in", { opacity: 1 });
        gsap.to(el, { opacity: 0, delay: 0.7, duration: 0.4, onComplete: () => done.current() });
        return;
      }

      const q = <T extends HTMLElement>(s: string) => el.querySelector<T>(s)!;
      const tl = gsap.timeline({
        defaults: { ease: "power3.out" },
        onComplete: () => done.current(),
      });
      const typeInto = (node: HTMLElement, text: string, at: number, dur: number, prefix = "") => {
        const o = { n: 0 };
        tl.to(o, {
          n: text.length,
          duration: dur,
          ease: "none",
          onUpdate: () => { node.textContent = prefix + text.slice(0, Math.round(o.n)); },
        }, at);
      };

      /* ---- SCENE 0 (route changes only): the stairs rise to cover ---- */
      let t = 0.1;
      if (mode === "nav") {
        tl.fromTo(".ld-stair", { yPercent: 100 }, { yPercent: 0, duration: 0.8, stagger: 0.06, ease: "power3.inOut" }, 0);
        t = 0.75;
      }

      /* ---- SCENE 1: blueprint grid draws, corners lock in, scanner sweeps ---- */
      tl.fromTo(".ld-v", { scaleY: 0, opacity: 0 }, { scaleY: 1, opacity: 1, duration: 1, stagger: 0.08, ease: "power2.inOut", transformOrigin: "top" }, t)
        .fromTo(".ld-h", { scaleX: 0, opacity: 0 }, { scaleX: 1, opacity: 1, duration: 1, stagger: 0.12, ease: "power2.inOut", transformOrigin: "left" }, t + 0.1)
        .fromTo(".ld-corner",
          { opacity: 0, x: (_: number, n: HTMLElement) => Number(n.dataset.x) * 30, y: (_: number, n: HTMLElement) => Number(n.dataset.y) * 30 },
          { opacity: 1, x: 0, y: 0, duration: 0.7, stagger: 0.07, ease: "back.out(2)" }, t + 0.15)
        .to(".ld-hud", { opacity: 1, duration: 0.5, stagger: 0.1 }, t + 0.4)
        .fromTo(".ld-scan", { opacity: 1, top: "0%" }, { top: "100%", duration: 1.3, ease: "power1.inOut", repeat: 1, yoyo: true }, t + 0.8);

      // boot log types itself out line by line
      LOG.forEach((txt, i) => {
        const node = q(`[data-log="${i}"]`);
        const at = t + 0.3 + i * 0.45;
        tl.to(node, { opacity: 1, duration: 0.1 }, at);
        typeInto(node, txt, at, 0.4, "> ");
      });

      /* ---- SCENE 2: logo slams in with ghost layers, glitch, title letters rise ---- */
      const s = t + 1.0;
      tl.fromTo(".ld-logo", { opacity: 0, scale: 0.3, rotate: -14 }, { opacity: 1, scale: 1, rotate: 0, duration: 0.9, ease: "back.out(1.8)" }, s)
        .fromTo(".ld-ghost", { opacity: 0, x: 0, y: 0 },
          { opacity: 1, x: (_: number, n: HTMLElement) => Number(n.dataset.d), y: (_: number, n: HTMLElement) => Number(n.dataset.d), duration: 0.6, stagger: 0.1, ease: "back.out(2.4)" }, s + 0.2)
        .to(".ld-logo", {
          keyframes: [
            { x: -7, skewX: 9, duration: 0.05 },
            { x: 6, skewX: -7, duration: 0.05 },
            { x: -3, skewX: 3, duration: 0.05 },
            { x: 0, skewX: 0, duration: 0.06 },
          ],
        }, s + 0.85)
        .fromTo(".ld-letter", { opacity: 0, yPercent: 115 }, { opacity: 1, yPercent: 0, duration: 0.8, stagger: 0.045, ease: "power4.out" }, s + 0.45)
        .fromTo(".ld-rule", { opacity: 0, scaleX: 0 }, { opacity: 1, scaleX: 1, duration: 0.7, transformOrigin: "left", ease: "power3.inOut" }, s + 0.95)
        .to(".ld-tag", { opacity: 1, duration: 0.1 }, s + 1.05)
        .to(".ld-bar", { opacity: 1, duration: 0.4 }, s + 0.9)
        .to(".ld-count", { opacity: 1, duration: 0.5 }, s + 0.7);
      typeInto(q(".ld-tag"), TAGLINE, s + 1.05, 0.9);

      // progress: big counter + segmented bar share one eased value
      const num = q(".ld-num");
      const fill = q(".ld-fill");
      const p = { n: 0 };
      tl.to(p, {
        n: 100,
        duration: 2.4,
        ease: "power2.inOut",
        onUpdate: () => {
          num.textContent = String(Math.round(p.n)).padStart(3, "0");
          fill.style.transform = `scaleX(${p.n / 100})`;
        },
      }, s + 0.7);

      /* ---- SCENE 3: verification stamps slam down one by one ---- */
      CHECKS.forEach((_, i) => {
        const at = s + 1.4 + i * 0.4;
        tl.fromTo(`[data-chip="${i}"]`, { opacity: 0, scale: 2.2, rotate: -10 },
          { opacity: 1, scale: 1, rotate: 0, duration: 0.45, ease: "back.out(2.6)" }, at)
          .fromTo(`[data-chip="${i}"] .ld-check`, { strokeDashoffset: 24 }, { strokeDashoffset: 0, duration: 0.3, ease: "power2.out" }, at + 0.25)
          .fromTo(".ld-center", { y: 0 }, { y: 4, duration: 0.05, yoyo: true, repeat: 1, ease: "none" }, at + 0.1);
      });

      /* ---- SCENE 4: flash, content blows out, stairs lift to reveal the app ---- */
      const e = s + 3.4;
      tl.to(".ld-flash", { opacity: 0.45, duration: 0.12, ease: "none" }, e)
        .to(".ld-flash", { opacity: 0, duration: 0.4 }, e + 0.12)
        .to(".ld-center", { scale: 1.12, opacity: 0, filter: "blur(8px)", duration: 0.6, ease: "power2.in" }, e)
        .to(".ld-hud, .ld-log, .ld-count, .ld-v, .ld-h, .ld-corner, .ld-scan", { opacity: 0, duration: 0.45 }, e)
        .to(".ld-stair", { yPercent: -100, duration: 0.95, stagger: 0.07, ease: "power4.inOut" }, e + 0.4);

      if (mode === "nav") tl.timeScale(NAV_SPEED);
    }, el);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={root}
      role="status"
      aria-live="polite"
      aria-label="Loading"
      className="fixed inset-0 z-[100] overflow-hidden text-foreground"
    >
      {/* stairs (cover + final reveal) */}
      <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }} aria-hidden>
        {Array.from({ length: COLS }).map((_, i) => (
          <div
            key={i}
            className="ld-stair h-full border-t-4 border-brand border-r border-r-foreground/20 bg-background will-change-transform last:border-r-0"
          />
        ))}
      </div>

      {/* blueprint grid */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        {V_LINES.map((l) => (
          <div key={l} className="ld-v ld-in absolute top-0 h-full w-px bg-foreground/10 opacity-0" style={{ left: `${l}%` }} />
        ))}
        {H_LINES.map((l) => (
          <div key={l} className="ld-h ld-in absolute left-0 h-px w-full bg-foreground/10 opacity-0" style={{ top: `${l}%` }} />
        ))}
        <div className="ld-scan ld-in absolute left-0 top-0 h-[2px] w-full bg-brand opacity-0 shadow-[0_0_24px_4px_var(--brand)]" />
        <div className="ld-corner ld-in absolute left-5 top-5 h-8 w-8 border-l-[3px] border-t-[3px] border-brand opacity-0" data-x="-1" data-y="-1" />
        <div className="ld-corner ld-in absolute right-5 top-5 h-8 w-8 border-r-[3px] border-t-[3px] border-brand opacity-0" data-x="1" data-y="-1" />
        <div className="ld-corner ld-in absolute bottom-5 left-5 h-8 w-8 border-b-[3px] border-l-[3px] border-brand opacity-0" data-x="-1" data-y="1" />
        <div className="ld-corner ld-in absolute bottom-5 right-5 h-8 w-8 border-b-[3px] border-r-[3px] border-brand opacity-0" data-x="1" data-y="1" />
      </div>

      {/* HUD */}
      <p className="ld-hud ld-in absolute left-14 top-6 font-mono text-xs font-semibold opacity-0">testpilot / boot</p>
      <p className="ld-hud ld-in absolute right-14 top-6 max-w-[40vw] truncate font-mono text-xs text-muted-foreground opacity-0">
        route {pathname}
      </p>
      <div className="ld-log absolute bottom-7 left-14 hidden space-y-1 font-mono text-xs text-muted-foreground sm:block" aria-hidden>
        {LOG.map((_, i) => (
          <span key={i} data-log={i} className="ld-in block h-4 opacity-0" />
        ))}
      </div>
      <div
        className="ld-count ld-in absolute bottom-4 right-8 flex items-baseline gap-1 font-bold leading-none tracking-tighter opacity-0"
        aria-hidden
      >
        <span
          className="ld-num text-[clamp(56px,13vw,150px)] tabular-nums text-transparent"
          style={{ WebkitTextStroke: "2px var(--foreground)", textShadow: "5px 5px 0 var(--brand)" }}
        >
          000
        </span>
      </div>

      {/* center stack */}
      <div className="ld-center absolute inset-0 grid place-items-center px-4">
        <div className="flex flex-col items-center gap-5 text-center">
          <div className="relative h-24 w-24">
            <div className="ld-ghost ld-in absolute inset-0 border-[3px] border-foreground bg-foreground opacity-0" data-d="20" />
            <div className="ld-ghost ld-in absolute inset-0 border-[3px] border-foreground bg-brand opacity-0" data-d="10" />
            <div className="ld-logo ld-in relative grid h-full w-full place-items-center border-[3px] border-foreground bg-background opacity-0">
              {mounted && <Image src={logoSrc} alt="TestPilot AI" width={64} height={64} priority />}
            </div>
          </div>

          <h2 className="overflow-hidden pb-1 text-4xl font-bold leading-none tracking-tighter sm:text-6xl" aria-label={TITLE}>
            {TITLE.split("").map((c, i) => (
              <span key={i} className="ld-letter ld-in inline-block opacity-0" aria-hidden>
                {c === " " ? "\u00A0" : c}
              </span>
            ))}
          </h2>

          <div className="ld-rule ld-in h-1 w-40 bg-brand opacity-0" />
          <p className="ld-tag ld-in h-5 font-mono text-sm text-muted-foreground opacity-0" />

          <div className="ld-bar ld-in w-[min(80vw,420px)] border-[3px] border-foreground bg-background p-1 opacity-0 shadow-[6px_6px_0_var(--brand)]" aria-hidden>
            <div className="relative h-4 overflow-hidden">
              <div
                className="ld-fill absolute inset-0 bg-brand"
                style={{
                  transform: "scaleX(0)",
                  transformOrigin: "left",
                  WebkitMaskImage: "repeating-linear-gradient(90deg,#000 0 14px,transparent 14px 18px)",
                  maskImage: "repeating-linear-gradient(90deg,#000 0 14px,transparent 14px 18px)",
                }}
              />
            </div>
          </div>

          <ul className="flex max-w-[520px] flex-wrap justify-center gap-2" aria-hidden>
            {CHECKS.map((c, i) => (
              <li
                key={c}
                data-chip={i}
                className="ld-in inline-flex items-center gap-2 border-2 border-foreground bg-background px-3 py-1.5 font-mono text-xs font-semibold opacity-0 shadow-[3px_3px_0_var(--brand)]"
              >
                <svg width="14" height="14" viewBox="0 0 16 16">
                  <path
                    className="ld-check"
                    d="M3 8.5l3.2 3L13 4.5"
                    fill="none"
                    stroke="var(--brand)"
                    strokeWidth="2.6"
                    strokeLinecap="square"
                    pathLength={24}
                    strokeDasharray={24}
                    strokeDashoffset={24}
                  />
                </svg>
                {c}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="ld-flash pointer-events-none absolute inset-0 bg-brand opacity-0" aria-hidden />
    </div>
  );
}

/* ====================================================================== */
/* Controller: plays ONLY on first load or hard reload.                   */
/* ====================================================================== */
export function AppLoader() {
  const pathname = usePathname();
  const { resolvedTheme } = useTheme();

  // true on the client, false during SSR/hydration
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  // Starts active so the very first paint is already covered (no content flash).
  // Because this is the initial state, it only runs on full page load/reload.
  const [run, setRun] = useState<{ id: number; mode: Mode } | null>({ id: 0, mode: "first" });

  // Removed the route-change detection effect entirely.
  // This means navigating between pages in Next.js will NOT trigger the loader.

  // Lock page scroll while the loader is up.
  useEffect(() => {
    if (!run) return;
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = before;
    };
  }, [run]);

  if (!run) return null;

  return (
    <Stage
      key={run.id}
      mode={run.mode}
      pathname={pathname}
      mounted={mounted}
      logoSrc={resolvedTheme === "dark" ? "/logo_dark_theme.png" : "/logo_light_theme.png"}
      onDone={() => setRun(null)}
    />
  );
}