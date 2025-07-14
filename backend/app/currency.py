"""Currency conversion using Frankfurter API with circuit breaker."""

import asyncio
import os
from decimal import ROUND_HALF_UP, Decimal

import httpx
from dateutil import parser as date_parser

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


def _normalize_date(date_str: str) -> str:
    """Normalize a date string to YYYY-MM-DD format."""
    try:
        # Parse the date string using dateutil which handles many formats
        parsed_date = date_parser.parse(date_str)
        # Return in YYYY-MM-DD format
        return parsed_date.strftime("%Y-%m-%d")
    except (ValueError, TypeError) as e:
        raise ValueError(f"Invalid date format: {date_str}") from e


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

    # Normalize the date to YYYY-MM-DD format
    norm_date = _normalize_date(date)

    # Normalize currency codes to uppercase
    from_currency = from_.upper()
    to_currency = to_.upper()

    # Make API request with httpx
    url = f"https://api.frankfurter.app/{norm_date}?from={from_currency}&to={to_currency}"
    
    # Get timeout from environment or default to 2.0 seconds
    timeout = float(os.getenv("FRANKFURTER_TIMEOUT", "2.0"))

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.get(url)

        if response.status_code != 200:
            await _circuit_breaker.record_failure()
            raise Exception(
                f"[get_rate] Failed to fetch exchange rate for {norm_date} ({from_currency} to {to_currency}). "
                f"Code {response.status_code} {response.reason_phrase}\n{response.text}"
            )

        data = response.json()

        # Extract the exchange rate from the response
        if to_currency not in data.get("rates", {}):
            await _circuit_breaker.record_failure()
            raise Exception(f"[get_rate] Currency {to_currency} not found in response for {norm_date}")

        rate = data["rates"][to_currency]

        # Reset failure count on complete success
        await _circuit_breaker.record_success()

        # Apply ROUND_HALF_UP rounding to 2 decimal places as required by milestone
        decimal_rate = Decimal(str(rate))
        return decimal_rate.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    except httpx.TimeoutException as e:
        await _circuit_breaker.record_failure()
        raise Exception(f"[get_rate] Request timeout for date {norm_date}") from e
    except httpx.RequestError as e:
        await _circuit_breaker.record_failure()
        raise Exception(f"[get_rate] Network error for date {norm_date}: {e}") from e
    except (ValueError, KeyError) as e:
        await _circuit_breaker.record_failure()
        raise Exception(f"[get_rate] Invalid JSON response for date {norm_date}") from e


async def reset_circuit_breaker() -> None:
    """Reset the circuit breaker failure count (for testing)."""
    global _circuit_breaker
    _circuit_breaker = CircuitBreaker()


async def get_failure_count() -> int:
    """Get current failure count (for testing)."""
    return await _circuit_breaker.get_failure_count()