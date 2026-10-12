"use client";

import { motion } from "framer-motion";
import { Check, X, Minus } from "lucide-react";

type CellValue = "yes" | "no" | "partial";

type Row = {
  feature: string;
  testpilot: CellValue;
  chatbot: CellValue;
  note?: string;
};

const ROWS: Row[] = [
  {
    feature: "Single-file focus",
    testpilot: "yes",
    chatbot: "no",
    note: "Chatbots drift across files and repos.",
  },
  {
    feature: "Structured root-cause diagnosis",
    testpilot: "yes",
    chatbot: "partial",
    note: "Chatbots produce free-form answers, not validated schemas.",
  },
  {
    feature: "Complete corrected file",
    testpilot: "yes",
    chatbot: "partial",
    note: "Chatbots often return fragments or explanations instead.",
  },
  {
    feature: "Line-by-line diff",
    testpilot: "yes",
    chatbot: "no",
  },
  {
    feature: "Runs tests in an isolated sandbox",
    testpilot: "yes",
    chatbot: "no",
    note: "Chatbots cannot execute your code.",
  },
  {
    feature: "Honestly reports failed or skipped checks",
    testpilot: "yes",
    chatbot: "no",
    note: "Chatbots often claim success without running anything.",
  },
  {
    feature: "File structure & call-flow diagram",
    testpilot: "yes",
    chatbot: "no",
  },
  {
    feature: "Downloadable corrected file",
    testpilot: "yes",
    chatbot: "no",
    note: "Chatbots require manual copy-paste.",
  },
];

function StatusIcon({ value }: { value: CellValue }) {
  if (value === "yes") {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-500/15">
        <Check className="w-3.5 h-3.5 text-green-500" strokeWidth={3} />
      </span>
    );
  }
  if (value === "no") {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-500/15">
        <X className="w-3.5 h-3.5 text-red-500" strokeWidth={3} />
      </span>
    );
  }
  return (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-muted-foreground/15">
      <Minus className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={3} />
    </span>
  );
}

export function ComparisonSection() {
  return (
    <section className="max-w-4xl mx-auto px-6 py-24">
      {/* Heading */}
      <div className="text-center mb-14">
        <p className="text-xs uppercase tracking-widest text-[var(--brand)] font-medium mb-3">
          Why not just use a chatbot?
        </p>
        <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-3">
          A chatbot guesses. TestPilot verifies.
        </h2>
        <p className="text-muted-foreground max-w-xl mx-auto">
          A general chatbot can rewrite your code. It cannot run your tests,
          report honest results, or show you a structured diff. That's the
          difference.
        </p>
      </div>

      {/* Table - Added Brutalist borders and hard shadows while keeping liquid-glass */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5 }}
        className="rounded-2xl liquid-glass overflow-hidden border-4 border-black dark:border-white shadow-[8px_8px_0px_0px_#000] dark:shadow-[8px_8px_0px_0px_#fff]"
      >
        {/* Header row - Brutalist high contrast solid background */}
        <div className="grid grid-cols-[1fr_auto_auto] sm:grid-cols-[1fr_120px_120px] items-center gap-4 px-5 sm:px-6 py-4 border-b-4 border-black dark:border-white bg-black dark:bg-white">
          <span className="text-xs font-black text-white/80 dark:text-black/80 uppercase tracking-widest">
            Feature
          </span>
          <span className="text-xs font-black text-white dark:text-black uppercase tracking-widest text-center">
            TestPilot
          </span>
          <span className="text-xs font-black text-white/80 dark:text-black/80 uppercase tracking-widest text-center">
            Basic Chatbot
          </span>
        </div>

        {/* Body rows - Thick brutalist dividers */}
        <div className="divide-y-4 divide-black dark:divide-white">
          {ROWS.map(({ feature, testpilot, chatbot, note }, i) => (
            <motion.div
              key={feature}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.3, delay: i * 0.04 }}
              // Kept original hover effect exactly as requested
              className="grid grid-cols-[1fr_auto_auto] sm:grid-cols-[1fr_120px_120px] items-center gap-4 px-5 sm:px-6 py-4 hover:bg-foreground/[0.02] transition-colors"
            >
              <div>
                <p className="text-sm font-black uppercase tracking-wide text-foreground">
                  {feature}
                </p>
                {note && (
                  <p className="text-xs font-medium text-muted-foreground mt-1.5 leading-relaxed">
                    {note}
                  </p>
                )}
              </div>
              <div className="flex justify-center">
                <StatusIcon value={testpilot} />
              </div>
              <div className="flex justify-center">
                <StatusIcon value={chatbot} />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Footer strip - Brutalist high contrast solid background */}
        <div className="px-5 sm:px-6 py-4 border-t-4 border-black dark:border-white bg-black dark:bg-white flex items-center justify-between gap-3 flex-wrap">
          <p className="text-xs font-bold uppercase tracking-wider text-white/80 dark:text-black/80">
            Verification only runs when a check is actually supported for the
            submitted language.
          </p>
          <span className="text-xs font-black uppercase tracking-wider text-white dark:text-black">
            No claims without execution.
          </span>
        </div>
      </motion.div>

      {/* Footnote */}
      <p className="text-center text-xs font-bold uppercase tracking-widest text-muted-foreground mt-8">
        "Basic Chatbot" refers to general-purpose assistants without code
        execution or structured verification.
      </p>
    </section>
  );
}