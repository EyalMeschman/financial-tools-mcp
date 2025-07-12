# Invoice Converter Backend

FastAPI backend for the Invoice Converter application.

## Features

- Invoice data extraction using Azure Document Intelligence
- Currency conversion via Frankfurter API
- LangGraph pipeline orchestration
- Real-time progress tracking with Server-Sent Events
- Excel report generation

## Development

```bash
# Install dependencies
poetry install

# Run tests
poetry run pytest

# Start development server
poetry run uvicorn app.main:app --reload
```