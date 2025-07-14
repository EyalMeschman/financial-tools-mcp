"""Currency conversion using Frankfurter API with circuit breaker."""

from decimal import Decimal

import httpx
from dateutil import parser as date_parser

# Module-level circuit breaker state
_failure_count = 0
_max_failures = 2  # Block on 3rd attempt (after 2 failures)


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
        Decimal: Exchange rate from source to target currency

    Raises:
        ValueError: If the date format is invalid
        FrankfurterDown: If API is down after 3 consecutive failures
        Exception: If the API request fails
    """
    global _failure_count

    # Check circuit breaker
    if _failure_count >= _max_failures:
        raise FrankfurterDown(f"Frankfurter API is down after {_max_failures + 1} consecutive failures")

    # Normalize the date to YYYY-MM-DD format
    norm_date = _normalize_date(date)

    # Normalize currency codes to uppercase
    from_currency = from_.upper()
    to_currency = to_.upper()

    # Make API request with httpx
    url = f"https://api.frankfurter.app/{norm_date}?from={from_currency}&to={to_currency}"

    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            response = await client.get(url)

        if response.status_code != 200:
            _failure_count += 1
            raise Exception(
                f"[get_rate] Failed to fetch exchange rate for {norm_date} ({from_currency} to {to_currency}). "
                f"Code {response.status_code} {response.reason_phrase}\n{response.text}"
            )

        data = response.json()

        # Extract the exchange rate from the response
        if to_currency not in data.get("rates", {}):
            _failure_count += 1
            raise Exception(f"[get_rate] Currency {to_currency} not found in response for {norm_date}")

        rate = data["rates"][to_currency]

        # Reset failure count only on complete success
        _failure_count = 0

        return Decimal(str(rate))

    except httpx.TimeoutException as e:
        _failure_count += 1
        raise Exception(f"[get_rate] Request timeout for date {norm_date}") from e
    except httpx.RequestError as e:
        _failure_count += 1
        raise Exception(f"[get_rate] Network error for date {norm_date}: {e}") from e
    except (ValueError, KeyError) as e:
        _failure_count += 1
        raise Exception(f"[get_rate] Invalid JSON response for date {norm_date}") from e


def reset_circuit_breaker() -> None:
    """Reset the circuit breaker failure count (for testing)."""
    global _failure_count
    _failure_count = 0


def get_failure_count() -> int:
    """Get current failure count (for testing)."""
    return _failure_count
