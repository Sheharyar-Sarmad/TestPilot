"use client";

import FlowCanvas, { makeEdge, makeNode } from "./FlowCanvas";

const nodes = [
  makeNode("client", 0, 130, { title: "CLIENT", sub: "Next.js 15 · Monaco Editor" }),
  makeNode("api", 330, 130, { title: "API", sub: "FastAPI · Uvicorn", accent: true }),
  makeNode("graph", 660, 130, { title: "AGENTS", sub: "LangGraph pipeline", accent: true }),
  makeNode("sandbox", 990, 130, { title: "SANDBOX", sub: "Isolated test runner" }),
  makeNode("redis", 495, 350, { title: "REDIS", sub: "JobStore (1h TTL) + EventBus" }),
];

const edges = [
  makeEdge({ id: "e1", source: "client", target: "api", sourceHandle: "right-s", targetHandle: "left-t", label: "POST /jobs" }),
  makeEdge({ id: "e2", source: "api", target: "graph", sourceHandle: "right-s", targetHandle: "left-t", label: "start graph" }),
  makeEdge({ id: "e3", source: "graph", target: "sandbox", sourceHandle: "right-s", targetHandle: "left-t", label: "run tests" }),
  makeEdge({ id: "e4", source: "api", target: "redis", sourceHandle: "bottom-s", targetHandle: "left-t", label: "job + subscribe", both: true }),
  makeEdge({ id: "e5", source: "graph", target: "redis", sourceHandle: "bottom-s", targetHandle: "right-t", label: "state + events" }),
  makeEdge({ id: "e6", source: "api", target: "client", sourceHandle: "top-s", targetHandle: "top-t", label: "SSE stream" }),
];

export default function ArchitectureDiagramSection() {
  return (
    <section>
      <h2 className="text-center font-mono text-xl font-black uppercase tracking-widest sm:text-2xl">
        [ ARCHITECTURE DIAGRAM: REQUEST FLOW ]
      </h2>
      <p className="mx-auto mt-4 max-w-2xl text-center font-mono text-sm text-muted-foreground">
        The client submits code, the API creates a job in Redis, LangGraph agents work on it, and every step streams
        back to the browser over Server-Sent Events.
      </p>
      <div className="mt-10">
        <FlowCanvas nodes={nodes} edges={edges} className="h-[420px] sm:h-[480px]" />
      </div>
    </section>
  );
}