# agent/nodes/analyze_context.py
from ..state import AgentState
from agent.nodes._shared import _emit


async def analyze_context(state: AgentState) -> dict:
    _emit({"event": "node_start", "node": "analyze_context",
           "label": "Reviewing error context"})
    # Placeholder — could become an LLM call to summarize stack traces
    _emit({"event": "node_end", "node": "analyze_context", "status": "ok"})
    return {}