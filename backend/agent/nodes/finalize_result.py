# agent/nodes/finalize_result.py
from typing import Literal
from ..state import AgentState
from agent.nodes._shared import _emit


async def finalize_result(state: AgentState) -> dict:
    _emit({"event": "node_start", "node": "finalize_result", "label": "Finalizing"})

    verdict = (state.get("verification_results") or {}).get("final_verdict")
    final_status: Literal["completed", "failed"] = "completed"
    if state.get("errors"):
        final_status = "failed"

    payload = {
        "root_cause": state.get("root_cause"),
        "affected_lines": state.get("affected_lines", []),
        "proposed_fix": state.get("proposed_fix"),
        "explanation": state.get("fix_explanation"),
        "diff": state.get("diff"),
        "risks": state.get("risks", []),
        "verification": state.get("verification_results"),
        "verdict": verdict,
        "errors": state.get("errors", []),
    }
    _emit({"event": "final", "status": final_status, "state": payload})
    _emit({"event": "node_end", "node": "finalize_result", "status": final_status})

    return {"status": final_status}