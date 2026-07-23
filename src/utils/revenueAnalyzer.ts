import type {
  DailyBusinessData,
  BusinessOverviewData,
  VideoPerformanceData,
  AffiliateMonthData,
  ChannelDropAlert,
  FunnelComparisonStage,
  OmsetDiagnosisItem,
} from "@/lib/types";

// ─── HELPER FUNCTIONS ──────────────────────────────────────────
export function formatRupiah(val: number): string {
  if (isNaN(val) || val === null || val === undefined) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(val);
}

export function formatRupiahShort(val: number): string {
  if (isNaN(val) || val === 0) return "Rp 0";
  if (Math.abs(val) >= 1_000_000_000) return `Rp ${(val / 1_000_000_000).toFixed(1)} M`;
  if (Math.abs(val) >= 1_000_000) return `Rp ${(val / 1_000_000).toFixed(1)} Jt`;
  if (Math.abs(val) >= 1_000) return `Rp ${(val / 1_000).toFixed(0)} Rb`;
  return `Rp ${val.toLocaleString("id-ID")}`;
}

export function formatNumber(val: number): string {
  if (isNaN(val)) return "0";
  return val.toLocaleString("id-ID");
}

export function formatPct(val: number): string {
  if (isNaN(val)) return "0%";
  return `${val.toFixed(1)}%`;
}

// ─── MOCK / DEMO DATASETS FOR RICH DEFAULT EXPERIENCES ─────────
export function getDemoDailyData(): {
  date: string;
  gmvLive: number;
  gmvVideo: number;
  gmvAffiliate: number;
  gmvProductCard: number;
  totalGMV: number;
  impressions: number;
  clicks: number;
  atc: number;
  orders: number;
}[] {
  const dates = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    
    // Simulate slight decline in last 5 days for affiliate channel to trigger alerts
    const dropFactor = i < 5 ? 0.7 : 1.0;
    
    const gmvLive = Math.round((12_000_000 + Math.sin(i * 0.5) * 3_000_000 + Math.random() * 2_000_000));
    const gmvVideo = Math.round((8_000_000 + Math.cos(i * 0.4) * 2_000_000 + Math.random() * 1_500_000));
    const gmvAffiliate = Math.round((25_000_000 + Math.sin(i * 0.3) * 5_000_000 + Math.random() * 3_000_000) * dropFactor);
    const gmvProductCard = Math.round((4_000_000 + Math.sin(i * 0.8) * 1_000_000 + Math.random() * 800_000));
    const totalGMV = gmvLive + gmvVideo + gmvAffiliate + gmvProductCard;

    const impressions = Math.round(150_000 + Math.random() * 40_000);
    const clicks = Math.round(impressions * (0.045 + Math.random() * 0.015));
    const atc = Math.round(clicks * (0.25 + Math.random() * 0.05));
    const orders = Math.round(atc * (0.20 + Math.random() * 0.05));

    dates.push({
      date: dateStr,
      gmvLive,
      gmvVideo,
      gmvAffiliate,
      gmvProductCard,
      totalGMV,
      impressions,
      clicks,
      atc,
      orders,
    });
  }
  return dates;
}

// ─── FITUR 1: REVENUE BREAKDOWN & TREND ANALYZER ─────────────
export interface RevenueChannelSummary {
  channel: string;
  label: string;
  totalGMV: number;
  sharePct: number;
  color: string;
  trend7dPct: number;
  avg7Days: number;
  currentDay: number;
}

export function computeRevenueBreakdown(dailyList: ReturnType<typeof getDemoDailyData>) {
  if (!dailyList || dailyList.length === 0) {
    dailyList = getDemoDailyData();
  }

  const totals = {
    gmvLive: dailyList.reduce((acc, curr) => acc + curr.gmvLive, 0),
    gmvVideo: dailyList.reduce((acc, curr) => acc + curr.gmvVideo, 0),
    gmvAffiliate: dailyList.reduce((acc, curr) => acc + curr.gmvAffiliate, 0),
    gmvProductCard: dailyList.reduce((acc, curr) => acc + curr.gmvProductCard, 0),
  };

  const grandTotal = totals.gmvLive + totals.gmvVideo + totals.gmvAffiliate + totals.gmvProductCard || 1;

  const channels: RevenueChannelSummary[] = [
    {
      channel: "gmvAffiliate",
      label: "Afiliasi Kreator",
      totalGMV: totals.gmvAffiliate,
      sharePct: (totals.gmvAffiliate / grandTotal) * 100,
      color: "#8884d8",
      trend7dPct: 0,
      avg7Days: 0,
      currentDay: 0,
    },
    {
      channel: "gmvLive",
      label: "LIVE Penjual",
      totalGMV: totals.gmvLive,
      sharePct: (totals.gmvLive / grandTotal) * 100,
      color: "#ff7300",
      trend7dPct: 0,
      avg7Days: 0,
      currentDay: 0,
    },
    {
      channel: "gmvVideo",
      label: "Video Penjual",
      totalGMV: totals.gmvVideo,
      sharePct: (totals.gmvVideo / grandTotal) * 100,
      color: "#0088FE",
      trend7dPct: 0,
      avg7Days: 0,
      currentDay: 0,
    },
    {
      channel: "gmvProductCard",
      label: "Kartu Produk / Etalase",
      totalGMV: totals.gmvProductCard,
      sharePct: (totals.gmvProductCard / grandTotal) * 100,
      color: "#00C49F",
      trend7dPct: 0,
      avg7Days: 0,
      currentDay: 0,
    },
  ];

  // Calculate 7-day averages & alerts for drop > 20%
  const alerts: ChannelDropAlert[] = [];
  const len = dailyList.length;

  if (len >= 8) {
    const last7 = dailyList.slice(len - 7);
    const prev7 = dailyList.slice(Math.max(0, len - 14), len - 7);

    const keys: Array<keyof typeof totals> = ["gmvLive", "gmvVideo", "gmvAffiliate", "gmvProductCard"];
    const labels: Record<string, string> = {
      gmvLive: "LIVE Penjual",
      gmvVideo: "Video Penjual",
      gmvAffiliate: "Afiliasi Kreator",
      gmvProductCard: "Kartu Produk",
    };

    keys.forEach((key) => {
      const avgLast7 = last7.reduce((s, d) => s + d[key], 0) / 7;
      const avgPrev7 = prev7.length ? prev7.reduce((s, d) => s + d[key], 0) / prev7.length : avgLast7;
      const latestVal = dailyList[len - 1][key];

      const ch = channels.find((c) => c.channel === key);
      if (ch) {
        ch.avg7Days = avgLast7;
        ch.currentDay = latestVal;
        ch.trend7dPct = avgPrev7 > 0 ? ((avgLast7 - avgPrev7) / avgPrev7) * 100 : 0;
      }

      // Check drop > 20% compared to 7-day average
      if (avgLast7 > 0 && latestVal < avgLast7 * 0.8) {
        const dropPct = ((avgLast7 - latestVal) / avgLast7) * 100;
        alerts.push({
          channel: labels[key],
          date: dailyList[len - 1].date,
          dropPct,
          currentValue: latestVal,
          avg7Days: avgLast7,
          severity: dropPct > 35 ? "critical" : "warning",
        });
      }
    });
  }

  return { grandTotal, channels, alerts, chartData: dailyList };
}

// ─── FITUR 2: FUNNEL CONVERSION ANALYZER ──────────────────────
export function computeFunnelAnalyzer(dailyList: ReturnType<typeof getDemoDailyData>) {
  if (!dailyList || dailyList.length === 0) {
    dailyList = getDemoDailyData();
  }

  const totals = dailyList.reduce(
    (acc, cur) => ({
      impressions: acc.impressions + cur.impressions,
      clicks: acc.clicks + cur.clicks,
      atc: acc.atc + cur.atc,
      orders: acc.orders + cur.orders,
      totalGMV: acc.totalGMV + cur.totalGMV,
    }),
    { impressions: 0, clicks: 0, atc: 0, orders: 0, totalGMV: 0 }
  );

  const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
  const atcRate = totals.clicks > 0 ? (totals.atc / totals.clicks) * 100 : 0;
  const ctor = totals.clicks > 0 ? (totals.orders / totals.clicks) * 100 : 0;

  // High Revenue vs Low Revenue Day Comparison
  const sortedByGMV = [...dailyList].sort((a, b) => b.totalGMV - a.totalGMV);
  const topHalf = sortedByGMV.slice(0, Math.ceil(sortedByGMV.length / 2));
  const bottomHalf = sortedByGMV.slice(Math.ceil(sortedByGMV.length / 2));

  const avgTop = {
    gmv: topHalf.reduce((s, x) => s + x.totalGMV, 0) / topHalf.length,
    impressions: topHalf.reduce((s, x) => s + x.impressions, 0) / topHalf.length,
    clicks: topHalf.reduce((s, x) => s + x.clicks, 0) / topHalf.length,
    orders: topHalf.reduce((s, x) => s + x.orders, 0) / topHalf.length,
    ctr: (topHalf.reduce((s, x) => s + x.clicks, 0) / (topHalf.reduce((s, x) => s + x.impressions, 0) || 1)) * 100,
    ctor: (topHalf.reduce((s, x) => s + x.orders, 0) / (topHalf.reduce((s, x) => s + x.clicks, 0) || 1)) * 100,
  };

  const avgBottom = {
    gmv: bottomHalf.reduce((s, x) => s + x.totalGMV, 0) / bottomHalf.length,
    impressions: bottomHalf.reduce((s, x) => s + x.impressions, 0) / bottomHalf.length,
    clicks: bottomHalf.reduce((s, x) => s + x.clicks, 0) / bottomHalf.length,
    orders: bottomHalf.reduce((s, x) => s + x.orders, 0) / bottomHalf.length,
    ctr: (bottomHalf.reduce((s, x) => s + x.clicks, 0) / (bottomHalf.reduce((s, x) => s + x.impressions, 0) || 1)) * 100,
    ctor: (bottomHalf.reduce((s, x) => s + x.orders, 0) / (bottomHalf.reduce((s, x) => s + x.clicks, 0) || 1)) * 100,
  };

  // Identify Bottleneck
  let bottleneck = "Normal";
  let bottleneckDesc = "Funnel berjalan seimbang tanpa drop drastis.";

  if (ctr < 3.0 && ctor >= 15.0) {
    bottleneck = "Traffic & Hook (Impresi → Klik)";
    bottleneckDesc = "CTR rendah tetapi CTOR tinggi: Konten/iklan kurang memikat penonton untuk mengklik, padahal penawaran produk sudah bagus.";
  } else if (ctr >= 5.0 && ctor < 10.0) {
    bottleneck = "Penawaran & Closing (Klik → Pesanan)";
    bottleneckDesc = "CTR tinggi tetapi CTOR rendah: Banyak pengunjung masuk namun batal membeli. Masalah di ulasan, harga, promo, atau deskripsi produk.";
  } else if (ctr < 3.0 && ctor < 10.0) {
    bottleneck = "Keduanya (Traffic & Closing)";
    bottleneckDesc = "CTR dan CTOR di bawah rata-rata: Perlu perbaikan menyeluruh pada hook video dan daya tarik penawaran produk.";
  }

  const comparisonStages: FunnelComparisonStage[] = [
    {
      stage: "Impresi (Jangkauan)",
      highPeriodValue: Math.round(avgTop.impressions),
      lowPeriodValue: Math.round(avgBottom.impressions),
      dropPct: avgTop.impressions > 0 ? ((avgTop.impressions - avgBottom.impressions) / avgTop.impressions) * 100 : 0,
      conversionRateHigh: 100,
      conversionRateLow: 100,
    },
    {
      stage: "Klik (CTR)",
      highPeriodValue: Math.round(avgTop.clicks),
      lowPeriodValue: Math.round(avgBottom.clicks),
      dropPct: avgTop.clicks > 0 ? ((avgTop.clicks - avgBottom.clicks) / avgTop.clicks) * 100 : 0,
      conversionRateHigh: avgTop.ctr,
      conversionRateLow: avgBottom.ctr,
    },
    {
      stage: "Pesanan (CTOR)",
      highPeriodValue: Math.round(avgTop.orders),
      lowPeriodValue: Math.round(avgBottom.orders),
      dropPct: avgTop.orders > 0 ? ((avgTop.orders - avgBottom.orders) / avgTop.orders) * 100 : 0,
      conversionRateHigh: avgTop.ctor,
      conversionRateLow: avgBottom.ctor,
    },
  ];

  return {
    totals,
    ctr,
    atcRate,
    ctor,
    avgTop,
    avgBottom,
    bottleneck,
    bottleneckDesc,
    comparisonStages,
  };
}

// ─── FITUR 3: LIVE PERFORMANCE SCORECARD ──────────────────────
export interface LiveSessionData {
  id: string;
  title: string;
  date: string;
  durationMinutes: number;
  impressions: number;
  gmv: number;
  orders: number;
  gpm: number; // GMV per 1,000 Impressions
  avgWatchSeconds: number;
  isProductive: boolean;
  bestHour: string;
}

export function computeLiveScorecard() {
  const sessions: LiveSessionData[] = [
    { id: "1", title: "LIVE Flash Sale Malam Peak", date: "2026-07-22", durationMinutes: 180, impressions: 45000, gmv: 14500000, orders: 120, gpm: 322222, avgWatchSeconds: 48, isProductive: true, bestHour: "20:00 - 21:00" },
    { id: "2", title: "LIVE Sesi Siang Promo", date: "2026-07-21", durationMinutes: 120, impressions: 18000, gmv: 3200000, orders: 28, gpm: 177777, avgWatchSeconds: 28, isProductive: true, bestHour: "13:00 - 14:00" },
    { id: "3", title: "LIVE Pagi Santai", date: "2026-07-20", durationMinutes: 90, impressions: 8000, gmv: 600000, orders: 5, gpm: 75000, avgWatchSeconds: 15, isProductive: false, bestHour: "10:00 - 11:00" },
    { id: "4", title: "LIVE Special Affiliate Host", date: "2026-07-19", durationMinutes: 240, impressions: 62000, gmv: 21000000, orders: 185, gpm: 338709, avgWatchSeconds: 52, isProductive: true, bestHour: "19:00 - 22:00" },
    { id: "5", title: "LIVE Sore Review SKU Hero", date: "2026-07-18", durationMinutes: 150, impressions: 22000, gmv: 4500000, orders: 42, gpm: 204545, avgWatchSeconds: 34, isProductive: true, bestHour: "16:00 - 17:30" },
  ];

  const totalGMV = sessions.reduce((s, x) => s + x.gmv, 0);
  const totalImpressions = sessions.reduce((s, x) => s + x.impressions, 0);
  const overallGPM = totalImpressions > 0 ? (totalGMV / totalImpressions) * 1000 : 0;
  const productiveCount = sessions.filter((s) => s.isProductive).length;
  const productivePct = (productiveCount / sessions.length) * 100;
  const avgWatchTime = Math.round(sessions.reduce((s, x) => s + x.avgWatchSeconds, 0) / sessions.length);

  const isGpmGood = overallGPM >= 15000;

  return {
    sessions,
    totalGMV,
    totalImpressions,
    overallGPM,
    isGpmGood,
    productiveCount,
    totalSessions: sessions.length,
    productivePct,
    avgWatchTime,
    bestHoursRecommendation: "19:00 - 22:00 WIB (GMV Rata-rata 3x lebih tinggi & durasi tonton >45 dtk)",
  };
}

// ─── FITUR 4: AFFILIATE PERFORMANCE TRACKER ──────────────────
export function computeAffiliateTracker() {
  const history = [
    { period: "Minggu 1", gmvAffiliate: 65000000, gmvOwn: 18000000, activeCreators: 42 },
    { period: "Minggu 2", gmvAffiliate: 72000000, gmvOwn: 21000000, activeCreators: 48 },
    { period: "Minggu 3", gmvAffiliate: 85000000, gmvOwn: 22000000, activeCreators: 55 },
    { period: "Minggu 4", gmvAffiliate: 61000000, gmvOwn: 20000000, activeCreators: 38 }, // dropped
  ];

  const current = history[history.length - 1];
  const previous = history[history.length - 2];

  const totalGMV = current.gmvAffiliate + current.gmvOwn;
  const affiliateShare = (current.gmvAffiliate / totalGMV) * 100;
  const avgPerCreator = current.activeCreators > 0 ? current.gmvAffiliate / current.activeCreators : 0;

  const gmvDropPct = ((previous.gmvAffiliate - current.gmvAffiliate) / previous.gmvAffiliate) * 100;
  const creatorDropCount = previous.activeCreators - current.activeCreators;

  const isAlert = gmvDropPct > 15;

  return {
    history,
    current,
    previous,
    totalGMV,
    affiliateShare,
    avgPerCreator,
    gmvDropPct,
    creatorDropCount,
    isAlert,
  };
}

// ─── FITUR 5: OMSET DOCTOR (DIAGNOSIS OTOMATIS) ───────────────
export function runOmsetDoctorDiagnosis(): {
  healthScore: number;
  healthStatus: "SANGAT SEHAT" | "PERLU PERHATIAN" | "KRITIS";
  diagnoses: OmsetDiagnosisItem[];
} {
  const revenue = computeRevenueBreakdown(getDemoDailyData());
  const funnel = computeFunnelAnalyzer(getDemoDailyData());
  const live = computeLiveScorecard();
  const affiliate = computeAffiliateTracker();

  const diagnoses: OmsetDiagnosisItem[] = [];
  let scoreDeductions = 0;

  // 1. Traffic Check
  if (funnel.totals.impressions < 100_000) {
    scoreDeductions += 15;
    diagnoses.push({
      id: "diag-traffic",
      category: "TRAFFIC",
      severity: "WARNING",
      title: "Jangkauan Trafik Penonton Menurun",
      diagnosis: "Jumlah impresi konten & toko di bawah target harian.",
      rootCause: "Kurangnya frekuensi unggah video harian atau alokasi iklan (ads) yang belum terdorong.",
      recommendation: "Tingkatkan frekuensi posting hingga 3-5 video/hari & distribusikan sampel ke 10+ kreator baru.",
      impactScore: 75,
    });
  }

  // 2. CTR Check
  if (funnel.ctr < 3.5) {
    scoreDeductions += 20;
    diagnoses.push({
      id: "diag-ctr",
      category: "CTR",
      severity: "CRITICAL",
      title: "Rasio Klik Video & Produk (CTR) Rendah",
      diagnosis: `Rasio CTR saat ini ${funnel.ctr.toFixed(1)}% (Target standar >4.5%).`,
      rootCause: "Cover video, 3 detik pertama (hook), atau judul produk kurang memicu rasa penasaran penonton.",
      recommendation: "Ganti cover video dengan text overlay tebal (promosi/masalah konsumen) & gunakan visualisasi unboxing cepat.",
      impactScore: 88,
    });
  }

  // 3. CTOR Check
  if (funnel.ctor < 12.0) {
    scoreDeductions += 25;
    diagnoses.push({
      id: "diag-ctor",
      category: "CTOR",
      severity: "CRITICAL",
      title: "Kendala Closing Pembelian (CTOR Drop)",
      diagnosis: `Pengunjung mengklik produk tetapi batal checkout (CTOR ${funnel.ctor.toFixed(1)}%).`,
      rootCause: "Harga kurang kompetitif dibanding pesaing, ulasan produk belum kuat, atau penawaran voucher terbatas.",
      recommendation: "Aktifkan voucher diskon ikatan checkout & tambah 5 ulasan bintang 5 berserta foto/video pembeli.",
      impactScore: 92,
    });
  }

  // 4. Live GPM Check
  if (!live.isGpmGood) {
    scoreDeductions += 15;
    diagnoses.push({
      id: "diag-live",
      category: "GPM_LIVE",
      severity: "WARNING",
      title: "Efektivitas Sesi LIVE Perlu Ditingkatkan",
      diagnosis: `Nilai GPM LIVE ${formatRupiahShort(live.overallGPM)} (di bawah benchmark Rp15.000 per 1.000 tayangan).`,
      rootCause: "Host kurang aktif melakukan call-to-action & durasi tonton rata-rata di bawah 30 detik.",
      recommendation: "Gunakan skrip penawaran berbatas waktu (Flash Deal 15 menit) & instruksikan host menunjuk keranjang kuning secara berkala.",
      impactScore: 80,
    });
  }

  // 5. Affiliate Drop Check
  if (affiliate.isAlert) {
    scoreDeductions += 20;
    diagnoses.push({
      id: "diag-affiliate",
      category: "AFFILIATE",
      severity: "WARNING",
      title: "Penurunan GMV Kreator Afiliasi",
      diagnosis: `GMV dari saluran afiliasi drop ${affiliate.gmvDropPct.toFixed(1)}% dengan ${affiliate.creatorDropCount} kreator tidak aktif.`,
      rootCause: "Kreator top-tier mengurangi postingan video promo atau komisi tidak kompetitif.",
      recommendation: "Kirim pesan follow-up win-back & tawarkan komisi khusus (tambah +3-5%) bagi kreator yang aktif kembali minggu ini.",
      impactScore: 85,
    });
  }

  // If no critical issue, add healthy diagnosis card
  if (diagnoses.length === 0) {
    diagnoses.push({
      id: "diag-healthy",
      category: "TRAFFIC",
      severity: "HEALTHY",
      title: "Semua Metrik Berjalan Performa Tinggi",
      diagnosis: "Trafik, CTR, CTOR, dan Afiliasi berada dalam kondisi optimal.",
      rootCause: "Ekosistem pemasaran dan penawaran toko terintegrasi dengan baik.",
      recommendation: "Pertahankan konsistensi jadwal LIVE dan ekspansi sampel ke kreator nano/micro baru.",
      impactScore: 100,
    });
  }

  const healthScore = Math.max(35, 100 - scoreDeductions);
  const healthStatus = healthScore >= 80 ? "SANGAT SEHAT" : healthScore >= 60 ? "PERLU PERHATIAN" : "KRITIS";

  return {
    healthScore,
    healthStatus,
    diagnoses,
  };
}
