"""Tests for the exchange rate MCP tool."""

import os
import tempfile
from unittest.mock import patch

import pytest
import requests_mock

from exchange_rate_mcp.tools import _load_cache, _normalize_date, _save_cache, mcp


def get_exchange_rate_function():
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

            # Test with a temporary cache to avoid side effects
            with tempfile.TemporaryDirectory() as tmpdir:
                cache_path = os.path.join(tmpdir, "test_cache.json")
                with patch("exchange_rate_mcp.tools.CACHE_PATH", cache_path):
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

            # Test with a temporary cache to avoid side effects
            with tempfile.TemporaryDirectory() as tmpdir:
                cache_path = os.path.join(tmpdir, "test_cache.json")
                with patch("exchange_rate_mcp.tools.CACHE_PATH", cache_path):
                    result = get_exchange_rate_func("2025-07-10", "EUR", "GBP")

                    assert result == expected_response
                    assert result["amount"] == 1.0
                    assert result["base"] == "EUR"
                    assert result["date"] == "2025-07-10"
                    assert result["rates"]["GBP"] == 0.8520

    def test_cache_hit(self):
        """Test that cached results are returned without making API calls."""
        get_exchange_rate_func = get_exchange_rate_function()

        expected_response = {"amount": 1.0, "base": "USD", "date": "2025-07-10", "rates": {"ILS": 3.3064}}

        with tempfile.TemporaryDirectory() as tmpdir:
            cache_path = os.path.join(tmpdir, "test_cache.json")
            with patch("exchange_rate_mcp.tools.CACHE_PATH", cache_path):
                # First call - should hit API
                with requests_mock.Mocker() as m:
                    m.get("https://api.frankfurter.app/2025-07-10?from=USD&to=ILS", json=expected_response)
                    result1 = get_exchange_rate_func("2025-07-10")
                    assert m.call_count == 1
                    assert result1 == expected_response

                # Second call - should hit cache (no API call)
                with patch("requests.get") as mock_get:
                    mock_get.side_effect = Exception("API should not be called")
                    result2 = get_exchange_rate_func("2025-07-10")
                    assert result2 == expected_response
                    mock_get.assert_not_called()

    def test_cache_key_separation(self):
        """Test that different currency pairs use separate cache keys."""
        get_exchange_rate_func = get_exchange_rate_function()

        usd_ils_response = {"amount": 1.0, "base": "USD", "date": "2025-07-10", "rates": {"ILS": 3.3064}}
        eur_gbp_response = {"amount": 1.0, "base": "EUR", "date": "2025-07-10", "rates": {"GBP": 0.8520}}

        with tempfile.TemporaryDirectory() as tmpdir:
            cache_path = os.path.join(tmpdir, "test_cache.json")
            with patch("exchange_rate_mcp.tools.CACHE_PATH", cache_path):
                with requests_mock.Mocker() as m:
                    m.get("https://api.frankfurter.app/2025-07-10?from=USD&to=ILS", json=usd_ils_response)
                    m.get("https://api.frankfurter.app/2025-07-10?from=EUR&to=GBP", json=eur_gbp_response)

                    # Both should hit API since they use different currency pairs
                    result1 = get_exchange_rate_func("2025-07-10", "USD", "ILS")
                    result2 = get_exchange_rate_func("2025-07-10", "EUR", "GBP")

                    assert m.call_count == 2
                    assert result1 == usd_ils_response
                    assert result2 == eur_gbp_response

    def test_date_formats(self):
        """Test various date format inputs."""
        get_exchange_rate_func = get_exchange_rate_function()

        expected_response = {"amount": 1.0, "base": "USD", "date": "2025-07-10", "rates": {"ILS": 3.3064}}

        date_formats = ["2025-07-10", "07/10/2025", "10 Jul 2025"]

        with tempfile.TemporaryDirectory() as tmpdir:
            cache_path = os.path.join(tmpdir, "test_cache.json")
            with patch("exchange_rate_mcp.tools.CACHE_PATH", cache_path):
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

    def test_http_error(self):
        """Test that HTTP errors are properly handled."""
        get_exchange_rate_func = get_exchange_rate_function()

        with tempfile.TemporaryDirectory() as tmpdir:
            cache_path = os.path.join(tmpdir, "test_cache.json")
            with patch("exchange_rate_mcp.tools.CACHE_PATH", cache_path):
                with requests_mock.Mocker() as m:
                    m.get("https://api.frankfurter.app/2025-07-10?from=USD&to=ILS", status_code=500, text="Internal Server Error")

                    with pytest.raises(Exception, match="Failed to fetch exchange rate"):
                        get_exchange_rate_func("2025-07-10")


class TestHelperFunctions:
    """Test cases for helper functions."""

    def test_normalize_date(self):
        """Test date normalization."""
        assert _normalize_date("2025-07-10") == "2025-07-10"
        assert _normalize_date("07/10/2025") == "2025-07-10"
        assert _normalize_date("July 10, 2025") == "2025-07-10"

        with pytest.raises(ValueError):
            _normalize_date("invalid-date")

    def test_cache_operations(self):
        """Test cache load and save operations."""
        with tempfile.TemporaryDirectory() as tmpdir:
            cache_path = os.path.join(tmpdir, "test_cache.json")

            with patch("exchange_rate_mcp.tools.CACHE_PATH", cache_path):
                # Test empty cache
                assert _load_cache() == {}

                # Test saving and loading with new cache key format
                test_data = {"2025-07-10_USD_ILS": {"amount": 1.0, "base": "USD", "date": "2025-07-10", "rates": {"ILS": 3.3064}}}
                _save_cache(test_data)

                loaded_data = _load_cache()
                assert loaded_data == test_data
