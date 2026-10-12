"use client";

import { motion } from "framer-motion";
import { Monitor, Server, Database, ArrowDownUp } from "lucide-react";

const TIERS = [
  { label: "TIER 1 // FRONTEND", icon: Monitor, items: ["Next.js 15", "TypeScript", "Monaco Editor", "Framer Motion"] },
  { label: "TIER 2 // BACKEND", icon: Server, items: ["FastAPI", "Python", "LangGraph", "Uvicorn"] },
  {
    label: "TIER 3 // STATE & COMMS",
    icon: Database,
    items: ["Redis (JobStore & EventBus)", "Server-Sent Events (SSE)"],
  },
];

export default function ArchitectureSection() {
  return (
    <section>
      <h2 className="text-center font-mono text-xl font-black uppercase tracking-widest sm:text-2xl">
        [ TECH STACK & INFRASTRUCTURE ]
      </h2>

      <div className="mx-auto mt-12 grid max-w-3xl grid-cols-1">
        {TIERS.map((tier, i) => {
          const Icon = tier.icon;
          return (
            <div key={tier.label} className="grid grid-cols-1">
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="border-4 border-foreground bg-gradient-to-br from-cyan-500/10 to-purple-500/10 p-6 shadow-[6px_6px_0px_0px_var(--brand)] backdrop-blur-2xl"
              >
                <div className="mb-5 flex items-center gap-3 font-mono text-sm font-bold uppercase tracking-widest text-brand">
                  <Icon size={20} /> {tier.label}
                </div>
                <div className="flex flex-wrap gap-3">
                  {tier.items.map((item) => (
                    <span
                      key={item}
                      className="border-2 border-foreground bg-background/80 px-3 py-1.5 font-mono text-xs uppercase tracking-widest"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </motion.div>

              {i < TIERS.length - 1 && (
                <div className="flex h-16 items-center justify-center" aria-hidden>
                  <motion.div
                    animate={{ y: [-3, 3, -3] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                    className="text-brand"
                  >
                    <ArrowDownUp size={36} strokeWidth={3} />
                  </motion.div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}