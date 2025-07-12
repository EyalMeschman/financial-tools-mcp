"""Tests for the exchange rate MCP tool."""

from typing import Any, Callable, Dict, Optional

import pytest
import requests_mock

from mcp_tools.exchange_rate import _normalize_date, mcp


def get_exchange_rate_function() -> Optional[Callable[..., Dict[str, Any]]]:
    """Helper to get the exchange rate function from the MCP instance."""
    for tool in mcp._tool_manager._tools.values():
        if hasattr(tool, "fn") and tool.fn.__name__ == "get_exchange_rate":
            return tool.fn
    return None


class TestGetExchangeRate:
    """Test cases for the get_exchange_rate function."""

    def test_happy_path(self):
        """Test successful exchange rate retrieval."""
        get_exchange_rate_func = get_exchange_rate_function()
        assert get_exchange_rate_func is not None, "get_exchange_rate function not found"

        # Mock the API response
        expected_response = {"amount": 1.0, "base": "USD", "date": "2025-07-10", "rates": {"ILS": 3.3064}}

        with requests_mock.Mocker() as m:
            m.get("https://api.frankfurter.app/2025-07-10?from=USD&to=ILS", json=expected_response)

            # Use default currencies (USD to ILS)
            result = get_exchange_rate_func("2025-07-10")

            assert result == expected_response
            assert result["amount"] == 1.0
            assert result["base"] == "USD"
            assert result["date"] == "2025-07-10"
            assert result["rates"]["ILS"] == 3.3064

    def test_custom_currencies(self):
        """Test exchange rate with custom currencies."""
        get_exchange_rate_func = get_exchange_rate_function()

        # Mock the API response for EUR to GBP
        expected_response = {"amount": 1.0, "base": "EUR", "date": "2025-07-10", "rates": {"GBP": 0.8520}}

        with requests_mock.Mocker() as m:
            m.get("https://api.frankfurter.app/2025-07-10?from=EUR&to=GBP", json=expected_response)

            result = get_exchange_rate_func("2025-07-10", "EUR", "GBP")

            assert result == expected_response
            assert result["amount"] == 1.0
            assert result["base"] == "EUR"
            assert result["date"] == "2025-07-10"
            assert result["rates"]["GBP"] == 0.8520

    def test_date_formats(self):
        """Test various date format inputs."""
        get_exchange_rate_func = get_exchange_rate_function()

        expected_response = {"amount": 1.0, "base": "USD", "date": "2025-07-10", "rates": {"ILS": 3.3064}}

        date_formats = ["2025-07-10", "07/10/2025", "10 Jul 2025"]

        with requests_mock.Mocker() as m:
            m.get("https://api.frankfurter.app/2025-07-10?from=USD&to=ILS", json=expected_response)

            for date_format in date_formats:
                result = get_exchange_rate_func(date_format)
                assert result["date"] == "2025-07-10"

    def test_bad_date(self):
        """Test that invalid dates raise ValueError."""
        get_exchange_rate_func = get_exchange_rate_function()

        with pytest.raises(ValueError, match="Invalid date format"):
            get_exchange_rate_func("invalid-date-32-13-2025")


class TestHelperFunctions:
    """Test cases for helper functions."""

    def test_normalize_date(self):
        """Test date normalization."""
        assert _normalize_date("2025-07-10") == "2025-07-10"
        assert _normalize_date("07/10/2025") == "2025-07-10"
        assert _normalize_date("July 10, 2025") == "2025-07-10"

        with pytest.raises(ValueError):
            _normalize_date("invalid-date")
