
"use client";

import { motion } from "framer-motion";
import {
  Bug,
  GitCompare,
  FlaskConical,
  CheckCircle2,
  XCircle,
  MinusCircle,
} from "lucide-react";

const TABS = [
  { label: "Diagnosis", icon: Bug, active: false },
  { label: "Corrected Code", icon: GitCompare, active: false },
  { label: "Diff", icon: GitCompare, active: true },
  { label: "Verification", icon: FlaskConical, active: false },
];

type CheckStatus = "passed" | "failed" | "skipped";

const CHECKS: { name: string; status: CheckStatus }[] = [
  { name: "Syntax check", status: "passed" },
  { name: "Regression tests", status: "passed" },
  { name: "Linter (flake8)", status: "skipped" },
];

export function PreviewSection() {
  return (
    <section
      id="preview"
      className="
        mx-auto mt-0 max-w-[1440px]
        px-8 pb-24 pt-0
        sm:px-12
        lg:px-20 lg:pb-32
        xl:px-24
        2xl:px-28
      "
    >
      {/* Section heading */}
      <div className="mb-12 flex flex-col gap-5 lg:mb-16">
        <div>
          <span
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
            See it in action
          </span>

          <h2
            className="
              mb-4 text-4xl font-black uppercase
              leading-[0.98] tracking-[-0.045em]
              sm:text-5xl lg:text-6xl
            "
          >
            Understand the fix
            <br className="hidden sm:block" /> at a glance.
          </h2>

          <p className="max-w-2xl text-sm font-medium leading-7 text-muted-foreground sm:text-base">
            Explore the diagnosis, corrected code, changes, and
            verification results in one clear workspace.
          </p>
        </div>
      </div>

      {/* Preview window */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="
          overflow-hidden border-4 border-foreground
          bg-background
          shadow-[8px_8px_0px_0px_#000]
          dark:shadow-[8px_8px_0px_0px_#fff]
        "
      >
        {/* Browser chrome */}
        <div
          className="
            flex min-w-0 items-center gap-3
            border-b-4 border-foreground
            bg-[#F1F5F9] px-4 py-3
            dark:bg-[#181C20]
            sm:px-5
          "
        >
          <div className="flex shrink-0 items-center gap-1.5">
            <span className="h-3 w-3 border border-foreground bg-[#EF4444]" />
            <span className="h-3 w-3 border border-foreground bg-[#EAB308]" />
            <span className="h-3 w-3 border border-foreground bg-[#22C55E]" />
          </div>

          <div
            className="
              ml-2 min-w-0 flex-1
              border-2 border-foreground
              bg-background px-3 py-1.5
            "
          >
            <span className="block truncate font-mono text-[10px] font-bold text-foreground sm:text-xs">
              testpilot-chi.vercel.app/fix/abc123/result
            </span>
          </div>

          <span className="hidden shrink-0 font-mono text-[10px] font-black uppercase tracking-wider text-muted-foreground sm:block">
            Preview
          </span>
        </div>

        {/* Workspace tabs */}
        <div
          className="
            flex overflow-x-auto
            border-b-4 border-foreground
            px-3 pt-3 sm:px-5
          "
          aria-label="Preview workspace tabs"
        >
          {TABS.map(({ label, icon: Icon, active }) => (
            <div
              key={label}
              aria-current={active ? "page" : undefined}
              className={`
                -mb-0.5 inline-flex shrink-0 items-center gap-2
                border-2 px-3 py-3
                text-[10px] font-black uppercase tracking-wider
                sm:px-4 sm:text-xs
                ${
                  active
                    ? "relative z-10 border-foreground bg-[var(--brand)] text-black"
                    : "border-transparent text-muted-foreground"
                }
              `}
            >
              <Icon size={14} strokeWidth={2.5} aria-hidden="true" />
              {label}
            </div>
          ))}
        </div>

        {/* Diff workspace */}
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Original file */}
          <div className="min-w-0 border-b-4 border-foreground p-5 sm:p-7 md:border-b-0 md:border-r-4">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 border border-foreground bg-[#EF4444]" />

                <h3 className="truncate font-mono text-xs font-black uppercase tracking-wide">
                  original/calculator.py
                </h3>
              </div>

              <span className="shrink-0 font-mono text-[10px] font-black uppercase text-[#DC2626] dark:text-[#F87171]">
                Original
              </span>
            </div>

            <pre className="overflow-x-auto font-mono text-xs font-bold leading-8 sm:text-sm">
              <code>
                <div className="flex min-w-max">
                  <span className="w-9 shrink-0 select-none pr-3 text-right text-muted-foreground">
                    1
                  </span>
                  <span className="px-3 text-foreground">
                    def add(a, b):
                  </span>
                </div>

                <div className="flex min-w-max bg-[#FEE2E2] text-[#991B1B] dark:bg-[#451A1A] dark:text-[#FECACA]">
                  <span className="w-9 shrink-0 select-none border-r border-[#FCA5A5] pr-3 text-right dark:border-[#7F1D1D]">
                    2
                  </span>
                  <span className="px-3">
                    {"    return a - b"}
                  </span>
                </div>
              </code>
            </pre>
          </div>

          {/* Corrected file */}
          <div className="min-w-0 p-5 sm:p-7">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 border border-foreground bg-[#22C55E]" />

                <h3 className="truncate font-mono text-xs font-black uppercase tracking-wide">
                  corrected/calculator.py
                </h3>
              </div>

              <span className="shrink-0 font-mono text-[10px] font-black uppercase text-[#15803D] dark:text-[#4ADE80]">
                Fixed
              </span>
            </div>

            <pre className="overflow-x-auto font-mono text-xs font-bold leading-8 sm:text-sm">
              <code>
                <div className="flex min-w-max">
                  <span className="w-9 shrink-0 select-none pr-3 text-right text-muted-foreground">
                    1
                  </span>
                  <span className="px-3 text-foreground">
                    def add(a, b):
                  </span>
                </div>

                <div className="flex min-w-max bg-[#DCFCE7] text-[#166534] dark:bg-[#143522] dark:text-[#BBF7D0]">
                  <span className="w-9 shrink-0 select-none border-r border-[#86EFAC] pr-3 text-right dark:border-[#166534]">
                    2
                  </span>
                  <span className="px-3">
                    {"    return a + b"}
                  </span>
                </div>
              </code>
            </pre>
          </div>
        </div>

        {/* Verification results */}
        <div className="border-t-4 border-foreground bg-[#F1F5F9] px-5 py-5 dark:bg-[#181C20] sm:px-7">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-mono text-xs font-black uppercase tracking-widest">
              Verification results
            </h3>

            <span className="border-2 border-foreground bg-background px-2.5 py-1 font-mono text-[10px] font-black uppercase tracking-wider">
              Sandbox · 1.2s
            </span>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-4">
            {CHECKS.map(({ name, status }) => {
              const Icon =
                status === "passed"
                  ? CheckCircle2
                  : status === "failed"
                    ? XCircle
                    : MinusCircle;

              const statusColor =
                status === "passed"
                  ? "text-[#16A34A] dark:text-[#4ADE80]"
                  : status === "failed"
                    ? "text-[#DC2626] dark:text-[#F87171]"
                    : "text-muted-foreground";

              const statusLabel =
                status === "passed"
                  ? "PASS"
                  : status === "failed"
                    ? "FAIL"
                    : "SKIPPED";

              return (
                <div
                  key={name}
                  className="flex items-center gap-2"
                >
                  <Icon
                    size={17}
                    strokeWidth={2.5}
                    className={statusColor}
                    aria-hidden="true"
                  />

                  <div>
                    <p className="text-xs font-bold text-foreground">
                      {name}
                    </p>
                    <p
                      className={`font-mono text-[10px] font-black tracking-wider ${statusColor}`}
                    >
                      {statusLabel}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* Closing note */}
      <p className="mt-7 max-w-3xl text-xs font-bold uppercase leading-6 tracking-wider text-muted-foreground">
        Every check reports its actual status. When something <br></br>
        cannot be run, TestPilot tells you instead of claiming success.
      </p>
    </section>
  );
}
