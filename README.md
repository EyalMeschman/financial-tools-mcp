# Financial Tools Suite

A comprehensive invoice processing application with currency conversion capabilities, featuring a React frontend and FastAPI backend.

## Features

### 🧾 Invoice Processing
- **Drag & Drop Upload**: Support for PDF, JPEG, and PNG files (up to 1MB, max 100 files)
- **Azure Document Intelligence**: Automated data extraction from invoice documents
- **Real-time Progress**: Server-Sent Events for live processing updates
- **Excel Export**: Generate structured reports with converted currency amounts

### 💱 Currency Conversion
- **Multi-Currency Support**: Convert between 30+ currencies using real-time rates
- **Historical Rates**: Support for date-specific exchange rates via Frankfurter API
- **Circuit Breaker**: Robust error handling with automatic failover
- **Precise Calculations**: Uses Decimal arithmetic for accurate monetary computations

### 🏗️ Modern Architecture
- **FastAPI Backend**: Async Python API with type hints and automatic documentation
- **React Frontend**: Modern TypeScript interface with Tailwind CSS
- **Real-time Updates**: Server-Sent Events for progress tracking
- **Database**: SQLite with SQLAlchemy 2.0 and Alembic migrations
- **Pipeline Processing**: LangGraph orchestration for complex workflows

## Quick Start

### Option 1: Docker (Recommended)
```bash
# Set required environment variables
export AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT="https://your-resource.cognitiveservices.azure.com/"
export AZURE_DOCUMENT_INTELLIGENCE_API_KEY="your-api-key-here"

# Start the application
docker-compose up --build

# Access the application
# - Web interface: http://localhost:8080
# - API documentation: http://localhost:8080/docs
# - Health check: http://localhost:8080/health
```

### Option 2: Local Development
```bash
# Backend setup
cd backend && poetry install
poetry run alembic upgrade head
poetry run uvicorn app.main:app --reload

# Frontend setup (new terminal)
cd frontend && npm install
npm run dev

# Optional: View API documentation
# Open http://localhost:8000/docs in your browser
```

## Project Structure

```
/financial-tools-mcp/
├── backend/                     # FastAPI web application
│   ├── app/                     # Core application modules
│   │   ├── main.py              # FastAPI app with endpoints
│   │   ├── models.py            # SQLAlchemy database models
│   │   ├── azure_adapter.py     # Azure Document Intelligence
│   │   ├── currency.py          # Currency conversion service
│   │   └── db.py                # Database session management
│   ├── langgraph_nodes/         # Processing pipeline components
│   ├── tests/                   # Backend unit tests (pytest)
│   └── alembic/                 # Database migrations
├── frontend/                    # React TypeScript application
│   ├── src/
│   │   ├── components/          # Upload, progress, currency components
│   │   ├── hooks/               # SSE integration (useSse)
│   │   └── App.tsx              # Main application component
│   └── __tests__/               # Frontend tests (Jest + RTL)
└── docker-compose.yml           # Production deployment configuration
```

## API Endpoints

- `POST /process-invoices` - Upload and process invoice files
- `GET /progress/{job_id}` - Server-Sent Events for job progress
- `GET /download/{job_id}` - Download generated Excel report
- `GET /health` - Health check endpoint
- `GET /` - Serve React frontend application

## Environment Setup

### Required Variables
```bash
# Azure Document Intelligence (required for invoice processing)
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=https://your-resource.cognitiveservices.azure.com/
AZURE_DOCUMENT_INTELLIGENCE_API_KEY=your-api-key

# Optional: For quota monitoring
AZURE_DOCUMENT_INTELLIGENCE_RESOURCE_ID=your-resource-id
```

### Development Dependencies
- **Backend**: Python 3.11+, Poetry, FastAPI, SQLAlchemy, httpx
- **Frontend**: Node.js 18+, React 19, TypeScript, Tailwind CSS 4
- **Database**: SQLite with Alembic migrations
- **Testing**: pytest (backend), Jest + React Testing Library (frontend)

## Development Commands

### Backend
```bash
cd backend

# Install dependencies
poetry install

# Run tests
poetry run pytest
poetry run pytest tests/test_currency.py -v

# Code quality
poetry run black .
poetry run ruff check .

# Database
poetry run alembic upgrade head
poetry run alembic revision --autogenerate -m "description"

# Development server
poetry run uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend

# Install dependencies
npm install

# Development
npm run dev
npm run build

# Testing
npm test
npm test -- --coverage --watchAll=false

# Code quality
npm run lint
```

## Key Technologies

### Backend Stack
- **FastAPI**: Modern async Python web framework
- **SQLAlchemy 2.0**: Advanced ORM with async support
- **Azure AI**: Document Intelligence for invoice parsing
- **LangGraph**: Workflow orchestration and state management
- **httpx**: Async HTTP client for external API calls

### Frontend Stack
- **React 19**: Latest React with concurrent features
- **TypeScript**: Full type safety and developer experience
- **Tailwind CSS 4**: Utility-first styling with modern features
- **React Dropzone**: File upload with drag & drop
- **Server-Sent Events**: Real-time progress updates

### Architecture Patterns
- **Circuit Breaker**: Resilient external API integration
- **Server-Sent Events**: Real-time progress streaming
- **Multi-stage Docker**: Optimized production builds
- **Hybrid Data Models**: Internal robustness + API simplicity

## Testing

### Backend (pytest)
- **Unit Tests**: Individual service testing with mocks
- **Integration Tests**: Database and API endpoint testing
- **Circuit Breaker**: Failure scenarios and recovery testing
- **Coverage**: 39 tests with comprehensive service coverage

### Frontend (Jest + RTL)
- **Component Tests**: UI behavior and interaction testing
- **Hook Tests**: Custom hook functionality with mock EventSource
- **Type Safety**: Full TypeScript coverage with strict rules
- **Coverage**: 92%+ test coverage with automated CI checks

## Production Deployment

The application is containerized for easy deployment:

```bash
# Build and deploy
docker-compose up -d --build

# View logs
docker-compose logs -f

# Scale services
docker-compose up -d --scale invoice-converter=3
```

## License

MIT License - see LICENSE file for details.