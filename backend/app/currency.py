"""Currency conversion using Frankfurter API with circuit breaker."""

import asyncio
import os
from decimal import Decimal

import httpx


# Thread-safe circuit breaker state
class CircuitBreaker:
    """Thread-safe circuit breaker for API calls."""

    def __init__(self, max_failures: int = 2):
        self._failure_count = 0
        self._max_failures = max_failures
        self._lock = asyncio.Lock()

    async def is_open(self) -> bool:
        """Check if circuit breaker is open (blocking calls)."""
        async with self._lock:
            return self._failure_count >= self._max_failures

    async def record_success(self) -> None:
        """Record successful API call."""
        async with self._lock:
            self._failure_count = 0

    async def record_failure(self) -> None:
        """Record failed API call."""
        async with self._lock:
            self._failure_count += 1

    async def get_failure_count(self) -> int:
        """Get current failure count (for testing)."""
        async with self._lock:
            return self._failure_count


# Global circuit breaker instance
_circuit_breaker = CircuitBreaker()


class FrankfurterDown(Exception):
    """Exception raised when Frankfurter API is down after max failures."""

    pass


async def get_rate(date: str, from_: str, to_: str) -> Decimal:
    """Get exchange rate from Frankfurter API with circuit breaker.

    Args:
        date: Date in any common format (YYYY-MM-DD, MM/DD/YYYY, DD-MM-YYYY, etc.)
        from_: Source currency code (e.g., "USD")
        to_: Target currency code (e.g., "ILS")

    Returns:
        Decimal: Exchange rate from source to target currency, rounded to 2 decimal places using ROUND_HALF_UP

    Raises:
        ValueError: If the date format is invalid
        FrankfurterDown: If API is down after 3 consecutive failures
        Exception: If the API request fails
    """
    # Check circuit breaker
    if await _circuit_breaker.is_open():
        failure_count = await _circuit_breaker.get_failure_count()
        raise FrankfurterDown(f"Frankfurter API is down after {failure_count + 1} consecutive failures")

    # Normalize currency codes to uppercase
    from_currency = from_.upper()
    to_currency = to_.upper()

    # Make API request with httpx
    url = f"https://api.frankfurter.app/{date}?from={from_currency}&to={to_currency}"

    # Get timeout from environment or default to 3.0 seconds
    timeout = float(os.getenv("FRANKFURTER_TIMEOUT", "3.0"))

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.get(url)

        if response.status_code != 200:
            await _circuit_breaker.record_failure()
            raise Exception(
                f"[get_rate] Failed to fetch exchange rate for {date} ({from_currency} to {to_currency}). "
                f"Code {response.status_code} {response.reason_phrase}\n{response.text}"
            )

        data = response.json()

        # Extract the exchange rate from the response
        if to_currency not in data.get("rates", {}):
            await _circuit_breaker.record_failure()
            raise Exception(f"[get_rate] Currency {to_currency} not found in response for {date}")

        rate = data["rates"][to_currency]

        # Reset failure count on complete success
        await _circuit_breaker.record_success()

        return Decimal(str(rate))

    except httpx.TimeoutException as e:
        await _circuit_breaker.record_failure()
        raise Exception(f"[get_rate] Request timeout for date {date}") from e
    except httpx.RequestError as e:
        await _circuit_breaker.record_failure()
        raise Exception(f"[get_rate] Network error for date {date}: {e}") from e
    except (ValueError, KeyError) as e:
        await _circuit_breaker.record_failure()
        raise Exception(f"[get_rate] Invalid JSON response for date {date}") from e


async def reset_circuit_breaker() -> None:
    """Reset the circuit breaker failure count (for testing)."""
    global _circuit_breaker
    _circuit_breaker = CircuitBreaker()


async def get_failure_count() -> int:
    """Get current failure count (for testing)."""
    return await _circuit_breaker.get_failure_count()
