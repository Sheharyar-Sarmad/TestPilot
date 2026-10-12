"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useState, useSyncExternalStore } from "react";
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
} from "framer-motion";
import { House, Compass, Wrench, Menu } from "lucide-react";

import { GitHubIcon } from "@/components/icons/GithubIcon";
import { LinkedInIcon } from "@/components/icons/LinkedInIcon";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const NAV_LINKS = [
  { href: "/", label: "Home", icon: House },
  { href: "/about", label: "About", icon: Compass },
  { href: "/fix", label: "Fix Code", icon: Wrench },
];

const GITHUB_URL = "https://github.com/Sheharyar-Sarmad/TestPilot";
const LINKEDIN_URL = "https://www.linkedin.com/in/sheharyar-sarmad-9b7736289/";

/* ------------------------------------------------------------------ *
 * Design language
 *   Liquid glass  -> the bar itself (blur, saturation, specular sheen)
 *   Neumorphism   -> the nav tray (inset) and icon buttons (raised)
 *   Brutalism     -> hard borders + hard offset shadows on the logo,
 *                    the active link and the primary CTA
 * All tokens work in light and dark mode.
 * ------------------------------------------------------------------ */

const BRAND = "var(--brand,#22D3EE)";

// Neumorphic: raised surface (icon buttons)
const NEU_RAISED =
  "bg-neutral-100 dark:bg-neutral-800 " +
  "shadow-[4px_4px_9px_rgba(0,0,0,0.16),-4px_-4px_9px_rgba(255,255,255,0.9)] " +
  "dark:shadow-[4px_4px_9px_rgba(0,0,0,0.6),-3px_-3px_8px_rgba(255,255,255,0.06)] " +
  "active:shadow-[inset_3px_3px_6px_rgba(0,0,0,0.18),inset_-3px_-3px_6px_rgba(255,255,255,0.85)] " +
  "dark:active:shadow-[inset_3px_3px_6px_rgba(0,0,0,0.65),inset_-2px_-2px_5px_rgba(255,255,255,0.05)]";

// Neumorphic: pressed-in tray (nav links live inside it)
const NEU_INSET =
  "bg-neutral-200/70 dark:bg-black/30 " +
  "shadow-[inset_3px_3px_7px_rgba(0,0,0,0.14),inset_-3px_-3px_7px_rgba(255,255,255,0.85)] " +
  "dark:shadow-[inset_3px_3px_7px_rgba(0,0,0,0.65),inset_-2px_-2px_6px_rgba(255,255,255,0.05)]";

// Brutalist: hard border + hard shadow
const BRUTAL =
  "border-2 border-black dark:border-white " +
  "shadow-[3px_3px_0px_0px_#000] dark:shadow-[3px_3px_0px_0px_#fff]";

// Primary CTA: brutalist button that physically presses down
const CTA =
  `inline-flex items-center justify-center gap-2 rounded-xl text-sm font-bold text-black ` +
  `bg-[var(--brand,#22D3EE)] ${BRUTAL} ` +
  "transition-[transform,box-shadow] duration-150 ease-out " +
  "hover:translate-x-px hover:translate-y-px hover:shadow-[2px_2px_0px_0px_#000] dark:hover:shadow-[2px_2px_0px_0px_#fff] " +
  "active:translate-x-[3px] active:translate-y-[3px] active:shadow-none " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-black dark:focus-visible:ring-white dark:focus-visible:ring-offset-black";

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black dark:focus-visible:ring-white";

export function Navbar() {
  const pathname = usePathname() ?? "/";
  const { resolvedTheme } = useTheme();
  const reduceMotion = useReducedMotion();

  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious() ?? 0;
    const goingDown = latest > previous;
    setHidden(goingDown && latest > 120);
    setScrolled(latest > 8);
  });

  const logoSrc =
    mounted && resolvedTheme === "dark"
      ? "/logo_dark_theme.png"
      : "/logo_light_theme.png";

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const closeMobile = () => setMobileOpen(false);

  return (
    <motion.header
      initial={false}
      animate={{ y: hidden ? -110 : 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.35, ease: [0.4, 0, 0.2, 1] }}
      className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-6 pointer-events-none"
    >
      {/* Liquid-glass bar */}
      <div
        className={`pointer-events-auto relative mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 overflow-hidden rounded-2xl px-3 sm:px-4
          border-2 border-black dark:border-white/80
          backdrop-blur-2xl backdrop-saturate-150
          transition-[background-color,box-shadow] duration-300
          ${
            scrolled
              ? "bg-white/75 dark:bg-neutral-900/70 shadow-[5px_5px_0px_0px_#000] dark:shadow-[5px_5px_0px_0px_rgba(34,211,238,0.55)]"
              : "bg-white/45 dark:bg-neutral-900/40 shadow-[3px_3px_0px_0px_#000] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.35)]"
          }`}
      >
        {/* Specular sheen + brand glow (decorative) */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-b from-white/60 via-white/0 to-transparent dark:from-white/10"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-10 left-1/3 h-24 w-56 rounded-full opacity-30 blur-3xl"
          style={{ background: BRAND }}
        />

        {/* Brand */}
        <Link
          href="/"
          aria-label="TestPilot AI home"
          className={`group relative z-10 flex shrink-0 items-center gap-3 rounded-xl ${FOCUS}`}
        >
          <div
            className={`relative h-10 w-10 overflow-hidden rounded-xl bg-white dark:bg-neutral-900 ${BRUTAL} transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:-rotate-3`}
          >
            {mounted ? (
              <Image
                src={logoSrc}
                alt=""
                width={40}
                height={40}
                className="h-full w-full object-cover"
                priority
              />
            ) : (
              <div className="h-full w-full bg-muted" />
            )}
          </div>
          <span className="hidden text-lg font-extrabold tracking-tight text-neutral-900 dark:text-white sm:inline">
            TestPilot <span className="font-semibold text-neutral-500 dark:text-neutral-400">AI</span>
          </span>
        </Link>

        {/* Desktop nav: neumorphic inset tray, brutalist active pill */}
        <nav
          aria-label="Primary"
          className={`relative z-10 hidden items-center gap-1 rounded-2xl p-1.5 md:flex ${NEU_INSET}`}
        >
          {NAV_LINKS.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`group relative isolate inline-flex h-9 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors duration-200 ${FOCUS} ${
                  active
                    ? "text-black"
                    : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="nav-active-pill"
                    aria-hidden
                    transition={
                      reduceMotion
                        ? { duration: 0 }
                        : { type: "spring", stiffness: 420, damping: 34 }
                    }
                    className={`absolute inset-0 -z-10 rounded-xl border-2 border-black bg-[var(--brand,#22D3EE)] shadow-[2px_2px_0px_0px_#000] dark:shadow-[2px_2px_0px_0px_#fff]`}
                  />
                )}
                <Icon
                  className={`h-4 w-4 transition-transform duration-200 ${
                    active ? "" : "group-hover:scale-110"
                  }`}
                  strokeWidth={active ? 2.75 : 2}
                />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Actions */}
        <div className="relative z-10 flex items-center gap-2 sm:gap-3">
          {/* Raised neumorphic icon buttons */}
          <div className="hidden items-center gap-2 md:flex">
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              aria-label="TestPilot on GitHub"
              title="GitHub"
              className={`group inline-flex h-10 w-10 items-center justify-center rounded-xl text-neutral-700 transition-colors hover:text-black dark:text-neutral-300 dark:hover:text-white ${NEU_RAISED} ${FOCUS}`}
            >
              <GitHubIcon className="h-[18px] w-[18px] transition-transform duration-200 group-hover:scale-110" />
            </a>
            <a
              href={LINKEDIN_URL}
              target="_blank"
              rel="noreferrer"
              aria-label="Sheharyar on LinkedIn"
              title="LinkedIn"
              className={`group inline-flex h-10 w-10 items-center justify-center rounded-xl text-neutral-700 transition-colors hover:text-black dark:text-neutral-300 dark:hover:text-white ${NEU_RAISED} ${FOCUS}`}
            >
              <LinkedInIcon className="h-[18px] w-[18px] transition-transform duration-200 group-hover:scale-110" />
            </a>
          </div>

          <ThemeToggle />

          <Link href="/fix" className={`${CTA} hidden h-10 px-5 lg:inline-flex`}>
            <Wrench className="h-4 w-4" strokeWidth={2.5} />
            Fix code
          </Link>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={`h-10 w-10 rounded-xl text-neutral-800 hover:bg-neutral-100 dark:text-white dark:hover:bg-neutral-800 md:hidden ${NEU_RAISED} ${FOCUS}`}
            aria-label="Open menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetContent
              side="right"
              className="w-[88%] max-w-sm !p-0 border-l-2 border-black bg-white/85 backdrop-blur-2xl dark:border-white dark:bg-neutral-950/85 shadow-[-6px_0px_0px_0px_#000] dark:shadow-[-6px_0px_0px_0px_rgba(34,211,238,0.45)]"
            >
              <SheetHeader className="border-b-2 border-black/10 px-6 pb-4 pt-6 dark:border-white/15">
                <SheetTitle className="flex items-center gap-3 text-left">
                  <div className={`relative h-9 w-9 overflow-hidden rounded-xl bg-white dark:bg-neutral-900 ${BRUTAL}`}>
                    {mounted && (
                      <Image
                        src={logoSrc}
                        alt=""
                        width={36}
                        height={36}
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <span className="text-lg font-extrabold tracking-tight text-neutral-900 dark:text-white">
                    TestPilot AI
                  </span>
                </SheetTitle>
              </SheetHeader>

              <nav
                aria-label="Mobile"
                className="flex flex-col gap-3 p-6"
              >
                <div className={`flex flex-col gap-1.5 rounded-2xl p-2 ${NEU_INSET}`}>
                  {NAV_LINKS.map(({ href, label, icon: Icon }) => {
                    const active = isActive(href);
                    return (
                      <Link
                        key={href}
                        href={href}
                        onClick={closeMobile}
                        aria-current={active ? "page" : undefined}
                        className={`inline-flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${FOCUS} ${
                          active
                            ? `border-2 border-black bg-[var(--brand,#22D3EE)] text-black shadow-[3px_3px_0px_0px_#000] dark:shadow-[3px_3px_0px_0px_#fff]`
                            : "text-neutral-700 hover:bg-white/60 dark:text-neutral-300 dark:hover:bg-white/5"
                        }`}
                      >
                        <Icon className="h-4 w-4" strokeWidth={active ? 2.75 : 2} />
                        <span>{label}</span>
                      </Link>
                    );
                  })}
                </div>

                <div className="mt-2 grid grid-cols-2 gap-3">
                  <a
                    href={GITHUB_URL}
                    target="_blank"
                    rel="noreferrer"
                    className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-neutral-800 dark:text-neutral-200 ${NEU_RAISED} ${FOCUS}`}
                  >
                    <GitHubIcon className="h-4 w-4" />
                    GitHub
                  </a>
                  <a
                    href={LINKEDIN_URL}
                    target="_blank"
                    rel="noreferrer"
                    className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-neutral-800 dark:text-neutral-200 ${NEU_RAISED} ${FOCUS}`}
                  >
                    <LinkedInIcon className="h-4 w-4" />
                    LinkedIn
                  </a>
                </div>
              </nav>

              <div className="mt-auto px-6 pb-6">
                <Link
                  href="/fix"
                  onClick={closeMobile}
                  className={`${CTA} h-12 w-full`}
                >
                  <Wrench className="h-4 w-4" strokeWidth={2.5} />
                  Fix code
                </Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </motion.header>
  );
}