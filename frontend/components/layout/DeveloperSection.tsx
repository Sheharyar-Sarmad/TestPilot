"use client";

import { motion } from "framer-motion";
import { Code2, Briefcase } from "lucide-react";

const GITHUB_URL = "https://github.com/your-username"; // TODO: replace
const LINKEDIN_URL = "https://www.linkedin.com/in/your-handle"; // TODO: replace

const btn =
  "inline-flex items-center gap-2 border-4 border-foreground px-6 py-3 font-mono text-sm font-bold uppercase tracking-widest shadow-[6px_6px_0px_0px_var(--brand)] transition-all hover:translate-x-[6px] hover:translate-y-[6px] hover:shadow-none";

export default function DeveloperSection() {
  return (
    <section>
      <h2 className="text-center font-mono text-xl font-black uppercase tracking-widest sm:text-2xl">
        [ THE DEVELOPER ]
      </h2>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mx-auto mt-12 grid max-w-4xl gap-8 border-4 border-foreground bg-gradient-to-br from-cyan-500/10 to-purple-500/10 p-8 shadow-[6px_6px_0px_0px_var(--brand)] backdrop-blur-2xl md:grid-cols-[auto_1fr] md:p-12"
      >
        <div
          aria-hidden
          className="flex h-32 w-32 items-center justify-center border-4 border-foreground bg-background font-mono text-4xl font-black tracking-widest text-brand shadow-[6px_6px_0px_0px_var(--foreground)] md:h-40 md:w-40 md:text-5xl"
        >
          SS
        </div>

        <div>
          <h3 className="font-mono text-3xl font-black uppercase tracking-widest sm:text-4xl">Sheharyar Sarmad</h3>
          <p className="mt-2 font-mono text-sm font-bold uppercase tracking-widest text-brand">Full-Stack AI Engineer</p>
          <p className="mt-6 max-w-xl font-mono leading-relaxed text-muted-foreground">
            Passionate about building autonomous AI agents that solve real-world developer problems.
          </p>

          <div className="mt-8 flex flex-wrap gap-5">
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className={`${btn} bg-foreground text-background`}>
              <Code2 size={18} /> GitHub
            </a>
            <a href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer" className={`${btn} bg-background/70 backdrop-blur-xl`}>
              <Briefcase size={18} /> LinkedIn
            </a>
          </div>
        </div>
      </motion.div>
    </section>
  );
}