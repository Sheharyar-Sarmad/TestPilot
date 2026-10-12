# agent/nodes/generate_fix.py
from langchain_core.prompts import ChatPromptTemplate
from ..state import AgentState
from ..llm import llm
from agent.nodes._shared import _emit, Fix


async def generate_fix(state: AgentState) -> dict:
    attempt = state.get("repair_attempts", 0)
    _emit({"event": "node_start", "node": "generate_fix",
           "label": f"Generating fix (attempt {attempt + 1})"})

    feedback = ""
    if attempt > 0 and state.get("verification_results"):
        feedback = (
            "\nPrevious verification failed. Feedback:\n"
            f"{state['verification_results'].get('final_verdict', '')}\n"
        )

    prompt = ChatPromptTemplate.from_messages([
        ("system",
         "You are an expert programmer. Produce a complete corrected version "
         "of the file. Preserve public APIs. Return the full file, not a diff."),
        ("human",
         "Language: {language}\n"
         "Root cause: {root_cause}\n"
         "Expected behavior: {expected}\n"
         "{feedback}\n"
         "Original source:\n```\n{code}\n```"),
    ])

    chain = prompt | llm.with_structured_output(Fix)
    result: Fix = await chain.ainvoke({
        "language": state["language"],
        "root_cause": state.get("root_cause", ""),
        "expected": state.get("expected_behavior") or "(none provided)",
        "feedback": feedback,
        "code": state["source_code"],
    })

    _emit({"event": "node_end", "node": "generate_fix", "status": "ok"})
    return {
        "proposed_fix": result.proposed_fix,
        "fix_explanation": result.explanation,
        "risks": result.risks,
        "repair_attempts": attempt + 1,
    }