# Code Review – Milestone **Prompt 2 `tooling‑ci`** (REV‑2)

> **Updated scope:** The repository intentionally contains **future‑phase exploratory code** under `src/` (e.g., invoice extractors and exchange‑rate MCP tools). These modules **must remain** because they’ve been technically validated and will be reused in later prompts.  
> Our goal is therefore **not** to delete them, but to isolate and shield them so that Prompt‑2 deliverables (tooling & CI) stay lightweight and deterministic.

---

## 1 Repository Layout & Hygiene

| ✅ Strengths | ⚠️ Issues / Risks | 🛠️ Action Items |
|--------------|------------------|-----------------|
| Clear `backend/` & `frontend/` dirs plus `src/` for shared business logic. | The exploratory code is executed by default when imported, pulling in heavy deps (Azure SDK, SQLAlchemy) and slowing CI. | 1. **Re‑nest future logic** under `proto/` to signal WIP, e.g. `src/proto/extractors/*` and `src/proto/mcp_tools/*`.  
2. Add `__init__.py` guards (`if TYPE_CHECKING:`) so importing the top‑level `src` package doesn’t eagerly import heavy libs.  |
| `.gitignore` exhaustive. | Duplicate patterns / monolithic file. | Split into language‑specific ignores & keep concise root. |

---

## 2 Python Tooling

### 2.1 `backend/pyproject.toml`

| ✅ | ⚠️ | 🛠️ |
|----|----|----|
| Poetry configured; Ruff + Black match line‑length 120. | Runtime deps for proto code (FastAPI, Azure, openpyxl …) inflate installation even though they’re unused in Prompt‑2 jobs. | 1. Move those deps into **an optional group** `extras = ["proto"]` or `[tool.poetry.group.proto]`.  
2. Default **CI** (Prompt‑2) installs only core tooling deps; developers can `poetry install --with proto` when working on later milestones. |

### 2.2 Pre‑commit & Ruff

Keep `--fix` locally but use `ruff check` in CI (already done). No change needed.

---

## 3 JavaScript/TypeScript Tooling

Same findings as previous review. **Key fixes still required:** Jest glob, ESLint React preset, coverage threshold.

---

## 4 GitHub Actions CI

| Issue | Current | Required Fix |
|-------|---------|--------------|
| Duplicate `poetry install`. | Still happens. | Keep *one* install – use `--only main --no‑root` for cache restore, then `poetry install --no‑root` for final. |
| Node cache & `npm ci`. | Missing. | Add `cache: 'npm'` in `actions/setup-node` and switch to `npm ci`. |
| Coverage gates. | Python gate present; JS missing. | Upload Jest lcov & fail if <80 %. |
| Proto deps slow CI. | Heavy install. | Use Poetry’s `without=proto` when installing on CI. |

---

## 5 Tests & Proto Isolation

1. Retain exploratory tests (`src/tests`) **but mark them** with `pytest.mark.proto`.
2. In CI, run `pytest -m "not proto"` until Prompt‑5 when proto code becomes first‑class.

---

## 6 Miscellaneous

* **Devcontainer** may stay (helps local dev) but reference optional proto group in `postCreateCommand` so container builds succeed.
* Remove root Hatch build system (already done).

---

## 7 Updated Priority Fix List (next PR)

1. **Isolate proto code** under `src/proto/` and add import guards.
2. **Move heavy deps** to optional `proto` Poetry group; adjust `poetry.lock`.
3. **Refactor CI**
   * single Poetry install `without=proto`
   * npm cache + `npm ci`
   * coverage gates for both stacks.
4. **Update tests** with `@pytest.mark.proto` and CI exclude.
5. Tighten Jest glob & ESLint preset.
6. Split `.gitignore`.

---

## 8 Overall Assessment

With the new isolation strategy we keep validated prototypes **in‑tree** while protecting the lightweight, incremental timeline. Once these action items ship, Prompt‑2 will be green and future milestones can re‑enable the `proto` group seamlessly.

