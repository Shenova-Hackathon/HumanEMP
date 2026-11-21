"""
SHENOVA AI - AI Explanation Module
===================================
Member 4: AI-powered text simplification using the Google Gemini API.

This module provides the `simplify_text` function to convert complex, jargon-heavy,
or bureaucratic text into plain, accessible everyday English while strictly preserving
all facts, dates, names, numbers, and original meaning.
"""

from __future__ import annotations

import os
from typing import Any, Dict, Optional
try:
    from dotenv import load_dotenv
    load_dotenv(override=True)
except ImportError:
    load_dotenv = None  # type: ignore

# Attempt to import Google Gen AI SDK
try:
    from google import genai
    from google.genai import types
    from google.genai.errors import APIError
    GENAI_AVAILABLE = True
except ImportError:
    genai = None  # type: ignore
    types = None  # type: ignore
    APIError = Exception  # type: ignore
    GENAI_AVAILABLE = False

# Maximum allowed character length for incoming text to prevent payload overflow
MAX_INPUT_LENGTH = 15000

# Default model recommendation
DEFAULT_MODEL = "gemini-3.5-flash"

# System instruction defining SHENOVA AI's simplification persona and strict constraints
SIMPLIFICATION_SYSTEM_INSTRUCTION = (
    "You are SHENOVA AI, an accessibility companion designed to help people understand "
    "complicated information through simple, plain language.\n\n"
    "Your objective is to rewrite the input text into clear, easy-to-understand everyday English.\n\n"
    "Strict Rules:\n"
    "1. Explain complicated text using simple everyday English.\n"
    "2. Use short, direct sentences.\n"
    "3. Prefer familiar words over jargon, legalese, or complex vocabulary.\n"
    "4. Strictly preserve all important facts, names, dates, times, quantities, and numbers.\n"
    "5. Do not change or distort the original meaning or intent.\n"
    "6. Do not invent, hallucinate, or assume missing information.\n"
    "7. Explain difficult terminology concisely within context if essential to understanding.\n"
    "8. Make the output easy to understand for diverse audiences, including neurodivergent individuals and non-native speakers.\n"
    "9. Do not provide conversational filler, chit-chat, preamble, or commentary (e.g., do not say 'Here is the simplified text:'). Output only the simplified text."
)


def _validate_input(text: Any) -> Optional[str]:
    """
    Validate the incoming text to ensure it is suitable for simplification.

    Args:
        text (Any): Input received for validation.

    Returns:
        Optional[str]: An error message string if validation fails, or None if valid.
    """
    if text is None:
        return "Input text cannot be None. Please provide a valid string."
    if not isinstance(text, str):
        return f"Input text must be a string, got {type(text).__name__}."
    if not text.strip():
        return "Input text cannot be empty or contain only whitespace."
    if len(text) > MAX_INPUT_LENGTH:
        return (
            f"Input text exceeds the maximum allowed length of {MAX_INPUT_LENGTH} characters "
            f"(received {len(text)} characters)."
        )
    return None


def simplify_text(
    text: str,
    api_key: Optional[str] = None,
    model: Optional[str] = None
) -> Dict[str, Any]:
    """
    Simplify complex text into plain everyday English using the Google Gemini API.
    """
    # Reload environment in case .env was recently modified
    if load_dotenv:
        load_dotenv(override=True)
    # 1. Validate Input
    validation_error = _validate_input(text)
    if validation_error:
        return {
            "success": False,
            "original_text": text if isinstance(text, str) else str(text),
            "simplified_text": None,
            "error": validation_error,
        }

    # 2. Check SDK Availability
    if not GENAI_AVAILABLE:
        return {
            "success": False,
            "original_text": text,
            "simplified_text": None,
            "error": (
                "Google Gen AI SDK ('google-genai') is not installed. "
                "Please run: pip install -r requirements.txt"
            ),
        }

    # 3. Retrieve and Validate API Key
    effective_api_key = api_key or os.getenv("GEMINI_API_KEY")
    if not effective_api_key or not effective_api_key.strip():
        return {
            "success": False,
            "original_text": text,
            "simplified_text": None,
            "error": (
                "Missing Gemini API key. Please set the 'GEMINI_API_KEY' environment variable "
                "in your .env file or deployment environment."
            ),
        }

    # 4. Resolve Model Name
    effective_model = model or os.getenv("GEMINI_MODEL", DEFAULT_MODEL)

    # 5. Call Gemini API with Comprehensive Exception Handling
    try:
        client = genai.Client(api_key=effective_api_key.strip())

        prompt = (
            "Please simplify the following text according to your instructions:\n\n"
            f'"""\n{text.strip()}\n"""'
        )

        generation_config = (
            types.GenerateContentConfig(
                system_instruction=SIMPLIFICATION_SYSTEM_INSTRUCTION,
                temperature=0.2,
            )
            if types and hasattr(types, "GenerateContentConfig")
            else None
        )

        response = client.models.generate_content(
            model=effective_model,
            contents=prompt,
            config=generation_config,
        )

        # 6. Validate API Response
        if not response or not response.text:
            finish_reason = None
            if response and getattr(response, "candidates", None):
                finish_reason = getattr(response.candidates[0], "finish_reason", None)

            return {
                "success": False,
                "original_text": text,
                "simplified_text": None,
                "error": (
                    f"Gemini API returned an empty response. "
                    f"(Finish reason: {finish_reason or 'unknown/filtered'})"
                ),
            }

        simplified_text = response.text.strip()

        return {
            "success": True,
            "original_text": text,
            "simplified_text": simplified_text,
            "error": None,
        }

    except APIError as e:
        error_msg = str(e)
        status_code = getattr(e, "code", None)

        if status_code in (401, 403) or "API_KEY_INVALID" in error_msg or "PERMISSION_DENIED" in error_msg:
            friendly_error = "Gemini API authentication failed. Please verify that your GEMINI_API_KEY is valid."
        elif status_code == 429 or "RESOURCE_EXHAUSTED" in error_msg:
            friendly_error = "Gemini API rate limit or quota exceeded. Please try again in a few moments."
        elif "DEADLINE_EXCEEDED" in error_msg or "timed out" in error_msg.lower():
            friendly_error = "Gemini API request timed out. Please check your network connection and retry."
        else:
            friendly_error = f"Gemini API error ({status_code or 'unknown'}): {error_msg}"

        return {
            "success": False,
            "original_text": text,
            "simplified_text": None,
            "error": friendly_error,
        }

    except (ConnectionError, TimeoutError, OSError) as e:
        return {
            "success": False,
            "original_text": text,
            "simplified_text": None,
            "error": f"Network connection error while contacting Gemini API: {str(e)}",
        }

    except Exception as e:
        return {
            "success": False,
            "original_text": text,
            "simplified_text": None,
            "error": f"An unexpected error occurred during text simplification: {str(e)}",
        }


if __name__ == "__main__":
    import json
    import sys

    sample_text = (
        sys.argv[1]
        if len(sys.argv) > 1
        else "Applicants must submit the required documentation prior to the commencement of the academic session."
    )
    print(f"--- SHENOVA AI: explain.py CLI Test ---")
    print(f"Input: {sample_text}\n")
    simplification_result = simplify_text(sample_text)
    print(json.dumps(simplification_result, indent=2))
