"use client";

import { Fragment } from "react";
import {
  ReactFlow,
  Background,
  Handle,
  Position,
  MarkerType,
  type Node,
  type Edge,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useTheme } from "next-themes";

export type BrutalNodeData = { title: string; sub?: string; accent?: boolean; [key: string]: unknown };

const SIDES = [
  ["left", Position.Left],
  ["right", Position.Right],
  ["top", Position.Top],
  ["bottom", Position.Bottom],
] as const;

/** Brutalist node. Every side has an invisible source (`<side>-s`) and target (`<side>-t`) handle. */
function BrutalNode({ data }: NodeProps) {
  const d = data as BrutalNodeData;
  return (
    <div
      className={`w-[190px] border-4 px-3 py-4 text-center font-mono uppercase tracking-widest shadow-[6px_6px_0px_0px_var(--brand)] ${
        d.accent ? "border-brand bg-brand/15" : "border-foreground bg-background"
      }`}
    >
      {SIDES.map(([side, pos]) => (
        <Fragment key={side}>
          <Handle id={`${side}-s`} type="source" position={pos} isConnectable={false} style={{ opacity: 0 }} />
          <Handle id={`${side}-t`} type="target" position={pos} isConnectable={false} style={{ opacity: 0 }} />
        </Fragment>
      ))}
      <div className="text-xs font-bold text-foreground">{d.title}</div>
      {d.sub && <div className="mt-1 text-[10px] normal-case tracking-wider text-muted-foreground">{d.sub}</div>}
    </div>
  );
}

const nodeTypes = { brutal: BrutalNode };

export function makeNode(id: string, x: number, y: number, data: BrutalNodeData): Node {
  return { id, type: "brutal", position: { x, y }, data };
}

export function makeEdge(o: {
  id: string;
  source: string;
  target: string;
  sourceHandle: string;
  targetHandle: string;
  label?: string;
  danger?: boolean;
  both?: boolean;
}): Edge {
  const color = o.danger ? "#ef4444" : "#22d3ee";
  const marker = { type: MarkerType.ArrowClosed, color };
  return {
    id: o.id,
    source: o.source,
    target: o.target,
    sourceHandle: o.sourceHandle,
    targetHandle: o.targetHandle,
    type: "smoothstep",
    animated: true,
    label: o.label,
    markerEnd: marker,
    markerStart: o.both ? marker : undefined,
    style: {
      stroke: o.danger ? "var(--destructive)" : "var(--brand)",
      strokeWidth: 3,
      ...(o.danger ? { strokeDasharray: "6 4" } : {}),
    },
    labelStyle: {
      fill: "var(--foreground)",
      fontFamily: "var(--font-jetbrains-mono), monospace",
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: "0.08em",
    },
    labelBgStyle: { fill: "var(--background)" },
    labelBgPadding: [8, 5],
  };
}

export default function FlowCanvas({
  nodes,
  edges,
  className = "h-[360px]",
}: {
  nodes: Node[];
  edges: Edge[];
  className?: string;
}) {
  const { resolvedTheme } = useTheme();
  return (
    <div
      className={`border-4 border-foreground bg-gradient-to-br from-cyan-500/10 to-purple-500/10 backdrop-blur-2xl ${className}`}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.12 }}
        minZoom={0.1}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag={false}
        panOnScroll={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        preventScrolling={false}
        colorMode={resolvedTheme === "light" ? "light" : "dark"}
        style={{ background: "transparent" }}
      >
        <Background gap={24} color="rgba(34,211,238,0.25)" />
      </ReactFlow>
    </div>
  );
}