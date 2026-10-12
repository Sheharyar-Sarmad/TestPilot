"use client";

import { motion } from "framer-motion";

const STACK = [
  "Python", "FastAPI", "LangGraph", "Redis", "Next.js",
  "TypeScript", "Tailwind CSS", "Monaco Editor", "Framer Motion", "Docker",
];

export default function TechStackSection() {
  return (
    <section>
      <h2 className="text-center font-mono text-xl font-black uppercase tracking-widest sm:text-2xl">
        [ BUILT WITH ]
      </h2>

      <div className="mt-12 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
        {STACK.map((tech, i) => (
          <motion.div
            key={tech}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.04 }}
            whileHover={{ boxShadow: "0 0 24px 2px rgba(34,211,238,0.7)" }}
            className="border-4 border-foreground bg-background/70 px-4 py-5 text-center font-mono text-xs font-bold uppercase tracking-widest backdrop-blur-xl transition-colors hover:border-brand hover:text-brand"
          >
            {tech}
          </motion.div>
        ))}
      </div>
    </section>
  );
}