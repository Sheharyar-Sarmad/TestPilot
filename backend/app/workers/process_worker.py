# app/workers/process_worker.py
"""
Background worker: consumes a queued job, runs the LangGraph workflow,
and streams events to Redis pub/sub so the SSE endpoint can forward them.
"""
from __future__ import annotations

import sys
import os

# ---------------------------------------------------------------------------
# BULLETPROOF PATH SETUP
# Ensure Python can find 'app', 'security', and 'agent' no matter where 
# the server is started from.
# ---------------------------------------------------------------------------
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.abspath(os.path.join(current_dir, '..', '..'))
agent_dir = os.path.join(backend_dir, 'agent')

if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)
if agent_dir not in sys.path:
    sys.path.insert(0, agent_dir)
# ---------------------------------------------------------------------------

import json
from app.services.job_store import JobStore
from app.services.event_bus import EventBus
from security.settings import get_settings

settings = get_settings()


async def run_repair_workflow(process_id: str) -> None:
    job = await JobStore.get(process_id)
    if not job:
        return  # expired or missing

    try:
        await JobStore.update(process_id, {"status": "processing"})

        # LAZY IMPORT: Moved inside the function so a crash in the graph 
        # doesn't crash the FastAPI server on startup.
        from agent.graph import graph

        initial_state = {
            "source_code": job["source_code"],
            "filename": job.get("filename") or "submitted.py",
            "language": job.get("language") or "",
            "error_message": job.get("error_message") or None,
            "expected_behavior": job.get("expected_behavior") or None,
            "test_code": job.get("test_code") or None,
            "repair_attempts": 0,
            "max_repair_attempts": settings.MAX_REPAIR_ATTEMPTS,
            "status": "processing",
            "errors": [],
            "functions": [],
            "classes": [],
            "imports": [],
            "affected_lines": [],
            "risks": [],
        }

        final_payload = None

        # astream with stream_mode="custom" forwards every _emit() call
        async for chunk in graph.astream(initial_state, stream_mode="custom"):
            # chunk is exactly what _emit() sent
            if not isinstance(chunk, dict):
                continue

            # Keep the frontend informed about the current node
            node = chunk.get("node")
            if node and chunk.get("event") == "node_start":
                await JobStore.update(process_id, {"current_node": node})
            if chunk.get("event") == "node_end" and chunk.get("status") == "testing":
                await JobStore.update(process_id, {"status": "testing"})

            if chunk.get("event") == "final":
                final_payload = chunk.get("state")
                final_status = chunk.get("status", "completed")
                await JobStore.update(process_id, {
                    "status": final_status,
                    "result": final_payload or {},
                })

            await EventBus.publish(process_id, chunk)

        # If the graph finished without emitting a 'final' event (edge case),
        # synthesize one from the last known state.
        if final_payload is None:
            await JobStore.update(process_id, {"status": "completed"})
            await EventBus.publish_final(process_id, {
                "status": "completed",
                "state": {},
            })

    except Exception as e:
        err_msg = f"worker failure: {type(e).__name__}: {e}"
        await JobStore.update(process_id, {
            "status": "failed",
            "errors": [err_msg],
        })
        await EventBus.publish(process_id, {
            "event": "final",
            "status": "failed",
            "state": {"errors": [err_msg]},
        })