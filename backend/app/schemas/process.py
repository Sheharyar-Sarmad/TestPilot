# app/schemas/process.py
from typing import Literal, Optional
from pydantic import BaseModel, Field, model_validator


class ProcessCreateRequest(BaseModel):
    """Request body for creating a new repair process."""
    source_code: Optional[str] = Field(None, description="Pasted source code")
    github_url: Optional[str] = Field(None, description="Public GitHub file URL")
    filename: Optional[str] = Field(None, max_length=255)
    language: Optional[str] = Field(None, max_length=32)
    error_message: Optional[str] = Field(None, max_length=10_000)
    expected_behavior: Optional[str] = Field(None, max_length=5_000)
    test_code: Optional[str] = Field(None, max_length=100_000)

    @model_validator(mode="after")
    def _exactly_one_source(self):
        provided = sum(bool(x) for x in (self.source_code, self.github_url))
        # File uploads are handled separately as multipart — this validator
        # only guards the JSON path.
        if provided == 0:
            raise ValueError("Provide source_code, github_url, or a file upload.")
        if provided > 1:
            raise ValueError("Provide only one source: source_code OR github_url.")
        return self


class ProcessCreatedResponse(BaseModel):
    process_id: str
    status: Literal["queued"]
    stream_url: str


class ProcessStatusResponse(BaseModel):
    process_id: str
    status: Literal["queued", "processing", "testing", "completed", "failed", "expired"]
    current_node: Optional[str] = None
    progress: Optional[float] = Field(None, ge=0.0, le=1.0)
    errors: list[str] = Field(default_factory=list)


class VerificationResult(BaseModel):
    check: str
    status: Literal["passed", "failed", "skipped", "error", "timeout"]
    output: str = ""


class ProcessResultResponse(BaseModel):
    process_id: str
    status: Literal["completed", "failed"]
    language: Optional[str] = None
    language_source: Optional[str] = None
    filename: Optional[str] = None
    root_cause: Optional[str] = None
    affected_lines: list[int] = Field(default_factory=list)
    proposed_fix: Optional[str] = None
    explanation: Optional[str] = None
    diff: Optional[str] = None
    risks: list[str] = Field(default_factory=list)
    verification: Optional[dict] = None
    verdict: Optional[str] = None
    errors: list[str] = Field(default_factory=list)