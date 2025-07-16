# Currency Dropdown – Prompt‑Driven Implementation Plan

## 1 Blueprint (High‑Level)

| Phase | Goal | Deliverables |
|-------|------|--------------|
| 0 | **Project Setup** | Vite + Jest + ESLint scaffold; Choices.js as external dep |
| 1 | **Data Layer** | `/currencies.json` stub + fetch util with timeout + cache helper |
| 2 | **Core Logic** | `filterCurrencies()` + `buildOptions()` pure functions + unit tests |
| 3 | **UI Skeleton** | Hidden `<select>` + basic dropdown markup, no styling |
| 4 | **Live Search** | Wire search input → filter → render list; keyboard nav minimal |
| 5 | **Keyboard & ARIA** | Full combobox roles, arrow nav, Esc, focus management |
| 6 | **Choices.js Enhancement** | Replace hand‑rolled UI with Choices component; keep tests |
| 7 | **Events & Integration** | Emit `currency:change` + update hidden field, form hookup |
| 8 | **Resilience** | Error states, JS‑off fallback, localStorage caching, CSP safe |
| 9 | **Polish & Perf** | Bundle size check, Lighthouse a11y >= 90, gzip < 25 kB |
| 10 | **CI & Docs** | GitHub Actions: lint, test, bundle‑size, spec docs in README |

Each phase is small enough (≤ ½ day) and has tests; complexity increases gradually.

---

## 2 Iterative Chunking

### Iteration 1: Bootstrap
1. Init repo with Vite vanilla JS template.
2. Add Jest + Testing Library DOM; run empty test.
3. Commit ☑️ `setup-ci`.

### Iteration 2: Data utilities
1. Stub `public/currencies.json` (3 items sample).
2. Implement `fetchCurrencies()` with timeout + JSON validation.
3. Unit test success + timeout + bad JSON.

### Iteration 3: Pure functions
1. Write failing tests for `filterCurrencies()` & `sortCurrencies()`.
2. Implement functions.
3. Achieve 100 % branch coverage.

### Iteration 4: UI skeleton
1. Static HTML with hidden `<select>` + `<div id="dropdown-root">`.
2. JS `renderDropdown(list)` that prints list unfiltered.
3. Cypress e2e: list renders 3 items.

### Iteration 5: Incremental search
1. Add `<input type="search">`.
2. On input, call `filterCurrencies()` and re‑render.
3. Cypress: type `U` → only USD.

### Iteration 6: Keyboard nav + ARIA
1. Add roles `combobox` & `listbox`.
2. Arrow ↑/↓ selection, Enter to choose, Esc closes.
3. RTL tests for key events.

### Iteration 7: Choices.js switch
1. Install Choices and replace custom DOM with library.
2. Ensure `searchEnabled:true`, custom `fuseSearch` off.
3. Update tests to interact via Choices API.

### Iteration 8: Integration & events
1. Hidden select receives value.
2. Dispatch `currency:change` event.
3. e2e: listen to event & assert code.

### Iteration 9: Caching & offline
1. Save fetched JSON to localStorage with TTL.
2. Test: intercept failed fetch → uses cache.

### Iteration 10: Perf & CI
1. Lighthouse script; ensure a11y ≥ 90.
2. bundle‑size CI gate (< 25 kB gz).
3. Update README install & usage.

---

## 3 Ultra‑Small Tasks (Final Right‑Sizing)
Below every iteration is decomposed into 1–3 hr tickets.

> Example for **Iteration 3: Pure functions**
>
> **T3‑1** Add empty `currency-utils.test.js` and red test for `filterCurrencies()`.
>
> **T3‑2** Implement skeleton `currency-utils.js` exporting empty fns.
>
> **T3‑3** Implement filtering logic until tests green.
>
> **T3‑4** Add `sortCurrencies()` tests → impl.
>
> **T3‑5** Add branch‑coverage Jest config.

(Repeated for all iterations in backlog appendix.)

---

## 4 Prompt Series for Code‑Gen LLM

Each section below is a literal prompt (fenced in ```text```). Send them one‑by‑one to the coding LLM; after code is returned, run tests locally, then move to next.

### Prompt A – Repo Bootstrap
```text
You are a senior JS engineer. Initialise a new Vite vanilla project named "currency‑dropdown". Add Jest + @testing-library/dom. Configure `npm test` to run Jest with jsdom. Provide the diff for package.json and a bootstrap `src/main.js` that logs "Hello dropdown". Include Git commands.
```

### Prompt B – Data Fetch Utility
```text
Objective: implement `src/fetchCurrencies.js` that exports async function `fetchCurrencies(url, { timeoutMs = 5000 } = {})`.
Requirements:
1. Abort fetch after timeout.
2. Throw `CurrencyFetchError` on 4xx/5xx or invalid JSON.
3. Return array of `{ code, name }` objects.
Write Jest tests covering success, timeout, invalid JSON, http error (use `whatwg-fetch` mock).
Output only the files changed.
```

### Prompt C – Filtering Helpers
```text
Create `src/currency-utils.js` with:
- `filterCurrencies(list, query)` – case‑insensitive match on code or name.
- `sortCurrencies(list)` – ascending by name.
Write unit tests (Jest) for both functions (≥ 6 cases). Ensure 100 % statement coverage.
```

### Prompt D – Dropdown Skeleton
```text
Add to `index.html` a label, hidden `<select id="currency-picker">`, and `<div id="dropdown-root"></div>`.
Implement `src/dropdown.js` that:
1. Calls `fetchCurrencies('/currencies.json')`.
2. Renders simple list items inside `#dropdown-root`.
Provide minimal CSS so list is visible.
Add Cypress test visiting `/` and asserting 3 list items show.
```

### Prompt E – Live Search Wiring
```text
Enhance dropdown:
1. Add search `<input id="currency-search">` above list.
2. On input, call `filterCurrencies()` and re-render results.
3. Highlight matching substring (wrap in `<strong>`).
Update Cypress test: type "usd" → one result.
```

### Prompt F – Accessibility & Keyboard Nav
```text
Add ARIA roles: container = combobox, list = listbox, each item = option.
Implement ↑/↓ navigation, Enter to commit, Esc to collapse list (hide via CSS).
Use `aria-activedescendant`.
Add RTL tests for key handling.
```

### Prompt G – Swap to Choices.js
```text
Remove custom search DOM and integrate Choices.js:
1. Install choices.js & import css.
2. Convert hidden `<select>` into Choices instance with `searchEnabled:true`.
3. Populate via JS from fetched list.
Ensure previous tests still pass (update selectors if needed).
```

### Prompt H – Event Emission & Hidden Field
```text
On Select event from Choices, set value of hidden `<select>` and dispatch custom event `currency:change` with `{ detail:{ code } }`.
Write Cypress test: listen to event, pick SGD, expect detail.code === 'SGD'.
```

### Prompt I – Caching Layer
```text
Add `src/cache.js` exposing `getCached(key)` and `setCached(key, data, ttlSeconds)`.
Modify `fetchCurrencies()` to use cache (key = 'currencies_v1', ttl = 86400).
Write tests: first call fetches network; second within ttl uses cache; after ttl expired fetches again.
```

### Prompt J – CI & Perf Gate
```text
Add GitHub Action `.github/workflows/ci.yml` running:
- `npm ci`
- `npm run lint`
- `npm test -- --coverage`
- `npm run build` then `npx gzip-size dist/assets/*.js` and fail if >25kB.
```

---

## 5 Review & Adjustments
- Each prompt builds on previous artefacts; no orphan code.
- Tests accompany every new behaviour.
- Complexity increases gradually: utils → DOM → library → caching.
- Last prompt wires CI ensuring future safety.

**Ready for execution.**

