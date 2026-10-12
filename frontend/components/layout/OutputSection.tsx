"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bug, GitCompare, FlaskConical, CheckCircle2, XCircle, MinusCircle, Download, Loader2,
} from "lucide-react";

export function OutputSection({ data }: { data: any }) {
  const [activeTab, setActiveTab] = useState("diagnosis");
  const isStreaming = data.status === "running";

  // 🔥 Auto-switch to the tab that's currently being streamed
  useEffect(() => {
    if (!isStreaming) return;
    if (data.diagnosis && !data.correctedCode) setActiveTab("diagnosis");
    else if (data.correctedCode && !data.diff?.original) setActiveTab("corrected");
    else if (data.diff?.original) setActiveTab("diff");
    else if (data.verification?.length) setActiveTab("verification");
  }, [data, isStreaming]);

  // ... TABS array stays the same ...

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl liquid-glass overflow-hidden border-4 border-black dark:border-white shadow-[12px_12px_0px_0px_#000] dark:shadow-[12px_12px_0px_0px_#fff] bg-white dark:bg-zinc-950"
    >
      {/* Header Bar — now with a live pulse indicator */}
      <div className="flex items-center justify-between px-6 py-4 border-b-4 border-black dark:border-white bg-black dark:bg-white">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-black uppercase tracking-widest text-white dark:text-black">
            Agent Output
          </h3>
          {isStreaming && (
            <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-[var(--brand)] text-black font-black uppercase tracking-wider text-[10px] border-2 border-white dark:border-black">
              <Loader2 className="w-3 h-3 animate-spin" />
              Live
            </span>
          )}
        </div>
        <button
          disabled={isStreaming}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--brand)] text-black font-black uppercase tracking-wider text-xs border-2 border-black dark:border-white shadow-[2px_2px_0px_0px_#000] disabled:opacity-50 disabled:cursor-not-allowed hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
        >
          <Download className="w-3.5 h-3.5" />
          Download Fix
        </button>
      </div>

      {/* ... Tabs (same as before) ... */}

      {/* Diagnosis tab — now shows a blinking cursor while streaming */}
      {activeTab === "diagnosis" && (
        <div className="p-6 border-4 border-black dark:border-white bg-zinc-50 dark:bg-zinc-900 font-medium leading-relaxed">
          {data.diagnosis}
          {isStreaming && data.status === "diagnosis_running" && (
            <span className="inline-block w-3 h-5 ml-1 bg-[var(--brand)] animate-pulse" />
          )}
        </div>
      )}

      {/* ... Other tabs (same as before) ... */}
    </motion.div>
  );
}