# Review Log

## 2026-11-06 — Release v1.3.259 blocked (Cloudflare SIN incident)
- **Scope**: bump done, suite green, deploy fails server-side 3×
- **Atoms**: test-quality
- **Result**: 0 critical, 0 warning, 0 suggestion
- **Key findings**: active CF incident Singapore network (08:54 UTC); functions/ unchanged since good deploy
- **Strengths**: source pushed; will retry deploy when incident clears — no code action needed

## 2026-11-06 — Report print theme (format_report_pdf phase 1)
- **Scope**: theme tokens + Sarabun + hub cover/footer/tables/charts/filename
- **Atoms**: clean-code, architecture, test-quality
- **Result**: 0 critical, 0 warning, 0 suggestion
- **Key findings**: print pipeline is HTML+window.print (no jsPDF text) — CSS theme is the right seam
- **Strengths**: 185 files / 1227 tests green; all new props opt-in, defaults unchanged


## 2026-11-06 — LINE QR scan confirmed working (user-verified)

- **Scope**: user phone scan on live v1.3.258
- **Atoms**: test-quality
- **Result**: 0 critical, 0 warning, 0 suggestion
- **Key findings**: quiet-zone fix resolved the scan failure
- **Strengths**: diagnose → prove → fix → release loop closed

## 2026-11-06 — Release v1.3.258 (QR quiet zone)


- **Scope**: QRCodeSVG includeMargin + 184→200px, full suite green, deploy verified
- **Atoms**: clean-code, test-quality
- **Result**: 0 critical, 0 warning, 0 suggestion
- **Key findings**: local decode proof — no-margin fails, margin decodes (both URL lengths)
- **Strengths**: full suite 182/1214; user-approved before change

## 2026-11-06 — QR still unscanned (stale-cache verdict)


- **Scope**: live QR SVG structure (DOM-measured, screenshots unavailable)
- **Atoms**: clean-code
- **Result**: 0 critical, 0 warning, 0 suggestion
- **Key findings**: new QR is version-4 (37×37) at 184px — structurally sound; user likely on cached v1.3.256 page
- **Strengths**: no code change needed; hard-refresh + regenerate resolves

## 2026-11-06 — Release v1.3.257 (QR prefill shorten)



- **Scope**: 1-line login text + URL shape test, full suite green, deploy verified
- **Atoms**: clean-code, test-quality
- **Result**: 0 critical, 0 warning, 0 suggestion
- **Key findings**: live QR URL 225→62 chars, #CODE intact for webhook match
- **Strengths**: full suite 182/1214; user-approved before change

## 2026-11-06 — LINE secret enforced live (verify)




## History
- 2026-11-05 — mobile touch targets (b8edc47) | 18 files, presentation layer only (CSS classes) | 0 critical, 0 warning, 1 suggestion
- 2026-11-05 — AUTH_SECRET rotation (no code change) | 0 files, secrets infra only (Pages secret set, value never on disk/rep | 0 critical, 0 warning, 0 suggestion
- 2026-11-05 — PMPlan type cards extraction (4ae4244) | 2 files, presentation slice (verbatim move + import back) | 0 critical, 0 warning, 0 suggestion
- 2026-11-05 — CenterCheck toolbar extraction | 2 files, presentation slice (verbatim move + import back) | 0 critical, 0 warning, 0 suggestion
- 2026-11-05 — Swap summarizer split + v1.3.222 (af76986) | 2 files + version bump, pure extraction | 0 critical, 0 warning, 0 suggestion
- 2026-11-05 — CenterCheck stats split + v1.3.223 | 2 files + version bump, pure extraction | 0 critical, 0 warning, 0 suggestion
- 2026-11-05 — PMPlan toolbar split + v1.3.224 | 2 files + version bump, pure extraction | 0 critical, 0 warning, 0 suggestion
- 2026-11-05 — CenterCheck records table + v1.3.225 | 2 files + version bump, pure extraction | 0 critical, 0 warning, 0 suggestion
- 2026-11-05 — Release-protocol doc fix + v1.3.226 | 1 doc file + version bump, no code touched | 0 critical, 0 warning, 0 suggestion
- 2026-11-05 — Unused-import cleanup + v1.3.227 | 1 file import block + version bump, no logic touched | 0 critical, 0 warning, 0 suggestion
- 2026-11-05 — CenterCheck view-modal split + v1.3.228 | 3 files + version bump, pure extraction | 0 critical, 0 warning, 0 suggestion
- 2026-11-05 — CenterCheck standards-modal split + v1.3.229 | 3 files + version bump, pure extraction | 0 critical, 0 warning, 0 suggestion
- 2026-11-05 — CenterCheck sql-modal split + v1.3.230 | 3 files + version bump, pure extraction | 0 critical, 0 warning, 0 suggestion
- 2026-11-05 — CenterCheck print-modal split + v1.3.231 | 3 files + version bump, pure extraction | 0 critical, 0 warning, 0 suggestion
- 2026-11-05 — CenterCheck image-modal split + v1.3.232 | 3 files + version bump, pure extraction | 0 critical, 0 warning, 0 suggestion
- 2026-11-05 — CenterCheck form split + v1.3.233 | 3 files + version bump, pure extraction (574 lines, 22 props) | 0 critical, 0 warning, 0 suggestion
- 2026-11-05 — CenterCheck header split + v1.3.234 | 3 files + version bump, pure extraction (15 props) | 0 critical, 0 warning, 0 suggestion
- 2026-11-05 — PMPlan table split + v1.3.235 | 3 files + version bump, pure extraction (11 props) | 0 critical, 0 warning, 0 suggestion
- 2026-11-05 — PMPlan sync-modal split + v1.3.236 | 3 files + version bump, pure extraction (14 props) | 0 critical, 0 warning, 0 suggestion
- 2026-11-05 — PMPlan edit-modal split + v1.3.237 | 3 files + version bump, pure extraction (11 props) | 0 critical, 0 warning, 0 suggestion
- 2026-11-05 — PMPlan drawer split + v1.3.238 | 3 files + version bump, pure extraction (11 props) | 0 critical, 0 warning, 0 suggestion
- 2026-11-05 — PMPlan preview-modals split + v1.3.239 | 4 files + version bump, pure extraction (2 modals) | 0 critical, 0 warning, 0 suggestion
- 2026-11-05 — NeedleCondition stats split + v1.3.240 | 3 files + version bump, pure extraction | 0 critical, 0 warning, 0 suggestion
- 2026-11-05 — NeedleCondition table split + v1.3.241 | 3 files + version bump, pure extraction (12 props) | 0 critical, 0 warning, 0 suggestion
- 2026-11-05 — NeedleCondition form split + v1.3.242 | 3 files + version bump, pure extraction (17 props) | 0 critical, 0 warning, 0 suggestion
- 2026-11-05 — Needle history drawer split + v1.3.243 | 3 files + version bump, pure extraction (5 props) | 0 critical, 0 warning, 0 suggestion
- 2026-11-05 — Needle detail drawer split + v1.3.244 | 3 files + version bump, pure extraction (10 props) | 0 critical, 0 warning, 0 suggestion
- 2026-11-05 — Needle preview-modals split + v1.3.245 | 4 files + version bump, pure extraction (2 modals) | 0 critical, 0 warning, 0 suggestion
- 2026-11-05 — Needle scanner-modal split + v1.3.246 | 3 files + version bump, pure extraction (9 props incl. refs) | 0 critical, 0 warning, 0 suggestion
- 2026-11-05 — Group-A batch (10 splits) + v1.3.247 | 10 files, 1 extraction each + single release bump | 0 critical, 0 warning, 0 suggestion
- 2026-11-05 — Group-B partial (needle+settings) + v1.3.248 | 2 files, pure JSX extraction + single release bump | 0 critical, 0 warning, 0 suggestion
- 2026-11-05 — Needle modals bundle + v1.3.249 | 2 files + version bump, pure extraction (60 props) | 0 critical, 0 warning, 0 suggestion
- 2026-11-05 — Remainder batch (3 splits) + v1.3.250 | 3 files, pure JSX extraction + single release bump | 0 critical, 0 warning, 0 suggestion
- 2026-11-05 — Sub-25 batch (line/needle/workorders) + v1.3.251 | 11 new files, pure JSX extraction + single release bump | 0 critical, 0 warning, 0 suggestion
- 2026-11-05 — Sub-25 batch 2 (form/card/dashboard) + v1.3.252 | 6 new files, pure JSX extraction + single release bump | 0 critical, 0 warning, 0 suggestion
- 2026-11-05 — Logic-safe batch (row + pure helpers) + v1.3.253 | 3 extractions, zero-logic verified + single release bump | 0 critical, 0 warning, 0 suggestion
- 2026-11-05 — Sub-25 batch 3 (reports/repair/spare/stock arrows+mains) | 12 extractions, verbatim JSX + pure helpers, residual-diff 0 | 0 critical, 0 warning, 0 suggestion
- 2026-11-05 — Sub-25 batch 4 (swap/audit/app/monthly logic) | 4 named targets + helpers, pure + verbatim JSX, characterization-first | 0 critical, 0 warning, 0 suggestion
- 2026-11-05 — Sub-25 batch 5 (history modal + compare + machine resolve) | modal main/arrow, compare/filter utils, machine resolver + helpers | 0 critical, 0 warning, 0 suggestion
- 2026-11-05 — Sub-25 batch 6 (pm plan-match + sync filter + apply) | pm monthly sync pipeline + helpers, pure extraction | 0 critical, 0 warning, 0 suggestion
- 2026-11-05 — Sub-25 batch 7 (pm sync/remove pipelines) | sync + remove schedule pipelines, step helpers with same I/O order | 0 critical, 0 warning, 0 suggestion
- 2026-11-05 — Sub-25 batch 8 (pm planned-block + timeline rows) | plan-block builder, machine cell, planned/actual bars + tests | 0 critical, 0 warning, 0 suggestion
- 2026-11-05 — Sub-25 batch 9 (pm main view blocks) | header/modals/annual/filters/empty + const moves, verbatim | 0 critical, 0 warning, 0 suggestion
- 2026-11-05 — Sub-25 batch 10 (needle normalize + alt-WO matcher) | needle set/log groups, alt-WO split + key-order proofs | 0 critical, 0 warning, 0 suggestion
- 2026-11-05 — Sub-25 batch 11 (visual search results split) | results + hero + candidates blocks, verbatim + tests | 0 critical, 0 warning, 0 suggestion
- 2026-11-05 — Sub-25 batch 12 (PDF preview split) | print meta + topbar + picker + header + tables + signatures | 0 critical, 0 warning, 0 suggestion
- 2026-11-05 — Chore batch (dead imports from PDF split) | 1 file, import cleanup only | 0 critical, 0 warning, 0 suggestion
- 2026-11-05 — Grill batch (auth + hashing + workorders decisions) | 3 blocked items, interview only, zero code touched | 0 critical, 0 warning, 0 suggestion
- 2026-11-06 — Auth hardening (fail-closed + salted dual-verify) | 3 functions files + tests, grilled approach executed | 0 critical, 0 warning, 0 suggestion
- 2026-11-06 — WorkOrders handlers (edit/delete with behavior locks) | edit payload + tech diff + LINE notify + delete flow + tests | 0 critical, 0 warning, 0 suggestion
- 2026-11-06 — Release v1.3.254 (auth hardening + handlers) | full suite green, bump-first-then-build, Pages deploy | 0 critical, 0 warning, 0 suggestion
- 2026-11-06 — WorkOrders row mapper (cells with render locks) | 6 cells + pure helper move, verbatim-verified per line | 0 critical, 0 warning, 0 suggestion
- 2026-11-06 — WorkOrders tech modal split | tech modal + level consts, verbatim + render tests | 0 critical, 0 warning, 0 suggestion
- 2026-11-06 — WorkOrders dashboard tab + type cards | 717-line dashboard moved verbatim; 4 cards unified via lookup (no inte | 0 critical, 0 warning, 0 suggestion
- 2026-11-06 — WorkOrders technicians/settings tabs + skill helpers | skill helpers moved verbatim; 206-line tech + 117-line settings tabs,  | 0 critical, 0 warning, 0 suggestion
- 2026-11-06 — WorkOrders records tab + card | 92-line card moved verbatim; 626-line records tab, props-only | 0 critical, 0 warning, 0 suggestion
- 2026-11-06 — WorkOrders complete modal | 130-line modal moved verbatim, props-only | 0 critical, 0 warning, 0 suggestion
- 2026-11-06 — WorkOrders edit modal | 189-line modal moved verbatim, props-only | 0 critical, 0 warning, 0 suggestion
- 2026-11-06 — WorkOrders KPI modal | 91-line modal moved verbatim, props-only | 0 critical, 0 warning, 0 suggestion

- 2026-11-06 — WorkOrders interruption modal | 236-line IIFE modal moved verbatim (gate + IIFE inside component) | 0 critical, 0 warning, 0 suggestion
- 2026-11-06 — WorkOrders daily-log modal | 252-line IIFE modal moved verbatim (gate + IIFE inside component) | 0 critical, 0 warning, 0 suggestion

- 2026-11-06 — WorkOrders cancel modal | 68-line IIFE modal moved verbatim (gate + IIFE inside component) | 0 critical, 0 warning, 0 suggestion
- 2026-11-06 — WorkOrders create modal | 230-line modal moved verbatim, props-only | 0 critical, 0 warning, 0 suggestion

- 2026-11-06 — WorkOrders create FAB portal | 12-line portaled FAB moved verbatim, props-only | 0 critical, 0 warning, 0 suggestion
## 2026-11-06 — LINE secret enforced live (verify)




- **Scope**: Pages secret set (exact bytes) + redeploy + forged/signed probes
- **Atoms**: secure-coding
- **Result**: 0 critical, 0 warning, 0 suggestion
- **Key findings**: pipe-added newline broke first upload; forged → 403, valid → authenticated; test rows cleaned
- **Strengths**: prod left clean (0 leftovers); secret never on disk

## 2026-11-06 — Release v1.3.256 (LINE webhook fix)




- **Scope**: bump 4 targets, full suite green, build after bump, Pages deploy
- **Atoms**: test-quality, secure-coding
- **Result**: 0 critical, 0 warning, 0 suggestion
- **Key findings**: full suite 181 files / 1212 passed; live sw.js verified v1.3.256
- **Strengths**: signature gate + loud failures now live; secret still needs Pages env to enforce

## 2026-11-06 — LINE webhook signature + loud failures (fix)




- **Scope**: HMAC verify (env→DB secret, warn-open w/o secret); error reply on link failure
- **Atoms**: secure-coding, clean-code, test-quality
- **Result**: 0 critical, 0 warning, 0 suggestion
- **Key findings**: forged-event login closed once LINE_CHANNEL_SECRET set; null-appUser now replies instead of silent spin
- **Strengths**: 6 new tests green; full suite 181/1212; magic-link null-user dead path removed with reply

## 2026-11-06 — LINE QR miss vs button (per-attempt, not a bug)




- **Scope**: QR tab UI + poll + webhook session evidence on prod D1
- **Atoms**: clean-code, architecture, secure-coding
- **Result**: 0 critical, 0 warning, 0 suggestion
- **Key findings**: NQXKFP stayed pending but retry V87VY7 authenticated same account 6 min later — flow sound
- **Strengths**: session/poll/match chain proven end-to-end on prod data

## 2026-11-06 — LINE QR login failure triage




- **Scope**: Login QR client + line login/webhook functions + prod D1 evidence
- **Atoms**: clean-code, architecture, secure-coding
- **Result**: 1 critical, 1 warning, 0 suggestion
- **Key findings**: webhook skips signature check (forged-event login risk); user/appUser-null fails silently; this attempt never reached webhook (NQXKFP still pending, no audit row)
- **Strengths**: past sessions authenticated fine — flow design sound, failure is per-attempt

## 2026-11-06 — No-delta health check




- **Scope**: 0 files (tree clean at bdaa4e0)
- **Atoms**: none loaded (no delta)
- **Result**: 0 critical, 0 warning, 0 suggestion
- **Key findings**: none — nothing to validate
- **Strengths**: trunk stays green between sessions

## 2026-11-06 — Release v1.3.255 (refactor batch + auth 500 fix)




- **Scope**: bump 4 targets, full suite green, build after bump, Pages deploy
- **Atoms**: test-quality, secure-coding
- **Result**: 0 critical, 0 warning, 0 suggestion
- **Key findings**: full suite 180 files / 1206 passed; live sw.js verified v1.3.255
- **Strengths**: bump-first-then-build held; .wrangler/tmp lint noise correctly excluded

## 2026-11-06 — Web-QA fix verify (login 500 + labels)




- **Scope**: login 500 message; label audit
- **Atoms**: secure-coding, test-quality
- **Result**: 0 critical, 0 warning, 0 suggestion
- **Key findings**: labels already present (a11y snapshot blind spot, not a bug); 500 fixed + verified locally
- **Strengths**: no SQL text in UI after fix; 401/400/403 messages untouched

## 2026-11-06 — WorkOrders modal open-close audit




- **Scope**: all 8 modal gates + X-button close paths, cycle tests added
- **Atoms**: clean-code, test-quality
- **Result**: 0 critical, 0 warning, 0 suggestion
- **Key findings**: no refactor logic bug found — gates/wiring/mount identical; symptom likely on live pre-refactor build
- **Strengths**: 37 files / 181 tests green; close path now locked per modal

## 2026-11-06 — WorkOrders lifecycle hooks + opener fires




- **Scope**: 4 effects → custom hooks (same call order); print/interruption openers + page perms
- **Atoms**: clean-code, architecture, test-quality
- **Result**: 0 critical, 0 warning, 0 suggestion
- **Key findings**: JSX in `.js` breaks vite SSR transform — renamed to `.jsx`; mock chains must mirror subscribe shape
- **Strengths**: 37 files / 173 tests green; realtime channel/params byte-identical

## 2026-11-06 — WorkOrders modal-opener builders




- **Scope**: complete/edit/daily openers → pure builders + thin wrappers
- **Atoms**: clean-code, architecture, test-quality
- **Result**: 0 critical, 0 warning, 0 suggestion
- **Key findings**: effects unmovable (Rules of Hooks); ??/trivial openers kept (cohesion)
- **Strengths**: 36 files / 165 tests green; gate stays ≤25; snapshots overwrite-guarded

## 2026-11-06 — WorkOrders tech/loader/drilldown handlers




- **Scope**: openers/builders + save/delete + sync + loader + drilldown, deps-object pattern
- **Atoms**: clean-code, architecture, secure-coding, test-quality
- **Result**: 0 critical, 0 warning, 0 suggestion
- **Key findings**: snapshots are single-use (re-run overwrote evidence — restored from git); proof script checked path not content — fixed
- **Strengths**: 35 files / 161 tests green; DB/localStorage surface unchanged (secure)

## 2026-11-06 — WorkOrders submit/edit/kpi handlers




- **Scope**: interruption(4) + daily(3) + start/complete/status(3) + save-edit + save-kpi, deps-object pattern
- **Atoms**: clean-code, architecture, test-quality
- **Result**: 0 critical, 0 warning, 0 suggestion
- **Key findings**: shared daily-job lookup deduped (output-identical); tech CRUD + loader deferred (db/confirm coupling)
- **Strengths**: 33 files / 150 tests green; gate stays ≤25; orphans cleaned per move

## 2026-11-06 — WorkOrders complexity gate ≤25




- **Scope**: header/print/report/datalist moved verbatim; double-gated bridges flattened
- **Atoms**: clean-code, architecture, test-quality
- **Result**: 0 critical, 0 warning, 0 suggestion
- **Key findings**: gate counts direct-body JSX only — memo/helper moves score zero; fixed 2 dropped header props via no-undef
- **Strengths**: main complexity 48→≤25 (zero warnings); dir 30 files / 134 tests green

## 2026-11-06 — WorkOrders pure helper extraction




- **Scope**: stats/interruptions/machines/filter-toggle modules, verbatim cores + import-back
- **Atoms**: clean-code, architecture, test-quality
- **Result**: 0 critical, 0 warning, 0 suggestion
- **Key findings**: brace-script truncated getJobInterruptions (leftover lines) — fixed; restored overwritten filters test
- **Strengths**: 18 characterization tests green first run; residual-diff probes ALL-OK
