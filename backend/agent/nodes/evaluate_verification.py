# agent/nodes/evaluate_verification.py
from ..state import VerificationState
from agent.nodes._shared import _emit


async def evaluate_verification(state: VerificationState) -> dict:
    _emit({"event": "node_start", "node": "evaluate_verification",
           "label": "Evaluating verification"})

    results = state.get("results", [])
    if not results:
        verdict = "skipped"
    elif all(r["status"] == "passed" for r in results):
        verdict = "passed"
    elif any(r["status"] == "failed" for r in results):
        verdict = "failed"
    else:
        verdict = "partial"

    _emit({"event": "node_end", "node": "evaluate_verification", "status": verdict})
    return {"final_verdict": verdict}