# app/services/job_store.py
"""
Redis-backed ephemeral job store.

Job layout (Redis HASH, key = `job:{process_id}`, TTL = PROCESS_TTL_SECONDS):
    status            "queued" | "processing" | "testing" | "completed" | "failed"
    current_node      name of the node currently executing
    language          detected/provided language
    language_source   "explicit" | "extension" | "llm"
    filename
    source_code       (never persisted longer than TTL)
    error_message
    expected_behavior
    test_code
    result            JSON-encoded final payload
    errors            JSON-encoded list of error strings
    created_at        ISO timestamp
    updated_at        ISO timestamp
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, Optional

from config.redis_config import RedisManager
from security.settings import get_settings

settings = get_settings()

# Fields persisted as JSON (all others are plain strings)
_JSON_FIELDS = {"result", "errors", "affected_lines", "risks"}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class JobStore:
    """Thin async wrapper around a single Redis hash per job."""

    @staticmethod
    def _key(process_id: str) -> str:
        return f"job:{process_id}"

    # create
    @classmethod
    async def create(cls, process_id: str, data: dict[str, Any]) -> None:
        redis = RedisManager.get_client()
        payload: dict[str, str] = {}
        for k, v in data.items():
            payload[k] = json.dumps(v) if k in _JSON_FIELDS else ("" if v is None else str(v))
        payload["status"] = data.get("status", "queued")
        payload["created_at"] = _now_iso()
        payload["updated_at"] = _now_iso()

        key = cls._key(process_id)
        async with redis.pipeline(transaction=True) as pipe:
            pipe.hset(key, mapping=payload)
            pipe.expire(key, settings.PROCESS_TTL_SECONDS)
            await pipe.execute()

    # read one
    @classmethod
    async def get(cls, process_id: str) -> Optional[dict[str, Any]]:
        redis = RedisManager.get_client()
        raw = await redis.hgetall(cls._key(process_id))
        if not raw:
            return None
        return cls._decode(raw)

    # ------------------------------------------------------------------- update
    @classmethod
    async def update(cls, process_id: str, updates: dict[str, Any]) -> None:
        redis = RedisManager.get_client()
        key = cls._key(process_id)

        # Preserve remaining TTL so an update doesn't reset the clock
        ttl = await redis.ttl(key)
        if ttl <= 0:
            return  # expired or missing

        payload: dict[str, str] = {}
        for k, v in updates.items():
            payload[k] = json.dumps(v) if k in _JSON_FIELDS else ("" if v is None else str(v))
        payload["updated_at"] = _now_iso()

        async with redis.pipeline(transaction=True) as pipe:
            pipe.hset(key, mapping=payload)
            pipe.expire(key, ttl)
            await pipe.execute()

    # ------------------------------------------------------------------- delete
    @classmethod
    async def delete(cls, process_id: str) -> bool:
        redis = RedisManager.get_client()
        return bool(await redis.delete(cls._key(process_id)))

    # ------------------------------------------------------------------ helper
    @staticmethod
    def _decode(raw: dict[str, str]) -> dict[str, Any]:
        out: dict[str, Any] = {}
        for k, v in raw.items():
            if k in _JSON_FIELDS:
                try:
                    out[k] = json.loads(v) if v else None
                except json.JSONDecodeError:
                    out[k] = None
            else:
                out[k] = v or None
        # Coerce numeric fields
        if "repair_attempts" in out and out["repair_attempts"] is not None:
            try:
                out["repair_attempts"] = int(out["repair_attempts"])
            except (TypeError, ValueError):
                out["repair_attempts"] = 0
        return out