# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

**Development Setup:**
```bash
pip install -e ".[dev]"  # Install with dev dependencies
```

**Code Quality:**
```bash
black .        # Format code (line-length 140)
ruff .         # Lint code
pytest         # Run all tests
```

**Run MCP Server:**
```bash
python server.py  # Start the MCP server
```

## Architecture

This is an MCP (Model Context Protocol) tool that provides exchange rate functionality using the Frankfurter API.

**Core Components:**
- `src/exchange_rate_mcp/tools.py`: Main tool implementation using FastMCP framework
- `server.py`: MCP server entry point
- `ExchangeRate` dataclass: Structured response format
- Persistent caching in `~/.exchange_rate_cache.json` with currency-specific keys

**Key Function:**
`get_exchange_rate(date: str, from_currency: str = "USD", to_currency: str = "ILS") -> dict`

**Data Flow:**
1. Date normalization using `dateutil.parser`
2. Cache lookup with key format: `{date}_{from_currency}_{to_currency}`
3. Frankfurter API call if not cached
4. Response validation and caching
5. Return structured dictionary

**Testing:**
- Main tests in `tests/test_get_exchange_rate.py`
- Uses `requests-mock` for API mocking
- Additional simple tests in root directory

**Error Handling:**
- `ValueError` for invalid date formats
- `Exception` for network/API failures with detailed messages
- Graceful cache write failures (performance optimization)