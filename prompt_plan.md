# Invoice Converter - Development Prompt Plan

## Table of Contents

- [Pass 1: High-Level Blueprint](#pass-1-high-level-blueprint)
- [Pass 2: Break Each Phase into Chunks](#pass-2-break-each-phase-into-chunks)
- [Pass 3: Micro-Steps Example](#pass-3-micro-steps-example)
- [Prompts for Code-Generation LLM](#prompts-for-code-generation-llm)
  - [Initialization Prompts (P-0)](#initialization-prompts-p-0)
  - [Backend Foundation (P-1)](#backend-foundation-p-1)
  - [Frontend Foundation (P-2)](#frontend-foundation-p-2)
  - [Core Infrastructure (P-3 to P-4)](#core-infrastructure-p-3-to-p-4)
  - [Business Logic (P-5 to P-7)](#business-logic-p-5-to-p-7)
  - [Integration & UX (P-8 to P-9)](#integration--ux-p-8-to-p-9)
  - [Production & Polish (P-10 to P-11)](#production--polish-p-10-to-p-11)

---

## Pass 1: High-Level Blueprint

| Phase | Goal | Main Deliverables |
|-------|------|-------------------|
| **P-0** | Repo & CI Baseline | Shared tooling & coding standards | mono-repo skeleton, pre-commit, Ruff+Black, Jest, GitHub Actions |
| **P-1** | Backend Scaffold | Small FastAPI app with health-check & SQLite wiring | `/health`, `/process-invoices` stub, Alembic migration, pytest env |
| **P-2** | Frontend Scaffold | React + Vite + Tailwind starter | Dropzone stub, currency dropdown stub, Storybook story |
| **P-3** | Job Lifecycle | Minimal job table + SSE progress stream | DB models, `/progress/{job_id}`, in-memory progress ticker |
| **P-4** | LangGraph Skeleton | Empty nodes wired in order | six placeholder nodes returning "pass-through" data |
| **P-5** | Azure Extractor | Real invoice field extraction | adapter around Azure SDK, unit tests w/ VCR-py |
| **P-6** | Currency Flow | Frankfurter integration & converter node | rate fetch, 3-failure guardrail, decimal math |
| **P-7** | Excel Generator | Styled openpyxl workbook + download endpoint | deterministic ordering & suffix logic |
| **P-8** | Full Pipeline Hook-up | End-to-end happy-path, streamed progress | LangGraph executor + SSE events |
| **P-9** | Frontend UX | Real-time progress UI & auto-download | EventSource hook, progress bar, quips JSON |
| **P-10** | Packaging | Single Docker image, compose file | multi-stage build, .env injection |
| **P-11** | Hardening | Edge-case tests, cleanup, docs | 80%+ coverage, README "Getting Started" |

## Pass 2: Break Each Phase into Chunks

| Chunk ID | Target Branch | Scope |
|----------|---------------|-------|
| **C-0.1** | `init-repo` | `.gitignore`, MIT LICENSE, empty `backend/` & `frontend/` dirs |
| **C-0.2** | `tooling-ci` | `pyproject` (Ruff, Black), `package.json` (Jest, RTL), pre-commit, simple GH Action "lint & test" |
| **C-1.1** | `backend-scaffold` | FastAPI `app/main.py` with `/health`, Poetry/uv setup |
| **C-1.2** | `db-basics` | SQLAlchemy models Job & File, Alembic migration, SQLite URL via env |
| **C-2.1** | `frontend-scaffold` | Vite + React TS, Tailwind config, `<App />` placeholder |
| **C-2.2** | `upload-stub` | `<InvoiceUploader>` dropzone accepting ≤1 MB, no network yet |
| **C-3.1** | `sse-endpoint` | `/progress/{job_id}` returning dummy ticking events |
| **C-3.2** | `sse-frontend-hook` | React hook `useSse` + progress bar component |
| **C-4.1** | `langgraph-skeleton` | six empty nodes, executor wiring, passes thru dummy dict |
| **C-5.1** | `azure-adapter` | thin wrapper over Azure DI, injectable interface, pytest with recorded cassette |
| **C-6.1** | `currency-adapter` | Frankfurter client, retry logic, unit tests |
| **C-6.2** | `converter-node` | rate × Decimal, half-up rounding |
| **C-7.1** | `excel-generator` | openpyxl workbook creator, style, unit test comparing XLSX bytes hash |
| **C-8.1** | `pipeline-integration` | Connect nodes, persist progress to DB, emit SSE |
| **C-9.1** | `ui-currency-select` | ISO code dropdown, default USD |
| **C-9.2** | `ui-complete-flow` | call `/process-invoices`, listen to progress, auto-download |
| **C-10.1** | `docker-prod` | multi-stage Dockerfile, compose, README snippet |
| **C-11.1** | `edge-tests` | missing date, Azure fail, 3rd-rate failure, front-end Jest |
| **C-11.2** | `docs-polish` | CONTRIBUTING, API md, architecture diagram |

## Pass 3: Micro-Steps Example

*Example shown for Chunk C-1.1; the prompts later cover all chunks*

| Step | Commit Message | Safety Net |
|------|----------------|------------|
| **S-1** | `"feat(backend): create FastAPI app with /health returning 200 OK JSON"` | `pytest test_health.py` |
| **S-2** | `"chore(tasks): add uvicorn app.main:app make target"` | none |
| **S-3** | `"test(ci): wire backend tests into GH Actions"` | action fails red on test error |

*Every other chunk is decomposed in the same fashion inside the prompt list.*

---

## Prompts for Code-Generation LLM

> **Instructions**: Paste one prompt at a time; run tests after each commit.  
> All prompts are self-contained and build on the code produced by previous prompts.

### Naming Convention

- Step numbers below match the chunk/step tables
- Branch names are suggestions; feel free to adjust

---

## Initialization Prompts (P-0)

### Prompt 1 – `init-repo`

```text
You are a senior full-stack engineer.

**Task**  
Create the initial repository skeleton for "invoice-converter".

**Requirements**
1. Add `.gitignore` suitable for Python, Node, and macOS.
2. Add MIT LICENSE with SPDX header.
3. Create empty directories: `backend/` and `frontend/`.
4. Commit message: `chore(repo): initial skeleton`.

**Tests**  
No code yet – just ensure the directory tree exists.

Return ONLY the file list with contents where applicable.
```

### Prompt 2 – `tooling-ci`

```text
You now have the repo from Prompt 1.

**Task**  
Introduce shared tooling and CI baseline.

*Backend (Python 3.11)*
- Add `pyproject.toml` using Poetry with Ruff & Black config (`line-length = 120`).

*Frontend (Node 20)*
- Add `package.json` with scripts:
  - `test` → Jest
  - `lint` → `eslint --ext ts,tsx src`

*Continuous Integration*
- `.github/workflows/ci.yml` running on push:
  1. Set up Python, install deps, run `pytest`.
  2. Set up Node, run `npm ci && npm test`.
  3. Run Ruff + Black check.

*Pre-commit*
- `.pre-commit-config.yaml` with `ruff`, `black`, and `isort`.

**Tests**
- Add a trivial `tests/test_placeholder.py` asserting `1 == 1`.
- Configure Jest with a sample test `frontend/src/__tests__/placeholder.test.ts` asserting `true`.

Commit message: `chore(ci): tooling, lint, pre-commit, placeholder tests`.
```

---

## Backend Foundation (P-1)

### Prompt 3 – `backend-scaffold`

```text
Extend the codebase from Prompt 2.

**Task**
1. In `backend/app/`, create `main.py` that:
   - Instantiates FastAPI with `title="Invoice Converter API"`.
   - Defines `GET /health` that returns `{"status": "ok"}`.
2. Add `backend/app/__init__.py` (empty).
3. Add `backend/tests/test_health.py` that spins up `TestClient` and asserts 200 + JSON.
4. Update Poetry dependencies: `fastapi`, `uvicorn[standard]`, `pytest`, `httpx`, `pytest-asyncio`.

Commit message: `feat(backend): FastAPI app with /health and unit test`.
```

### Prompt 4 – `db-basics`

```text
Build on previous code.

**Task**
1. Add SQLAlchemy models:
   - `Job(job_id: str PK, status: str, processed: int, total: int, created_at, updated_at)`
   - `File(id PK, job_id FK, filename, status, original_currency, target_currency, error_message)`
2. Create `backend/app/db.py` with `get_session()` using SQLite URL from env `DATABASE_URL` defaulting to `sqlite:///./invoice.db`.
3. Add Alembic with an initial migration generating the two tables.
4. Unit tests:
   - `test_db_models.py` inserts a job + file and queries back.
5. Update CI to run `alembic upgrade head` before tests.

Commit: `feat(db): SQLAlchemy models and Alembic migration`.
```

---

## Frontend Foundation (P-2)

### Prompt 5 – `frontend-scaffold`

```text
Front-end time.

**Task**
1. Set up Vite + React + TypeScript in `frontend/` (use `npm create vite@latest` scaffolding).
2. Add Tailwind CSS (`tailwind.config.js`, `postcss.config.js`, `index.css` with Tailwind directives).
3. Replace `App.tsx` with a minimalist page containing:
   - `<h1>Invoice Converter</h1>`
   - A placeholder `<UploadArea/>` component (empty div for now).
4. Add Jest + React Testing Library config, plus a passing smoke test `renders headline`.

Commit: `feat(frontend): Vite+React scaffold with Tailwind`.
```

### Prompt 6 – `upload-stub`

```text
Enhance the front-end.

**Task**
1. Install `react-dropzone`.
2. Create `frontend/src/components/UploadArea.tsx`:
   - Accepts PDF/JPG/PNG ≤ 1 MB, max 100 files.
   - Renders file names after selection.
   - NO network requests yet.
3. Update `App.tsx` to include `<UploadArea/>`.
4. Jest test: select two fake files, assert they appear in the DOM.

Commit: `feat(frontend): basic dropzone upload stub`.
```

---

## Core Infrastructure (P-3 to P-4)

### Prompt 7 – `sse-endpoint`

```json
Back-end SSE foundation.

**Task**
1. Add `/progress/{job_id}` endpoint returning `text/event-stream`.
2. Use `async def event_generator(job_id)` that yields one event per second with:
   {"job_id": "...", "status": "processing", "percentage": 0}
   For now, stop after ten events and then send "completed".

3. Include Cache-Control: no-cache header.

Unit test using httpx.AsyncClient that reads the stream and counts ten events.

Commit: `feat(api): dummy SSE progress endpoint`.
```

### Prompt 8 – `sse-frontend-hook`

```text
Front-end SSE hook.

**Task**
1. Create `frontend/src/hooks/useSse.ts`.
   - Accepts `url: string`.
   - Returns `{ data, error }` where `data` is latest JSON event.
2. Add a `ProgressBar` component that fills width based on `percentage`.
3. Update `UploadArea` to call `useSse("/progress/demo")` (hard-coded) after selecting files.
4. Show progress bar.

Jest test: mock `EventSource` to emit two events and assert bar width increases.

Commit: `feat(frontend): SSE hook and progress bar`.
```

### Prompt 9 – `langgraph-skeleton`

```text
Introduce LangGraph.

**Task**
1. Add dep `langgraph`.
2. Create `backend/langgraph_nodes/{base.py, upload.py, extract.py, check_currency.py, convert.py, excel.py}` – each node defines `async def run(input: dict) -> dict` returning `input` unchanged.
3. `backend/langgraph_nodes/pipeline.py` builds `Graph()` linking nodes in the spec order.
4. Add unit test `test_pipeline_noop` that feeds sample dict and asserts identical output.

Commit: `feat(pipeline): LangGraph skeleton with pass-through nodes`.
```

---

## Business Logic (P-5 to P-7)

### Prompt 10 – `azure-adapter`

```text
Real extraction.

**Task**
1. Install `azure-ai-documentintelligence` (pin minor version).
2. Create `backend/app/azure_adapter.py` exposing `async def extract_invoice(path: str) -> InvoiceData`.
   - `InvoiceData` dataclass with date, total, currency, vendor, filename.
3. Wrap SDK; map absent fields to `None`.
4. Unit tests with `pytest-vcr` cassette against a sample invoice PDF (place fixture in `tests/fixtures/`).

Commit: `feat(extraction): Azure Document Intelligence adapter`.
```

### Prompt 11 – `currency-adapter`

```text
Frankfurter integration.

**Task**
1. Add `backend/app/currency.py`:
   - `async def get_rate(date: str, from_: str, to_: str) -> Decimal`.
   - 3-strike circuit breaker stored in module state.
2. Use `httpx.AsyncClient` with 2s timeout.
3. Unit tests:
   - Happy path (mocked response 1.2).
   - Failure increments counter; third failure raises `FrankfurterDown`.

Commit: `feat(currency): Frankfurter client with retry guard`.
```

### Prompt 12 – `converter-node`

```text
Finish currency node.

**Task**
1. Implement `convert.py` node:
   - If `invoice.currency == target`, copy amount.
   - Else call `get_rate`, compute `Decimal(amount) * rate` rounded HALF_UP 2 dp.
2. Write unit tests covering same-currency shortcut and converted case.

Commit: `feat(node): currency converter logic`.
```

### Prompt 13 – `excel-generator`

```text
Excel time.

**Task**
1. Implement `excel.py` node:
   - Accepts list of `InvoiceData`; create workbook with columns & styles per spec.
   - Save bytes to `BytesIO` and return `{"xlsx": bytes, "row_count": n}`.
2. Add helper `invoice_suffix`. Include placeholder ERROR rows.
3. Test using openpyxl to reopen bytes and assert header & row count.

Commit: `feat(node): openpyxl report generator`.
```

---

## Integration & UX (P-8 to P-9)

### Prompt 14 – `pipeline-integration`

```text
Wire nodes end-to-end.

**Task**
1. Replace pass-through logic with calls to real adapters.
2. In `/process-invoices`:
   - Save upload to `uploads/`, create DB job row.
   - Kick off `asyncio.create_task(execute_pipeline(job_id, files, target_currency))`.
3. `execute_pipeline` streams progress to a queue consumed by SSE endpoint.
4. Update `/download/{job_id}` to read `exports/{job_id}.xlsx`.

Add integration test using three tiny invoices + `pytest-asyncio`.

Commit: `feat(api): full pipeline integration`.
```

### Prompt 15 – `ui-currency-select`

```text
Frontend currency selector.

**Task**
1. Add `currencies.json` (ISO codes) under `public/`.
2. Build `<CurrencySelect>` using Headless-UI Listbox.
3. Integrate into `UploadArea`; default USD; send along in future POST.

Jest: render and pick EUR → expect callback.

Commit: `feat(frontend): currency dropdown`.
```

### Prompt 16 – `ui-complete-flow`

```text
Hook UI to real API.

**Task**
1. Replace hard-coded SSE URL. After upload:
   - POST `FormData` with files + currency to `/process-invoices`.
   - Retrieve `{job_id}` and open `/progress/{job_id}` stream.
2. On `completed`, auto-download via `window.location = /download/{job_id}`.
3. Show inline file list with successes / failures.

E2E test (Playwright or Cypress) optional but stub spec included.

Commit: `feat(frontend): complete happy-path flow`.
```

---

## Production & Polish (P-10 to P-11)

### Prompt 17 – `docker-prod`

```text
Containerization.

**Task**
1. Create `backend/Dockerfile` multi-stage:
   - Stage 1: `npm run build` in `/frontend`, copy `dist/` to `/app/static`.
   - Stage 2: slim Python base; COPY backend code + static; install deps; `CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "80"]`.
2. Root `docker-compose.yml` exposing port 8080.
3. Add README "Docker quick-start".

Commit: `feat(devops): production Docker image & compose`.
```

### Prompt 18 – `edge-tests`

```text
Hardening.

**Task**
1. Add backend tests for:
   - Missing invoice date.
   - Azure extraction failure.
   - Third Frankfurter error abort.
2. Front-end Jest tests for:
   - 1 MB size limit rejection.
   - Progress bar shows 100% on completion.

Ensure coverage ≥ 80%. Update CI to fail if below.

Commit: `test(edge): increase coverage and confidence`.
```

### Prompt 19 – `docs-polish`

```text
Final polish.

**Task**
1. Create `ARCHITECTURE.md` with diagram (ASCII ok).
2. Extend README with local dev instructions, env var table, and badges.
3. Add `CONTRIBUTING.md` explaining branching & TDD workflow.

Commit: `docs: polish and project overview`.
```

### Prompt 20 – `release-v0.1.0`

```text
Tag the first release.

**Steps:**
1. Update `pyproject.toml` version → 0.1.0.
2. Create `CHANGELOG.md` summarising all completed phases.
3. `git tag v0.1.0`.

Commit message: `chore(release): v0.1.0`.

Push tag to trigger GitHub release workflow (autogenerated zip).
```

---

*Generated from ChatGPT prompt plan - formatted for optimal Markdown display*