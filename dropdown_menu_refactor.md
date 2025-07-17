# Dropdown Menu Refactor — Implementation Blueprint

> **Goal**  Replace the current currency dropdown(s) with a single, accessible, React‑based component that matches the visual spec provided, supports search, virtualised scrolling, default selection, and smooth keyboard/mouse UX.
>
> **Scope**  Frontend only. No API changes.

---

## 0. Prerequisites & Conventions

* **Stack** React 18 + Typescript, Vite, Tailwind CSS, Headless‑UI, Jest + React‑Testing‑Library, Cypress for e2e.
* **Format & Lint** ESLint, Prettier, Ruff (for any Python scripts), Black (for docs/scripts).
* **Branching** Feature branch `feat/currency-select-refactor`. All steps include _red → green → refactor_ TDD loop.
* **Commit mantra** Small, atomic commits. After _every_ prompt: **commit → unit tests → lint → format → e2e (if touched) → push**.

---

## 1. High‑Level Roadmap

| Phase | Deliverable | Why | Expected PRs |
|-------|-------------|-----|--------------|
| **P1** | Baseline tests & scaffolding | Prevent regressions; prove failing tests | 1 |
| **P2** | Data layer refactor (`fetchCurrencies`, cache) | Single source of truth | 2 |
| **P3** | Core `<CurrencySelect>` (static list, no search) | Vertical slice MVP | 3 |
| **P4** | Search box + keyboard nav | Key UX | 4 |
| **P5** | Virtualised dropdown, fixed window, scroll bar | Perf & spec match | 5 |
| **P6** | Theming & visual polish | Meet design | 6 |
| **P7** | Accessibility & a11y tests | WCAG AA | 7 |
| **P8** | Delete legacy `Choices.js`, drop DOM events | Debt payoff | 8 |
| **P9** | Documentation & migration guide | DX | 9 |

---

## 2. Iterative Breakdown

Below each phase is decomposed into _chunks_ (C) and then into _steps_ (S). Steps are intentionally bite‑sized (≤ 30 LOC / ≤ 15 min work) to keep reviews fast.

### Phase 1 – Baseline & Safety Net

* **C1.1** Create failing snapshot test of existing dropdown → prove visual bug.
  * **S1.1.1** Add Jest snapshot for current `Choices` dropdown.
  * **S1.1.2** Document expected truncation issue in test todo.
* **C1.2** Add Cypress e2e navigating to currency dropdown.
  * **S1.2.1** Visit page, open dropdown, assert item `USD` visible.
  * **S1.2.2** Take Percy visual snapshot (if available).

### Phase 2 – Data Layer

* **C2.1** Move util files to `/src/lib/currency`.
  * **S2.1.1** Create folder & barrel export.
  * **S2.1.2** Update imports with codemod.
* **C2.2** Add type `Currency { code: string; name: string }` and Zod schema.
  * **S2.2.1** Write unit tests for schema parse.
* **C2.3** Add `fetchCurrencies()` with localStorage & 24 h TTL.
  * **S2.3.1** Mock `fetch` success.
  * **S2.3.2** Mock network error → expect thrown.

### Phase 3 – MVP Component

* **C3.1** Scaffold `<CurrencySelect>` with Headless‑UI Combobox.
  * **S3.1.1** Render static list, no filtering.
  * **S3.1.2** Expose `value` / `onChange` props.
* **C3.2** Add default value prop & storybook story.
  * **S3.2.1** Unit test default value shown.

### Phase 4 – Search & Keyboard UX

* **C4.1** Embed search input inside Combobox button.
  * **S4.1.1** Filter list onChange.
  * **S4.1.2** Arrow keys highlight items.
* **C4.2** Add debounce (200 ms) to filter util.
  * **S4.2.1** Unit test debounce.

### Phase 5 – Virtualisation & Fixed Window

* **C5.1** Integrate `react-window`.
  * **S5.1.1** Replace `<Combobox.Options>` with virtual list of 8 rows.
  * **S5.1.2** Set fixed width `w-80`, max‑h `h-72`, overflow‑y scroll.
* **C5.2** Ensure scroll bar styled (Tailwind `scrollbar` plugin).
  * **S5.2.1** Visual regression test.

### Phase 6 – Theming & Visual Polish

* **C6.1** Apply spacing & icon (chevron).
  * **S6.1.1** Add glyph icons.
* **C6.2** Truncate only selected value, not list items.
  * **S6.2.1** CSS tweak & test.

### Phase 7 – Accessibility

* **C7.1** Run `@axe-core/react`.
  * **S7.1.1** Fix any violations.
* **C7.2** Add screen‑reader announcement for count.
  * **S7.2.1** Unit test with `jest-axe`.

### Phase 8 – Cleanup & Migration

* **C8.1** Delete `dropdown.js`, CSS, tests.
  * **S8.1.1** Search & remove legacy markup.
* **C8.2** Update docs, CHANGELOG.

### Phase 9 – Docs & Hand‑off

* **C9.1** Add README section.
  * **S9.1.1** Explain `<CurrencyProvider>` usage.
* **C9.2** Publish Storybook.

---

## 3. Code‑Generation LLM Prompt Series

Each prompt lives in its own fenced block and is **self‑contained**: it recaps current repo state, states acceptance tests, and ends with the _commit → test → lint → format → continue_ mantra.

### Prompt 1  : _Setup baseline tests_
```text
You are working in `feat/currency-select-refactor`.
Task: Create baseline failing snapshot & e2e tests to capture current dropdown bug.
Steps:
1. Add Jest snapshot test `dropdown.legacy.spec.tsx` rendering the page that contains the `Choices.js` dropdown. Mark `TODO` comment that width truncates.
2. Add Cypress test `dropdown_legacy.cy.ts` that:
   - visits `/` (or the relevant route),
   - clicks the currency dropdown,
   - asserts that the list contains "USD – United States", but viewport width causes ellipsis.
3. Ensure tests **fail** (snapshot mismatch) to prove issue.

After implementation **always commit**, then run: `pnpm test`, `pnpm lint`, `pnpm ruff`, `pnpm format` (Black for Python tools), and push. Once CI is green, _continue to the next prompt automatically_.
```

### Prompt 2  : _Refactor data utils_
```text
Context: Baseline tests are in place. Now create a dedicated data layer.
Task:
1. Under `src/lib/currency`, create:
   - `types.ts` exporting `Currency` interface.
   - `schema.ts` exporting Zod schema to validate fetched JSON.
   - `fetchCurrencies.ts` implementing fetch with 24 h cache in `localStorage`.
2. Add unit tests in `__tests__/lib/currency/` that mock `fetch` and `localStorage`.
3. Update any imports to use new path (codemod).

After implementation **always commit**, run tests & linters, then continue automatically.
```

### Prompt 3  : _Currency context & skeleton component_
```text
Context: Data layer ready.
Task:
1. Create `CurrencyProvider` in `src/contexts/CurrencyContext.tsx` using React `createContext`, storing `selectedCurrency` and `setSelectedCurrency`.
2. Scaffold `CurrencySelect` component using Headless‑UI `Combobox` that renders a **static** list of codes from `useCurrencies()` hook (wraps fetch util).
3. Add a Storybook story demonstrating default value "USD".
4. Write unit test asserting that default value renders.

Always commit, test, lint, format, then continue.
```

### Prompt 4  : _Search & keyboard navigation_
```text
Context: Basic dropdown works but no search.
Task:
1. Add an `<input>` inside the Combobox button (similar to Headless‑UI example).
2. Implement case‑insensitive filtering with 200 ms debounce (use `useDebounce` custom hook).
3. Ensure arrow‑key navigation skips filtered items and Enter selects.
4. Update tests: simulate typing "za" expect list highlights Zambia.

Always commit, test, lint, format, then continue.
```

### Prompt 5  : _Virtualised options & fixed window_
```text
Context: List can be > 180 items; we need perf & fixed size.
Task:
1. Replace `<Combobox.Options>` children mapping with `react-window` `<FixedSizeList>` of height 288 px (h‑72) showing ~8 rows.
2. Style dropdown with Tailwind: `w-80` fixed width, `overflow-y-auto`.
3. Ensure selected item scrolls into view on open.
4. Cypress test: Open dropdown, scroll to bottom, ensure "ZMW" visible.

Always commit, test, lint, format, then continue.
```

### Prompt 6  : _Visual polish_
```text
Context: UX spec requires chevron icon, spacing, no ellipsis in list items.
Task:
1. Add Heroicon chevron inside button, rotate on open (transition).
2. Apply `whitespace-pre` to option rows; apply `truncate` only to button label.
3. Use Tailwind `scrollbar` util for thin scroll bar.
4. Update snapshots.

Always commit, test, lint, format, then continue.
```

### Prompt 7  : _Accessibility fixes_
```text
Context: Need WCAG AA.
Task:
1. Add `jest-axe` tests to CurrencySelect story rendering.
2. Fix any color contrast by adjusting Tailwind classes.
3. Announce "{n} results available" on search via visually hidden span and `role="status"`.

Always commit, test, lint, format, then continue.
```

### Prompt 8  : _Remove legacy code_
```text
Context: New component is stable.
Task:
1. Delete `src/dropdown.js`, `dropdown.css`, their tests.
2. Search codebase for `currency:change` DOM events and remove.
3. Replace any `<select id="currency-picker">` with `<CurrencySelect />`.
4. Ensure all pages import `CurrencyProvider` at root.

Always commit, test, lint, format, then continue.
```

### Prompt 9  : _Docs & wrap‑up_
```text
Context: Cleanup done.
Task:
1. Update `README.md` with usage snippet and migration notes.
2. Add changelog entry.
3. Publish Storybook to GH Pages (if configured).

Always commit, test, lint, format. 🎉 Project complete.
```

---

## 4. Review & Right‑Sizing Check

* **Atomicity** – Each prompt changes ≤ 3 files (~100 LOC) and is followed by test updates.
* **Fail‑fast** – New functionality is gated by failing tests first (TDD).
* **Safety Nets** – Unit + Cypress + jest‑axe + visual snapshots ensure regression coverage.
* **Progress** – Each prompt is functional; if halted mid‑way, the app still builds & runs.

---

### Usage

Hand this file to your code‑generation LLM. Instruct it to execute **Prompt 1** first. After GitHub Actions pass, the bot proceeds to **Prompt 2**, and so on until **Prompt 9** completes.

---

Happy shipping! 🚀

