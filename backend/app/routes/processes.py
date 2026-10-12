# backend/app/routes/processes.py
from __future__ import annotations

import uuid
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, HTTPException, Request
from pydantic import BaseModel, Field, model_validator

from app.services.event_bus import EventBus
from app.services.job_store import JobStore
from app.services.source_ingestion import GitHubFetcher, SourceIngestionError
from app.workers.process_worker import run_repair_workflow
from security.settings import get_settings

router = APIRouter(prefix="/api/v1/processes", tags=["processes"])
settings = get_settings()


# ------------------------------------------------------------------ schemas

class CreateProcessRequest(BaseModel):
    source_code: Optional[str] = Field(None, description="Raw source code")
    github_url: Optional[str] = Field(None, description="Public GitHub file URL")
    filename: Optional[str] = Field(None, max_length=255)
    language: Optional[str] = Field(None, max_length=32)
    error_message: Optional[str] = Field(None, max_length=10_000)
    expected_behavior: Optional[str] = Field(None, max_length=5_000)
    test_code: Optional[str] = Field(None, max_length=100_000)

    @model_validator(mode="after")
    def _one_source(self):
        provided = sum(bool(x) for x in (self.source_code, self.github_url))
        if provided == 0:
            raise ValueError("Provide source_code or github_url.")
        if provided > 1:
            raise ValueError("Provide only one source: source_code OR github_url.")
        return self


class CreateProcessResponse(BaseModel):
    process_id: str
    status: str
    stream_url: str


# ------------------------------------------------------------------ create

@router.post("", response_model=CreateProcessResponse, status_code=201)
async def create_process(
    payload: CreateProcessRequest,
    background: BackgroundTasks,
):
    # ---- resolve source_code (fetch GitHub if needed) ----
    source_code = payload.source_code
    filename = payload.filename or "submitted.py"

    if payload.github_url:
        try:
            source_code = await GitHubFetcher.fetch_file(payload.github_url)
        except SourceIngestionError as e:
            raise HTTPException(status_code=400, detail=str(e))
        filename = payload.github_url.rstrip("/").split("/")[-1] or filename

    if not source_code or not source_code.strip():
        raise HTTPException(status_code=400, detail="Source code is empty.")

    if len(source_code.encode("utf-8")) > settings.MAX_SOURCE_FILE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Source exceeds {settings.MAX_SOURCE_FILE_BYTES} bytes.",
        )

    # ---- create job ----
    process_id = uuid.uuid4().hex
    await JobStore.create(process_id, {
        "status": "queued",
        "source_code": source_code,
        "filename": filename,
        "language": payload.language or "",
        "error_message": payload.error_message or "",
        "expected_behavior": payload.expected_behavior or "",
        "test_code": payload.test_code or "",
    })

    # ---- kick off worker ----
    background.add_task(run_repair_workflow, process_id)

    return CreateProcessResponse(
        process_id=process_id,
        status="queued",
        stream_url=f"/api/v1/processes/{process_id}/stream",
    )


# ------------------------------------------------------------------ status

@router.get("/{process_id}")
async def get_status(process_id: str):
    job = await JobStore.get(process_id)
    if not job:
        raise HTTPException(status_code=404, detail="Process not found or expired.")
    return {
        "process_id": process_id,
        "status": job.get("status", "queued"),
        "current_node": job.get("current_node"),
        "errors": job.get("errors") or [],
    }


# ------------------------------------------------------------------ result

@router.get("/{process_id}/result")
async def get_result(process_id: str):
    job = await JobStore.get(process_id)
    if not job:
        raise HTTPException(status_code=404, detail="Process not found or expired.")
    status = job.get("status")
    if status not in ("completed", "failed"):
        raise HTTPException(status_code=202, detail=f"Process is {status}.")

    result = job.get("result") or {}
    return {
        "process_id": process_id,
        "status": status,
        "language": job.get("language"),
        "language_source": job.get("language_source"),
        "filename": job.get("filename"),
        "root_cause": result.get("root_cause"),
        "affected_lines": result.get("affected_lines", []),
        "proposed_fix": result.get("proposed_fix"),
        "explanation": result.get("explanation"),
        "diff": result.get("diff"),
        "risks": result.get("risks", []),
        "verification": result.get("verification"),
        "verdict": result.get("verdict"),
        "errors": job.get("errors") or [],
    }


# ------------------------------------------------------------------ stream

@router.get("/{process_id}/stream")
async def stream_process(process_id: str):
    from fastapi.responses import StreamingResponse
    import json

    job = await JobStore.get(process_id)
    if not job:
        raise HTTPException(status_code=404, detail="Process not found or expired.")

    async def _gen():
        if job.get("status") in ("completed", "failed"):
            payload = {"event": "final", "status": job["status"],
                       "state": job.get("result") or {}}
            yield f"data: {json.dumps(payload)}\n\n"
            return
        async for event in EventBus.subscribe(process_id):
            yield f"data: {json.dumps(event)}\n\n"
            if event.get("event") == "final":
                return

    return StreamingResponse(
        _gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ------------------------------------------------------------------ delete

@router.delete("/{process_id}", status_code=204)
async def delete_process(process_id: str):
    deleted = await JobStore.delete(process_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Process not found or expired.")