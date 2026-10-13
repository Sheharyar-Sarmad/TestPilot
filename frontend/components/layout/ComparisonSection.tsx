"use client";

import { motion, type Variants } from "framer-motion";
import { Check, Minus, X } from "lucide-react";

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

/* One column grid shared by the header and every row so they always line up. */
const GRID = "grid grid-cols-[1fr_84px_84px] sm:grid-cols-[1fr_132px_132px]";

/* The TestPilot column carries the single accent tint. */
const BRAND_TINT = "bg-[color-mix(in_srgb,var(--brand)_12%,transparent)]";

const ICON_BASE =
  "inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-foreground";

function StatusIcon({ value }: { value: CellValue }) {
  if (value === "yes") {
    return (
      <span className={`${ICON_BASE} bg-[var(--brand)] text-black`}>
        <Check className="h-4 w-4" strokeWidth={3.5} aria-hidden />
        <span className="sr-only">Yes</span>
      </span>
    );
  }
  if (value === "no") {
    return (
      <span className={`${ICON_BASE} bg-background text-red-500`}>
        <X className="h-4 w-4" strokeWidth={3.5} aria-hidden />
        <span className="sr-only">No</span>
      </span>
    );
  }
  return (
    <span className={`${ICON_BASE} bg-background text-muted-foreground`}>
      <Minus className="h-4 w-4" strokeWidth={3.5} aria-hidden />
      <span className="sr-only">Partially</span>
    </span>
  );
}

/* Animation runs once, when the section scrolls into view. */
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const card: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: EASE, staggerChildren: 0.05, delayChildren: 0.15 },
  },
};
const rowAnim: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE } },
};

export function ComparisonSection() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-24">
      {/* Heading */}
      <motion.div
        className="mb-14 text-center"
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5, ease: EASE }}
      >
        <p className="mb-3 text-sm font-semibold text-[var(--brand)]">
          Why not just use a chatbot?
        </p>
        <h2
          className="mb-4 text-3xl font-black uppercase tracking-tight sm:text-5xl"
          style={{ fontFamily: "var(--font-heading), system-ui, sans-serif" }}
        >
          A chatbot guesses. TestPilot verifies.
        </h2>
        <p className="mx-auto max-w-xl text-base text-muted-foreground">
          A general chatbot can rewrite your code. It cannot run your tests, report honest
          results, or show you a structured diff. That&apos;s the difference.
        </p>
      </motion.div>

      {/* Table */}
      <motion.div
        variants={card}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        className="overflow-hidden rounded-2xl border-[3px] border-foreground bg-background/90 shadow-[6px_6px_0_0_var(--foreground)] backdrop-blur-md"
      >
        {/* Header */}
        <motion.div
          variants={rowAnim}
          className={`${GRID} items-stretch border-b-[3px] border-foreground bg-foreground/[0.05]`}
        >
          <span className="flex items-center px-5 py-3.5 text-xs font-bold text-muted-foreground sm:px-6">
            Feature
          </span>
          <span className="flex items-center justify-center bg-[var(--brand)] px-2 py-3.5 text-center text-xs font-black uppercase tracking-wide text-black">
            TestPilot
          </span>
          <span className="flex items-center justify-center px-2 py-3.5 text-center text-xs font-bold leading-tight text-muted-foreground">
            Basic chatbot
          </span>
        </motion.div>

        {/* Rows */}
        <div className="divide-y divide-foreground/15">
          {ROWS.map(({ feature, testpilot, chatbot, note }) => (
            <motion.div
              key={feature}
              variants={rowAnim}
              className={`${GRID} items-stretch transition-colors hover:bg-foreground/[0.03]`}
            >
              <div className="px-5 py-4 sm:px-6">
                <p className="text-sm font-bold text-foreground">{feature}</p>
                {note && (
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{note}</p>
                )}
              </div>
              <div className={`flex items-center justify-center ${BRAND_TINT}`}>
                <StatusIcon value={testpilot} />
              </div>
              <div className="flex items-center justify-center">
                <StatusIcon value={chatbot} />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Footer */}
        <motion.div
          variants={rowAnim}
          className="flex flex-wrap items-center justify-between gap-3 border-t-[3px] border-foreground bg-foreground/[0.05] px-5 py-4 sm:px-6"
        >
          <p className="text-xs text-muted-foreground">
            Verification only runs when a check is actually supported for the submitted language.
          </p>
          <span className="inline-flex items-center rounded-full border-2 border-foreground bg-[var(--brand)] px-3 py-1 text-xs font-extrabold text-black shadow-[2px_2px_0_0_var(--foreground)]">
            No claims without execution.
          </span>
        </motion.div>
      </motion.div>

      {/* Footnote */}
      <p className="mx-auto mt-8 max-w-xl text-center text-xs text-muted-foreground">
        &ldquo;Basic chatbot&rdquo; refers to general-purpose assistants without code execution or
        structured verification.
      </p>
    </section>
  );
}