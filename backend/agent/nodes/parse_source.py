# agent/nodes/parse_source.py
import ast
from ..state import AgentState
from agent.nodes._shared import _emit


async def parse_source(state: AgentState) -> dict:
    _emit({"event": "node_start", "node": "parse_source",
           "label": "Parsing source structure"})

    functions: list[dict] = []
    classes: list[dict] = []
    imports: list[str] = []

    if state.get("language") == "python":
        try:
            tree = ast.parse(state["source_code"])
            for node in ast.walk(tree):
                if isinstance(node, ast.FunctionDef):
                    functions.append({"name": node.name, "line": node.lineno})
                elif isinstance(node, ast.ClassDef):
                    classes.append({"name": node.name, "line": node.lineno})
                elif isinstance(node, ast.Import):
                    imports.extend(a.name for a in node.names)
                elif isinstance(node, ast.ImportFrom):
                    imports.append(node.module or "")
        except SyntaxError as e:
            _emit({"event": "status", "message": f"Syntax error: {e}"})

    _emit({"event": "node_end", "node": "parse_source", "status": "ok"})
    return {"functions": functions, "classes": classes, "imports": imports}