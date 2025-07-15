# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

**Development Setup:**
```bash
# Backend Web App (uses Poetry)
cd backend && poetry install  # Install backend dependencies
cd backend && poetry install --with=proto  # Include prototype dependencies

# Frontend Web App
cd frontend && npm install  # Install frontend dependencies

# Docker (Production)
docker-compose up --build  # Build and run containerized application
```

**Code Quality:**
```bash
# Backend (from backend/ directory)
poetry run black .        # Format code (line-length 120)
poetry run ruff check .   # Lint code
poetry run pytest         # Run all tests
poetry run pytest tests/test_currency.py  # Run specific test file
poetry run pytest tests/test_azure_adapter.py::TestInvoiceData  # Run specific test class

# Frontend
cd frontend && npm run lint         # ESLint checking
cd frontend && npm test -- --watchAll=false --coverage  # Run tests with coverage
cd frontend && npm run build        # TypeScript compile and build
```

**Run Services:**
```bash
# Web application (development):
cd backend && poetry run uvicorn app.main:app --reload  # Backend dev server
cd frontend && npm run dev  # Frontend dev server

# Production (Docker):
docker-compose up --build  # Full application with frontend + backend
docker-compose up -d  # Run in background

# Database migrations:
cd backend && poetry run alembic upgrade head  # Apply migrations
cd backend && poetry run alembic revision --autogenerate -m "description"  # Create migration
```

## Architecture

This is a financial tools suite with a React + FastAPI web application for invoice processing with currency conversion capabilities:

### Project Structure:
```
/financial-tools-mcp/
├── docker-compose.yml           # Production deployment configuration
├── backend/                     # FastAPI web application
│   ├── Dockerfile               # Multi-stage build (frontend + backend)
│   ├── app/                     # FastAPI application code
│   │   ├── main.py              # FastAPI app with health, SSE, and static file serving
│   │   ├── models.py            # SQLAlchemy Job and File models
│   │   ├── azure_adapter.py     # Azure Document Intelligence integration
│   │   ├── currency.py          # Frankfurter API client with circuit breaker
│   │   └── db.py                # Database session management
│   ├── langgraph_nodes/         # LangGraph processing pipeline
│   ├── tests/                   # Backend unit tests
│   └── pyproject.toml           # Poetry configuration
└── frontend/                    # React web application
    ├── src/                     # React components and logic
    │   ├── components/          # Upload and progress components
    │   └── hooks/               # SSE integration hook
    ├── package.json             # npm configuration
    └── __tests__/               # Frontend unit tests
```

### Current Implementation:

**Core Backend Services:**
1. **Currency Conversion**: Modern async Frankfurter API client (`app/currency.py`)
   - `async def get_rate(date: str, from_: str, to_: str) -> Decimal`
   - 3-strike circuit breaker with module-level state tracking
   - 2-second timeout with httpx AsyncClient
   - Comprehensive error handling and date normalization

2. **Azure Document Intelligence**: Invoice extraction (`app/azure_adapter.py`)
   - Hybrid dataclass architecture: robust internal structure + simple API format
   - `async def extract_invoice(path: str) -> InvoiceData | None`
   - `def to_simple_format(invoice: InvoiceData, filename: str) -> SimpleInvoiceData`
   - Full Azure SDK integration with proper async patterns

3. **FastAPI Backend**: REST API with real-time capabilities
   - Health checks and SSE endpoints implemented
   - Static file serving for React frontend (production)
   - SQLite database with Job/File models and Alembic migrations
   - Async request handling with proper type hints

**Frontend (React + TypeScript):**
- **File Upload**: Drag-and-drop interface supporting PDF/JPEG/PNG (≤1MB, max 100 files)
- **Real-time Progress**: Server-Sent Events integration with `useSse` hook
- **Progress Visualization**: Animated progress bars with percentage display
- **Type Safety**: Full TypeScript coverage with strict ESLint rules
- **Testing**: Jest + React Testing Library with 92%+ coverage

### Key Architectural Patterns:

**Hybrid Data Architecture (Azure Adapter):**
The Azure adapter uses a dual-format approach:
- **Internal**: Robust nested dataclasses (`InvoiceData`, `DefaultContent`, `ValueCurrency`)
- **API**: Simplified format (`SimpleInvoiceData`) for JSON serialization
- **Conversion**: Helper functions bridge between formats for different use cases

**Circuit Breaker Pattern (Currency Service):**
```python
# Module-level failure tracking
_failure_count = 0
_max_failures = 2  # Block on 3rd attempt

async def get_rate(date: str, from_: str, to_: str) -> Decimal:
    if _failure_count >= _max_failures:
        raise FrankfurterDown("API is down after consecutive failures")
    # ... API call with failure count management
```

**Server-Sent Events Architecture:**
```typescript
// Frontend: Type-safe SSE hook with generic data typing
const { data: progressData } = useSse<ProgressData>(
  selectedFiles.length > 0 ? '/progress/demo' : ''
);

// Backend: Async generator pattern for streaming
async def generate():
    for step in range(11):
        yield f"data: {json.dumps(progress_data)}\n\n"
        await asyncio.sleep(0.5)
```

### Data Models:

**Currency Service:**
- Uses `Decimal` for precise monetary calculations
- Date normalization with `dateutil.parser` for flexible input formats
- Circuit breaker exceptions: `FrankfurterDown` after 3 consecutive failures

**Invoice Data Models:**
- `InvoiceData`: Nested structure matching Azure response format
- `SimpleInvoiceData`: Flat structure for API responses with optional fields
- Conversion helpers maintain data integrity across format boundaries

**Database Models (SQLAlchemy 2.0):**
- `Job`: Processing job tracking with status and metadata
- `File`: Individual file tracking within jobs
- Async session management with proper transaction handling

### Testing Strategy:

**Backend Testing (39 tests):**
- **Currency Module**: httpx mocking with respx, circuit breaker verification
- **Azure Adapter**: Mock Azure SDK calls, data format conversion testing
- **FastAPI Endpoints**: TestClient with async support, database mocking
- **Integration**: Real API call recording with pytest-vcr (when available)

**Frontend Testing (92%+ coverage):**
- **Component Testing**: Jest + React Testing Library for UI components
- **Hook Testing**: EventSource mocking for SSE functionality
- **Type Safety**: Full TypeScript coverage with strict linting

### Environment Setup:

**Required Environment Variables:**
```bash
# Azure Document Intelligence (required for invoice extraction)
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=https://your-resource.cognitiveservices.azure.com/
AZURE_DOCUMENT_INTELLIGENCE_API_KEY=your-api-key

# Optional: For usage monitoring
AZURE_DOCUMENT_INTELLIGENCE_RESOURCE_ID=your-resource-id
```

**Development Dependencies:**
- **Backend**: Poetry with Python 3.11+, async libraries (httpx, respx for testing)
- **Frontend**: Node.js with React 19, TypeScript, Tailwind CSS 4
- **Database**: SQLite with Alembic migrations
- **Code Quality**: ruff + black for Python, ESLint + Prettier for TypeScript

## Development Workflow

**Testing Patterns:**
```bash
# Run specific service tests
poetry run pytest tests/test_currency.py -v
poetry run pytest tests/test_azure_adapter.py::TestConversionHelpers -v

# Test coverage and quality
poetry run pytest --cov=app tests/
poetry run ruff check . && poetry run black . --check

# Frontend testing
cd frontend && npm test -- --coverage --watchAll=false
```

**Common Development Tasks:**
1. **Adding New Endpoints**: Follow FastAPI async patterns in `app/main.py`
2. **Database Changes**: Use Alembic autogenerate for schema migrations
3. **Frontend Components**: Implement with TypeScript + testing in parallel
4. **API Integration**: Use circuit breaker pattern for external service calls

**Architecture Decision Records:**
- **Currency Service**: Chose httpx over requests for async compatibility
- **Azure Integration**: Hybrid data format balances robustness vs. API simplicity  
- **SSE Implementation**: EventSource over WebSockets for simpler real-time updates
- **Testing Strategy**: Mock external APIs, focus on integration patterns

## Production Deployment

**Docker Architecture:**
The application uses a multi-stage Docker build:
1. **Stage 1**: Node.js builds the React frontend (`npm run build` → `/dist`)
2. **Stage 2**: Python runtime serves FastAPI backend + static frontend files
3. **Single Container**: Complete application accessible on port 8080

**Key Endpoints:**
- `GET /` - Serves React frontend application
- `POST /process-invoices` - Upload and process invoice files
- `GET /progress/{job_id}` - Server-Sent Events for real-time progress
- `GET /download/{job_id}` - Download generated Excel reports
- `GET /health` - Health check for monitoring

**Environment Variables (Required):**
```bash
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=https://your-resource.cognitiveservices.azure.com/
AZURE_DOCUMENT_INTELLIGENCE_API_KEY=your-api-key
```

**Pipeline Integration:**
The `langgraph_nodes/` directory contains the processing pipeline that orchestrates:
1. File upload and validation
2. Azure document extraction  
3. Currency conversion
4. Excel report generation
5. Progress tracking via SSE

This system provides scalable invoice processing with real-time user feedback and robust error handling across all integration points.