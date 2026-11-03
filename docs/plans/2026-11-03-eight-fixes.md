# 8-Fixes Implementation Plan (code-quality findings, no-logic-change)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate all 8 code-quality findings while keeping runtime behavior identical (100% no logic change), then deploy.

**Architecture:** Per item, characterization-tests-first (lock current behavior with tests, then split internals verbatim + import back, prove with residual-diff 0 + full suite + build). Item 8 is deferred to a maintenance window (sets AUTH_SECRET = logs out the whole factory).

**Tech Stack:** React 18 + Vite 5 + Vitest + eslint (complexity warn/25, no-undef error) + Cloudflare Pages.

**Spec:** code-quality review 2026-11-03 (8 findings); interview Grill decisions 2026-11-03 (item 8 deferred, test-before-split mandatory, thickest-tests-first order).

## Global Constraints

- No runtime behavior change, ever — every item ends with full suite green + build green + residual-diff 0 on moved code.
- Never touch `AUTH_SECRET`, password hashing, or dependency versions in this plan.
- Every commit message ends with `(no logic change)`.
- Deploy once at the very end (all 7 code items), after final verification.
- Skip gate only with explicit user override per item.

---

### Task 1: Cylinders main component (73)

**Files:**
- Read: `src/features/cylinders/Cylinders.jsx` (default export ~line 476+)
- Create: characterization tests in `src/features/cylinders/` (render with existing mock pattern from `CylindersTagSubTab.test.jsx`)
- Modify: `src/features/cylinders/Cylinders.jsx` (extract only)
- Create: `src/features/cylinders/cylinderMainParts.jsx` (extracted views)

**Interfaces:**
- Consumes: helpers from `./cylinderParts.jsx` (unchanged signatures)
- Produces: same default export + same named exports (stub test must stay green)

- [ ] **Step 1: Read main component, list its render states** (list / print_machine_tag / print_tag + filters)
- [ ] **Step 2: Write characterization render tests** for each state (copy mock pattern from `CylindersTagSubTab.test.jsx`)

Run: `npx vitest run src/features/cylinders/` — Expected: PASS (locks behavior)
- [ ] **Step 3: Extract one view block verbatim** to `cylinderMainParts.jsx` + import back
- [ ] **Step 4: Prove residual-diff 0** on moved lines (same technique as prior phases)
- [ ] **Step 5: Full suite + build**

Run: `npx vitest run --pool=forks --maxWorkers=2` (expect 0 failed) + `npm run build` (expect success)
- [ ] **Step 6: Commit** (`refactor(cylinders): ... (no logic change)`)

### Task 2: Dashboard main component (75)

**Files:**
- Read: `src/features/dashboard/Dashboard.jsx` (default export)
- Create: characterization tests in `src/features/dashboard/` (existing `DashboardRepairFilter.test.jsx` covers helpers only — add render tests)
- Modify: `src/features/dashboard/Dashboard.jsx`
- Create: `src/features/dashboard/dashboardViews.jsx` as needed

**Interfaces:**
- Consumes: `./dashboardHelpers.jsx` (unchanged)
- Produces: same default export (stub test must stay green)

- [ ] **Step 1: Read, list KPI cards + sections + drilldown states**
- [ ] **Step 2: Write characterization tests, run to PASS**
- [ ] **Step 3: Extract verbatim + import back**
- [ ] **Step 4: Prove residual-diff 0**
- [ ] **Step 5: Full suite + build**
- [ ] **Step 6: Commit** (`refactor(dashboard): ... (no logic change)`)

### Task 3: PMPlan main component (78)

**Files:**
- Read: `src/features/pm/PMPlan.jsx` (default export, 5 tabs: plan/center_check/needle/log/monthly_schedule)
- Create: characterization tests in `src/features/pm/` (no direct test exists — render with mocks)
- Modify: `src/features/pm/PMPlan.jsx`
- Create: `src/features/pm/pmTabs.jsx` as needed

**Interfaces:**
- Consumes: `./pmHelpers.jsx`, sibling tabs (unchanged)
- Produces: same default export (stub test must stay green)

- [ ] **Step 1: Read, list 5 tabs + shared state**
- [ ] **Step 2: Write characterization tests, run to PASS** (`npx vitest run src/features/pm/`)
- [ ] **Step 3: Extract verbatim + import back**
- [ ] **Step 4: Prove residual-diff 0**
- [ ] **Step 5: Full suite + build** (`npx vitest run --pool=forks --maxWorkers=2`, `npm run build`)
- [ ] **Step 6: Commit** (`refactor(pm): ... (no logic change)`)

### Task 4: CenterCheck main component (75)

**Files:**
- Read: `src/features/pm/CenterCheck.jsx` (default export, Single/Double flows)
- Create: characterization tests in `src/features/pm/`
- Modify: `src/features/pm/CenterCheck.jsx`
- Create: `src/features/pm/centerCheckViews.jsx` as needed

**Interfaces:**
- Consumes: `./centerCheckParts.jsx` (unchanged)
- Produces: same default export

- [ ] **Step 1: Read, list Single/Double flows + shared state**
- [ ] **Step 2: Write characterization tests, run to PASS** (`npx vitest run src/features/pm/`)
- [ ] **Step 3: Extract verbatim + import back**
- [ ] **Step 4: Prove residual-diff 0**
- [ ] **Step 5: Full suite + build** (`npx vitest run --pool=forks --maxWorkers=2`, `npm run build`)
- [ ] **Step 6: Commit** (`refactor(centercheck): ... (no logic change)`)

### Task 5: NeedleStock main component (73)

**Files:**
- Read: `src/features/needlestock/NeedleStock.jsx` (~2222 lines, 3 tabs)
- Create: characterization tests in `src/features/needlestock/` (modals already extracted + tested patterns exist)
- Modify: `src/features/needlestock/NeedleStock.jsx`
- Create: `src/features/needlestock/needleStockViews.jsx` as needed

**Interfaces:**
- Consumes: `./StockTransactionModal.jsx`, `./needleSetModals.jsx` (unchanged)
- Produces: same default export (stub test must stay green)

- [ ] **Step 1: Read, list 3 tabs + shared state**
- [ ] **Step 2: Write characterization tests, run to PASS** (`npx vitest run src/features/needlestock/`)
- [ ] **Step 3: Extract verbatim + import back**
- [ ] **Step 4: Prove residual-diff 0**
- [ ] **Step 5: Full suite + build** (`npx vitest run --pool=forks --maxWorkers=2`, `npm run build`)
- [ ] **Step 6: Commit** (`refactor(needlestock): ... (no logic change)`)

### Task 6: Async handler complexity 90

**Files:**
- Locate: run `npx eslint src/features/ | grep "complexity of 9"` to pinpoint (last seen 546:55)
- Read the enclosing component first, then follow Task 1 steps

**Interfaces:**
- Produces: identical behavior (characterization test mandatory — this one has no name, so extra care)

- [ ] **Step 1: Locate + read enclosing component**
- [ ] **Step 2: Characterization tests, run to PASS**
- [ ] **Step 3: Extract verbatim + import back**
- [ ] **Step 4: Prove residual-diff 0**
- [ ] **Step 5: Full suite + build**
- [ ] **Step 6: Commit** (`refactor(...): ... (no logic change)`)

### Task 7: NeedleCondition main component (58)

**Files:**
- Read: `src/features/pm/NeedleCondition.jsx`
- Create: characterization tests in `src/features/pm/`
- Modify + create view file as needed

**Interfaces:**
- Produces: same default export

- [ ] **Step 1: Read component + list states**
- [ ] **Step 2: Write characterization tests, run to PASS** (`npx vitest run src/features/pm/`)
- [ ] **Step 3: Extract verbatim + import back**
- [ ] **Step 4: Prove residual-diff 0**
- [ ] **Step 5: Full suite + build** (`npx vitest run --pool=forks --maxWorkers=2`, `npm run build`)
- [ ] **Step 6: Commit** (`refactor(needle): ... (no logic change)`)

### Task 8: Release (after Tasks 1–7 all green)

- [ ] **Step 1: Final full suite + build + lint (0 errors)**
- [ ] **Step 2: Bump version** (`node scripts/bump-version.mjs` — patch)
- [ ] **Step 3: Commit, push, deploy** (`wrangler pages deploy dist --project-name textileops-cmms`)
- [ ] **Step 4: Verify live** (`/sw.js` cache name + key routes HTTP 200)

(Item 8 of findings — AUTH_SECRET — is explicitly OUT of this plan; separate maintenance window.)
