
"use client";

import { motion } from "framer-motion";
import {
  Bug,
  FileCode2,
  FlaskConical,
  Wrench,
} from "lucide-react";

const STEPS = [
  {
    number: "01",
    icon: FileCode2,
    title: "Submit",
    description:
      "Paste, upload, or link a single file. Include the error trace for better diagnosis.",
    label: "INPUT",
  },
  {
    number: "02",
    icon: Bug,
    title: "Diagnose",
    description:
      "Analyze the code, error trace, and expected behavior to identify the root cause.",
    label: "ANALYSIS",
  },
  {
    number: "03",
    icon: Wrench,
    title: "Repair",
    description:
      "Receive the corrected file, a clear explanation, and a line-by-line diff.",
    label: "PATCH",
  },
  {
    number: "04",
    icon: FlaskConical,
    title: "Verify",
    description:
      "Run checks in a sandbox and see exactly which tests pass or fail.",
    label: "VALIDATION",
  },
];

export function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="
        relative mx-auto max-w-[1440px]
        px-8 py-24
        sm:px-12
        lg:px-20 lg:py-32
        xl:px-24
        2xl:px-28
      "
    >
      {/* Section heading */}
      <div className="mb-16 flex flex-col items-start gap-6 md:mb-20 md:flex-row md:items-end md:justify-between">
        <div className="max-w-3xl">
          <div
            className="
              mb-5 inline-flex items-center gap-2
              border-2 border-foreground
              bg-[var(--brand)] px-3 py-2
              text-xs font-black uppercase
              tracking-[0.18em] text-black
              shadow-[4px_4px_0px_0px_#000]
            "
          >
            <span className="h-2 w-2 bg-black" />
            How it works
          </div>

          <h2
            className="
              text-4xl font-black uppercase
              leading-[0.95] tracking-[-0.055em]
              sm:text-5xl lg:text-7xl
            "
          >
            Broken code.
            <br />
            <span className="text-[var(--brand)]">
              Verified fixes.
            </span>
          </h2>
        </div>

        <p
          className="
            max-w-sm border-l-4 border-[var(--brand)]
            pl-5 text-sm font-medium leading-7
            text-muted-foreground sm:text-base
          "
        >
          Four deliberate stages. Every step moves your code
          closer to a verified fix, with progress you can follow.
        </p>
      </div>

      {/* Process cards */}
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
        {STEPS.map(
          ({ number, icon: Icon, title, description, label }, index) => (
            <motion.article
              key={number}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{
                duration: 0.45,
                delay: index * 0.09,
                ease: "easeOut",
              }}
              className="
                group relative flex min-h-[290px] flex-col
                border-2 border-foreground
                bg-[#F1F5F9] dark:bg-[#181C20]
                p-6
                shadow-[6px_6px_0px_0px_#000]
                dark:shadow-[6px_6px_0px_0px_#fff]
                transition-transform duration-200
                hover:-translate-y-1
                motion-reduce:transform-none
                motion-reduce:transition-none
              "
            >
              {/* Step header */}
              <div className="mb-10 flex items-center justify-between">
                <span className="font-mono text-xs font-bold tracking-widest text-muted-foreground">
                  STEP_{number}
                </span>

                <span className="border border-foreground/30 px-2 py-1 font-mono text-[10px] font-bold tracking-wider text-muted-foreground">
                  {label}
                </span>
              </div>

              {/* Icon and number */}
              <div className="mb-7 flex items-center gap-4">
                <div
                  className="
                    flex h-16 w-16 shrink-0 items-center
                    justify-center border-2 border-foreground
                    bg-[var(--brand)] text-black
                    shadow-[4px_4px_0px_0px_#000]
                    transition-transform duration-200
                    group-hover:-translate-y-1
                    group-hover:translate-x-1
                    motion-reduce:transform-none
                    motion-reduce:transition-none
                  "
                >
                  <Icon
                    size={28}
                    strokeWidth={2.25}
                    aria-hidden="true"
                  />
                </div>

                <span
                  aria-hidden="true"
                  className="
                    font-mono text-5xl font-black
                    leading-none tracking-tighter
                    text-foreground/10
                  "
                >
                  {number}
                </span>
              </div>

              {/* Card content */}
              <h3 className="mb-3 text-xl font-black uppercase tracking-tight">
                {title}
              </h3>

              <p className="text-sm font-medium leading-6 text-muted-foreground">
                {description}
              </p>

              {/* Progress marker */}
              <div
                aria-hidden="true"
                className="mt-auto flex items-center gap-2 pt-8"
              >
                <span className="h-1.5 w-8 bg-[var(--brand)]" />
                <span className="h-1.5 w-2 bg-foreground/20 transition-all duration-200 group-hover:w-6 group-hover:bg-[var(--brand)]" />
                <span className="h-1.5 w-2 bg-foreground/20" />
              </div>
            </motion.article>
          ),
        )}
      </div>

      {/* Closing statement — transparent */}
      <div
        className="
          mt-10 flex flex-col gap-3
          border-2 border-foreground p-5
          sm:flex-row sm:items-center
          sm:justify-between sm:px-7
        "
      >
        <p className="text-sm font-black tracking-wide">
          NO BLIND PATCHES. NO UNVERIFIED CLAIMS.
        </p>

        <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <span className="h-2 w-2 bg-[var(--brand)]" />
          <span>Diagnose → Repair → Verify</span>
        </div>
      </div>
    </section>
  );
}
