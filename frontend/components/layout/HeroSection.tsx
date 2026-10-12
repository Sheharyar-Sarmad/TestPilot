"use client";

import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { gsap } from "gsap";
import { AnimatePresence, MotionConfig, motion, useAnimationControls } from "framer-motion";
import {
  ArrowRight,
  FileUp,
  Mic,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";

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
const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ------------------------------------------------------------------ */
/* Optional particle layer (transparent canvas, uses --brand)          */
/* ------------------------------------------------------------------ */
function Particles() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const reduce = reducedMotion();
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
/* Content (real, functional only)                                     */
/* ------------------------------------------------------------------ */

/** One-click examples: real code prefilled into the textarea. */
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

/** Snippets the empty textarea hint cycles through (not fake stats, just hints). */
const GHOST_SNIPPETS = [
  "// paste a buggy file — we'll find the root cause and fix it",
  "// try a Python list index error",
  "// try an unhandled JS promise rejection",
  "// try a Go data race in a goroutine",
  "// try a Rust borrow-checker conflict",
];

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

/** Splits text into per-letter spans so each letter can react to the pointer. */
function Split({ text }: { text: string }) {
  const words = text.split(" ");
  return (
    <>
      {words.map((w, wi) => (
        <Fragment key={wi}>
          <span className="tp-w">
            {[...w].map((ch, i) => (
              <span key={i} className="tp-ch">{ch}</span>
            ))}
          </span>
          {wi < words.length - 1 ? " " : null}
        </Fragment>
      ))}
    </>
  );
}

const CHIPS = ["Root cause", "Line diff", "Sandbox verified", "Structure map"];
const STRIPE = "DEBUG ★ VERIFY ★ SHIP ★ ONE FILE ★ ONE FIX ★ ";

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

const paneAnim = {
  initial: { opacity: 0, y: 6, filter: "blur(4px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -6, filter: "blur(4px)" },
  transition: { duration: 0.18 },
};

/** Ghost-typing hint for the textarea (UX hint only, not fake data). */
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
          timeoutId = window.setTimeout(step, 2100);
          return;
        }
        timeoutId = window.setTimeout(step, 38);
      } else {
        charIdx--;
        setText(cur.slice(0, charIdx));
        if (charIdx <= 0) {
          deleting = false;
          idx = (idx + 1) % GHOST_SNIPPETS.length;
          timeoutId = window.setTimeout(step, 380);
          return;
        }
        timeoutId = window.setTimeout(step, 14);
      }
    };
    timeoutId = window.setTimeout(step, 320);
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
  particles = false,
}: {
  onSubmit?: (s: Submission) => void;
  navigate?: (path: string) => void;
  particles?: boolean;
}) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const fxRef = useRef<HTMLDivElement>(null);
  const goRef = useRef<HTMLButtonElement>(null);
  const [code, setCode] = useState("");
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<Tab>("paste");
  const [file, setFile] = useState<{ name: string; size: number } | null>(null);
  const [repoUrl, setRepoUrl] = useState("");
  const [error, setError] = useState("");
  const [drag, setDrag] = useState(false);
  const [supported, setSupported] = useState(true);
  const [sound, setSound] = useState(false);
  const [focused, setFocused] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const baseRef = useRef("");
  const SR = useRef<SRCtor | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const soundRef = useRef(false);
  const shake = useAnimationControls();

  soundRef.current = sound;

  /* Ghost typing only when paste tab, empty input, and not focused. */
  const ghostActive = tab === "paste" && !code && !focused && !recording;
  const ghostText = useGhostTyping(ghostActive);

  /* ---- feedback helpers: sound, haptics, liquid burst, shake ---- */
  const tick = (f = 480, dur = 0.06, type: OscillatorType = "square", vol = 0.035) => {
    if (!soundRef.current) return;
    try {
      const AC =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ac = (audioRef.current ??= new AC());
      if (ac.state === "suspended") void ac.resume();
      const t = ac.currentTime;
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f, t);
      o.frequency.exponentialRampToValueAtTime(f * 0.5, t + dur);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(ac.destination);
      o.start();
      o.stop(t + dur);
    } catch {
      /* audio unavailable */
    }
  };

  const buzz = (ms = 8) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(ms);
  };

  const burst = (x: number, y: number, n = 8, spread = 44) => {
    const fx = fxRef.current;
    if (!fx || reducedMotion()) return;
    for (let i = 0; i < n; i++) {
      const d = document.createElement("span");
      const s = 8 + Math.random() * 14;
      d.className = "tp-bit";
      d.style.cssText = `left:${x - s / 2}px;top:${y - s / 2}px;width:${s}px;height:${s}px`;
      fx.appendChild(d);
      const a = Math.random() * Math.PI * 2;
      const dist = spread * (0.45 + Math.random() * 0.8);
      gsap.to(d, {
        x: Math.cos(a) * dist,
        y: Math.sin(a) * dist,
        scale: 0,
        duration: 0.45 + Math.random() * 0.45,
        ease: "power2.out",
        onComplete: () => d.remove(),
      });
    }
  };

  const fail = (msg: string) => {
    setError(msg);
    buzz(30);
    tick(140, 0.18, "sawtooth", 0.05);
    if (!reducedMotion()) {
      void shake.start({ x: [0, -12, 11, -8, 6, -3, 0], transition: { duration: 0.42 } });
    }
  };

  /* ---- GSAP: entrance, pointer shadow, magnetic buttons, card tilt ---- */
  useIso(() => {
    const root = rootRef.current;
    if (!root) return;
    if (reducedMotion()) {
      root.classList.add("tp-ready", "tp-settled");
      return;
    }
    const hero = root.querySelector<HTMLElement>(".tp-hero");
    if (!hero) return;

    const cleanups: Array<() => void> = [];

    const ctx = gsap.context(() => {
      gsap.set(hero, { "--mx": "50%", "--my": "30%", "--sx": 12, "--sy": 12 });

      const tl = gsap.timeline({
        defaults: { ease: "power3.out" },
        onComplete: () => root.classList.add("tp-settled"),
      });
      tl.fromTo(hero, { opacity: 0, y: 28, scale: 0.985 }, { opacity: 1, y: 0, scale: 1, duration: 0.8 }, 0)
        .fromTo(".tp-badge", { opacity: 0, y: -10, rotate: -6 }, { opacity: 1, y: 0, rotate: 0, duration: 0.6, ease: "back.out(2.4)" }, 0.15)
        .fromTo(".tp-line-in", { yPercent: 115 }, { yPercent: 0, duration: 0.9, stagger: 0.1, ease: "expo.out" }, 0.22)
        .fromTo(".tp-sub", { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.6 }, 0.5)
        .fromTo(".tp-input-wrap", { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.7 }, 0.58)
        .fromTo(".tp-examples > *", { opacity: 0, y: 8, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, duration: 0.45, stagger: 0.06, ease: "back.out(2.4)" }, 0.78)
        .fromTo(".tp-chips li", { opacity: 0, y: 10, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, duration: 0.55, stagger: 0.07, ease: "back.out(2.6)" }, 0.88)
        .fromTo(".tp-stripe", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6, ease: "back.out(2)" }, 0.98);

      const onMove = (e: PointerEvent) => {
        const r = hero.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        gsap.to(hero, {
          "--mx": `${px * 100}%`,
          "--my": `${py * 100}%`,
          "--sx": 12 - (px - 0.5) * 2 * 10,
          "--sy": 12 - (py - 0.5) * 2 * 10,
          duration: 0.7,
          ease: "power3.out",
          overwrite: "auto",
        });
      };
      const onLeave = () =>
        gsap.to(hero, { "--sx": 12, "--sy": 12, duration: 0.9, ease: "elastic.out(1,.5)", overwrite: "auto" });
      hero.addEventListener("pointermove", onMove);
      hero.addEventListener("pointerleave", onLeave);
      cleanups.push(() => {
        hero.removeEventListener("pointermove", onMove);
        hero.removeEventListener("pointerleave", onLeave);
      });

      root.querySelectorAll<HTMLElement>(".tp-mag").forEach((m) => {
        const mm = (e: PointerEvent) => {
          const r = m.getBoundingClientRect();
          gsap.to(m, {
            x: (e.clientX - r.left - r.width / 2) * 0.32,
            y: (e.clientY - r.top - r.height / 2) * 0.32,
            duration: 0.3,
            ease: "power3.out",
            overwrite: "auto",
          });
        };
        const ml = () => gsap.to(m, { x: 0, y: 0, duration: 0.8, ease: "elastic.out(1,.4)", overwrite: "auto" });
        m.addEventListener("pointermove", mm);
        m.addEventListener("pointerleave", ml);
        cleanups.push(() => {
          m.removeEventListener("pointermove", mm);
          m.removeEventListener("pointerleave", ml);
        });
      });

      const wrap = root.querySelector<HTMLElement>(".tp-input-wrap");
      if (wrap) {
        const tm = (e: PointerEvent) => {
          const r = wrap.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width - 0.5;
          const py = (e.clientY - r.top) / r.height - 0.5;
          gsap.to(wrap, {
            rotationX: -py * 4,
            rotationY: px * 5,
            transformPerspective: 1000,
            duration: 0.5,
            ease: "power2.out",
            overwrite: "auto",
          });
        };
        const tl2 = () =>
          gsap.to(wrap, { rotationX: 0, rotationY: 0, duration: 0.9, ease: "elastic.out(1,.5)", overwrite: "auto" });
        wrap.addEventListener("pointermove", tm);
        wrap.addEventListener("pointerleave", tl2);
        cleanups.push(() => {
          wrap.removeEventListener("pointermove", tm);
          wrap.removeEventListener("pointerleave", tl2);
        });
      }
    }, root);

    root.classList.add("tp-ready");
    return () => {
      cleanups.forEach((fn) => fn());
      ctx.revert();
    };
  }, []);

  useEffect(() => {
    SR.current = getSR();
    setSupported(!!SR.current);
    return () => recRef.current?.stop();
  }, []);

  const wobble = (el: HTMLElement) => {
    if (reducedMotion() || gsap.isTweening(el)) return;
    gsap.fromTo(
      el,
      { y: 0, rotate: 0, scale: 1 },
      {
        y: -14,
        rotate: gsap.utils.random(-16, 16),
        scale: 1.2,
        duration: 0.2,
        ease: "power2.out",
        yoyo: true,
        repeat: 1,
      },
    );
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
        tick(720, 0.1, "triangle");
        buzz(12);
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
    tick(720, 0.1, "triangle");
    buzz(10);
    requestAnimationFrame(() => areaRef.current?.focus());
  };

  const language =
    tab === "github"
      ? repoUrl ? langFromName(repoUrl) : "Auto-detect"
      : file ? langFromName(file.name) : detectLanguage(code);

  const hasInput = tab === "github" ? !!repoUrl.trim() : !!code.trim();
  const lines = code ? code.split("\n").length : 0;

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

    const r = goRef.current?.getBoundingClientRect();
    if (r) burst(r.left + r.width / 2, r.top + r.height / 2, 26, 120);
    tick(330, 0.09, "square", 0.05);
    window.setTimeout(() => tick(660, 0.14, "square", 0.05), 80);
    buzz(18);

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
      <div
        className="tp-root"
        ref={rootRef}
        onPointerDown={(e) => {
          const b = (e.target as HTMLElement).closest("button");
          if (!b) return;
          tick(b.classList.contains("tp-tab") ? 760 : 520);
          buzz(8);
          if (b !== goRef.current) burst(e.clientX, e.clientY, 7, 38);
        }}
      >
        <style>{CSS}</style>

        <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
          <defs>
            <filter id="tp-goo">
              <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="b" />
              <feColorMatrix in="b" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -9" />
            </filter>
            <filter id="tp-goo-s">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="b" />
              <feColorMatrix in="b" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -10" />
            </filter>
          </defs>
        </svg>

        {particles && <Particles />}
        <div className="tp-fx" ref={fxRef} aria-hidden="true" />

        <main className="tp-main">
          <section className="tp-hero">
            <div className="tp-blobs" aria-hidden="true">
              <i className="tp-blob b1" />
              <i className="tp-blob b2" />
              <i className="tp-blob b3" />
              <i className="tp-blob chase" />
            </div>

            <div className="tp-badge">
              <span className="tp-dot tp-pulse" />
              One file. One fix. Verified.
            </div>

            <h1
              className="tp-h1"
              onPointerOver={(e) => {
                const t = e.target as HTMLElement;
                if (t.classList.contains("tp-ch")) wobble(t);
              }}
            >
              <span className="tp-line"><span className="tp-line-in"><Split text="Debug any file." /></span></span>
              <span className="tp-line tp-muted"><span className="tp-line-in"><Split text="Verify the fix." /></span></span>
            </h1>

            <p className="tp-sub">
              Paste one buggy file. Get the root cause, a corrected version, a visual diff, and proof it
              runs — <b>in about 15 seconds</b> after the render wakeup.
            </p>

            <div className="tp-input-wrap">
              <motion.div animate={shake} className="tp-shake">
                <motion.div className="tp-input" whileHover={{ scale: 1.005 }} transition={{ duration: 0.2 }}>
                  <div className="tp-top">
                    <div className="tp-meta">
                      <span className="tp-lang">{language}</span>
                      {tab !== "github" && code && (
                        <span className="tp-stat">{lines} ln / {code.length} ch</span>
                      )}
                    </div>
                    <div className="tp-tabs" role="tablist" aria-label="Input method">
                      {TABS.map((t) => (
                        <motion.button
                          key={t.id}
                          type="button"
                          role="tab"
                          aria-selected={tab === t.id}
                          className={`tp-tab${tab === t.id ? " on" : ""}`}
                          onClick={() => switchTab(t.id)}
                          whileTap={{ scale: 0.88, rotate: -2 }}
                          transition={{ type: "spring", stiffness: 600, damping: 18 }}
                        >
                          {tab === t.id && (
                            <motion.span
                              layoutId="tp-thumb"
                              className="tp-thumb"
                              transition={{ type: "spring", stiffness: 420, damping: 20, mass: 0.9 }}
                            />
                          )}
                          <span className="tp-tab-label">{t.label}</span>
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  <div className="tp-pane" role="tabpanel">
                    <AnimatePresence mode="wait" initial={false}>
                      {tab === "paste" && (
                        <motion.div key="paste" className="tp-pane-in tp-pane-rel" {...paneAnim}>
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
                                return;
                              }
                              if (e.key.length === 1 || e.key === "Backspace" || e.key === "Enter") {
                                tick(e.key === "Enter" ? 260 : 380 + Math.random() * 120, 0.025, "square", 0.02);
                              }
                            }}
                            spellCheck={false}
                            aria-label="Source code"
                            placeholder=""
                          />
                          {ghostActive && (
                            <div className="tp-ghost" aria-hidden>
                              {ghostText}
                              <span className="tp-ghost-caret" />
                            </div>
                          )}
                        </motion.div>
                      )}

                      {tab === "file" && (
                        <motion.div key="file" className="tp-pane-in" {...paneAnim}>
                          <motion.div
                            className={`tp-drop${drag ? " over" : ""}`}
                            animate={{
                              scale: drag ? 1.03 : 1,
                              rotate: drag ? -0.8 : 0,
                              borderRadius: drag ? "56px 18px 56px 18px" : "18px 18px 18px 18px",
                            }}
                            transition={{ type: "spring", stiffness: 300, damping: 14 }}
                            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                            onDragLeave={() => setDrag(false)}
                            onDrop={(e) => {
                              e.preventDefault();
                              setDrag(false);
                              burst(e.clientX, e.clientY, 14, 70);
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
                                <motion.span
                                  className="tp-up"
                                  animate={drag ? { y: [0, -8, 0] } : { y: 0 }}
                                  transition={{ duration: 0.6, repeat: drag ? Infinity : 0 }}
                                >
                                  <FileUp size={22} aria-hidden />
                                </motion.span>
                                <p>{drag ? "Drop it!" : "Drop a source file here"}</p>
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
                    <span className={`tp-help${recording ? " live" : ""}`}>
                      {recording ? "Listening… describe the bug." : HELP[tab]}
                    </span>
                    <div className="tp-actions">
                      <button
                        type="button"
                        className={`tp-mic tp-snd${sound ? " on" : ""}`}
                        onClick={() => {
                          setSound((v) => !v);
                          window.setTimeout(() => tick(880, 0.08, "triangle"), 0);
                        }}
                        aria-pressed={sound}
                        aria-label={sound ? "Mute click sounds" : "Enable click sounds"}
                        title={sound ? "Click sounds on" : "Click sounds off"}
                      >
                        {sound ? <Volume2 size={18} /> : <VolumeX size={18} />}
                      </button>
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
                      <span className="tp-mag">
                        <motion.button
                          ref={goRef}
                          type="button"
                          className={`tp-go${hasInput && !busy ? " ready" : ""}`}
                          onClick={submit}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.93 }}
                          transition={{ type: "spring", stiffness: 700, damping: 22 }}
                        >
                          {busy && (
                            <motion.i
                              className="tp-fill"
                              initial={{ scaleX: 0 }}
                              animate={{ scaleX: 1 }}
                              transition={{ duration: 1.6, ease: "linear" }}
                            />
                          )}
                          <AnimatePresence mode="wait" initial={false}>
                            <motion.span
                              key={busy ? "busy" : "idle"}
                              initial={{ opacity: 0, y: 8, scaleY: 0.6 }}
                              animate={{ opacity: 1, y: 0, scaleY: 1 }}
                              exit={{ opacity: 0, y: -8, scaleY: 0.6 }}
                              transition={{ duration: 0.12 }}
                              style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
                            >
                              {busy ? (
                                <>
                                  <span className="tp-spin" aria-hidden />
                                  Analyzing…
                                </>
                              ) : (
                                <>
                                  Debug my file
                                  <ArrowRight className="tp-go-arrow" size={16} aria-hidden />
                                </>
                              )}
                            </motion.span>
                          </AnimatePresence>
                        </motion.button>
                      </span>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </div>

            <div className="tp-examples" aria-label="Try a sample bug">
              <span className="tp-examples-lbl">Try:</span>
              {EXAMPLES.map((ex) => (
                <button
                  key={ex.label}
                  type="button"
                  className="tp-ex"
                  onClick={() => useExample(ex)}
                  title={`Load a sample ${ex.label} bug`}
                >
                  {ex.label} <span>· {ex.hint}</span>
                </button>
              ))}
            </div>

            <ul className="tp-chips">
              {CHIPS.map((c) => (
                <li key={c}>
                  <span className="tp-dot" />
                  {c}
                </li>
              ))}
            </ul>

            <div className="tp-stripe" aria-hidden="true">
              <div className="tp-stripe-track">
                <span>{STRIPE.repeat(4)}</span>
                <span>{STRIPE.repeat(4)}</span>
              </div>
            </div>
          </section>
        </main>
      </div>
    </MotionConfig>
  );
}

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */
const CSS = `
.tp-root{
  --tp-fill:color-mix(in srgb, var(--background) 74%, transparent);
  --tp-halo:2px 2px 0 var(--background),-2px 2px 0 var(--background),2px -2px 0 var(--background),-2px -2px 0 var(--background),0 0 16px var(--background),0 0 30px var(--background);
  --tp-edge:color-mix(in srgb, var(--foreground) 22%, transparent);
  --tp-soft:color-mix(in srgb, var(--foreground) 74%, var(--background));
  position:relative;background:transparent;color:var(--foreground);box-sizing:border-box;
  font-family:var(--font-geist),var(--font-inter),system-ui,sans-serif;
}
.tp-root *,.tp-root *::before,.tp-root *::after{box-sizing:border-box}
.tp-root:not(.tp-ready) .tp-hero{opacity:0}
.tp-bg{position:fixed;inset:0;width:100%;height:100%;z-index:0;pointer-events:none}
.tp-main{position:relative;z-index:1;display:flex;justify-content:center;align-items:flex-start;padding:clamp(14px,2.6vh,30px) 22px clamp(30px,5vh,44px)}

.tp-fx{position:fixed;inset:0;z-index:60;pointer-events:none;filter:url(#tp-goo-s)}
.tp-bit{position:absolute;border-radius:50%;background:var(--brand);will-change:transform}

.tp-hero{
  --sx:12;--sy:12;--mx:50%;--my:30%;
  position:relative;isolation:isolate;width:100%;max-width:900px;
  display:flex;flex-direction:column;align-items:center;text-align:center;
  padding:clamp(16px,2.4vh,26px) clamp(16px,3vw,32px) clamp(24px,3.4vh,34px);border-radius:30px;
  background:transparent;
  border:2px solid var(--tp-edge);
  box-shadow:calc(var(--sx)*.4px) calc(var(--sy)*.4px) 0 0 var(--tp-edge);
}
.tp-hero>*{position:relative;z-index:1;max-width:100%}

.tp-hero>.tp-blobs{position:absolute;inset:0;z-index:0;border-radius:26px;overflow:hidden;pointer-events:none;filter:url(#tp-goo);opacity:.1;max-width:none}
.tp-blob{position:absolute;display:block;background:var(--brand);will-change:transform,border-radius}
.tp-blob.b1{width:260px;height:260px;left:-60px;top:-50px;animation:tp-morph 11s ease-in-out infinite,tp-drift1 17s ease-in-out infinite}
.tp-blob.b2{width:220px;height:220px;right:-50px;top:30%;animation:tp-morph 13s ease-in-out -4s infinite,tp-drift2 19s ease-in-out infinite}
.tp-blob.b3{width:200px;height:200px;left:30%;bottom:-70px;animation:tp-morph 9s ease-in-out -2s infinite,tp-drift1 15s ease-in-out -6s infinite}
.tp-blob.chase{width:150px;height:150px;left:var(--mx);top:var(--my);translate:-50% -50%;animation:tp-morph 7s ease-in-out infinite}
@keyframes tp-morph{
  0%,100%{border-radius:42% 58% 63% 37% / 41% 44% 56% 59%}
  33%{border-radius:61% 39% 38% 62% / 55% 61% 39% 45%}
  66%{border-radius:35% 65% 55% 45% / 63% 35% 65% 37%}
}
@keyframes tp-drift1{0%,100%{transform:translate(0,0)}50%{transform:translate(70px,50px)}}
@keyframes tp-drift2{0%,100%{transform:translate(0,0)}50%{transform:translate(-80px,-40px)}}

.tp-badge{
  display:inline-flex;align-items:center;gap:8px;padding:5px 14px;border-radius:999px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;
  border:2px solid var(--foreground);background:var(--tp-fill);
  box-shadow:4px 4px 0 0 var(--foreground);
  rotate:-1.5deg;
}
.tp-dot{width:6px;height:6px;border-radius:50%;background:var(--brand);flex:none;border:1px solid var(--foreground)}
.tp-badge .tp-dot{width:8px;height:8px}
.tp-pulse{animation:tp-pulse 2s infinite}
@keyframes tp-pulse{0%{box-shadow:0 0 0 0 var(--brand)}100%{box-shadow:0 0 0 10px transparent}}

.tp-h1{margin:clamp(10px,1.6vh,16px) 0 0;font-family:var(--font-heading),system-ui,sans-serif;font-weight:900;font-size:clamp(30px,min(6.4vw,6.2vh),58px);line-height:1.02;letter-spacing:-.045em;text-transform:uppercase;text-shadow:var(--tp-halo);cursor:default}
.tp-line{display:block;overflow:hidden;padding-bottom:.1em;margin-bottom:-.1em}
.tp-settled .tp-line{overflow:visible}
.tp-line-in{display:block;will-change:transform}
.tp-w{display:inline-block;white-space:nowrap}
.tp-ch{display:inline-block;transition:color .15s;will-change:transform}
.tp-ch:hover{color:var(--brand);-webkit-text-stroke:0}
.tp-muted{color:var(--tp-soft)}
.tp-sub{margin:clamp(8px,1.3vh,12px) auto 0;max-width:640px;padding:7px 14px;border-radius:14px;font-size:clamp(13px,min(1.9vw,1.9vh),16px);line-height:1.45;color:var(--foreground);font-weight:600;background:color-mix(in srgb,var(--background) 66%,transparent);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);border:2px solid var(--tp-edge)}
.tp-sub b{color:var(--brand);font-weight:800}

/* ---- input ---- */
.tp-input-wrap{width:100%;flex:none;margin-top:clamp(10px,1.8vh,16px);transform-style:preserve-3d}
.tp-input{
  display:flex;flex-direction:column;text-align:left;padding:10px 14px;border-radius:24px;
  border:3px solid var(--foreground);background:var(--tp-fill);
  backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);
  box-shadow:5px 5px 0 0 var(--foreground);
  transition:box-shadow .2s,border-color .2s;
}
.tp-input:hover{box-shadow:7px 7px 0 0 var(--foreground)}
.tp-input:focus-within{border-color:var(--brand);box-shadow:7px 7px 0 0 var(--brand),9px 9px 0 2px var(--foreground)}

.tp-top{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px}
.tp-meta{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.tp-lang{display:inline-block;font:700 11px var(--font-mono),ui-monospace,monospace;letter-spacing:.02em;padding:4px 10px;border-radius:999px;border:2px solid var(--foreground);background:var(--brand);color:#000;box-shadow:2px 2px 0 0 var(--foreground)}
.tp-stat{font:700 11px var(--font-mono),ui-monospace,monospace;color:var(--muted-foreground);padding:3px 8px;border:2px dashed var(--muted-foreground);border-radius:999px}
.tp-tabs{display:flex;gap:2px;padding:3px;border-radius:999px;background:var(--tp-fill);border:2px solid var(--foreground);box-shadow:3px 3px 0 0 var(--foreground)}
.tp-tab{position:relative;padding:6px 14px;border:0;border-radius:999px;background:none;color:var(--muted-foreground);font-size:13px;font-weight:700;font-family:inherit;cursor:pointer;transition:color .2s;text-transform:uppercase}
.tp-tab:hover,.tp-tab.on{color:var(--foreground)}
.tp-tab-label{position:relative;z-index:1}
.tp-thumb{
  position:absolute;inset:0;border-radius:999px;
  background:var(--brand);border:2px solid var(--foreground);
  box-shadow:2px 2px 0 0 var(--foreground);
}
.tp-tab.on .tp-tab-label{color:#000}

.tp-pane{flex:none;min-height:clamp(78px,11vh,112px);margin:10px 0 6px;display:flex}
.tp-pane-in{flex:1;min-width:0;min-height:0;display:flex;flex-direction:column}
.tp-pane-rel{position:relative}
.tp-pane textarea{flex:1;min-height:0;width:100%;padding:0;resize:none;border:0;outline:0;background:transparent;color:var(--foreground);caret-color:var(--brand);font:13.5px/1.6 var(--font-mono),ui-monospace,monospace;position:relative;z-index:1}
.tp-pane textarea::placeholder{color:var(--muted-foreground)}

/* ghost typing hint */
.tp-ghost{
  position:absolute;inset:0;pointer-events:none;z-index:0;
  color:var(--muted-foreground);opacity:.7;
  font:13.5px/1.6 var(--font-mono),ui-monospace,monospace;
  white-space:pre-wrap;overflow:hidden;
}
.tp-ghost-caret{
  display:inline-block;width:7px;height:1em;vertical-align:-2px;
  background:var(--brand);margin-left:2px;
  animation:tp-caret 1.05s steps(2,end) infinite;
}
@keyframes tp-caret{50%{opacity:0}}

.tp-drop{flex:1;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:10px 14px;padding:14px;border:3px dashed var(--foreground);border-radius:18px;color:var(--muted-foreground);font-size:14px;transition:border-color .2s,background .2s,box-shadow .2s;font-weight:600}
.tp-drop p{margin:0}
.tp-up{display:grid;place-items:center}
.tp-drop.over{border-color:var(--foreground);background:var(--brand);color:#000;border-style:solid;box-shadow:6px 6px 0 0 var(--foreground)}
.tp-pick{height:36px;padding:0 16px;font-size:13px;font-weight:700;font-family:inherit;text-transform:uppercase;color:var(--foreground);border-radius:999px;cursor:pointer;
  border:2px solid var(--foreground);background:var(--tp-fill);
  box-shadow:3px 3px 0 0 var(--foreground);transition:translate .12s,box-shadow .12s,background .12s}
.tp-pick:hover{background:var(--brand);color:#000;translate:-1px -1px;box-shadow:4px 4px 0 0 var(--foreground)}
.tp-pick:active{translate:3px 3px;box-shadow:0 0 0 0 var(--foreground)}
.tp-file{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:12px;color:var(--muted-foreground)}
.tp-file strong{color:var(--foreground);font:600 14px var(--font-mono),monospace;word-break:break-all}
.tp-link{display:inline-flex;align-items:center;gap:3px;background:none;border:0;padding:0;color:var(--brand);font-size:13px;font-weight:700;font-family:inherit;cursor:pointer;text-decoration:underline;text-transform:uppercase}
.tp-gh{justify-content:center;gap:8px}
.tp-lbl{font-size:12px;font-weight:700;text-transform:uppercase;color:var(--muted-foreground)}
.tp-url{width:100%;height:44px;padding:0 16px;border-radius:999px;border:3px solid var(--foreground);background:var(--tp-fill);color:var(--foreground);font:13.5px var(--font-mono),monospace;outline:0;box-shadow:4px 4px 0 0 var(--foreground);transition:box-shadow .2s,translate .2s}
.tp-url:focus{border-color:var(--brand);box-shadow:7px 7px 0 0 var(--foreground);translate:-2px -2px}
.tp-url::placeholder{color:var(--muted-foreground)}
.tp-err{margin:0 0 8px;overflow:hidden;font-size:13px;font-weight:700;color:var(--destructive);text-transform:uppercase}

.tp-row{display:flex;align-items:center;justify-content:space-between;gap:14px;padding-top:2px}
.tp-help{font-size:12px;font-weight:600;color:var(--muted-foreground)}
.tp-help.live{color:var(--brand);animation:tp-blink 1s steps(2) infinite}
@keyframes tp-blink{50%{opacity:.35}}
.tp-actions{display:flex;align-items:center;gap:10px;flex:none}

.tp-mic{position:relative;width:42px;height:42px;display:grid;place-items:center;border-radius:50%;border:2px solid transparent;background:transparent;color:var(--muted-foreground);cursor:pointer;transition:color .2s,background .2s,border-color .2s,translate .1s,box-shadow .1s}
.tp-mic:hover{color:var(--foreground);background:var(--tp-fill);border-color:var(--foreground);box-shadow:2px 2px 0 0 var(--foreground)}
.tp-mic:active{translate:2px 2px;box-shadow:0 0 0 0 var(--foreground)}
.tp-mic.rec,.tp-snd.on{color:#000;background:var(--brand);border-color:var(--foreground);box-shadow:2px 2px 0 0 var(--foreground)}
.tp-mic:disabled{opacity:.4;cursor:not-allowed}
.tp-ring{position:absolute;inset:-1px;border-radius:50%;border:3px solid var(--brand);pointer-events:none}

.tp-mag{display:inline-block;padding:10px;margin:-10px;will-change:transform}

.tp-go{
  position:relative;overflow:hidden;height:46px;padding:0 26px;font-size:15px;font-weight:800;font-family:inherit;color:#000;cursor:pointer;border-radius:999px;text-transform:uppercase;letter-spacing:0.05em;
  border:3px solid var(--foreground);
  background:var(--brand);
  box-shadow:4px 4px 0 0 var(--foreground);
  transition:translate .1s,box-shadow .1s;
}
.tp-go>span{position:relative;z-index:1}
.tp-go:hover{translate:-2px -2px;box-shadow:7px 7px 0 0 var(--foreground)}
.tp-go:active{translate:4px 4px;box-shadow:0 0 0 0 var(--foreground)}
.tp-go.ready{animation:tp-nudge 2.4s ease-in-out infinite}
@keyframes tp-nudge{
  0%,70%,100%{rotate:0deg}
  76%{rotate:-3deg}82%{rotate:3deg}88%{rotate:-2deg}94%{rotate:1deg}
}
.tp-go-arrow{transition:transform .25s cubic-bezier(.3,1.6,.5,1)}
.tp-go:hover .tp-go-arrow{transform:translateX(4px)}
.tp-spin{
  width:13px;height:13px;border-radius:50%;
  border:2px solid rgba(0,0,0,.25);border-top-color:#000;
  animation:tp-rotate .7s linear infinite;
}
@keyframes tp-rotate{to{transform:rotate(360deg)}}
.tp-fill{position:absolute;inset:0;z-index:0;display:block;background:var(--foreground);opacity:.2;transform-origin:left}

/* one-click examples */
.tp-examples{
  display:flex;flex-wrap:wrap;align-items:center;justify-content:center;
  gap:8px;margin:clamp(10px,1.6vh,14px) 0 0;
}
.tp-examples-lbl{
  font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;
  color:var(--muted-foreground);padding-right:2px;
}
.tp-ex{
  display:inline-flex;align-items:center;gap:5px;
  padding:5px 11px;font-size:11px;font-weight:800;font-family:inherit;
  text-transform:uppercase;letter-spacing:.03em;color:var(--foreground);
  border:2px solid var(--foreground);background:var(--tp-fill);
  border-radius:999px;cursor:pointer;
  box-shadow:2px 2px 0 0 var(--foreground);
  transition:translate .14s,box-shadow .14s,background .14s,color .14s,rotate .14s;
}
.tp-ex span{color:var(--muted-foreground);font-weight:600;text-transform:none;letter-spacing:0;font-size:11px}
.tp-ex:nth-child(odd){rotate:-1.2deg}
.tp-ex:nth-child(even){rotate:1.4deg}
.tp-ex:hover{
  background:var(--brand);color:#000;rotate:0deg;
  translate:-1px -1px;box-shadow:4px 4px 0 0 var(--foreground);
}
.tp-ex:hover span{color:#000}
.tp-ex:active{translate:2px 2px;box-shadow:0 0 0 0 var(--foreground)}

.tp-chips{display:flex;flex-wrap:wrap;justify-content:center;gap:12px;margin:clamp(12px,2vh,18px) 0 0;padding:0;list-style:none}
.tp-chips li{
  display:inline-flex;align-items:center;gap:8px;padding:5px 13px;font-size:12px;font-weight:700;text-transform:uppercase;border-radius:999px;cursor:default;
  border:2px solid var(--foreground);background:var(--tp-fill);
  box-shadow:3px 3px 0 0 var(--foreground);
  transition:translate .18s cubic-bezier(.3,1.6,.5,1),rotate .18s cubic-bezier(.3,1.6,.5,1),box-shadow .18s,background .18s,color .18s;
}
.tp-chips li:nth-child(odd){rotate:-2deg}
.tp-chips li:nth-child(even){rotate:1.8deg}
.tp-chips li:hover{rotate:0deg;translate:-2px -4px;box-shadow:6px 7px 0 0 var(--foreground);background:var(--brand);color:#000}
.tp-chips li:active{translate:2px 2px;box-shadow:1px 1px 0 0 var(--foreground)}

/* sticker strip */
.tp-hero>.tp-stripe{
  position:absolute;left:50%;bottom:-19px;z-index:3;width:min(520px,78%);overflow:hidden;white-space:nowrap;
  transform:translateX(-50%) rotate(-1.6deg);
  background:var(--brand);color:#000;border:3px solid var(--foreground);border-radius:6px;
  box-shadow:4px 4px 0 0 var(--foreground);
  font:800 12px/1 var(--font-mono),ui-monospace,monospace;letter-spacing:.14em;padding:7px 0;
  pointer-events:none;
}
.tp-stripe-track{display:inline-flex;animation:tp-marquee 16s linear infinite}
.tp-stripe-track span{padding-right:0}
@keyframes tp-marquee{to{transform:translateX(-50%)}}

.tp-root :is(.tp-tab,.tp-pick,.tp-link,.tp-mic,.tp-go,.tp-ex):focus-visible{outline:3px solid var(--brand);outline-offset:3px}

@media (max-width:600px){
  .tp-main{padding:28px 14px 52px}
  .tp-hero{padding:16px 14px 28px;border-radius:24px;box-shadow:4px 4px 0 0 var(--tp-edge)}
  .tp-row{flex-direction:column;align-items:stretch}
  .tp-actions{justify-content:flex-end}
  .tp-top{justify-content:flex-start}
  .tp-pane{min-height:132px}
  .tp-examples-lbl{display:none}
}
@media (max-height:780px){.tp-badge{font-size:12px;padding:3px 12px}}
@media (max-height:660px){.tp-sub{display:none}}
@media (prefers-reduced-motion:reduce){
  .tp-pulse,.tp-blob,.tp-stripe-track,.tp-go.ready,.tp-help.live,.tp-ghost-caret,.tp-spin{animation:none}
  .tp-input,.tp-chips li,.tp-go,.tp-pick,.tp-url,.tp-mic,.tp-ex{transition:none}
}
`;