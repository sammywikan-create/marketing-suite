# Implementation Plan

> Bug condition methodology. Tasks 1–2 are written and run BEFORE the fix:
> Task 1 (bug condition exploration) MUST FAIL on unfixed code to prove the bugs exist.
> Task 2 (preservation) MUST PASS on unfixed code to capture baseline behavior.
> Task 3 applies the fix. Task 4 is the final checkpoint.
>
> Design references: see `design.md` §Correctness Properties (Property 1A, 1B, 2, 3, 4),
> §Bug Details (isBugCondition_load, isBugCondition_target), §Fix Implementation, §Error Handling.
>
> Stack note: this repo runs **Next.js 16.2.4 + React 19** with breaking changes vs. older
> versions. Before writing or editing any Next.js / React code (esp. `src/app/page.tsx` and the
> Vitest + React 19 test setup), read the relevant guide under `node_modules/next/dist/docs/`.

- [x] 1. Write bug condition exploration tests (BEFORE implementing the fix)
  - **Property 1A: Bug Condition** - Combined Total Omits Non-Active Stores (Bug A)
  - **Property 1B: Bug Condition** - Target vs Pencapaian Aggregates Across All Stores (Bug B)
  - **Property 3: Bug Condition** - Refresh in Combined Mode Only Touches Active Store
  - **CRITICAL**: These tests MUST FAIL on the unfixed code — failure confirms the bugs exist.
  - **DO NOT attempt to fix the test or the code when they fail** in this task. Failure is the goal.
  - **NOTE**: These tests encode the expected (correct) behavior — they will validate the fix when they pass after implementation (re-run in tasks 3.9–3.11).
  - **GOAL**: Surface concrete counterexamples that demonstrate Bug A and Bug B.
  - Set up test infrastructure first (none exists in `package.json`): add `vitest`, `@vitest/ui`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, and `fast-check` as devDependencies; add a `"test": "vitest --run"` script; create `vitest.config.ts` with the `jsdom` environment and React 19 / Next 16 plugin wiring (read `node_modules/next/dist/docs/` for the current testing guidance before configuring).
  - **Property 1A (Bug A) — `isBugCondition_load`**: Build a Zustand `stores[]` fixture with ≥2 stores where only the active store has populated `affiliateData[]`/`creators[]` in memory and the non-active store is empty (simulates cold reload + `partialize` stripping creators). Render `AffiliateScreen` in combined mode and assert `agg.totalGMV === Σ singleStoreAgg(s).totalGMV` over ALL stores, and `agg.totalCreators >= 1`. Quantify across platform filters. **Scoped PBT approach**: anchor the generator on the concrete failing shape (active=A has data, B empty) for reproducibility, then widen to 1..5 stores.
  - **Property 1B (Bug B) — `isBugCondition_target`**: Build 2 stores, same period, where Store A target Jan = 50jt, A actual Jan = 30jt, B actual Jan = 40jt (B has no target). Render Target vs Pencapaian in combined mode and assert Store A's target row `actualGMV === 30_000_000` (NOT 70jt). Add the `period === "all"` variant (assert owner-only sum). Respect active platform filter.
  - **Property 3 — Refresh fan-out**: Spy on `loadAffiliateFromSupabase` / `loadAffiliateCreators`. Click Refresh in combined mode and assert the loaders are invoked for ALL stores (≥ `stores.length` times), not just the active store.
  - Run all three tests on UNFIXED code via `npm run test`.
  - **EXPECTED OUTCOME**: All three FAIL (1A: B contributes 0; 1B: actual shows 70jt; 3: loader called once for active store only). This is correct — it proves the bugs exist.
  - Document the counterexamples reported by `fast-check` (e.g., "combined totalGMV = GMV(A) instead of GMV(A)+GMV(B)", "target A actualGMV = 70000000 instead of 30000000", "refresh spy callCount = 1, expected >= 2").
  - Mark this task complete when the tests are written, run, and their failures are documented.
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6 (bug surfaced by current behavior 1.1, 1.2, 1.4, 1.5, 1.6)_

- [~] 2. Write preservation property tests (BEFORE implementing the fix)
  - **Property 2: Preservation** - Single-Store Mode Output Unchanged
  - **Property 4: Preservation** - Graceful Degradation When Supabase Unavailable
  - **IMPORTANT**: Follow observation-first methodology — record actual outputs of the UNFIXED code for non-bug-condition inputs (`combinedMode === false`, or `stores.length === 1`, or Supabase offline), then write property-based tests asserting those observed outputs across the input domain.
  - **Property 2 — single-store regression baseline**: Using `fast-check`, generate 1-store states (0..12 periods, 0..200 creators, targets at random periods). Capture golden snapshots from the UNFIXED code for `agg`, `creatorList`, `statusCounts`, and the Target vs Pencapaian rows. Add a single-store Refresh spy assertion: clicking Refresh calls ONLY `loadAffiliateFromSupabase(activeStore.id)` and `loadAffiliateCreators(activeStore.id, ...)` exactly once each, and never calls `loadAllAffiliateSummaries`.
  - **Property 4 — graceful degradation baseline**: Mock `isSupabaseConfigured === false` (and a variant where every Supabase call throws). Generate random states and assert no uncaught exception escapes and the UI degrades to existing local Zustand data.
  - Run both tests on UNFIXED code via `npm run test`.
  - **EXPECTED OUTCOME**: Both PASS (this confirms the baseline behavior the fix must preserve).
  - Mark this task complete when the tests are written, run, and passing on unfixed code.
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10_

- [ ] 3. Fix combined-mode multi-store loading (Bug A) and per-target aggregation scope (Bug B)

  - [~] 3.1 Add `loadAllAffiliateSummaries` orchestrator to `useStoreManager`
    - In `src/store/useStoreManager.ts`, add `loadAllAffiliateSummaries(storeIds?: string[]) => Promise<{ ok: string[]; failed: { id: string; error: unknown }[] }>` to `StoreManagerState`.
    - Default `storeIds` to `get().stores.map(s => s.id)`.
    - Implement with `Promise.allSettled`, calling the existing `loadAffiliateFromSupabase(id)` per id so one store's failure does not drop the others; return `{ ok, failed }`.
    - Do NOT modify `partialize` (creators remain stripped from `localStorage`; summaries are small and stay) and do NOT change the signature of the existing `loadAffiliateFromSupabase`.
    - _Bug_Condition: isBugCondition_load(state) — non-active store has Supabase data not in memory while combinedMode is true_
    - _Expected_Behavior: all stores' summaries loaded so combined agg = Σ per-store agg (Property 1A)_
    - _Preservation: existing `loadAffiliateFromSupabase` and `partialize` shape unchanged (Property 2)_
    - _Requirements: 2.1, 2.6_

  - [~] 3.2 Replace single-store startup preload with all-store summaries in `page.tsx`
    - In `src/app/page.tsx`, replace the `useEffect` (~lines 119–122) that calls `loadAffiliateFromSupabase(activeStoreId)` with a two-phase effect: wait until `_supabaseInitStatus === 'done'` (or `'offline'`) and `stores.length > 0`, then call `loadAllAffiliateSummaries()` (default all stores).
    - Change the dependency array to `[stores.length, supabaseInitStatus, loadAllAffiliateSummaries]` (no longer `[activeStoreId]`). Keep the existing `.catch(() => {})` tolerance.
    - Read `node_modules/next/dist/docs/` for current Next 16 / React 19 effect and client-component guidance before editing this app-router file.
    - _Bug_Condition: isBugCondition_load — cold reload preloads only activeStoreId (root cause #1)_
    - _Expected_Behavior: eager summaries for ALL stores at mount (Hybrid strategy, Property 1A)_
    - _Preservation: graceful degradation on Supabase error preserved via silent catch (Property 4)_
    - _Requirements: 2.1, 2.6, 3.9_

  - [~] 3.3 Add combined-mode creators loading effect in `AffiliateScreen`
    - In `src/screens/AffiliateScreen.tsx`, keep the existing single-store "Load creators" effect (~lines 98–119) unchanged for the single-store path.
    - Add a second effect active when `combinedMode === true`: iterate `stores`, call `loadAffiliateCreators(s.id, period, plt)` per store via `Promise.allSettled`, store results in new state `combinedSupabaseCreators: Record<string, AffiliateCreatorItem[]>`. On per-store failure, set `combinedSupabaseCreators[s.id] = []` (do not blank the whole map).
    - Reuse the existing `cancelled`-flag cancel-token pattern to guard rapid toggle / filter changes. Dependency array: `[combinedMode, stores.length, selectedPeriod, platformFilter]`.
    - Lazy-on-toggle creators per the Hybrid loading strategy decision.
    - _Bug_Condition: isBugCondition_load — non-active stores never had creators[] populated (root causes #2, #3)_
    - _Expected_Behavior: union of creators across all stores available in combined mode (Property 1A)_
    - _Preservation: single-store creators effect untouched; cancel-token race protection (Property 2)_
    - _Requirements: 2.2, 2.6, 3.9_

  - [~] 3.4 Modify `agg` creator-source selection for combined mode in `AffiliateScreen`
    - In the `agg` useMemo (~lines 158–302), change `creatorSource` so combined mode uses `Object.values(combinedSupabaseCreators).flat()` when non-empty, else falls back to `filteredData.flatMap(d => d.creators)`; single-store mode keeps the existing `supabaseCreators`/local fallback logic.
    - Leave the per-username `creatorMap` merge (keyed on `creatorUsername`) unchanged so the same creator across stores is summed.
    - The header sub-text "X kreator aktif dari Y terdaftar" (~lines 426–429) needs no change — it reads `agg.activeCreators`/`agg.totalCreators`, which become correct once the union is in place.
    - _Bug_Condition: isBugCondition_load — agg trusted incomplete memory (root cause #4)_
    - _Expected_Behavior: creator-derived sections + header counts computed over all-store union (Property 1A; Req 2.2, 2.3)_
    - _Preservation: single-store creatorSource path and per-username merge unchanged (Property 2)_
    - _Requirements: 2.2, 2.3_

  - [~] 3.5 Scope Target vs Pencapaian `periodData` to the owning store (Bug B)
    - In `src/screens/AffiliateScreen.tsx`, tag combined-mode targets with `_storeId` (alongside the existing `_storeName`); tag single-store targets with `activeStore.id`.
    - Replace the buggy `periodData` lookup (~line 1073) that filtered `allMonths`/`filteredData` with a lookup scoped to the target owner: resolve `owner = combinedMode ? stores.find(s => s.id === t._storeId) : activeStore`, build `ownerMonths = (owner?.affiliateData || []).filter(platform)`, then `periodData = t.period === "all" ? ownerMonths : ownerMonths.filter(d => d.periodRaw.startsWith(t.period))`.
    - Re-apply the active platform filter in both modes for consistency. Leave the summary row (`sumActualGMV = agg.totalGMV`, `sumTargetGMV = Σ targets.targetGMV`) unchanged — both sides remain cross-store consistent.
    - _Bug_Condition: isBugCondition_target(target, owner, allMonths, combinedMode) — actuals summed across all stores (root causes #6, #7)_
    - _Expected_Behavior: per-target actuals = Σ owner.affiliateData metrics for matching periods only (Property 1B)_
    - _Preservation: single-store target rows and platform filter predicate unchanged (Property 2; Req 3.4)_
    - _Requirements: 2.4_

  - [~] 3.6 Branch the Refresh handler by `combinedMode` in `AffiliateScreen`
    - In the Refresh button handler (~lines 519–541): keep the single-store branch (`combinedMode === false`) exactly as-is (`loadAffiliateFromSupabase(activeStore.id)` + `loadAffiliateCreators(activeStore.id, ...)`).
    - Add the combined-mode branch: call `useStoreManager.getState().loadAllAffiliateSummaries()` and the all-store creators loader for `stores.map(s => s.id)` with current `period`/`plt`, then update `combinedSupabaseCreators`. Reuse the existing `isLoadingCreators` spinner state.
    - _Bug_Condition: isBugCondition_load — refresh only touched active store (root cause #5)_
    - _Expected_Behavior: refresh fans out to all stores; combined agg reflects fresh data (Property 3)_
    - _Preservation: single-store Refresh calls unchanged (Property 2; Req 3.10)_
    - _Requirements: 2.5, 3.10_

  - [~] 3.7 Add partial-failure handling and graceful degradation
    - Use the `{ ok, failed }` return from `loadAllAffiliateSummaries`: on the Refresh path show a `react-hot-toast` message (all ok → success; partial → warning listing failed store names; all failed → error). Keep the mount path silent (consistent with existing `.catch(() => {})`).
    - Add the optional in-screen warning banner in combined mode when `failedStores.length > 0` ("Data toko {names} belum termuat. Total mungkin tidak lengkap.").
    - Ensure `__SUPABASE_NOT_CONFIGURED__` from `requireSupabase()` is caught inside the `Promise.allSettled` loops and reported as a failed/offline entry — no new uncaught exception.
    - _Bug_Condition: combined mode with k of N Supabase calls failing_
    - _Expected_Behavior: fail-soft — successful stores update, failures surfaced, no crash (Property 4)_
    - _Preservation: graceful degradation with local Zustand data when Supabase unavailable (Property 4; Req 3.9)_
    - _Requirements: 3.9_

  - [~] 3.8 Verify build and types
    - Run `npm run lint` and `npx tsc --noEmit` (and `npm run build` if needed) to confirm no type or lint regressions across the three modified files.
    - _Requirements: 3.1, 3.9_

  - [~] 3.9 Verify Bug A exploration test now passes
    - **Property 1A: Expected Behavior** - Combined Total = Sum Per-Store Totals
    - **IMPORTANT**: Re-run the SAME test from task 1 — do NOT write a new test.
    - Run via `npm run test`. **EXPECTED OUTCOME**: Property 1A PASSES (combined totals and creator union now sum across all stores).
    - _Requirements: 2.1, 2.2, 2.3, 2.5, 2.6_

  - [~] 3.10 Verify Bug B exploration test now passes
    - **Property 1B: Expected Behavior** - Per-Target Actuals From Owning Store Only
    - **IMPORTANT**: Re-run the SAME test from task 1 — do NOT write a new test.
    - Run via `npm run test`. **EXPECTED OUTCOME**: Property 1B PASSES (target row actuals reflect owner store only); also confirm Property 3 (refresh fan-out) now PASSES.
    - _Requirements: 2.4, 2.5_

  - [~] 3.11 Verify preservation tests still pass
    - **Property 2: Preservation** - Single-Store Mode Output Unchanged
    - **Property 4: Preservation** - Graceful Degradation When Supabase Unavailable
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests.
    - Run via `npm run test`. **EXPECTED OUTCOME**: Both PASS (no regressions; single-store golden snapshots and offline degradation unchanged).
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10_

- [~] 4. Checkpoint - Ensure all tests pass
  - Run the full suite with `npm run test` plus `npm run lint`; confirm Property 1A, 1B, 2, 3, 4 all pass and the build is clean.
  - Optionally walk the manual integration scenarios from `design.md` §Integration Tests (cold-reload combined totals, per-store targets, partial-failure banner, Supabase offline, single-store regression smoke).
  - Ensure all tests pass; ask the user if questions arise.
