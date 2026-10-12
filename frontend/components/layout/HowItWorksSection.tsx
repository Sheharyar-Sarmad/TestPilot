"use client";

import { motion } from "framer-motion";
import { FileCode2, Bug, Wrench, FlaskConical } from "lucide-react";

const STEPS = [
  {
    n: "01",
    icon: FileCode2,
    title: "Submit",
    body: "Paste, upload, or link a single file. Add the error trace if you have one.",
  },
  {
    n: "02",
    icon: Bug,
    title: "Diagnose",
    body: "AI reads your code, error, and expected behavior to find the root cause.",
  },
  {
    n: "03",
    icon: Wrench,
    title: "Repair",
    body: "Get a corrected file, a written explanation, and a line-by-line diff.",
  },
  {
    n: "04",
    icon: FlaskConical,
    title: "Verify",
    body: "Tests run in a sandbox and report honestly what passed and what didn't.",
  },
];

export function HowItWorksSection() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-24">
      <div className="text-center mb-16">
        <p className="inline-block text-xs uppercase tracking-widest text-black bg-[var(--brand)] font-black px-4 py-1.5 border-2 border-black dark:border-white mb-3">
          How it works
        </p>
        <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight mb-3">
          Four steps from broken to verified.
        </h2>
        <p className="text-muted-foreground font-medium max-w-xl mx-auto">
          A deterministic pipeline, not a black box. Every stage emits events
          you can see live.
        </p>
      </div>

      <div className="relative grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Connector line — desktop only */}
        <div
          aria-hidden
          className="hidden md:block absolute top-12 left-[12%] right-[12%] h-1 bg-black dark:bg-white"
        />

        {STEPS.map(({ n, icon: Icon, title, body }, i) => (
          <motion.div
            key={n}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            className="relative"
          >
            <div className="relative z-10 flex flex-col items-center text-center">
              {/* Added bg-white dark:bg-zinc-950 to block the connector line */}
              <div className="w-24 h-24 rounded-3xl liquid-glass bg-white dark:bg-zinc-950 flex items-center justify-center mb-4 relative border-4 border-black dark:border-white shadow-[6px_6px_0px_0px_#000] dark:shadow-[6px_6px_0px_0px_#fff]">
                <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-[var(--brand)] text-black text-[11px] font-black flex items-center justify-center border-2 border-black dark:border-white shadow-[2px_2px_0px_0px_#000]">
                  {n}
                </span>
                <Icon className="w-8 h-8 text-[var(--brand)]" strokeWidth={1.75} />
              </div>
              <h3 className="font-black uppercase tracking-wide text-lg mb-1.5">{title}</h3>
              <p className="text-sm font-medium text-muted-foreground leading-relaxed max-w-[240px]">
                {body}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}