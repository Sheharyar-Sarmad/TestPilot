# Data Security

Covers secrets management, ephemeral storage, logging, and data lifecycle.

## Secrets Management

### ✅ `.env` File
- **Location:** `backend/.env` (gitignored)
- **Template:** `backend/.env.example` (committed, no real values)
- **Loading:** `pydantic-settings` reads it at startup into a cached `Settings` object
- **Type safety:** Secrets use `SecretStr` to prevent accidental `print()`

### ✅ Never Logged
- `Settings` objects are never dumped to logs.
- `SecretStr.get_secret_value()` is the only way to read the real value — called sparingly.
- Exception handlers return generic messages.

### ✅ Production Guards
**File:** `security/settings.py`

The `validate_secret_key` validator enforces:
- `SECRET_KEY` ≥ 32 chars in production
- `SECRET_KEY` is not a known placeholder (`supersecret`, `changeme`, `development`)

### ⚠️ Not Yet Implemented
- **Secret rotation:** No mechanism to rotate `SECRET_KEY` or `GROQ_API_KEY` without restarting.
- **Vault integration:** No HashiCorp Vault / AWS Secrets Manager support.

## Job Data Lifecycle

### ✅ Ephemeral Storage
**File:** `app/services/job_store.py`

Every job is stored in a Redis HASH with a **TTL** (`PROCESS_TTL_SECONDS`, default 1 hour). After TTL, Redis deletes it automatically.

### What's Stored
| Field | Content | Sensitivity |
|---|---|---|
| `source_code` | User's submitted code | High — proprietary |
| `filename` | Original filename | Low |
| `language` | Detected/provided language | None |
| `error_message` | User's error text | Low-Medium |
| `expected_behavior` | User's description | Low |
| `test_code` | User's tests | High |
| `result` | Full AI output (diagnosis, fix, diff) | High |

### ✅ Automatic Cleanup
- TTL expiry handles the "forgotten" case.
- `DELETE /api/v1/processes/{id}` allows immediate cleanup.

### ⚠️ Not Yet Implemented
- **Right to be forgotten:** No way to purge all jobs by IP.
- **Encryption at rest:** Redis Cloud offers encryption; self-hosted Redis does not by default.
- **Backup policy:** Ephemeral by design — no backups.

## Logging

### ✅ What We Log
- HTTP method, path, status code
- Request ID for correlation
- Node names as the graph progresses
- Error types (not stack traces to users)

### ✅ What We Don't Log
- Request bodies (source code, tests)
- Response bodies (AI output)
- Secrets
- Full stack traces to clients

### ⚠️ Not Yet Implemented
- **Structured logging:** `structlog` is in the spec but not wired up.
- **Log retention policy:** No configured rotation or retention.
- **PII scrubbing:** If users put PII in code, it might appear in logs.

## AI Provider Data Flow

### ✅ Documented
- Source code IS sent to Groq for analysis.
- The UI should display: *"Your code is sent to Groq for AI analysis."*

### ✅ LangSmith Off by Default
- `LANGCHAIN_TRACING_V2=false` in `.env.example`
- If enabled, prompts and responses are sent to LangSmith.
- Operators must explicitly opt in.

### ⚠️ Not Yet Implemented
- **Data residency:** No way to choose Groq region.
- **Anonymization:** No scrubbing of identifiers before sending to Groq.

## Recommended Practices for Operators

1. **Use TLS to Redis.** Redis Cloud uses `rediss://` (double-s). Self-hosted must enable TLS.
2. **Restrict Redis access.** Use a firewall, VPC, or Redis ACLs.
3. **Deploy behind HTTPS.** Never expose the FastAPI port directly.
4. **Rotate `GROQ_API_KEY` periodically.**
5. **Monitor for anomalies** in rate-limit metrics.
6. **Set up log aggregation** with retention limits.
7. **Never run with `APP_ENV=development` in production.**

## Compliance Notes

- **GDPR:** Since no accounts exist, "personal data" only exists if users include it in code. TTL ensures deletion.
- **HIPAA / SOC 2:** Not certified. Do not use for regulated data.
- **Data residency:** Single-region deployment.

## Checklist

- [ ] `.env` is in `.gitignore`
- [ ] `.env.example` has no real secrets
- [ ] Redis uses TLS (`rediss://`)
- [ ] Redis has authentication (password)
- [ ] `SECRET_KEY` is 32+ random chars
- [ ] Production is behind HTTPS
- [ ] LangSmith disabled unless intentionally enabled
- [ ] Log aggregation configured with retention