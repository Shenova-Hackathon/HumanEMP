"""
SHENOVA AI - AI Module Test Suite
==================================
Unit tests for explain.py and integration.py validating:
1. Empty and whitespace input handling.
2. Non-string / None input handling.
3. Excessive length handling.
4. Missing API key detection.
5. Integration function (process_text_for_explanation).
6. Mocked successful simplification flow.
"""

import os
import sys
import unittest
from unittest.mock import MagicMock, patch

# Ensure the parent directory is on sys.path so 'ai' package can be imported
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

import explain
import integration


class TestAIExplanationModule(unittest.TestCase):
    """Test suite for AI explanation and integration functions."""

    def setUp(self):
        # Save original env var state
        self.original_api_key = os.environ.get("GEMINI_API_KEY")

    def tearDown(self):
        # Restore original env var state
        if self.original_api_key is not None:
            os.environ["GEMINI_API_KEY"] = self.original_api_key
        elif "GEMINI_API_KEY" in os.environ:
            del os.environ["GEMINI_API_KEY"]

    # --------------------------------------------------------------------------
    # 1. Validation Tests: Empty, Whitespace, None, Length
    # --------------------------------------------------------------------------

    def test_empty_string_rejection(self):
        """Test that empty string input is rejected with an appropriate error."""
        result = explain.simplify_text("")
        self.assertFalse(result["success"])
        self.assertIsNone(result["simplified_text"])
        self.assertIn("empty or contain only whitespace", result["error"])

        # Also verify integration layer
        integration_result = integration.process_text_for_explanation("")
        self.assertFalse(integration_result["success"])
        self.assertIsNone(integration_result["simplified_text"])
        self.assertIn("empty or whitespace", integration_result["error"])

    def test_whitespace_string_rejection(self):
        """Test that whitespace-only input is rejected."""
        result = explain.simplify_text("   \n\t   ")
        self.assertFalse(result["success"])
        self.assertIsNone(result["simplified_text"])
        self.assertIn("empty or contain only whitespace", result["error"])

        integration_result = integration.process_text_for_explanation("   \n\t   ")
        self.assertFalse(integration_result["success"])
        self.assertIsNone(integration_result["simplified_text"])
        self.assertIn("empty or whitespace", integration_result["error"])

    def test_none_input_rejection(self):
        """Test that None input is handled safely without crashing."""
        result = explain.simplify_text(None)  # type: ignore
        self.assertFalse(result["success"])
        self.assertIsNone(result["simplified_text"])
        self.assertIn("cannot be None", result["error"])

        integration_result = integration.process_text_for_explanation(None)  # type: ignore
        self.assertFalse(integration_result["success"])
        self.assertIsNone(integration_result["simplified_text"])
        self.assertIn("cannot be None", integration_result["error"])

    def test_excessive_length_rejection(self):
        """Test that inputs exceeding the maximum length are safely rejected."""
        oversized_text = "word " * 4000  # > 15,000 characters
        result = explain.simplify_text(oversized_text)
        self.assertFalse(result["success"])
        self.assertIsNone(result["simplified_text"])
        self.assertIn("exceeds the maximum allowed length", result["error"])

    # --------------------------------------------------------------------------
    # 2. Missing API Key Handling
    # --------------------------------------------------------------------------

    def test_missing_api_key_handling(self):
        """Test that a missing or blank API key returns a clear, actionable error."""
        if "GEMINI_API_KEY" in os.environ:
            del os.environ["GEMINI_API_KEY"]

        # Temporarily ensure GENAI_AVAILABLE is True for this check
        with patch.object(explain, "GENAI_AVAILABLE", True):
            result = explain.simplify_text(
                "Applicants must submit documentation.",
                api_key=""
            )
            self.assertFalse(result["success"])
            self.assertIsNone(result["simplified_text"])
            self.assertIn("Missing Gemini API key", result["error"])

    # --------------------------------------------------------------------------
    # 3. Successful Simplification (Mocked Gemini SDK response)
    # --------------------------------------------------------------------------

    def test_successful_simplification_mocked(self):
        """Test the end-to-end flow with a mocked Gemini client response."""
        input_text = "Applicants must submit the required documentation prior to the commencement of the academic session."
        expected_simplified = "Students must submit all required documents before their academic session starts."

        # Mock the Gemini client and response
        mock_response = MagicMock()
        mock_response.text = expected_simplified

        mock_client = MagicMock()
        mock_client.models.generate_content.return_value = mock_response

        mock_genai = MagicMock()
        mock_genai.Client.return_value = mock_client
        mock_types = MagicMock()

        with patch.object(explain, "GENAI_AVAILABLE", True), \
             patch.object(explain, "genai", mock_genai), \
             patch.object(explain, "types", mock_types):
            
            result = explain.simplify_text(
                text=input_text,
                api_key="mock_test_key_for_testing"
            )

            self.assertTrue(result["success"])
            self.assertEqual(result["original_text"], input_text)
            self.assertEqual(result["simplified_text"], expected_simplified)
            self.assertIsNone(result["error"])

            # Verify prompt and config parameters passed to Gemini
            mock_client.models.generate_content.assert_called_once()
            call_kwargs = mock_client.models.generate_content.call_args.kwargs
            self.assertEqual(call_kwargs["model"], "gemini-2.5-flash")
            self.assertIn(input_text, call_kwargs["contents"])

    # --------------------------------------------------------------------------
    # 4. Error Handling Simulation Tests
    # --------------------------------------------------------------------------

    def test_api_rate_limit_handling(self):
        """Test that rate limit / quota exceeded errors are properly translated."""
        mock_client = MagicMock()
        mock_error = Exception("429 RESOURCE_EXHAUSTED: Quota exceeded")
        mock_client.models.generate_content.side_effect = mock_error

        mock_genai = MagicMock()
        mock_genai.Client.return_value = mock_client
        mock_types = MagicMock()

        with patch.object(explain, "GENAI_AVAILABLE", True), \
             patch.object(explain, "genai", mock_genai), \
             patch.object(explain, "types", mock_types), \
             patch.object(explain, "APIError", Exception):

            result = explain.simplify_text("Test text", api_key="test_key")
            self.assertFalse(result["success"])
            self.assertIn("rate limit or quota exceeded", result["error"].lower())

    def test_api_auth_failure_handling(self):
        """Test that authentication failure errors are properly translated."""
        mock_client = MagicMock()
        mock_error = Exception("API_KEY_INVALID: API key not valid")
        mock_client.models.generate_content.side_effect = mock_error

        mock_genai = MagicMock()
        mock_genai.Client.return_value = mock_client
        mock_types = MagicMock()

        with patch.object(explain, "GENAI_AVAILABLE", True), \
             patch.object(explain, "genai", mock_genai), \
             patch.object(explain, "types", mock_types), \
             patch.object(explain, "APIError", Exception):

            result = explain.simplify_text("Test text", api_key="bad_key")
            self.assertFalse(result["success"])
            self.assertIn("authentication failed", result["error"].lower())

    def test_empty_api_response_handling(self):
        """Test handling when Gemini returns an empty response."""
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.text = ""
        mock_response.candidates = []
        mock_client.models.generate_content.return_value = mock_response

        mock_genai = MagicMock()
        mock_genai.Client.return_value = mock_client
        mock_types = MagicMock()

        with patch.object(explain, "GENAI_AVAILABLE", True), \
             patch.object(explain, "genai", mock_genai), \
             patch.object(explain, "types", mock_types):

            result = explain.simplify_text("Test text", api_key="test_key")
            self.assertFalse(result["success"])
            self.assertIn("empty response", result["error"].lower())

    # --------------------------------------------------------------------------
    # 5. Integration Module Structure & Schema
    # --------------------------------------------------------------------------

    def test_integration_function_contract(self):
        """Verify process_text_for_explanation returns expected dictionary keys."""
        res = integration.process_text_for_explanation("")
        expected_keys = {"success", "original_text", "simplified_text", "error"}
        self.assertEqual(set(res.keys()), expected_keys)


if __name__ == "__main__":
    unittest.main(verbosity=2)
