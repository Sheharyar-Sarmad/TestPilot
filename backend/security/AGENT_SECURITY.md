# Agent Security

Covers the LangGraph workflow in `agent/` — how the LLM is constrained and how AI outputs are validated.

## Implemented

### Structured Outputs
Every LLM call in `agent/nodes/` uses `llm.with_structured_output(Schema)` with a Pydantic model:
- `Diagnosis` — in `agent/nodes/_shared.py`, used by `diagnose_bug.py`
- `Fix` — in `agent/nodes/_shared.py`, used by `generate_fix.py`
- `LanguageGuess` — in `agent/nodes/detect_language.py`

The LLM returns JSON matching the schema. Malformed JSON triggers a LangChain retry (up to `max_retries`).

### System Prompts
Each node defines a fixed system message. User input is only inserted into the human message template. The system prompt is never populated with user input.

### Delimited User Input
User code is wrapped in triple backticks inside the prompt.

### No Tool Calling
The LLM does not call functions, execute code, or access the filesystem. It only returns text.

### Bounded Repair Loop
`agent/nodes/routing.py` limits retries via `MAX_REPAIR_ATTEMPTS` (from `.env`, default 2).

### Fallback Model
`agent/llm.py` configures a primary and fallback model. If the primary fails, the fallback is used.

### Redis LLM Cache
`agent/llm.py` initializes a Redis-backed cache via `langchain_community.cache.RedisCache`. Identical prompts return cached responses. If Redis is unavailable, the cache initialization fails silently and the app continues without caching.

### LangSmith Off By Default
`LANGCHAIN_TRACING_V2=false` in `.env.example`. Tracing requires explicit opt-in.

## Threats and Mitigations

### Prompt Injection via Source Code
**Attack:** User submits code containing instructions like "ignore previous instructions."

**Mitigation:**
- Structured outputs restrict the response shape.
- User code is delimited with triple backticks.
- The LLM has no tool access.

**Residual risk:** A misleading diagnosis could be produced. The user reviews the diff manually before applying.

### Malicious Fix Output
**Attack:** The LLM returns a fix that introduces a vulnerability.

**Mitigation:**
- The user must explicitly download and apply the fix.
- The diff is displayed for review.
- Verification runs the fixed code in the sandbox (when implemented).

**Residual risk:** A fix that passes syntax and tests may still contain issues a reviewer would catch.

### Cost Exhaustion
**Attack:** Repeated submissions to consume Groq quota.

**Mitigation:**
- Rate limiting in `app/services/rate_limit.py`.
- Global cap via `GLOBAL_LIMIT`.
- Redis cache reduces duplicate calls.
- `MAX_REPAIR_ATTEMPTS` bounds per-job LLM calls.

### Data Sent to Groq
Source code, error messages, and expected behavior are sent to Groq for analysis. This is documented in the UI. LangSmith tracing is off unless enabled.

## Not Implemented

- Input sanitization for prompt injection markers.
- Post-LLM output scanning for dangerous code patterns.
- Model version pinning to a dated release.
- Per-job LLM call cap in Redis.
- Semantic deduplication beyond Redis cache.

## Configuration

| Variable | Default |
|---|---|
| `GROQ_MODEL` | `openai/gpt-oss-120b` |
| `GROQ_FALLBACK_MODEL` | `llama-3.1-8b-instant` |
| `MAX_REPAIR_ATTEMPTS` | `2` |
| `LANGCHAIN_TRACING_V2` | `false` |