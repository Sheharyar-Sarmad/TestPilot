"use client";

import { Gauge } from "lucide-react";
import { useRateLimit } from "@/hooks/useRateLimit";

export function RateLimitBadge() {
  const { info, secondsToReset } = useRateLimit();
  if (!info) return null;

  const pct = info.limit > 0 ? (info.remaining / info.limit) * 100 : 0;
  const low = pct <= 30;
  const critical = info.remaining === 0;

  const color = critical
    ? "text-red-500 border-red-500/40 bg-red-500/10"
    : low
    ? "text-amber-500 border-amber-500/40 bg-amber-500/10"
    : "text-muted-foreground border-border bg-foreground/5";

  return (
    <div
      className={`hidden sm:inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs border ${color}`}
      title={`Resets in ${secondsToReset}s`}
    >
      <Gauge className="w-3.5 h-3.5" />
      <span className="font-medium tabular-nums">
        {info.remaining}/{info.limit}
      </span>
    </div>
  );
}