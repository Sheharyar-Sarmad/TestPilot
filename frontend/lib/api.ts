// ============================================================================
// TestPilot AI — API client
// Axios instance + typed methods for every backend endpoint.
// ============================================================================

import axios, { AxiosError, AxiosInstance } from "axios";

import {
  ApiError,
  ApiErrorBody,
  CreateProcessRequest,
  CreateProcessResponse,
  HealthResponse,
  ProcessResultResponse,
  ProcessStatusResponse,
} from "@/lib/types";

import { extractFromResponse, saveRateLimit, type RateLimitInfo } from "@/lib/rate-limit";

// ------------------------------------------------------------------ config

const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:8000";

const DEFAULT_TIMEOUT_MS = 30_000;

// ------------------------------------------------------------------ client

export const client: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: DEFAULT_TIMEOUT_MS,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// ---------------------------------------------------------- interceptors

client.interceptors.response.use(
  (response) => {
    // Pick up rate-limit headers from every response and cache them
    const info = extractFromResponse(response);
    if (info) saveRateLimit(info);
    return response;
  },
  (error: AxiosError<ApiErrorBody>) => {
    if (!error.response) {
      const message =
        error.code === "ECONNABORTED"
          ? "Request timed out. The backend may be overloaded."
          : "Cannot reach the server. Is the backend running?";
      throw new ApiError(0, message, null);
    }

    const { status, data } = error.response;
    const body: ApiErrorBody | null =
      data && typeof data === "object" && "error" in data
        ? (data as ApiErrorBody)
        : null;

    const message =
      body?.detail && typeof body.detail === "string"
        ? body.detail
        : `Request failed with status ${status}`;

    throw new ApiError(status, message, body);
  }
);

// ----------------------------------------------------------------- helpers

async function request<T>(fn: () => Promise<{ data: T }>): Promise<T> {
  const { data } = await fn();
  return data;
}

// ============================================================================
// Public API surface
// ============================================================================

export const api = {
  // ---------------------------------------------------------------- health
  health(): Promise<HealthResponse> {
    return request(() => client.get<HealthResponse>("/health"));
  },

  // ------------------------------------------------------------ rate limit
  async getRateLimit(): Promise<RateLimitInfo> {
    const raw = await request<{
      limit: number;
      remaining: number;
      reset_at: number;
      window: number;
    }>(() => client.get("/api/v1/rate-limit/status"));

    return {
      limit: raw.limit,
      remaining: raw.remaining,
      resetAt: raw.reset_at,
      window: raw.window,
    };
  },

  // ------------------------------------------------------------- processes
  async createProcess(
    payload: CreateProcessRequest | FormData
  ): Promise<CreateProcessResponse> {
    if (payload instanceof FormData) {
      return request(() =>
        client.post<CreateProcessResponse>("/api/v1/processes", payload, {
          headers: { "Content-Type": "multipart/form-data" },
          timeout: 60_000,
        })
      );
    }

    return request(() =>
      client.post<CreateProcessResponse>("/api/v1/processes", payload)
    );
  },

  getStatus(processId: string): Promise<ProcessStatusResponse> {
    return request(() =>
      client.get<ProcessStatusResponse>(`/api/v1/processes/${processId}`)
    );
  },

  getResult(processId: string): Promise<ProcessResultResponse> {
    return request(() =>
      client.get<ProcessResultResponse>(
        `/api/v1/processes/${processId}/result`
      )
    );
  },

  async deleteProcess(processId: string): Promise<void> {
    await client.delete(`/api/v1/processes/${processId}`);
  },

  // -------------------------------------------------------------- streaming
  streamUrl(processId: string): string {
    return `${API_URL}/api/v1/processes/${processId}/stream`;
  },
};

// --------------------------------------------------------------- re-exports

export { API_URL, ApiError };
export type { RateLimitInfo };