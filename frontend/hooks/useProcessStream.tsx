"use client";

import { useEffect, useRef, useState } from "react";

import { api } from "@/lib/api";
import type { StreamEvent, Verdict } from "@/lib/types";

export interface StreamState {
  node: string | null;
  label: string | null;
  status: string | null;
  tokens: string;
  message: string | null;
  done: boolean;
  finalStatus: "completed" | "failed" | null;
  verdict: Verdict | null;
  error: string | null;
  completedNodes: string[];
}

const INITIAL: StreamState = {
  node: null,
  label: null,
  status: null,
  tokens: "",
  message: null,
  done: false,
  finalStatus: null,
  verdict: null,
  error: null,
  completedNodes: [],
};

export function useProcessStream(processId: string) {
  const [state, setState] = useState<StreamState>(INITIAL);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!processId) return;
    const es = new EventSource(api.streamUrl(processId));
    esRef.current = es;

    es.onmessage = (e) => {
      let evt: StreamEvent;
      try {
        evt = JSON.parse(e.data);
      } catch {
        return;
      }

      setState((prev) => {
        switch (evt.event) {
          case "node_start":
            return { ...prev, node: evt.node ?? null, label: evt.label ?? null };

          case "node_end":
            return {
              ...prev,
              completedNodes: evt.node
                ? Array.from(new Set([...prev.completedNodes, evt.node]))
                : prev.completedNodes,
              status: evt.status ?? prev.status,
            };

          case "token":
            return { ...prev, tokens: prev.tokens + (evt.content ?? "") };

          case "status":
            return { ...prev, message: evt.message ?? prev.message };

          case "final":
            return {
              ...prev,
              done: true,
              finalStatus:
                (evt.status as "completed" | "failed") ?? "completed",
              verdict: (evt.state?.verdict as Verdict) ?? null,
            };

          default:
            return prev;
        }
      });

      if (evt.event === "final") es.close();
    };

    es.onerror = () => {
      setState((p) => (p.done ? p : { ...p, error: "Stream disconnected." }));
      es.close();
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [processId]);

  return state;
}