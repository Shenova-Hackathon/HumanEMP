"""
SHENOVA AI - AI Explanation & Integration Package
=================================================
Member 4 module for AI-powered text simplification and backend integration.
"""

from ai.explain import simplify_text
from ai.integration import (
    process_text_for_explanation,
    router,
    ExplainRequest,
    ExplainResponse,
)

__all__ = [
    "simplify_text",
    "process_text_for_explanation",
    "router",
    "ExplainRequest",
    "ExplainResponse",
]
