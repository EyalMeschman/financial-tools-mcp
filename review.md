# Invoice‑Converter – Milestone C‑6.2 Code Review

*Scope: repo state after **Prompt 12 – converter‑node**, prior to **Prompt 13 – excel‑generator***

---

## 1. High‑level assessment

| Category | Status | Notes |
|‑‑‑|‑‑‑|‑‑‑|
|Build & CI|✅ passes locally; 80 % coverage gate wired into CI fileciteturn3file11|
|Backend foundation|✅ FastAPI, Alembic, SQLAlchemy models & SQLite wiring complete fileciteturn3file2turn3file7turn3file7|
|Azure extraction|✅ Dataclass layer + extensive tests fileciteturn3file0turn3file12|
|Currency adapter|✅ Frankfurter client with circuit‑breaker & tests fileciteturn3file0turn3file12|
|**Converter node (milestone focus)**|❌ `backend/langgraph_nodes/convert.py` still a pass‑through placeholder fileciteturn3file8|
|Pipeline wiring|🟡 Graph skeleton exists but runs NO‑OP nodes only fileciteturn3file11|
|Frontend stub|✅ Upload → SSE progress bar path proven; not in this milestone|

**Key risk:** currency conversion is NOT yet executed anywhere in the runtime path; milestone C‑6.2 deliverable is therefore incomplete.

---

## 2. Detailed findings

### 2.1 `backend/app/azure_adapter.py`

|Line|Issue|Recommendation|
|‑‑‑|‑‑‑|‑‑‑|
|25–33|Reads entire PDF into memory then posts; large invoices will blow RAM.|Stream with `async with aiofiles.open(...)` and pass the async iterator to SDK to reduce memory.|
|52–63|Environment‑variable check prints to stdout; poor for production.|Raise `RuntimeError` and let FastAPI exception handler log properly; avoids silent failure paths.|
|69|`content_type="application/pdf"` is hard‑coded.|Infer MIME from suffix or parameterise; JPEG/PNG invoices are accepted elsewhere.|
|104–140|Field extraction is verbose and repetitive.|Extract via helper like `get_field(fields, "InvoiceDate")` to cut repetition and reduce misspell risk.|

### 2.2 `backend/app/currency.py`

|Line|Issue|Recommendation|
|18–23|Global `_failure_count` is **not thread‑safe**; FastAPI runs multi‑worker.|Protect with `asyncio.Lock` or move to a scoped CircuitBreaker class.|
|60–66|Timeout hard‑coded to 2 s.|Expose via env/setting; some regions experience 3‑4 s latency.|
|83|`Decimal(str(rate))` keeps API float precision; HALF\_UP rounding required by milestone isn’t applied.|After fetching, apply `quantize(Decimal("0.01"), ROUND_HALF_UP)` before returning.|

### 2.3 `backend/langgraph_nodes/convert.py`

```python
# lines 1‑15
async def run(input: dict) -> dict:
    """Convert node that performs currency conversion."""
    return input  # ← no‑op
```

*Missing:*

* fetch rate via `app.currency.get_rate`
* multiply `InvoiceTotal` for each file (respecting original & target codes)
* write rounded result back into pipeline state
* unit tests mirroring currency‐adapter edge‑cases.

### 2.4 `backend/langgraph_nodes/pipeline.py`

* Graph edges are correct but **compile()** is called without executor kwargs; default executor is sync – consider `executor="async_io"` for full async path.  fileciteturn3file11
* No error trapping between nodes; one failure will abort stream silently.

### 2.5 Database models

*Good*: timezone‑aware `datetime.now(UTC)` defaults fileciteturn3file7.
*Minor*: consider adding explicit `index=True` on `Job.status` for dashboard queries.

### 2.6 `backend/app/main.py`

|Line|Issue|Recommendation|
|9–17|`event_generator` never closes on client disconnect.|Wrap loop in `try/except asyncio.CancelledError` to release coroutine.|
|21–31|SSE yields JSON but doesn’t set `Connection: keep‑alive` value in headers during K8s ingress; include it.|

### 2.7 Testing

* Coverage strong for adapters; **no tests for convert node, Excel node, or DB CRUD beyond models**.
* `coverage report` parsing in CI uses `grep TOTAL` – brittle if report format changes; switch to `coverage xml` + `xmlstarlet`.

---

## 3. Alignment to Prompt‑plan milestones

|Chunk|Expected|Observed|
|C‑6.1 `currency-adapter`|Frankfurter client + tests|✅ done|
|**C‑6.2 `converter-node`**|Node logic, HALF\_UP rounding, tests|❌ missing|

All earlier chunks (C‑0.1 → C‑6.1) appear complete. Proceeding to **Prompt 13 – excel‑generator** without closing C‑6.2 will propagate gaps into the final XLSX figures.

---

## 4. Action items before starting Prompt 13

1. **Implement `convert.py`**

   ```python
   rate = await get_rate(invoice["date"], src, dst)
   converted = (Decimal(str(total)) * rate).quantize(Decimal("0.01"), ROUND_HALF_UP)
   input["files"][i]["converted_total"] = float(converted)
   ```
2. **Unit tests** covering:

   * happy‑path conversion
   * frankfurter‑down recovery path resets after success
   * rounding edge cases (0.005 → 0.01).
3. **Update pipeline wiring** to ensure the new totals propagate to the Excel node.
4. **Protect global state** in `currency.py` (use class‑based breaker or `contextvars`).
5. **Refactor Azure adapter** for streaming & structured logging.
6. **Add Alembic migration for any new columns** (e.g., `converted_total`).

---

## 5. Overall rating

|Scale: 0 (broken) → 5 (excellent)|Score|
|‑‑‑|‑‑‑|
|Architecture & modularity|4|
|Code quality & typing|4|
|Test coverage & CI rigor|3.5|
|Feature completeness (milestone)|2|

> **Verdict:** solid foundation with clean adapters and CI, but the milestone deliverable (converter logic) is still pending. Address the action items above before moving on to Excel generation.
