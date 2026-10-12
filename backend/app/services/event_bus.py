# app/services/event_bus.py
"""
Redis Pub/Sub wrapper for streaming graph events to SSE clients.

Publisher: process_worker.py pushes every graph event to `events:{process_id}`.
Subscriber: routes/processes.py opens a pubsub connection and forwards frames.
"""
from __future__ import annotations

import asyncio
import json
from typing import AsyncIterator

from config.redis_config import RedisManager


class EventBus:
    @staticmethod
    def _channel(process_id: str) -> str:
        return f"events:{process_id}"

    # publish
    @classmethod
    async def publish(cls, process_id: str, event: dict) -> None:
        redis = RedisManager.get_client()
        await redis.publish(cls._channel(process_id), json.dumps(event, default=str))

    @classmethod
    async def publish_final(cls, process_id: str, payload: dict) -> None:
        await cls.publish(process_id, {"event": "final", **payload})

    # subscribe
    @classmethod
    async def subscribe(
        cls, process_id: str, idle_timeout: float = 300.0
    ) -> AsyncIterator[dict]:
        """
        Yields events as dicts. Terminates on 'final' event or idle timeout.
        """
        redis = RedisManager.get_client()
        pubsub = redis.pubsub()
        await pubsub.subscribe(cls._channel(process_id))

        try:
            while True:
                try:
                    msg = await asyncio.wait_for(
                        pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0),
                        timeout=idle_timeout,
                    )
                except asyncio.TimeoutError:
                    yield {"event": "status", "message": "stream timed out"}
                    return

                if msg is None:
                    continue
                if msg.get("type") != "message":
                    continue

                try:
                    data = json.loads(msg["data"])
                except (TypeError, json.JSONDecodeError):
                    continue

                yield data
                if data.get("event") == "final":
                    return
        finally:
            try:
                await pubsub.unsubscribe(cls._channel(process_id))
                await pubsub.close()
            except Exception:
                pass