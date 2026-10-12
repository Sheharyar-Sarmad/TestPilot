"use client";

import { motion } from "framer-motion";
import { Shield, Lock, Timer, EyeOff } from "lucide-react";

const PILLARS = [
  {
    icon: Shield,
    title: "Sandboxed execution",
    body: "Untrusted code runs in a disposable container: no network, read-only filesystem, non-root.",
  },
  {
    icon: EyeOff,
    title: "No permanent storage",
    body: "Jobs expire from Redis after one hour. No accounts, no history, no data retention.",
  },
  {
    icon: Lock,
    title: "SSRF-protected ingestion",
    body: "GitHub URLs are validated against a domain whitelist and private-IP ranges are blocked.",
  },
  {
    icon: Timer,
    title: "Rate-limited by design",
    body: "Per-IP and global limits keep the tool fast for everyone and cheap to operate.",
  },
];

export function SecuritySection() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-24">
      <div className="text-center mb-16">
        <p className="inline-block text-xs uppercase tracking-widest text-black bg-[var(--brand)] font-black px-4 py-1.5 border-2 border-black dark:border-white mb-3">
          Built on trust
        </p>
        <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight mb-3">
          Secure by default, honest by design.
        </h2>
        <p className="text-muted-foreground font-medium max-w-xl mx-auto">
          Submitting code to an AI tool requires trust. Here's how we earn it.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {PILLARS.map(({ icon: Icon, title, body }, i) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, delay: i * 0.08 }}
            className="p-6 rounded-2xl glass-subtle spatial border-4 border-black dark:border-white shadow-[6px_6px_0px_0px_#000] dark:shadow-[6px_6px_0px_0px_#fff]"
          >
            <div className="w-10 h-10 rounded-xl neu-raised flex items-center justify-center mb-4 border-4 border-black dark:border-white shadow-[3px_3px_0px_0px_#000] dark:shadow-[3px_3px_0px_0px_#fff]">
              <Icon className="w-5 h-5 text-[var(--brand)]" strokeWidth={1.75} />
            </div>
            <h3 className="font-black uppercase tracking-wide mb-2">{title}</h3>
            <p className="text-sm font-medium text-muted-foreground leading-relaxed">
              {body}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}