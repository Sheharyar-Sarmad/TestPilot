"use client";

import { motion } from "framer-motion";
import { Shield, Lock, Trash2 } from "lucide-react";

const CARDS = [
  { icon: Shield, title: "SSRF Protection", body: "Strict URL validation blocks localhost and private IPs." },
  { icon: Lock, title: "Isolated Sandbox", body: "Code is executed in a restricted environment." },
  { icon: Trash2, title: "Ephemeral Storage", body: "Jobs auto-expire after 1 hour. No data retention." },
];

export default function SecuritySectionAbout() {
  return (
    <section>
      <h2 className="text-center font-mono text-xl font-black uppercase tracking-widest sm:text-2xl">
        [ SECURITY & ISOLATION ]
      </h2>

      <div className="mt-12 grid gap-8 md:grid-cols-3">
        {CARDS.map(({ icon: Icon, title, body }) => (
          <motion.div
            key={title}
            whileHover={{ y: -10 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="rounded-3xl border-4 border-foreground/15 bg-foreground/5 p-8 shadow-[inset_0_2px_4px_rgba(255,255,255,0.1)] backdrop-blur-2xl transition-colors hover:border-brand"
          >
            <div className="inline-flex border-4 border-foreground bg-background p-3 text-brand">
              <Icon size={28} />
            </div>
            <h3 className="mt-6 font-mono text-lg font-bold uppercase tracking-widest">{title}</h3>
            <p className="mt-3 font-mono text-sm leading-relaxed text-muted-foreground">{body}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}