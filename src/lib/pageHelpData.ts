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
  // --- HOME ---
  home: {
    tabKey: "home",
    title: "Executive Summary",
    groupTitle: "Home",
    tujuan: "Menyajikan ringkasan eksekutif seluruh indikator bisnis, omset, dan alert kritis dalam 1 layar komando utama.",
    manfaat: [
      "Snapshot kesehatan bisnis (Health Score 0-100) dalam 10 detik tanpa membaca puluhan tabel terpisah.",
      "Notifikasi bahaya (Alert Panel) otomatis untuk penurunan omset, refund tinggi, & kelesuan kreator.",
      "Statistik akumulatif multi-toko secara real-time."
    ],
    caraGuna: "Buka halaman ini setiap pagi/awal rapat eksekutif untuk mengecek kesehatan toko.",
    targetUser: "Direksi / C-Level"
  },

  // --- MARKETING PLANNER ---
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
    tujuan: "Buku petunjuk lengkap dan panduan operasional penggunaan seluruh 42 fitur aplikasi.",
    manfaat: [
      "Memudahkan tim baru maupun direksi memahami kegunaan setiap menu.",
      "Menyimpan catatan SOP internal tim marketing."
    ],
    caraGuna: "Gunakan fitur pencarian untuk menemukan petunjuk tab yang diinginkan.",
    targetUser: "Semua Tim"
  },
  "content-tracker": {
    tabKey: "content-tracker",
    title: "Content Tracker",
    groupTitle: "Marketing Planner",
    tujuan: "Mengelola jadwal rilis konten (video/foto/artikel) dan produktivitas setiap PIC.",
    manfaat: [
      "Mencegah tim telat posting dan memastikan kuota konten harian terpenuhi.",
      "Melacak postingan konten berdasarkan status (Draft, In Review, Published)."
    ],
    caraGuna: "Klik 'Tambah Konten' untuk membuat jadwal rilis baru bagi tim perancang konten.",
    targetUser: "Tim Marketing"
  },
  "campaign-log": {
    tabKey: "campaign-log",
    title: "Campaign Log",
    groupTitle: "Marketing Planner",
    tujuan: "Mencatat riwayat kampanye promosi/iklan beserta pengeluaran biaya dan hasilnya.",
    manfaat: [
      "Mengetahui kampanye mana yang paling menguntungkan (high-ROI) vs yang membuang budget.",
      "Memantau jadwal mulai dan berakhirnya kampanye besar."
    ],
    caraGuna: "Input setiap ada campaign promosi tanggal kembar atau tanggal merah.",
    targetUser: "Tim Marketing"
  },
  "kol-tracker": {
    tabKey: "kol-tracker",
    title: "KOL Tracker",
    groupTitle: "Marketing Planner",
    tujuan: "Mendata kerjasama endorse dengan KOL / Influencer (biaya vs perolehan transaksi).",
    manfaat: [
      "Mencegah kerugian akibat salah memilih influencer yang biayanya mahal tapi sepi pembeli.",
      "Menghitung Cost-per-Engagement dan efektivitas tiap KOL."
    ],
    caraGuna: "Input nama KOL, biaya endorse, serta hasil penjualan yang didapat.",
    targetUser: "Tim Marketing"
  },
  "hipotesis-plan": {
    tabKey: "hipotesis-plan",
    title: "Hipotesis & Plan (Kanban)",
    groupTitle: "Marketing Planner",
    tujuan: "Papan Kanban pengujian ide/eksperimen baru (contoh: variasi hook video/voucher).",
    manfaat: [
      "Membantu tim melakukan inovasi promosi terstruktur dengan melacak ide yang sukses vs gagal.",
      "Meningkatkan budaya eksperimen berbasis data."
    ],
    caraGuna: "Geser kartu hipotesis dari Backlog → Testing → Validated / Invalidated.",
    targetUser: "Tim Marketing"
  },
  "referensi-kpi": {
    tabKey: "referensi-kpi",
    title: "Referensi KPI",
    groupTitle: "Marketing Planner",
    tujuan: "Menyimpan tolok ukur (benchmark) standar keberhasilan KPI pemasaran e-commerce.",
    manfaat: [
      "Memberikan target kerja yang jelas dan terukur bagi tim marketing.",
      "Standar evaluasi objektivitas kinerja karyawan."
    ],
    caraGuna: "Gunakan sebagai acuan target minimal saat menyusun rencana kampanye.",
    targetUser: "Tim Marketing"
  },
  "aida-funnel": {
    tabKey: "aida-funnel",
    title: "AIDA Funnel",
    groupTitle: "Marketing Planner",
    tujuan: "Melacak perjalanan konsumen dari tahap Attention, Interest, Desire, hingga Action.",
    manfaat: [
      "Mendeteksi di tahap mana calon pembeli paling banyak gugur sebelum berbelanja.",
      "Menjaga konversi tahap akhir tetap optimal."
    ],
    caraGuna: "Pantau angka rasio kelulusan dari satu tahap ke tahap berikutnya.",
    targetUser: "Tim Marketing"
  },
  "budget-roi": {
    tabKey: "budget-roi",
    title: "Budget & ROI",
    groupTitle: "Marketing Planner",
    tujuan: "Membandingkan alokasi anggaran yang direncanakan vs realisasi biaya dan omset.",
    manfaat: [
      "Menjaga efisiensi biaya pemasaran agar Return on Investment (ROI) tetap positif.",
      "Mencegah pengeluaran melampaui batas anggaran."
    ],
    caraGuna: "Bandingkan persentase alokasi anggaran vs hasil omset yang diperoleh.",
    targetUser: "Direksi / C-Level"
  },
  "tofu-mofu-bofu": {
    tabKey: "tofu-mofu-bofu",
    title: "TOFU·MOFU·BOFU Funnel",
    groupTitle: "Marketing Planner",
    tujuan: "Mengelompokkan aktivitas pemasaran berdasarkan tahap Top, Middle, dan Bottom of Funnel.",
    manfaat: [
      "Memastikan budget seimbang antara membangun brand awareness (TOFU) dan closing penjualan (BOFU).",
      "Mencegah penumpukan budget hanya di satu tahap."
    ],
    caraGuna: "Evaluasi distribusi budget pada tiap tingkatan corong pemasaran.",
    targetUser: "Tim Marketing"
  },
  "target-roi-bulanan": {
    tabKey: "target-roi-bulanan",
    title: "Target & ROI Bulanan",
    groupTitle: "Marketing Planner",
    tujuan: "Tracking pencapaian omset dan target ROI dari bulan ke bulan.",
    manfaat: [
      "Memudahkan evaluasi bulanan apakah target pendapatan perusahaan tercapai atau tidak.",
      "Merekam tren pertumbuhan bisnis jangka panjang."
    ],
    caraGuna: "Input target omset di awal bulan dan evaluasi hasilnya di akhir bulan.",
    targetUser: "Direksi / C-Level"
  },
  "budgeting-harian": {
    tabKey: "budgeting-harian",
    title: "Budgeting Harian",
    groupTitle: "Marketing Planner",
    tujuan: "Mengontrol pengeluaran biaya iklan harian dan metrik CTR, CPC, serta konversi.",
    manfaat: [
      "Mencegah kebocoran budget iklan di tengah bulan dengan sistem pengawasan harian.",
      "Memastikan nilai Cost-Per-Click (CPC) tetap murah."
    ],
    caraGuna: "Catat pengeluaran iklan harian setiap pagi/malam.",
    targetUser: "Tim Admin / Analyst"
  },
  "analisis-tmb": {
    tabKey: "analisis-tmb",
    title: "Analisis TMB",
    groupTitle: "Marketing Planner",
    tujuan: "Menganalisis tingkat pengembalian modal iklan (ROAS) per channel pemasaran.",
    manfaat: [
      "Membantu pengambil keputusan mengalokasikan modal iklan ke channel yang paling efisien.",
      "Membandingkan efisiensi iklan antar platform."
    ],
    caraGuna: "Lihat tabel nilai ROAS untuk menentukan alokasi modal iklan berikutnya.",
    targetUser: "Tim Admin / Analyst"
  },

  // --- ANALITIK LANJUTAN ⭐ ---
  "revenue-breakdown": {
    tabKey: "revenue-breakdown",
    title: "Revenue Breakdown & Trend",
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

  // --- GMV ANALYZER ---
  "gmv-upload": {
    tabKey: "gmv-upload",
    title: "Upload Data GMV",
    groupTitle: "GMV Analyzer",
    tujuan: "Mengunggah file Excel/CSV data laporan dari TikTok Seller Center / Data Compass.",
    manfaat: [
      "Menjadi pintu utama pengisian data real toko ke dalam sistem.",
      "Secara otomatis memperbarui seluruh grafik analitik toko."
    ],
    caraGuna: "Pilih file Excel Overview/Video/Affiliate lalu klik Upload.",
    targetUser: "Tim Admin / Analyst"
  },
  "gmv-dashboard": {
    tabKey: "gmv-dashboard",
    title: "GMV Dashboard",
    groupTitle: "GMV Analyzer",
    tujuan: "Menampilkan ringkasan umum metrik penjualan toko.",
    manfaat: [
      "Snapshot cepat total penjualan, jumlah pesanan, dan tingkat konversi.",
      "Memantau tren pencapaian omset secara keseluruhan."
    ],
    caraGuna: "Pantau angka utama penjualan toko harian/mingguan.",
    targetUser: "Tim Marketing"
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
  affiliate: {
    tabKey: "affiliate",
    title: "Affiliate Manager",
    groupTitle: "GMV Analyzer",
    tujuan: "Database kreator afiliasi, pengelompokan tier (Nano/Micro/Macro), scoring, dan keaktifan.",
    manfaat: [
      "Memudahkan manajemen hubungan kreator (CRM Affiliate) & melacak kiriman sampel.",
      "Memantau statistik sampel terkirim vs omset yang dihasilkan oleh tiap kreator.",
      "Menyaring kreator dengan skor tertinggi untuk diajak kolaborasi ulang."
    ],
    caraGuna: "Unggah file Excel Affiliate dari Seller Center untuk melihat peringkat dan analisis keaktifan kreator.",
    targetUser: "Tim Admin / Analyst"
  },
  "live-analytics": {
    tabKey: "live-analytics",
    title: "Live Analytics",
    groupTitle: "GMV Analyzer",
    tujuan: "Evaluasi mendalam data siaran langsung (live streaming).",
    manfaat: [
      "Mengevaluasi performa host LIVE dan efektivitas promosi saat siaran.",
      "Mengetahui durasi siaran optimal."
    ],
    caraGuna: "Periksa tabel riwayat sesi LIVE dan nilai perolehan GMV per jam.",
    targetUser: "Tim Live / Host"
  },
  "gmv-sku": {
    tabKey: "gmv-sku",
    title: "SKU Analyzer",
    groupTitle: "GMV Analyzer",
    tujuan: "Menganalisis kontribusi penjualan dan kesehatan tiap produk (SKU ID).",
    manfaat: [
      "Menentukan produk mana yang menjadi Hero SKU vs produk mati (Dead Stock).",
      "Mengoptimalkan stok barang di gudang."
    ],
    caraGuna: "Urutkan produk berdasarkan GMV tertinggi untuk mengetahui SKU penyumbang terbesar.",
    targetUser: "Tim Marketing"
  },
  "gmv-creative": {
    tabKey: "gmv-creative",
    title: "Creative Optimizer",
    groupTitle: "GMV Analyzer",
    tujuan: "Mengukur performa dan daya pikat materi visual/kreatif iklan.",
    manfaat: [
      "Membantu tim kreatif membuat variasi konten baru yang terbukti memicu penjualan.",
      "Mengurangi pemborosan budget pada materi iklan tidak efektif."
    ],
    caraGuna: "Lihat skor rekomendasi kreatif (SCALE / PERTAHANKAN / OPTIMASI / HENTIKAN).",
    targetUser: "Tim Marketing"
  },
  "gmv-benchmark": {
    tabKey: "gmv-benchmark",
    title: "Top Seller Metrics",
    groupTitle: "GMV Analyzer",
    tujuan: "Membandingkan indikator toko Anda dengan standar seller papan atas (Top Seller).",
    manfaat: [
      "Memberikan standar acuan tinggi agar toko tidak cepat puas dengan hasil saat ini.",
      "Menemukan celah perbaikan metrik toko."
    ],
    caraGuna: "Bandingkan data toko Anda vs batas minimal indikator Top Seller.",
    targetUser: "Direksi / C-Level"
  },
  "gmv-checklist": {
    tabKey: "gmv-checklist",
    title: "Checklist Evaluasi",
    groupTitle: "GMV Analyzer",
    tujuan: "Daftar periksa tindakan evaluasi performa operasional toko.",
    manfaat: [
      "Memastikan tidak ada langkah optimasi operasional toko yang terlewat.",
      "Meningkatkan kedisiplinan kerja tim."
    ],
    caraGuna: "Centang setiap item evaluasi yang telah diselesaikan oleh tim.",
    targetUser: "Tim Marketing"
  },
  "gmv-optimasi": {
    tabKey: "gmv-optimasi",
    title: "Optimasi Kreatif",
    groupTitle: "GMV Analyzer",
    tujuan: "Menyajikan panduan rekomendasi penyesuaian materi promosi.",
    manfaat: [
      "Memberikan petunjuk taktis dalam memperbaiki konten yang kurang menjual.",
      "Mempercepat revisi materi iklan."
    ],
    caraGuna: "Ikuti rekomendasi perbaikan hook dan call-to-action yang disarankan.",
    targetUser: "Tim Marketing"
  },
  "gmv-kalkulator": {
    tabKey: "gmv-kalkulator",
    title: "ROI Calculator",
    groupTitle: "GMV Analyzer",
    tujuan: "Simulator proyeksi biaya, omset, dan potensi keuntungan kampanye.",
    manfaat: [
      "Membantu menyusun estimasi keuntungan sebelum mencairkan budget promosi besar.",
      "Menghitung Break-Even Point (BEP) iklan."
    ],
    caraGuna: "Input proyeksi budget dan target konversi untuk melihat simulasi profit.",
    targetUser: "Tim Admin / Analyst"
  },
  "product-cards": {
    tabKey: "product-cards",
    title: "Kartu Produk",
    groupTitle: "GMV Analyzer",
    tujuan: "Mengelola performa visual & harga etalase kartu produk e-commerce.",
    manfaat: [
      "Mengoptimalkan daya tarik tampilan produk di etalase toko.",
      "Meningkatkan rasio klik etalase."
    ],
    caraGuna: "Periksa tingkat konversi per kartu produk yang terpasang.",
    targetUser: "Tim Marketing"
  },
  "sku-tracking": {
    tabKey: "sku-tracking",
    title: "SKU Tracking",
    groupTitle: "GMV Analyzer",
    tujuan: "Monitoring harian/bulanan target penjualan per kode produk.",
    manfaat: [
      "Memastikan target kuota penjualan tiap jenis produk tercapai tepat waktu.",
      "Mencegah penimbunan stok produk."
    ],
    caraGuna: "Pantau persentase pencapaian kuota per unit produk.",
    targetUser: "Tim Admin / Analyst"
  },

  // --- GMV MAXIMIZER ---
  "gmax-overview": {
    tabKey: "gmax-overview",
    title: "GMAX Overview",
    groupTitle: "GMV Maximizer",
    tujuan: "Dashboard strategi maksimalisasi pertumbuhan GMV toko.",
    manfaat: [
      "Merancang akselerasi penjualan dengan skala modal yang lebih besar.",
      "Monitoring performa kampanye GMV Max."
    ],
    caraGuna: "Gunakan untuk meninjau pencapaian omset dari saluran GMV Max.",
    targetUser: "Direksi / C-Level"
  },
  "gmax-evaluasi": {
    tabKey: "gmax-evaluasi",
    title: "GMAX Evaluasi",
    groupTitle: "GMV Maximizer",
    tujuan: "Evaluasi penyerapan anggaran iklan GMV Max dan tingkat ROI.",
    manfaat: [
      "Memastikan iklan otomatis GMV Max menyerap anggaran secara efisien dan menghasilkan modal kembali.",
      "Mencegah pemborosan modal iklan otomatis."
    ],
    caraGuna: "Cek persentase penyerapan anggaran dan pencapaian target ROI.",
    targetUser: "Tim Admin / Analyst"
  },

  // --- TIM & OKR ---
  "staff-tracker": {
    tabKey: "staff-tracker",
    title: "Staff Tracker",
    groupTitle: "Tim",
    tujuan: "Mengawasi pembagian tugas, beban kerja, dan output kinerja tim internal.",
    manfaat: [
      "Memastikan beban kerja tim seimbang dan kinerja individu terpantau dengan adil.",
      "Meningkatkan akuntabilitas kerja tim."
    ],
    caraGuna: "Lihat tabel tugas dan tingkat penyelesaian pekerjaan tiap anggota staf.",
    targetUser: "Tim Admin / Analyst"
  },
  okr: {
    tabKey: "okr",
    title: "OKR Framework",
    groupTitle: "OKR",
    tujuan: "Mengelola Objectives & Key Results departemen (Konseptor, SMO, Advertiser, Affiliate).",
    manfaat: [
      "Menyinkronkan tujuan besar perusahaan dengan target harian setiap tim operasional.",
      "Fokus pada pencapaian hasil utama."
    ],
    caraGuna: "Evaluasi progres persentase pencapaian Key Results per departemen.",
    targetUser: "Direksi / C-Level"
  },

  // --- LAPORAN ---
  "report-builder": {
    tabKey: "report-builder",
    title: "Report Builder Custom",
    groupTitle: "Laporan",
    tujuan: "Generator penyusun laporan bisnis custom berbasis modul pilihan (Export PDF/Excel).",
    manfaat: [
      "Memudahkan pembuatan laporan berkala ke direksi/investor hanya dengan beberapa klik.",
      "Format profesional siap cetak."
    ],
    caraGuna: "Pilih modul yang ingin dimasukkan (Overview, Video, Affiliate) lalu klik Generate.",
    targetUser: "Tim Admin / Analyst"
  },
  "laporan-harian": {
    tabKey: "laporan-harian",
    title: "Laporan Harian (Export PDF/PPT)",
    groupTitle: "Laporan",
    tujuan: "Dashboard harian terintegrasi Supabase & Google Sheets + Ekspor PDF/PowerPoint.",
    manfaat: [
      "Menyediakan bahan presentasi rapat harian/mingguan otomatis tanpa buat slide manual.",
      "Tersambung langsung dengan laporan keuangan toko."
    ],
    caraGuna: "Klik 'Export PDF' atau 'Export PPT' untuk mengunduh berkas laporan siap presentasi.",
    targetUser: "Direksi / C-Level"
  },

  // --- MULTI-TOKO ---
  "compare-gabungan": {
    tabKey: "compare-gabungan",
    title: "Compare & Gabungan Toko",
    groupTitle: "Multi-Toko",
    tujuan: "Mengakumulasikan data analitik dari beberapa cabang toko sekaligus.",
    manfaat: [
      "Melihat total omset konsolidasi bagi pemilik bisnis yang memiliki >1 toko e-commerce.",
      "Mempermudah pengawasan grup bisnis."
    ],
    caraGuna: "Pilih toko-toko yang ingin digabungkan untuk melihat total omset akumulatif.",
    targetUser: "Direksi / C-Level"
  },
  "store-compare": {
    tabKey: "store-compare",
    title: "Bandingkan Toko",
    groupTitle: "Multi-Toko",
    tujuan: "Perbandingan head-to-head indikator performa antar toko.",
    manfaat: [
      "Mengetahui toko mana yang kinerjanya paling bagus vs toko yang perlu didorong.",
      "Membandingkan efisiensi antar cabang."
    ],
    caraGuna: "Pilih 2 atau lebih toko untuk melihat grafik komparasi berdampingan.",
    targetUser: "Direksi / C-Level"
  },
  "store-settings": {
    tabKey: "store-settings",
    title: "Kelola Toko",
    groupTitle: "Multi-Toko",
    tujuan: "Manajemen pendaftaran, edit warna, dan penghapusan profil toko.",
    manfaat: [
      "Memudahkan pendaftaran cabang toko baru ke dalam sistem.",
      "Mengatur warna identitas toko."
    ],
    caraGuna: "Tambah toko baru atau perbarui nama/warna identitas toko.",
    targetUser: "Tim Admin / Analyst"
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
