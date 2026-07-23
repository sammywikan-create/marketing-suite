# 📊 Marketing Suite

**Marketing Suite** adalah aplikasi web all-in-one kelas enterprise untuk tim marketing & bisnis e-commerce yang mencakup perencanaan, tracking, evaluasi, analitik lanjutan, dan pelaporan performa bisnis secara lengkap. Dibangun dengan Next.js 16 (App Router & Turbopack), React 19, Tailwind CSS, Recharts, dan Supabase.

---

## 📋 Daftar Isi

- [Tech Stack](#tech-stack)
- [Arsitektur Project](#arsitektur-project)
- [Menjalankan Project](#menjalankan-project)
- [Environment Variables](#environment-variables)
- [Autentikasi & Security](#autentikasi--security)
- [Struktur Folder Kode](#struktur-folder-kode)
- [Modul & Fitur Lengkap](#modul--fitur-lengkap)
  - [1. Executive Summary (Home)](#1-executive-summary-home)
  - [2. Marketing Planner](#2-marketing-planner)
  - [3. Analitik Lanjutan ⭐ (NEW)](#3-analitik-lanjutan--new)
  - [4. GMV Analyzer](#4-gmv-analyzer)
  - [5. GMV Maximizer](#5-gmv-maximizer)
  - [6. Tim & Staff](#6-tim--staff)
  - [7. OKR Framework](#7-okr-framework)
  - [8. Laporan & Export](#8-laporan--export)
  - [9. Multi-Toko (Store Management)](#9-multi-toko-store-management)
- [State Management & Data Persistence](#state-management--data-persistence)
- [Engine Diagnostik & Analitik (utils)](#engine-diagnostik--analitik-utils)
- [Komponen Reusable](#komponen-reusable)
- [Panduan Menambah Fitur Baru](#panduan-menambah-fitur-baru)
- [Deployment (Vercel & Node.js)](#deployment-vercel--nodejs)

---

## 🛠️ Tech Stack

| Kategori | Technology / Library | Versi |
|---|---|---|
| **Framework** | Next.js (App Router, Turbopack) | 16.2.4 |
| **UI Library** | React + TypeScript | 19.2.4 |
| **Styling** | Tailwind CSS + Vanilla CSS Design Tokens | 4.x |
| **State Management** | Zustand (Store Manager, GMV, Alert, AI, Raw File) | 5.x |
| **Charts & Analytics** | Recharts (Responsive Line, Bar, Pie, Area, Scatter) | 3.8.x |
| **Icons** | Lucide React | 1.8.x |
| **Database & Persistence** | Supabase PostgreSQL + IndexedDB (idb-keyval) | 2.x |
| **AI Engine** | Google Gemini 3.6 & OpenAI API Integration | - |
| **Export Engines** | jsPDF, pptxgenjs, SheetJS (xlsx) | - |
| **Data Fetching** | Axios, SWR | - |
| **Notifications & UI** | react-hot-toast | 2.x |

---

## 🏗️ Arsitektur Project

Marketing Suite menggunakan arsitektur **Single Page Application (SPA) berbasis State Routing** dengan integrasi SSR/Dynamic Import Next.js untuk performa loading maksimal (*bundle size reduced by ~70%*).

```
┌─────────────────────────────────────────────────────────────┐
│  PasswordGate & Auth Cookie Layer (ms_auth)                 │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Main App Shell: Sidebar + Header Bar                 │  │
│  │  ┌──────────────┐ ┌────────────────────────────────┐  │  │
│  │  │ Sidebar Nav  │ │  Active Dynamic Screen         │  │  │
│  │  │ (TabGroups)  │ │  (berdasarkan activeTab hash) │  │  │
│  │  └──────────────┘ └────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

- **Hash-based Routing**: Navigasi sinkron dengan URL hash (`#revenue-breakdown`, `#omset-doctor`, dll.).
- **Multi-Store Context**: Dapat beralih antar toko (`activeStoreId`) secara instan.
- **Real-Data Engine**: Mengkalkulasi metrik dari data real terunggah (*Business Overview, Affiliate, Video, Laporan Harian*).

---

## 💻 Menjalankan Project

```bash
# 1. Install dependencies
npm install

# 2. Buat file .env.local
cp .env.example .env.local

# 3. Jalankan development server (Turbopack)
npm run dev

# 4. Buka http://localhost:3000 di browser
```

### Script Terminal Utama

| Command | Deskripsi |
|---|---|
| `npm run dev` | Menjalankan server pengembangan dengan Turbopack |
| `npm run build` | Melakukan kompilasi TypeScript dan Next.js production build |
| `npm run start` | Menjalankan build produksi secara lokal |
| `npm run lint` | Memeriksa kepatuhan sintaks ESLint |

---

## 🔑 Environment Variables

Konfigurasi file `.env.local` di direktori utama project:

```env
# --- Wajib ---
SITE_PASSWORD=admin123                 # Password autentikasi aplikasi

# --- Supabase (Sync Data Toko & Retention) ---
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...

# --- Google Sheets API Integration ---
GOOGLE_SERVICE_ACCOUNT_EMAIL=service-account@iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
GOOGLE_SPREADSHEET_ID=1aBcDeFg...

# --- AI Engines ---
GEMINI_API_KEY=AIzaSy...
OPENAI_API_KEY=sk-...

# --- Telegram Bot Alert & Reports ---
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHI...
TELEGRAM_DEFAULT_CHAT_ID=-1001234567890
```

---

## 📁 Struktur Folder Kode

```
src/
├── app/
│   ├── api/                      # Serverless API routes
│   │   ├── auth/                 # Login & cookie session authentication
│   │   ├── ai-chat/              # AI diagnostic chat engine
│   │   ├── google-sheets/        # Integrasi data Google Sheets
│   │   ├── laporan-harian/       # Synchronization endpoint laporan harian
│   │   └── telegram/             # Bot notification & webhook
│   ├── layout.tsx                # Root layout & Metadata
│   ├── page.tsx                  # Main SPA router & Dynamic import loader
│   └── globals.css               # Tailwind & Custom CSS Design System
│
├── components/                   # UI Components & Reusable Layouts
│   ├── Sidebar.tsx               # Navigasi sidebar utama (TabGroups)
│   ├── PasswordGate.tsx          # Wrapper autentikasi password
│   ├── StoreSelector.tsx         # Dropdown switcher toko aktif
│   ├── PageHeader.tsx            # Header standar halaman
│   └── ai/                       # AI Assistant & Chat components
│
├── screens/                      # Seluruh Halaman Screen Aplikasi
│   ├── HomeScreen.tsx            # Executive Summary Dashboard
│   ├── RevenueBreakdownScreen.tsx# [Fitur 1] Revenue Breakdown & Trend
│   ├── FunnelAnalyzerScreen.tsx  # [Fitur 2] Funnel Conversion Analyzer
│   ├── LiveScorecardScreen.tsx   # [Fitur 3] Live Performance Scorecard
│   ├── AffiliateTrackerScreen.tsx# [Fitur 4] Affiliate Performance Tracker
│   ├── OmsetDoctorScreen.tsx     # [Fitur 5] Omset Doctor AI Diagnosis
│   ├── LaporanHarianScreen.tsx   # Dashboard Laporan Harian Terintegrasi
│   ├── GMVOverviewScreen.tsx     # Business Overview & Multi-Month Analytics
│   ├── VideoPerformanceScreen.tsx# Analisis Performa Video Kreatif
│   ├── AffiliateScreen.tsx       # Affiliate Manager & Creator Database
│   ├── LiveAnalyticsScreen.tsx   # Live Streaming Performance Analytics
│   ├── OKRScreen.tsx             # Framework OKR Tim & Departemen
│   ├── ReportBuilderScreen.tsx   # Custom PDF/Excel Report Generator
│   └── ...                       # (Screens Marketing Planner & Tools lainnya)
│
├── utils/                        # Analytics Engine & Data Calculators
│   ├── revenueAnalyzer.ts        # Algoritma Fitur 1-5, MA7 Drop Alert, Funnel & Omset Doctor Engine
│   └── gmvAnalyzer.ts            # Parser & kalkulator GMV Overview, Anomali, & Forecast
│
├── store/                        # Global State Management (Zustand)
│   ├── useStoreManager.ts        # Multi-Store Management, Supabase sync & persistence
│   ├── useAlertStore.ts          # Centralized alert system
│   └── useAIStore.ts             # State AI assistant chat
│
└── lib/                          # Data Models & Database Services
    ├── types.ts                  # Seluruh TypeScript Data Interfaces & TabKeys
    ├── db.ts                     # Database Layer (Supabase + IndexedDB idb-keyval)
    ├── exportPdf.ts              # Engine export PDF (jsPDF)
    └── exportPpt.ts              # Engine export PowerPoint (pptxgenjs)
```

---

## 🚀 Modul & Fitur Lengkap

### 1. Executive Summary (Home)
- **Executive Summary**: Ringkasan performa bisnis gabungan toko, indikator kesehatan, notifikasi alert kritis, dan jalan pintas analitik utama.

---

### 2. Marketing Planner
Modul lengkap perencanaan & eksekusi pemasaran berbasis data lokal `localStorage` (`ms_`).

| Halaman | Deskripsi Analitik & Operasional |
|---|---|
| **Dashboard** | KPI Cards, alokasi budget pie chart, tren omset bulanan, dan AIDA funnel progress |
| **Panduan (SOP)** | Manajemen Panduan & SOP Operasional Tim Marketing |
| **Content Tracker** | Distribusi status konten, output mingguan, dan produktivitas PIC |
| **Campaign Log** | Efisiensi alokasi anggaran campaign, pengeluaran per platform, dan timeline |
| **KOL Tracker** | Peringkat efektivitas KOL, pengeluaran per kategori, dan Cost-per-Engagement |
| **Hipotesis & Plan** | Kanban Board 4 kolom, KPI tingkat keberhasilan pengujian, dan kategori hipotesis |
| **Referensi KPI** | Referensi tolok ukur KPI marketing e-commerce |
| **AIDA Funnel** | Visualisasi corong AIDA (Attention, Interest, Desire, Action) & conversion rate |
| **Budget & ROI** | Alokasi anggaran vs realisasi revenue dan peringkat ROI campaign |
| **TOFU·MOFU·BOFU** | Matriks funnel drop-off per tahapan awareness hingga transaksi |
| **Target & ROI Bulanan** | Pencapaian target omset bulanan vs anggaran dan analisis ROI |
| **Budgeting Harian** | Metrik harian CTR, CPC, perbandingan budget vs spent, dan tren platform |
| **Analisis TMB** | Matriks ROAS per channel dan pendapatan per stage |

---

### 3. Analitik Lanjutan ⭐ (Fitur Utama Baru)

Fitur analisis bisnis mendalam yang berjalan secara dinamis menggunakan data real toko Anda:

| Halaman | Deskripsi & Kegunaan Utama |
|---|---|
| **Revenue Breakdown** | Memecah GMV ke 4 saluran (*LIVE Penjual, Video Penjual, Afiliasi Kreator, Kartu Produk*), grafik tren harian multi-channel, dan **Alert Penurunan >20%** dibanding rata-rata 7 hari (MA7). |
| **Funnel Analyzer** | Visualisasi alur 4 tahap (*Impresi $\rightarrow$ Klik/CTR $\rightarrow$ Tambah Keranjang/ATC $\rightarrow$ Pesanan/CTOR*), komparasi hari omset puncak vs drop, dan **Deteksi Bottleneck Otomatis (Traffic vs Closing)**. |
| **Live Scorecard** | Dashboard GPM (*GMV per 1.000 Tayangan*), benchmark standar >Rp15.000, rasio sesi LIVE produktif vs zong, retensi watch rate, dan **Rekomendasi Jam LIVE Terbaik**. |
| **Affiliate Tracker** | Tren komparasi GMV Afiliasi vs GMV Toko Sendiri (*Own Brand*), pemantauan kreator aktif posting, rata-rata kontribusi per kreator, dan warning drop keaktifan kreator. |
| **Omset Doctor AI** | **Engine Diagnostik Otomatis** yang membaca seluruh metrik sekaligus, menghitung **Skor Kesehatan Toko (0-100)**, menyajikan *Diagnosis Real*, *Akar Masalah (Root Cause)*, dan *Rekomendasi Solusi Praktis*. |

---

### 4. GMV Analyzer
- **Upload Data**: Unggah file Excel/CSV dari TikTok Seller Center & Data Compass.
- **GMV Dashboard**: Overview ringkas indikator penjualan e-commerce.
- **Overview Bisnis**: Analisis multi-bulan, tren mingguan, deteksi anomali spike/drop, dan forecast omset bulan depan.
- **Video Performance**: Analisis performa video shoppable (VV, GPM, CTR, CTOR, status Top Performer).
- **Affiliate Manager**: Manajemen kreator afiliasi, tier (Nano/Micro/Mid/Macro), scoring, dan status keaktifan.
- **Live Analytics**: Evaluasi performa siaran langsung.
- **SKU Analyzer**: Analisis kontribusi dan kesehatan produk per SKU ID.
- **Creative Optimizer**: Evaluasi efektivitas materi iklan & konten kreatif.
- **Top Seller Metrics**: Benchmark indikator toko Anda dibanding seller papan atas.
- **Checklist Evaluasi & Optimasi**: Langkah taktis perbaikan operasional toko.
- **ROI Calculator**: Kalkulator simulasi proyeksi ROI campaign.
- **Kartu Produk & SKU Tracking**: Monitoring etalase produk dan pencapaian target SKU.

---

### 5. GMV Maximizer
- **GMAX Overview**: Dashboard strategi maksimalisasi pertumbuhan GMV toko.
- **GMAX Evaluasi**: Evaluasi kampanye iklan GMV Max dan penyapan anggaran.

---

### 6. Tim & Staff
- **Staff Tracker**: Pemantauan beban kerja, kinerja, dan produktivitas tim internal.

---

### 7. OKR Framework
- **OKR Framework**: Manajemen *Objectives & Key Results* per departemen (*Konseptor, SMO, Advertiser, Affiliate*).

---

### 8. Laporan & Export
- **Report Builder**: Generator laporan eksekutif custom (Export ke format **PDF** dan **Excel**).
- **Laporan Harian**: Dashboard harian terintegrasi Supabase & Google Sheets, ekspor laporan siap presentasi ke format **PDF** dan **PowerPoint (PPT)**.

---

### 9. Multi-Toko (Store Management)
- **Compare & Gabungan**: Menggabungkan data analitik dari beberapa toko secara akumulatif.
- **Bandingkan Toko**: Komparasi *head-to-head* indikator antar toko.
- **Kelola Toko**: Manajemen pendaftaran, edit warna, dan penghapusan profil toko.

---

## 💾 State Management & Data Persistence

1. **Zustand (`useStoreManager`)**:
   - Mengelola daftar toko, toko aktif, data Overview Bisnis, Video Performance, dan data Affiliate Summary.
   - Tersinkronisasi otomatis dengan **Supabase Database** saat koneksi internet aktif.

2. **Supabase & IndexedDB (`idb-keyval`)**:
   - Menyimpan dataset besar seperti ribuan baris kreator afiliasi dan catatan Laporan Harian secara lokal maupun cloud storage.

3. **localStorage (`ms_`)**:
   - Digunakan untuk data operasional Marketing Planner dengan *seed fallback data*.

---

## 🧮 Engine Diagnostik & Analitik (`src/utils/`)

### `revenueAnalyzer.ts`
- `extractRealStoreData`: Mengekstrak dan menormalisasi data transaksi harian dari data terunggah toko.
- `computeRevenueBreakdown`: Menghitung breakdown 4 channel, tren 7-hari, dan notifikasi alert drop >20%.
- `computeFunnelAnalyzer`: Menghitung rasio CTR/CTOR, komparasi hari omset puncak vs drop, dan menetapkan bottleneck.
- `computeLiveScorecard`: Menghitung GPM, rasio sesi produktif, retensi tontonan, dan rekomendasi jam tayang.
- `computeAffiliateTracker`: Menghitung porsi omset afiliasi, jumlah kreator aktif, dan mendeteksi anomali.
- `runOmsetDoctorDiagnosis`: Engine evaluasi aturan (*rule-based*) yang menghasilkan Skor Kesehatan (0-100), diagnosis akar masalah, dan rekomendasi perbaikan.

---

## 🧱 Komponen Reusable

### `PageHeader`
Header standar halaman yang mendukung pencarian data dan tombol aksi:
```tsx
<PageHeader
  title="Revenue Breakdown"
  icon={<TrendingUp size={20} />}
  count={channels.length}
/>
```

### `Modal`
Komponen dialog modal fleksibel untuk form input data:
```tsx
import Modal, { FormField, inputClass, btnPrimary } from "@/components/Modal";

<Modal open={isOpen} onClose={onClose} title="Tambah Data">
  <FormField label="Nama Store">
    <input className={inputClass} value={name} onChange={...} />
  </FormField>
  <button className={btnPrimary}>Simpan</button>
</Modal>
```

---

## 🚀 Deployment (Vercel & Node.js)

Aplikasi telah dioptimasi penuh untuk deployment di **Vercel**:

```bash
# Kompilasi build produksi
npm run build

# Menjalankan build secara lokal
npm run start
```

### Konfigurasi Vercel:
1. Hubungkan repository GitHub `marketing-suite` ke Vercel.
2. Tambahkan **Environment Variables** (`SITE_PASSWORD`, `NEXT_PUBLIC_SUPABASE_URL`, dll.) pada halaman Settings Vercel.
3. Setiap kali ada `git push origin main`, Vercel akan secara otomatis melakukan kompilasi build & deployment dalam waktu 1-2 menit.

---

## 📜 Lisensi

Internal Use Only — © 2026 Marketing Suite. Hak Cipta Dilindungi Undang-Undang.
