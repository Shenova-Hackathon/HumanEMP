"""
SHENOVA AI - AI Integration Module
===================================
Member 4: Integration layer connecting the AI text simplification engine
with the SHENOVA AI application backend (Member 2) and input pipelines
(OCR, Speech-to-Text, Direct Text).

This module provides:
1. `process_text_for_explanation(text: str) -> dict`: Core independent function.
2. `router`: FastAPI APIRouter exposing `POST /explain` ready for inclusion into Member 2's app.
3. `ExplainRequest` & `ExplainResponse`: Pydantic models for consistent API schemas.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    load_dotenv = None  # type: ignore

# Logger setup
logger = logging.getLogger("shenova.ai.integration")

# Flexible import of simplify_text supporting both package and direct module execution
try:
    from ai.explain import simplify_text
except ImportError:
    try:
        from explain import simplify_text
    except ImportError as exc:
        raise ImportError(
            "Could not import 'simplify_text' from explain module. "
            "Ensure 'ai' is in your PYTHONPATH or run from the project root."
        ) from exc

# Optional FastAPI / Pydantic integration support
try:
    from fastapi import APIRouter, status
    from pydantic import BaseModel, Field
    FASTAPI_AVAILABLE = True
except ImportError:
    FASTAPI_AVAILABLE = False
    APIRouter = None  # type: ignore
    BaseModel = object  # type: ignore
    Field = lambda *args, **kwargs: None  # type: ignore


def process_text_for_explanation(text: str) -> Dict[str, Any]:
    """
    Process arbitrary input text (from OCR, speech transcription, or manual input)
    and return a simplified, easy-to-understand explanation.

    This function acts as the central interface for SHENOVA AI and is independent
    of any web framework or frontend implementation.

    Args:
        text (str): The raw text to simplify.

    Returns:
        Dict[str, Any]: Structured dictionary in the format:
            {
                "success": bool,
                "original_text": str,
                "simplified_text": Optional[str],
                "error": Optional[str]
            }
    """
    try:
        # Pre-validation and sanitization
        if text is None:
            return {
                "success": False,
                "original_text": "",
                "simplified_text": None,
                "error": "Input text cannot be None.",
            }

        if not isinstance(text, str):
            return {
                "success": False,
                "original_text": str(text),
                "simplified_text": None,
                "error": f"Input must be a string, got {type(text).__name__}.",
            }

        cleaned_text = text.strip()
        if not cleaned_text:
            return {
                "success": False,
                "original_text": text,
                "simplified_text": None,
                "error": "Input text cannot be empty or whitespace-only.",
            }

        # Delegate to the AI simplification engine
        result = simplify_text(cleaned_text)

        # Ensure original_text preserves the caller's text representation
        result["original_text"] = text

        return result

    except Exception as e:
        logger.exception("Unexpected error in process_text_for_explanation")
        return {
            "success": False,
            "original_text": str(text) if text is not None else "",
            "simplified_text": None,
            "error": f"Internal integration error: {str(e)}",
        }


# ============================================================================
# FastAPI Integration Components
# ============================================================================

if FASTAPI_AVAILABLE:
    class ExplainRequest(BaseModel):
        """Request model for the text simplification endpoint."""
        text: str = Field(
            ...,
            description="The original complicated text to simplify.",
            examples=["Applicants must submit the required documentation prior to the commencement of the academic session."]
        )

    class ExplainResponse(BaseModel):
        """Standardized response model for the text simplification endpoint."""
        success: bool = Field(..., description="Indicates whether simplification was successful.")
        original_text: str = Field(..., description="The original input text.")
        simplified_text: Optional[str] = Field(
            None,
            description="The simplified explanation in clear, everyday English."
        )
        error: Optional[str] = Field(
            None,
            description="Error message if the operation was unsuccessful, otherwise null."
        )

    # Reusable router that Member 2 can mount directly into their FastAPI application
    router = APIRouter(tags=["AI Simplification"])

    @router.post(
        "/explain",
        response_model=ExplainResponse,
        summary="Simplify complex text",
        description=(
            "Accepts text from OCR, speech-to-text, or user input and returns a clear, "
            "simple everyday English explanation using Google Gemini."
        ),
        status_code=status.HTTP_200_OK,
    )
    def explain_text_route(payload: ExplainRequest) -> Dict[str, Any]:
        """
        FastAPI endpoint handler for text explanation requests.
        Mountable via: app.include_router(ai_router)
        """
        return process_text_for_explanation(payload.text)

else:
    router = None  # type: ignore
    ExplainRequest = None  # type: ignore
    ExplainResponse = None  # type: ignore


if __name__ == "__main__":
    import json
    import sys

    sample_text = (
        sys.argv[1]
        if len(sys.argv) > 1
        else "Applicants must submit the required documentation prior to the commencement of the academic session."
    )
    print("--- SHENOVA AI: integration.py CLI Test ---")
    print(f"Input: {sample_text}\n")
    response_data = process_text_for_explanation(sample_text)
    print(json.dumps(response_data, indent=2))
