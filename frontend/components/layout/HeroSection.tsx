"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { gsap } from "gsap";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { FileUp, Mic, X } from "lucide-react";

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

const useIso = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/* ------------------------------------------------------------------ */
/* Optional particle layer (transparent canvas, uses --brand)          */
/* ------------------------------------------------------------------ */
function Particles() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0, h = 0, raf = 0;
    const size = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    size();
    window.addEventListener("resize", size);
    const pts = Array.from({ length: 70 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.6 + 0.6,
    }));
    const draw = () => {
      const c = getComputedStyle(canvas).getPropertyValue("--brand").trim() || "#22d3ee";
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = c;
      ctx.strokeStyle = c;
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        if (!reduce) {
          p.x += p.vx; p.y += p.vy;
          if (p.x < 0 || p.x > w) p.vx *= -1;
          if (p.y < 0 || p.y > h) p.vy *= -1;
        }
        ctx.globalAlpha = 0.55;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        for (let j = i + 1; j < pts.length; j++) {
          const q = pts[j];
          const d = Math.hypot(p.x - q.x, p.y - q.y);
          if (d < 120) {
            ctx.globalAlpha = 0.12 * (1 - d / 120);
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
          }
        }
      }
      if (!reduce) raf = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", size);
    };
  }, []);

  return <canvas ref={ref} className="tp-bg" aria-hidden="true" />;
}

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

const CHIPS = ["Root cause", "Line diff", "Sandbox verified", "Structure map"];

type Tab = "paste" | "file" | "github";

/** What /fix receives (also stored in sessionStorage["testpilot:submission"]). */
export interface Submission {
  source: Tab;
  code?: string;
  fileName?: string;
  githubUrl?: string;
  language: string;
}

const MAX_BYTES = 1_000_000;
// One file only: github.com/<owner>/<repo>/blob/<ref>/<path> or raw.githubusercontent.com/...
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
  paste: "Paste code, or describe the bug out loud.",
  file: "One source file, up to 1 MB. It is read in your browser.",
  github: "Link to a single file on GitHub. The rest of the repo is never read.",
};
const TABS: { id: Tab; label: string }[] = [
  { id: "paste", label: "Paste" },
  { id: "file", label: "File" },
  { id: "github", label: "GitHub link" },
];
const fmtSize = (n: number) => (n < 1024 ? `${n} B` : `${(n / 1024).toFixed(1)} KB`);

const paneAnim = {
  initial: { opacity: 0, y: 6, filter: "blur(4px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -6, filter: "blur(4px)" },
  transition: { duration: 0.18 },
};

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */
export default function HeroSection({
  onSubmit,
  navigate,
  particles = false,
}: {
  /** Called with the submission just before navigating to /fix. */
  onSubmit?: (s: Submission) => void;
  /** Override navigation. Defaults to Next's router.push. */
  navigate?: (path: string) => void;
  /** Draw a transparent particle layer behind the hero (off by default). */
  particles?: boolean;
}) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const [code, setCode] = useState("");
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<Tab>("paste");
  const [file, setFile] = useState<{ name: string; size: number } | null>(null);
  const [repoUrl, setRepoUrl] = useState("");
  const [error, setError] = useState("");
  const [drag, setDrag] = useState(false);
  const [supported, setSupported] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const baseRef = useRef("");
  const SR = useRef<SRCtor | null>(null);

  /* ---- GSAP: one orchestrated entrance + pointer-following sheen ---- */
  useIso(() => {
    const root = rootRef.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      root.classList.add("tp-ready");
      return;
    }
    const hero = root.querySelector<HTMLElement>(".tp-hero");
    if (!hero) return;

    const ctx = gsap.context(() => {
      gsap.set(hero, { "--mx": "50%", "--my": "0%" });

      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.fromTo(hero, { opacity: 0, y: 28, scale: 0.985 }, { opacity: 1, y: 0, scale: 1, duration: 0.8 }, 0)
        .fromTo(".tp-badge", { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 0.5 }, 0.15)
        .fromTo(".tp-line-in", { yPercent: 115 }, { yPercent: 0, duration: 0.9, stagger: 0.1, ease: "expo.out" }, 0.25)
        .fromTo(".tp-sub", { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.6 }, 0.55)
        .fromTo(".tp-input-wrap", { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.7 }, 0.62)
        .fromTo(".tp-chips li", { opacity: 0, y: 10, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.45, stagger: 0.07 }, 0.85)
        .fromTo(".tp-trust", { opacity: 0 }, { opacity: 1, duration: 0.5 }, 1.05);

      const onMove = (e: PointerEvent) => {
        const r = hero.getBoundingClientRect();
        gsap.to(hero, {
          "--mx": `${((e.clientX - r.left) / r.width) * 100}%`,
          "--my": `${((e.clientY - r.top) / r.height) * 100}%`,
          duration: 0.7,
          ease: "power3.out",
          overwrite: "auto",
        });
      };
      hero.addEventListener("pointermove", onMove);
      return () => hero.removeEventListener("pointermove", onMove);
    }, root);

    root.classList.add("tp-ready"); // timeline's from-states are already applied
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    SR.current = getSR();
    setSupported(!!SR.current);
    return () => recRef.current?.stop();
  }, []);

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
      setError("That file is over 1 MB. Choose a single source file.");
      return;
    }
    f.text()
      .then((t) => {
        if (t.includes("\u0000")) {
          setError("That looks like a binary file. Choose a source file.");
          return;
        }
        setCode(t);
        setFile({ name: f.name, size: f.size });
        setError("");
      })
      .catch(() => setError("Could not read that file. Try another one."));
  };

  const switchTab = (t: Tab) => {
    if (t !== "paste") recRef.current?.stop();
    setTab(t);
    setError("");
  };

  const language =
    tab === "github"
      ? repoUrl ? langFromName(repoUrl) : "Auto-detect"
      : file ? langFromName(file.name) : detectLanguage(code);

  const submit = () => {
    setError("");
    let s: Submission;
    if (tab === "github") {
      const url = repoUrl.trim();
      if (!GH_RE.test(url)) {
        setError("Paste a link to one file, like https://github.com/owner/repo/blob/main/src/app.py");
        return;
      }
      s = { source: "github", githubUrl: url, fileName: url.split("/").pop(), language };
    } else {
      if (!code.trim()) {
        if (tab === "file") setError("Choose a file first.");
        else areaRef.current?.focus();
        return;
      }
      s = { source: tab, code, fileName: file?.name, language };
    }
    setBusy(true);
    onSubmit?.(s);
    try {
      sessionStorage.setItem("testpilot:submission", JSON.stringify(s));
    } catch {
      /* storage unavailable; GitHub links still travel in the query string */
    }
    const path = s.githubUrl
      ? `/fix?src=github&url=${encodeURIComponent(s.githubUrl)}`
      : "/fix";
    (navigate ?? router.push)(path);
    window.setTimeout(() => setBusy(false), 1600);
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="tp-root" ref={rootRef}>
        <style>{CSS}</style>
        {particles && <Particles />}
        <main className="tp-main">
          <section className="tp-hero">
            <div className="tp-badge">
              <span className="tp-dot tp-pulse" />
              One file. One fix. Verified.
            </div>

            <h1 className="tp-h1">
              <span className="tp-line"><span className="tp-line-in">Debug any file.</span></span>
              <span className="tp-line tp-muted"><span className="tp-line-in">Verify the fix.</span></span>
            </h1>

            <p className="tp-sub">
              Submit a single source file, get an AI-powered root-cause diagnosis, a
              corrected version, a visual diff, and real test results from an isolated
              sandbox.
            </p>

            <div className="tp-input-wrap">
              <motion.div className="tp-input" whileHover={{ scale: 1.005 }} transition={{ duration: 0.2 }}>
                <div className="tp-top">
                  <span className="tp-lang">{language}</span>
                  <div className="tp-tabs" role="tablist" aria-label="Input method">
                    {TABS.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        role="tab"
                        aria-selected={tab === t.id}
                        className={`tp-tab${tab === t.id ? " on" : ""}`}
                        onClick={() => switchTab(t.id)}
                      >
                        {tab === t.id && (
                          <motion.span
                            layoutId="tp-thumb"
                            className="tp-thumb"
                            transition={{ type: "spring", stiffness: 520, damping: 38 }}
                          />
                        )}
                        <span className="tp-tab-label">{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="tp-pane" role="tabpanel">
                  <AnimatePresence mode="wait" initial={false}>
                    {tab === "paste" && (
                      <motion.div key="paste" className="tp-pane-in" {...paneAnim}>
                        <textarea
                          ref={areaRef}
                          value={code}
                          onChange={(e) => {
                            setCode(e.target.value);
                            setFile(null);
                          }}
                          spellCheck={false}
                          aria-label="Source code"
                          placeholder="// paste your code here"
                        />
                      </motion.div>
                    )}

                    {tab === "file" && (
                      <motion.div key="file" className="tp-pane-in" {...paneAnim}>
                        <motion.div
                          className={`tp-drop${drag ? " over" : ""}`}
                          animate={{ scale: drag ? 1.015 : 1 }}
                          transition={{ type: "spring", stiffness: 400, damping: 28 }}
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
                            <div className="tp-file">
                              <strong>{file.name}</strong>
                              <span>{fmtSize(file.size)}</span>
                              <button
                                type="button"
                                className="tp-link"
                                aria-label="Remove file"
                                onClick={() => { setFile(null); setCode(""); }}
                              >
                                <X size={14} /> Remove
                              </button>
                            </div>
                          ) : (
                            <>
                              <FileUp size={20} aria-hidden />
                              <p>Drop a source file here</p>
                              <button type="button" className="tp-pick" onClick={() => fileRef.current?.click()}>
                                Choose file
                              </button>
                            </>
                          )}
                        </motion.div>
                      </motion.div>
                    )}

                    {tab === "github" && (
                      <motion.div key="github" className="tp-pane-in tp-gh" {...paneAnim}>
                        <label htmlFor="tp-repo" className="tp-lbl">GitHub file link</label>
                        <input
                          id="tp-repo"
                          className="tp-url"
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
                      className="tp-err"
                      role="alert"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>

                <div className="tp-row">
                  <span className="tp-help">{HELP[tab]}</span>
                  <div className="tp-actions">
                    {tab === "paste" && (
                      <button
                        type="button"
                        className={`tp-mic${recording ? " rec" : ""}`}
                        onClick={toggleMic}
                        disabled={!supported}
                        aria-pressed={recording}
                        aria-label={recording ? "Stop dictation" : "Dictate by voice"}
                        title={supported ? undefined : "Voice input is not supported in this browser"}
                      >
                        {recording && (
                          <>
                            <motion.span
                              className="tp-ring"
                              initial={{ scale: 1, opacity: 0.55 }}
                              animate={{ scale: 1.9, opacity: 0 }}
                              transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
                            />
                            <motion.span
                              className="tp-ring"
                              initial={{ scale: 1, opacity: 0.55 }}
                              animate={{ scale: 1.9, opacity: 0 }}
                              transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut", delay: 0.7 }}
                            />
                          </>
                        )}
                        <Mic size={19} />
                      </button>
                    )}
                    <motion.button
                      type="button"
                      className="tp-go"
                      onClick={submit}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.96 }}
                      transition={{ type: "spring", stiffness: 700, damping: 30 }}
                    >
                      <AnimatePresence mode="wait" initial={false}>
                        <motion.span
                          key={busy ? "busy" : "idle"}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={{ duration: 0.12 }}
                          style={{ display: "inline-block" }}
                        >
                          {busy ? "Analyzing…" : "Debug file"}
                        </motion.span>
                      </AnimatePresence>
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            </div>

            <ul className="tp-chips">
              {CHIPS.map((c) => (
                <li key={c}>
                  <span className="tp-dot" />
                  {c}
                </li>
              ))}
            </ul>

            <p className="tp-trust">No accounts. No repo scanning. Just the file.</p>
          </section>
        </main>
      </div>
    </MotionConfig>
  );
}

/* ------------------------------------------------------------------ */
/* Styles: scoped, driven by your globals.css tokens (.dark class)     */
/* ------------------------------------------------------------------ */
const CSS = `
.tp-root{
  /* Controls get a light see-through tint so text stays readable.
     Set --tp-fill to "transparent" for a completely clear UI. */
  --tp-fill:color-mix(in srgb, var(--background) 45%, transparent);
  --tp-legible:0 0 18px var(--background), 0 0 6px var(--background);
  position:relative;background:transparent;color:var(--foreground);box-sizing:border-box;
  font-family:var(--font-geist),var(--font-inter),system-ui,sans-serif;
}
.tp-root *,.tp-root *::before,.tp-root *::after{box-sizing:border-box}
.tp-root:not(.tp-ready) .tp-hero{opacity:0}
.tp-bg{position:fixed;inset:0;width:100%;height:100%;z-index:0;pointer-events:none}
.tp-main{position:relative;z-index:1;display:flex;justify-content:center;padding:clamp(36px,7vh,64px) 22px clamp(40px,7vh,64px)}

/* ---- hero: brutalist frame, no fill (the Three.js scene shows through) ---- */
.tp-hero{
  position:relative;isolation:isolate;width:100%;max-width:900px;
  display:flex;flex-direction:column;align-items:center;text-align:center;
  padding:clamp(20px,3.2vh,32px) clamp(16px,3vw,36px) clamp(22px,3.4vh,34px);border-radius:30px;
  background:transparent;
  border:4px solid var(--foreground);
  box-shadow: 12px 12px 0px 0px var(--foreground);
}
.tp-hero>*{position:relative;z-index:1;max-width:100%}

.tp-badge{
  display:inline-flex;align-items:center;gap:8px;padding:5px 14px;border-radius:999px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;
  border:2px solid var(--foreground);background:var(--tp-fill);
  box-shadow: 4px 4px 0px 0px var(--foreground);
}
.tp-dot{width:6px;height:6px;border-radius:50%;background:var(--brand);flex:none;border:1px solid var(--foreground);}
.tp-badge .tp-dot{width:8px;height:8px}
.tp-pulse{animation:tp-pulse 2s infinite}
@keyframes tp-pulse{0%{box-shadow:0 0 0 0 var(--brand)}100%{box-shadow:0 0 0 10px transparent}}

.tp-h1{margin:clamp(12px,2vh,20px) 0 0;font-family:var(--font-heading),system-ui,sans-serif;font-weight:900;font-size:clamp(34px,min(7vw,7.4vh),64px);line-height:1.02;letter-spacing:-.045em;text-transform:uppercase;text-shadow:var(--tp-legible);}
.tp-line{display:block;overflow:hidden;padding-bottom:.1em;margin-bottom:-.1em}
.tp-line-in{display:block;will-change:transform}
.tp-muted{color:var(--muted-foreground)}
.tp-sub{margin:clamp(10px,1.6vh,16px) auto 0;max-width:640px;font-size:clamp(15px,1.9vw,17px);line-height:1.5;color:var(--muted-foreground);font-weight:500;text-shadow:var(--tp-legible);}

/* ---- input ---- */
.tp-input-wrap{width:100%;flex:none;margin-top:clamp(14px,2.4vh,22px)}
.tp-input{
  display:flex;flex-direction:column;text-align:left;padding:14px 16px;border-radius:24px;
  border:4px solid var(--foreground);background:var(--tp-fill);
  box-shadow: 6px 6px 0px 0px var(--foreground);
  transition:box-shadow .2s;
}
.tp-input:hover{box-shadow: 8px 8px 0px 0px var(--foreground);}
.tp-input:focus-within{border-color:var(--brand);box-shadow: 8px 8px 0px 0px var(--foreground);}

.tp-top{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px}
.tp-lang{display:inline-block;font:700 11px var(--font-mono),ui-monospace,monospace;letter-spacing:.02em;padding:4px 10px;border-radius:999px;border:2px solid var(--foreground);background:var(--brand);color:#000;}
.tp-tabs{display:flex;gap:2px;padding:3px;border-radius:999px;background:var(--tp-fill);border:2px solid var(--foreground);box-shadow: 3px 3px 0px 0px var(--foreground);}
.tp-tab{position:relative;padding:6px 14px;border:0;border-radius:999px;background:none;color:var(--muted-foreground);font-size:13px;font-weight:700;font-family:inherit;cursor:pointer;transition:color .2s;text-transform:uppercase;}
.tp-tab:hover,.tp-tab.on{color:var(--foreground)}
.tp-tab-label{position:relative;z-index:1}
.tp-thumb{
  position:absolute;inset:0;border-radius:999px;
  background:var(--brand);border:2px solid var(--foreground);
  box-shadow: 2px 2px 0px 0px var(--foreground);
}
.tp-tab.on .tp-tab-label{color:#000}
.tp-thumb::after{display:none;}

.tp-pane{flex:none;min-height:clamp(104px,14vh,124px);margin:12px 0 8px;display:flex}
.tp-pane-in{flex:1;min-width:0;min-height:0;display:flex;flex-direction:column}
.tp-pane textarea{flex:1;min-height:0;width:100%;padding:0;resize:none;border:0;outline:0;background:transparent;color:var(--foreground);caret-color:var(--brand);font:13.5px/1.6 var(--font-mono),ui-monospace,monospace}
.tp-pane textarea::placeholder{color:var(--muted-foreground)}

.tp-drop{flex:1;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:10px 14px;padding:14px;border:3px dashed var(--foreground);border-radius:18px;color:var(--muted-foreground);font-size:14px;transition:border-color .2s,background .2s;font-weight:600;}
.tp-drop p{margin:0}
.tp-drop.over{border-color:var(--brand);background:var(--brand);color:#000;border-style:solid;}
.tp-pick{height:36px;padding:0 16px;font-size:13px;font-weight:700;font-family:inherit;text-transform:uppercase;color:var(--foreground);border-radius:999px;cursor:pointer;
  border:2px solid var(--foreground);background:var(--tp-fill);
  box-shadow: 3px 3px 0px 0px var(--foreground);transition:transform .15s, box-shadow .15s;}
.tp-pick:active{transform:translate(2px, 2px);box-shadow: 1px 1px 0px 0px var(--foreground);}
.tp-file{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:12px;color:var(--muted-foreground)}
.tp-file strong{color:var(--foreground);font:600 14px var(--font-mono),monospace;word-break:break-all}
.tp-link{display:inline-flex;align-items:center;gap:3px;background:none;border:0;padding:0;color:var(--brand);font-size:13px;font-weight:700;font-family:inherit;cursor:pointer;text-decoration:underline;text-transform:uppercase;}
.tp-gh{justify-content:center;gap:8px}
.tp-lbl{font-size:12px;font-weight:700;text-transform:uppercase;color:var(--muted-foreground)}
.tp-url{width:100%;height:44px;padding:0 16px;border-radius:999px;border:3px solid var(--foreground);background:var(--tp-fill);color:var(--foreground);font:13.5px var(--font-mono),monospace;outline:0;box-shadow: 4px 4px 0px 0px var(--foreground);transition:box-shadow .2s}
.tp-url:focus{border-color:var(--brand);box-shadow: 6px 6px 0px 0px var(--foreground);}
.tp-url::placeholder{color:var(--muted-foreground)}
.tp-err{margin:0 0 8px;overflow:hidden;font-size:13px;font-weight:700;color:var(--destructive);text-transform:uppercase;}

.tp-row{display:flex;align-items:center;justify-content:space-between;gap:14px;padding-top:2px}
.tp-help{font-size:12px;font-weight:600;color:var(--muted-foreground)}
.tp-actions{display:flex;align-items:center;gap:10px;flex:none}
.tp-mic{position:relative;width:42px;height:42px;display:grid;place-items:center;border-radius:50%;border:2px solid transparent;background:transparent;color:var(--muted-foreground);cursor:pointer;transition:color .2s,background .2s, border-color .2s}
.tp-mic:hover{color:var(--foreground);background:var(--tp-fill);border-color:var(--foreground);box-shadow: 2px 2px 0px 0px var(--foreground);}
.tp-mic.rec{color:#000;background:var(--brand);border-color:var(--foreground);box-shadow: 2px 2px 0px 0px var(--foreground);}
.tp-mic:disabled{opacity:.4;cursor:not-allowed}
.tp-ring{position:absolute;inset:-1px;border-radius:50%;border:3px solid var(--brand);pointer-events:none}

/* primary action: brutalist pill */
.tp-go{
  position:relative;overflow:hidden;height:46px;padding:0 26px;font-size:15px;font-weight:800;font-family:inherit;color:#000;cursor:pointer;border-radius:999px;text-transform:uppercase;letter-spacing:0.05em;
  border:3px solid var(--foreground);
  background:var(--brand);
  box-shadow: 4px 4px 0px 0px var(--foreground);
  transition:transform .15s, box-shadow .15s;
}
.tp-go::after{display:none;}
.tp-go>span{position:relative;z-index:1}
.tp-go:hover{transform:translate(-1px, -1px);box-shadow: 6px 6px 0px 0px var(--foreground);}
.tp-go:active{transform:translate(2px, 2px);box-shadow: 2px 2px 0px 0px var(--foreground);}

/* ---- chips ---- */
.tp-chips{display:flex;flex-wrap:wrap;justify-content:center;gap:12px;margin:clamp(16px,2.6vh,24px) 0 0;padding:0;list-style:none}
.tp-chips li{
  display:inline-flex;align-items:center;gap:8px;padding:7px 15px;font-size:13px;font-weight:700;text-transform:uppercase;border-radius:999px;
  border:2px solid var(--foreground);background:var(--tp-fill);
  box-shadow: 3px 3px 0px 0px var(--foreground);
  transition:transform .2s, box-shadow .2s;
}
.tp-chips li:hover{transform:translate(-2px, -2px);box-shadow: 5px 5px 0px 0px var(--foreground);}
.tp-trust{margin:clamp(14px,2.2vh,20px) 0 0;font-size:12px;font-weight:700;text-transform:uppercase;color:var(--muted-foreground);text-shadow:var(--tp-legible)}

.tp-root :is(.tp-tab,.tp-pick,.tp-link,.tp-mic,.tp-go):focus-visible{outline:3px solid var(--brand);outline-offset:3px}

@media (max-width:600px){
  .tp-main{padding:28px 14px 40px}
  .tp-hero{padding:22px 14px 24px;border-radius:24px;box-shadow: 8px 8px 0px 0px var(--foreground);}
  .tp-row{flex-direction:column;align-items:stretch}
  .tp-actions{justify-content:flex-end}
  .tp-top{justify-content:flex-start}
  .tp-pane{min-height:132px}
}
@media (prefers-reduced-motion:reduce){
  .tp-pulse{animation:none}
  .tp-input,.tp-chips li,.tp-go,.tp-pick,.tp-url{transition:none}
  .tp-chips li:hover{translate:none}
}
`;