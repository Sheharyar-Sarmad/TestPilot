# agent/nodes/diagnose_bug.py
from langchain_core.prompts import ChatPromptTemplate
from ..state import AgentState
from ..llm import llm
from agent.nodes._shared import _emit, Diagnosis


async def diagnose_bug(state: AgentState) -> dict:
    _emit({"event": "node_start", "node": "diagnose_bug",
           "label": "Diagnosing root cause"})

    prompt = ChatPromptTemplate.from_messages([
        ("system",
         "You are an expert code debugger. Analyze the source and error, "
         "then produce a concise root-cause diagnosis. Do not hallucinate."),
        ("human",
         "Language: {language}\n"
         "Filename: {filename}\n"
         "Error: {error}\n"
         "Expected: {expected}\n\n"
         "Source:\n```\n{code}\n```"),
    ])

    chain = prompt | llm.with_structured_output(Diagnosis)
    result: Diagnosis = await chain.ainvoke({
        "language": state["language"],
        "filename": state["filename"],
        "error": state.get("error_message") or "(none provided)",
        "expected": state.get("expected_behavior") or "(none provided)",
        "code": state["source_code"],
    })

    _emit({"event": "node_end", "node": "diagnose_bug", "status": "ok"})
    return {
        "root_cause": result.root_cause,
        "affected_lines": result.affected_lines,
    }