# agent/nodes/run_tests.py
from ..state import VerificationState
from agent.nodes._shared import _emit


async def run_tests(state: VerificationState) -> dict:
    _emit({"event": "node_start", "node": "run_tests", "label": "Running tests"})
    # NOTE: Real implementation must call the sandbox runner, never exec inline.
    if not state.get("test_code"):
        _emit({"event": "node_end", "node": "run_tests", "status": "skipped"})
        return {"results": [{"check": "tests", "status": "skipped",
                             "output": "no tests provided"}]}

    _emit({"event": "node_end", "node": "run_tests", "status": "ok"})
    return {"results": [{"check": "tests", "status": "skipped",
                         "output": "sandbox runner not wired yet"}]}