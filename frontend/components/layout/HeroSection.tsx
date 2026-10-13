"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useAnimationControls,
  useInView,
  type Variants,
} from "framer-motion";
import { ArrowRight, FileUp, Mic, X } from "lucide-react";

/* ------------------------------------------------------------------ */
/* Web Speech API typings                                              */
/* ------------------------------------------------------------------ */
interface SpeechRecognitionAlt { transcript: string }
interface SpeechRecognitionResultLike { isFinal: boolean; 0: SpeechRecognitionAlt }
interface SpeechRecognitionEventLike { results: ArrayLike<SpeechRecognitionResultLike> }
interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
}
type SRCtor = new () => SpeechRecognitionLike;

const getSR = (): SRCtor | null => {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SRCtor;
    webkitSpeechRecognition?: SRCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

const reducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ------------------------------------------------------------------ */
/* Content                                                             */
/* ------------------------------------------------------------------ */

/** One-click examples: real code prefilled into the editor. */
const EXAMPLES: { label: string; hint: string; code: string }[] = [
  {
    label: "Python",
    hint: "list bug",
    code: `def average(nums):
    total = 0
    for i in range(len(nums)):
        total += nums[i]
    return total / len(nums)

print(average([]))  # ZeroDivisionError`,
  },
  {
    label: "JavaScript",
    hint: "async bug",
    code: `async function loadUser(id) {
  const res = await fetch('/api/users/' + id);
  const data = res.json(); // <- missing await
  return data.name;
}`,
  },
  {
    label: "Go",
    hint: "data race",
    code: `package main

func main() {
    counter := 0
    for i := 0; i < 100; i++ {
        go func() { counter++ }()
    }
    // counter is racy — no synchronization
}`,
  },
];

/** Hints the empty editor cycles through (only while it is on screen and idle). */
const GHOST_SNIPPETS = [
  "// paste a buggy file — we'll find the root cause and fix it",
  "// try a Python list index error",
  "// try an unhandled JS promise rejection",
  "// try a Go data race in a goroutine",
];

const POINTS = ["Root cause", "Line diff", "Sandbox verified", "Structure map"];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
function detectLanguage(v: string): string {
  if (/^\s*(def |from \w+ import|import \w+$)/m.test(v)) return "Python";
  if (/\b(fn |let mut |impl )/.test(v)) return "Rust";
  if (/\bfunc |package main/.test(v)) return "Go";
  if (/\b(const |let |function |=>)/.test(v)) return "JavaScript";
  if (/#include|std::/.test(v)) return "C++";
  return "Auto-detect";
}

type Tab = "paste" | "file" | "github";

export interface Submission {
  source: Tab;
  code?: string;
  fileName?: string;
  githubUrl?: string;
  language: string;
}

const MAX_BYTES = 1_000_000;
const GH_RE =
  /^https:\/\/(github\.com\/[\w.-]+\/[\w.-]+\/blob\/[^/\s]+\/\S+|raw\.githubusercontent\.com\/[\w.-]+\/[\w.-]+\/[^/\s]+\/\S+)$/;
const EXT: Record<string, string> = {
  py: "Python", js: "JavaScript", jsx: "JavaScript", mjs: "JavaScript", ts: "TypeScript",
  tsx: "TypeScript", go: "Go", rs: "Rust", java: "Java", c: "C", h: "C", cpp: "C++",
  cc: "C++", cs: "C#", rb: "Ruby", php: "PHP", swift: "Swift", kt: "Kotlin",
};
const langFromName = (name: string): string =>
  EXT[(name.split(/[?#]/)[0].split(".").pop() ?? "").toLowerCase()] ?? "Auto-detect";

const HELP: Record<Tab, string> = {
  paste: "Paste code, or describe the bug out loud. Ctrl + Enter runs it.",
  file: "One source file, up to 1 MB. It is read in your browser.",
  github: "Link to a single file on GitHub. The rest of the repo is never read.",
};
const TABS: { id: Tab; label: string }[] = [
  { id: "paste", label: "Paste" },
  { id: "file", label: "File" },
  { id: "github", label: "GitHub link" },
];
const fmtSize = (n: number) => (n < 1024 ? `${n} B` : `${(n / 1024).toFixed(1)} KB`);

/* ------------------------------------------------------------------ */
/* Motion — everything below runs only when seen or when the user acts */
/* ------------------------------------------------------------------ */
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const stack: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.04 } },
};
const rise: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
};
const paneAnim = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: { duration: 0.16 },
};

/** Ghost-typing hint. Runs only while `active` (on screen, empty, unfocused). */
function useGhostTyping(active: boolean) {
  const [text, setText] = useState("");
  useEffect(() => {
    if (!active) { setText(""); return; }
    if (reducedMotion()) { setText(GHOST_SNIPPETS[0]); return; }
    let idx = 0;
    let charIdx = 0;
    let deleting = false;
    let timeoutId: number | undefined;
    const step = () => {
      const cur = GHOST_SNIPPETS[idx];
      if (!deleting) {
        charIdx++;
        setText(cur.slice(0, charIdx));
        if (charIdx >= cur.length) {
          deleting = true;
          timeoutId = window.setTimeout(step, 2200);
          return;
        }
        timeoutId = window.setTimeout(step, 36);
      } else {
        charIdx--;
        setText(cur.slice(0, charIdx));
        if (charIdx <= 0) {
          deleting = false;
          idx = (idx + 1) % GHOST_SNIPPETS.length;
          timeoutId = window.setTimeout(step, 400);
          return;
        }
        timeoutId = window.setTimeout(step, 14);
      }
    };
    timeoutId = window.setTimeout(step, 400);
    return () => { if (timeoutId) clearTimeout(timeoutId); };
  }, [active]);
  return text;
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */
export default function HeroSection({
  onSubmit,
  navigate,
}: {
  onSubmit?: (s: Submission) => void;
  navigate?: (path: string) => void;
  /** @deprecated No longer used. Kept so existing call sites still compile. */
  particles?: boolean;
}) {
  const router = useRouter();
  const goRef = useRef<HTMLButtonElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const baseRef = useRef("");
  const SR = useRef<SRCtor | null>(null);

  const [code, setCode] = useState("");
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<Tab>("paste");
  const [file, setFile] = useState<{ name: string; size: number } | null>(null);
  const [repoUrl, setRepoUrl] = useState("");
  const [error, setError] = useState("");
  const [drag, setDrag] = useState(false);
  const [supported, setSupported] = useState(true);
  const [focused, setFocused] = useState(false);

  const shake = useAnimationControls();
  const cardInView = useInView(cardRef, { amount: 0.4 });

  const ghostActive =
    tab === "paste" && !code && !focused && !recording && cardInView;
  const ghostText = useGhostTyping(ghostActive);

  useEffect(() => {
    SR.current = getSR();
    setSupported(!!SR.current);
    return () => recRef.current?.stop();
  }, []);

  const fail = (msg: string) => {
    setError(msg);
    if (!reducedMotion()) {
      void shake.start({
        x: [0, -8, 7, -5, 3, 0],
        transition: { duration: 0.36 },
      });
    }
  };

  const toggleMic = () => {
    if (recRef.current) {
      recRef.current.stop();
      return;
    }
    if (!SR.current) return;
    const rec = new SR.current();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    baseRef.current = code + (code && !/\s$/.test(code) ? " " : "");
    rec.onresult = (e) => {
      let fin = "", tmp = "";
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) fin += r[0].transcript;
        else tmp += r[0].transcript;
      }
      setCode(baseRef.current + fin + tmp);
    };
    const stop = () => {
      recRef.current = null;
      setRecording(false);
    };
    rec.onend = stop;
    rec.onerror = stop;
    rec.start();
    recRef.current = rec;
    setRecording(true);
    areaRef.current?.focus();
  };

  const loadFile = (f: File | undefined) => {
    if (!f) return;
    if (f.size > MAX_BYTES) {
      fail("That file is over 1 MB. Choose a single source file.");
      return;
    }
    f.text()
      .then((t) => {
        if (t.includes("\u0000")) {
          fail("That looks like a binary file. Choose a source file.");
          return;
        }
        setCode(t);
        setFile({ name: f.name, size: f.size });
        setError("");
      })
      .catch(() => fail("Could not read that file. Try another one."));
  };

  const switchTab = (t: Tab) => {
    if (t !== "paste") recRef.current?.stop();
    setTab(t);
    setError("");
  };

  const useExample = (ex: (typeof EXAMPLES)[number]) => {
    setTab("paste");
    setCode(ex.code);
    setFile(null);
    setError("");
    requestAnimationFrame(() => areaRef.current?.focus());
  };

  const language =
    tab === "github"
      ? repoUrl ? langFromName(repoUrl) : "Auto-detect"
      : file ? langFromName(file.name) : detectLanguage(code);

  const hasInput = tab === "github" ? !!repoUrl.trim() : !!code.trim();
  const lines = code ? code.split("\n").length : 0;
  const tall = tab === "paste" && (focused || !!code);

  const submit = () => {
    setError("");
    let s: Submission;
    if (tab === "github") {
      const url = repoUrl.trim();
      if (!GH_RE.test(url)) {
        fail("Paste a link to one file, like https://github.com/owner/repo/blob/main/src/app.py");
        return;
      }
      s = { source: "github", githubUrl: url, fileName: url.split("/").pop(), language };
    } else {
      if (!code.trim()) {
        if (tab === "file") fail("Choose a file first.");
        else {
          fail("Paste some code or dictate the bug first.");
          areaRef.current?.focus();
        }
        return;
      }
      s = { source: tab, code, fileName: file?.name, language };
    }
    setBusy(true);

    onSubmit?.(s);
    try {
      sessionStorage.setItem("testpilot:submission", JSON.stringify(s));
    } catch {
      /* storage unavailable */
    }
    const path = s.githubUrl
      ? `/fix?src=github&url=${encodeURIComponent(s.githubUrl)}`
      : "/fix";
    (navigate ?? router.push)(path);
    window.setTimeout(() => setBusy(false), 1600);
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="hs-root">
        <style>{CSS}</style>

        <motion.section
          className="hs-hero"
          variants={stack}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
        >
          <motion.div className="hs-badge" variants={rise}>
            <span className="hs-dot" />
            One file. One fix. Verified.
          </motion.div>

          <motion.h1 className="hs-h1" variants={rise}>
            <span>Debug any file.</span>
            <span className="hs-h1-soft">Verify the fix.</span>
          </motion.h1>

          <motion.p className="hs-sub" variants={rise}>
            Paste one buggy file. Get the root cause, a corrected version, a visual diff, and proof it
            runs — <b>in about 15 seconds</b> after the render wakeup.
          </motion.p>

          <motion.div className="hs-card-wrap" variants={rise}>
            <motion.div animate={shake}>
              <div className="hs-card" ref={cardRef}>
                <div className="hs-top">
                  <div className="hs-meta">
                    <span className="hs-lang">{language}</span>
                    {tab !== "github" && code && (
                      <span className="hs-stat">{lines} ln · {code.length} ch</span>
                    )}
                  </div>
                  <div className="hs-tabs" role="tablist" aria-label="Input method">
                    {TABS.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        role="tab"
                        aria-selected={tab === t.id}
                        className={`hs-tab${tab === t.id ? " on" : ""}`}
                        onClick={() => switchTab(t.id)}
                      >
                        {tab === t.id && (
                          <motion.span
                            layoutId="hs-thumb"
                            className="hs-thumb"
                            transition={{ type: "spring", stiffness: 500, damping: 36 }}
                          />
                        )}
                        <span className="hs-tab-label">{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className={`hs-pane${tall ? " tall" : ""}`} role="tabpanel">
                  <AnimatePresence mode="wait" initial={false}>
                    {tab === "paste" && (
                      <motion.div key="paste" className="hs-pane-in hs-rel" {...paneAnim}>
                        <textarea
                          ref={areaRef}
                          value={code}
                          onChange={(e) => {
                            setCode(e.target.value);
                            setFile(null);
                          }}
                          onFocus={() => setFocused(true)}
                          onBlur={() => setFocused(false)}
                          onKeyDown={(e) => {
                            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                              e.preventDefault();
                              submit();
                            }
                          }}
                          spellCheck={false}
                          aria-label="Source code"
                          placeholder=""
                        />
                        {ghostActive && (
                          <div className="hs-ghost" aria-hidden>
                            {ghostText}
                            <span className="hs-caret" />
                          </div>
                        )}
                      </motion.div>
                    )}

                    {tab === "file" && (
                      <motion.div key="file" className="hs-pane-in" {...paneAnim}>
                        <motion.div
                          className={`hs-drop${drag ? " over" : ""}`}
                          animate={{ scale: drag ? 1.01 : 1 }}
                          transition={{ type: "spring", stiffness: 400, damping: 30 }}
                          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                          onDragLeave={() => setDrag(false)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setDrag(false);
                            loadFile(e.dataTransfer.files[0]);
                          }}
                        >
                          <input
                            ref={fileRef}
                            type="file"
                            hidden
                            onChange={(e) => {
                              loadFile(e.target.files?.[0]);
                              e.target.value = "";
                            }}
                          />
                          {file ? (
                            <div className="hs-file">
                              <strong>{file.name}</strong>
                              <span>{fmtSize(file.size)}</span>
                              <button
                                type="button"
                                className="hs-link"
                                aria-label="Remove file"
                                onClick={() => { setFile(null); setCode(""); }}
                              >
                                <X size={14} /> Remove
                              </button>
                            </div>
                          ) : (
                            <>
                              <FileUp size={20} aria-hidden />
                              <p>{drag ? "Drop to load" : "Drop a source file here"}</p>
                              <button
                                type="button"
                                className="hs-pick"
                                onClick={() => fileRef.current?.click()}
                              >
                                Choose file
                              </button>
                            </>
                          )}
                        </motion.div>
                      </motion.div>
                    )}

                    {tab === "github" && (
                      <motion.div key="github" className="hs-pane-in hs-gh" {...paneAnim}>
                        <label htmlFor="hs-repo" className="hs-lbl">GitHub file link</label>
                        <input
                          id="hs-repo"
                          className="hs-url"
                          type="url"
                          value={repoUrl}
                          onChange={(e) => setRepoUrl(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && submit()}
                          spellCheck={false}
                          placeholder="https://github.com/owner/repo/blob/main/src/app.py"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <AnimatePresence initial={false}>
                  {error && (
                    <motion.p
                      key="err"
                      className="hs-err"
                      role="alert"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>

                <div className="hs-row">
                  <span className={`hs-help${recording ? " live" : ""}`}>
                    {recording ? "Listening… describe the bug." : HELP[tab]}
                  </span>
                  <div className="hs-actions">
                    {tab === "paste" && (
                      <button
                        type="button"
                        className={`hs-mic${recording ? " rec" : ""}`}
                        onClick={toggleMic}
                        disabled={!supported}
                        aria-pressed={recording}
                        aria-label={recording ? "Stop dictation" : "Dictate by voice"}
                        title={supported ? undefined : "Voice input is not supported in this browser"}
                      >
                        {recording && (
                          <motion.span
                            className="hs-ring"
                            initial={{ scale: 1, opacity: 0.5 }}
                            animate={{ scale: 1.6, opacity: 0 }}
                            transition={{ duration: 1.3, repeat: Infinity, ease: "easeOut" }}
                          />
                        )}
                        <Mic size={18} />
                      </button>
                    )}
                    <motion.button
                      ref={goRef}
                      type="button"
                      className={`hs-go${hasInput ? " ready" : ""}`}
                      onClick={submit}
                    >
                      {busy && (
                        <motion.i
                          className="hs-fill"
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: 1 }}
                          transition={{ duration: 1.6, ease: "linear" }}
                        />
                      )}
                      <span className="hs-go-in">
                        {busy ? (
                          <>
                            <span className="hs-spin" aria-hidden />
                            Analyzing…
                          </>
                        ) : (
                          <>
                            Debug my file
                            <ArrowRight className="hs-arrow" size={16} aria-hidden />
                          </>
                        )}
                      </span>
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>

          <motion.div className="hs-examples" variants={rise} aria-label="Try a sample bug">
            <span className="hs-examples-lbl">Try a sample</span>
            {EXAMPLES.map((ex) => (
              <button
                key={ex.label}
                type="button"
                className="hs-ex"
                onClick={() => useExample(ex)}
                title={`Load a sample ${ex.label} bug`}
              >
                {ex.label} <span>{ex.hint}</span>
              </button>
            ))}
          </motion.div>

          <motion.ul className="hs-points" variants={rise}>
            {POINTS.map((p) => (
              <li key={p}>
                <span className="hs-dot" />
                {p}
              </li>
            ))}
          </motion.ul>
        </motion.section>
      </div>
    </MotionConfig>
  );
}

/* ------------------------------------------------------------------ */
/* Styles — tidy neo-brutalist: one border scale, one shadow scale      */
/* ------------------------------------------------------------------ */
const CSS = `
.hs-root{
  --hs-ink:var(--foreground);
  --hs-surface:color-mix(in srgb, var(--background) 94%, transparent);
  --hs-wash:color-mix(in srgb, var(--foreground) 7%, transparent);
  --hs-text-2:color-mix(in srgb, var(--foreground) 72%, var(--background));
  --hs-halo:0 0 18px var(--background),0 0 38px var(--background);
  --hs-ease:cubic-bezier(.22,1,.36,1);
  position:relative;color:var(--foreground);background:transparent;box-sizing:border-box;
  font-family:var(--font-geist),var(--font-inter),system-ui,sans-serif;
  display:flex;justify-content:center;
  padding:clamp(20px,4vh,44px) 22px clamp(40px,6vh,68px);
}
.hs-root *,.hs-root *::before,.hs-root *::after{box-sizing:border-box}

.hs-hero{width:100%;max-width:780px;display:flex;flex-direction:column;align-items:center;text-align:center}

/* ---- badge ---- */
.hs-badge{
  display:inline-flex;align-items:center;gap:8px;padding:6px 14px;border-radius:999px;
  font-size:12.5px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;
  border:2px solid var(--hs-ink);background:var(--hs-surface);
  box-shadow:3px 3px 0 0 var(--hs-ink);
}
.hs-dot{width:7px;height:7px;border-radius:50%;background:var(--brand);border:1.5px solid var(--hs-ink);flex:none}

/* ---- headline ---- */
.hs-h1{
  margin:clamp(16px,2.4vh,24px) 0 0;
  font-family:var(--font-heading),system-ui,sans-serif;font-weight:900;
  font-size:clamp(32px,min(6.4vw,6.4vh),60px);line-height:1.02;letter-spacing:-.04em;text-transform:uppercase;
  text-shadow:var(--hs-halo);
}
.hs-h1 span{display:block}
.hs-h1-soft{color:var(--hs-text-2)}

.hs-sub{
  margin:clamp(12px,1.8vh,18px) auto 0;max-width:560px;
  font-size:clamp(14px,min(1.9vw,1.9vh),16px);line-height:1.55;font-weight:500;
  color:color-mix(in srgb, var(--foreground) 84%, var(--background));
  text-shadow:var(--hs-halo);
}
.hs-sub b{color:var(--brand);font-weight:800}

/* ---- input card ---- */
.hs-card-wrap{width:100%;margin-top:clamp(20px,3.2vh,30px)}
.hs-card{
  text-align:left;padding:14px 18px 16px;border-radius:20px;
  border:3px solid var(--hs-ink);background:var(--hs-surface);
  backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);
  box-shadow:6px 6px 0 0 var(--hs-ink);
  transition:box-shadow .15s,translate .15s;
}
.hs-card:focus-within{box-shadow:6px 6px 0 0 var(--brand)}

.hs-top{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px}
.hs-meta{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.hs-lang{
  display:inline-flex;align-items:center;font:700 11.5px var(--font-mono),ui-monospace,monospace;
  padding:4px 10px;border-radius:8px;border:2px solid var(--hs-ink);
  background:var(--brand);color:#000;box-shadow:2px 2px 0 0 var(--hs-ink);
}
.hs-stat{font:600 12px var(--font-mono),ui-monospace,monospace;color:var(--hs-text-2)}

/* ---- tabs ---- */
.hs-tabs{
  display:flex;gap:2px;padding:3px;border-radius:12px;
  border:2px solid var(--hs-ink);background:var(--hs-surface);box-shadow:3px 3px 0 0 var(--hs-ink);
}
.hs-tab{
  position:relative;padding:6px 14px;border:0;border-radius:8px;background:none;
  color:var(--hs-text-2);font-size:12.5px;font-weight:800;letter-spacing:.03em;text-transform:uppercase;
  font-family:inherit;cursor:pointer;transition:color .15s;
}
.hs-tab:hover{color:var(--foreground)}
.hs-tab.on{color:#000}
.hs-tab-label{position:relative;z-index:1}
.hs-thumb{position:absolute;inset:0;border-radius:8px;background:var(--brand);border:2px solid var(--hs-ink)}

/* ---- pane ---- */
.hs-pane{display:flex;min-height:clamp(96px,13vh,128px);margin:14px 0 10px;transition:min-height .3s var(--hs-ease)}
.hs-pane.tall{min-height:clamp(170px,24vh,230px)}
.hs-pane-in{flex:1;min-width:0;min-height:0;display:flex;flex-direction:column}
.hs-rel{position:relative}
.hs-pane textarea{
  flex:1;min-height:0;width:100%;padding:0;resize:none;border:0;outline:0;background:transparent;
  color:var(--foreground);caret-color:var(--brand);
  font:13.5px/1.65 var(--font-mono),ui-monospace,monospace;position:relative;z-index:1;
}
.hs-ghost{
  position:absolute;inset:0;pointer-events:none;z-index:0;overflow:hidden;white-space:pre-wrap;
  color:var(--hs-text-2);font:13.5px/1.65 var(--font-mono),ui-monospace,monospace;
}
.hs-caret{display:inline-block;width:7px;height:1em;vertical-align:-2px;margin-left:2px;background:var(--brand);animation:hs-blink 1.05s steps(2,end) infinite}
@keyframes hs-blink{50%{opacity:0}}

.hs-drop{
  flex:1;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:10px 14px;padding:14px;
  border:2px dashed var(--hs-ink);border-radius:14px;color:var(--hs-text-2);font-size:14px;font-weight:600;
  transition:background .15s,box-shadow .15s,color .15s;
}
.hs-drop p{margin:0}
.hs-drop.over{border-style:solid;background:color-mix(in srgb, var(--brand) 22%, transparent);color:var(--foreground);box-shadow:4px 4px 0 0 var(--hs-ink)}
.hs-file{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:12px;color:var(--hs-text-2)}
.hs-file strong{color:var(--foreground);font:700 14px var(--font-mono),monospace;word-break:break-all}
.hs-link{display:inline-flex;align-items:center;gap:3px;background:none;border:0;padding:0;color:var(--brand);font-size:12.5px;font-weight:800;text-transform:uppercase;font-family:inherit;cursor:pointer;text-decoration:underline}

.hs-gh{justify-content:center;gap:8px}
.hs-lbl{font-size:12px;font-weight:700;color:var(--hs-text-2)}
.hs-url{
  width:100%;height:46px;padding:0 16px;border-radius:12px;border:2px solid var(--hs-ink);
  background:var(--hs-surface);color:var(--foreground);font:13.5px var(--font-mono),monospace;outline:0;
  box-shadow:3px 3px 0 0 var(--hs-ink);transition:box-shadow .15s,translate .15s;
}
.hs-url:focus{box-shadow:5px 5px 0 0 var(--brand);translate:-1px -1px}
.hs-url::placeholder{color:var(--hs-text-2)}
.hs-err{margin:0 0 10px;overflow:hidden;font-size:13px;font-weight:700;color:var(--destructive)}

/* ---- action row ---- */
.hs-row{display:flex;align-items:center;justify-content:space-between;gap:14px}
.hs-help{font-size:12.5px;font-weight:500;color:var(--hs-text-2)}
.hs-help.live{color:var(--brand);font-weight:700}
.hs-actions{display:flex;align-items:center;gap:10px;flex:none}

/* shared button behavior: lift on hover, press into the shadow on click */
.hs-pick,.hs-ex,.hs-mic,.hs-go{
  border:2px solid var(--hs-ink);box-shadow:3px 3px 0 0 var(--hs-ink);cursor:pointer;font-family:inherit;
  transition:translate .1s,box-shadow .1s,background .15s,color .15s;
}
.hs-pick:hover,.hs-ex:hover,.hs-mic:hover,.hs-go:hover{translate:-1px -1px;box-shadow:4px 4px 0 0 var(--hs-ink)}
.hs-pick:active,.hs-ex:active,.hs-mic:active,.hs-go:active{translate:3px 3px;box-shadow:0 0 0 0 var(--hs-ink)}

.hs-pick{
  height:36px;padding:0 16px;border-radius:10px;background:var(--hs-surface);color:var(--foreground);
  font-size:12.5px;font-weight:800;letter-spacing:.03em;text-transform:uppercase;
}
.hs-pick:hover{background:var(--brand);color:#000}

.hs-mic{
  position:relative;width:44px;height:44px;display:grid;place-items:center;border-radius:12px;
  background:var(--hs-surface);color:var(--foreground);
}
.hs-mic:hover{background:var(--brand);color:#000}
.hs-mic.rec{background:var(--brand);color:#000}
.hs-mic:disabled{opacity:.4;cursor:not-allowed;box-shadow:3px 3px 0 0 var(--hs-ink);translate:0 0}
.hs-ring{position:absolute;inset:-2px;border-radius:12px;border:3px solid var(--brand);pointer-events:none}

.hs-go{
  position:relative;overflow:hidden;height:46px;padding:0 24px;border-width:3px;border-radius:12px;
  background:var(--brand);color:#000;font-size:14px;font-weight:900;letter-spacing:.04em;text-transform:uppercase;
  box-shadow:4px 4px 0 0 var(--hs-ink);
}
.hs-go:hover{translate:-2px -2px;box-shadow:6px 6px 0 0 var(--hs-ink)}
.hs-go:active{translate:4px 4px;box-shadow:0 0 0 0 var(--hs-ink)}
.hs-go-in{position:relative;z-index:1;display:inline-flex;align-items:center;gap:8px}
.hs-arrow{transition:transform .2s var(--hs-ease)}
.hs-go:hover .hs-arrow{transform:translateX(3px)}
.hs-fill{position:absolute;inset:0;z-index:0;display:block;background:rgba(0,0,0,.18);transform-origin:left}
.hs-spin{width:13px;height:13px;border-radius:50%;border:2px solid rgba(0,0,0,.25);border-top-color:#000;animation:hs-rot .7s linear infinite}
@keyframes hs-rot{to{transform:rotate(360deg)}}

/* ---- samples + points ---- */
.hs-examples{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:12px;margin-top:clamp(22px,3.2vh,30px)}
.hs-examples-lbl{font-size:13px;font-weight:600;color:var(--hs-text-2);text-shadow:var(--hs-halo)}
.hs-ex{
  display:inline-flex;align-items:center;gap:6px;padding:6px 13px;border-radius:999px;
  background:var(--hs-surface);color:var(--foreground);
  font-size:12px;font-weight:800;letter-spacing:.03em;text-transform:uppercase;
  box-shadow:2px 2px 0 0 var(--hs-ink);
}
.hs-ex span{font-weight:500;letter-spacing:0;text-transform:none;color:var(--hs-text-2)}
.hs-ex:hover{background:var(--brand);color:#000;box-shadow:3px 3px 0 0 var(--hs-ink)}
.hs-ex:hover span{color:#000}
.hs-ex:active{box-shadow:0 0 0 0 var(--hs-ink)}

.hs-points{
  display:flex;flex-wrap:wrap;justify-content:center;gap:10px 28px;margin:clamp(22px,3.4vh,32px) 0 0;padding:0;list-style:none;
}
.hs-points li{
  display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:700;
  color:var(--hs-text-2);text-shadow:var(--hs-halo);
}

.hs-root :is(.hs-tab,.hs-pick,.hs-link,.hs-mic,.hs-go,.hs-ex):focus-visible{outline:3px solid var(--brand);outline-offset:3px}

@media (max-width:600px){
  .hs-root{padding:20px 14px 44px}
  .hs-card{padding:12px 14px 14px}
  .hs-row{flex-direction:column;align-items:stretch}
  .hs-actions{justify-content:flex-end}
  .hs-top{justify-content:flex-start}
  .hs-pane{min-height:132px}
  .hs-examples-lbl{width:100%}
}
@media (max-height:660px){.hs-sub{display:none}}
@media (prefers-reduced-motion:reduce){
  .hs-caret,.hs-spin{animation:none}
  .hs-pane,.hs-card,.hs-arrow,.hs-pick,.hs-ex,.hs-mic,.hs-go,.hs-url{transition:none}
}
`;