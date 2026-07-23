"use client";
import { useState, useMemo } from "react";
import PageHeader from "@/components/PageHeader";
import {
  BookOpen,
  Search,
  ArrowRight,
  Sparkles,
  LayoutDashboard,
  TrendingUp,
  Filter,
  Radio,
  Users,
  Stethoscope,
  BarChart3,
  Megaphone,
  Lightbulb,
  Target,
  DollarSign,
  Layers,
  CalendarCheck,
  CalendarDays,
  Upload,
  PieChart,
  Video,
  Package,
  Wrench,
  Calculator,
  ScanBarcode,
  ClipboardList,
  GitCompareArrows,
  FileText,
  Settings,
  HelpCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export interface MenuGuideItem {
  id: string;
  tabKey: string;
  title: string;
  group: string;
  groupTitle: string;
  icon: React.ReactNode;
  tujuan: string;
  manfaat: string[];
  caraGuna: string;
  targetUser: "Semua Tim" | "Direksi / C-Level" | "Tim Marketing" | "Tim Live / Host" | "Tim Admin / Analyst";
  isNew?: boolean;
}

const MENU_GUIDES: MenuGuideItem[] = [
  // --- HOME ---
  {
    id: "g-home",
    tabKey: "home",
    title: "Executive Summary",
    group: "Home",
    groupTitle: "Home",
    icon: <LayoutDashboard className="text-primary" size={22} />,
    tujuan: "Menyajikan ringkasan eksekutif seluruh indikator bisnis, omset, dan alert kritis dalam 1 layar utama.",
    manfaat: [
      "Pemilik bisnis & direksi tidak perlu membuka banyak tabel untuk memahami kondisi toko.",
      "Langsung mendeteksi notifikasi bahaya (alert) omset drop & rekomendasi perbaikan instan.",
      "Menyajikan statistik akumulatif multi-toko secara cepat."
    ],
    caraGuna: "Buka halaman ini saat pertama kali masuk untuk mengecek snapshot kesehatan toko harian.",
    targetUser: "Direksi / C-Level"
  },

  // --- ANALITIK LANJUTAN ---
  {
    id: "g-revenue-breakdown",
    tabKey: "revenue-breakdown",
    title: "Revenue Breakdown & Trend",
    group: "Analitik Lanjutan",
    groupTitle: "Analitik Lanjutan ⭐",
    icon: <TrendingUp className="text-emerald-500" size={22} />,
    isNew: true,
    tujuan: "Memecah omset per channel (LIVE, Video, Afiliasi, Etalase) & grafik tren harian multi-line.",
    manfaat: [
      "Mendeteksi secara otomatis jika ada channel yang mengalami drop omset >20% dibanding rata-rata 7 hari.",
      "Mengetahui persentase kontribusi omset dari masing-masing saluran pemasaran.",
      "Mencegah keterlambatan penanganan saat salah satu channel penjualan mulai lesu."
    ],
    caraGuna: "Perhatikan kartu persentase kontribusi dan Notifikasi Alert Merah jika terjadi drop pada channel tertentu.",
    targetUser: "Direksi / C-Level"
  },
  {
    id: "g-funnel-analyzer",
    tabKey: "funnel-analyzer",
    title: "Funnel Conversion Analyzer",
    group: "Analitik Lanjutan",
    groupTitle: "Analitik Lanjutan ⭐",
    icon: <Filter className="text-blue-500" size={22} />,
    isNew: true,
    tujuan: "Menganalisis alur konversi (Impresi → Klik/CTR → Tambah Keranjang/ATC → Pesanan/CTOR) & mendeteksi bottleneck.",
    manfaat: [
      "Menjawab pertanyaan: 'Apakah sepi pembeli karena kurang traffic (CTR) atau kurang closing (CTOR)?'",
      "Membandingkan performa alur funnel pada hari omset puncak vs hari omset drop.",
      "Memberikan petunjuk perbaikan spesifik pada konten/thumbnail vs harga/ulasan produk."
    ],
    caraGuna: "Cek Kartu Diagnosis Bottleneck di bagian atas untuk melihat di tahapan mana calon pembeli paling banyak gugur.",
    targetUser: "Tim Marketing"
  },
  {
    id: "g-live-scorecard",
    tabKey: "live-scorecard",
    title: "Live Performance Scorecard",
    group: "Analitik Lanjutan",
    groupTitle: "Analitik Lanjutan ⭐",
    icon: <Radio className="text-red-500" size={22} />,
    isNew: true,
    tujuan: "Mengukur efektivitas siaran LIVE (GPM benchmark >Rp15.000, rasio sesi omset tinggi, durasi tonton).",
    manfaat: [
      "Mengetahui rasio berapa sesi LIVE yang benar-benar menghasilkan transaksi vs sesi yang sepi.",
      "Memberikan rekomendasi jam & hari siaran LIVE terbaik berdasarkan histori transaksi real toko.",
      "Mengevaluasi tingkat retensi penonton (watch rate) dari tiap host LIVE."
    ],
    caraGuna: "Gunakan data jam terbaik untuk menyusun jadwal siaran LIVE mingguan bagi tim host.",
    targetUser: "Tim Live / Host"
  },
  {
    id: "g-affiliate-tracker",
    tabKey: "affiliate-tracker",
    title: "Affiliate Performance Tracker",
    group: "Analitik Lanjutan",
    groupTitle: "Analitik Lanjutan ⭐",
    icon: <Users className="text-purple-500" size={22} />,
    isNew: true,
    tujuan: "Memantau porsi omset afiliasi vs toko sendiri, keaktifan kreator, dan rata-rata kontribusi per kreator.",
    manfaat: [
      "Mengawasi keaktifan kreator afiliasi yang menyumbang porsi besar omset toko (>70%).",
      "Mendeteksi jika ada kreator top yang tiba-tiba berhenti posting promosi.",
      "Menghitung nilai rata-rata omset yang dihasilkan oleh tiap kreator aktif."
    ],
    caraGuna: "Pantau tren kreator aktif harian dan berikan insentif komisi ekstra bagi kreator yang konsisten.",
    targetUser: "Tim Admin / Analyst"
  },
  {
    id: "g-omset-doctor",
    tabKey: "omset-doctor",
    title: "Omset Doctor AI (Diagnosis Otomatis)",
    group: "Analitik Lanjutan",
    groupTitle: "Analitik Lanjutan ⭐",
    icon: <Stethoscope className="text-indigo-500" size={22} />,
    isNew: true,
    tujuan: "Engine diagnostik otomatis yang membaca seluruh metrik toko sekaligus dan memberikan Skor Kesehatan (0-100).",
    manfaat: [
      "Menyajikan Diagnosis Real, Akar Masalah (Root Cause), dan Rekomendasi Solusi Praktis secara otomatis.",
      "Sangat cocok dipresentasikan kepada direksi untuk menjelaskan akar penurunan omset dan solusinya.",
      "Menghemat waktu analisis data manual oleh tim marketing."
    ],
    caraGuna: "Buka tab ini saat terjadi penurunan omset untuk mendapatkan petunjuk tindakan perbaikan instan.",
    targetUser: "Direksi / C-Level"
  },

  // --- MARKETING PLANNER ---
  {
    id: "g-dashboard",
    tabKey: "dashboard",
    title: "Dashboard Planner",
    group: "Marketing Planner",
    groupTitle: "Marketing Planner",
    icon: <LayoutDashboard className="text-amber-500" size={22} />,
    tujuan: "Merangkum seluruh indikator perencanaan pemasaran (budget, omset, progress AIDA).",
    manfaat: [
      "Memastikan seluruh alokasi dana promosi berjalan sesuai rencana awal.",
      "Melihat tren pengeluaran budget vs pendapatan bulanan."
    ],
    caraGuna: "Gunakan untuk memantau status umum perencanaan marketing.",
    targetUser: "Tim Marketing"
  },
  {
    id: "g-content-tracker",
    tabKey: "content-tracker",
    title: "Content Tracker",
    group: "Marketing Planner",
    groupTitle: "Marketing Planner",
    icon: <FileText className="text-blue-500" size={22} />,
    tujuan: "Mengelola jadwal rilis konten (video/foto/artikel) dan produktivitas setiap PIC.",
    manfaat: [
      "Mencegah tim telat posting dan memastikan target kuota konten harian terpenuhi.",
      "Melacak postingan konten berdasarkan status (Draft, In Review, Published)."
    ],
    caraGuna: "Klik 'Tambah Konten' untuk membuat jadwal rilis video/foto baru bagi tim perancang konten.",
    targetUser: "Tim Marketing"
  },
  {
    id: "g-campaign-log",
    tabKey: "campaign-log",
    title: "Campaign Log",
    group: "Marketing Planner",
    groupTitle: "Marketing Planner",
    icon: <Megaphone className="text-orange-500" size={22} />,
    tujuan: "Mencatat riwayat kampanye promosi/iklan beserta pengeluaran biaya dan hasilnya.",
    manfaat: [
      "Mengetahui kampanye mana yang paling menguntungkan (high-ROI) vs yang membuang budget.",
      "Memantau jadwal mulai dan berakhirnya kampanye besar."
    ],
    caraGuna: "Input setiap ada campaign promosi tanggal kembar atau tanggal merah.",
    targetUser: "Tim Marketing"
  },
  {
    id: "g-kol-tracker",
    tabKey: "kol-tracker",
    title: "KOL / Influencer Tracker",
    group: "Marketing Planner",
    groupTitle: "Marketing Planner",
    icon: <Users className="text-pink-500" size={22} />,
    tujuan: "Mendata kerjasama endorse dengan KOL / Influencer (biaya vs perolehan transaksi).",
    manfaat: [
      "Mencegah kerugian akibat salah memilih influencer yang biayanya mahal tapi sepi pembeli.",
      "Menghitung Cost-per-Engagement dan efektivitas tiap KOL."
    ],
    caraGuna: "Input nama KOL, biaya endorse, serta hasil penjualan yang didapat.",
    targetUser: "Tim Marketing"
  },
  {
    id: "g-hipotesis-plan",
    tabKey: "hipotesis-plan",
    title: "Hipotesis & Plan (Kanban)",
    group: "Marketing Planner",
    groupTitle: "Marketing Planner",
    icon: <Lightbulb className="text-yellow-500" size={22} />,
    tujuan: "Papan Kanban pengujian ide/eksperimen baru (contoh: variasi hook video/voucher).",
    manfaat: [
      "Membantu tim melakukan inovasi promosi terstruktur dengan melacak ide yang sukses vs gagal.",
      "Meningkatkan budaya eksperimen berbasis data."
    ],
    caraGuna: "Geser kartu hipotesis dari Backlog → Testing → Validated / Invalidated.",
    targetUser: "Tim Marketing"
  },
  {
    id: "g-budgeting-harian",
    tabKey: "budgeting-harian",
    title: "Budgeting Harian",
    group: "Marketing Planner",
    groupTitle: "Marketing Planner",
    icon: <CalendarDays className="text-cyan-500" size={22} />,
    tujuan: "Mengontrol pengeluaran biaya iklan harian dan metrik CTR, CPC, serta konversi.",
    manfaat: [
      "Mencegah kebocoran budget iklan di tengah bulan dengan sistem pengawasan harian.",
      "Memastikan nilai Cost-Per-Click (CPC) tetap murah."
    ],
    caraGuna: "Catat pengeluaran iklan harian setiap pagi/malam.",
    targetUser: "Tim Admin / Analyst"
  },

  // --- GMV ANALYZER ---
  {
    id: "g-gmv-upload",
    tabKey: "gmv-upload",
    title: "Upload Data GMV",
    group: "GMV Analyzer",
    groupTitle: "GMV Analyzer",
    icon: <Upload className="text-emerald-500" size={22} />,
    tujuan: "Mengunggah file Excel/CSV data laporan dari TikTok Seller Center / Data Compass.",
    manfaat: [
      "Menjadi pintu utama pengisian data real toko ke dalam sistem.",
      "Secara otomatis memperbarui seluruh grafik analitik toko."
    ],
    caraGuna: "Pilih file Excel Overview/Video/Affiliate lalu klik Upload.",
    targetUser: "Tim Admin / Analyst"
  },
  {
    id: "g-gmv-overview",
    tabKey: "gmv-overview",
    title: "Overview Bisnis (Multi-Bulan)",
    group: "GMV Analyzer",
    groupTitle: "GMV Analyzer",
    icon: <BarChart3 className="text-blue-500" size={22} />,
    tujuan: "Analisis tren omset multi-bulan, deteksi anomali spike/drop, dan forecast omset bulan depan.",
    manfaat: [
      "Memungkinkan proyeksi omset bulan depan menggunakan estimasi garis tren.",
      "Mendeteksi hari-hari dengan lonjakan transaksi luar biasa."
    ],
    caraGuna: "Pilih periode bulan yang ingin diperiksa untuk melihat analisis performa lengkap.",
    targetUser: "Direksi / C-Level"
  },
  {
    id: "g-video-performance",
    tabKey: "video-performance",
    title: "Video Performance",
    group: "GMV Analyzer",
    groupTitle: "GMV Analyzer",
    icon: <Video className="text-purple-500" size={22} />,
    tujuan: "Evaluasi performa video shoppable (VV, GPM, CTR, CTOR, status Top Performer).",
    manfaat: [
      "Mengetahui video mana yang menyumbang omset tertinggi.",
      "Memberikan rekomendasi video yang layak didorong alokasi iklan (Ads Boost Candidate)."
    ],
    caraGuna: "Filter berdasarkan status '🏆 TOP PERFORMER' untuk mereplikasi konten sukses.",
    targetUser: "Tim Marketing"
  },
  {
    id: "g-affiliate",
    tabKey: "affiliate",
    title: "Affiliate Manager",
    group: "GMV Analyzer",
    groupTitle: "GMV Analyzer",
    icon: <Users className="text-pink-500" size={22} />,
    tujuan: "Database kreator afiliasi, pengelompokan tier (Nano/Micro/Macro), dan scoring.",
    manfaat: [
      "Memudahkan manajemen hubungan kreator (CRM Affiliate).",
      "Memantau statistik sampel terkirim vs omset yang dihasilkan."
    ],
    caraGuna: "Gunakan untuk menyaring kreator dengan skor tertinggi untuk diajak kolaborasi ulang.",
    targetUser: "Tim Admin / Analyst"
  },

  // --- LAPORAN & MULTI-TOKO ---
  {
    id: "g-laporan-harian",
    tabKey: "laporan-harian",
    title: "Laporan Harian (Export PDF/PPT)",
    group: "Laporan",
    groupTitle: "Laporan",
    icon: <FileText className="text-red-500" size={22} />,
    tujuan: "Dashboard harian terintegrasi Supabase & Google Sheets + Ekspor PDF/PowerPoint.",
    manfaat: [
      "Menyediakan bahan presentasi rapat harian/mingguan otomatis tanpa buat slide manual.",
      "Tersambung langsung dengan laporan keuangan toko."
    ],
    caraGuna: "Klik tombol 'Export PDF' atau 'Export PPT' untuk mengunduh berkas laporan siap presentasi.",
    targetUser: "Direksi / C-Level"
  },
  {
    id: "g-report-builder",
    tabKey: "report-builder",
    title: "Report Builder Custom",
    group: "Laporan",
    groupTitle: "Laporan",
    icon: <ClipboardList className="text-indigo-500" size={22} />,
    tujuan: "Generator penyusun laporan bisnis custom berbasis modul pilihan.",
    manfaat: [
      "Memungkinkan kustomisasi bab laporan sesuai kebutuhan pemegang saham/investor."
    ],
    caraGuna: "Pilih modul yang ingin dimasukkan (Overview, Video, Affiliate) lalu klik Generate.",
    targetUser: "Tim Admin / Analyst"
  },
  {
    id: "g-compare-gabungan",
    tabKey: "compare-gabungan",
    title: "Compare & Gabungan Toko",
    group: "Multi-Toko",
    groupTitle: "Multi-Toko",
    icon: <GitCompareArrows className="text-teal-500" size={22} />,
    tujuan: "Mengakumulasikan data analitik dari beberapa cabang toko sekaligus.",
    manfaat: [
      "Melihat total omset konsolidasi bagi pemilik bisnis yang memiliki >1 toko e-commerce."
    ],
    caraGuna: "Pilih toko-toko yang ingin digabungkan untuk melihat total omset gabungan.",
    targetUser: "Direksi / C-Level"
  }
];

export default function PanduanScreen() {
  const [search, setSearch] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string>("Semua");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const groups = useMemo(() => {
    const list = ["Semua", "Analitik Lanjutan ⭐", "Home", "Marketing Planner", "GMV Analyzer", "Laporan", "Multi-Toko"];
    return list;
  }, []);

  const filteredGuides = useMemo(() => {
    return MENU_GUIDES.filter((item) => {
      const matchSearch =
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        item.tujuan.toLowerCase().includes(search.toLowerCase()) ||
        item.tabKey.toLowerCase().includes(search.toLowerCase()) ||
        item.groupTitle.toLowerCase().includes(search.toLowerCase());

      const matchGroup =
        selectedGroup === "Semua" || item.groupTitle === selectedGroup || item.group === selectedGroup;

      return matchSearch && matchGroup;
    });
  }, [search, selectedGroup]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <PageHeader
        title="Panduan & Buku Petunjuk Website (Handbook)"
        icon={<BookOpen size={22} className="text-primary" />}
        count={MENU_GUIDES.length}
        search={search}
        onSearch={setSearch}
      />

      {/* Intro Banner */}
      <div className="bg-gradient-to-r from-primary/10 via-purple-500/10 to-blue-500/10 border border-primary/20 p-6 rounded-2xl shadow-sm">
        <div className="flex items-start gap-4">
          <div className="size-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary shrink-0">
            <Sparkles size={26} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground mb-1">
              Buku Petunjuk Penggunaan Fitur & Tab Marketing Suite
            </h2>
            <p className="text-sm text-muted leading-relaxed">
              Halaman ini memberikan keterbatasan rinci mengenai **tujuan, manfaat bisnis, dan cara penggunaan** dari setiap menu dan tab yang ada di website. Gunakan filter kategori di bawah untuk menemukan panduan tab yang Anda butuhkan.
            </p>
          </div>
        </div>
      </div>

      {/* Category Pills Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {groups.map((grp) => (
          <button
            key={grp}
            onClick={() => setSelectedGroup(grp)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              selectedGroup === grp
                ? "bg-primary text-white shadow-md shadow-primary/20"
                : "bg-card border border-border text-muted hover:text-foreground hover:bg-muted/50"
            }`}
          >
            {grp}
          </button>
        ))}
      </div>

      {/* Guides Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredGuides.map((guide) => {
          const isExpanded = expandedId === guide.id;

          return (
            <div
              key={guide.id}
              className={`bg-card border rounded-2xl p-6 shadow-sm transition-all flex flex-col justify-between ${
                guide.isNew ? "border-primary/40 ring-1 ring-primary/20" : "border-border"
              }`}
            >
              <div className="space-y-4">
                {/* Header Card */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-muted/40 rounded-xl border border-border">{guide.icon}</div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-primary uppercase tracking-wider">
                          {guide.groupTitle}
                        </span>
                        {guide.isNew && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-500 text-white">
                            FITUR BARU ⭐
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-foreground">{guide.title}</h3>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-muted/60 text-muted">
                    {guide.targetUser}
                  </span>
                </div>

                {/* Tujuan */}
                <div>
                  <span className="text-xs font-bold text-muted uppercase tracking-wider block mb-1">
                    🎯 Tujuan Utama:
                  </span>
                  <p className="text-sm text-foreground font-medium leading-relaxed">{guide.tujuan}</p>
                </div>

                {/* Manfaat List */}
                <div className="space-y-1.5 pt-2 border-t border-border/50">
                  <span className="text-xs font-bold text-muted uppercase tracking-wider block mb-1">
                    💡 Manfaat Praktis Pengguna & Direksi:
                  </span>
                  {guide.manfaat.map((m, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-muted leading-relaxed">
                      <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                      <span>{m}</span>
                    </div>
                  ))}
                </div>

                {/* Expanded Details: Cara Penggunaan */}
                {isExpanded && (
                  <div className="pt-3 border-t border-border space-y-2 text-xs bg-muted/20 p-3 rounded-xl">
                    <span className="font-bold text-foreground block">📖 Cara Penggunaan & Petunjuk Input:</span>
                    <p className="text-muted leading-relaxed">{guide.caraGuna}</p>
                  </div>
                )}
              </div>

              {/* Action Footer */}
              <div className="flex items-center justify-between pt-4 mt-4 border-t border-border">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : guide.id)}
                  className="text-xs font-semibold text-muted hover:text-foreground flex items-center gap-1"
                >
                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  {isExpanded ? "Tutup Detail" : "Lihat Petunjuk Penggunaan"}
                </button>

                <a
                  href={`#${guide.tabKey}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-bold hover:bg-primary hover:text-white transition-colors"
                >
                  Buka Halaman <ArrowRight size={14} />
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
