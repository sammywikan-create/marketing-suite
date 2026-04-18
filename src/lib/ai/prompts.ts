export const MASTER_SYSTEM_PROMPT = `
Kamu adalah AI Analyst ahli TikTok Shop GMV Max bernama "Aria".
Spesialisasi: analisis performa campaign iklan, optimasi kreator konten, 
dan strategi peningkatan GMV TikTok Shop di Indonesia.

Aturan menjawab:
1. Selalu gunakan Bahasa Indonesia yang santai tapi profesional
2. Jawaban selalu actionable — ada langkah konkret yang bisa langsung dilakukan
3. Gunakan angka spesifik dari data yang diberikan
4. Format: gunakan emoji, bullet points, dan **bold** untuk poin penting
5. Maksimal 300 kata per jawaban kecuali diminta detail
6. Jika data tidak tersedia, minta user upload file yang diperlukan
7. Selalu akhiri dengan 1 pertanyaan follow-up yang relevan
`

export const QUICK_ACTIONS: Record<string, { label: string; prompt: string }[]> = {
  dashboard: [
    { label: '📊 Ringkasan performa', prompt: 'Berikan ringkasan performa bisnis bulan ini secara keseluruhan. Apa yang bagus dan apa yang perlu diperbaiki?' },
    { label: '🎯 Prioritas perbaikan', prompt: 'Dari semua data yang ada, apa 3 prioritas utama yang harus aku perbaiki minggu ini?' },
    { label: '📈 Cara scale revenue', prompt: 'Berdasarkan data saat ini, bagaimana strategi terbaik untuk meningkatkan revenue bulan depan?' },
    { label: '⚖️ Video vs Product Card', prompt: 'Haruskah aku lebih fokus ke Video atau Product Card? Berikan rekomendasi alokasi budget yang optimal.' },
    { label: '💡 Quick wins', prompt: 'Apa 3 quick wins yang bisa aku lakukan dalam 48 jam ke depan untuk meningkatkan performa?' },
  ],
  sku: [
    { label: '🔴 SKU yang harus dihentikan', prompt: 'Berdasarkan data SKU, mana yang harus dihentikan segera? Berikan alasan spesifik.' },
    { label: '🏆 Kenapa SKU ini top?', prompt: 'Analisis pola SKU top performer. Apa yang membuat mereka sukses? Bisa direplikasi ke SKU lain?' },
    { label: '💡 Optimasi SKU boros', prompt: 'Untuk SKU yang boros, apa langkah konkret untuk memperbaikinya atau haruskah dihentikan?' },
    { label: '📦 Naikkan budget SKU mana?', prompt: 'SKU mana yang paling layak untuk dinaikkan budgetnya sekarang? Berikan justifikasi.' },
    { label: '🔄 Alokasi budget optimal', prompt: 'Bagaimana cara mengalokasikan budget iklan secara optimal di antara semua SKU yang ada?' },
  ],
  creative: [
    { label: '🚀 Creative yang harus di-scale', prompt: 'Creative mana yang harus segera di-scale budgetnya? Kenapa?' },
    { label: '⛔ Creative yang harus dihentikan', prompt: 'Creative mana yang harus langsung dihentikan? Berikan alasan berdasarkan data.' },
    { label: '🎬 Pola konten winner', prompt: 'Apa pola dan karakteristik konten dari creative dengan score tertinggi? Bagaimana cara membuat yang serupa?' },
    { label: '🔧 Perbaiki hook video', prompt: 'Bagaimana cara memperbaiki hook video yang memiliki 2-second view rate rendah? Berikan contoh kalimat hook yang efektif untuk produk kesehatan mata.' },
    { label: '📝 Brief konten baru', prompt: 'Buatkan brief konten untuk 3 video iklan baru FreshVision berdasarkan pola creative yang berhasil.' },
  ],
  overview: [
    { label: '📊 Analisis tren bulan ini', prompt: 'Analisis tren performa bisnis bulan ini. Minggu mana yang terkuat dan terlemah? Kenapa?' },
    { label: '📉 Penyebab penurunan', prompt: 'Identifikasi hari-hari dengan performa di bawah rata-rata. Apa kemungkinan penyebabnya dan bagaimana mencegahnya?' },
    { label: '🗓️ Hari terbaik untuk promosi', prompt: 'Berdasarkan data harian, hari apa dan tanggal berapa yang paling ideal untuk flash sale atau promosi besar?' },
    { label: '🔮 Prediksi bulan depan', prompt: 'Berdasarkan tren yang ada, berapa estimasi GMV bulan depan? Apa yang perlu dilakukan untuk melampaui bulan ini?' },
    { label: '📈 Analisis multi-bulan', prompt: 'Analisis pertumbuhan bisnis dari bulan ke bulan. Ada pola seasonal yang perlu diantisipasi?' },
  ],
  benchmark: [
    { label: '🏆 Posisi vs seller top', prompt: 'Di metrik mana aku sudah setara atau bahkan lebih baik dari seller top? Di mana masih jauh?' },
    { label: '🔴 Gap terbesar', prompt: 'Metrik mana yang paling jauh dari benchmark seller top? Apa penyebab utamanya?' },
    { label: '🛣️ Roadmap 3 bulan', prompt: 'Buatkan roadmap 3 bulan untuk mencapai level seller top, mulai dari yang paling mudah dicapai.' },
    { label: '💪 Quick benchmark wins', prompt: 'Benchmark mana yang paling mudah dan cepat bisa ditingkatkan? Apa langkah konkretnya?' },
  ],
  checklist: [
    { label: '✅ Review checklist minggu ini', prompt: 'Review checklist evaluasi minggu ini. Item mana yang paling kritis jika terlewat?' },
    { label: '⚡ Prioritas tertinggi', prompt: 'Dari semua item checklist yang belum selesai, mana yang harus diselesaikan hari ini?' },
    { label: '📋 Action plan minggu ini', prompt: 'Buatkan action plan harian untuk minggu ini berdasarkan checklist yang ada.' },
  ],
  optimasi: [
    { label: '🩺 Diagnosa masalah creative', prompt: 'Berdasarkan gejala yang paling umum di data saya, apa diagnosis utama masalah creative dan solusi prioritasnya?' },
    { label: '🎣 5 ide hook video', prompt: 'Berikan 5 ide hook video TikTok yang menarik untuk produk FreshVision (madu kesehatan mata). Hook harus relate dengan masalah mata sehari-hari.' },
    { label: '📝 Script video 30 detik', prompt: 'Buatkan script video TikTok 30 detik untuk FreshVision. Format: Hook (3 det) → Problem (7 det) → Solution (10 det) → CTA (10 det).' },
    { label: '📱 Tren konten TikTok', prompt: 'Apa tren konten TikTok yang relevan untuk produk kesehatan/herbal saat ini? Bagaimana mengadaptasinya untuk FreshVision?' },
  ],
  kalkulator: [
    { label: '💡 Apakah angka ini realistis?', prompt: 'Berdasarkan angka di kalkulator, apakah estimasi ini realistis untuk campaign GMV Max? Bandingkan dengan benchmark.' },
    { label: '🎯 Cara capai ROI lebih tinggi', prompt: 'Dengan input saat ini, bagaimana cara meningkatkan ROI? Variabel mana yang paling berpengaruh?' },
    { label: '⚖️ Optimasi harga jual', prompt: 'Apakah harga jual saat ini sudah optimal untuk memaksimalkan profit sambil tetap kompetitif?' },
    { label: '📊 Budget iklan ideal', prompt: 'Berapa budget iklan yang ideal berdasarkan margin dan target revenue yang diinput?' },
  ],
  'video-performance': [
    { label: '🚀 Video yang harus di-boost?', prompt: 'Dari data video performance ini, video mana yang paling layak langsung di-boost via GMV Max? Berikan top 3 rekomendasi dengan alasan spesifik berdasarkan GPM, CTR, dan CTOR.' },
    { label: '📉 Kenapa watch rate rendah?', prompt: 'Watch rate rata-rata video sangat rendah. Apa kemungkinan penyebab utamanya dan bagaimana cara meningkatkannya? Berikan 5 contoh hook video konkret untuk produk FreshVision.' },
    { label: '👥 Kreator paling efektif?', prompt: 'Bandingkan performa semua kreator berdasarkan data. Siapa yang paling efisien dari sisi GMV, GPM, dan CTOR? Apakah perlu strategi berbeda untuk setiap kreator?' },
    { label: '🎯 Cara tingkatkan CTR video', prompt: 'CTR rata-rata video masih rendah. Berikan 5 tips spesifik untuk meningkatkan CTR video organik TikTok untuk produk kesehatan seperti FreshVision.' },
    { label: '🔍 Analisis funnel video', prompt: 'Analisis funnel video dari VV sampai Pesanan. Di tahap mana paling banyak drop-off? Apa penyebabnya dan bagaimana solusinya?' },
    { label: '📝 Pola konten video terbaik', prompt: 'Dari video dengan GMV dan GPM tertinggi, apa pola konten yang berhasil? Bagaimana cara membuat lebih banyak video dengan pola serupa?' },
  ],
  'store-compare': [
    { label: '⚖️ Toko mana lebih efisien?', prompt: 'Bandingkan performa kedua toko. Toko mana yang lebih efisien dari sisi konversi, GPM, dan watch rate? Berikan analisis mendetail.' },
    { label: '📈 Apa yang bisa dipelajari?', prompt: 'Apa yang bisa dipelajari masing-masing toko dari toko lainnya? Berikan rekomendasi strategi spesifik untuk setiap toko.' },
    { label: '🎯 Strategi untuk toko lemah', prompt: 'Untuk toko yang performanya lebih rendah, berikan 5 langkah konkret untuk mengejar ketertinggalan dari toko yang lebih baik.' },
    { label: '🔀 Alokasi budget optimal', prompt: 'Jika saya harus membagi budget iklan antara 2 toko ini, bagaimana alokasi optimalnya? Pertimbangkan ROI dan potensi pertumbuhan masing-masing.' },
  ],
  'affiliate': [
    { label: '🏆 Kreator yang harus diprioritaskan?', prompt: 'Dari data affiliate ini, kreator mana yang harus diprioritaskan untuk di-boost? Berikan top 5 rekomendasi dengan alasan spesifik berdasarkan GMV, score, dan potensi pertumbuhan.' },
    { label: '😴 Strategi reaktivasi kreator', prompt: 'Ada banyak kreator tidak aktif. Berikan strategi reaktivasi yang terstruktur per tier: nano, micro, mid, macro. Mana yang worth it untuk didorong lagi?' },
    { label: '⚠️ Kenapa refund rate tinggi?', prompt: 'Analisis penyebab refund rate yang tinggi. Kreator mana yang paling berkontribusi ke refund? Apa solusi konkretnya?' },
    { label: '📈 Cara tingkatkan GMV affiliate', prompt: 'Berdasarkan data saat ini, bagaimana strategi terbaik untuk meningkatkan GMV affiliate bulan depan? Fokus pada kreator existing vs rekrut baru.' },
    { label: '🎯 Tier paling efisien?', prompt: 'Tier kreator mana yang paling efisien (GMV per kreator tertinggi)? Haruskah fokus rekrut di tier tertentu?' },
    { label: '💰 Komisi sepadan?', prompt: 'Apakah total komisi yang dibayarkan sudah sepadan dengan GMV yang dihasilkan? Bagaimana optimasi commission rate?' },
    { label: '📊 Analisis tren 3 bulan', prompt: 'Analisis tren affiliate 3 bulan terakhir. Apakah GMV, kreator aktif, dan refund rate membaik atau memburuk? Apa yang harus dilakukan?' },
    { label: '🤝 Rekrut kreator tier apa?', prompt: 'Berdasarkan data performa per tier, tier kreator apa yang harus diprioritaskan untuk rekrutmen baru? Berikan justifikasi data.' },
  ],
  'okr': [
    { label: '📊 Analisis performa semua departemen', prompt: 'Analisis performa semua departemen bulan ini berdasarkan data OKR. Departemen mana yang paling baik dan paling buruk? Berikan insight spesifik.' },
    { label: '🔴 Departemen paling ketinggalan?', prompt: 'Departemen mana yang paling ketinggalan dari target? Apa penyebab utamanya dan bagaimana cara mengejar?' },
    { label: '💡 Target bulan depan realistis', prompt: 'Berdasarkan achieve bulan ini, berikan rekomendasi target bulan depan yang realistis. Naikkan 10-30% untuk metrik tercapai, pertahankan untuk yang belum.' },
    { label: '🏆 Metrik konsisten tercapai', prompt: 'Metrik apa yang konsisten tercapai atau terlampaui? Apa yang bisa dipelajari dari pola keberhasilan ini?' },
    { label: '📈 Bandingkan vs bulan lalu', prompt: 'Bandingkan performa bulan ini vs bulan lalu. Di metrik mana ada peningkatan dan penurunan signifikan?' },
  ],
  'compare-gabungan': [
    { label: '🏆 Toko paling efisien?', prompt: 'Dari data perbandingan ini, toko mana yang lebih efisien secara keseluruhan? Berikan analisis per metrik.' },
    { label: '📈 Pelajaran antar toko', prompt: 'Apa yang bisa dipelajari toko yang lebih lemah dari toko yang lebih kuat? Berikan rekomendasi konkret.' },
    { label: '🎯 Strategi per toko', prompt: 'Berikan rekomendasi strategi yang berbeda untuk masing-masing toko berdasarkan kekuatan dan kelemahannya.' },
    { label: '⚠️ Kelemahan terbesar', prompt: 'Di mana kelemahan terbesar masing-masing toko? Apa yang harus diperbaiki paling mendesak?' },
    { label: '🔗 Analisis bisnis gabungan', prompt: 'Jika kedua toko digabungkan sebagai 1 bisnis, bagaimana kondisi keseluruhannya? Apakah sudah optimal?' },
    { label: '🔮 Prediksi bulan depan', prompt: 'Berdasarkan tren gabungan, berapa estimasi GMV total bulan depan untuk kedua toko?' },
  ],
}

export const AUTO_INSIGHT_PROMPTS: Record<string, string> = {
  dashboard: 'Berikan 3 insight terpenting dari data dashboard ini. Format: masing-masing 1-2 kalimat singkat dengan emoji. Fokus pada: (1) kondisi ROI, (2) creative terbaik, (3) 1 hal yang harus segera diperbaiki.',
  sku: 'Dari data SKU ini, berikan 3 insight singkat: (1) SKU yang harus jadi prioritas, (2) SKU yang paling berisiko, (3) rekomendasi aksi paling mendesak.',
  creative: 'Dari data creative ini, berikan 3 insight: (1) pola creative winner, (2) pola creative yang gagal, (3) rekomendasi untuk creative baru.',
  overview: 'Dari data bisnis bulanan ini, berikan 3 insight: (1) tren utama, (2) anomali yang perlu diperhatikan, (3) peluang yang bisa dimanfaatkan bulan depan.',
  'video-performance': 'Dari data video performance ini, berikan 3 insight: (1) video/kreator terbaik dan pola suksesnya, (2) masalah utama pada funnel video, (3) video mana yang paling layak di-boost segera.',
  'store-compare': 'Bandingkan performa kedua toko ini secara komprehensif. Berikan 3 insight: (1) toko mana yang menang di aspek apa, (2) kelemahan utama masing-masing toko, (3) rekomendasi strategi berbeda untuk masing-masing.',
  'compare-gabungan': 'Analisis data perbandingan dan gabungan 2 toko ini. Berikan 3 insight: (1) toko mana yang dominan dan kenapa, (2) performa gabungan secara keseluruhan, (3) strategi untuk memaksimalkan output kedua toko.',
  'okr': 'Dari data OKR ini, berikan 3 insight: (1) departemen dengan performa terbaik dan kenapa, (2) metrik yang paling kritis dan perlu perhatian, (3) rekomendasi prioritas untuk bulan depan.',
  'affiliate': 'Dari data affiliate ini, berikan 3 insight: (1) kreator/tier mana yang paling menghasilkan dan kenapa, (2) masalah utama (refund, kreator tidak aktif, dll), (3) rekomendasi aksi paling mendesak untuk meningkatkan GMV affiliate.',
}
