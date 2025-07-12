# Financial Tools MCP

[![CI](https://github.com/yourusername/financial-tools-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/yourusername/financial-tools-mcp/actions/workflows/ci.yml)

A comprehensive financial tools suite featuring an MCP server for exchange rates and a standalone invoice data extractor.

## Components

### 1. Exchange Rate MCP Server
- **Multi-Currency Support**: `get_exchange_rate(date: str, from_currency: str = "USD", to_currency: str = "ILS") → dict`
- **Flexible Date Input**: Accepts dates in various formats (YYYY-MM-DD, MM/DD/YYYY, "July 10, 2025", etc.)
- **Reliable Data Source**: Uses the Frankfurter API for historical exchange rates
- **Error Handling**: Proper exception handling for invalid dates, network errors, and API failures

### 2. Invoice Data Extractor
- **Azure Document Intelligence**: Processes PDF invoices using Azure's prebuilt invoice model
- **Structured Data Extraction**: Extracts date, invoice suffix, price, currency, and company information
- **Usage Monitoring**: Optional quota tracking for Azure F0 tier (500 pages/month limit)
- **Environment Configuration**: Uses `.env` file for Azure credentials

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

### 1. MCP Server (Exchange Rates)

Start the MCP server:
```bash
python server.py
```

**As a Python Module:**
```python
from mcp_tools.exchange_rate import mcp

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
```

### 2. Invoice Data Extractor

**Setup Environment Variables (.env file):**
```bash
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=https://your-resource.cognitiveservices.azure.com/
AZURE_DOCUMENT_INTELLIGENCE_API_KEY=your-api-key-here
AZURE_DOCUMENT_INTELLIGENCE_RESOURCE_ID=/subscriptions/.../resourceGroups/.../providers/Microsoft.CognitiveServices/accounts/your-resource  # Optional for quota monitoring
```

**Use as Python Module:**
```python
from extractors.invoice_extractor import extract_invoice_data_azure, check_usage_quota

# Check current usage (optional)
usage = check_usage_quota()
if usage:
    print(f"Pages used: {usage['used']}/{usage['total_limit']}")

# Extract invoice data
invoice_data = extract_invoice_data_azure("path/to/invoice.pdf")
if invoice_data:
    print(f"Date: {invoice_data.date}")
    print(f"Invoice Suffix: {invoice_data.invoice_suffix}")
    print(f"Price: {invoice_data.format_price()}")
    print(f"Company: {invoice_data.company}")
    
    # Convert to dictionary
    data_dict = invoice_data.to_dict()
```

**Direct Execution:**
```bash
python src/extractors/invoice_extractor.py  # Processes payment.pdf in current directory
```

## Project Structure

```
src/
├── mcp_tools/           # MCP server components
│   ├── exchange_rate.py # Exchange rate tool using FastMCP framework
│   └── server.py        # MCP server entry point
└── extractors/          # Data extraction utilities
    └── invoice_extractor.py # Azure Document Intelligence integration

tests/
├── test_get_exchange_rate.py      # Exchange rate tests
└── test_azure_invoice_extractor.py # Invoice extractor tests
```

## Error Handling

**Exchange Rate Tool:**
- Invalid date formats raise `ValueError`
- Network timeouts and API errors raise `Exception` with detailed error messages
- Non-200 HTTP responses include the status code and response body

**Invoice Extractor:**
- Missing Azure credentials return `None` with helpful error messages
- Azure API errors are caught and logged with graceful fallback
- File not found errors are handled with clear user feedback

## Development

```bash
# Install development dependencies
pip install -e ".[dev]"

# Format code
black .

# Lint code
ruff check .

# Run all tests
pytest

# Run specific test files
pytest tests/test_get_exchange_rate.py
pytest tests/test_azure_invoice_extractor.py

# Run specific test classes
pytest tests/test_azure_invoice_extractor.py::TestInvoiceData
```

## Requirements

- **Python**: >= 3.12
- **Core Dependencies**: `requests`, `python-dateutil`, `mcp`, `azure-ai-documentintelligence`, `python-dotenv`
- **Development**: `black`, `ruff`, `pytest`, `requests-mock`
- **Azure Setup**: Document Intelligence resource (F0 tier sufficient for testing)

## License

MIT License - see LICENSE file for details.
