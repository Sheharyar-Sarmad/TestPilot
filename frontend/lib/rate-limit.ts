// lib/rate-limit.ts
import type { AxiosResponse } from "axios";

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetAt: number; // unix seconds
  window: number;  // seconds
}

const STORAGE_KEY = "testpilot:rate-limit";

export function parseRateLimitHeaders(
  headers: Record<string, unknown>
): RateLimitInfo | null {
  const limit = Number(headers["x-ratelimit-limit"]);
  const remaining = Number(headers["x-ratelimit-remaining"]);
  const resetAt = Number(headers["x-ratelimit-reset"]);
  const window = Number(headers["x-ratelimit-window"]);

  if (!Number.isFinite(limit) || !Number.isFinite(remaining)) return null;

  return { limit, remaining, resetAt, window };
}

export function extractFromResponse(res: AxiosResponse): RateLimitInfo | null {
  const lower: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(res.headers)) lower[k.toLowerCase()] = v;
  return parseRateLimitHeaders(lower);
}

export function saveRateLimit(info: RateLimitInfo): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(info));
  } catch { /* ignore */ }
}

export function loadRateLimit(): RateLimitInfo | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as RateLimitInfo) : null;
  } catch {
    return null;
  }
}

export function secondsUntilReset(info: RateLimitInfo): number {
  return Math.max(0, info.resetAt - Math.floor(Date.now() / 1000));
}