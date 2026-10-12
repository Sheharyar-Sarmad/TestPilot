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
  { label: "Diagnosis", icon: Bug },
  { label: "Corrected Code", icon: GitCompare },
  { label: "Diff", icon: GitCompare, active: true },
  { label: "Verification", icon: FlaskConical },
];

const CHECKS = [
  { name: "Syntax check", status: "passed" },
  { name: "Regression tests", status: "passed" },
  { name: "Linter (flake8)", status: "skipped" },
];

export function PreviewSection() {
  return (
    <section className="max-w-5xl mx-auto px-6 py-24">
      <div className="text-center mb-12">
        <p className="inline-block text-xs uppercase tracking-widest text-black bg-[var(--brand)] font-black px-4 py-1.5 border-2 border-black dark:border-white mb-3">
          See it in action
        </p>
        <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight mb-3">
          Understand the fix at a glance.
        </h2>
        <p className="text-muted-foreground font-medium max-w-xl mx-auto">
          Diagnosis, corrected code, diff, structure map, and real verification
          results — all on one page.
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6 }}
        className="rounded-2xl liquid-glass spatial overflow-hidden border-4 border-black dark:border-white shadow-[12px_12px_0px_0px_#000] dark:shadow-[12px_12px_0px_0px_#fff] bg-white dark:bg-zinc-950"
      >
        {/* Browser chrome */}
        <div className="flex items-center gap-2 px-4 py-3 border-b-4 border-black dark:border-white bg-black dark:bg-white">
          <span className="w-3 h-3 rounded-full bg-red-400 border border-black dark:border-white" />
          <span className="w-3 h-3 rounded-full bg-yellow-400 border border-black dark:border-white" />
          <span className="w-3 h-3 rounded-full bg-green-400 border border-black dark:border-white" />
          <div className="ml-4 flex-1 max-w-md px-3 py-1 rounded-md bg-white dark:bg-zinc-900 border-2 border-black dark:border-white">
            <span className="text-[11px] text-black dark:text-white font-mono font-bold">
              testpilot-chi.vercel.app/fix/abc123/result
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-4 pt-3 border-b-4 border-black dark:border-white overflow-x-auto">
          {TABS.map(({ label, icon: Icon, active }) => (
            <button
              key={label}
              className={`inline-flex items-center gap-2 px-3 py-2 text-sm rounded-t-lg whitespace-nowrap transition-colors font-bold uppercase tracking-wide ${
                active
                  ? "text-black bg-[var(--brand)] border-4 border-black dark:border-white -mb-[4px]"
                  : "text-muted-foreground hover:text-black dark:hover:text-white"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Diff content */}
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y-4 md:divide-y-0 md:divide-x-4 divide-black dark:divide-white">
          {/* Original */}
          <div className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-red-500 border border-black dark:border-white" />
              <span className="text-xs text-muted-foreground font-mono font-bold uppercase">
                original/calculator.py
              </span>
            </div>
            <pre className="text-[13px] font-mono leading-relaxed font-bold">
              <span className="text-muted-foreground">1  </span>
              <span className="text-foreground">def add(a, b):</span>{"\n"}
              <span className="text-muted-foreground">2  </span>
              <span className="bg-red-500 text-white -mx-1 px-1 border border-black dark:border-white">
                {"    return a - b"}
              </span>
            </pre>
          </div>

          {/* Corrected */}
          <div className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-green-500 border border-black dark:border-white" />
              <span className="text-xs text-muted-foreground font-mono font-bold uppercase">
                corrected/calculator.py
              </span>
            </div>
            <pre className="text-[13px] font-mono leading-relaxed font-bold">
              <span className="text-muted-foreground">1  </span>
              <span className="text-foreground">def add(a, b):</span>{"\n"}
              <span className="text-muted-foreground">2  </span>
              <span className="bg-green-500 text-white -mx-1 px-1 border border-black dark:border-white">
                {"    return a + b"}
              </span>
            </pre>
          </div>
        </div>

        {/* Verification strip */}
        <div className="px-5 py-4 border-t-4 border-black dark:border-white bg-zinc-100 dark:bg-zinc-900">
          <div className="flex flex-wrap items-center gap-3">
            {CHECKS.map(({ name, status }) => {
              const Icon =
                status === "passed"
                  ? CheckCircle2
                  : status === "failed"
                  ? XCircle
                  : MinusCircle;
              const color =
                status === "passed"
                  ? "text-green-500"
                  : status === "failed"
                  ? "text-red-500"
                  : "text-muted-foreground";
              return (
                <div
                  key={name}
                  className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider"
                >
                  <Icon className={`w-3.5 h-3.5 ${color}`} />
                  <span className="text-muted-foreground">{name}</span>
                </div>
              );
            })}
            <span className="ml-auto text-xs font-black uppercase tracking-wider text-muted-foreground">
              Verified in sandbox · 1.2s
            </span>
          </div>
        </div>
      </motion.div>

      <p className="text-center text-xs font-black uppercase tracking-widest text-muted-foreground mt-6">
        Every check reports its real status. If we couldn't run something, we say so.
      </p>
    </section>
  );
}