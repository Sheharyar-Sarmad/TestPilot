// frontend/app/fix/fix-client.tsx
"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, DragEvent, ChangeEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import {
  ArrowRight,
  FileCode2,
  Loader2,
  ClipboardType,
  Upload,
  ChevronDown,
  AlertCircle,
  Target,
  FlaskConical,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { GitHubIcon } from "@/components/icons/GithubIcon";
import { api, ApiError } from "@/lib/api";

const Monaco = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="h-[450px] flex items-center justify-center text-sm font-mono text-cyan-400 bg-black">
      <Loader2 className="w-6 h-6 animate-spin mr-3" />
      LOADING_EDITOR...
    </div>
  ),
});

// FIXED: Added "file" to the union type to match the logic below
type InputMode = "paste" | "upload" | "github";

interface HeroSubmission {
  source: "paste" | "upload" | "github" | "file";
  code?: string;
  fileName?: string;
  githubUrl?: string;
  language: string;
}

const LANG_MAP: Record<string, string> = {
  py: "python", js: "javascript", ts: "typescript", jsx: "javascript",
  tsx: "typescript", java: "java", go: "go", rs: "rust", rb: "ruby",
  cpp: "cpp", c: "c", cs: "csharp", php: "php",
};

function detectLanguage(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return LANG_MAP[ext] ?? "plaintext";
}

export function FixClient() {
  const router = useRouter();
  const search = useSearchParams();
  const { resolvedTheme } = useTheme();

  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<InputMode>("paste");
  const [code, setCode] = useState("");
  const [filename, setFilename] = useState("submitted.py");
  const [githubUrl, setGithubUrl] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [expectedBehavior, setExpectedBehavior] = useState("");
  const [testCode, setTestCode] = useState("");
  const [contextOpen, setContextOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const autoSubmitted = useRef(false);

  useEffect(() => setMounted(true), []);

  // ---------------------------------------------------- existing process_id redirect
  useEffect(() => {
    const existingId = search.get("process_id");
    if (existingId) {
      router.replace(`/fix/${existingId}`);
    }
  }, [search, router]);

  // ---------------------------------------------------- read hero handoff
  useEffect(() => {
    if (autoSubmitted.current) return;

    const src = search.get("src");
    const url = search.get("url");
    if (src === "github" && url) {
      setMode("github");
      setGithubUrl(url);
      return;
    }

    let submission: HeroSubmission | null = null;
    try {
      const raw = sessionStorage.getItem("testpilot:submission");
      if (raw) submission = JSON.parse(raw) as HeroSubmission;
    } catch { /* ignore */ }

    if (!submission) return;

    try { sessionStorage.removeItem("testpilot:submission"); } catch { /* ignore */ }

    if (submission.source === "github" && submission.githubUrl) {
      setMode("github");
      setGithubUrl(submission.githubUrl);
      return;
    }

    if (submission.code) {
      const nextMode: InputMode = submission.source === "file" ? "upload" : "paste";
      setMode(nextMode);
      setCode(submission.code);
      if (submission.fileName) setFilename(submission.fileName);
    }
  }, [search]);

  // ---------------------------------------------------- auto-submit GitHub
  useEffect(() => {
    if (autoSubmitted.current) return;
    if (mode !== "github") return;
    if (!githubUrl.trim()) return;

    autoSubmitted.current = true;
    void submitNow({ github_url: githubUrl.trim() });
  }, [mode, githubUrl]);

  const canSubmit =
    mode === "github" ? githubUrl.trim().length > 0 : code.trim().length > 0;

  const submitNow = async (payload: Record<string, unknown>) => {
    setSubmitting(true);
    setError(null);
    try {
      const { process_id } = await api.createProcess(payload);
      router.replace(`/fix/${process_id}`);
    } catch (err) {
      setSubmitting(false);
      if (err instanceof ApiError) {
        setError(
          err.status === 429
            ? "Rate limit reached. Please wait a moment before trying again."
            : err.message
        );
      } else {
        setError("Something went wrong. Please try again.");
      }
    }
  };

  const handleManualSubmit = () => {
    const payload =
      mode === "github"
        ? { github_url: githubUrl.trim() }
        : {
            source_code: code,
            filename,
            error_message: errorMessage || undefined,
            expected_behavior: expectedBehavior || undefined,
            test_code: testCode || undefined,
          };
    void submitNow(payload);
  };

  const handleFile = async (file: File) => {
    if (file.size > 1_048_576) {
      alert("File exceeds 1 MB limit.");
      return;
    }
    const text = await file.text();
    setCode(text);
    setFilename(file.name);
  };

  // FIXED: Typed events correctly
  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  };

  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
  };

  const language = detectLanguage(filename);
  const contextFilled = [errorMessage, expectedBehavior, testCode].filter(Boolean).length;

  if (submitting && mode === "github") {
    return (
      <div className="max-w-xl mx-auto px-6 py-32 text-center font-mono">
        <Loader2 className="w-12 h-12 animate-spin mx-auto mb-6 text-cyan-400" />
        <h1 className="text-xl font-bold text-white uppercase tracking-widest mb-2">FETCHING_FILE...</h1>
        <p className="text-sm text-gray-400">Downloading from GitHub and starting analysis.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-12 font-mono">
      <div className="mb-10 border-b-4 border-white pb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-400 text-black text-xs font-bold uppercase tracking-widest mb-4">
          <FileCode2 className="w-3 h-3" />
          SINGLE_FILE_REPAIR
        </div>
        <h1 className="text-4xl font-black text-white uppercase tracking-tighter mb-2">
          FIX_YOUR_CODE
        </h1>
        <p className="text-sm text-gray-400">
          Paste, upload, or link a single source file. Add context if you have it.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
        {/* Left column */}
        <div className="space-y-6">
          
          {/* Mode Selector - Brutalist Tabs */}
          <div className="inline-flex items-center gap-2 p-1 border-4 border-white bg-black shadow-[6px_6px_0px_0px_#fff]">
            {([
              { value: "paste",  label: "PASTE",       icon: ClipboardType },
              { value: "upload", label: "UPLOAD",      icon: Upload },
              { value: "github", label: "GITHUB_LINK", icon: GitHubIcon },
            ] as const).map(({ value, label, icon: Icon }) => {
              const active = mode === value;
              return (
                <button
                  key={value}
                  onClick={() => setMode(value)}
                  className={`inline-flex items-center gap-2 h-10 px-4 text-xs font-bold uppercase tracking-widest transition-all ${
                    active
                      ? "bg-cyan-400 text-black"
                      : "text-gray-400 hover:text-white hover:bg-gray-900"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              );
            })}
          </div>

          {mode === "github" ? (
            <div className="border-4 border-white bg-black p-6 shadow-[8px_8px_0px_0px_#22d3ee]">
              <label className="text-sm font-bold text-cyan-400 uppercase tracking-wider mb-3 block">
                &gt; PUBLIC_GITHUB_FILE_URL
              </label>
              <input
                type="url"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                placeholder="https://github.com/user/repo/blob/main/file.py"
                className="w-full h-12 px-4 bg-black border-4 border-white text-white focus:border-cyan-400 outline-none text-sm font-mono transition-colors"
              />
              <p className="text-xs text-gray-500 mt-3">
                Only public files from github.com are accepted.
              </p>
            </div>
          ) : (
            <div
              onDrop={onDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border-4 border-white bg-black shadow-[8px_8px_0px_0px_#22d3ee] overflow-hidden"
            >
              <div className="flex items-center justify-between gap-4 px-4 py-3 border-b-4 border-white bg-gray-900">
                <div className="flex items-center gap-3 min-w-0">
                  <FileCode2 className="w-4 h-4 text-cyan-400 shrink-0" />
                  <input
                    value={filename}
                    onChange={(e) => setFilename(e.target.value)}
                    spellCheck={false}
                    className="bg-transparent outline-none text-sm font-bold text-white truncate min-w-0 max-w-[200px]"
                  />
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-cyan-400 text-black">
                    {language}
                  </span>
                </div>
                <label className="cursor-pointer inline-flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-white transition-colors px-2">
                  <Upload className="w-4 h-4" />
                  UPLOAD
                  <input
                    type="file"
                    onChange={onPick}
                    className="hidden"
                    accept=".py,.js,.ts,.tsx,.jsx,.java,.go,.rs,.rb,.cpp,.c,.cs,.php,.txt,.md"
                  />
                </label>
              </div>
              <div className="h-[450px]">
                {mounted && (
                  <Monaco
                    height="100%"
                    language={language}
                    theme={resolvedTheme === "dark" ? "vs-dark" : "light"}
                    value={code}
                    onChange={(v) => setCode(v ?? "")}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 13,
                      fontFamily: "var(--font-jetbrains-mono), ui-monospace, monospace",
                      lineNumbers: "on",
                      scrollBeyondLastLine: false,
                      padding: { top: 16, bottom: 16 },
                      renderLineHighlight: "line",
                      smoothScrolling: true,
                      tabSize: 4,
                      wordWrap: "on",
                      automaticLayout: true,
                      scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
                    }}
                  />
                )}
              </div>
            </div>
          )}

          {/* Context Accordion */}
          <div className="border-4 border-white bg-black shadow-[8px_8px_0px_0px_#fff]">
            <button
              type="button"
              onClick={() => setContextOpen((v) => !v)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-900 transition-colors"
            >
              <div className="flex items-center gap-4">
                <span className="text-sm font-bold text-white uppercase tracking-wider">OPTIONAL_CONTEXT</span>
                {contextFilled > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-cyan-400 text-black">
                    {contextFilled}_ADDED
                  </span>
                )}
              </div>
              <ChevronDown
                className={`w-5 h-5 text-cyan-400 transition-transform duration-200 ${
                  contextOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            <AnimatePresence>
              {contextOpen && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-t-4 border-white"
                >
                  <div className="p-5 space-y-5 bg-gray-900/50">
                    <div>
                      <label className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2">
                        <AlertCircle className="w-4 h-4" /> ERROR_MESSAGE
                      </label>
                      <textarea rows={3} value={errorMessage}
                        onChange={(e) => setErrorMessage(e.target.value)}
                        spellCheck={false}
                        placeholder="Paste the exact error you're seeing…"
                        className="w-full px-4 py-3 bg-black border-4 border-white text-white focus:border-cyan-400 outline-none text-sm resize-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2">
                        <Target className="w-4 h-4" /> EXPECTED_BEHAVIOR
                      </label>
                      <textarea rows={2} value={expectedBehavior}
                        onChange={(e) => setExpectedBehavior(e.target.value)}
                        spellCheck={false}
                        placeholder="What should the code do instead?"
                        className="w-full px-4 py-3 bg-black border-4 border-white text-white focus:border-cyan-400 outline-none text-sm resize-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2">
                        <FlaskConical className="w-4 h-4" /> TEST_CASES
                      </label>
                      <textarea rows={5} value={testCode}
                        onChange={(e) => setTestCode(e.target.value)}
                        spellCheck={false}
                        placeholder="Paste tests to verify the fix in the sandbox…"
                        className="w-full px-4 py-3 bg-black border-4 border-white text-white focus:border-cyan-400 outline-none text-xs resize-none font-mono"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right column */}
        <div className="lg:sticky lg:top-28 self-start">
          <div className="border-4 border-white bg-black p-6 shadow-[12px_12px_0px_0px_#a855f7]">
            <h3 className="font-bold text-white uppercase tracking-widest mb-6 border-b-2 border-gray-700 pb-2 text-sm">
              &gt; READY_TO_ANALYZE
            </h3>
            <div className="space-y-3 text-xs font-mono mb-8">
              <div className="flex justify-between border-b border-gray-800 pb-1">
                <span className="text-gray-500">MODE</span>
                <span className="text-cyan-400 font-bold">{mode}</span>
              </div>
              <div className="flex justify-between border-b border-gray-800 pb-1">
                <span className="text-gray-500">FILE</span>
                <span className="text-white font-bold truncate max-w-[140px]">
                  {mode === "github" ? "FROM_URL" : filename}
                </span>
              </div>
              <div className="flex justify-between border-b border-gray-800 pb-1">
                <span className="text-gray-500">SIZE</span>
                <span className="text-white font-bold">{code.length.toLocaleString()} CHARS</span>
              </div>
            </div>

            {error && (
              <div className="bg-red-950/50 border-4 border-red-500 text-red-400 text-xs p-4 mb-6 font-bold">
                &gt; ERROR: {error}
              </div>
            )}

            <button
              onClick={handleManualSubmit}
              disabled={!canSubmit || submitting}
              className="group w-full h-14 flex items-center justify-center gap-3 bg-cyan-400 text-black font-black text-sm uppercase tracking-widest border-4 border-black shadow-[6px_6px_0px_0px_#fff] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_0px_#fff] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> SUBMITTING...</>
              ) : (
                <>ANALYZE <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>
              )}
            </button>
            <p className="text-[10px] text-gray-500 mt-4 text-center uppercase tracking-wider">
              Jobs expire in 1 hour. No accounts, no storage.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}