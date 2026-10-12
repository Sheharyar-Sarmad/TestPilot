# FastAPI Layer Security

Covers the HTTP boundary of TestPilot AI — everything from the moment a request hits Uvicorn to the moment a response is sent back.

## Implemented Controls

### ✅ Rate Limiting
**File:** `app/services/rate_limit.py`

- **Per-IP:** 10 requests / 60 seconds (configurable via `PER_IP_LIMIT`, `PER_IP_WINDOW_SECONDS`)
- **Global:** 1000 requests / hour (configurable via `GLOBAL_LIMIT`, `GLOBAL_WINDOW_SECONDS`)
- **Storage:** Redis `INCR` + `EXPIRE` (fixed window)
- **Applied to:** `POST /api/v1/processes`, `GET /api/v1/processes/{id}/stream`
- **Returns:** `429 Too Many Requests` when exceeded
- **IP resolution:** Respects `X-Forwarded-For` when behind a proxy

### ✅ Input Size Limits
**File:** `app/routes/processes.py`

- `MAX_SOURCE_FILE_BYTES` (default: 1 MB) enforced on pasted code, uploaded files, and GitHub-fetched content.
- Returns `413 Payload Too Large` when exceeded.
- Checks both `Content-Length` header and actual decoded size.

### ✅ Pydantic Validation
**File:** `app/schemas/process.py`

- All request bodies validated against typed schemas.
- `max_length` on string fields prevents unbounded strings.
- `model_validator` enforces exactly-one-source rule for JSON requests.
- Invalid requests → `422 Unprocessable Entity` with structured errors.

### ✅ CORS Policy
**File:** `app/main.py`

- Development: `*` allowed (permissive for local work).
- Production: only `FRONTEND_URL` from env is allowed.
- Credentials disabled (`allow_credentials=False`) — no cookies, no auth headers needed.

### ✅ Consistent Error Responses
**File:** `app/main.py`

- Single error shape: `{"error": "...", "detail": "..."}`.
- Unhandled exceptions return generic message (no stack traces leaked).
- Validation errors return structured Pydantic errors (field names, types — safe to expose).

### ✅ Request ID Propagation
**File:** `app/main.py` (`RequestIDMiddleware`)

- Every response carries `X-Request-ID`.
- Enables log correlation without logging request bodies.

### ✅ SSRF Protection on GitHub URLs
**File:** `app/services/source_ingestion.py`

- Whitelist: `github.com`, `raw.githubusercontent.com`
- HTTPS-only scheme enforcement
- DNS resolution + private IP detection (`127.0.0.0/8`, `10.0.0.0/8`, `169.254.0.0/16`, etc.)
- Redirects disabled (`follow_redirects=False`)
- Timeout on all outbound requests

### ✅ No Authentication, By Design

- This is a free utility, not a SaaS.
- No user accounts, no cookies, no sessions.
- Job IDs (UUID4) act as capability tokens — unguessable, TTL-bound.
- **Future:** If auth is ever added, `SECRET_KEY` in `settings.py` is ready for signing JWTs.

## Not Yet Implemented

### ⚠️ Request Body Size Limit at the ASGI Layer

- Currently relies on Pydantic `max_length` and route-level checks.
- **Recommended:** Add `Content-Length` header check in middleware before the body is read, to reject huge payloads before buffering.

### ⚠️ Slowloris Protection

- Uvicorn's default timeouts help, but no explicit `--timeout-keep-alive` tuning.
- **Recommended:** Set `--timeout-keep-alive 5` and deploy behind a reverse proxy (nginx, Cloudflare) with its own slowloris protection.

### ⚠️ HTTP Security Headers

- No `Strict-Transport-Security`, `X-Content-Type-Options`, `Content-Security-Policy`.
- **Recommended:** Add a middleware to set these headers.

```python
from starlette.middleware.httpsredirect import HTTPSRedirectMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware
```

### ⚠️ SSE Stream Authentication

- The `/stream` endpoint is public within the rate limit.
- Anyone with the `process_id` can subscribe.
- **Mitigation:** IDs are UUID4 + TTL-bound. Acceptable for anonymous use.

### ⚠️ Reverse Proxy Configuration

In production, deploy behind nginx or Caddy with:

- TLS termination
- Request size limits
- Rate limiting as a second layer
- `X-Forwarded-For` trust boundaries

## Checklist Before Production

```text
□ APP_ENV=production in env (enables SECRET_KEY strength validation)
□ SECRET_KEY ≥ 32 chars, randomly generated
□ CORS allow_origins restricted to the actual frontend domain
□ Deployed behind TLS (HTTPS only)
□ Reverse proxy with request size limits
□ X-Forwarded-For trusted only from known proxies
□ Rate limits tuned for expected traffic
□ Structured logging configured (no request bodies logged)
```