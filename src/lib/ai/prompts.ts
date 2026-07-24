export const MASTER_SYSTEM_PROMPT = `
Kamu adalah "Aria", Senior E-Commerce Growth Consultant & Data Strategist yang menguasai ekosistem TikTok Shop, Tokopedia, Affiliate Marketing, dan Direct-to-Consumer (D2C) di Indonesia.

KEMAMPUAN UTAMA — DATA-AWARE AI ANALYST:
Kamu memiliki akses LANGSUNG ke seluruh data bisnis riil dari database perusahaan. Data ini disediakan di bagian "DATA KONTEKS" pada setiap percakapan. Kamu WAJIB:
1. **Menjawab pertanyaan spesifik dengan angka riil**: Jika user bertanya "berapa omset affiliate bulan Juni?", jawab dengan angka PASTI dari data yang diberikan, bukan estimasi.
2. **Membandingkan antar periode**: Jika user bertanya "bandingkan performa Mei vs Juni", hitung delta, persentase perubahan, dan berikan analisis tren.
3. **Menyebutkan sumber data**: Selalu cantumkan periode dan platform yang kamu gunakan dalam menjawab.
4. **Proaktif memberikan konteks tambahan**: Saat menjawab satu metrik, tambahkan metrik terkait yang relevan (misal: saat menjawab omset, tambahkan info refund rate, kreator aktif, ROAS).
5. **Menjawab dengan percaya diri**: Kamu MEMILIKI datanya. Jangan bilang "saya tidak memiliki akses" — data sudah diberikan kepadamu. Jika data untuk periode tertentu tidak tersedia, katakan "Data untuk periode X belum tersedia di database".

PRINSIP & STANDAR ANALISIS (DEEP & COMPREHENSIVE):
1. **Analisis Mendalam & Komprehensif (Bukan Sekadar Rangkuman Singkat)**: Berikan pembedahan data yang tajam, kritis, dan berbobot. Identifikasi akar masalah (root cause), kalkulasi dampak finansial, dan keterkaitan antar variabel (seperti ROAS vs CAC, volume video vs conversion rate, performa kreator vs refund rate).
2. **Berbasis Data & Angka Riil**: Selalu sertakan angka spesifik, persentase perubahan, rasio efisiensi, dan nominal Rupiah dari data yang diberikan. Jangan memberikan generalisasi tanpa bukti angka.
3. **Struktur Laporan Eksekutif yang Rapi**: Gunakan format Markdown yang kaya dengan Subheading (## / ###), Tabel Data, Bullet Points, dan **Teks Tebal** untuk kemudahan membaca.
4. **Rekomendasi Aksi Konkret (Actionable Blueprint)**: Setiap rekomendasi wajib disertai langkah eksekusi step-by-step, rekomendasi alokasi budget/strategi, serta target KPI yang terukur.
5. **Bahasa Indonesia Profesional & Lugas**: Komunikasi seperti konsultan bisnis papan atas — lugas, strategis, analitis, tanpa kalimat pengisi (fluff).

FOKUS METRIK KUNCI:
- **Financial & Margin**: Total Omzet Pembukuan Store, Ad Spend, Gross Profit Margin, Net ROI/ROAS, Cost Per Acquisition (CAC).
- **Content & Creative**: Video vs LIVE vs Product Card (Shop), VV (Video Views), Watch Rate, CTOR, GPM.
- **Affiliate & Creator**: Total Kreator Aktif, Ratio Keaktifan (>25%), Performa per Tier (Nano/Micro/Mid/Macro/Mega), Refund Rate, Komisi vs GMV.
- **Laporan Harian Store**: Omset FreshVision, Biaya Iklan, ROAS, Total Closing, Botol Terjual, Channel Breakdown.
`

export const AUTO_INSIGHT_PROMPTS: Record<string, string> = {
  dashboard: 'Berikan 3 insight otomatis paling kritis dan mendalam mengenai performa dashboard bulan ini.',
  sku: 'Berikan 3 insight otomatis paling kritis mengenai efisiensi SKU dan alokasi budget.',
  creative: 'Berikan 3 insight otomatis mengenai performa video kreatif dan strategi scaling.',
  overview: 'Berikan 3 insight otomatis mengenai tren penjualan dan volatilitas harian.',
  affiliate: 'Berikan 3 insight otomatis mengenai keaktifan kreator affiliate, refund rate, dan strategi tier.',
  okr: 'Berikan 3 insight otomatis mengenai pencapaian target OKR departemen.',
  optimasi: 'Berikan 3 insight otomatis mengenai strategi optimasi campaign dan hook video.',
  kalkulator: 'Berikan 3 insight otomatis mengenai kelayakan kalkulasi ROI dan margin.',
  'video-performance': 'Berikan 3 insight otomatis mengenai performa video, GPM, CTOR, dan kreator top.',
  'store-compare': 'Berikan 3 insight otomatis mengenai perbandingan efisiensi antartoko.',
  'compare-gabungan': 'Berikan 3 insight otomatis mengenai analisis gabungan toko.',
}

export const QUICK_ACTIONS: Record<string, { label: string; prompt: string }[]> = {
  dashboard: [
    { label: '📊 Ringkasan performa', prompt: 'Berikan analisis strategis komprehensif performa bisnis bulan ini. Pembedahan mendalam tentang omzet, efisiensi iklan, margin profit, dan rekomendasi langkah utama.' },
    { label: '🎯 Prioritas perbaikan', prompt: 'Berdasarkan seluruh data yang ada, bedahkan 3 kebocoran/masalah terbesar dan berikan rencana aksi prioritas minggu ini.' },
    { label: '📈 Strategi Scale Revenue', prompt: 'Buatkan blueprint strategis mendalam untuk meningkatkan revenue dan profit margin bulan depan, lengkap dengan alokasi budget per channel.' },
    { label: '⚖️ Evaluasi Video vs Live vs Shop', prompt: 'Analisis mendalam perbandingan efisiensi antara Video Shoppable, LIVE Streaming, dan Product Card (Shop). Mana yang paling menguntungkan?' },
    { label: '💡 Action Plan 48 Jam', prompt: 'Berikan 5 langkah eksekusi taktis prioritas tinggi yang bisa dijalankan tim dalam 48 jam ke depan untuk mendongkrak GMV.' },
  ],
  sku: [
    { label: '🔴 Evaluasi SKU Boros', prompt: 'Lakukan audit mendalam terhadap seluruh SKU. Mana SKU yang tidak efisien atau boros iklan dan haruskah dihentikan atau di-revamp?' },
    { label: '🏆 Analisis Pola SKU Top', prompt: 'Bedah faktor keberhasilan dari SKU Top Performer. Bagaimana strategi mereplikasi kesuksesan ini ke varian produk lainnya?' },
    { label: '📦 Optimasi Alokasi Budget SKU', prompt: 'Bagaimana alokasi budget iklan yang ideal per SKU berdasarkan ROI, margin bersih, dan potensi pertumbuhan?' },
  ],
  creative: [
    { label: '🚀 Evaluasi Creative Scaling', prompt: 'Lakukan evaluasi mendalam terhadap aset kreatif video iklan. Mana yang memiliki skor tertinggi untuk di-scale dan mana yang harus di-kill?' },
    { label: '🎬 Anatomi Video Winner', prompt: 'Bedah anatomi dan struktur konten dari video iklan terbaik. Jelaskan strategi hook, storytelling, dan Call to Action (CTA) pemenang.' },
    { label: '📝 Brief Konten Baru 30 Detik', prompt: 'Buatkan 3 brief konten video iklan TikTok 30 detik untuk produk FreshVision (kesehatan mata) berdasarkan pola winners.' },
  ],
  overview: [
    { label: '📊 Analisis Tren & Volatilitas', prompt: 'Analisis tren performa harian dan volatilitas penjualan bulan ini. Identifikasi pemicu peak dan drop performance secara mendetail.' },
    { label: '🔮 Proyeksi & Target Bulan Depan', prompt: 'Berdasarkan run-rate dan tren saat ini, berikan proyeksi GMV bulan depan serta roadmap strategis untuk mencapainya.' },
  ],
  affiliate: [
    { label: '🏆 Audit Portofolio Kreator', prompt: 'Lakukan audit komprehensif portofolio affiliate. Bedah performa kreator top, rasio keaktifan, dan distribusi tier (Nano hingga Mega).' },
    { label: '😴 Strategi Reaktivasi Kreator Pasif', prompt: 'Buatkan strategi reaktivasi terstruktur untuk kreator pasif/dormant lengkap dengan skema komisi dan insentif campaign.' },
    { label: '⚠️ Audit Risk & Refund Rate', prompt: 'Analisis mendalam mengenai tingkat refund affiliate. Kreator atau jenis konten mana yang menyumbang refund tertinggi dan solusinya?' },
    { label: '🤝 Roadmap Rekrutmen Kreator Baru', prompt: 'Buatkan rencana kerja rekrutmen dan insentif kreator baru bulan depan untuk mendongkrak keaktifan di atas benchmark 25%.' },
  ],
}
