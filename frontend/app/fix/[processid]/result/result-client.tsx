// frontend/app/fix/[processid]/result/result-client.tsx
"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bug,
  GitCompare,
  FlaskConical,
  Download,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Loader2,
  AlertTriangle,
  Copy,
  Check,
} from "lucide-react";

import { api, ApiError } from "@/lib/api";
import type { ProcessResultResponse } from "@/lib/types";

const TABS = [
  { id: "diagnosis",    label: "DIAGNOSIS",      icon: Bug },
  { id: "corrected",    label: "CORRECTED_CODE", icon: GitCompare },
  { id: "diff",         label: "DIFF",           icon: GitCompare },
  { id: "verification", label: "VERIFICATION",   icon: FlaskConical },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function ResultClient({ processId }: { processId: string }) {
  const [result, setResult] = useState<ProcessResultResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("diagnosis");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!processId) return;
    let cancelled = false;

    const load = async (attempt = 0) => {
      try {
        const data = await api.getResult(processId);
        if (!cancelled) setResult(data);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 202 && attempt < 30) {
          setTimeout(() => void load(attempt + 1), 1500);
          return;
        }
        setError(err instanceof ApiError ? err.message : "Failed to load result");
      }
    };

    void load();
    return () => { cancelled = true; };
  }, [processId]);

  const handleCopyId = () => {
    if (result?.process_id) {
      navigator.clipboard.writeText(result.process_id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (!result?.proposed_fix) return;
    const blob = new Blob([result.proposed_fix], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = result.filename ?? "corrected.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-24 text-center font-mono">
        <div className="border-4 border-red-500 bg-black p-8 shadow-[8px_8px_0px_0px_#ef4444]">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white uppercase tracking-widest mb-2">SYSTEM_FAILURE</h1>
          <p className="text-sm text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-32 text-center font-mono">
        <Loader2 className="w-12 h-12 animate-spin mx-auto mb-6 text-cyan-400" />
        <h1 className="text-lg font-bold text-white uppercase tracking-widest mb-2">PROCESSING_DATA...</h1>
        <p className="text-sm text-gray-400">Awaiting graph completion.</p>
      </div>
    );
  }

  const verdict = result.verdict ?? "skipped";
  const isPartial = verdict === "partial" || (!result.verification?.results?.length && verdict !== "failed");

  return (
    <div className="max-w-5xl mx-auto px-6 py-12 font-mono">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-12 border-b-4 border-white pb-6">
        <div>
          <p className="text-xs font-bold text-cyan-400 tracking-[0.2em] mb-2 uppercase">
            // OUTPUT_REPORT
          </p>
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter break-all">
            {result.filename ?? "UNKNOWN_FILE"}
          </h1>
          <button 
            onClick={handleCopyId}
            className="group mt-2 flex items-center gap-2 text-xs text-gray-500 hover:text-cyan-400 transition-colors"
          >
            <span>ID: {result.process_id}</span>
            {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />}
          </button>
        </div>
        <button
          onClick={handleDownload}
          disabled={!result.proposed_fix}
          className="group relative inline-flex items-center gap-2 h-12 px-6 bg-white text-black font-bold text-sm uppercase tracking-wider border-4 border-black shadow-[6px_6px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_0px_#000] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-5 h-5 group-hover:animate-bounce" />
          DOWNLOAD_FIX
        </button>
      </div>

      {/* TABS */}
      <div className="flex flex-wrap items-center gap-2 mb-8">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest border-2 transition-all ${
              tab === id
                ? "bg-cyan-400 text-black border-cyan-400 shadow-[4px_4px_0px_0px_#fff]"
                : "bg-black text-gray-400 border-gray-700 hover:border-white hover:text-white"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* CONTENT AREA */}
      <div className="border-4 border-white bg-black shadow-[12px_12px_0px_0px_#22d3ee] p-1 relative overflow-hidden">
        {/* Liquidism: subtle gradient glow inside the brutalist box */}
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-purple-500/5 pointer-events-none" />

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative z-10 p-6"
          >
            {tab === "diagnosis" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider mb-3">
                    &gt; ROOT_CAUSE
                  </h3>
                  <div className="bg-black border-l-8 border-cyan-400 p-5">
                    <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                      {result.root_cause || "NO_DIAGNOSIS_AVAILABLE"}
                    </p>
                  </div>
                </div>
                {result.affected_lines.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider mb-3">
                      &gt; AFFECTED_LINES
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {result.affected_lines.map((n) => (
                        <span key={n} className="text-xs px-2 py-1 bg-cyan-400 text-black font-bold border-2 border-cyan-400">
                          L{n}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {result.explanation && (
                  <div>
                    <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider mb-3">
                      &gt; EXPLANATION
                    </h3>
                    <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                      {result.explanation}
                    </p>
                  </div>
                )}
              </div>
            )}

            {tab === "corrected" && (
              <pre className="text-xs text-green-400 leading-relaxed overflow-auto whitespace-pre-wrap font-mono bg-black p-5 border-2 border-gray-700">
                {result.proposed_fix || "// NO_CORRECTED_CODE_AVAILABLE"}
              </pre>
            )}

            {tab === "diff" && (
              <pre className="text-xs text-yellow-400 leading-relaxed overflow-auto whitespace-pre-wrap font-mono bg-black p-5 border-2 border-gray-700">
                {result.diff || "// NO_DIFF_AVAILABLE"}
              </pre>
            )}

            {tab === "verification" && (
              <div className="space-y-4">
                {/* TRANSPARENCY: If tests were skipped, warn the user */}
                {isPartial && result.verification?.results?.every(r => r.status === "skipped") && (
                  <div className="bg-yellow-950/30 border-4 border-yellow-500 p-4 mb-6">
                    <div className="flex items-center gap-3 text-yellow-500 mb-2">
                      <AlertTriangle className="w-5 h-5" />
                      <span className="font-bold text-sm uppercase tracking-widest">VERIFICATION_INCOMPLETE</span>
                    </div>
                    <p className="text-xs text-yellow-400/80">
                      No test cases were provided. The fix was only checked for syntax validity. 
                      Logical correctness cannot be guaranteed. Provide `test_code` in the form to enable full verification.
                    </p>
                  </div>
                )}

                {result.verification?.results?.length ? (
                  <div className="space-y-3">
                    {result.verification.results.map((r, i) => {
                      const Icon = r.status === "passed" ? CheckCircle2 : r.status === "failed" ? XCircle : MinusCircle;
                      const color = r.status === "passed" ? "text-green-400" : r.status === "failed" ? "text-red-400" : "text-gray-500";
                      const border = r.status === "passed" ? "border-green-400" : r.status === "failed" ? "border-red-400" : "border-gray-700";
                      
                      return (
                        <div key={i} className={`flex items-start gap-4 p-4 border-2 ${border} bg-black`}>
                          <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${color}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-white uppercase">{r.check}</p>
                            {r.output && (
                              <pre className="text-xs text-gray-400 mt-2 whitespace-pre-wrap font-mono bg-black p-2 border border-gray-800">
                                {r.output}
                              </pre>
                            )}
                          </div>
                          <span className={`text-xs font-bold uppercase ${color}`}>{r.status}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">// NO_VERIFICATION_CHECKS_RUN</p>
                )}
                
                <div className="mt-8 pt-6 border-t-4 border-gray-800 flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">VERDICT</span>
                  <span className={`text-xl px-4 py-1 font-black uppercase tracking-widest border-4 ${
                    verdict === "passed" ? "text-green-400 border-green-400 bg-green-950/30" : 
                    verdict === "failed" ? "text-red-400 border-red-400 bg-red-950/30" : 
                    "text-yellow-400 border-yellow-400 bg-yellow-950/30"
                  }`}>
                    {verdict}
                  </span>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* WARNINGS / ERRORS */}
      {result.errors.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-8 border-4 border-red-500 bg-black p-6 shadow-[8px_8px_0px_0px_#ef4444] relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-red-500/10 animate-pulse pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-500" />
              <p className="text-sm font-bold text-red-500 uppercase tracking-widest">SYSTEM_WARNINGS</p>
            </div>
            <ul className="space-y-3">
              {result.errors.map((e, i) => (
                <li key={i} className="text-xs text-red-400 font-mono flex gap-3 items-start">
                  <span className="text-red-500 font-bold mt-0.5">&gt;</span> 
                  <span className="break-all">{e}</span>
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      )}
    </div>
  );
}

