"use client";

import FlowCanvas, { makeEdge, makeNode } from "./FlowCanvas";

const STEPS = [
  { id: "input", title: "INPUT", sub: "Code + failing test" },
  { id: "diagnose", title: "DIAGNOSE", sub: "Root-cause agent" },
  { id: "fix", title: "GENERATE FIX", sub: "Patch agent" },
  { id: "verify", title: "SANDBOX VERIFY", sub: "Run tests in isolation" },
  { id: "final", title: "FINALIZE", sub: "Verdict + diff" },
];

const nodes = STEPS.map((s, i) => makeNode(s.id, i * 250, 0, { title: s.title, sub: s.sub, accent: s.id === "verify" }));

const edges = [
  ...STEPS.slice(0, -1).map((s, i) =>
    makeEdge({
      id: `e-${s.id}`,
      source: s.id,
      target: STEPS[i + 1].id,
      sourceHandle: "right-s",
      targetHandle: "left-t",
    })
  ),
  makeEdge({
    id: "e-retry",
    source: "verify",
    target: "fix",
    sourceHandle: "bottom-s",
    targetHandle: "bottom-t",
    label: "RETRY: if tests fail",
    danger: true,
  }),
];

export default function WorkflowSection() {
  return (
    <section>
      <h2 className="text-center font-mono text-xl font-black uppercase tracking-widest sm:text-2xl">
        [ SYSTEM ARCHITECTURE: AGENTIC WORKFLOW ]
      </h2>
      <div className="mt-12">
        <FlowCanvas nodes={nodes} edges={edges} className="h-[340px] sm:h-[380px]" />
      </div>
    </section>
  );
}