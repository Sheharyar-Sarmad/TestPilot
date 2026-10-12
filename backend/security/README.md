# Security Folder

This folder contains the security configuration and documentation for TestPilot AI.

## Contents

| File | Purpose |
|---|---|
| `settings.py` | Pydantic Settings — loads `.env`, validates secrets, defines security-related config |
| `README.md` | This file — overview and index |
| `THREAT_MODEL.md` | What we're defending against and why |
| `FASTAPI_SECURITY.md` | API layer: rate limiting, input validation, CORS, error handling |
| `AGENT_SECURITY.md` | LLM/AI layer: prompt injection, structured output, model trust |
| `SANDBOX_SECURITY.md` | Isolated execution of untrusted code |
| `DATA_SECURITY.md` | Secrets, logs, ephemeral storage, TTLs |

## Design Principles

1. **Never trust user input.** Source code, filenames, error messages, tests — all untrusted.
2. **Never execute untrusted code in-process.** All execution happens in an isolated sandbox.
3. **No permanent storage.** Jobs expire automatically; source code is not kept beyond TTL.
4. **Defense in depth.** Multiple independent layers (rate limit → validation → sandbox → cleanup).
5. **Honest reporting.** Never claim a check passed unless it actually ran.

## Quick Reference

| Threat | Mitigation | File |
|---|---|---|
| Rate limit abuse | Redis INCR per IP + global | `app/services/rate_limit.py` |
| SSRF via GitHub URL | Domain whitelist + private IP block | `app/services/source_ingestion.py` |
| Oversized payloads | `MAX_SOURCE_FILE_BYTES` cap | `app/routes/processes.py` |
| RCE from user tests | Docker sandbox, no network, non-root | `app/workers/sandbox_runner.py` |
| Prompt injection | Structured outputs, system prompts | `agent/nodes/*` |
| Secret leakage | Pydantic `SecretStr`, `.gitignore` | `security/settings.py` |
| Orphaned data | Redis TTL | `app/services/job_store.py` |