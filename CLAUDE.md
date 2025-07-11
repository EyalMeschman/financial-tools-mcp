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
ruff check .   # Lint code
pytest         # Run all tests
```

**Run MCP Server:**
```bash
python server.py  # Start the MCP server
```

## Architecture

This is a financial tools suite with two main components:

1. **MCP Exchange Rate Tool**: Currency conversion using the Frankfurter API
2. **Invoice Data Extractor**: PDF invoice processing using Azure Document Intelligence

**Core Components:**
- `src/mcp_tools/exchange_rate.py`: Exchange rate tool using FastMCP framework
- `src/extractors/invoice_extractor.py`: Azure Document Intelligence integration
- `server.py`: MCP server entry point (also available at `src/mcp_tools/server.py`)
- `ExchangeRate` and `InvoiceData` dataclasses: Structured response formats
- Persistent caching in `~/.cache/exchange_rate_cache.json` with currency-specific keys

**Key Functions:**
- `get_exchange_rate(date: str, from_currency: str = "USD", to_currency: str = "ILS") -> dict`
- `extract_invoice_data(pdf_path: str) -> dict`

**Exchange Rate Data Flow:**
1. Date normalization using `dateutil.parser`
2. Cache lookup with key format: `{date}_{from_currency}_{to_currency}`
3. Frankfurter API call if not cached
4. Response validation and caching
5. Return structured dictionary

**Invoice Extractor Setup:**
- Requires Azure Document Intelligence credentials in `.env`
- Environment variables: `AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT`, `AZURE_DOCUMENT_INTELLIGENCE_KEY`
- Optional: `AZURE_RESOURCE_ID` for usage quota monitoring

**Testing:**
- Exchange rate tests in `tests/test_get_exchange_rate.py` using `requests-mock`
- Invoice extractor tests in `tests/test_azure_invoice_extractor.py` with mocked Azure client
- Run individual test files: `pytest tests/test_get_exchange_rate.py`
- Run specific test classes: `pytest tests/test_azure_invoice_extractor.py::TestInvoiceData`

**Error Handling:**
- `ValueError` for invalid date formats and missing Azure credentials
- `Exception` for network/API failures with detailed messages
- Graceful cache write failures (performance optimization)