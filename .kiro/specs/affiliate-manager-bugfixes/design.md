# Affiliate Manager Bugfixes — Bugfix Design

## Overview

Mode **Gabungan** di Affiliate Manager menampilkan total yang tidak konsisten karena dua cacat yang independen tapi terkait erat:

1. **Cacat struktural pemuatan multi-toko (Bug A).** Aplikasi hanya pernah memuat affiliate data untuk toko aktif. `src/app/page.tsx` melakukan `loadAffiliateFromSupabase(activeStoreId)` hanya untuk toko aktif, `src/screens/AffiliateScreen.tsx` melakukan `loadAffiliateCreators(activeStore.id, ...)` hanya untuk toko aktif, tombol Refresh hanya merefresh toko aktif, dan `partialize` di `src/store/useStoreManager.ts` membuang `creators[]` dari `localStorage`. Hasilnya, ketika user mengaktifkan mode Gabungan tanpa pernah mengunjungi setiap toko, `stores[].affiliateData` di memori untuk toko-toko non-aktif kosong (atau hanya berisi summary tanpa creators), sehingga setiap KPI, ranking, segmentasi, dan persentase di mode Gabungan diam-diam mengabaikan kontribusi toko tersebut.

2. **Cacat agregasi target per-toko (Bug B).** Tabel **Target vs Pencapaian** di mode Gabungan menggambar satu baris per target per toko, tetapi setiap baris menghitung `actualGMV/Videos/Live/Orders` dengan `allMonths.filter(d => d.periodRaw.startsWith(t.period))` — `allMonths` di mode Gabungan adalah union semua toko, sehingga "Actual" untuk target Toko A pada Januari ikut menjumlahkan kontribusi Toko B periode yang sama. Achievement % menjadi mengembung secara sistematis ketika ada lebih dari satu toko dengan data di periode yang sama.

Kedua cacat diperbaiki secara aditif pada read path. Tidak ada perubahan skema Supabase, tidak ada tabel/kolom baru, tidak ada perubahan UI surface. Single-store mode harus tetap identik byte-by-byte (regression-safe).

Strategi:

- **Bug A**: Memperluas `useStoreManager` dengan dua orchestrator multi-toko (`loadAllAffiliateSummaries` dan `loadAllAffiliateCreators`) yang memanggil `loadAffiliateSummaries`/`loadAffiliateCreators` per-toko secara `Promise.allSettled`. Memodifikasi `src/app/page.tsx` (preload startup) dan `src/screens/AffiliateScreen.tsx` (effect saat `combinedMode` toggle, effect saat filter berubah, dan handler Refresh). Strategi pemuatan: **hybrid eager-on-mount + lazy-on-toggle** dengan in-memory dedup cache (lihat §[Loading Strategy Decision](#loading-strategy-decision)).
- **Bug B**: Mengubah lookup `periodData` di tabel Target vs Pencapaian dari "filter `allMonths` by period" menjadi "filter affiliateData hanya milik store yang memiliki target itu, by period". Tetap menghormati filter platform aktif.

## Glossary

- **Bug_Condition (C)**: Predikat yang menyatakan input memicu bug. Untuk fix ini ada dua: `C_load(state)` (multi-store data tidak lengkap di memori saat combined mode aktif) dan `C_target(target, allMonths)` (baris target di combined mode menjumlahkan actuals lintas toko).
- **Property (P)**: Perilaku benar yang harus dipenuhi setelah fix. Untuk Bug A: KPI gabungan = jumlah aritmetika kontribusi semua toko. Untuk Bug B: actuals per-baris-target = jumlah aritmetika hanya periode milik toko pemilik target.
- **Preservation**: Perilaku single-store mode, upload flow, target CRUD, period/platform filter, store switching, drill-down, dan empty/error state — semua harus tidak berubah.
- **F (original)**: Kode sebelum fix, di commit yang sedang aktif.
- **F' (fixed)**: Kode setelah fix.
- **`loadAllAffiliateSummaries(storeIds)`**: Orchestrator baru di `useStoreManager` yang memanggil `loadAffiliateFromSupabase(id)` untuk setiap id secara paralel, dengan `Promise.allSettled` agar 1 toko gagal tidak menjatuhkan toko lain.
- **`loadAllAffiliateCreators(storeIds, period?, platform?)`**: Helper baru (opsi: di `useStoreManager` atau di `AffiliateScreen` sebagai utility lokal) yang memanggil `loadAffiliateCreators(id, period, platform)` per toko dan mengembalikan `Record<storeId, AffiliateCreatorItem[]>`.
- **`combinedMode`**: State boolean lokal di `AffiliateScreen` yang menentukan apakah `allMonths` adalah union semua toko atau hanya toko aktif.
- **`allMonths`**: Memo di `AffiliateScreen` yang menjadi sumber baris bulan yang difilter; di combined mode adalah `stores.flatMap(s => s.affiliateData)`, di single mode adalah `activeStore.affiliateData` saja.
- **`supabaseCreators`**: State `useState<AffiliateCreatorItem[]>` di `AffiliateScreen` saat ini single-toko-only; pasca-fix berubah menjadi `Record<storeId, AffiliateCreatorItem[]>` (atau union flat dengan tag `_storeId`).

## Bug Details

### Bug A — Multi-Store Data Tidak Termuat Penuh di Combined Mode

#### Bug Condition

Bug muncul ketika `combinedMode === true` dan setidaknya satu toko non-aktif memiliki data Supabase yang belum ditarik ke `stores[].affiliateData[]` atau `creators[]` di memori.

**Formal Specification:**

```
FUNCTION isBugCondition_load(state)
  INPUT:
    state.combinedMode    : boolean
    state.stores          : Array<Store>
    state.activeStoreId   : string
    state.supabaseHas(id) : boolean      // ada baris affiliate_summaries
                                         //   atau affiliate_creators di Supabase
  OUTPUT: boolean

  IF state.combinedMode = false THEN RETURN false

  // Ada toko non-aktif yang punya data di Supabase tapi
  // tidak punya di memori (summaries atau creators)
  FOR EACH s IN state.stores DO
    IF s.id ≠ state.activeStoreId AND state.supabaseHas(s.id) THEN
      IF s.affiliateData IS EMPTY OR
         (∀ d IN s.affiliateData : d.creators IS EMPTY) THEN
        RETURN true
      END IF
    END IF
  END FOR

  RETURN false
END FUNCTION
```

#### Examples (Bug A)

- **Cold reload + 2 toko**: User punya Toko A (aktif) dan Toko B. Reload halaman, buka Affiliate, klik Gabungan. Total GMV menampilkan hanya GMV Toko A; Toko B = 0. Expected: jumlah GMV(A) + GMV(B).
- **Tidak pernah membuka Toko B**: User di device baru, hanya pernah membuka Toko A. Klik Gabungan langsung — Top 10 Kreator hanya berisi creator Toko A walaupun Toko B punya 50 creator dengan GMV besar.
- **Refresh di combined mode**: User di combined mode, klik Refresh. Toko aktif di-refresh; Toko B tetap stale. Expected: kedua toko di-refresh.
- **Edge case — Supabase empty untuk B**: Toko B baru, belum punya upload. `loadAffiliateSummaries(B)` mengembalikan `[]`. Tidak boleh dianggap error; `agg` Gabungan = kontribusi Toko A saja (correct, bukan bug).

### Bug B — Target vs Pencapaian Mengagregasi Lintas Toko

#### Bug Condition

Bug muncul ketika `combinedMode === true` dan tabel **Target vs Pencapaian** menghitung baris untuk target `t` milik store `s_owner`, tetapi `actualGMV/Videos/Live/Orders` dijumlahkan dari `allMonths` (union semua toko) alih-alih dari `s_owner.affiliateData` saja.

**Formal Specification:**

```
FUNCTION isBugCondition_target(target, target_owner, allMonths, combinedMode)
  INPUT:
    target              : AffiliateTarget         // baris target individual
    target_owner        : Store                   // toko yang memiliki target
    allMonths           : Array<AffiliateMonthData>  // union semua toko di
                                                     //   combined mode
    combinedMode        : boolean

  OUTPUT: boolean

  IF combinedMode = false THEN RETURN false   // single-store path benar

  // Periode yang relevan untuk target ini
  matching ← allMonths WHERE
    (target.period = "all") OR
    (d.periodRaw STARTS WITH target.period)

  // Bug condition: ada baris di matching yang BUKAN milik target_owner
  FOR EACH d IN matching DO
    IF d.storeId ≠ target_owner.id THEN
      RETURN true
    END IF
  END FOR

  RETURN false
END FUNCTION
```

Catatan: `d.storeId` sudah ada di `AffiliateMonthData` (lihat `src/lib/types.ts`). Tag `_storeName` ditambahkan di `useMemo` `allMonths`, tetapi `storeId` tetap intrinsik.

#### Examples (Bug B)

- **2 toko, periode sama**: Target Toko A Januari = 50 jt. Toko A Januari aktual = 30 jt; Toko B Januari aktual = 40 jt. UI saat ini menampilkan Actual = 70 jt → 140% achievement. Expected: Actual = 30 jt → 60%.
- **Target "all" period**: Target Toko A semua periode = 100 jt. Toko A all = 80 jt; Toko B all = 90 jt. UI menampilkan Actual = 170 jt → 170%. Expected: 80 jt → 80%.
- **Single store, no impact**: Hanya satu toko punya data Januari. UI menampilkan Actual yang benar; bug tidak terpicu (tapi setelah fix tetap benar).
- **Edge case — target untuk periode tanpa data**: Target Toko A Februari = 50 jt, tapi tidak ada `affiliateData` Februari di toko mana pun. Actual = 0; achievement = 0% — tidak berubah pasca-fix.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**

- Single-store mode (`combinedMode === false`) menampilkan KPI, Top 10, Pareto, Segmentasi, Tier breakdown, Status counts, Refund Alert, Kreator list, Target vs Pencapaian, Tren Bulanan, New vs Repeat, dan Comparison view persis seperti sebelum fix (Req 3.1).
- Upload Data modal di single-store mode tetap memanggil `parseAffiliateFiles`, `saveAffiliateData(activeStore.id, ...)`, persist Supabase via `saveAffiliateSummary` / `saveAffiliateCreators`, simpan raw files via `useRawFileStore`, dan reload creators (Req 3.2).
- Target CRUD lewat Target Form modal di single-store mode tetap memanggil `saveAffiliateTarget(activeStore.id, target)` / `deleteAffiliateTarget(activeStore.id, targetId)` tanpa perubahan shape (Req 3.3).
- Period dropdown dan Platform dropdown tetap memfilter `allMonths` dengan predikat `d.periodRaw === selectedPeriod` dan `d.platform === platformFilter` di kedua mode (Req 3.4).
- StoreSelector tetap update active store dan combined mode tetap auto-reset period (Req 3.5).
- Tren Bulanan, New vs Repeat, Comparison view di combined mode tetap menampilkan baris per-period dengan `_storeName` tag, urutan dan growth-percentage tidak berubah selain konsekuensi dari kelengkapan data (Req 3.6).
- Creator Drill-Down modal di combined mode tetap menampilkan history per-period dari `allMonths` dengan kolom store di tiap baris (Req 3.7).
- Upload button tetap disembunyikan di combined mode: `!combinedMode && <UploadButton ... />` (Req 3.8).
- Ketika `isSupabaseConfigured === false` atau Supabase call gagal, sistem tetap degrade gracefully dengan data Zustand lokal; tidak ada exception baru yang tidak tertangkap (Req 3.9).
- Single-store Refresh tetap memanggil `loadAffiliateFromSupabase(activeStore.id)` dan `loadAffiliateCreators(activeStore.id, ...)` saja, tidak menyentuh toko lain (Req 3.10).

**Scope:**

Semua input yang **tidak** memenuhi `combinedMode === true` harus tidak terpengaruh. Termasuk:

- Single-store mode di semua tab di `AffiliateScreen`.
- Halaman lain (`Dashboard`, `GMV*`, `Video Performance`, `OKR`, dst).
- Server-side / API routes (`src/app/api/*`) — tidak dimodifikasi.
- Skema Supabase — tidak ada migration.

Catatan: actual correct behavior didefinisikan di [§Correctness Properties](#correctness-properties) (Property 1A, 1B). Bagian ini hanya membatasi apa yang **tidak** boleh berubah.

## Hypothesized Root Cause

### Bug A — Asymmetric Active-Store Loading

1. **Startup preload terikat ke active store saja.** `src/app/page.tsx` lines ~119–122:
   ```ts
   useEffect(() => {
     if (!activeStoreId) return;
     loadAffiliateFromSupabase(activeStoreId).catch(() => {});
   }, [activeStoreId, loadAffiliateFromSupabase]);
   ```
   Dependency-nya `activeStoreId`, jadi setiap kali user switch store toko itu di-load, tapi tidak pernah ada call yang me-load **semua** toko — bahkan saat `combinedMode` aktif di child component.

2. **Creator fetch di `AffiliateScreen` terikat ke active store saja.** `src/screens/AffiliateScreen.tsx` `useEffect` di line ~98–119 memanggil `loadAffiliateCreators(activeStore!.id, period, plt)` — tidak ada loop atas `stores`. Hasilnya `supabaseCreators` selalu hanya berisi creators dari toko aktif.

3. **`partialize` membuang creators.** `useStoreManager` `partialize` (lines ~340–349) memaksa `creators: []` sebelum disimpan ke `localStorage`. Reload halaman → `affiliateData` ada (summary) tapi semua `creators[]` kosong.

4. **Combined mode `agg` mempercayai memori begitu saja.** `agg` di `AffiliateScreen` (line ~159 onwards) menjumlahkan `filteredData.reduce(...)` — kalau memori belum lengkap, sum-nya juga tidak lengkap, dan tidak ada loading guard yang membedakan "data benar-benar 0" vs "data belum di-load".

5. **Refresh button hanya menyentuh active store.** Refresh handler di `AffiliateScreen` (~line 519–541) memanggil `useStoreManager.getState().loadAffiliateFromSupabase(activeStore.id)` dan `loadAffiliateCreators(activeStore.id, ...)` — pola yang sama dengan effect di-atas, bukan loop.

### Bug B — Aggregation Scope Salah

6. **`periodData` dihitung dari `allMonths`, bukan dari toko pemilik target.** `src/screens/AffiliateScreen.tsx` line ~1074:
   ```ts
   const periodData = t.period === "all"
     ? filteredData                                 // union semua toko di combined
     : allMonths.filter((d) => d.periodRaw.startsWith(t.period));  // union semua toko
   ```
   Saat combined mode dan `targets.flatMap(...)` mengiterasi target dari semua toko, baris-baris dari toko lain ikut tersedot.

7. **Target shape sudah punya `_storeName`** (ditambahkan di line ~1040), tapi nilainya tidak digunakan untuk menyaring `periodData`. Yang dibutuhkan: `_storeId` (atau lookup `_storeName → store.id`) lalu filter `d.storeId === ownerId`.

## Correctness Properties

Property 1A: Bug A — Combined Mode Total = Sum Per-Store Totals (Idempotent under Store Ordering)

_For any_ state of `stores[]` di mana setiap toko memiliki `affiliateData[]` dan `creators[]` yang sudah lengkap di memori (precondition: post-load), aplikasi di combined mode SHALL menampilkan `agg.totalGMV`, `agg.totalOrders`, `agg.totalVideos`, `agg.totalLive`, `agg.totalCommission`, `agg.totalRefund`, `agg.videoGMV`, `agg.liveGMV`, `agg.productCardGMV`, dan `agg.sampleSent` yang sama dengan `Σ_s singleStoreAgg(s).<metric>` untuk semua toko `s`, terlepas dari urutan elemen di `stores[]` dan terlepas dari toko mana yang aktif. Untuk `agg.totalCreators` dan `agg.activeCreators`, hasil SHALL sama dengan `|union by creatorUsername|` dari semua creators di semua toko (memperhatikan logika merge per-username yang ada).

**Validates: Requirements 2.1, 2.2, 2.3, 2.5, 2.6**

Property 1B: Bug B — Per-Target Actuals Hanya Dari Owning Store

_For any_ target `t` milik toko `s_owner` di combined mode, `actualGMV(t)`, `actualVideos(t)`, `actualLive(t)`, `actualOrders(t)` di tabel Target vs Pencapaian SHALL dihitung sebagai `Σ d.summary.<metric>` untuk semua `d` di `s_owner.affiliateData` di mana `(t.period === "all") OR d.periodRaw.startsWith(t.period)`, dengan filter platform yang berlaku, dan SHALL TIDAK menyertakan kontribusi dari `affiliateData` toko lain.

**Validates: Requirements 2.4**

Property 2: Preservation — Single-Store Mode Tidak Berubah

_For any_ snapshot state di mana `combinedMode === false`, output `agg`, `creatorList`, `statusCounts`, dan tabel Target vs Pencapaian dari `F'` (kode setelah fix) SHALL sama persis dengan output dari `F` (kode sebelum fix) untuk input yang sama. Termasuk single-store Refresh handler yang harus tetap memanggil hanya `loadAffiliateFromSupabase(activeStore.id)` dan `loadAffiliateCreators(activeStore.id, ...)`.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.10**

Property 3: Preservation — Refresh di Combined Mode Mengundang Semua Toko

_For any_ klik Refresh di combined mode, sistem SHALL me-invalidate dan me-reload `stores[].affiliateData` dan `creators[]` untuk **semua** toko di `stores[]` dari Supabase. Setelah promise resolved (atau settled), `agg` Gabungan SHALL mencerminkan data terbaru. Toko yang gagal di-load (Supabase error individual) SHALL tidak menjatuhkan toko lain dan SHALL ditandai jelas (lihat §[Error Handling](#error-handling)).

**Validates: Requirements 2.5**

Property 4: Preservation — Graceful Degradation Saat Supabase Tidak Tersedia

_For any_ state di mana `isSupabaseConfigured === false` atau setiap panggilan Supabase melempar error, fix SHALL TIDAK menambah uncaught exception baru. Aplikasi SHALL tetap berfungsi dengan data Zustand lokal yang sudah ada (kalau ada), dan combined mode SHALL menampilkan agregat dari toko-toko yang punya `affiliateData` di memori, tanpa crash.

**Validates: Requirements 3.9**

## Fix Implementation

### Loading Strategy Decision

Tiga pendekatan untuk memuat data multi-toko dievaluasi:

| Strategi | Saat Memuat | Network Volume | localStorage | Race Condition | Perceived Latency |
|---|---|---|---|---|---|
| **A. Eager on app mount** | Saat `initFromSupabase` selesai untuk semua toko | Tinggi (N×summaries + lazy-on-filter creators) | Aman (creators di-strip) | Rendah; user belum bisa toggle saat masih loading | Loading lebih lama saat startup, tapi toggle Gabungan instan |
| **B. Lazy on toggle Gabungan** | Saat user pertama kali klik tombol Gabungan | Rendah saat startup; tinggi saat toggle | Aman | Sedang; user bisa toggle saat creators belum siap → spinner | Toggle Gabungan punya jeda 1–3 detik |
| **C. Hybrid (eager summaries di mount + lazy creators on toggle/filter)** | Summaries semua toko saat mount; creators per-toko on-demand | Sedang | Aman | Sedang; perlu cancel-token | Startup cepat, KPI summary muncul instan saat toggle, creators muncul setelahnya |

**Pilihan: C — Hybrid.** Alasan:

1. **Network**: Summaries kecil (1 row per store-period-platform). Creators bisa ribuan baris per toko per periode → lazy lebih hemat. Hybrid memberikan summary global instan tanpa membebani.
2. **localStorage**: Tidak relevan untuk pilihan ini karena `partialize` sudah strip creators apapun strategi yang dipilih. Summaries selalu masuk localStorage (kecil).
3. **Race condition**: Hybrid tetap perlu cancel-token (`cancelled` flag pattern yang sudah ada di `AffiliateScreen` line ~99–117) untuk melindungi terhadap rapid toggle / filter change. Pattern ini sudah teruji di kode lama.
4. **Perceived latency**: Pengguna utama (admin) jarang reload tetapi sering toggle Gabungan dan ganti period/platform. Strategi Hybrid memenuhi: KPI summary muncul tanpa jeda, creator-derived sections (Top 10, Segmentasi, Tier) loading singkat dengan spinner yang sudah ada (`isLoadingCreators`).

**Implementasi Hybrid:**

- **Mount phase (di `src/app/page.tsx`)**: Setelah `initFromSupabase()` selesai, panggil `loadAllAffiliateSummaries(stores.map(s => s.id))` (orchestrator baru). Ini mengganti pemanggilan single-store `loadAffiliateFromSupabase(activeStoreId)` yang ada di `useEffect` line ~119–122.
- **Combined mode toggle phase (di `AffiliateScreen.tsx`)**: Tambahkan effect baru yang memantau `[combinedMode, stores.length, selectedPeriod, platformFilter]`. Ketika `combinedMode === true`, panggil `loadAllAffiliateCreators(stores.map(s => s.id), period, platform)` dan simpan ke `Record<storeId, AffiliateCreatorItem[]>`.
- **Refresh handler**: Cabang berdasarkan `combinedMode`. Single-store path tidak berubah. Combined-mode path memanggil `loadAllAffiliateSummaries` + `loadAllAffiliateCreators` untuk semua toko.

### Changes Required

#### File 1: `src/store/useStoreManager.ts`

**Tambahan API**:

```ts
loadAllAffiliateSummaries: (storeIds?: string[]) => Promise<{ ok: string[]; failed: { id: string; error: unknown }[] }>
```

**Function**: `loadAllAffiliateSummaries`

**Specific Changes**:

1. **Tambah method baru di `StoreManagerState`** yang menerima opsional array `storeIds`. Default: `get().stores.map(s => s.id)`.
2. **Implementasi pakai `Promise.allSettled`** memanggil `loadAffiliateFromSupabase(id)` per id (method existing — sudah ada di store ini, idempotent terhadap state).
3. **Return summary `{ ok: [...], failed: [...] }`** untuk dipakai caller (Refresh button) menampilkan partial-failure UI.
4. **Tidak menyentuh `partialize`**. Summaries memang ringan dan boleh masuk localStorage. Yang sudah di-strip tetap creators.
5. **Tidak memodifikasi signature `loadAffiliateFromSupabase`** yang ada — tetap dipakai apa adanya untuk backward compat di `src/app/page.tsx` jalur `activeStoreId`.

#### File 2: `src/app/page.tsx`

**Function**: `useEffect` startup affiliate preload (lines ~119–122).

**Specific Changes**:

1. **Ganti** call `loadAffiliateFromSupabase(activeStoreId)` dengan **dua-fase**:
   - Fase 1: Tunggu `_supabaseInitStatus === 'done'` (atau `'offline'`) dan `stores.length > 0`.
   - Fase 2: Panggil `loadAllAffiliateSummaries()` (tanpa argumen, default semua toko).
2. **Dependency array**: `[stores.length, supabaseInitStatus, loadAllAffiliateSummaries]` — bukan `[activeStoreId]` lagi. Switching active store tidak perlu re-trigger karena summaries sudah pre-loaded.
3. **Error path**: `.catch(() => {})` tetap diam (tetap konsisten dengan kode existing yang sudah toleran terhadap Supabase down).

#### File 3: `src/screens/AffiliateScreen.tsx`

**Function 3a**: `useEffect` "Load creators from Supabase" (lines ~98–119).

**Specific Changes**:

1. **Pertahankan effect existing** untuk single-store path (tidak ada perubahan logic; preservation Property 2).
2. **Tambah effect kedua** yang aktif ketika `combinedMode === true`. Di dalamnya:
   - Iterasi `stores`, panggil `loadAffiliateCreators(s.id, period, plt)` per toko via `Promise.allSettled`.
   - Hasil disimpan di state baru `combinedSupabaseCreators: Record<string, AffiliateCreatorItem[]>`.
   - Cancel-token (`cancelled` flag) sama persis dengan effect single-store yang ada.
3. **Dependency array**: `[combinedMode, stores.length, selectedPeriod, platformFilter]` (catatan: `stores.length`, bukan `stores`, untuk menghindari re-fire pada object reference change yang tidak relevan).

**Function 3b**: `allMonths` useMemo (lines ~75–82).

**Specific Changes**:

1. **Tidak berubah** di permukaan. `combinedMode` branch tetap `stores.flatMap(s => (s.affiliateData || []).map((d) => ({ ...d, _storeName: s.name })))`.
2. **Implicit improvement**: Karena `stores[].affiliateData` sekarang lengkap di mount (Bug A fix), `allMonths` di combined mode sudah mencakup semua toko. Tidak perlu kode tambahan.

**Function 3c**: `agg` useMemo (lines ~158–302).

**Specific Changes**:

1. **Modifikasi `creatorSource` selection** (lines ~166–168). Saat ini:
   ```ts
   const useSupabase = supabaseCreators.length > 0 && !hasLocalCreators;
   const creatorSource = useSupabase ? supabaseCreators : filteredData.flatMap((d) => d.creators);
   ```
   Pasca-fix:
   ```ts
   // Combined mode: union dari semua per-store supabase creators (atau in-memory)
   // Single-store mode: tetap pakai supabaseCreators existing
   const creatorSource = combinedMode
     ? (Object.values(combinedSupabaseCreators).flat().length > 0
         ? Object.values(combinedSupabaseCreators).flat()
         : filteredData.flatMap((d) => d.creators))
     : (supabaseCreators.length > 0 && !hasLocalCreators
         ? supabaseCreators
         : filteredData.flatMap((d) => d.creators));
   ```
2. **`creatorMap` merge tidak berubah** — kunci tetap `creatorUsername`. Ketika creator yang sama muncul di lebih dari satu toko, sum-merge per-username sudah benar (Req 2.2 last sentence).

**Function 3d**: Header sub-text "X kreator aktif dari Y terdaftar" (lines ~426–429).

**Specific Changes**:

1. **Tidak ada perubahan kode** — sudah membaca `agg.activeCreators` / `agg.totalCreators`. Karena `agg` pasca-fix mencakup union semua creators (Property 1A), sub-text otomatis benar (Req 2.3).

**Function 3e**: Refresh button handler (lines ~519–541).

**Specific Changes**:

1. **Cabang berdasarkan `combinedMode`**:
   - `combinedMode === false`: kode existing tidak berubah (Property 2, Req 3.10).
   - `combinedMode === true`:
     - Panggil `useStoreManager.getState().loadAllAffiliateSummaries()`.
     - Panggil `loadAllAffiliateCreators(stores.map(s => s.id), period, plt)` (helper baru lokal yang share kode dengan effect 3a kedua).
     - Update state `combinedSupabaseCreators` dengan hasil baru.
2. **Loading state**: Tetap pakai `isLoadingCreators` yang sudah ada untuk spinner.
3. **Partial failure**: Lihat §[Error Handling](#error-handling).

**Function 3f**: Tabel Target vs Pencapaian — `periodData` calculation (line ~1073).

**Specific Changes** (Bug B):

1. **Bangun lookup storeName→storeId** (atau langsung tag target dengan `_storeId`):
   ```ts
   const targets = combinedMode
     ? stores.flatMap((s) => (s.affiliateTargets || []).map((t) => ({
         ...t,
         _storeName: s.name,
         _storeId: s.id,    // ← tambahan
       })))
     : (activeStore?.affiliateTargets || []).map((t) => ({ ...t, _storeId: activeStore!.id }));
   ```
2. **Ganti `periodData` lookup** dari `allMonths` menjadi `affiliateData` toko pemilik:
   ```ts
   // BEFORE (BUGGY):
   // const periodData = t.period === "all"
   //   ? filteredData
   //   : allMonths.filter((d) => d.periodRaw.startsWith(t.period));

   // AFTER:
   const owner = combinedMode
     ? stores.find(s => s.id === (t as any)._storeId)
     : activeStore;
   const ownerMonths = (owner?.affiliateData || [])
     .filter((d) => platformFilter === "all" || d.platform === platformFilter);
   const periodData = t.period === "all"
     ? ownerMonths
     : ownerMonths.filter((d) => d.periodRaw.startsWith(t.period));
   ```
3. **Catatan platform filter**: di single-store path sebelumnya `filteredData` sudah platform-filtered. Di pasca-fix kita re-apply filter platform supaya konsisten antara single-store (Req 3.4) dan combined (Req 2.4).
4. **Summary row di bawah tabel** (lines ~1120–1146): `sumActualGMV = agg.totalGMV` tetap valid karena `agg.totalGMV` di combined mode = sum semua toko (post Bug A fix). **Tetapi** `sumTargetGMV = targets.reduce((a, t) => a + t.targetGMV, 0)` adalah sum target lintas toko, yang dibandingkan dengan `agg.totalGMV` (juga lintas toko). Ini tetap konsisten — tidak perlu diubah.

#### File 4 (no change): `src/lib/db.ts`

Signature `loadAffiliateSummaries(storeId)` dan `loadAffiliateCreators(storeId, period?, platform?)` tetap. Tidak ada modifikasi server-side.

### Data Flow Diagram (Corrected Combined-Mode Load)

```mermaid
sequenceDiagram
    participant User
    participant Page as src/app/page.tsx
    participant SM as useStoreManager
    participant SB as Supabase
    participant AS as AffiliateScreen
    participant DB as src/lib/db.ts

    User->>Page: app mount (cold reload)
    Page->>SM: initFromSupabase()
    SM->>SB: getStores()
    SB-->>SM: stores[]
    SM-->>Page: _supabaseInitStatus = 'done'

    Note over Page: NEW — eager summaries for ALL stores
    Page->>SM: loadAllAffiliateSummaries()
    par per store
        SM->>DB: loadAffiliateSummaries(storeA.id)
        DB->>SB: select * from affiliate_summaries where store_id=A
        SB-->>DB: summariesA
        DB-->>SM: summariesA
    and
        SM->>DB: loadAffiliateSummaries(storeB.id)
        DB->>SB: select * from affiliate_summaries where store_id=B
        SB-->>DB: summariesB
        DB-->>SM: summariesB
    end
    SM-->>Page: { ok: [A, B], failed: [] }

    Note over Page: stores[].affiliateData now full for all stores
    User->>AS: navigate to Affiliate
    User->>AS: click "Gabungan"
    AS->>AS: combinedMode = true; selectedPeriod="all"

    Note over AS: NEW — lazy creators for ALL stores
    AS->>DB: loadAffiliateCreators(A, period?, plt?)
    AS->>DB: loadAffiliateCreators(B, period?, plt?)
    par
        DB->>SB: select * from affiliate_creators where store_id=A
        SB-->>DB: creatorsA
    and
        DB->>SB: select * from affiliate_creators where store_id=B
        SB-->>DB: creatorsB
    end
    DB-->>AS: combinedSupabaseCreators = { A: [...], B: [...] }

    AS->>AS: agg = aggregate over allMonths + union(creators)
    AS->>AS: Target vs Pencapaian: periodData scoped to owner.affiliateData

    User->>AS: click Refresh
    AS->>SM: loadAllAffiliateSummaries()
    AS->>DB: loadAllAffiliateCreators(stores, period, plt)
    par all stores
        DB->>SB: re-fetch
        SB-->>DB: fresh data
    end
    DB-->>AS: refreshed combined state
```

### Error Handling

**Partial Supabase Failure (e.g., 1 of N stores fails to load)**

Strategi: **fail-soft, surface visibility**.

1. **`loadAllAffiliateSummaries` selalu pakai `Promise.allSettled`** — tidak `Promise.all`. Toko yang berhasil tetap di-update di state. Toko yang gagal: state `affiliateData[]`-nya tetap apa adanya (in-memory atau kosong).
2. **Return value `{ ok, failed }`** dipakai caller untuk:
   - **Mount path (`page.tsx`)**: Diam-diam abaikan (konsisten dengan `.catch(() => {})` existing). User akan melihat data parsial dengan warning di-screen (lihat #4).
   - **Refresh button**: Tampilkan toast `react-hot-toast` (sudah ada di `Toaster` di `page.tsx`):
     - All ok: `"Data semua toko berhasil disinkronkan."` (success).
     - Partial: `"X dari N toko gagal disinkronkan: {names}. Data lain sudah diperbarui."` (warning).
     - All failed: `"Sinkronisasi gagal. Periksa koneksi atau status Supabase."` (error).
3. **Error individual `loadAffiliateCreators(s.id, ...)`** di effect 3a: kalau gagal untuk satu toko, masukkan `[]` ke `combinedSupabaseCreators[s.id]` (sama dengan pattern existing single-store yang fall-back ke `setSupabaseCreators([])`). Jangan biarkan satu kegagalan mengosongkan map seluruhnya.
4. **Banner peringatan in-screen (opsional, tapi direkomendasikan)**: Tambahkan small banner di header mode Gabungan ketika `failed.length > 0`:
   ```tsx
   {combinedMode && failedStores.length > 0 && (
     <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-xs px-3 py-1.5 rounded">
       Data toko {failedStores.join(", ")} belum termuat. Total mungkin tidak lengkap.
     </div>
   )}
   ```
5. **`__SUPABASE_NOT_CONFIGURED__`**: Tetap dilempar oleh `requireSupabase()` di `db.ts`. Caller (loop `Promise.allSettled`) menangkap dan melaporkan sebagai 'offline' status. Tidak ada uncaught exception baru (Property 4, Req 3.9).
6. **Race condition multi-toggle**: Cancel-token (`cancelled` flag) di effect 3a kedua mencegah hasil stale dari overwrite hasil baru ketika user toggle Gabungan dengan cepat atau mengubah period/platform sebelum fetch sebelumnya selesai.

### Migration / Rollback Note

- **No schema changes.** Tidak ada migration Supabase. Read-only fix.
- **No data backfill.** Tabel `affiliate_summaries` dan `affiliate_creators` sudah berisi data semua toko; cacat semata di client-side load orchestration.
- **Rollback path**: Revert tiga file (`useStoreManager.ts`, `page.tsx`, `AffiliateScreen.tsx`). Tidak ada side-effect yang persist.
- **Backward compat**: `loadAffiliateFromSupabase(storeId)` tidak diubah. Kode lain yang memanggilnya (sekarang hanya `page.tsx`, dan akan diganti) tetap aman.
- **localStorage compatibility**: Bentuk `partialize` tidak berubah; payload `affiliateData[].creators` tetap di-strip; user existing tidak perlu clear cache.
- **Versi `name: 'store-manager-v2'`**: Tidak naik ke v3 — schema persisted state identik.

## Testing Strategy

### Validation Approach

Pendekatan dua-fase:

1. **Surface counterexamples di kode UNFIXED** untuk mengonfirmasi root cause (Bug A & Bug B), kemudian
2. **Verifikasi fix** menggunakan kombinasi unit tests, property-based tests (Bug Condition + Preservation), dan manual integration scenarios.

### Exploratory Bug Condition Checking

**Goal**: Memunculkan counterexamples yang membuktikan kedua bug pada kode yang belum diperbaiki dan mengonfirmasi/menolak hipotesis root cause.

**Test Plan**: Tulis unit tests yang mensimulasikan kondisi multi-toko (≥2 stores, masing-masing dengan `affiliateData` dan `affiliateTargets`) lalu jalankan terhadap kode UNFIXED untuk mengamati kegagalan.

**Test Cases**:

1. **Bug A — combined sum omits non-active store**: Setup 2 toko di Zustand di mana hanya toko aktif punya `affiliateData[]` di memori (toko B kosong, simulasi cold reload). Render `AffiliateScreen` di combined mode. Assert `agg.totalGMV === GMV(A) + GMV(B)`. **Expected: gagal pada UNFIXED** karena `B.affiliateData` kosong.
2. **Bug A — creators-derived sections kosong**: Setup 2 toko, keduanya punya summary tapi `creators[]` kosong di memori (simulasi `partialize` pasca-reload). Toggle Gabungan. Assert `agg.totalCreators >= 1`. **Expected: gagal pada UNFIXED** (atau menampilkan 0 creators bahkan jika Supabase punya).
3. **Bug A — refresh stale**: Mock `loadAffiliateFromSupabase` dengan spy. Klik Refresh di combined mode. Assert spy dipanggil ≥ N kali (jumlah toko). **Expected: gagal pada UNFIXED** (hanya 1× untuk active store).
4. **Bug B — target actuals inflated**: Setup 2 toko: A target Januari = 50 jt, A actual Januari = 30 jt; B actual Januari = 40 jt (B tidak punya target). Render Target vs Pencapaian di combined. Assert baris target A menampilkan `actualGMV === 30000000`. **Expected: gagal pada UNFIXED** (akan menampilkan 70 jt).
5. **Edge case — 1 toko saja**: Setup 1 toko (combined mode tidak tersedia karena `stores.length < 2`). Pastikan tidak ada regression. **Expected: pass pada UNFIXED dan FIXED.**

**Expected Counterexamples**:

- KPI gabungan diam-diam mengabaikan `stores[].affiliateData` yang kosong di memori; konfirmasi root cause #1 (page.tsx single-store preload) dan root cause #3 (partialize strip).
- Refresh hanya menyentuh active store; konfirmasi root cause #5.
- Target row Toko A menampilkan actual yang menjumlahkan kontribusi Toko B; konfirmasi root cause #6 (`allMonths` salah dipakai sebagai scope).
- **Possible alternate causes** (kalau test di atas pass tapi user masih lihat bug): Supabase RLS membatasi non-active store reads (perlu cek policies); atau ada cache HTTP layer di antara client dan Supabase yang stale.

### Fix Checking

**Goal**: Verifikasi bahwa untuk semua input di mana bug condition terpenuhi, fixed function memenuhi expected behavior.

**Pseudocode (Bug A)**:

```
FOR ALL state WHERE isBugCondition_load(state) DO
  // Ensure post-fix the system loads all stores' data
  loadAllAffiliateSummaries_invoked := observe(state)
  ASSERT loadAllAffiliateSummaries_invoked WITH stores=ALL store ids

  // After load resolves, agg matches sum of per-store contributions
  agg_combined := aggregate(combinedMode=true, state.stores)
  ASSERT agg_combined.totalGMV = SUM_s singleStoreAgg(s).totalGMV
  ASSERT agg_combined.totalOrders = SUM_s singleStoreAgg(s).totalOrders
  // ... (one ASSERT per metric in Property 1A)
END FOR
```

**Pseudocode (Bug B)**:

```
FOR ALL (target, target_owner, allMonths) WHERE
  isBugCondition_target(target, target_owner, allMonths, combinedMode=true) DO

  actuals := computeActuals_fixed(target, target_owner, allMonths, platformFilter)
  ownerOnly := target_owner.affiliateData
    WHERE (target.period = "all") OR d.periodRaw STARTS WITH target.period
    WHERE (platformFilter = "all") OR d.platform = platformFilter

  ASSERT actuals.gmv    = SUM(d.summary.totalGMV    for d in ownerOnly)
  ASSERT actuals.videos = SUM(d.summary.totalVideos for d in ownerOnly)
  ASSERT actuals.live   = SUM(d.summary.totalLive   for d in ownerOnly)
  ASSERT actuals.orders = SUM(d.summary.totalOrders for d in ownerOnly)
END FOR
```

### Preservation Checking

**Goal**: Verifikasi bahwa untuk semua input di mana bug condition tidak terpenuhi (single-store mode, atau combined mode dengan 1 toko, atau interaksi non-affiliate), fixed function menghasilkan output identik dengan original function.

**Pseudocode**:

```
FOR ALL state WHERE NOT isBugCondition_load(state) AND NOT isBugCondition_target(...) DO
  agg_F'  := aggregate_fixed(state)
  agg_F   := aggregate_original(state)
  ASSERT deepEqual(agg_F', agg_F)

  creatorList_F'  := creatorList_fixed(state)
  creatorList_F   := creatorList_original(state)
  ASSERT deepEqual(creatorList_F', creatorList_F)

  targets_F'  := targetTable_fixed(state)
  targets_F   := targetTable_original(state)
  ASSERT deepEqual(targets_F', targets_F)
END FOR
```

**Testing Approach**: Property-based testing direkomendasikan untuk preservation karena:

- Generates banyak shape state otomatis (1..5 toko, 0..12 periode, 0..200 creators per toko, target di periode acak).
- Menangkap edge case yang sulit ditebak manual (mis. dua toko dengan creator username sama, satu toko dengan summary tapi creators kosong, target dengan period "all").
- Memberikan jaminan kuat bahwa single-store path tidak ter-regress.

**Test Plan**:

1. Capture baseline output dari kode UNFIXED untuk single-store scenarios via snapshot tests (input → `agg`, `creatorList`, target rows).
2. Tulis property-based tests menggunakan `fast-check` (sudah lazim di ekosistem TS) yang generate state acak dengan `combinedMode === false` atau `stores.length === 1`.
3. Jalankan property tests di FIXED kode dan assert output identik dengan baseline.

**Test Cases**:

1. **Single-store agg preservation**: Generate state acak dengan 1 toko + N periode acak. Assert `agg_F'(state) === agg_F(state)` byte-by-byte (deepEqual).
2. **Single-store target preservation**: Generate target acak di toko tunggal. Assert tabel Target vs Pencapaian rows identik.
3. **Single-store refresh preservation**: Spy pada `loadAffiliateFromSupabase` dan `loadAffiliateCreators`. Klik Refresh di single-store. Assert spy dipanggil exactly 1× per fungsi dengan `activeStore.id`. Tidak ada call ke `loadAllAffiliateSummaries`.
4. **Period & platform filter preservation**: Generate kombinasi period × platform acak di kedua mode. Assert hasil filter == predikat original.
5. **Empty state preservation**: State dengan `stores.length === 0` atau `affiliateData = []`. Assert empty UI sama persis.
6. **Supabase offline preservation**: Mock `isSupabaseConfigured = false`. Generate state acak. Assert tidak ada uncaught exception, dan UI degrade ke data Zustand lokal (Property 4).

### Unit Tests

- `useStoreManager.loadAllAffiliateSummaries`: 1 toko ok, N toko ok, 1 dari N gagal (Promise.allSettled), semua gagal, Supabase not configured → return `{ failed: [...] }` dengan reason yang benar.
- `AffiliateScreen` agg: combined mode dengan 2 toko punya data lengkap → totalGMV = sum.
- `AffiliateScreen` agg: combined mode dengan creator yang sama di 2 toko → merge by username, GMV ter-sum.
- `AffiliateScreen` Target vs Pencapaian: target Toko A periode Januari, hanya menyertakan affiliateData Toko A.
- `AffiliateScreen` Refresh handler: combined mode → memanggil `loadAllAffiliateSummaries` + `loadAllAffiliateCreators(stores)`; single-store mode → tetap memanggil hanya `loadAffiliateFromSupabase(activeStore.id)` + `loadAffiliateCreators(activeStore.id, ...)`.
- Empty state: 0 store, 1 store, semua periode kosong → tidak crash.

### Property-Based Tests

- **Property 1A — combined = sum, idempotent under store ordering**: Generate `Array<Store>` dengan panjang 1..5, masing-masing punya `Array<AffiliateMonthData>` panjang 0..12. Assert `agg(combinedMode=true, stores) ≡ agg(combinedMode=true, shuffle(stores))` dan `agg(combinedMode=true).totalGMV === Σ singleAgg(s).totalGMV`. Quantify atas berbagai filter platform.
- **Property 1B — per-target actuals dari owning store saja**: Generate `Array<Store>` dengan target tersebar. Assert untuk setiap target, `actuals(target)` di FIXED hanya mencakup `target_owner.affiliateData`.
- **Property 2 — single-store regression**: Generate 1-toko state acak. Assert `agg_F'(state) ≡ agg_F(state)` (snapshot/golden).
- **Property 3 — refresh fans out**: Property: jika combined mode aktif dan klik Refresh, jumlah panggilan ke `loadAffiliateFromSupabase` (atau equivalentnya) ≥ `stores.length`.
- **Property 4 — graceful degradation**: Generate state + acak gagalkan k dari N panggilan Supabase. Assert tidak ada exception bocor; `agg` mencerminkan data toko yang berhasil + memori; `failed` di-report.

### Integration Tests

- **Full flow combined mode end-to-end (manual)**:
  1. Cold reload aplikasi dengan ≥ 2 toko di Supabase.
  2. Buka Affiliate (toko aktif).
  3. Klik Gabungan. Verifikasi Total GMV ≥ Total GMV(active) (harus naik karena toko lain berkontribusi).
  4. Verifikasi Top 10 Kreator mungkin berisi creator dari toko non-aktif.
  5. Switch period; verifikasi konsistensi.
  6. Switch platform; verifikasi konsistensi.
  7. Klik Refresh; verifikasi spinner dan refresh sukses.
  8. Off-toggle Gabungan; verifikasi single-store view kembali persis seperti sebelum.
- **Target vs Pencapaian per-store**: Setup target di 2 toko, periode sama. Toggle Gabungan. Verifikasi setiap baris target menampilkan actual yang sesuai dengan `affiliateData` toko pemilik saja.
- **Partial failure simulation**: Mock 1 toko's `loadAffiliateSummaries` melempar error. Verifikasi UI menampilkan banner peringatan, toko-toko lain tetap ter-update, tidak ada crash.
- **Supabase offline**: Set `NEXT_PUBLIC_SUPABASE_URL=""`. Verifikasi `combinedMode` tetap berfungsi dengan data Zustand lokal yang sudah ada (jika ada), tidak ada uncaught exception.
- **Single-store mode regression smoke**: Lakukan flow upload, target CRUD, period/platform filter, store switch, drill-down — verifikasi semua identik dengan pre-fix.
