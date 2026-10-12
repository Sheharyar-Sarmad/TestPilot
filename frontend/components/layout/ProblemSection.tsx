"use client";

import { motion } from "framer-motion";
import { X, Check } from "lucide-react";

const OLD = ["Manual debugging takes hours", "Stack traces are cryptic", "Copy-pasting fixes breaks things"];
const NEW = ["Automated root-cause analysis", "AI-generated, sandbox-verified fixes", "Real-time streaming results"];

export default function ProblemSection() {
  return (
    <section className="grid gap-10 md:grid-cols-2">
      <motion.div
        initial={{ opacity: 0, x: -80 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="border-4 border-red-500 bg-background/70 p-8 shadow-[6px_6px_0px_0px_#EF4444] backdrop-blur-xl"
      >
        <h2 className="font-mono text-2xl font-black uppercase tracking-widest text-red-500 sm:text-3xl">The Old Way</h2>
        <ul className="mt-8 space-y-5">
          {OLD.map((t) => (
            <li key={t} className="flex items-start gap-3 font-mono uppercase tracking-widest text-muted-foreground">
              <X className="mt-0.5 shrink-0 text-red-500" size={20} strokeWidth={4} />
              <span className="text-sm">{t}</span>
            </li>
          ))}
        </ul>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 80 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="border-4 border-foreground bg-gradient-to-br from-cyan-500/10 to-purple-500/10 p-8 shadow-[6px_6px_0px_0px_var(--brand)] backdrop-blur-2xl"
      >
        <h2 className="font-mono text-2xl font-black uppercase tracking-widest text-brand sm:text-3xl">
          The TestPilot Way
        </h2>
        <ul className="mt-8 space-y-5">
          {NEW.map((t) => (
            <li key={t} className="flex items-start gap-3 font-mono uppercase tracking-widest">
              <Check className="mt-0.5 shrink-0 text-brand" size={20} strokeWidth={4} />
              <span className="text-sm">{t}</span>
            </li>
          ))}
        </ul>
      </motion.div>
    </section>
  );
}