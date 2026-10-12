# agent/graph.py
"""
LangGraph workflow for TestPilot AI.

Streaming contract (SSE / WebSocket):
  {"event": "node_start", "node": "diagnose_bug", "label": "..."}
  {"event": "token",      "node": "generate_fix",  "content": "..."}
  {"event": "node_end",   "node": "diagnose_bug",  "status": "ok"}
  {"event": "status",     "message": "..."}
  {"event": "final",      "state": {...}}
"""
from __future__ import annotations

from langgraph.graph import StateGraph, START, END

from agent.state import AgentState
from agent.nodes import (
    validate_input, detect_language, parse_source, analyze_context,
    diagnose_bug, generate_fix, review_fix,
    run_verification, finalize_result, should_retry,
)

def build_main_graph():
    g = StateGraph(AgentState)

    g.add_node("validate_input", validate_input)
    g.add_node("detect_language", detect_language)
    g.add_node("parse_source", parse_source)
    g.add_node("analyze_context", analyze_context)
    g.add_node("diagnose_bug", diagnose_bug)
    g.add_node("generate_fix", generate_fix)
    g.add_node("review_fix", review_fix)
    g.add_node("run_verification", run_verification)
    g.add_node("finalize_result", finalize_result)

    g.add_edge(START, "validate_input")
    g.add_edge("validate_input", "detect_language")
    g.add_edge("detect_language", "parse_source")
    g.add_edge("parse_source", "analyze_context")
    g.add_edge("analyze_context", "diagnose_bug")
    g.add_edge("diagnose_bug", "generate_fix")
    g.add_edge("generate_fix", "review_fix")
    g.add_edge("review_fix", "run_verification")

    g.add_conditional_edges(
        "run_verification",
        should_retry,
        {"retry": "generate_fix", "end": "finalize_result"},
    )
    g.add_edge("finalize_result", END)

    return g.compile()


# Singleton — imported by the worker
graph = build_main_graph()