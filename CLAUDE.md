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
- `server.py`: MCP server entry point
- `ExchangeRate` and `InvoiceData` dataclasses: Structured response formats

**Key Functions:**
- `get_exchange_rate(date: str, from_currency: str = "USD", to_currency: str = "ILS") -> dict`
- `extract_invoice_data_azure(pdf_path: str) -> Optional[InvoiceData]`

**Exchange Rate Data Flow:**
1. Date normalization using `dateutil.parser`
2. Frankfurter API call.
3. Response validation
4. Return structured dictionary

**Invoice Extractor Data Models:**
- `InvoiceData`: Main dataclass with `InvoiceDate`, `InvoiceId`, `InvoiceTotal`, `VendorName`, `VendorAddressRecipient` fields
- `DefaultContent`: Simple wrapper for text content with `.content` attribute
- `InvoiceTotal`: Wrapper for invoice total with `.value_currency` (ValueCurrency object) and `.content` attributes
- `ValueCurrency`: Wrapper for monetary values with `.amount` and `.currency_code` attributes
- `from_azure_response(azure_result) -> Optional[InvoiceData]`: Converts Azure API response to structured data

**Invoice Extractor Setup:**
- Requires Azure Document Intelligence credentials in `.env`
- Environment variables: `AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT`, `AZURE_DOCUMENT_INTELLIGENCE_API_KEY`
- Optional: `AZURE_DOCUMENT_INTELLIGENCE_RESOURCE_ID` for usage quota monitoring

**Testing:**
- Exchange rate tests in `tests/test_get_exchange_rate.py` using `requests-mock`
- Invoice extractor tests in `tests/test_azure_invoice_extractor.py` with mocked Azure client
- Run individual test files: `pytest tests/test_get_exchange_rate.py`
- Run specific test classes: `pytest tests/test_azure_invoice_extractor.py::TestInvoiceData`

**Error Handling:**
- `ValueError` for invalid date formats and missing Azure credentials
- `Exception` for network/API failures with detailed messages