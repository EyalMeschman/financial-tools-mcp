from __future__ import annotations

import json
import os
from dataclasses import asdict, dataclass

import requests
from dateutil import parser as date_parser
from mcp.server.fastmcp import FastMCP

CACHE_PATH = os.path.expanduser("~/.exchange_rate_cache.json")

# Create FastMCP instance
mcp = FastMCP("exchange-rate-mcp")


@dataclass
class ExchangeRate:
    """Data class representing an exchange rate response."""

    amount: int
    base: str
    date: str
    rates: dict[str, float]


def _load_cache() -> dict:
    """Load the exchange rate cache from disk."""
    if not os.path.exists(CACHE_PATH):
        return {}

    try:
        with open(CACHE_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return {}


def _save_cache(cache: dict) -> None:
    """Save the exchange rate cache to disk."""
    try:
        with open(CACHE_PATH, "w", encoding="utf-8") as f:
            json.dump(cache, f, indent=2)
    except IOError:
        # Silently ignore write errors - cache is a performance optimization
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


@mcp.tool()
def get_exchange_rate(date: str, from_currency: str = "USD", to_currency: str = "ILS") -> dict:
    """
    Fetch the exchange rate between two currencies for a specific date.

    Args:
        date: Date in any common format (YYYY-MM-DD, MM/DD/YYYY, DD-MM-YYYY, etc.)
        from_currency: Source currency code (default: "USD")
        to_currency: Target currency code (default: "ILS")

    Returns:
        Dictionary containing exchange rate data:
        {
            "amount": 1,
            "base": "<from_currency>",
            "date": "YYYY-MM-DD",
            "rates": {"<to_currency>": <float>}
        }

    Raises:
        ValueError: If the date format is invalid
        Exception: If the API request fails or returns non-200 status
    """
    # Normalize the date to YYYY-MM-DD format
    norm_date = _normalize_date(date)

    # Normalize currency codes to uppercase
    from_currency = from_currency.upper()
    to_currency = to_currency.upper()

    # Create a cache key that includes both currencies
    cache_key = f"{norm_date}_{from_currency}_{to_currency}"

    # Check cache first
    cache = _load_cache()
    if cache_key in cache:
        return cache[cache_key]

    # Make API request
    url = f"https://api.frankfurter.app/{norm_date}?from={from_currency}&to={to_currency}"

    try:
        resp = requests.get(url, timeout=10)
    except requests.exceptions.Timeout as e:
        raise Exception(f"[get_exchange_rate] Request timeout for date {norm_date}") from e
    except requests.exceptions.RequestException as e:
        raise Exception(f"[get_exchange_rate] Network error for date {norm_date}: {e}") from e

    if resp.status_code != 200:
        raise Exception(
            f"[get_exchange_rate] Failed to fetch exchange rate for {norm_date} ({from_currency} to {to_currency}). "
            f"Code {resp.status_code} {resp.reason}\n{resp.text}"
        )

    try:
        data = resp.json()
    except json.JSONDecodeError as e:
        raise Exception(f"[get_exchange_rate] Invalid JSON response for date {norm_date}") from e

    # Create ExchangeRate object and convert to dict
    exchange_rate = ExchangeRate(**data)
    result = asdict(exchange_rate)

    # Cache the result with the new key
    cache[cache_key] = result
    _save_cache(cache)

    return result


if __name__ == "__main__":
    mcp.run()
