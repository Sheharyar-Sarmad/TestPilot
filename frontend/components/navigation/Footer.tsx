import Link from "next/link";
import { CurrentYear } from "@/components/ui/CurrentYear";
import { GitHubIcon } from "@/components/icons/GithubIcon";
import { LinkedInIcon } from "@/components/icons/LinkedInIcon";
import { Terminal, ShieldCheck, Wrench } from "lucide-react";

export function Footer() {
  return (
    <footer className="relative mt-auto font-mono text-foreground overflow-hidden transition-colors duration-500">
      {/* Semi-transparent backdrop so the scene shows through */}
      <div className="absolute inset-0 bg-background/60 backdrop-blur-lg pointer-events-none" />

      {/* Brutalist: Heavy top border with neon glow */}
      <div className="relative z-10 border-t-4 border-[var(--brand,#22D3EE)] shadow-[0_-4px_20px_rgba(34,211,238,0.15)]">
        <div className="max-w-6xl mx-auto px-6 py-12">

          {/* MAIN GRID */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-8 mb-12">

            {/* COLUMN 1: BRAND (Spans 2 cols on desktop) */}
            <div className="md:col-span-2 space-y-4">
              <Link href="/" className="inline-flex items-center gap-3 group">
                <div className="w-8 h-8 bg-brand flex items-center justify-center border-2 border-foreground shadow-[3px_3px_0px_0px_var(--foreground)] group-hover:translate-x-[1px] group-hover:translate-y-[1px] group-hover:shadow-[1px_1px_0px_0px_var(--foreground)] transition-all">
                  <Terminal className="w-4 h-4 text-background" />
                </div>
                <span className="font-black tracking-tighter text-2xl uppercase">
                  TestPilot AI
                </span>
              </Link>
              <p className="text-xs text-foreground/60 uppercase tracking-widest max-w-xs leading-relaxed">
                One file. One fix. Verified. <br />
                Autonomous multi-agent code repair.
              </p>

              {/* Brutalist Status Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/50 shadow-[2px_2px_0px_0px_#22c55e]">
                <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-green-600 dark:text-green-400">
                  System Status: Operational
                </span>
              </div>
            </div>

            {/* COLUMN 2: NAVIGATION */}
            <div className="space-y-4">
              <h4 className="text-[10px] font-bold text-foreground/40 uppercase tracking-[0.2em]">
                &gt; Navigation
              </h4>
              <ul className="space-y-2 text-xs font-bold uppercase tracking-wider">
                <li>
                  <Link href="/" className="text-foreground/70 hover:text-brand transition-colors inline-flex items-center gap-2 group">
                    <span className="w-1.5 h-1.5 bg-foreground/30 group-hover:bg-brand transition-colors" />
                    Home
                  </Link>
                </li>
                <li>
                  <Link href="/about" className="text-foreground/70 hover:text-brand transition-colors inline-flex items-center gap-2 group">
                    <span className="w-1.5 h-1.5 bg-foreground/30 group-hover:bg-brand transition-colors" />
                    About
                  </Link>
                </li>
                <li>
                  <Link href="/fix" className="text-foreground/70 hover:text-brand transition-colors inline-flex items-center gap-2 group">
                    <span className="w-1.5 h-1.5 bg-foreground/30 group-hover:bg-brand transition-colors" />
                    Fix Code
                  </Link>
                </li>
                <li>
                  <Link href="/about#privacy" className="text-foreground/70 hover:text-brand transition-colors inline-flex items-center gap-2 group">
                    <span className="w-1.5 h-1.5 bg-foreground/30 group-hover:bg-brand transition-colors" />
                    Privacy
                  </Link>
                </li>
              </ul>
            </div>

            {/* COLUMN 3: CONNECT */}
            <div className="space-y-4">
              <h4 className="text-[10px] font-bold text-foreground/40 uppercase tracking-[0.2em]">
                &gt; Connect
              </h4>
              <div className="flex flex-col gap-3">
                <a
                  href="https://github.com/Sheharyar-Sarmad/TestPilot"
                  target="_blank"
                  rel="noreferrer"
                  className="group inline-flex items-center justify-between px-4 py-3 bg-foreground/[0.04] hover:bg-foreground/[0.08] border border-foreground/15 hover:border-brand/50 rounded-lg transition-all duration-300"
                >
                  <span className="flex items-center gap-3 text-xs font-bold uppercase tracking-wider text-foreground/70 group-hover:text-foreground">
                    <GitHubIcon className="w-4 h-4" />
                    GitHub
                  </span>
                  <span className="text-foreground/40 group-hover:text-brand transition-colors">&rarr;</span>
                </a>

                <a
                  href="https://www.linkedin.com/in/sheharyar-sarmad-9b7736289/"
                  target="_blank"
                  rel="noreferrer"
                  className="group inline-flex items-center justify-between px-4 py-3 bg-foreground/[0.04] hover:bg-foreground/[0.08] border border-foreground/15 hover:border-brand/50 rounded-lg transition-all duration-300"
                >
                  <span className="flex items-center gap-3 text-xs font-bold uppercase tracking-wider text-foreground/70 group-hover:text-foreground">
                    <LinkedInIcon className="w-4 h-4" />
                    LinkedIn
                  </span>
                  <span className="text-foreground/40 group-hover:text-brand transition-colors">&rarr;</span>
                </a>
              </div>
            </div>
          </div>

          {/* BOTTOM BAR */}
          <div className="pt-6 border-t border-foreground/10 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/50 flex items-center gap-2">
              © <CurrentYear /> TestPilot AI
              <span className="text-foreground/30">|</span>
              <span className="text-brand/80">Built for developers</span>
            </p>

            <Link
              href="/fix"
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand text-background text-[10px] font-black uppercase tracking-widest border-2 border-foreground shadow-[3px_3px_0px_0px_var(--foreground)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_0px_var(--foreground)] transition-all duration-150"
            >
              <Wrench className="w-3 h-3" />
              Start Fixing
            </Link>
          </div>

        </div>
      </div>
    </footer>
  );
}