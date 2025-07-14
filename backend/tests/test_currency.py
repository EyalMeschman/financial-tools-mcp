"""Tests for the currency module."""

from decimal import Decimal

import httpx
import pytest
import respx

from app.currency import FrankfurterDown, _normalize_date, get_failure_count, get_rate, reset_circuit_breaker


class TestGetRate:
    """Test cases for the get_rate function."""

    @pytest.fixture(autouse=True, scope="function")
    async def setup(self):
        """Reset circuit breaker before each test."""
        await reset_circuit_breaker()
        yield
        await reset_circuit_breaker()

    @pytest.mark.asyncio
    async def test_happy_path(self):
        """Test successful exchange rate retrieval with mocked response 1.2."""
        expected_response = {"amount": 1.0, "base": "USD", "date": "2025-07-10", "rates": {"EUR": 1.2}}

        with respx.mock:
            respx.get("https://api.frankfurter.app/2025-07-10?from=USD&to=EUR").mock(
                return_value=httpx.Response(200, json=expected_response)
            )

            result = await get_rate("2025-07-10", "USD", "EUR")

            assert result == Decimal("1.20")  # Should be rounded to 2 decimal places
            assert await get_failure_count() == 0

    @pytest.mark.asyncio
    async def test_currency_normalization(self):
        """Test that currency codes are normalized to uppercase."""
        expected_response = {"amount": 1.0, "base": "USD", "date": "2025-07-10", "rates": {"EUR": 1.5}}

        with respx.mock:
            respx.get("https://api.frankfurter.app/2025-07-10?from=USD&to=EUR").mock(
                return_value=httpx.Response(200, json=expected_response)
            )

            result = await get_rate("2025-07-10", "usd", "eur")

            assert result == Decimal("1.5")

    @pytest.mark.asyncio
    async def test_date_formats(self):
        """Test various date format inputs."""
        expected_response = {"amount": 1.0, "base": "USD", "date": "2025-07-10", "rates": {"EUR": 1.2}}

        date_formats = ["2025-07-10", "07/10/2025", "10 Jul 2025"]

        for date_format in date_formats:
            with respx.mock:
                respx.get("https://api.frankfurter.app/2025-07-10?from=USD&to=EUR").mock(
                    return_value=httpx.Response(200, json=expected_response)
                )

                result = await get_rate(date_format, "USD", "EUR")
                assert result == Decimal("1.20")  # Should be rounded to 2 decimal places

    @pytest.mark.asyncio
    async def test_failure_increments_counter(self):
        """Test that API failures increment the failure counter."""
        with respx.mock:
            respx.get("https://api.frankfurter.app/2025-07-10?from=USD&to=EUR").mock(
                return_value=httpx.Response(500, text="Internal Server Error")
            )

            with pytest.raises(Exception, match="Failed to fetch exchange rate"):
                await get_rate("2025-07-10", "USD", "EUR")

            assert await get_failure_count() == 1

    @pytest.mark.asyncio
    async def test_timeout_increments_counter(self):
        """Test that timeouts increment the failure counter."""
        # Ensure clean state
        await reset_circuit_breaker()

        with respx.mock:
            respx.get("https://api.frankfurter.app/2025-07-10?from=USD&to=EUR").mock(
                side_effect=httpx.TimeoutException("Timeout")
            )

            with pytest.raises(Exception, match="Request timeout"):
                await get_rate("2025-07-10", "USD", "EUR")

            assert await get_failure_count() == 1

    @pytest.mark.asyncio
    async def test_network_error_increments_counter(self):
        """Test that network errors increment the failure counter."""
        # Ensure clean state
        await reset_circuit_breaker()

        with respx.mock:
            respx.get("https://api.frankfurter.app/2025-07-10?from=USD&to=EUR").mock(
                side_effect=httpx.ConnectError("Connection failed")
            )

            with pytest.raises(Exception, match="Network error"):
                await get_rate("2025-07-10", "USD", "EUR")

            assert await get_failure_count() == 1

    @pytest.mark.asyncio
    async def test_third_failure_raises_frankfurter_down(self):
        """Test that the third consecutive failure raises FrankfurterDown."""
        # Ensure clean state
        await reset_circuit_breaker()

        # First two failures
        for i in range(2):
            with respx.mock:
                respx.get("https://api.frankfurter.app/2025-07-10?from=USD&to=EUR").mock(
                    return_value=httpx.Response(500, text="Internal Server Error")
                )

                with pytest.raises(Exception, match="Failed to fetch exchange rate"):
                    await get_rate("2025-07-10", "USD", "EUR")

                assert await get_failure_count() == i + 1

        # Third failure should raise FrankfurterDown without making a request
        with pytest.raises(FrankfurterDown, match="Frankfurter API is down after 3 consecutive failures"):
            await get_rate("2025-07-10", "USD", "EUR")

        assert await get_failure_count() == 2  # Should stay at 2 since circuit breaker prevented the 3rd request

    @pytest.mark.asyncio
    async def test_success_resets_failure_count(self):
        """Test that successful requests reset the failure counter."""
        # Ensure clean state
        await reset_circuit_breaker()

        # First failure
        with respx.mock:
            respx.get("https://api.frankfurter.app/2025-07-10?from=USD&to=EUR").mock(
                return_value=httpx.Response(500, text="Internal Server Error")
            )

            with pytest.raises(Exception, match="Failed to fetch exchange rate"):
                await get_rate("2025-07-10", "USD", "EUR")

            assert await get_failure_count() == 1

        # Successful request should reset counter
        expected_response = {"amount": 1.0, "base": "USD", "date": "2025-07-10", "rates": {"EUR": 1.2}}

        with respx.mock:
            respx.get("https://api.frankfurter.app/2025-07-10?from=USD&to=EUR").mock(
                return_value=httpx.Response(200, json=expected_response)
            )

            result = await get_rate("2025-07-10", "USD", "EUR")

            assert result == Decimal("1.20")  # Should be rounded to 2 decimal places
            assert await get_failure_count() == 0

    @pytest.mark.asyncio
    async def test_invalid_json_response(self):
        """Test handling of invalid JSON responses."""
        # Ensure clean state
        await reset_circuit_breaker()

        with respx.mock:
            respx.get("https://api.frankfurter.app/2025-07-10?from=USD&to=EUR").mock(
                return_value=httpx.Response(200, text="Not JSON")
            )

            with pytest.raises(Exception, match="Invalid JSON response"):
                await get_rate("2025-07-10", "USD", "EUR")

            assert await get_failure_count() == 1

    @pytest.mark.asyncio
    async def test_missing_currency_in_response(self):
        """Test handling when target currency is missing from response."""
        # Ensure clean state
        await reset_circuit_breaker()

        incomplete_response = {"amount": 1.0, "base": "USD", "date": "2025-07-10", "rates": {}}

        with respx.mock:
            respx.get("https://api.frankfurter.app/2025-07-10?from=USD&to=EUR").mock(
                return_value=httpx.Response(200, json=incomplete_response)
            )

            with pytest.raises(Exception, match="Currency EUR not found in response"):
                await get_rate("2025-07-10", "USD", "EUR")

            assert await get_failure_count() == 1

    @pytest.mark.asyncio
    async def test_invalid_date_format(self):
        """Test that invalid dates raise ValueError."""
        # Ensure clean state
        await reset_circuit_breaker()

        with pytest.raises(ValueError, match="Invalid date format"):
            # This should fail in date normalization before making any request
            await get_rate("invalid-date-32-13-2025", "USD", "EUR")


class TestDateNormalization:
    """Test cases for date normalization helper function."""

    def test_normalize_date_formats(self):
        """Test various date format normalization."""
        assert _normalize_date("2025-07-10") == "2025-07-10"
        assert _normalize_date("07/10/2025") == "2025-07-10"
        assert _normalize_date("July 10, 2025") == "2025-07-10"
        assert _normalize_date("10 Jul 2025") == "2025-07-10"

    def test_normalize_date_invalid(self):
        """Test that invalid dates raise ValueError."""
        with pytest.raises(ValueError, match="Invalid date format"):
            _normalize_date("invalid-date")

        with pytest.raises(ValueError, match="Invalid date format"):
            _normalize_date("32-13-2025")


class TestCircuitBreakerHelpers:
    """Test cases for circuit breaker helper functions."""

    @pytest.mark.asyncio
    async def test_reset_circuit_breaker(self):
        """Test circuit breaker reset functionality."""
        # Reset circuit breaker and verify it's at 0
        await reset_circuit_breaker()
        assert await get_failure_count() == 0

        # Simulate some failures by manually calling record_failure
        from app.currency import _circuit_breaker

        await _circuit_breaker.record_failure()
        await _circuit_breaker.record_failure()

        assert await get_failure_count() == 2

        # Reset and verify it's back to 0
        await reset_circuit_breaker()
        assert await get_failure_count() == 0

    @pytest.mark.asyncio
    async def test_get_failure_count(self):
        """Test failure count getter."""
        await reset_circuit_breaker()
        assert await get_failure_count() == 0

        # Manually increment count to test getter
        from app.currency import _circuit_breaker

        await _circuit_breaker.record_failure()
        await _circuit_breaker.record_failure()
        await _circuit_breaker.record_failure()

        assert await get_failure_count() == 3
