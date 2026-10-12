# agent/nodes/review_fix.py
import difflib
from ..state import AgentState
from agent.nodes._shared import _emit


async def review_fix(state: AgentState) -> dict:
    _emit({"event": "node_start", "node": "review_fix",
           "label": "Reviewing proposed fix"})

    diff = "".join(difflib.unified_diff(
        state["source_code"].splitlines(keepends=True),
        (state.get("proposed_fix") or "").splitlines(keepends=True),
        fromfile=f"original/{state['filename']}",
        tofile=f"fixed/{state['filename']}",
    ))

    _emit({"event": "node_end", "node": "review_fix", "status": "ok"})
    return {"diff": diff, "status": "testing"}