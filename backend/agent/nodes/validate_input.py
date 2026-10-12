# agent/nodes/validate_input.py
from ..state import AgentState
from agent.nodes._shared import _emit


async def validate_input(state: AgentState) -> dict:
    _emit({"event": "node_start", "node": "validate_input",
           "label": "Validating input"})

    errors: list[str] = []
    if not state.get("source_code", "").strip():
        errors.append("source_code is empty")

    _emit({"event": "node_end", "node": "validate_input",
           "status": "error" if errors else "ok"})
    return {"errors": errors, "status": "processing"}