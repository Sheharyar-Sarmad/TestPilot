"use client"
import { useState } from "react";
import { ChevronDown } from "lucide-react";

const FAQ = [
  {
    q: "Is TestPilot AI free to use?",
    a: "Yes. There are no accounts and no paywalls. Rate limits apply per IP so the service stays available to everyone.",
  },
  {
    q: "Do you store my code?",
    a: "No. Your file is stored in Redis with a one-hour TTL, then deleted automatically. No permanent storage, no history, no backups.",
  },
  {
    q: "Which languages are supported?",
    a: "Python is fully supported today with AST-based parsing and syntax verification. Other languages are analyzed by the LLM and syntax-checked where a parser is available. Coverage is expanding.",
  },
  {
    q: "Can it fix an entire repository?",
    a: "No. TestPilot AI processes exactly one file per job. It's a focused debugger, not a repo-wide coding agent. If you need multi-file changes, use a repo-aware tool.",
  },
  {
    q: "How does verification actually work?",
    a: "Tests and linters run inside a disposable Docker container with no network access, a read-only filesystem, and dropped Linux capabilities. If a check can't run, we say so explicitly — we never claim a test passed unless it actually ran.",
  },
  {
    q: "Is the code sent to an external service?",
    a: "Yes — your source file is sent to a Groq-hosted LLM for analysis. That's how the diagnosis works. Do not submit secrets, credentials, or regulated data.",
  },
  {
    q: "What if the fix is wrong?",
    a: "You review the diff before applying anything. We never auto-apply, auto-commit, or push to your repo. The corrected file is offered as a download — you decide what to do with it.",
  },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleItem = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    // Transparent background, inherits your theme's bg naturally
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-4xl px-6 lg:px-8">
        
        {/* Header Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center rounded-none px-4 py-1.5 text-xs font-black tracking-widest text-black bg-[var(--brand)] border-2 border-black dark:border-white uppercase mb-6">
            FAQ
          </div>
          <h2 className="text-4xl font-black uppercase tracking-tight text-zinc-900 dark:text-white sm:text-5xl mb-4">
            Questions, answered.
          </h2>
          <p className="text-lg font-medium leading-8 text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            Everything you need to know about TestPilot AI, security, and how our verification engine works.
          </p>
        </div>

        {/* Custom Accordion (Replaces the buggy shadcn component) */}
        <div className="space-y-4">
          {FAQ.map(({ q, a }, i) => {
            const isOpen = openIndex === i;
            return (
              <div
                key={q}
                className={`group border-4 border-black dark:border-white liquid-glass rounded-2xl transition-all duration-300 shadow-[6px_6px_0px_0px_#000] dark:shadow-[6px_6px_0px_0px_#fff] ${
                  isOpen
                    ? "border-[var(--brand)]/50 bg-zinc-100 dark:bg-zinc-800"
                    : "bg-transparent hover:border-[var(--brand)]/30 hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                }`}
              >
                <button
                  onClick={() => toggleItem(i)}
                  aria-expanded={isOpen}
                  className={`flex items-center justify-between w-full p-5 text-left font-bold uppercase tracking-wide text-base sm:text-lg transition-colors ${
                    isOpen 
                      ? "text-[var(--brand)]" 
                      : "text-zinc-900 dark:text-zinc-100 group-hover:text-[var(--brand)]"
                  }`}
                >
                  {q}
                  <ChevronDown
                    className={`w-5 h-5 shrink-0 transition-transform duration-300 ${
                      isOpen ? "rotate-180 text-[var(--brand)]" : "text-zinc-500"
                    }`}
                  />
                </button>
                
                {/* Smooth Height Animation using CSS Grid trick */}
                <div
                  className={`grid transition-all duration-300 ease-in-out ${
                    isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="p-5 pt-0 text-zinc-600 dark:text-zinc-400 font-medium leading-relaxed text-sm sm:text-base">
                      {a}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
      </div>
    </section>
  );
}