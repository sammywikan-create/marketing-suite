# 📊 Marketing Suite

**Marketing Suite** adalah aplikasi web all-in-one untuk tim marketing yang mencakup perencanaan, tracking, evaluasi, dan pelaporan performa marketing secara lengkap. Dibangun dengan Next.js 16, React 19, dan Tailwind CSS 4.

---

## Daftar Isi

- [Tech Stack](#tech-stack)
- [Arsitektur Project](#arsitektur-project)
- [Menjalankan Project](#menjalankan-project)
- [Environment Variables](#environment-variables)
- [Autentikasi](#autentikasi)
- [Struktur Folder](#struktur-folder)
- [Modul & Fitur](#modul--fitur)
  - [Home](#1-home)
  - [Marketing Planner](#2-marketing-planner)
  - [GMV Analyzer](#3-gmv-analyzer)
  - [GMV Maximizer](#4-gmv-maximizer)
  - [OKR](#5-okr)
  - [Laporan](#6-laporan)
  - [Multi-Toko](#7-multi-toko)
- [State Management & Data](#state-management--data)
- [Komponen Reusable](#komponen-reusable)
- [Panduan Menambah Fitur Baru](#panduan-menambah-fitur-baru)
- [Konvensi Kode](#konvensi-kode)

---

## Tech Stack

| Kategori | Library | Versi |
|---|---|---|
| **Framework** | Next.js (App Router) | 16.2.4 |
| **UI** | React + TypeScript | 19.2.4 |
| **Styling** | Tailwind CSS | 4.x |
| **State** | Zustand (GMV), localStorage (Marketing Planner) | 5.x |
| **Charts** | Recharts | 3.8.x |
| **Icons** | Lucide React | 1.8.x |
| **Database** | Supabase (opsional, untuk Laporan Harian) | 2.x |
| **AI** | Google Gemini / OpenAI (opsional) | - |
| **Export** | jsPDF, pptxgenjs, xlsx | - |
| **HTTP** | Axios, SWR | - |
| **ID Generator** | nanoid, uuid | - |
| **Notifications** | react-hot-toast | 2.x |

---

## Arsitektur Project

```
Marketing Suite adalah SPA (Single Page Application) dengan routing berbasis state.
Navigasi antar halaman dikontrol melalui `activeTab` di `page.tsx`.
Sidebar.tsx mendefinisikan semua menu dan kelompok menu.
```

```
┌─────────────────────────────────────────────┐
│  PasswordGate (auth layer)                  │
│  ┌───────────────────────────────────────┐  │
│  │  Layout: Sidebar + Main Content       │  │
│  │  ┌──────────┐ ┌────────────────────┐  │  │
│  │  │ Sidebar  │ │  Active Screen     │  │  │
│  │  │ (menu)   │ │  (berdasarkan tab) │  │  │
│  │  └──────────┘ └────────────────────┘  │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

---

## Menjalankan Project

```bash
# 1. Install dependencies
npm install

# 2. Buat file .env.local (lihat bagian Environment Variables)
cp .env.example .env.local   # atau buat manual

# 3. Jalankan development server
npm run dev

# 4. Buka http://localhost:3000
```

### Scripts

| Command | Deskripsi |
|---|---|
| `npm run dev` | Development server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Jalankan production build |
| `npm run lint` | ESLint check |

---

## Environment Variables

Buat file `.env.local` di root project:

```env
# --- Wajib ---
SITE_PASSWORD=your_secure_password    # Password login (default: admin123)

# --- Opsional: Supabase (untuk Laporan Harian & sync data) ---
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhb...

# --- Opsional: Google Sheets API (untuk Laporan Harian) ---
GOOGLE_SERVICE_ACCOUNT_EMAIL=xxx@xxx.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
GOOGLE_SPREADSHEET_ID=1aBcDeFg...

# --- Opsional: AI Features ---
GEMINI_API_KEY=AIza...
OPENAI_API_KEY=sk-...
```

> **Catatan:** Tanpa konfigurasi Supabase/Google Sheets, fitur Laporan Harian akan menggunakan data lokal. Semua modul Marketing Planner bekerja penuh secara offline dengan localStorage.

---

## Autentikasi

Aplikasi dilindungi oleh **PasswordGate** (`src/components/PasswordGate.tsx`).

- Login via `POST /api/auth` dengan password yang cocok `SITE_PASSWORD`
- Session disimpan di HTTP-only cookie (`ms_auth`), berlaku 7 hari
- Check session via `GET /api/auth`
- Logout via `DELETE /api/auth`

---

## Struktur Folder

```
src/
├── app/
│   ├── api/
│   │   ├── auth/route.ts          # Auth endpoints
│   │   ├── ai-chat/route.ts       # AI chat API
│   │   ├── google-sheets/route.ts # Google Sheets integration
│   │   ├── laporan-harian/route.ts# Laporan harian data API
│   │   └── debug-sheets/route.ts  # Debug endpoint
│   ├── layout.tsx                 # Root layout
│   ├── page.tsx                   # Main SPA router
│   └── globals.css                # Tailwind + global styles
│
├── components/
│   ├── Sidebar.tsx                # Navigasi sidebar (semua menu)
│   ├── PasswordGate.tsx           # Auth wrapper
│   ├── PageHeader.tsx             # Header reusable (judul, search, tombol)
│   ├── Modal.tsx                  # Modal + form components
│   └── StatusBadge.tsx            # Badge status berwarna
│
├── screens/                       # Semua halaman/screen
│   ├── HomeScreen.tsx             # Executive Summary
│   ├── DashboardScreen.tsx        # Dashboard Marketing Planner
│   ├── ContentTrackerScreen.tsx   # Content Tracker + analytics
│   ├── CampaignLogScreen.tsx      # Campaign Log + analytics
│   ├── KOLTrackerScreen.tsx       # KOL Tracker + analytics
│   ├── HipotesisPlanScreen.tsx    # Hipotesis & Plan (Kanban)
│   ├── ReferensiKPIScreen.tsx     # Referensi KPI
│   ├── AIDAFunnelScreen.tsx       # AIDA Funnel + visualization
│   ├── BudgetROIScreen.tsx        # Budget & ROI + charts
│   ├── TOFUMOFUBOFUScreen.tsx     # TOFU/MOFU/BOFU funnel
│   ├── TargetROIBulananScreen.tsx  # Target & ROI Bulanan + trend
│   ├── BudgetingHarianScreen.tsx  # Budgeting Harian + trend
│   ├── AnalisisTMBScreen.tsx      # Analisis TMB + ROAS charts
│   ├── PanduanScreen.tsx          # Panduan/Guidelines
│   ├── GMVUploadScreen.tsx        # Upload data GMV
│   ├── GMVDashboardScreen.tsx     # GMV Dashboard
│   ├── GMVOverviewScreen.tsx      # Overview Bisnis (multi-bulan)
│   ├── GMVSKUScreen.tsx           # SKU Analyzer
│   ├── GMVCreativeScreen.tsx      # Creative Optimizer
│   ├── GMVBenchmarkScreen.tsx     # Top Seller Metrics
│   ├── GMVChecklistScreen.tsx     # Checklist Evaluasi
│   ├── GMVOptimasiScreen.tsx      # Optimasi Kreatif
│   ├── GMVCalculatorScreen.tsx    # ROI Calculator
│   ├── VideoPerformanceScreen.tsx # Video Performance
│   ├── AffiliateScreen.tsx        # Affiliate Manager
│   ├── LiveAnalyticsScreen.tsx    # Live Analytics
│   ├── ProductCardsScreen.tsx     # Kartu Produk
│   ├── GmaxOverviewScreen.tsx     # GMV Maximizer Overview
│   ├── OKRScreen.tsx              # OKR Framework
│   ├── ReportBuilderScreen.tsx    # Report Builder
│   ├── LaporanHarianScreen.tsx    # Laporan Harian
│   ├── CompareGabunganScreen.tsx  # Compare & Gabungan
│   ├── StoreCompareScreen.tsx     # Bandingkan Toko
│   └── StoreSettingsScreen.tsx    # Kelola Toko
│
└── lib/
    ├── types.ts                   # Semua TypeScript interfaces
    ├── store.ts                   # localStorage CRUD + seed data
    ├── db.ts                      # Database layer (Supabase)
    ├── gmvStore.ts                # Zustand store untuk GMV
    ├── supabase.ts                # Supabase client
    ├── googleSheets.ts            # Google Sheets API integration
    ├── exportPdf.ts               # Export ke PDF (jsPDF)
    ├── exportPpt.ts               # Export ke PowerPoint (pptxgenjs)
    ├── reportGenerator.ts         # Report builder engine
    ├── affiliateParser.ts         # Parser data affiliate
    ├── liveParser.ts              # Parser data live streaming
    └── okrTemplates.ts            # Template OKR per departemen
```

---

## Modul & Fitur

### 1. Home

| Screen | Deskripsi |
|---|---|
| **Executive Summary** | Ringkasan KPI utama dari semua modul, alert, dan rekomendasi |

### 2. Marketing Planner

Semua data disimpan di **localStorage** dengan prefix `ms_`. Setiap screen memiliki **CRUD lengkap** (tambah, edit, hapus, lihat detail) plus **dashboard analytics** dengan chart.

| Screen | Fitur Analytics |
|---|---|
| **Dashboard** | 6 KPI cards, budget allocation pie chart, monthly revenue trend line, AIDA funnel progress, hipotesis summary |
| **Panduan** | CRUD panduan/SOP marketing |
| **Content Tracker** | Status distribution pie, platform bar chart, weekly output trend, PIC productivity |
| **Campaign Log** | Budget utilization, status pie, platform spending bar, timeline view |
| **KOL Tracker** | Spending by platform/category pies, KOL ranking, cost-per-engagement |
| **Hipotesis & Plan** | Kanban board (4 kolom), success rate KPI, category breakdown, list view toggle |
| **Referensi KPI** | CRUD referensi KPI marketing |
| **AIDA Funnel** | Visual funnel dengan conversion rates, target vs actual bar chart, progress bars |
| **Budget & ROI** | Budget allocation pie, spending vs revenue bars, ROI ranking |
| **TOFU/MOFU/BOFU** | Visual funnel dengan drop-off rates, target vs actual per stage, summary cards |
| **Target & ROI Bulanan** | 6 KPI cards, target vs actual line chart, ROI bar chart per bulan |
| **Budgeting Harian** | CTR & CPC metrics, daily budget vs spent line, platform spending horizontal bars |
| **Analisis TMB** | ROAS per channel bar chart, revenue per stage, detail table |

### 3. GMV Analyzer

Upload data dari TikTok Shop / marketplace lalu analisis performa.

| Screen | Deskripsi |
|---|---|
| **Upload Data** | Upload file Excel/CSV data GMV |
| **GMV Dashboard** | Dashboard ringkasan GMV |
| **Overview Bisnis** | Analisis multi-bulan, tren, anomali, forecast |
| **Video Performance** | Analisis performa video (VV, GPM, CTR, CTOR) |
| **Affiliate Manager** | Kelola kreator affiliate, tier, scoring |
| **Live Analytics** | Analisis performa live streaming |
| **SKU Analyzer** | Analisis performa per SKU/produk |
| **Creative Optimizer** | Optimasi konten kreatif |
| **Top Seller Metrics** | Benchmark dengan top seller |
| **Checklist Evaluasi** | Checklist evaluasi toko |
| **Optimasi Kreatif** | Rekomendasi optimasi |
| **ROI Calculator** | Kalkulator ROI campaign |
| **Kartu Produk** | Kelola kartu produk |

### 4. GMV Maximizer

| Screen | Deskripsi |
|---|---|
| **GMAX Overview** | Dashboard strategi maksimalisasi GMV |

### 5. OKR

| Screen | Deskripsi |
|---|---|
| **OKR Framework** | OKR per departemen (Konseptor, SMO, Advertiser, Affiliate) |

### 6. Laporan

| Screen | Deskripsi |
|---|---|
| **Report Builder** | Generator laporan custom (PDF/Excel) |
| **Laporan Harian** | Dashboard harian terintegrasi Google Sheets & Supabase, export PDF/PPT |

### 7. Multi-Toko

| Screen | Deskripsi |
|---|---|
| **Compare & Gabungan** | Gabungkan data multi-toko |
| **Bandingkan Toko** | Perbandingan performa antar toko |
| **Kelola Toko** | Manajemen daftar toko |

---

## State Management & Data

### localStorage (Marketing Planner)

Semua data Marketing Planner disimpan di `localStorage` dengan prefix `ms_`.

```typescript
// Contoh key: ms_content, ms_campaign, ms_kol, ms_hipotesis, ...
// Fungsi CRUD ada di src/lib/store.ts

import { getItems, addItem, updateItem, deleteItem, SEEDS } from "@/lib/store";

// Membaca data (dengan fallback seed data)
const items = getItems("content", SEEDS.content);

// Tambah
const updated = addItem("content", items, newItem);

// Edit
const updated = updateItem("content", items, editedItem);

// Hapus
const updated = deleteItem("content", items, itemId);
```

### Zustand (GMV Analyzer)

Data GMV menggunakan Zustand store di `src/lib/gmvStore.ts`.

### Supabase (Laporan Harian)

Data laporan harian disinkronkan ke Supabase jika dikonfigurasi. Tanpa Supabase, menggunakan IndexedDB via `idb-keyval`.

---

## Komponen Reusable

### `PageHeader`

Header standar untuk setiap screen.

```tsx
<PageHeader
  title="Content Tracker"
  icon={<FileText size={20} />}
  count={items.length}
  onAdd={openAdd}
  addLabel="Tambah Konten"
  search={search}
  onSearch={setSearch}
/>
```

### `Modal`

Modal dialog dengan form helpers.

```tsx
import Modal, { FormField, inputClass, selectClass, btnPrimary, btnSecondary } from "@/components/Modal";

<Modal open={isOpen} onClose={onClose} title="Judul Modal" wide>
  <FormField label="Nama">
    <input className={inputClass} value={val} onChange={...} />
  </FormField>
  <button className={btnPrimary}>Simpan</button>
</Modal>
```

### `StatusBadge`

Badge berwarna otomatis berdasarkan value.

```tsx
<StatusBadge value="Active" />    // hijau
<StatusBadge value="Draft" />     // abu-abu
<StatusBadge value="High" />      // merah
```

---

## Panduan Menambah Fitur Baru

### Menambah Screen Baru

1. **Buat file screen** di `src/screens/NamaScreen.tsx`
2. **Definisikan tipe data** di `src/lib/types.ts`
3. **Tambah seed data** di `src/lib/store.ts` (jika pakai localStorage)
4. **Daftarkan TabKey** di `src/lib/types.ts` → `TabKey`
5. **Tambah menu** di `src/components/Sidebar.tsx` → `tabGroups`
6. **Tambah routing** di `src/app/page.tsx` → switch case `activeTab`

### Template Screen dengan Analytics

```tsx
"use client";
import { useEffect, useState, useMemo } from "react";
import { NamaItem } from "@/lib/types";
import { getItems, SEEDS, addItem, updateItem, deleteItem } from "@/lib/store";
import PageHeader from "@/components/PageHeader";
import Modal, { FormField, inputClass, btnPrimary, btnSecondary } from "@/components/Modal";
import { SomeIcon } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

const STORE_KEY = "namaKey";

export default function NamaScreen() {
  const [items, setItems] = useState<NamaItem[]>([]);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<"add" | "edit" | "view" | null>(null);
  const [selected, setSelected] = useState<NamaItem | null>(null);
  const [form, setForm] = useState<Partial<NamaItem>>({});

  useEffect(() => { setItems(getItems(STORE_KEY, SEEDS.namaKey)); }, []);

  // Analytics computed data
  const analytics = useMemo(() => {
    // ... compute KPI cards, chart data
    return { /* ... */ };
  }, [items]);

  // CRUD handlers ...

  return (
    <div className="space-y-5">
      <PageHeader title="..." icon={<SomeIcon size={20} />} count={items.length}
        onAdd={openAdd} addLabel="Tambah" search={search} onSearch={setSearch} />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* ... */}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* ... ResponsiveContainer + Chart ... */}
      </div>

      {/* Data Table / Cards */}
      {/* ... */}

      {/* Modals */}
      {/* ... */}
    </div>
  );
}
```

### Menambah Chart ke Screen yang Sudah Ada

1. Import dari `recharts`: `ResponsiveContainer, BarChart, PieChart, LineChart, ...`
2. Gunakan `useMemo` untuk menghitung data chart dari `items`
3. Tambahkan section chart di atas tabel/card list
4. Pastikan chart responsive: bungkus dengan `<ResponsiveContainer width="100%" height={240}>`

### Format Angka

```typescript
// Rupiah
function fmtRp(n: number) { return "Rp " + n.toLocaleString("id-ID"); }

// Compact number (1K, 1.5M, dll)
function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 }) + "M";
  if (n >= 1_000) return (n / 1_000).toLocaleString("id-ID", { maximumFractionDigits: 1 }) + "K";
  return n.toLocaleString("id-ID");
}
```

---

## Konvensi Kode

- **Bahasa UI:** Indonesia (label, placeholder, catatan)
- **Bahasa Kode:** Inggris (variabel, fungsi, tipe) — kecuali field data yang sudah berbahasa Indonesia
- **Styling:** Tailwind CSS utility classes langsung di JSX, **tidak ada CSS modules**
- **State lokal:** `useState` + `useMemo` untuk computed data
- **Recharts:** Selalu bungkus dengan `<ResponsiveContainer>`, gunakan `percent ?? 0` untuk Pie label
- **Layout:** Gunakan `space-y-5` untuk spacing vertikal antar section
- **Cards:** `bg-white rounded-xl border p-5 shadow-sm`
- **Grid responsive:** `grid grid-cols-1 lg:grid-cols-2 gap-5`
- **Warna stage:**
  - TOFU = `#3b82f6` (biru)
  - MOFU = `#8b5cf6` (ungu)
  - BOFU = `#f97316` (oranye)
- **Warna status:**
  - Active/Published/Validated = hijau
  - Testing/In Review/Pending = kuning
  - Invalidated/Rejected = merah
  - Draft/Backlog = abu-abu

---

## API Routes

| Endpoint | Method | Deskripsi |
|---|---|---|
| `/api/auth` | POST | Login (body: `{ password }`) |
| `/api/auth` | GET | Cek session |
| `/api/auth` | DELETE | Logout |
| `/api/laporan-harian` | GET/POST | Data laporan harian |
| `/api/google-sheets` | GET/POST | Integrasi Google Sheets |
| `/api/ai-chat` | POST | AI chat (Gemini/OpenAI) |

---

## Deployment

```bash
# Build production
npm run build

# Jalankan production server
npm run start
```

Deploy ke **Vercel**, **Netlify**, atau server Node.js mana pun. Pastikan environment variables sudah dikonfigurasi di platform hosting.

---

## Lisensi

Internal use only — © 2026 Marketing Suite
