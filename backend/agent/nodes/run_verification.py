# agent/nodes/run_verification.py
from langgraph.graph import StateGraph, START, END
from ..state import AgentState, VerificationState
from agent.nodes._shared import _emit
from agent.nodes.check_syntax import check_syntax
from agent.nodes.run_tests import run_tests
from agent.nodes.evaluate_verification import evaluate_verification


def build_verification_subgraph():
    g = StateGraph(VerificationState)
    g.add_node("check_syntax", check_syntax)
    g.add_node("run_tests", run_tests)
    g.add_node("evaluate", evaluate_verification)

    # Fan-out
    g.add_edge(START, "check_syntax")
    g.add_edge(START, "run_tests")
    # Fan-in
    g.add_edge("check_syntax", "evaluate")
    g.add_edge("run_tests", "evaluate")
    g.add_edge("evaluate", END)

    return g.compile()


async def run_verification(state: AgentState) -> dict:
    _emit({"event": "node_start", "node": "run_verification",
           "label": "Running verification"})

    subgraph = build_verification_subgraph()
    sub_state: VerificationState = {
        "source_code": state.get("proposed_fix") or state["source_code"],
        "test_code": state.get("test_code") or "",
        "language": state["language"],
        "checks_to_run": ["syntax", "tests"],
        "results": [],
        "final_verdict": None,
    }
    result = await subgraph.ainvoke(sub_state)

    _emit({"event": "node_end", "node": "run_verification",
           "status": result.get("final_verdict") or "unknown"})
    return {"verification_results": result}