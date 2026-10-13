// frontend/app/fix/[processid]/result/result-client.tsx
"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bug,
  GitCompare,
  FileCode2,
  FlaskConical,
  Download,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Loader2,
  AlertTriangle,
  Copy,
  Check,
  FileDiff,
  Columns2,
  Rows3,
  Plus,
  Minus,
  Crosshair,
  RotateCcw,
  ShieldCheck,
  ShieldAlert,
  Terminal,
} from "lucide-react";

import { api, ApiError } from "@/lib/api";
import type { ProcessResultResponse } from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Monaco (client only)                                                */
/* ------------------------------------------------------------------ */
const Monaco = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="h-[420px] flex items-center justify-center text-xs font-mono text-cyan-400 bg-[#0a0a0a]">
      <Loader2 className="w-5 h-5 animate-spin mr-3" />
      LOADING_EDITOR...
    </div>
  ),
});

/* ------------------------------------------------------------------ */
/* Constants + helpers                                                 */
/* ------------------------------------------------------------------ */
const TABS = [
  { id: "diagnosis",    label: "DIAGNOSIS",      icon: Bug,          key: "1" },
  { id: "corrected",    label: "CORRECTED_CODE", icon: FileCode2,    key: "2" },
  { id: "diff",         label: "DIFF",           icon: GitCompare,   key: "3" },
  { id: "verification", label: "VERIFICATION",   icon: FlaskConical, key: "4" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const LANG_MAP: Record<string, string> = {
  py: "python", js: "javascript", ts: "typescript", jsx: "javascript",
  tsx: "typescript", java: "java", go: "go", rs: "rust", rb: "ruby",
  cpp: "cpp", c: "c", cs: "csharp", php: "php", md: "markdown",
};

function detectLanguage(filename?: string | null): string {
  const ext = filename?.split(".").pop()?.toLowerCase() ?? "";
  return LANG_MAP[ext] ?? "plaintext";
}

type DiffRowType = "hunk" | "ctx" | "add" | "del";
interface DiffRow {
  type: DiffRowType;
  oldNo: number | null;
  newNo: number | null;
  text: string;
}

function parseUnifiedDiff(diff: string): DiffRow[] {
  const rows: DiffRow[] = [];
  let oldNo = 0;
  let newNo = 0;
  let inHunk = false;

  for (const line of diff.replace(/\r\n/g, "\n").split("\n")) {
    const hunk = line.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@(.*)$/);
    if (hunk) {
      oldNo = parseInt(hunk[1], 10);
      newNo = parseInt(hunk[2], 10);
      inHunk = true;
      rows.push({ type: "hunk", oldNo: null, newNo: null, text: line });
      continue;
    }
    if (!inHunk) continue; // skip ---/+++ file headers
    if (line.startsWith("\\")) continue; // "\ No newline at end of file"
    if (line.startsWith("+")) {
      rows.push({ type: "add", oldNo: null, newNo: newNo++, text: line.slice(1) });
    } else if (line.startsWith("-")) {
      rows.push({ type: "del", oldNo: oldNo++, newNo: null, text: line.slice(1) });
    } else {
      rows.push({ type: "ctx", oldNo: oldNo++, newNo: newNo++, text: line.startsWith(" ") ? line.slice(1) : line });
    }
  }
  // drop trailing empty context row produced by final newline
  while (rows.length && rows[rows.length - 1].type === "ctx" && rows[rows.length - 1].text === "") rows.pop();
  return rows;
}

interface SplitRow {
  left: DiffRow | null;
  right: DiffRow | null;
  hunk?: DiffRow;
}

function toSplit(rows: DiffRow[]): SplitRow[] {
  const out: SplitRow[] = [];
  let i = 0;
  while (i < rows.length) {
    const r = rows[i];
    if (r.type === "hunk") {
      out.push({ left: null, right: null, hunk: r });
      i++;
    } else if (r.type === "ctx") {
      out.push({ left: r, right: r });
      i++;
    } else {
      const dels: DiffRow[] = [];
      const adds: DiffRow[] = [];
      while (i < rows.length && rows[i].type === "del") dels.push(rows[i++]);
      while (i < rows.length && rows[i].type === "add") adds.push(rows[i++]);
      const n = Math.max(dels.length, adds.length);
      for (let k = 0; k < n; k++) out.push({ left: dels[k] ?? null, right: adds[k] ?? null });
    }
  }
  return out;
}

function downloadText(content: string, name: string) {
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

/* ------------------------------------------------------------------ */
/* Small UI parts                                                      */
/* ------------------------------------------------------------------ */
function EditorChrome({
  filename,
  language,
  badge,
  right,
  children,
  status,
}: {
  filename: string;
  language: string;
  badge?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  status: React.ReactNode;
}) {
  return (
    <div className="border-4 border-white bg-[#0a0a0a] shadow-[8px_8px_0px_0px_#22d3ee] overflow-hidden">
      {/* title bar */}
      <div className="flex items-center justify-between gap-4 px-4 py-2.5 border-b-4 border-white bg-[#111827]">
        <div className="flex items-center gap-3 min-w-0">
          <div className="hidden sm:flex items-center gap-1.5 mr-1">
            <span className="w-2.5 h-2.5 bg-red-500 border border-black" />
            <span className="w-2.5 h-2.5 bg-yellow-400 border border-black" />
            <span className="w-2.5 h-2.5 bg-green-400 border border-black" />
          </div>
          <FileCode2 className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="text-sm font-bold text-white truncate">{filename}</span>
          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-cyan-400 text-black shrink-0">
            {language}
          </span>
          {badge && (
            <span className="hidden md:inline text-[10px] font-black uppercase tracking-wider px-2 py-0.5 border-2 border-gray-600 text-gray-400 shrink-0">
              {badge}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">{right}</div>
      </div>
      {children}
      {/* status bar */}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-1.5 border-t-4 border-white bg-cyan-400 text-black text-[11px] font-bold uppercase tracking-wider">
        {status}
      </div>
    </div>
  );
}

function IconButton({
  onClick,
  children,
  active,
  disabled,
  title,
}: {
  onClick: () => void;
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 h-7 px-2.5 text-[11px] font-bold uppercase tracking-wider border-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
        active
          ? "bg-cyan-400 text-black border-cyan-400"
          : "bg-black text-gray-300 border-gray-600 hover:border-white hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function StatCard({
  label,
  value,
  sub,
  tone = "white",
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  tone?: "white" | "cyan" | "green" | "red" | "yellow" | "purple";
}) {
  const tones: Record<string, string> = {
    white: "text-white",
    cyan: "text-cyan-400",
    green: "text-green-400",
    red: "text-red-400",
    yellow: "text-yellow-400",
    purple: "text-purple-400",
  };
  return (
    <div className="border-4 border-white bg-black p-4 shadow-[4px_4px_0px_0px_#fff]">
      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-2">{label}</p>
      <p className={`text-3xl font-black tracking-tighter leading-none ${tones[tone]}`}>{value}</p>
      {sub && <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-2">{sub}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Diff viewer (real editor feel: gutters, hunks, +/- colouring)       */
/* ------------------------------------------------------------------ */
function DiffLine({
  no,
  sign,
  text,
  type,
}: {
  no: number | null;
  sign: string;
  text: string;
  type: DiffRowType | "empty";
}) {
  const bg =
    type === "add" ? "bg-green-500/15" : type === "del" ? "bg-red-500/15" : type === "empty" ? "bg-[#0d0d0d]" : "";
  const gutter =
    type === "add" ? "text-green-400 bg-green-500/20" : type === "del" ? "text-red-400 bg-red-500/20" : "text-gray-600";
  const signColor = type === "add" ? "text-green-400" : type === "del" ? "text-red-400" : "text-gray-700";
  const textColor = type === "add" ? "text-green-100" : type === "del" ? "text-red-100" : "text-gray-300";
  return (
    <div className={`flex min-w-full w-max ${bg}`}>
      <span className={`w-12 shrink-0 text-right pr-3 select-none tabular-nums ${gutter}`}>{no ?? ""}</span>
      <span className={`w-5 shrink-0 text-center select-none font-black ${signColor}`}>{sign}</span>
      <span className={`pr-6 whitespace-pre ${textColor}`}>{text || " "}</span>
    </div>
  );
}

function DiffViewer({ rows, view }: { rows: DiffRow[]; view: "unified" | "split" }) {
  const split = useMemo(() => toSplit(rows), [rows]);

  if (view === "unified") {
    return (
      <div className="overflow-auto max-h-[620px] py-2 text-[13px] leading-[1.65] font-mono">
        {rows.map((r, i) =>
          r.type === "hunk" ? (
            <div key={i} className="px-4 py-1 my-1 bg-purple-500/15 text-purple-300 border-y border-purple-500/30 min-w-full w-max">
              {r.text}
            </div>
          ) : (
            <DiffLine
              key={i}
              no={r.type === "del" ? r.oldNo : r.newNo}
              sign={r.type === "add" ? "+" : r.type === "del" ? "-" : " "}
              text={r.text}
              type={r.type}
            />
          )
        )}
      </div>
    );
  }

  return (
    <div className="overflow-auto max-h-[620px] text-[13px] leading-[1.65] font-mono">
      <div className="grid grid-cols-2 min-w-[900px] divide-x-4 divide-white">
        <div className="py-2">
          <p className="px-4 pb-1 text-[10px] font-bold text-red-400 uppercase tracking-[0.2em]">ORIGINAL</p>
          {split.map((s, i) =>
            s.hunk ? (
              <div key={i} className="px-4 py-1 my-1 bg-purple-500/15 text-purple-300 border-y border-purple-500/30 truncate">
                {s.hunk.text}
              </div>
            ) : s.left ? (
              <DiffLine key={i} no={s.left.oldNo} sign={s.left.type === "del" ? "-" : " "} text={s.left.text} type={s.left.type} />
            ) : (
              <DiffLine key={i} no={null} sign=" " text="" type="empty" />
            )
          )}
        </div>
        <div className="py-2">
          <p className="px-4 pb-1 text-[10px] font-bold text-green-400 uppercase tracking-[0.2em]">CORRECTED</p>
          {split.map((s, i) =>
            s.hunk ? (
              <div key={i} className="px-4 py-1 my-1 bg-purple-500/15 text-purple-300 border-y border-purple-500/30 truncate">
                {s.hunk.text}
              </div>
            ) : s.right ? (
              <DiffLine key={i} no={s.right.newNo} sign={s.right.type === "add" ? "+" : " "} text={s.right.text} type={s.right.type} />
            ) : (
              <DiffLine key={i} no={null} sign=" " text="" type="empty" />
            )
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */
export function ResultClient({ processId }: { processId: string }) {
  const [result, setResult] = useState<ProcessResultResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("diagnosis");
  const [copiedId, setCopiedId] = useState(false);
  const [copiedFix, setCopiedFix] = useState(false);
  const [diffView, setDiffView] = useState<"unified" | "split">("unified");
  const [cursor, setCursor] = useState({ ln: 1, col: 1 });
  const [waitSeconds, setWaitSeconds] = useState(0);

  const editorRef = useRef<any>(null);

  /* ---------------- load result (poll while 202) ---------------- */
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
    return () => {
      cancelled = true;
    };
  }, [processId]);

  useEffect(() => {
    if (result || error) return;
    const t = setInterval(() => setWaitSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [result, error]);

  /* ---------------- keyboard shortcuts 1-4 ---------------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.closest(".monaco-editor"))) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const hit = TABS.find((t) => t.key === e.key);
      if (hit) setTab(hit.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* ---------------- derived data ---------------- */
  const diffRows = useMemo(() => (result?.diff ? parseUnifiedDiff(result.diff) : []), [result?.diff]);
  const added = diffRows.filter((r) => r.type === "add").length;
  const removed = diffRows.filter((r) => r.type === "del").length;
  const addedLineNumbers = useMemo(
    () => diffRows.filter((r) => r.type === "add" && r.newNo).map((r) => r.newNo as number),
    [diffRows]
  );

  const language = detectLanguage(result?.filename);
  const fixLines = result?.proposed_fix ? result.proposed_fix.split("\n").length : 0;

  /* ---------------- actions ---------------- */
  const handleCopyId = () => {
    if (!result?.process_id) return;
    void navigator.clipboard.writeText(result.process_id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleCopyFix = () => {
    if (!result?.proposed_fix) return;
    void navigator.clipboard.writeText(result.proposed_fix);
    setCopiedFix(true);
    setTimeout(() => setCopiedFix(false), 2000);
  };

  const handleDownload = () => {
    if (!result?.proposed_fix) return;
    downloadText(result.proposed_fix, result.filename ?? "corrected.txt");
  };

  const handleDownloadPatch = () => {
    if (!result?.diff) return;
    const base = (result.filename ?? "fix").replace(/\.[^.]+$/, "");
    downloadText(result.diff, `${base}.patch`);
  };

  /* ---------------- monaco setup ---------------- */
  const beforeMount = useCallback((monaco: any) => {
    monaco.editor.defineTheme("testpilot", {
      base: "vs-dark",
      inherit: true,
      rules: [],
      colors: {
        "editor.background": "#0a0a0a",
        "editorGutter.background": "#0a0a0a",
        "editorLineNumber.foreground": "#4b5563",
        "editorLineNumber.activeForeground": "#22d3ee",
        "editor.lineHighlightBackground": "#ffffff0d",
        "editor.lineHighlightBorder": "#00000000",
        "editor.selectionBackground": "#22d3ee33",
        "editorCursor.foreground": "#22d3ee",
        "editorIndentGuide.background1": "#1f2937",
        "editorIndentGuide.activeBackground1": "#374151",
        "scrollbarSlider.background": "#ffffff22",
        "scrollbarSlider.hoverBackground": "#22d3ee55",
        "minimap.background": "#0a0a0a",
      },
    });
  }, []);

  const onMount = useCallback(
    (editor: any, monaco: any) => {
      editorRef.current = editor;
      editor.onDidChangeCursorPosition((e: any) =>
        setCursor({ ln: e.position.lineNumber, col: e.position.column })
      );
      if (addedLineNumbers.length) {
        editor.createDecorationsCollection(
          addedLineNumbers.map((n) => ({
            range: new monaco.Range(n, 1, n, 1),
            options: {
              isWholeLine: true,
              className: "tp-added-line",
              linesDecorationsClassName: "tp-added-gutter",
            },
          }))
        );
      }
    },
    [addedLineNumbers]
  );

  /* ---------------- states ---------------- */
  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-24 font-mono">
        <div className="border-4 border-red-500 bg-black p-8 shadow-[8px_8px_0px_0px_#ef4444]">
          <div className="flex items-center gap-3 mb-6">
            <XCircle className="w-8 h-8 text-red-500" />
            <h1 className="text-2xl font-black text-white uppercase tracking-tighter">SYSTEM_FAILURE</h1>
          </div>
          <div className="bg-red-950/40 border-l-8 border-red-500 p-4 mb-6">
            <p className="text-sm text-red-300 break-words">&gt; {error}</p>
          </div>
          <Link
            href="/fix"
            className="inline-flex items-center gap-2 h-11 px-5 bg-white text-black font-black text-xs uppercase tracking-widest border-4 border-black shadow-[4px_4px_0px_0px_#ef4444] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_#ef4444] transition-all"
          >
            <RotateCcw className="w-4 h-4" /> NEW_ANALYSIS
          </Link>
        </div>
      </div>
    );
  }

  if (!result) {
    const steps = ["INGEST", "TRACE_CAUSE", "GENERATE_FIX", "VERIFY"];
    const active = Math.min(Math.floor(waitSeconds / 6), steps.length - 1);
    return (
      <div className="max-w-xl mx-auto px-6 py-28 font-mono">
        <div className="border-4 border-white bg-black p-8 shadow-[8px_8px_0px_0px_#a855f7]">
          <div className="flex items-center gap-3 mb-6">
            <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
            <h1 className="text-lg font-black text-white uppercase tracking-widest">PROCESSING_DATA</h1>
            <span className="ml-auto text-xs text-gray-500 tabular-nums">{waitSeconds}s</span>
          </div>
          <ul className="space-y-2 mb-6">
            {steps.map((s, i) => (
              <li key={s} className="flex items-center gap-3 text-xs font-bold uppercase tracking-wider">
                {i < active ? (
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                ) : i === active ? (
                  <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                ) : (
                  <MinusCircle className="w-4 h-4 text-gray-700" />
                )}
                <span className={i <= active ? "text-white" : "text-gray-600"}>{s}</span>
              </li>
            ))}
          </ul>
          <div className="h-2 bg-gray-900 border-2 border-gray-700">
            <div
              className="h-full bg-cyan-400 transition-all duration-1000"
              style={{ width: `${Math.min(((active + 1) / steps.length) * 100, 100)}%` }}
            />
          </div>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-4">
            Awaiting graph completion. This page updates automatically.
          </p>
        </div>
      </div>
    );
  }

  /* ---------------- ready ---------------- */
  const verdict = result.verdict ?? "skipped";
  const checks = result.verification?.results ?? [];
  const passedChecks = checks.filter((c) => c.status === "passed").length;
  const failedChecks = checks.filter((c) => c.status === "failed").length;
  const allSkipped = checks.length > 0 && checks.every((c) => c.status === "skipped");
  const noChecks = checks.length === 0;
  const testsSkipped = checks.some((c) => c.check?.toLowerCase().includes("test") && c.status === "skipped");

  const verdictTone =
    verdict === "passed" ? "green" : verdict === "failed" ? "red" : "yellow";
  const verdictClasses =
    verdict === "passed"
      ? "text-green-400 border-green-400 bg-green-950/30"
      : verdict === "failed"
      ? "text-red-400 border-red-400 bg-red-950/30"
      : "text-yellow-400 border-yellow-400 bg-yellow-950/30";
  const VerdictIcon = verdict === "passed" ? ShieldCheck : verdict === "failed" ? ShieldAlert : AlertTriangle;

  const editorHeight = Math.min(Math.max(fixLines * 19 + 32, 320), 640);

  return (
    <div className="max-w-6xl mx-auto px-6 py-12 font-mono">
      {/* global editor decoration styles */}
      <style>{`
        .tp-added-line { background: rgba(34,197,94,0.12); }
        .tp-added-gutter { background: #22c55e; width: 4px !important; margin-left: 3px; }
        .monaco-editor, .monaco-editor-background, .monaco-editor .margin { background-color: #0a0a0a !important; }
      `}</style>

      {/* ============ HEADER ============ */}
      <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-6 mb-8 border-b-4 border-white pb-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-400 text-black text-xs font-black uppercase tracking-widest">
              <Terminal className="w-3 h-3" /> OUTPUT_REPORT
            </span>
            <span className={`inline-flex items-center gap-2 px-3 py-1 text-xs font-black uppercase tracking-widest border-2 ${verdictClasses}`}>
              <VerdictIcon className="w-3 h-3" /> {verdict}
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter break-all leading-none">
            {result.filename ?? "UNKNOWN_FILE"}
          </h1>
          <button
            onClick={handleCopyId}
            className="group mt-3 flex items-center gap-2 text-xs text-gray-500 hover:text-cyan-400 transition-colors"
          >
            <span>ID: {result.process_id}</span>
            {copiedId ? (
              <Check className="w-3 h-3 text-green-400" />
            ) : (
              <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/fix"
            className="inline-flex items-center gap-2 h-12 px-5 bg-black text-white font-bold text-xs uppercase tracking-wider border-4 border-white shadow-[4px_4px_0px_0px_#a855f7] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_#a855f7] transition-all"
          >
            <RotateCcw className="w-4 h-4" /> NEW_ANALYSIS
          </Link>
          <button
            onClick={handleDownload}
            disabled={!result.proposed_fix}
            className="group inline-flex items-center gap-2 h-12 px-6 bg-cyan-400 text-black font-black text-sm uppercase tracking-wider border-4 border-black shadow-[6px_6px_0px_0px_#fff] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_0px_#fff] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-5 h-5 group-hover:animate-bounce" />
            DOWNLOAD_FIX
          </button>
        </div>
      </div>

      {/* ============ STATS ============ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <StatCard label="VERDICT" value={verdict.toUpperCase()} tone={verdictTone as any} sub={noChecks ? "no checks run" : `${passedChecks}/${checks.length} checks passed`} />
        <StatCard label="LINES_CHANGED" value={
          <span className="inline-flex items-baseline gap-3">
            <span className="text-green-400">+{added}</span>
            <span className="text-red-400">-{removed}</span>
          </span>
        } sub={`${diffRows.filter((r) => r.type === "hunk").length} hunk(s)`} />
        <StatCard label="AFFECTED_LINES" value={result.affected_lines.length} tone="cyan" sub={result.affected_lines.length ? `first: L${result.affected_lines[0]}` : "none flagged"} />
        <StatCard label="FIX_SIZE" value={fixLines} tone="purple" sub="lines of code" />
      </div>

      {/* ============ TABS ============ */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {TABS.map(({ id, label, icon: Icon, key }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-widest border-2 transition-all ${
              tab === id
                ? "bg-cyan-400 text-black border-cyan-400 shadow-[4px_4px_0px_0px_#fff] -translate-y-0.5"
                : "bg-black text-gray-400 border-gray-700 hover:border-white hover:text-white"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
            <kbd
              className={`hidden sm:inline-block text-[10px] px-1.5 border ${
                tab === id ? "border-black/40 text-black/70" : "border-gray-700 text-gray-500"
              }`}
            >
              {key}
            </kbd>
          </button>
        ))}
      </div>

      {/* ============ CONTENT ============ */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          {/* ---------- DIAGNOSIS ---------- */}
          {tab === "diagnosis" && (
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
              <div className="space-y-8">
                <section className="border-4 border-white bg-black shadow-[8px_8px_0px_0px_#22d3ee]">
                  <header className="flex items-center gap-3 px-5 py-3 border-b-4 border-white bg-[#111827]">
                    <Crosshair className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-sm font-black text-white uppercase tracking-widest">&gt; ROOT_CAUSE</h3>
                  </header>
                  <div className="border-l-8 border-cyan-400 m-5 p-5 bg-[#0a0a0a]">
                    <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
                      {result.root_cause || "NO_DIAGNOSIS_AVAILABLE"}
                    </p>
                  </div>
                </section>

                {result.explanation && (
                  <section className="border-4 border-white bg-black shadow-[8px_8px_0px_0px_#fff]">
                    <header className="flex items-center gap-3 px-5 py-3 border-b-4 border-white bg-[#111827]">
                      <Bug className="w-4 h-4 text-purple-400" />
                      <h3 className="text-sm font-black text-white uppercase tracking-widest">&gt; EXPLANATION</h3>
                    </header>
                    <p className="p-5 text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                      {result.explanation}
                    </p>
                  </section>
                )}
              </div>

              <aside className="space-y-8">
                <section className="border-4 border-white bg-black p-5 shadow-[8px_8px_0px_0px_#a855f7]">
                  <h3 className="text-xs font-black text-cyan-400 uppercase tracking-[0.2em] mb-4 border-b-2 border-gray-800 pb-2">
                    &gt; AFFECTED_LINES
                  </h3>
                  {result.affected_lines.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {result.affected_lines.map((n) => (
                        <span key={n} className="text-xs px-2 py-1 bg-cyan-400 text-black font-black border-2 border-cyan-400">
                          L{n}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">// NO_LINES_FLAGGED</p>
                  )}
                </section>

                <section className="border-4 border-white bg-black p-5 shadow-[8px_8px_0px_0px_#fff]">
                  <h3 className="text-xs font-black text-cyan-400 uppercase tracking-[0.2em] mb-4 border-b-2 border-gray-800 pb-2">
                    &gt; PIPELINE
                  </h3>
                  <ul className="space-y-3 text-xs font-bold uppercase tracking-wider">
                    {(checks.length ? checks : [{ check: "verification", status: "skipped" }]).map((c, i) => (
                      <li key={i} className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-2 text-gray-300 truncate">
                          {c.status === "passed" ? (
                            <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                          ) : c.status === "failed" ? (
                            <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                          ) : (
                            <MinusCircle className="w-4 h-4 text-gray-600 shrink-0" />
                          )}
                          <span className="truncate">{c.check}</span>
                        </span>
                        <span className={c.status === "passed" ? "text-green-400" : c.status === "failed" ? "text-red-400" : "text-gray-500"}>
                          {c.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => setTab("verification")}
                    className="mt-5 w-full h-9 text-[11px] font-bold uppercase tracking-widest border-2 border-gray-600 text-gray-300 hover:border-white hover:text-white transition-colors"
                  >
                    VIEW_FULL_REPORT
                  </button>
                </section>
              </aside>
            </div>
          )}

          {/* ---------- CORRECTED CODE ---------- */}
          {tab === "corrected" && (
            <EditorChrome
              filename={result.filename ?? "corrected.txt"}
              language={language}
              badge="READ_ONLY"
              right={
                <>
                  <IconButton onClick={handleCopyFix} disabled={!result.proposed_fix} title="Copy corrected code">
                    {copiedFix ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedFix ? "COPIED" : "COPY"}
                  </IconButton>
                  <IconButton onClick={handleDownload} disabled={!result.proposed_fix} title="Download corrected file">
                    <Download className="w-3.5 h-3.5" /> SAVE
                  </IconButton>
                </>
              }
              status={
                <>
                  <span>
                    LN {cursor.ln}, COL {cursor.col}
                  </span>
                  <span className="flex items-center gap-4">
                    <span>{fixLines} LINES</span>
                    {addedLineNumbers.length > 0 && <span>{addedLineNumbers.length} CHANGED</span>}
                    <span>SPACES: 4</span>
                    <span>UTF-8</span>
                    <span>{language}</span>
                  </span>
                </>
              }
            >
              {result.proposed_fix ? (
                <Monaco
                  height={editorHeight}
                  language={language}
                  theme="testpilot"
                  value={result.proposed_fix}
                  beforeMount={beforeMount}
                  onMount={onMount}
                  options={{
                    readOnly: true,
                    domReadOnly: true,
                    minimap: { enabled: true, scale: 1, renderCharacters: false },
                    fontSize: 13,
                    lineHeight: 19,
                    fontFamily: "var(--font-jetbrains-mono), ui-monospace, monospace",
                    fontLigatures: true,
                    lineNumbers: "on",
                    scrollBeyondLastLine: false,
                    padding: { top: 16, bottom: 16 },
                    renderLineHighlight: "all",
                    smoothScrolling: true,
                    cursorBlinking: "smooth",
                    wordWrap: "off",
                    automaticLayout: true,
                    guides: { indentation: true, bracketPairs: true },
                    bracketPairColorization: { enabled: true },
                    folding: true,
                    scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
                    overviewRulerBorder: false,
                  }}
                />
              ) : (
                <p className="p-8 text-sm text-gray-500">// NO_CORRECTED_CODE_AVAILABLE</p>
              )}
            </EditorChrome>
          )}

          {/* ---------- DIFF ---------- */}
          {tab === "diff" && (
            <EditorChrome
              filename={`${result.filename ?? "file"}.diff`}
              language="diff"
              badge={`${diffRows.filter((r) => r.type === "hunk").length} HUNK(S)`}
              right={
                <>
                  <IconButton onClick={() => setDiffView("unified")} active={diffView === "unified"} title="Unified view">
                    <Rows3 className="w-3.5 h-3.5" /> UNIFIED
                  </IconButton>
                  <IconButton onClick={() => setDiffView("split")} active={diffView === "split"} title="Split view">
                    <Columns2 className="w-3.5 h-3.5" /> SPLIT
                  </IconButton>
                  <IconButton onClick={handleDownloadPatch} disabled={!result.diff} title="Download .patch">
                    <FileDiff className="w-3.5 h-3.5" /> PATCH
                  </IconButton>
                </>
              }
              status={
                <>
                  <span className="flex items-center gap-4">
                    <span className="inline-flex items-center gap-1">
                      <Plus className="w-3 h-3" /> {added} ADDED
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Minus className="w-3 h-3" /> {removed} REMOVED
                    </span>
                  </span>
                  <span className="flex items-center gap-4">
                    <span>{diffView.toUpperCase()}</span>
                    <span>UTF-8</span>
                  </span>
                </>
              }
            >
              {diffRows.length ? (
                <DiffViewer rows={diffRows} view={diffView} />
              ) : result.diff ? (
                <pre className="p-5 text-[13px] text-yellow-400 overflow-auto whitespace-pre font-mono">{result.diff}</pre>
              ) : (
                <p className="p-8 text-sm text-gray-500">// NO_DIFF_AVAILABLE</p>
              )}
            </EditorChrome>
          )}

          {/* ---------- VERIFICATION ---------- */}
          {tab === "verification" && (
            <div className="space-y-6">
              {(allSkipped || noChecks || testsSkipped) && verdict !== "failed" && (
                <div className="bg-yellow-950/30 border-4 border-yellow-500 p-5">
                  <div className="flex items-center gap-3 text-yellow-500 mb-2">
                    <AlertTriangle className="w-5 h-5" />
                    <span className="font-black text-sm uppercase tracking-widest">VERIFICATION_INCOMPLETE</span>
                  </div>
                  <p className="text-xs text-yellow-400/80 leading-relaxed">
                    No test cases were provided, so the fix was only checked for syntax validity. Logical correctness cannot be
                    guaranteed. Add test cases under OPTIONAL_CONTEXT on the submit page to enable full verification.
                  </p>
                </div>
              )}

              {verdict === "failed" && (
                <div className="bg-red-950/30 border-4 border-red-500 p-5">
                  <div className="flex items-center gap-3 text-red-400 mb-2">
                    <ShieldAlert className="w-5 h-5" />
                    <span className="font-black text-sm uppercase tracking-widest">FIX_REJECTED</span>
                  </div>
                  <p className="text-xs text-red-300/80 leading-relaxed">
                    {failedChecks} check(s) failed. Do not use this fix as-is. Run a new analysis; model output varies between
                    attempts and a second pass often produces valid code.
                  </p>
                </div>
              )}

              {/* terminal-style checks */}
              <div className="border-4 border-white bg-[#0a0a0a] shadow-[8px_8px_0px_0px_#22d3ee] overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 border-b-4 border-white bg-[#111827]">
                  <div className="flex items-center gap-3">
                    <Terminal className="w-4 h-4 text-cyan-400" />
                    <span className="text-sm font-bold text-white">sandbox.log</span>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-cyan-400 text-black">
                    {passedChecks} PASS / {failedChecks} FAIL / {checks.length - passedChecks - failedChecks} SKIP
                  </span>
                </div>

                {checks.length ? (
                  <div className="divide-y-2 divide-gray-900">
                    {checks.map((r, i) => {
                      const Icon = r.status === "passed" ? CheckCircle2 : r.status === "failed" ? XCircle : MinusCircle;
                      const color = r.status === "passed" ? "text-green-400" : r.status === "failed" ? "text-red-400" : "text-gray-500";
                      const bar = r.status === "passed" ? "border-green-400" : r.status === "failed" ? "border-red-400" : "border-gray-700";
                      return (
                        <div key={i} className={`flex items-start gap-4 p-5 border-l-8 ${bar}`}>
                          <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${color}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-4">
                              <p className="text-sm font-black text-white uppercase tracking-wider">{r.check}</p>
                              <span className={`text-xs font-black uppercase tracking-widest ${color}`}>{r.status}</span>
                            </div>
                            {r.output && (
                              <pre className="mt-3 text-xs text-gray-300 whitespace-pre-wrap break-words font-mono bg-black border-2 border-gray-800 p-3 leading-relaxed">
                                <span className="text-cyan-400 select-none">$ </span>
                                {r.output}
                              </pre>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="p-6 text-sm text-gray-500">// NO_VERIFICATION_CHECKS_RUN</p>
                )}
              </div>

              {/* verdict */}
              <div className="flex items-center justify-between gap-4 border-4 border-white bg-black p-5 shadow-[8px_8px_0px_0px_#fff]">
                <span className="text-sm font-bold text-gray-400 uppercase tracking-[0.2em]">FINAL_VERDICT</span>
                <span className={`inline-flex items-center gap-3 text-2xl px-5 py-1.5 font-black uppercase tracking-widest border-4 ${verdictClasses}`}>
                  <VerdictIcon className="w-6 h-6" />
                  {verdict}
                </span>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* ============ WARNINGS / ERRORS ============ */}
      {result.errors.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-10 border-4 border-red-500 bg-black p-6 shadow-[8px_8px_0px_0px_#ef4444] relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-red-500/5 pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-500" />
              <p className="text-sm font-black text-red-500 uppercase tracking-widest">SYSTEM_WARNINGS</p>
              <span className="ml-auto text-[10px] font-black px-2 py-0.5 bg-red-500 text-black">{result.errors.length}</span>
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