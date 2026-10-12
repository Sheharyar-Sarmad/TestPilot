# app/schemas/events.py
from typing import Any, Literal, Optional
from pydantic import BaseModel


class StreamEvent(BaseModel):
    """
    Event schema for the SSE stream. Mirrors what agents/nodes/_shared._emit sends.
    """
    event: Literal["node_start", "node_end", "token", "status", "final"]
    node: Optional[str] = None
    label: Optional[str] = None
    status: Optional[str] = None
    message: Optional[str] = None
    content: Optional[str] = None
    state: Optional[dict[str, Any]] = None