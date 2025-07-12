from __future__ import annotations

from dataclasses import asdict, dataclass

import requests
from dateutil import parser as date_parser
from mcp.server.fastmcp import FastMCP
from requests.exceptions import JSONDecodeError

# Create FastMCP instance
mcp = FastMCP("exchange-rate-mcp")


@dataclass
class ExchangeRate:
    """Data class representing an exchange rate response."""

    amount: int
    base: str
    date: str
    rates: dict[str, float]


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
    except JSONDecodeError as e:
        raise Exception(f"[get_exchange_rate] Invalid JSON response for date {norm_date}") from e

    # Create ExchangeRate object and convert to dict
    exchange_rate = ExchangeRate(**data)
    result = asdict(exchange_rate)

    return result


if __name__ == "__main__":
    mcp.run()
