# Invoice Converter - Technical Specification

## Table of Contents

1. [Project Goals](#1-project-goals)
2. [Tech Stack & Repository Layout](#2-tech-stack--repository-layout)
3. [Environment Variables](#3-environment-variables)
4. [Backend API Contract](#4-backend-api-contract)
5. [LangGraph Pipeline](#5-langgraph-pipeline)
6. [SQLite Schema](#6-sqlite-schema)
7. [Frontend Behaviour](#7-frontend-behaviour)
8. [Error Handling Summary](#8-error-handling-summary)
9. [Testing Plan](#9-testing-plan)
10. [Docker & Local Run](#10-docker--local-run)
11. [Open Tasks & Estimates](#11-open-tasks--estimates)

---

## 1. Project Goals

Build a localhost web app that lets a user upload up to 100 invoices (PDF / JPEG / PNG ≤ 1 MB each), extracts key fields via Azure Document Intelligence, converts totals to a user-chosen currency via the Frankfurter API, and returns a styled .xlsx workbook. Progress is streamed back to the browser with Server-Sent Events (SSE); a single batch is processed at a time.

## 2. Tech Stack & Repository Layout

### Technology Choices

| Area | Choice |
|------|--------|
| **Frontend** | React + Vite, Tailwind CSS, Headless UI (dropdown), React Dropzone (uploads), Axios + EventSource |
| **Backend** | Python 3.11, FastAPI + Uvicorn, LangGraph orchestration |
| **Data Extraction** | Azure Document Intelligence pre-built invoice model |
| **Currency API** | Frankfurter (no caching) |
| **Workbook** | openpyxl |
| **Database** | SQLite (job + file tables) via sqlalchemy |
| **Testing** | pytest, pytest-mock, hypothesis (property tests), Coverage ≥ 80% • Frontend: Jest + React Testing Library |
| **CI** | GitHub Actions – lint (ruff), format (black), run all tests, fail < 80% coverage |
| **Containers** | Single multi-stage Docker image (React build ➜ served by FastAPI); .env mounted via docker-compose |

### Repository Structure

```
invoice-converter/
├─ backend/
│  ├─ app/                  # FastAPI src
│  ├─ langgraph_nodes/
│  ├─ tests/
│  └─ Dockerfile
├─ frontend/
│  ├─ src/
│  ├─ public/
│  └─ vite.config.ts
├─ docker-compose.yml
├─ README.md                # lists required env vars
└─ progress_quips.json      # fun progress messages
```

## 3. Environment Variables

*Documented in README*

```env
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT
AZURE_DOCUMENT_INTELLIGENCE_API_KEY
AZURE_DOCUMENT_INTELLIGENCE_RESOURCE_ID   # optional quota check
```

## 4. Backend API Contract

### API Endpoints

| Verb | Path | Purpose |
|------|------|---------|
| **POST** | `/process-invoices` | Starts a batch. Multipart form fields:<br>• `files`: up to 100 files (PDF/JPG/PNG, ≤ 1 MB each)<br>• `target_currency`: ISO-4217, default USD<br>Returns `{"job_id": "<uuid>"}` immediately. |
| **GET** | `/progress/{job_id}` | SSE stream (`text/event-stream`). Emits JSON objects in the schema below. |
| **GET** | `/download/{job_id}` | Downloads the finished workbook `invoice_report_<timestamp>.xlsx`. |

### SSE Payload Schema

```json
{
  "job_id": "abc123",
  "status": "processing" | "completed" | "error",
  "current_step": "uploading" | "extracting" | "currency_check" | "currency_conversion" | "excel_generation",
  "processed": 3,
  "total": 5,
  "percentage": 60,
  "current_file": {
    "name": "invoice_003.pdf",
    "original_currency": "EUR",
    "target_currency": "USD",
    "status": "processing" | "converting" | "completed" | "failed"
  },
  "message": "Converting EUR to USD for invoice_003.pdf",
  "completed_files": [
    {"name": "invoice_001.pdf", "status": "success"},
    {"name": "invoice_002.pdf", "status": "success"}
  ],
  "error": null | { "file": "...", "message": "..." }
}
```

## 5. LangGraph Pipeline

### Sequential Processing Flow

1. **File Upload Node** → stores paths & target currency in the DB.

2. **Invoice Extractor Node** → Azure DI, returns InvoiceData dataclass.

3. **Currency Check Node** → decide if conversion is required.

4. **Exchange Rate Node** → `GET https://api.frankfurter.app/<date>?from=<original>&to=<target>`
   - Abort batch after 3 Frankfurter failures: mark remaining files ERROR, finalize workbook.

5. **Currency Converter Node** → `Decimal(amount) * rate`, half-up rounding to 2 dp.

6. **Excel Generator Node** → openpyxl workbook "Invoices Report", columns:

### Excel Output Format

| Date (DD/MM/YYYY) | Invoice Suffix | &lt;TARGET CUR&gt; Total Price | Foreign Currency Total Price | Foreign Currency Code | Exchange Rate (4 dp) | Vendor Name |
|-------------------|----------------|--------------------------------|------------------------------|----------------------|---------------------|-------------|

- Rows sorted by date ascending
- "no date found" rows last
- Ties keep upload order

### Invoice Suffix Extraction

- Strip non-digits, take last 4, left-pad zeros
- If no digits → `SUFFIX_NOT_FOUND`

### Placeholder Error Row

- Date=`"ERROR"`
- Invoice Suffix=`(filename)`
- All numeric/text cols `"N/A"`

## 6. SQLite Schema

```sql
CREATE TABLE jobs (
  job_id TEXT PRIMARY KEY,
  status TEXT,           -- processing/completed/error
  processed INTEGER,
  total INTEGER,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE files (
  file_id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id  TEXT REFERENCES jobs(job_id),
  filename TEXT,
  status TEXT,           -- success/failed/unprocessed
  original_currency TEXT,
  target_currency TEXT,
  error_message TEXT
);
```

## 7. Frontend Behaviour

### Upload Page

- **React Dropzone** (accept `.pdf`, `.jpg`, `.jpeg`, `.png`; size ≤ 1 MB; max 100)
- **Currency selector**: ISO list from embedded JSON (defaults USD)
- **Click Process** → `POST /process-invoices`

### Progress Modal

- **Tailwind progress bar** fills via percentage
- **Random quips** pulled from `progress_quips.json`
- **Inline list of files** shows fail notices

### Completion

- **Auto-trigger** fetch `/download/{job_id}`
- **Fallback** "Download Again" button appears

## 8. Error Handling Summary

| Scenario | User-facing Effect | Excel Effect |
|----------|-------------------|--------------|
| **Azure DI fails on a file** | Quip + inline file error; SSE status=failed | Placeholder row |
| **Frankfurter fails < 3×** | Same file error handling | Placeholder row |
| **3rd Frankfurter failure** | Batch aborts; progress stops at Excel generation | Remaining rows = ERROR |
| **Missing invoice date** | Date = "no date found"; skip conversion; leave Exchange Rate & Target Total blank | |
| **Target currency matches invoice currency** | No conversion; Exchange Rate blank | |

**Note**: Uploaded PDFs/images are removed immediately after processing; workbooks kept in `backend/exports/`.

## 9. Testing Plan

### Backend

- **Unit tests** per LangGraph node (pytest + hypothesis)
- **Integration test**: end-to-end batch with 3 mock invoices (2 OK, 1 error)
- **Edge cases**: missing date, missing total, SUFFIX_NOT_FOUND, 3 Frankfurter errors

### Frontend

**Component tests** (Jest) for:
- Currency dropdown
- File uploader limits
- Progress bar updates via mocked SSE

**Cypress or Playwright** smoke test optional.

## 10. Docker & Local Run

### Development

```bash
# Dev
cd backend && uvicorn app.main:app --reload  #  localhost:8000
cd frontend && npm run dev                   #  localhost:3000
```

### Production

```bash
# One-shot build & run
docker compose up --build    # mounts host .env
```

`docker-compose.yml` builds the React app in stage 1, copies `dist/` into the FastAPI image, then serves everything via Uvicorn at port 80.

## 11. Open Tasks & Estimates

| Task | Owner | Est. |
|------|-------|------|
| **Scaffold backend / frontend dirs** | — | 0.5 d |
| **Implement LangGraph nodes** | — | 1.5 d |
| **SSE & DB integration** | — | 1 d |
| **React UI (Tailwind)** | — | 1 d |
| **openpyxl Excel styling** | — | 0.5 d |
| **Tests (backend+frontend)** | — | 1 d |
| **GitHub Actions CI** | — | 0.5 d |
| **Dockerfile + compose** | — | 0.5 d |
| **Total** | | **6.5 d** |

---

*Generated from ChatGPT specification - formatted for optimal Markdown display*