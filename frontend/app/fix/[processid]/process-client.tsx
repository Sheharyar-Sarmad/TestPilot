"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Circle, Loader2, XCircle, Terminal } from "lucide-react";

import { useProcessStream } from "@/hooks/useProcessStream";

const STAGES = [
  { id: "validate_input", label: "VALIDATE_INPUT" },
  { id: "detect_language", label: "DETECT_LANGUAGE" },
  { id: "parse_source", label: "PARSE_SOURCE" },
  { id: "analyze_context", label: "ANALYZE_CONTEXT" },
  { id: "diagnose_bug", label: "DIAGNOSE_BUG" },
  { id: "generate_fix", label: "GENERATE_FIX" },
  { id: "review_fix", label: "REVIEW_FIX" },
  { id: "run_verification", label: "RUN_VERIFICATION" },
  { id: "finalize_result", label: "FINALIZE_RESULT" },
];

export function ProcessClient({ processId }: { processId: string }) {
  const router = useRouter();
  const stream = useProcessStream(processId);

  useEffect(() => {
    if (!processId) return;
    if (stream.done) {
      const t = setTimeout(
        () => router.replace(`/fix/${processId}/result`),
        800,
      );
      return () => clearTimeout(t);
    }
  }, [stream.done, processId, router]);

  return (
    <div className="max-w-5xl mx-auto px-6 py-12 font-mono">
      {/* HEADER */}
      <div className="mb-10 border-b-4 border-white pb-6">
        <p className="text-xs font-bold text-cyan-400 tracking-[0.2em] mb-2 uppercase">
          // SYSTEM_PROCESSING
        </p>
        <h1 className="text-3xl font-black text-white uppercase tracking-tighter mb-2">
          ANALYZING_FILE...
        </h1>
        <div className="inline-block bg-white text-black px-3 py-1 text-xs font-bold uppercase mt-2">
          ID: {processId || "MISSING_ID"}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-8">
        {/* STAGES LIST - BRUTALIST */}
        <div className="border-4 border-white bg-black p-4 shadow-[8px_8px_0px_0px_#fff]">
          <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4 border-b-2 border-gray-700 pb-2">
            &gt; EXECUTION_LOG
          </h3>
          <ol className="space-y-2">
            {STAGES.map(({ id, label }) => {
              const done = stream.completedNodes.includes(id);
              const active = stream.node === id && !done;
              
              return (
                <li
                  key={id}
                  className={`flex items-center gap-3 px-3 py-2 text-xs transition-all duration-300 border-2 ${
                    active
                      ? "bg-cyan-400 text-black border-cyan-400 shadow-[4px_4px_0px_0px_#fff] translate-x-1"
                      : done
                        ? "bg-black text-green-400 border-green-400"
                        : "bg-black text-gray-600 border-gray-800"
                  }`}
                >
                  {done ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : active ? (
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 shrink-0" />
                  )}
                  <span className="font-bold tracking-wider">{label}</span>
                  {active && (
                    <span className="ml-auto w-2 h-2 bg-black animate-pulse" />
                  )}
                </li>
              );
            })}
          </ol>
        </div>

        {/* TERMINAL BOX - LIQUID BRUTALISM */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="border-4 border-white bg-black shadow-[12px_12px_0px_0px_#22d3ee] relative overflow-hidden flex flex-col min-h-[500px]"
        >
          {/* Liquidism: Subtle gradient glow inside the box */}
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-purple-500/10 pointer-events-none" />

          {/* Terminal Header */}
          <div className="relative z-10 flex items-center gap-3 px-4 py-3 border-b-4 border-white bg-gray-900">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-white uppercase tracking-widest">
              LIVE_OUTPUT
            </span>
            {!stream.done && (
              <span className="ml-auto text-[10px] uppercase font-bold text-red-500 inline-flex items-center gap-2 border-2 border-red-500 px-2 py-0.5 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                REC
              </span>
            )}
          </div>

          {/* Terminal Body */}
          <div className="relative z-10 flex-1 p-6 text-sm leading-relaxed whitespace-pre-wrap overflow-auto text-green-400">
            {stream.tokens ? (
              <>
                {stream.tokens}
                {!stream.done && (
                  <span className="inline-block w-3 h-5 ml-1 bg-cyan-400 animate-pulse align-middle" />
                )}
              </>
            ) : (
              <span className="text-gray-500 animate-pulse">
                {stream.label ? `> ${stream.label}...` : "> Awaiting stream initiation..."}
                <span className="inline-block w-3 h-5 ml-1 bg-cyan-400 animate-pulse align-middle" />
              </span>
            )}
          </div>

          {/* Error State */}
          <AnimatePresence>
            {stream.error && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative z-10 px-6 py-4 border-t-4 border-red-500 bg-red-950/40 text-red-400 text-xs flex items-center gap-3 font-bold uppercase tracking-wider"
              >
                <XCircle className="w-5 h-5 shrink-0" />
                {stream.error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Success State */}
          <AnimatePresence>
            {stream.done && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative z-10 px-6 py-4 border-t-4 border-green-500 bg-green-950/40 text-green-400 text-xs flex items-center gap-3 font-bold uppercase tracking-wider"
              >
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                PROCESS_COMPLETE // REDIRECTING_TO_RESULTS...
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}