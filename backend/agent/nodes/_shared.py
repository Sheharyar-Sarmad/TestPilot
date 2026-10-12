# agent/nodes/_shared.py
"""Shared helpers used by every node: event emitter, schemas, LLM streaming."""
from __future__ import annotations

from typing import Any
from langchain_core.prompts import ChatPromptTemplate
from langgraph.config import get_stream_writer
from pydantic import BaseModel, Field
from typing import Literal

from agent.llm import llm


# ---------------------------------------------------------------------------
# Event emitter
# ---------------------------------------------------------------------------
def _emit(event: dict[str, Any]) -> None:
    """Emit a custom event to the caller's stream (safe no-op outside streaming)."""
    try:
        writer = get_stream_writer()
        writer(event)
    except Exception:
        pass


# ---------------------------------------------------------------------------
# Structured output schemas
# ---------------------------------------------------------------------------
class Diagnosis(BaseModel):
    root_cause: str = Field(description="Concise root-cause explanation.")
    affected_lines: list[int] = Field(default_factory=list)
    confidence: Literal["low", "medium", "high"] = "medium"


class Fix(BaseModel):
    proposed_fix: str = Field(description="Complete corrected source file.")
    explanation: str = Field(description="What changed and why.")
    risks: list[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Optional raw-token streaming wrapper (used when schema is None)
# ---------------------------------------------------------------------------
async def _stream_llm(prompt_messages: list, schema: type[BaseModel] | None = None) -> Any:
    structured = llm.with_structured_output(schema) if schema else llm
    chain = ChatPromptTemplate.from_messages(prompt_messages) | structured

    if schema is None:
        chunks: list[str] = []
        async for chunk in chain.astream({}):
            content = getattr(chunk, "content", "") or ""
            if content:
                chunks.append(content)
                _emit({"event": "token", "node": "llm", "content": content})
        return "".join(chunks)

    return await chain.ainvoke({})