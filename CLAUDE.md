# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

**Development Setup:**
```bash
# MCP Server (uses uv package manager)
pip install -e ".[dev]"  # Install with dev dependencies

# Backend Web App (uses Poetry)
cd backend && poetry install  # Install backend dependencies
cd backend && poetry install --with=proto  # Include prototype dependencies

# Frontend Web App
cd frontend && npm install  # Install frontend dependencies
```

**Code Quality:**
```bash
# Python/Backend
black .        # Format code (line-length 120)
ruff check .   # Lint code
pytest         # Run all tests
pytest tests/test_get_exchange_rate.py  # Run specific test file
pytest tests/test_azure_invoice_extractor.py::TestInvoiceData  # Run specific test class

# Frontend
cd frontend && npm run lint         # ESLint checking
cd frontend && npm test -- --watchAll=false --coverage  # Run tests with coverage
cd frontend && npm run build        # TypeScript compile and build
```

**Run Services:**
```bash
python server.py  # Start the MCP server

# Web application (implemented):
cd backend && poetry run uvicorn app.main:app --reload  # Backend dev server
cd frontend && npm run dev  # Frontend dev server

# Database migrations:
cd backend && poetry run alembic upgrade head  # Apply migrations
cd backend && poetry run alembic revision --autogenerate -m "description"  # Create migration
```

## Architecture

This is a financial tools suite with a monorepo structure containing an MCP server implementation and a React + FastAPI web application for invoice processing:

### Project Structure:
```
/workspaces/financial-tools-mcp/
├── server.py                    # MCP server entry point
├── src/proto/                   # Current prototype implementation
│   ├── mcp_tools/               # MCP tools (exchange rate)
│   └── extractors/              # Invoice processing (Azure)
├── tests/                       # Unit tests for prototype components
├── backend/                     # Planned FastAPI web application
│   ├── app/                     # FastAPI application code
│   ├── pyproject.toml           # Poetry configuration
│   └── tests/                   # Backend unit tests
└── frontend/                    # Planned React web application
    ├── src/                     # React components and logic
    ├── package.json             # npm configuration
    └── __tests__/               # Frontend unit tests
```

### Current Implementation:
1. **MCP Exchange Rate Tool**: Currency conversion using the Frankfurter API
2. **Invoice Data Extractor**: PDF invoice processing using Azure Document Intelligence
3. **React Frontend**: File upload interface with real-time progress tracking
4. **FastAPI Backend**: REST API with SSE support and SQLite database

### Web Application Features (Invoice Converter):
**Frontend (React + TypeScript):**
- **File Upload**: Drag-and-drop interface supporting PDF/JPEG/PNG (≤1MB, max 100 files)
- **Real-time Progress**: Server-Sent Events integration with `useSse` hook
- **Progress Visualization**: Animated progress bars with percentage display
- **Type Safety**: Full TypeScript coverage with strict ESLint rules
- **Testing**: Jest + React Testing Library with 92%+ coverage

**Backend (FastAPI + SQLAlchemy):**
- **REST API**: Health checks and SSE endpoints implemented
- **Database**: SQLite with Job/File models and Alembic migrations
- **Real-time Updates**: SSE streaming for job progress tracking
- **Type Safety**: Pydantic models and SQLAlchemy 2.0 with type hints
- **Testing**: Comprehensive async test suite with FastAPI TestClient

### Planned Features:
- LangGraph pipeline orchestration for processing workflow
- Azure Document Intelligence integration for invoice data extraction
- Currency conversion API integration
- Excel report generation with styled workbook output
- Job queue and file processing management

**Core Components:**
- `src/proto/mcp_tools/exchange_rate.py`: Exchange rate tool using FastMCP framework
- `src/proto/extractors/invoice_extractor.py`: Azure Document Intelligence integration
- `server.py`: MCP server entry point
- `backend/app/main.py`: FastAPI application with health and SSE endpoints
- `backend/app/models.py`: SQLAlchemy Job and File models
- `backend/app/db.py`: Database session management
- `frontend/src/components/UploadArea.tsx`: File upload with drag-and-drop
- `frontend/src/components/ProgressBar.tsx`: Progress visualization component
- `frontend/src/hooks/useSse.ts`: Server-Sent Events integration hook
- `ExchangeRate` and `InvoiceData` dataclasses: Structured response formats

**Web Application Architecture:**
- **Frontend-Backend Communication**: REST API + Server-Sent Events for real-time updates
- **State Management**: React hooks with TypeScript for type-safe state
- **Database Design**: Job tracking with individual file status and error handling
- **File Processing**: Upload validation, batch processing, and progress reporting
- **Error Handling**: Graceful degradation with user-friendly error messages

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
- **MCP Server**: Exchange rate tests in `tests/test_get_exchange_rate.py` using `requests-mock`
- **MCP Server**: Invoice extractor tests in `tests/test_azure_invoice_extractor.py` with mocked Azure client
- **Backend**: FastAPI endpoint tests with async TestClient and database mocking
- **Frontend**: React component tests with Jest and React Testing Library (92%+ coverage)
- **Frontend**: SSE hook testing with mocked EventSource for real-time functionality
- Run individual test files: `pytest tests/test_get_exchange_rate.py`
- Run specific test classes: `pytest tests/test_azure_invoice_extractor.py::TestInvoiceData`

**Error Handling:**
- `ValueError` for invalid date formats and missing Azure credentials
- `Exception` for network/API failures with detailed messages

## Real-time Progress Integration (SSE)

**Frontend SSE Hook Pattern:**
```typescript
// Type-safe SSE hook with generic data typing
const { data: progressData } = useSse<ProgressData>(
  selectedFiles.length > 0 ? '/progress/demo' : ''
);

// Conditional connection - only connects when needed
// Automatic cleanup on component unmount
// Error handling for connection failures and JSON parsing
```

**Backend SSE Endpoint Pattern:**
```python
@app.get("/progress/{job_id}")
async def stream_progress(job_id: str):
    async def generate():
        for step in range(11):  # 0% to 100% in 10% increments
            progress_data = {
                "job_id": job_id,
                "status": "processing" if step < 10 else "completed",
                "percentage": step * 10
            }
            yield f"data: {json.dumps(progress_data)}\n\n"
            await asyncio.sleep(0.5)
    
    return StreamingResponse(
        generate(),
        media_type="text/plain",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"}
    )
```

**Integration Points:**
- Frontend `ProgressBar` component accepts percentage prop
- SSE data format: `{ job_id: string, status: string, percentage: number }`
- EventSource lifecycle managed by React hook with proper cleanup
- Mock endpoint `/progress/demo` for development testing

## Development Status and Next Steps

**Implemented Technology Stack:**
- **Frontend**: React 19 + Vite + TypeScript, Tailwind CSS 4, React Dropzone 14, Jest + RTL (npm)
- **Backend**: FastAPI + Uvicorn, SQLAlchemy 2.0 + Alembic, async/await patterns (Poetry)
- **MCP Server**: FastMCP framework with uv package manager
- **Database**: SQLite with typed models and migration system
- **Real-time**: Server-Sent Events for progress streaming
- **Testing**: Comprehensive test coverage across all layers

**Next Implementation Steps:**
- LangGraph pipeline orchestration for processing workflow
- Azure Document Intelligence integration for invoice data extraction
- Currency conversion API integration
- Excel report generation with openpyxl styling
- File upload endpoints and job management APIs

**Development Phases (from todo.md):**
- **P-0**: Repository setup and CI baseline
- **P-1**: Backend scaffold (FastAPI + SQLite)
- **P-2**: Frontend scaffold (React + Tailwind)
- **P-3**: Job lifecycle and SSE infrastructure
- **P-4**: LangGraph pipeline skeleton
- **P-5**: Azure Document Intelligence integration
- **P-6**: Currency conversion flow
- **P-7**: Excel report generation
- **P-8**: Full pipeline integration
- **P-9**: Frontend UX completion
- **P-10**: Docker packaging
- **P-11**: Testing and documentation

**Key Features:**
- Multi-file upload with drag-and-drop interface
- Real-time progress tracking via Server-Sent Events
- Currency conversion with 3-failure circuit breaker
- Styled Excel reports with invoice data
- Docker containerization for production deployment

**Workflow Reference:**
- See `todo.md` for detailed task breakdown
- See `prompt_plan.md` for step-by-step implementation prompts
- See `spec.md` for complete technical specification