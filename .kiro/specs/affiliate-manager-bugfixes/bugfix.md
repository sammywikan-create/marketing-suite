# Bugfix Requirements Document

## Introduction

The Affiliate Manager screen exposes a "Gabungan" (Combined) mode that the admin uses to view consolidated metrics across all stores. The user reports that "jumlah gabungan ke 2 toko juga tidak terjumlah dengan baik" — the combined totals across two stores do not sum correctly — and that "banyak yang error pada menu Affiliate".

Investigation against the existing code (`src/screens/AffiliateScreen.tsx`, `src/store/useStoreManager.ts`, `src/lib/db.ts`, `src/app/page.tsx`) confirms a single structural defect that produces a cluster of visible symptoms in combined mode: data from non-active stores is never fully loaded into memory. Specifically:

- `src/app/page.tsx` calls `loadAffiliateFromSupabase(activeStoreId)` only for the currently active store, so non-active stores' affiliate summaries remain empty until the user manually switches into each store.
- `src/screens/AffiliateScreen.tsx` calls `loadAffiliateCreators(activeStore.id, ...)` only for the active store, so non-active stores never have a populated `creators[]` array.
- `src/store/useStoreManager.ts` (`partialize`) strips `creators` from `localStorage` to stay under quota, so on every page reload the in-memory `creators[]` for all stores starts empty until refetched per-store.
- The Refresh button in `AffiliateScreen.tsx` only refreshes the active store.
- The Target vs Pencapaian (Achievement) table in combined mode independently mis-aggregates: each target's "Actual" columns are computed by summing `summary.totalGMV / totalVideos / totalLive / totalOrders` across **all** stores' filtered data, not just the store that owns the target — inflating per-target achievement percentages when more than one store has data in the same period.

The fix is scoped to making "Gabungan" mode produce arithmetically correct combined totals and creator-level analyses across all stores, and to making per-store targets compare only against their owning store's actuals. Single-store mode behavior, upload flow, target CRUD, period and platform filtering, store switching, and the empty/error states must all remain unchanged.

This bugfix does not introduce new tables, new columns, or new UI surfaces — the existing `affiliate_summaries` and `affiliate_creators` tables already contain everything needed. Out of scope for this spec: any feature work tracked under `affiliate-action-driven` (action lists, sample tracker, endorsement tracker, etc.). If additional runtime errors surface during implementation that are not covered by these clauses, they will be added as new clauses before the design phase completes.

## Bug Analysis

### Current Behavior (Defect)

What currently happens when the bug is triggered.

1.1 WHEN combined mode is enabled and at least one non-active store has affiliate summary data persisted in Supabase that has not yet been pulled into the in-memory `stores[].affiliateData` for that store, THEN the system displays summary-level KPIs (Total GMV Affiliate, Total Pesanan, Refund Rate, Total Komisi, Total Video Kreator, Total LIVE, Sample Terkirim, GMV Video, GMV LIVE, GMV Product Card, Net GMV, Net GMV after Komisi, GMV per Video, GMV per LIVE, GMV per Konten, Cost per Order, Revenue per Kreator, Commission Rate) computed over only the stores whose summaries have been preloaded, omitting the non-loaded stores' contributions.

1.2 WHEN combined mode is enabled and any non-active store has creator-level rows in the `affiliate_creators` Supabase table, THEN the system computes the dashboard's creator-derived sections — KPI sub-counts "Kreator Aktif" and "dari N terdaftar", Top 10 Kreator by GMV, Pareto / Konsentrasi (80/20, Top 5, Top 10), Segmentasi Kreator (Bintang / Efisien / Potensi Tinggi / Perlu Dorong), Kreator per Tier breakdown, Status Overview Cards (Top Performer / Aktif / Perlu Dorong / Tidak Aktif / Refund Tinggi), Refund Alert >30%, the creator list in the Kreator view, GMV Program Bertarget total, and GMV Program Terbuka total — using only the active store's `creators[]` array, ignoring creators that belong to non-active stores.

1.3 WHEN combined mode is enabled, THEN the page header sub-text "X kreator aktif dari Y terdaftar — N periode data" reports `X` and `Y` from the active store only, rather than from the union of creators across all stores.

1.4 WHEN combined mode is enabled and the Target vs Pencapaian table renders a target row for a specific store, THEN the system computes that row's Actual GMV, Actual Videos, Actual LIVE, and Actual Orders by summing the matching periods' summary metrics across **all** stores (not just the store that owns the target), so when more than one store has data for the same period the displayed Actual values and the GMV achievement percentage are inflated.

1.5 WHEN combined mode is enabled and the user clicks the Refresh button in the page header, THEN the system only invokes `loadAffiliateFromSupabase(activeStore.id)` and `loadAffiliateCreators(activeStore.id, ...)`, leaving non-active stores' affiliate summaries and creators stale.

1.6 WHEN the application reloads (page refresh or fresh device) and combined mode is enabled before the user has visited the Affiliate screen for each store individually, THEN the system displays incomplete combined totals because (a) the startup effect in `src/app/page.tsx` only preloads summaries for `activeStoreId`, and (b) `partialize` in `useStoreManager` strips `creators[]` from `localStorage` so even previously cached creators are absent until refetched per store.

### Expected Behavior (Correct)

What should happen instead.

2.1 WHEN combined mode is enabled and any store has affiliate summary data in Supabase or in memory, THEN the system SHALL display summary-level KPIs (Total GMV Affiliate, Total Pesanan, Refund Rate, Total Komisi, Total Video Kreator, Total LIVE, Sample Terkirim, GMV Video, GMV LIVE, GMV Product Card, Net GMV, Net GMV after Komisi, GMV per Video, GMV per LIVE, GMV per Konten, Cost per Order, Revenue per Kreator, Commission Rate) computed over the summaries of **all** stores filtered by the active period and platform selectors, with non-active stores' summaries automatically loaded if they are not yet in memory.

2.2 WHEN combined mode is enabled, THEN the system SHALL compute the dashboard's creator-derived sections — KPI sub-counts "Kreator Aktif" / "dari N terdaftar", Top 10 Kreator by GMV, Pareto / Konsentrasi, Segmentasi Kreator, Kreator per Tier, Status Overview Cards, Refund Alert >30%, the Kreator view list, and GMV Program Bertarget / Terbuka totals — from the union of creators across **all** stores, with non-active stores' creators automatically loaded if they are not yet in memory. When the same `creator_username` appears in more than one store, the existing per-username merge logic SHALL aggregate that creator's metrics across stores using sum semantics consistent with the existing single-store aggregation.

2.3 WHEN combined mode is enabled, THEN the page header sub-text SHALL report combined-mode counts using the union of creators across **all** stores filtered by the active period and platform selectors.

2.4 WHEN combined mode is enabled and the Target vs Pencapaian table renders a target row, THEN the system SHALL compute that row's Actual GMV, Actual Videos, Actual LIVE, and Actual Orders by summing only the matching periods' summary metrics from the store that owns the target, so each target's achievement percentage reflects only that store's performance.

2.5 WHEN combined mode is enabled and the user clicks the Refresh button in the page header, THEN the system SHALL refresh affiliate summaries and creators for **all** stores from Supabase and reflect the refreshed data in the dashboard once the refresh completes.

2.6 WHEN the application reloads or runs on a fresh device with combined mode enabled, THEN the system SHALL ensure that summaries and creators for **all** stores are loaded into memory before displaying combined-mode metrics, either eagerly at startup or on combined-mode toggle, so the totals never silently omit a store.

### Unchanged Behavior (Regression Prevention)

Existing behavior that must be preserved.

3.1 WHEN combined mode is OFF (single-store mode), THEN the system SHALL CONTINUE TO display all KPIs, Top 10, Pareto, Segmentasi, Tier Breakdown, Status Counts, Refund Alert, the Kreator view list, Target vs Pencapaian rows, Tren Bulanan, New vs Repeat creators, and the Comparison view using only the active store's data, exactly as before this fix.

3.2 WHEN the user uploads new affiliate data via the Upload Data modal in single-store mode, THEN the system SHALL CONTINUE TO parse the files, call `saveAffiliateData(activeStore.id, ...)`, persist to Supabase via `saveAffiliateSummary` / `saveAffiliateCreators`, store raw files in `useRawFileStore`, and reload creators from Supabase using the existing flow.

3.3 WHEN the user adds, edits, or deletes an affiliate target via the Target Form modal in single-store mode, THEN the system SHALL CONTINUE TO persist the target on the active store via `saveAffiliateTarget(activeStore.id, target)` or remove it via `deleteAffiliateTarget(activeStore.id, targetId)`, with no change to the storage shape.

3.4 WHEN the user changes the Period dropdown or the Platform dropdown, THEN the system SHALL CONTINUE TO apply those filters to `allMonths` using the existing predicates `d.periodRaw === selectedPeriod` and `d.platform === platformFilter`, in both single-store and combined modes.

3.5 WHEN the user switches the active store via the StoreSelector header, THEN the system SHALL CONTINUE TO update the Affiliate dashboard to reflect the newly active store, with combined mode auto-resetting period selection per the existing toggle behavior.

3.6 WHEN combined mode is enabled and the user views the Tren Bulanan table or the New vs Repeat Creators section or the Comparison view, THEN the system SHALL CONTINUE TO display per-period rows tagged with their owning store name (`_storeName`) using the existing rendering logic, with no change to row identity, sort order, or growth-percentage calculation beyond what is required by clauses 2.1–2.6.

3.7 WHEN combined mode is enabled and the user opens the Creator Drill-Down modal for any creator, THEN the system SHALL CONTINUE TO show that creator's per-period history derived from the in-memory `allMonths`, with no regression in modal layout, history filtering, or the per-row store column.

3.8 WHEN the upload modal is rendered, THEN the system SHALL CONTINUE TO be hidden in combined mode (existing behavior: `!combinedMode && <UploadButton ... />`), since uploads are scoped to a single active store.

3.9 WHEN Supabase is not configured (`isSupabaseConfigured === false`) or Supabase calls fail, THEN the system SHALL CONTINUE TO degrade gracefully using local Zustand data only, with no new uncaught exceptions introduced by the fix.

3.10 WHEN single-store mode is active and the user clicks Refresh, THEN the system SHALL CONTINUE TO refresh only the active store's data using the existing `loadAffiliateFromSupabase(activeStore.id)` and `loadAffiliateCreators(activeStore.id, ...)` calls.
