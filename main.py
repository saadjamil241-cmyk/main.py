"""Star.AI — a small AI code assistant (FastAPI + OpenAI)."""

import os
from pathlib import Path
from typing import Literal

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from openai import AuthenticationError, OpenAI, OpenAIError, RateLimitError
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"

MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
MAX_CODE_CHARS = 20_000

SYSTEM_PROMPTS = {
    "analyze": (
        "You are a senior code reviewer. Review the user's code for correctness, "
        "bugs, security issues and maintainability. Be concrete: point at the "
        "problem, explain why it matters, and show the fix."
    ),
    "debug": (
        "You are a debugging expert. Find what is wrong with the user's code, "
        "explain the root cause, and give a corrected version of the affected part."
    ),
    "optimize": (
        "You are a performance engineer. Suggest concrete optimizations for the "
        "user's code (algorithmic, memory, I/O) in order of impact, with short "
        "before/after snippets."
    ),
    "explain": (
        "You are a patient teacher. Explain what the user's code does, step by "
        "step, and flag anything surprising or risky."
    ),
}

app = FastAPI(title="Star.AI", version="0.1.0")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


class CodeRequest(BaseModel):
    code: str = Field(min_length=1, max_length=MAX_CODE_CHARS)
    mode: Literal["analyze", "debug", "optimize", "explain"] = "analyze"
    language: str = Field(default="auto", max_length=40)


@app.get("/")
def index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


@app.post("/api/analyze")
def analyze(request: CodeRequest) -> dict:
    """Return {"result": ...} on success, {"error": ...} when the model call fails.

    Failures travel in a 200 body on purpose: the preview proxy swaps any 5xx
    response body for its own error page, which would hide the reason from the UI.
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return {
            "error": "OPENAI_API_KEY is not configured. Add it in your app's secrets, "
            "then try again."
        }

    language = (
        "" if request.language == "auto" else f"The code is written in {request.language}.\n\n"
    )
    messages = [
        {"role": "system", "content": SYSTEM_PROMPTS[request.mode]},
        {"role": "user", "content": f"{language}```\n{request.code}\n```"},
    ]

    try:
        client = OpenAI(api_key=api_key)
        response = client.chat.completions.create(
            model=MODEL,
            messages=messages,
            temperature=0.2,
        )
    except AuthenticationError:
        return {"error": "OpenAI rejected the API key. Check the OPENAI_API_KEY secret."}
    except RateLimitError:
        return {
            "error": "OpenAI quota exceeded — add credits to your OpenAI account, then try again."
        }
    except OpenAIError as exc:
        return {"error": f"OpenAI request failed: {exc}"}

    return {
        "mode": request.mode,
        "model": MODEL,
        "result": response.choices[0].message.content,
    }
