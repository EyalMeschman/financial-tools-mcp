# Invoice Converter – Master TODO Checklist

A comprehensive, step‑by‑step list of everything needed to deliver **v0.1.0**. Tick each box as you finish the work **on the feature branch *before* you open your PR**.

> **Legend**
> ☐ = not started ▣ = in progress (open PR) ☑ = merged into `main`

---

## P‑0 Repo & CI Baseline

* [ ] **C‑0.1 `init-repo`** – skeleton, `.gitignore`, MIT license, empty `backend/` & `frontend/` dirs
* [ ] **C‑0.2 `tooling-ci`** – Ruff + Black, Jest, pre‑commit, placeholder tests, GitHub CI

## P‑1 Backend Scaffold

* [ ] **C‑1.1 `backend-scaffold`** – FastAPI app + `/health`, pytest client test
* [ ] **C‑1.2 `db-basics`**

  * [ ] SQLAlchemy models (`Job`, `File`)
  * [ ] `db.py` session helper
  * [ ] Alembic init + first migration
  * [ ] Model insert/query unit test
  * [ ] CI: run `alembic upgrade head` before tests

## P‑2 Frontend Scaffold

* [ ] **C‑2.1 `frontend-scaffold`** – Vite + React TS, Tailwind, smoke test
* [ ] **C‑2.2 `upload-stub`** – `<UploadArea>` with Dropzone & Jest test

## P‑3 Job Lifecycle & SSE

* [ ] **C‑3.1 `sse-endpoint`** – dummy SSE endpoint & async test
* [ ] **C‑3.2 `sse-frontend-hook`** – `useSse`, `<ProgressBar>`, mocked EventSource test

## P‑4 LangGraph Skeleton

* [ ] **C‑4.1 `langgraph-skeleton`** – six empty nodes + pass‑through pipeline, unit test

## P‑5 Azure Extractor

* [ ] **C‑5.1 `azure-adapter`** – DI wrapper, `InvoiceData` dataclass, VCR tests

## P‑6 Currency Flow

* [ ] **C‑6.1 `currency-adapter`** – Frankfurter client, retry guard, unit tests
* [ ] **C‑6.2 `converter-node`** – HALF\_UP rounding logic, tests

## P‑7 Excel Generator

* [ ] **C‑7.1 `excel-generator`** – openpyxl workbook, suffix helper, bytes‑hash test

## P‑8 Pipeline Integration

* [ ] **C‑8.1 `pipeline-integration`**

  * [ ] Wire real nodes in order
  * [ ] `/process-invoices` saves uploads & spawns task
  * [ ] `execute_pipeline` queues progress for SSE
  * [ ] `/download/{job_id}` serves XLSX
  * [ ] End‑to‑end integration test (3 invoices)

## P‑9 Frontend UX

* [ ] **C‑9.1 `ui-currency-select`** – ISO dropdown, Jest interaction test
* [ ] **C‑9.2 `ui-complete-flow`** – POST upload, live progress, auto‑download, optional E2E script

## P‑10 Packaging & Deploy

* [ ] **C‑10.1 `docker-prod`** – multi‑stage Dockerfile, compose file, README excerpt

## P‑11 Hardening & Docs

* [ ] **C‑11.1 `edge-tests`** – backend edge cases, frontend limits, ≥80 % coverage gate
* [ ] **C‑11.2 `docs-polish`** – Architecture doc, expanded README, Contributing guide

## Release

* [ ] **Tag `v0.1.0`** – bump version, CHANGELOG, `git tag v0.1.0`

---

### Nice‑to‑Have (Post‑v0.1)

* [ ] Cypress/Playwright E2E pipeline in CI
* [ ] Caching Frankfurter responses in SQLite table
* [ ] Dark‑mode switch in UI
* [ ] i18n support (react‑i18next) for UI strings
