"use client";

import { motion } from "framer-motion";
import { Terminal, ArrowUpRight, Wrench } from "lucide-react";

const GITHUB_URL = "https://github.com/your-username/testpilot-ai"; // TODO: replace
const FIXER_URL = "/fixer"; // TODO: replace with your fixer route

const LINES = [
  "> Initializing LangGraph...",
  "> Diagnosing root cause...",
  "> Fix verified. Verdict: PASSED.",
];
const CHAR_DELAY = 0.04;
const LINE_PAUSE = 0.6;

let cursor = 0.6;
const TYPED = LINES.map((line) => {
  const chars = line
    .split("")
    .map((char, i) => ({ char, delay: cursor + i * CHAR_DELAY }));
  cursor += line.length * CHAR_DELAY + LINE_PAUSE;
  return chars;
});

export default function HeroSectionAbout() {
  return (
    <section className="relative grid items-center gap-12 pt-20 pb-12 lg:grid-cols-2">
      {" "}
      <div>
        <span className="inline-block border-4 border-foreground bg-background/70 px-3 py-1 font-mono text-xs uppercase tracking-widest text-brand shadow-[6px_6px_0px_0px_var(--brand)] backdrop-blur-xl">
          [ OPEN SOURCE PROJECT ]
        </span>

        <h1 className="mt-8 font-mono text-5xl font-black uppercase leading-[0.95] tracking-widest sm:text-6xl lg:text-7xl">
          Autonomous Code Repair.
        </h1>

        <p className="mt-6 max-w-xl font-mono text-base leading-relaxed text-muted-foreground sm:text-lg">
          TestPilot AI is a multi-agent system that diagnoses, fixes, and
          verifies code in real-time.
        </p>

        <div className="mt-10 flex flex-wrap gap-5">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 border-4 border-foreground bg-brand px-6 py-3 font-mono text-sm font-bold uppercase tracking-widest text-black shadow-[6px_6px_0px_0px_var(--foreground)] transition-all hover:translate-x-[6px] hover:translate-y-[6px] hover:shadow-none"
          >
            View GitHub <ArrowUpRight size={18} />
          </a>
          <a
            href={FIXER_URL}
            className="inline-flex items-center gap-2 border-4 border-foreground bg-background/70 px-6 py-3 font-mono text-sm font-bold uppercase tracking-widest shadow-[6px_6px_0px_0px_var(--brand)] backdrop-blur-xl transition-all hover:translate-x-[6px] hover:translate-y-[6px] hover:shadow-none"
          >
            <Wrench size={18} /> Try the Fixer
          </a>
        </div>
      </div>
      <div className="relative">
        <motion.div
          aria-hidden
          className="absolute -inset-6 bg-gradient-to-br from-cyan-500/30 to-purple-500/30 blur-3xl"
          animate={{ opacity: [0.5, 0.9, 0.5], scale: [1, 1.05, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="relative border-4 border-foreground bg-background/70 shadow-[6px_6px_0px_0px_var(--brand)] backdrop-blur-2xl">
          <div className="flex items-center justify-between border-b-4 border-foreground px-4 py-2 font-mono text-xs uppercase tracking-widest">
            <span className="flex items-center gap-2">
              <Terminal size={14} className="text-brand" /> testpilot.sh
            </span>
            <span className="flex gap-2" aria-hidden>
              <i className="h-3 w-3 border-2 border-foreground" />
              <i className="h-3 w-3 border-2 border-foreground" />
              <i className="h-3 w-3 border-2 border-foreground bg-brand" />
            </span>
          </div>

          <div className="min-h-[200px] space-y-3 bg-gradient-to-br from-cyan-500/10 to-purple-500/10 p-6 font-mono text-sm tracking-wider sm:text-base">
            {TYPED.map((chars, li) => (
              <p
                key={li}
                className={
                  li === TYPED.length - 1
                    ? "font-bold text-brand"
                    : "text-foreground/90"
                }
              >
                {chars.map(({ char, delay }, ci) => (
                  <motion.span
                    key={ci}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay, duration: 0.01 }}
                  >
                    {char}
                  </motion.span>
                ))}
              </p>
            ))}
            <motion.span
              aria-hidden
              className="inline-block h-4 w-2 bg-brand"
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
