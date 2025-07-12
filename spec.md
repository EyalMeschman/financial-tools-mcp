1 · Project Goals
Build a localhost web app that lets a user upload up to 100 invoices (PDF / JPEG / PNG ≤ 1 MB each), extracts key fields via Azure Document Intelligence, converts totals to a user-chosen currency via the Frankfurter API, and returns a styled .xlsx workbook. Progress is streamed back to the browser with Server-Sent Events (SSE); a single batch is processed at a time.

2 · Tech Stack & Repo Layout
Area	Choice
Frontend	React + Vite, Tailwind CSS, Headless UI (dropdown), React Dropzone (uploads), Axios + EventSource
Backend	Python 3.11, FastAPI + Uvicorn, LangGraph orchestration
Data Extraction	Azure Document Intelligence pre-built invoice model
Currency API	Frankfurter (no caching)
Workbook	openpyxl
Database	SQLite (job + file tables) via sqlalchemy
Testing	pytest, pytest-mock, hypothesis (property tests), Coverage ≥ 80 % • Frontend: Jest + React Testing Library
CI	GitHub Actions – lint (ruff), format (black), run all tests, fail < 80 % coverage
Containers	Single multi-stage Docker image (React build ➜ served by FastAPI); .env mounted via docker-compose
Repo skeleton	

kotlin
Copy
Edit
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
3 · Environment Variables (documented in README)
nginx
Copy
Edit
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT
AZURE_DOCUMENT_INTELLIGENCE_API_KEY
AZURE_DOCUMENT_INTELLIGENCE_RESOURCE_ID   # optional quota check
4 · Backend API Contract
Verb	Path	Purpose
POST	/process-invoices	Starts a batch. Multipart form fields:
• files: up to 100 files (PDF/JPG/PNG, ≤ 1 MB each)
• target_currency: ISO-4217, default USD
Returns {"job_id": "<uuid>"} immediately.
GET	/progress/{job_id}	SSE stream (text/event-stream). Emits JSON objects in the schema below.
GET	/download/{job_id}	Downloads the finished workbook invoice_report_<timestamp>.xlsx.

SSE payload schema
jsonc
Copy
Edit
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
5 · LangGraph Pipeline (Sequential)
File Upload Node → stores paths & target currency in the DB.

Invoice Extractor Node → Azure DI, returns InvoiceData dataclass.

Currency Check Node → decide if conversion is required.

Exchange Rate Node → GET https://api.frankfurter.app/<date>?from=<original>&to=<target>
Abort batch after 3 Frankfurter failures: mark remaining files ERROR, finalize workbook.

Currency Converter Node → Decimal(amount) * rate, half-up rounding to 2 dp.

Excel Generator Node → openpyxl workbook “Invoices Report”, columns:

| Date (DD/MM/YYYY) | Invoice Suffix | <TARGET CUR> Total Price | Foreign Currency Total Price | Foreign Currency Code | Exchange Rate (4 dp) | Vendor Name |

Rows sorted by date ascending; “no date found” rows last; ties keep upload order.

Invoice suffix extraction

Strip non-digits, take last 4, left-pad zeros.

If no digits → NO_INV_NUM.

Placeholder error row
Date="ERROR", Invoice Suffix=(filename), all numeric/text cols "N/A".

6 · SQLite Schema
sql
Copy
Edit
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
7 · Frontend Behaviour
Upload page

React Dropzone (accept .pdf,.jpg,.jpeg,.png; size ≤ 1 MB; max 100).

Currency selector: ISO list from embedded JSON (defaults USD).

Click Process → POST /process-invoices.

Progress modal

Tailwind progress bar fills via percentage.

Random quips pulled from progress_quips.json.

Inline list of files shows fail notices.

Completion

Auto-trigger fetch /download/{job_id}; fallback “Download Again” button appears.

8 · Error Handling Summary
Scenario	User-facing effect	Excel effect
Azure DI fails on a file	Quip + inline file error; SSE status=failed	Placeholder row
Frankfurter fails < 3×	Same file error handling	Placeholder row
3rd Frankfurter failure	Batch aborts; progress stops at Excel generation	Remaining rows = ERROR
Missing invoice date	Date = "no date found"; skip conversion; leave Exchange Rate & Target Total blank	
Target currency matches invoice currency	No conversion; Exchange Rate blank	

Uploaded PDFs/images are removed immediately after processing; workbooks kept in backend/exports/.

9 · Testing Plan
Backend
Unit tests per LangGraph node (pytest + hypothesis).

Integration test: end-to-end batch with 3 mock invoices (2 OK, 1 error).

Edge cases: missing date, missing total, NO_INV_NUM, 3 Frankfurter errors.

Frontend
Component tests (Jest) for:

Currency dropdown

File uploader limits

Progress bar updates via mocked SSE

Cypress or Playwright smoke test optional.

10 · Docker & Local Run
bash
Copy
Edit
# Dev
cd backend && uvicorn app.main:app --reload  #  localhost:8000
cd frontend && npm run dev                   #  localhost:3000

# One-shot build & run
docker compose up --build    # mounts host .env
docker-compose.yml builds the React app in stage 1, copies dist/ into the FastAPI image, then serves everything via Uvicorn at port 80.

11 · Open Tasks & Estimates
Task	Owner	Est.
Scaffold backend / frontend dirs	—	0.5 d
Implement LangGraph nodes	—	1.5 d
SSE & DB integration	—	1 d
React UI (Tailwind)	—	1 d
openpyxl Excel styling	—	0.5 d
Tests (backend+frontend)	—	1 d
GitHub Actions CI	—	0.5 d
Dockerfile + compose	—	0.5 d
Total		6.5 d

