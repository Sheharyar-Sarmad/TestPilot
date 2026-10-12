"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { api } from "@/lib/api";
import {
  loadRateLimit,
  saveRateLimit,
  secondsUntilReset,
  type RateLimitInfo,
} from "@/lib/rate-limit";

type Ctx = {
  info: RateLimitInfo | null;
  refresh: () => Promise<void>;
  setInfo: (info: RateLimitInfo) => void;
  secondsToReset: number;
};

const RateLimitContext = createContext<Ctx | null>(null);

export function RateLimitProvider({ children }: { children: ReactNode }) {
  const [info, setInfoState] = useState<RateLimitInfo | null>(null);
  const [secondsToReset, setSecondsToReset] = useState(0);

  useEffect(() => {
    const cached = loadRateLimit();
    if (cached) setInfoState(cached);
    void refresh();
  }, []);

  const setInfo = useCallback((next: RateLimitInfo) => {
    setInfoState(next);
    saveRateLimit(next);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await api.getRateLimit();
      setInfo(res);
    } catch {
      /* silent — badge stays stale */
    }
  }, [setInfo]);

  useEffect(() => {
    if (!info) return;
    const tick = () => setSecondsToReset(secondsUntilReset(info));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [info]);

  return (
    <RateLimitContext.Provider value={{ info, refresh, setInfo, secondsToReset }}>
      {children}
    </RateLimitContext.Provider>
  );
}

export function useRateLimit(): Ctx {
  const ctx = useContext(RateLimitContext);
  if (!ctx) throw new Error("useRateLimit must be used inside RateLimitProvider");
  return ctx;
}