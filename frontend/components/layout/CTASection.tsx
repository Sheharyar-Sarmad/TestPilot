"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Wrench } from "lucide-react";

export function CTASection() {
  return (
    <section className="max-w-4xl mx-auto px-6 py-24">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6 }}
        className="relative rounded-3xl liquid-glass p-10 sm:p-14 text-center overflow-hidden border-4 border-black dark:border-white shadow-[8px_8px_0px_0px_#000] dark:shadow-[8px_8px_0px_0px_#fff]"
      >
        {/* Soft brand glow */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none opacity-40"
          style={{
            background:
              "radial-gradient(circle at 50% 0%, var(--brand) 0%, transparent 55%)",
            filter: "blur(60px)",
          }}
        />

        <div className="relative">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl neu-raised mb-6 border-4 border-black dark:border-white shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#fff]">
            <Wrench className="w-6 h-6 text-[var(--brand)]" strokeWidth={1.75} />
          </div>

          <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight mb-4">
            Ready to fix your file?
          </h2>
          <p className="text-muted-foreground font-medium max-w-lg mx-auto mb-8">
            One file. One fix. Real verification. No signup, no setup, no
            surprises.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/fix"
              className="inline-flex items-center justify-center gap-2 h-12 px-7 rounded-xl bg-[var(--brand)] text-black font-bold uppercase tracking-wider border-4 border-black dark:border-white shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#fff] transition-transform duration-200 hover:scale-[1.03] active:scale-[0.98]"
            >
              Fix your code
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/about"
              className="inline-flex items-center justify-center gap-2 h-12 px-7 rounded-xl glass-subtle text-foreground font-bold uppercase tracking-wider border-4 border-black dark:border-white shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#fff] hover:bg-foreground/[0.06] transition-colors"
            >
              Learn more
            </Link>
          </div>
        </div>
      </motion.div>
    </section>
  );
}