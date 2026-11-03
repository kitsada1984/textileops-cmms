# src/features — Feature folders (ADR-0002)

Every route page lives here. `src/pages/` contains **only** thin re-export
stubs + stub-guard tests, so `App.jsx` lazy routes never change.

```
features/
  auth/         Login.jsx
  cylinders/    Cylinders.jsx (+ 3 co-located tests)
  d1test/       D1TestPage.jsx (+ test)
  dashboard/    Dashboard.jsx (+ test)
  designbom/    DesignBom.jsx
  logs/         Logs.jsx (+ test)
  needlestock/  NeedleStock.jsx
  pm/           PMPlan.jsx + PMLog.jsx + CenterCheck.jsx + NeedleCondition.jsx
  presentation/ Presentation.jsx (+ test)
  purchasing/   Purchasing.jsx (+ test)
  repairflow/   RepairPage.jsx            (named `repairflow` to avoid clashing
                                          with src/modules/repair/)
  reports/      Reports.jsx
  settings/     SettingsPage.jsx (+ test)
  spareparts/   SpareParts.jsx
  stock/        StockMovement.jsx
  users/        Users.jsx
  webbuilder/   WebBuilder.jsx
  workorders/   WorkOrders.jsx + RepairRequests.jsx (+ test)
```

`src/pages/machines/` predates this layout and is the reference example
(`useMachinesLogic` + Desktop/Mobile/Tablet views).

## Rules for moving the next page here (no-logic-change recipe)

1. `git mv src/pages/X.jsx src/features/<name>/X.jsx` (+ its tests/siblings
   that nothing else imports — verify with grep first).
2. Fix only import prefixes: `from '../` → `from '../../`.
   Test `vi.mock('../...')` paths need the same fix — check **before** running.
   Sibling `./Y` imports: move Y along, or rewrite to `../../pages/Y`
   (do the generic replace first, sibling second — never stacked).
3. Leave a 5-line stub at `src/pages/X.jsx` (`export { default }` + `export *`)
   plus a `*Stub.test.js` guard asserting 1:1 re-export.
4. Prove zero logic diff per file: line-by-line compare old vs new after the
   prefix fix must show **residual-diff 0**.
5. Run the stub test, then the full suite (`npm test`), then `npm run build`.

## Guards that lock this layout

- `src/pages/*Stub.test.js` — stub === implementation, no extra exports.
- `src/exportsStable.test.js` — public names of entities/repair/document modules.
- `src/repoHygiene.test.js` + `scripts/check-secrets.mjs` — no tracked secrets.
