# agent/nodes/detect_language.py
from typing import Literal
from pydantic import BaseModel, Field
from langchain_core.prompts import ChatPromptTemplate

from ..state import AgentState
from ..llm import llm
from agent.nodes._shared import _emit


EXT_MAP: dict[str, str] = {
    "py": "python", "pyw": "python", "pyi": "python",
    "js": "javascript", "mjs": "javascript", "cjs": "javascript", "jsx": "javascript",
    "ts": "typescript", "tsx": "typescript",
    "java": "java",
    "go": "go",
    "rs": "rust",
    "rb": "ruby",
    "php": "php",
    "cs": "csharp",
    "cpp": "cpp", "cc": "cpp", "cxx": "cpp", "hpp": "cpp",
    "c": "c", "h": "c",
    "kt": "kotlin", "kts": "kotlin",
    "swift": "swift",
    "scala": "scala",
    "sh": "bash", "bash": "bash", "zsh": "bash",
    "sql": "sql", "r": "r", "dart": "dart",
    "lua": "lua", "pl": "perl", "ex": "elixir", "exs": "elixir",
}

SUPPORTED_LANGUAGES = sorted(set(EXT_MAP.values()) | {"python"})


class LanguageGuess(BaseModel):
    language: Literal[
        "python", "javascript", "typescript", "java", "go", "rust", "ruby",
        "php", "csharp", "cpp", "c", "kotlin", "swift", "scala",
        "bash", "sql", "r", "dart", "lua", "perl", "elixir", "unknown",
    ] = Field(description="The detected programming language, or 'unknown'.")
    confidence: Literal["low", "medium", "high"] = "medium"


async def detect_language(state: AgentState) -> dict:
    _emit({"event": "node_start", "node": "detect_language",
           "label": "Detecting language"})

    # 1. Explicit language from the user
    explicit = (state.get("language") or "").strip().lower()
    if explicit and explicit in SUPPORTED_LANGUAGES:
        _emit({"event": "node_end", "node": "detect_language",
               "status": "ok", "language": explicit, "source": "explicit"})
        return {"language": explicit, "language_source": "explicit"}

    # 2. Heuristic from file extension
    filename = state.get("filename", "") or ""
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext in EXT_MAP:
        language = EXT_MAP[ext]
        _emit({"event": "node_end", "node": "detect_language",
               "status": "ok", "language": language, "source": "extension"})
        return {"language": language, "language_source": "extension"}

    # 3. LLM fallback (only when extension is missing or ambiguous)
    snippet = (state.get("source_code") or "")[:2000]
    prompt = ChatPromptTemplate.from_messages([
        ("system",
         "You are a programming-language classifier. Identify the dominant "
         "programming language of the given code. If ambiguous, return 'unknown'."),
        ("human", "Filename: {filename}\n\nCode:\n```\n{snippet}\n```"),
    ])
    chain = prompt | llm.with_structured_output(LanguageGuess)

    try:
        guess: LanguageGuess = await chain.ainvoke({
            "filename": filename or "(none provided)",
            "snippet": snippet,
        })
        detected = guess.language
    except Exception as e:
        _emit({"event": "status", "message": f"Language detection failed: {e}"})
        detected = "unknown"

    if detected == "unknown":
        detected = "python"

    _emit({"event": "node_end", "node": "detect_language",
           "status": "ok", "language": detected, "source": "llm"})
    return {"language": detected, "language_source": "llm"}