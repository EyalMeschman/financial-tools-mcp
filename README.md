# ExchangeRateMCP

[![CI](https://github.com/yourusername/ExchangeRateMCP/actions/workflows/ci.yml/badge.svg)](https://github.com/yourusername/ExchangeRateMCP/actions/workflows/ci.yml)

A Model Context Protocol (MCP) tool that provides exchange rates between any two currencies for any given date using the Frankfurter API.

## Features

- **Multi-Currency Support**: `get_exchange_rate(date: str, from_currency: str = "USD", to_currency: str = "ILS") → dict`
- **Flexible Date Input**: Accepts dates in various formats (YYYY-MM-DD, MM/DD/YYYY, "July 10, 2025", etc.)
- **Persistent Caching**: Stores exchange rates with currency-specific keys in `~/.exchange_rate_cache.json`
- **Reliable Data Source**: Uses the Frankfurter API for historical exchange rates
- **Error Handling**: Proper exception handling for invalid dates, network errors, and API failures

## Installation

### Option 1: Local Installation
```bash
# Install with pip
pip install -e .

# Or with dev dependencies
pip install -e .[dev]
```

### Option 2: Development Container (Recommended)
```bash
# Using VS Code Dev Containers extension
# 1. Open project in VS Code
# 2. Press Ctrl+Shift+P
# 3. Select "Dev Containers: Reopen in Container"

# Or using Docker Compose
docker-compose -f .devcontainer/docker-compose.yml up -d
```

## Usage

### As a Python Module

```python
from exchange_rate_mcp.tools import mcp

# Get the exchange rate function
get_exchange_rate_func = None
for tool in mcp._tool_manager._tools.values():
    if hasattr(tool, "fn") and tool.fn.__name__ == "get_exchange_rate":
        get_exchange_rate_func = tool.fn
        break

# Default: USD to ILS
result = get_exchange_rate_func("2025-07-10")
print(result)
# → {"amount": 1.0, "base": "USD", "date": "2025-07-10", "rates": {"ILS": 3.3064}}

# Custom currencies: EUR to GBP
result = get_exchange_rate_func("2025-07-10", "EUR", "GBP")
print(result)
# → {"amount": 1.0, "base": "EUR", "date": "2025-07-10", "rates": {"GBP": 0.8520}}

# Works with various date formats
result = get_exchange_rate_func("July 10, 2025", "JPY", "USD")
```

## Cache

Exchange rates are cached in `~/.exchange_rate_cache.json` with currency-specific keys (e.g., `"2025-07-10_USD_ILS"`) to improve performance and reduce API calls. The cache persists across process restarts and each currency pair for each date is only fetched once.

## Error Handling

The tool raises Python exceptions for various error conditions:
- Invalid date formats raise `ValueError`
- Network timeouts and API errors raise `Exception` with detailed error messages
- Non-200 HTTP responses include the status code and response body

## Development

```bash
# Install development dependencies
uv pip install -e ".[dev]"

# Format code
black .

# Lint code
ruff .

# Run tests
pytest
```

## License

MIT License - see LICENSE file for details.
