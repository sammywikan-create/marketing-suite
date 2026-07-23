export interface PageHelpItem {
  tabKey: string;
  title: string;
  groupTitle: string;
  tujuan: string;
  manfaat: string[];
  caraGuna: string;
  targetUser: string;
}

export const PAGE_HELP_DATA: Record<string, PageHelpItem> = {
  home: {
    tabKey: "home",
    title: "Executive Summary",
    groupTitle: "Home",
    tujuan: "Menyajikan ringkasan eksekutif seluruh indikator bisnis, omset, dan alert kritis dalam 1 layar utama.",
    manfaat: [
      "Pemilik bisnis & direksi tidak perlu membuka banyak tabel; dalam 10 detik langsung bisa melihat total omset, pencapaian target, dan notifikasi bahaya (alert).",
      "Memberikan indikator Skor Kesehatan Bisnis (0-100) real.",
      "Menyajikan statistik akumulatif multi-toko secara serentak."
    ],
    caraGuna: "Buka halaman ini setiap pagi/awal rapat untuk mengecek kesehatan toko dan notifikasi perhatian aktif.",
    targetUser: "Direksi / C-Level"
  },
  "revenue-breakdown": {
    tabKey: "revenue-breakdown",
    title: "Revenue Breakdown & Trend Dashboard",
    groupTitle: "Analitik Lanjutan ⭐",
    tujuan: "Memecah omset per channel (LIVE, Video, Afiliasi, Etalase) & grafik tren harian multi-line.",
    manfaat: [
      "Mendeteksi secara otomatis jika ada channel yang mengalami drop omset >20% dibanding rata-rata 7 hari.",
      "Mengetahui persentase kontribusi omset dari masing-masing saluran pemasaran.",
      "Mencegah keterlambatan penanganan saat salah satu channel penjualan mulai lesu."
    ],
    caraGuna: "Perhatikan kartu persentase kontribusi dan Notifikasi Alert Merah jika terjadi drop pada channel tertentu.",
    targetUser: "Direksi / C-Level"
  },
  "funnel-analyzer": {
    tabKey: "funnel-analyzer",
    title: "Funnel Conversion Analyzer",
    groupTitle: "Analitik Lanjutan ⭐",
    tujuan: "Menganalisis alur konversi (Impresi → Klik/CTR → Tambah Keranjang/ATC → Pesanan/CTOR) & mendeteksi bottleneck.",
    manfaat: [
      "Menjawab pertanyaan: 'Apakah sepi pembeli karena kurang traffic (CTR) atau kurang closing (CTOR)?'",
      "Membandingkan performa alur funnel pada hari omset puncak vs hari omset drop.",
      "Memberikan petunjuk perbaikan spesifik pada konten/thumbnail vs harga/ulasan produk."
    ],
    caraGuna: "Cek Kartu Diagnosis Bottleneck di bagian atas untuk melihat di tahapan mana calon pembeli paling banyak gugur.",
    targetUser: "Tim Marketing"
  },
  "live-scorecard": {
    tabKey: "live-scorecard",
    title: "Live Performance Scorecard",
    groupTitle: "Analitik Lanjutan ⭐",
    tujuan: "Mengukur efektivitas siaran LIVE (GPM benchmark >Rp15.000, rasio sesi omset tinggi, durasi tonton).",
    manfaat: [
      "Mengetahui rasio berapa sesi LIVE yang benar-benar menghasilkan transaksi vs sesi yang sepi.",
      "Memberikan rekomendasi jam & hari siaran LIVE terbaik berdasarkan histori transaksi real toko.",
      "Mengevaluasi tingkat retensi penonton (watch rate) dari tiap host LIVE."
    ],
    caraGuna: "Gunakan data jam terbaik untuk menyusun jadwal siaran LIVE mingguan bagi tim host.",
    targetUser: "Tim Live / Host"
  },
  "affiliate-tracker": {
    tabKey: "affiliate-tracker",
    title: "Affiliate Performance Tracker",
    groupTitle: "Analitik Lanjutan ⭐",
    tujuan: "Memantau porsi omset afiliasi vs toko sendiri, keaktifan kreator, dan rata-rata kontribusi per kreator.",
    manfaat: [
      "Mengawasi keaktifan kreator afiliasi yang menyumbang porsi besar omset toko (>70%).",
      "Mendeteksi jika ada kreator top yang tiba-tiba berhenti posting promosi.",
      "Menghitung nilai rata-rata omset yang dihasilkan oleh tiap kreator aktif."
    ],
    caraGuna: "Pantau tren kreator aktif harian dan berikan insentif komisi ekstra bagi kreator yang konsisten.",
    targetUser: "Tim Admin / Analyst"
  },
  "omset-doctor": {
    tabKey: "omset-doctor",
    title: "Omset Doctor AI (Diagnosis Otomatis)",
    groupTitle: "Analitik Lanjutan ⭐",
    tujuan: "Engine diagnostik otomatis yang membaca seluruh metrik toko sekaligus dan memberikan Skor Kesehatan (0-100).",
    manfaat: [
      "Menyajikan Diagnosis Real, Akar Masalah (Root Cause), dan Rekomendasi Solusi Praktis secara otomatis.",
      "Sangat cocok dipresentasikan kepada direksi untuk menjelaskan akar penurunan omset dan solusinya.",
      "Menghemat waktu analisis data manual oleh tim marketing."
    ],
    caraGuna: "Buka tab ini saat terjadi penurunan omset untuk mendapatkan petunjuk tindakan perbaikan instan.",
    targetUser: "Direksi / C-Level"
  },
  affiliate: {
    tabKey: "affiliate",
    title: "Affiliate Manager",
    groupTitle: "GMV Analyzer",
    tujuan: "Manajemen database kreator afiliasi, pengelompokan tier (Nano/Micro/Macro), scoring, dan keaktifan.",
    manfaat: [
      "Memudahkan manajemen hubungan kreator (CRM Affiliate) & melacak kiriman sampel.",
      "Memantau statistik sampel terkirim vs omset yang dihasilkan oleh tiap kreator.",
      "Menyaring kreator dengan skor tertinggi untuk diajak kolaborasi ulang."
    ],
    caraGuna: "Unggah file Excel Affiliate dari Seller Center untuk melihat peringkat dan analisis keaktifan kreator.",
    targetUser: "Tim Admin / Analyst"
  },
  "laporan-harian": {
    tabKey: "laporan-harian",
    title: "Laporan Harian (Export PDF/PPT)",
    groupTitle: "Laporan",
    tujuan: "Dashboard harian terintegrasi Supabase & Google Sheets + Ekspor PDF/PowerPoint.",
    manfaat: [
      "Menyediakan bahan presentasi rapat harian/mingguan otomatis tanpa buat slide manual.",
      "Tersambung langsung dengan laporan keuangan dan pencapaian target bulanan.",
      "Memungkinkan ekspor laporan siap cetak ke format PDF dan slide PowerPoint (PPT)."
    ],
    caraGuna: "Klik 'Export PDF' atau 'Export PPT' untuk mengunduh berkas laporan siap presentasi ke direksi.",
    targetUser: "Direksi / C-Level"
  },
  "gmv-overview": {
    tabKey: "gmv-overview",
    title: "Overview Bisnis (Multi-Bulan)",
    groupTitle: "GMV Analyzer",
    tujuan: "Analisis tren omset multi-bulan, deteksi anomali spike/drop, dan forecast omset bulan depan.",
    manfaat: [
      "Memungkinkan proyeksi omset bulan depan menggunakan estimasi garis tren.",
      "Mendeteksi hari-hari dengan lonjakan transaksi luar biasa."
    ],
    caraGuna: "Pilih periode bulan yang ingin diperiksa untuk melihat analisis performa lengkap.",
    targetUser: "Direksi / C-Level"
  },
  "video-performance": {
    tabKey: "video-performance",
    title: "Video Performance",
    groupTitle: "GMV Analyzer",
    tujuan: "Evaluasi performa video shoppable (VV, GPM, CTR, CTOR, status Top Performer).",
    manfaat: [
      "Mengetahui video mana yang menyumbang omset tertinggi.",
      "Memberikan rekomendasi video yang layak didorong alokasi iklan (Ads Boost Candidate)."
    ],
    caraGuna: "Filter berdasarkan status '🏆 TOP PERFORMER' untuk mereplikasi konten sukses.",
    targetUser: "Tim Marketing"
  },
  dashboard: {
    tabKey: "dashboard",
    title: "Dashboard Planner",
    groupTitle: "Marketing Planner",
    tujuan: "Merangkum seluruh indikator perencanaan pemasaran (budget, omset, progress AIDA).",
    manfaat: [
      "Memastikan seluruh alokasi dana promosi berjalan sesuai rencana awal.",
      "Melihat tren pengeluaran budget vs pendapatan bulanan."
    ],
    caraGuna: "Gunakan untuk memantau status umum perencanaan marketing.",
    targetUser: "Tim Marketing"
  },
  panduan: {
    tabKey: "panduan",
    title: "Panduan & Manual Website",
    groupTitle: "Marketing Planner",
    tujuan: "Buku petunjuk lengkap dan panduan operasional penggunaan seluruh fitur aplikasi.",
    manfaat: [
      "Memudahkan tim baru maupun direksi memahami kegunaan setiap menu.",
      "Menyimpan catatan SOP internal tim."
    ],
    caraGuna: "Gunakan fitur pencarian untuk menemukan petunjuk tab yang diinginkan.",
    targetUser: "Semua Tim"
  }
};

export function getPageHelp(tabKey: string): PageHelpItem {
  if (PAGE_HELP_DATA[tabKey]) return PAGE_HELP_DATA[tabKey];
  return {
    tabKey,
    title: tabKey.replace(/-/g, " ").toUpperCase(),
    groupTitle: "Marketing Suite",
    tujuan: `Halaman operasional untuk mengelola dan memantau ${tabKey}.`,
    manfaat: [
      "Meningkatkan efisiensi pelacakan data dan pengawasan kinerja tim.",
      "Memudahkan pengambilan keputusan berbasis data."
    ],
    caraGuna: "Gunakan tombol aksi dan tabel data yang tersedia pada halaman ini.",
    targetUser: "Semua Tim"
  };
}
