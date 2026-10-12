// ============================================================================
// API types — mirror the backend Pydantic schemas in app/schemas/
// ============================================================================

export type ProcessStatus =
  | "queued"
  | "processing"
  | "testing"
  | "completed"
  | "failed"
  | "expired";

export type Verdict = "passed" | "failed" | "partial" | "skipped";

export type CheckStatus = "passed" | "failed" | "skipped" | "error" | "timeout";

// --------------------------------------------------------------- requests

export interface CreateProcessRequest {
  source_code?: string;
  github_url?: string;
  filename?: string;
  language?: string;
  error_message?: string;
  expected_behavior?: string;
  test_code?: string;
}

// -------------------------------------------------------------- responses

export interface CreateProcessResponse {
  process_id: string;
  status: "queued";
  stream_url: string;
}

export interface ProcessStatusResponse {
  process_id: string;
  status: ProcessStatus;
  current_node?: string | null;
  progress?: number | null;
  errors: string[];
}

export interface VerificationResult {
  check: string;
  status: CheckStatus;
  output: string;
}

export interface VerificationState {
  source_code: string;
  test_code: string;
  language: string;
  checks_to_run: string[];
  results: VerificationResult[];
  final_verdict: Verdict | null;
}

export interface ProcessResultResponse {
  process_id: string;
  status: "completed" | "failed";
  language?: string | null;
  language_source?: string | null;
  filename?: string | null;
  root_cause?: string | null;
  affected_lines: number[];
  proposed_fix?: string | null;
  explanation?: string | null;
  diff?: string | null;
  risks: string[];
  verification?: VerificationState | null;
  verdict?: Verdict | null;
  errors: string[];
}

export interface HealthResponse {
  status: "ok" | "degraded";
  checks: Record<string, string>;
}

// ---------------------------------------------------------- SSE events

export type StreamEventType =
  | "node_start"
  | "node_end"
  | "token"
  | "status"
  | "final";

export interface StreamEvent {
  event: StreamEventType;
  node?: string;
  label?: string;
  status?: string;
  message?: string;
  content?: string;
  state?: Record<string, unknown>;
}

// --------------------------------------------------------------- errors

export interface ApiErrorBody {
  error: string;
  detail: string | unknown;
}

export class ApiError extends Error {
  status: number;
  body: ApiErrorBody | null;

  constructor(status: number, message: string, body: ApiErrorBody | null = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}