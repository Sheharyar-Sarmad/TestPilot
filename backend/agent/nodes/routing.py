# agent/nodes/routing.py
from typing import Literal
from ..state import AgentState
from agent.nodes._shared import _emit


def should_retry(state: AgentState) -> Literal["retry", "end"]:
    """Bounded repair loop: retry only if verification failed and budget remains."""
    verdict = (state.get("verification_results") or {}).get("final_verdict")
    attempts = state.get("repair_attempts", 0)
    max_attempts = state.get("max_repair_attempts", 2)

    if verdict == "failed" and attempts < max_attempts:
        _emit({"event": "status",
               "message": f"Retrying repair ({attempts}/{max_attempts})"})
        return "retry"
    return "end"