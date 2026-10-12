# agent/state.py
from typing import TypedDict, List, Optional, Annotated, Literal
import operator


class VerificationState(TypedDict):
    """State specifically for the verification subgraph."""
    source_code: str
    test_code: str
    language: str
    checks_to_run: List[str]
    results: Annotated[List[dict], operator.add]
    final_verdict: Optional[Literal["passed", "failed", "partial", "skipped"]]


class AgentState(TypedDict, total=False):
    """Main state for the repair graph."""
    # Inputs
    source_code: str
    filename: str
    language: str
    language_source: Optional[Literal["explicit", "extension", "llm"]]   # ← add
    error_message: Optional[str]
    expected_behavior: Optional[str]
    test_code: Optional[str]

    # Parsed data
    ast_tree: Optional[dict]
    functions: List[dict]
    classes: List[dict]
    imports: List[str]

    # AI Outputs
    root_cause: Optional[str]
    affected_lines: List[int]
    proposed_fix: Optional[str]
    fix_explanation: Optional[str]
    diff: Optional[str]
    risks: List[str]

    # Verification
    verification_results: Optional[VerificationState]

    # Control flow
    repair_attempts: int
    max_repair_attempts: int
    status: Literal["queued", "processing", "testing", "completed", "failed"]
    errors: Annotated[List[str], operator.add]