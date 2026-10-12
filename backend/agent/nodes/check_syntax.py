# agent/nodes/check_syntax.py
import ast
from ..state import VerificationState
from agent.nodes._shared import _emit


async def check_syntax(state: VerificationState) -> dict:
    _emit({"event": "node_start", "node": "check_syntax", "label": "Syntax check"})
    status = "passed"
    output = ""
    if state["language"] == "python":
        try:
            ast.parse(state["source_code"])
        except SyntaxError as e:
            status, output = "failed", str(e)
    _emit({"event": "node_end", "node": "check_syntax", "status": status})
    return {"results": [{"check": "syntax", "status": status, "output": output}]}