# Code Review – Milestone **Prompt 2 **``

> Scope: repo skeleton, shared tooling (Poetry + Ruff + Black), Node tooling (package.json + Jest + ESLint), pre‑commit, and GitHub Actions CI.\
> The codebase already contains *future‑phase* files (FastAPI sources, dev‑container, etc.). I flag those where they create friction, but the primary evaluation criterion is compliance with Prompt 2.

---

## 1. Repository Layout & Hygiene

| ✅ Strengths                                                                | ⚠️ Issues / Risks                                                                                                                                                                    | 🛠️ Action Items                                                                                                                               |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| *Clear top‑level dirs* (`backend/`, `frontend/`) were created as required. | **Out‑of‑scope code committed too early**: full implementations under `src/`, devcontainer, and FastAPI scaffolding. This bloats the diff and can break the incremental prompt plan. | ‑ Remove or move phase‑3+ code to separate branches.‑ Enforce branch naming (e.g. `feature/C‑1‑backend-scaffold`).                             |
| `.gitignore` is exhaustive and covers Python & Node tooling.               | Huge ignore file duplicates many patterns (e.g. `node_modules/` appears twice). Large lists become maintenance burden.                                                               | Deduplicate & split language‑specific ignores into `/backend/.gitignore` and `/frontend/.gitignore` included via the root ignore’s `!` syntax. |

---

## 2. Python Tooling

### 2.1 ``

```toml
[tool.poetry]
name = "invoice-converter"  # l.6
version = "0.1.0"
...
fastapi = "^0.104.1"       # l.18 (future phase)
uvicorn = {extras=["standard"], version="^0.24.0"}
...
httpx = "^0.25.2"          # also duplicated in [tool.poetry.group.dev] (l.30)
```

| ✅                                                                                | ⚠️                                                                                                                     | 🛠️                                                                                                                                                                                 |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Poetry with groups is great; Ruff + Black settings match prompt line‑length 120. | *Scope creep*: runtime deps (FastAPI, Uvicorn, SQLAlchemy, Azure SDK) not needed yet. Duplicate `httpx` in prod & dev. | ‑ Defer non‑tooling deps until chunk **C‑1.1**. ‑ Keep *only* tooling deps (`pytest`, `ruff`, `black`, etc.) for now. ‑ Remove duplicate `httpx` or pin exact version in one place. |

### 2.2 **Root **``** (Hatch)**

A second build system (

```toml
[build-system]
requires = ["hatchling"]  # l.1
```

) co‑exists with Poetry fileciteturn1file11 – this will confuse tooling and CI which expect *one* lock‑file.

> **Recommendation**: Delete the root `pyproject.toml` or convert everything to Poetry mono‑repo workspace.

### 2.3 Pre‑commit (`.pre-commit-config.yaml`)

```yaml
- id: ruff
  args: [--fix, --exit-non-zero-on-fix]  # l.24
```

*Pros*: auto‑fixing lint errors keeps diffs clean. *Cons*: on CI this will modify code and fail subsequently. Better: run `ruff check` (no `--fix`) in CI, keep `--fix` only locally via pre‑commit.

---

## 3. JavaScript/TypeScript Tooling

### 3.1 `frontend/package.json`

| ✅                                                      | ⚠️                                                                            | 🛠️                                                                                                   |
| ------------------------------------------------------ | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Minimal scripts (`test`, `lint`, `build`) meet prompt. | Missing **type‑safe ESLint parser config** (React version detection warning). | Add `"extends": ["plugin:react/recommended"]` and configure React version or use automatic detection. |
| Uses Node 20 per prompt.                               | `test` script just `jest`; coverage threshold not enforced per spec.          | Add `--coverage --maxWorkers=2` and fail under e.g. 80 %.                                             |

### 3.2 `frontend/jest.config.js`

```js
moduleNameMapper: {
  '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
},
transform: {
  '^.+\\.(ts|tsx)$': 'ts-jest'
},
```

Good defaults. **Issue**: `testMatch` uses `.(test|spec).(ts|tsx)` but glob braces are literal, not regex, so Jest will not pick up `App.test.tsx`. Use `**/*.(test|spec).(ts|tsx)` or the `**/?(*.)+(spec|test).[tj]s?(x)` pattern.

---

## 4. GitHub Actions CI (`.github/workflows/ci.yml`)

```yaml
backend-tests:
  defaults:
    run:
      working-directory: ./backend        # l.10
...
- name: Install dependencies
  if: steps.cached-poetry-dependencies.outputs.cache-hit != 'true'
  run: poetry install --no-interaction --no-root  # l.27
- name: Install project
  run: poetry install --no-interaction            # l.30
```

| ✅                                                                       | ⚠️                                                                                                                          | 🛠️                                                                                                             |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Separate backend & frontend jobs. Node 20 and Python 3.11 match prompt. | Poetry install runs **twice**, wasting minutes. Cache key uses `poetry.lock` but file not committed yet (only `pyproject`). | ‑ Drop the second install or switch the first to `--only main --no‑root`.‑ Commit `poetry.lock` and pin hashes. |
| Backend linting runs Ruff, Black, isort.                                | **Frontend lint/test results are not uploaded**. No coverage gate yet.                                                      | Add `coverage/summary` upload step and enforce threshold (<80 % fails).                                         |
| Cache for virtualenv saves minutes.                                     | **Missing Node modules cache** (actions/cache for `~/.npm`).                                                                | Add cache keyed on `package-lock.json`.                                                                         |

---

## 5. Tests

Both placeholder tests compile and run ✔️

*But* end‑to‑end CI does not fail if tests are absent – add a `--runIfChanged` style check or require minimum coverage.

---

## 6. Miscellaneous

- **Devcontainer** already bundled (Dockerfile & config). Nice, but hold off committing to `main` until phase 10 to avoid noise.
- CLAUDE.md & prompt\_plan/spec/todo docs are helpful for AI agents – keep them.

---

## 7. Priority Fix List (next PR)

1. **Resolve dual build systems**: pick Poetry mono‑repo or Hatch; delete the other.
2. **Trim dependencies to tooling‑only** until backend scaffold is merged.
3. Simplify `.github/workflows/ci.yml` (single Poetry install, Node cache, coverage badge).
4. Tighten Jest `testMatch` and add coverage threshold.
5. Remove or gatekeep future‑phase code (use feature branches).
6. Split `.gitignore` and reduce duplication.
7. Adjust pre‑commit vs CI linting modes (no `--fix` on CI).

---

## 8. Overall Assessment

The foundation delivers the requested tooling, but the repository has jumped several prompts ahead, risking merge conflicts and breaking the incremental, test‑driven approach. By tightening scope, deduplicating configuration, and adding the missing coverage gates, the team will have a cleaner starting point for the next milestones.

