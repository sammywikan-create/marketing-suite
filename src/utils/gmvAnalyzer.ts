// === GMV Analyzer Utility Functions ===

import type { BusinessOverviewSummary, DailyBusinessData, BusinessOverviewData, WeeklyData, BusinessInsight, MonthComparison, QuarterData, DayOfWeekStats, AnomalyData, ForecastResult, FunnelStep, VideoPerformanceItem, VideoSummary, VideoPerformanceData, CombinedStoreData, AffiliateCoreSummary, AffiliateCoreStats, AffiliateCreatorItem, AffiliateMonthData, AffiliateMonthSummary } from "@/lib/types";

export interface TikTokRow {
  campaignName: string;
  campaignId: string;
  productId: string;
  creativeType: string;
  videoTitle: string;
  videoId: string;
  tiktokAccount: string;
  timePosted: string;
  status: string;
  authorizationType: string;
  cost: number;
  skuOrders: number;
  costPerOrder: number;
  grossRevenue: number;
  roi: number;
  impressions: number;
  clicks: number;
  clickRate: number;
  conversionRate: number;
  viewRate2s: number;
  viewRate6s: number;
  viewRate25: number;
  viewRate50: number;
  viewRate75: number;
  viewRate100: number;
  currency: string;
}

export type SKUStatus = "TOP_PERFORMER" | "SEHAT" | "PERLU_OPTIMASI" | "BOROS" | "NO_SPEND";
export type CreativeAction = "SCALE" | "PERTAHANKAN" | "OPTIMASI" | "HENTIKAN";

export interface SKUClassification {
  status: SKUStatus;
  label: string;
  emoji: string;
  color: string;
  bgColor: string;
}

export interface CreativeScore {
  total: number;
  roiScore: number;
  ctrScore: number;
  cvrScore: number;
  vr2sScore: number;
  vr6sScore: number;
  action: CreativeAction;
  actionLabel: string;
  actionEmoji: string;
}

export interface KPISummary {
  totalGrossRevenue: number;
  totalCost: number;
  overallROI: number;
  totalOrders: number;
  avgCostPerOrder: number;
  overallCTR: number;
  totalImpressions: number;
  totalClicks: number;
  avgCVR: number;
}

export interface BenchmarkItem {
  metrik: string;
  sellerBiasa: string;
  sellerTop: string;
  dataKamu: string;
  dataKamuNum: number;
  targetNum: number;
  isGood: boolean;
}

// --- Parse Excel Data ---
function toNum(val: unknown): number {
  if (val === null || val === undefined || val === "" || val === "-") return 0;
  if (typeof val === "number") return val;
  const s = String(val).replace(/[,%Rp\s]/g, "").replace(/\./g, "").replace(",", ".");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function toStr(val: unknown): string {
  if (val === null || val === undefined) return "";
  return String(val).trim();
}

export function parseExcelData(rawRows: Record<string, unknown>[]): TikTokRow[] {
  return rawRows.map((row) => {
    // Try multiple column name formats
    const get = (keys: string[]): unknown => {
      for (const k of keys) {
        if (row[k] !== undefined) return row[k];
        // case-insensitive fallback
        const found = Object.keys(row).find(rk => rk.toLowerCase().replace(/[\s_-]/g, "") === k.toLowerCase().replace(/[\s_-]/g, ""));
        if (found) return row[found];
      }
      return undefined;
    };

    return {
      campaignName: toStr(get(["Campaign name", "CampaignName", "campaign_name", "Campaign Name"])),
      campaignId: toStr(get(["Campaign ID", "CampaignID", "campaign_id"])),
      productId: toStr(get(["Product ID", "ProductID", "product_id", "Product Id"])),
      creativeType: toStr(get(["Creative type", "CreativeType", "creative_type", "Creative Type"])),
      videoTitle: toStr(get(["Video title", "VideoTitle", "video_title", "Video Title"])),
      videoId: toStr(get(["Video ID", "VideoID", "video_id"])),
      tiktokAccount: toStr(get(["TikTok account", "TikTokAccount", "tiktok_account", "TikTok Account"])),
      timePosted: toStr(get(["Time posted", "TimePosted", "time_posted", "Time Posted"])),
      status: toStr(get(["Status", "status"])),
      authorizationType: toStr(get(["Authorization type", "AuthorizationType", "authorization_type"])),
      cost: toNum(get(["Cost", "cost"])),
      skuOrders: toNum(get(["SKU orders", "SKUOrders", "sku_orders", "SKU Orders"])),
      costPerOrder: toNum(get(["Cost per order", "CostPerOrder", "cost_per_order", "Cost Per Order"])),
      grossRevenue: toNum(get(["Gross revenue", "GrossRevenue", "gross_revenue", "Gross Revenue"])),
      roi: toNum(get(["ROI", "roi"])),
      impressions: toNum(get(["Product ad impressions", "Impressions", "impressions", "Product Ad Impressions"])),
      clicks: toNum(get(["Product ad clicks", "Clicks", "clicks", "Product Ad Clicks"])),
      clickRate: toNum(get(["Product ad click rate", "ClickRate", "click_rate", "Product Ad Click Rate", "CTR"])),
      conversionRate: toNum(get(["Ad conversion rate", "ConversionRate", "conversion_rate", "Ad Conversion Rate", "CVR"])),
      viewRate2s: toNum(get(["2-second ad video view rate", "2SecondViewRate", "2s_view_rate", "2-Second Ad Video View Rate"])),
      viewRate6s: toNum(get(["6-second ad video view rate", "6SecondViewRate", "6s_view_rate", "6-Second Ad Video View Rate"])),
      viewRate25: toNum(get(["25% ad video view rate", "25ViewRate", "25_view_rate"])),
      viewRate50: toNum(get(["50% ad video view rate", "50ViewRate", "50_view_rate"])),
      viewRate75: toNum(get(["75% ad video view rate", "75ViewRate", "75_view_rate"])),
      viewRate100: toNum(get(["100% ad video view rate", "100ViewRate", "100_view_rate"])),
      currency: toStr(get(["Currency", "currency"])) || "IDR",
    };
  }).filter(r => r.campaignName || r.productId || r.cost > 0 || r.grossRevenue > 0);
}

// --- Classify SKU ---
export function classifySKU(row: TikTokRow): SKUClassification {
  if (row.cost === 0) {
    return { status: "NO_SPEND", label: "NO SPEND", emoji: "⬜", color: "text-gray-500", bgColor: "bg-gray-100" };
  }
  if (row.roi >= 8 && row.grossRevenue > 1000000) {
    return { status: "TOP_PERFORMER", label: "TOP PERFORMER", emoji: "🏆", color: "text-yellow-700", bgColor: "bg-yellow-50" };
  }
  if (row.roi >= 5) {
    return { status: "SEHAT", label: "SEHAT", emoji: "✅", color: "text-green-700", bgColor: "bg-green-50" };
  }
  if (row.cost > 500000 && row.roi < 3) {
    return { status: "BOROS", label: "BOROS", emoji: "🔴", color: "text-red-700", bgColor: "bg-red-50" };
  }
  if (row.roi >= 1) {
    return { status: "PERLU_OPTIMASI", label: "PERLU OPTIMASI", emoji: "⚠️", color: "text-orange-700", bgColor: "bg-orange-50" };
  }
  return { status: "BOROS", label: "BOROS", emoji: "🔴", color: "text-red-700", bgColor: "bg-red-50" };
}

// --- Score Creative ---
export function scoreCreative(row: TikTokRow): CreativeScore {
  // ROI Score (max 40): ROI >= 10 => 40, scale linearly
  const roiScore = Math.min(40, (row.roi / 10) * 40);

  // CTR Score (max 20): CTR >= 5% => 20
  const ctrScore = Math.min(20, (row.clickRate / 5) * 20);

  // CVR Score (max 20): CVR >= 15% => 20
  const cvrScore = Math.min(20, (row.conversionRate / 15) * 20);

  // 2-sec view rate (max 10): >= 30% => 10
  const vr2sScore = Math.min(10, (row.viewRate2s / 30) * 10);

  // 6-sec view rate (max 10): >= 20% => 10
  const vr6sScore = Math.min(10, (row.viewRate6s / 20) * 10);

  const total = Math.round(roiScore + ctrScore + cvrScore + vr2sScore + vr6sScore);

  let action: CreativeAction;
  let actionLabel: string;
  let actionEmoji: string;

  if (total >= 70) {
    action = "SCALE"; actionLabel = "SCALE BUDGET"; actionEmoji = "🚀";
  } else if (total >= 50) {
    action = "PERTAHANKAN"; actionLabel = "PERTAHANKAN"; actionEmoji = "✅";
  } else if (total >= 30) {
    action = "OPTIMASI"; actionLabel = "OPTIMASI HOOK"; actionEmoji = "🔧";
  } else {
    action = "HENTIKAN"; actionLabel = "HENTIKAN"; actionEmoji = "⛔";
  }

  return {
    total,
    roiScore: Math.round(roiScore),
    ctrScore: Math.round(ctrScore),
    cvrScore: Math.round(cvrScore),
    vr2sScore: Math.round(vr2sScore),
    vr6sScore: Math.round(vr6sScore),
    action,
    actionLabel,
    actionEmoji,
  };
}

// --- Calculate KPIs ---
export function calculateKPIs(data: TikTokRow[]): KPISummary {
  const totalGrossRevenue = data.reduce((s, r) => s + r.grossRevenue, 0);
  const totalCost = data.reduce((s, r) => s + r.cost, 0);
  const totalOrders = data.reduce((s, r) => s + r.skuOrders, 0);
  const totalImpressions = data.reduce((s, r) => s + r.impressions, 0);
  const totalClicks = data.reduce((s, r) => s + r.clicks, 0);

  return {
    totalGrossRevenue,
    totalCost,
    overallROI: totalCost > 0 ? totalGrossRevenue / totalCost : 0,
    totalOrders,
    avgCostPerOrder: totalOrders > 0 ? totalCost / totalOrders : 0,
    overallCTR: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
    totalImpressions,
    totalClicks,
    avgCVR: totalClicks > 0 ? (totalOrders / totalClicks) * 100 : 0,
  };
}

// --- Indonesian Decimal Formatter ---
export function fmtDec(n: number, decimals: number = 2): string {
  return n.toLocaleString("id-ID", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

// --- Format Rupiah ---
export function formatRupiah(n: number): string {
  if (n === 0) return "Rp 0";
  const abs = Math.abs(n);
  const formatted = abs.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return (n < 0 ? "-Rp " : "Rp ") + formatted;
}

export function formatRupiahShort(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000_000) return sign + "Rp " + fmtDec(abs / 1_000_000_000, 1) + "M";
  if (abs >= 1_000_000) return sign + "Rp " + fmtDec(abs / 1_000_000, 1) + "Jt";
  if (abs >= 1_000) return sign + "Rp " + fmtDec(abs / 1_000, 1) + "Rb";
  return formatRupiah(n);
}

export function formatNum(n: number): string {
  return n.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function formatPct(n: number): string {
  return fmtDec(n, 2) + "%";
}

// --- Benchmark Comparison ---
export function compareBenchmark(data: TikTokRow[]): BenchmarkItem[] {
  const kpi = calculateKPIs(data);
  const videoRows = data.filter(r => r.creativeType.toLowerCase().includes("video"));
  const videoRevenue = videoRows.reduce((s, r) => s + r.grossRevenue, 0);
  const pctVideoRevenue = kpi.totalGrossRevenue > 0 ? (videoRevenue / kpi.totalGrossRevenue) * 100 : 0;

  return [
    {
      metrik: "ROI",
      sellerBiasa: "2-4x",
      sellerTop: "≥ 8x",
      dataKamu: fmtDec(kpi.overallROI, 2) + "x",
      dataKamuNum: kpi.overallROI,
      targetNum: 8,
      isGood: kpi.overallROI >= 8,
    },
    {
      metrik: "CTR (Click-Through Rate)",
      sellerBiasa: "1-3%",
      sellerTop: "≥ 5%",
      dataKamu: fmtDec(kpi.overallCTR, 2) + "%",
      dataKamuNum: kpi.overallCTR,
      targetNum: 5,
      isGood: kpi.overallCTR >= 5,
    },
    {
      metrik: "CVR (Conversion Rate)",
      sellerBiasa: "3-8%",
      sellerTop: "≥ 15%",
      dataKamu: fmtDec(kpi.avgCVR, 2) + "%",
      dataKamuNum: kpi.avgCVR,
      targetNum: 15,
      isGood: kpi.avgCVR >= 15,
    },
    {
      metrik: "Cost per Order",
      sellerBiasa: "Rp 30.000-50.000",
      sellerTop: "≤ Rp 20.000",
      dataKamu: formatRupiah(kpi.avgCostPerOrder),
      dataKamuNum: kpi.avgCostPerOrder,
      targetNum: 20000,
      isGood: kpi.avgCostPerOrder <= 20000 && kpi.avgCostPerOrder > 0,
    },
    {
      metrik: "2-Second View Rate",
      sellerBiasa: "15-25%",
      sellerTop: "≥ 30%",
      dataKamu: (() => {
        const avg = data.length > 0 ? data.reduce((s, r) => s + r.viewRate2s, 0) / data.length : 0;
        return fmtDec(avg, 2) + "%";
      })(),
      dataKamuNum: data.length > 0 ? data.reduce((s, r) => s + r.viewRate2s, 0) / data.length : 0,
      targetNum: 30,
      isGood: (data.length > 0 ? data.reduce((s, r) => s + r.viewRate2s, 0) / data.length : 0) >= 30,
    },
    {
      metrik: "Revenue per Bulan",
      sellerBiasa: "Rp 10-50 Jt",
      sellerTop: "≥ Rp 200 Jt",
      dataKamu: formatRupiah(kpi.totalGrossRevenue),
      dataKamuNum: kpi.totalGrossRevenue,
      targetNum: 200000000,
      isGood: kpi.totalGrossRevenue >= 200000000,
    },
    {
      metrik: "% Revenue dari Video",
      sellerBiasa: "20-40%",
      sellerTop: "≥ 50%",
      dataKamu: fmtDec(pctVideoRevenue, 1) + "%",
      dataKamuNum: pctVideoRevenue,
      targetNum: 50,
      isGood: pctVideoRevenue >= 50,
    },
  ];
}

// --- Revenue by Creative Type ---
export function revenueByCreativeType(data: TikTokRow[]): { name: string; revenue: number; cost: number }[] {
  const map = new Map<string, { revenue: number; cost: number }>();
  data.forEach(r => {
    const type = r.creativeType || "Unknown";
    const existing = map.get(type) || { revenue: 0, cost: 0 };
    existing.revenue += r.grossRevenue;
    existing.cost += r.cost;
    map.set(type, existing);
  });
  return Array.from(map.entries()).map(([name, v]) => ({ name, ...v }));
}

// --- Top 10 SKU by Revenue ---
export function top10SKUByRevenue(data: TikTokRow[]): { name: string; revenue: number }[] {
  const map = new Map<string, number>();
  data.forEach(r => {
    const key = r.productId || r.campaignName || "Unknown";
    map.set(key, (map.get(key) || 0) + r.grossRevenue);
  });
  return Array.from(map.entries())
    .map(([name, revenue]) => ({ name: name.length > 20 ? name.slice(0, 20) + "..." : name, revenue }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);
}

// ============================
// Business Overview Functions
// ============================

function parseNum(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  const s = String(v).replace(/[^\d.,-]/g, "").replace(/\./g, "").replace(",", ".");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function parsePct(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "number") return v * (v < 1 ? 100 : 1);
  const s = String(v).replace("%", "").replace(",", ".").trim();
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function rowToSummary(row: unknown[]): BusinessOverviewSummary {
  return {
    gmv: parseNum(row[0]),
    refund: parseNum(row[1]),
    grossRevenueWithSubsidy: parseNum(row[2]),
    productsSold: parseNum(row[3]),
    uniqueBuyers: parseNum(row[4]),
    pageViews: parseNum(row[5]),
    shopVisits: parseNum(row[6]),
    skuOrders: parseNum(row[7]),
    orders: parseNum(row[8]),
    conversionRate: parsePct(row[9]),
  };
}

function rowToDailyWithDate(row: unknown[]): DailyBusinessData {
  const dateRaw = row[0];
  let dateStr = "";
  if (dateRaw instanceof Date) {
    dateStr = dateRaw.toISOString().slice(0, 10);
  } else if (typeof dateRaw === "number") {
    const d = new Date(Math.round((dateRaw - 25569) * 86400 * 1000));
    dateStr = d.toISOString().slice(0, 10);
  } else {
    dateStr = String(dateRaw || "").trim();
  }
  return {
    date: dateStr,
    gmv: parseNum(row[1]),
    refund: parseNum(row[2]),
    grossRevenueWithSubsidy: parseNum(row[3]),
    productsSold: parseNum(row[4]),
    uniqueBuyers: parseNum(row[5]),
    pageViews: parseNum(row[6]),
    shopVisits: parseNum(row[7]),
    skuOrders: parseNum(row[8]),
    orders: parseNum(row[9]),
    conversionRate: parsePct(row[10]),
  };
}

const BULAN_ID = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

function formatMonthLabel(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return BULAN_ID[d.getMonth()] + " " + d.getFullYear();
}

// ─── DETEKSI & PARSER FORMAT BARU "Shop Analytics_Key metrics" ──────
// Format baru TikTok Shop (2026): row "Ringkasan data" → header ("", GMV, Pesanan,
// Pembeli, Produk terjual, Produk yang dikembalikan..., Pesanan SKU, Pendapatan bruto,
// Tayangan halaman, Pengunjung, Persentase konversi, ...) → "Total nilai" →
// blok "Data harian" dengan header "Tanggal" dan tanggal format DD/MM/YYYY.
function isNewShopAnalyticsFormat(rawData: unknown[][]): boolean {
  for (let i = 0; i < Math.min(rawData.length, 6); i++) {
    const c0 = String(rawData[i]?.[0] ?? '').trim().toLowerCase();
    if (c0 === 'ringkasan data') return true;
    const joined = (rawData[i] || []).map((c: unknown) => String(c ?? '')).join('§').toLowerCase();
    if (joined.includes('tayangan halaman') && joined.includes('pendapatan bruto')) return true;
  }
  return false;
}

function parseShopAnalyticsFormat(rawData: unknown[][]): BusinessOverviewData {
  const toNum = (v: unknown): number => {
    if (typeof v === 'number') return isFinite(v) ? v : 0;
    const s = String(v ?? '').trim();
    if (!s || s === '-') return 0;
    const n = parseFloat(s.replace(/[^\d.\-]/g, ''));
    return isNaN(n) ? 0 : n;
  };
  const toIso = (v: unknown): string => {
    if (v instanceof Date && !isNaN(v.getTime())) {
      const y = v.getFullYear();
      const mo = String(v.getMonth() + 1).padStart(2, '0');
      const d = String(v.getDate()).padStart(2, '0');
      return `${y}-${mo}-${d}`;
    }
    const s = String(v ?? '').trim();
    const dmy = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
    const ymd = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (ymd) return `${ymd[1]}-${ymd[2]}-${ymd[3]}`;
    return '';
  };
  const pctVal = (v: unknown): number => {
    const n = toNum(v);
    // Nilai rasio (mis. 0.0401) → persen
    return Math.abs(n) <= 1 ? n * 100 : n;
  };

  const buildColMap = (headerRow: unknown[]) => {
    const lower = (headerRow || []).map((h: unknown) => String(h ?? '').trim().toLowerCase());
    const exact = (name: string) => lower.findIndex((h) => h === name);
    const contains = (name: string) => lower.findIndex((h) => h.includes(name));
    return {
      gmv: exact('gmv'),
      orders: exact('pesanan'),
      buyers: exact('pembeli'),
      productsSold: contains('produk terjual'),
      refund: contains('dikembalikan'),
      skuOrders: contains('pesanan sku'),
      grossRevenue: contains('pendapatan bruto'),
      pageViews: contains('tayangan halaman'),
      shopVisits: exact('pengunjung'),
      conversion: contains('persentase konversi'),
    };
  };
  const pick = (row: unknown[], idx: number): number => (idx >= 0 ? toNum(row[idx]) : 0);

  // Header ringkasan: kolom 0 kosong, kolom 1 === "GMV"
  const summaryHeaderIdx = rawData.findIndex((r) => {
    return String(r?.[0] ?? '').trim() === '' && String(r?.[1] ?? '').trim() === 'GMV';
  });
  // Header harian: kolom 0 === "Tanggal"
  const dailyHeaderIdx = rawData.findIndex((r) => String(r?.[0] ?? '').trim() === 'Tanggal');

  let summary: BusinessOverviewSummary = {
    gmv: 0, refund: 0, grossRevenueWithSubsidy: 0, productsSold: 0, uniqueBuyers: 0,
    pageViews: 0, shopVisits: 0, skuOrders: 0, orders: 0, conversionRate: 0,
  };
  if (summaryHeaderIdx >= 0) {
    const cols = buildColMap(rawData[summaryHeaderIdx]);
    // Baris nilai: baris pertama setelah header yang kolom 0-nya "Total nilai"
    const valueRow = rawData
      .slice(summaryHeaderIdx + 1, summaryHeaderIdx + 4)
      .find((r) => String(r?.[0] ?? '').trim().toLowerCase().startsWith('total nilai'));
    if (valueRow) {
      summary = {
        gmv: pick(valueRow, cols.gmv),
        refund: pick(valueRow, cols.refund),
        grossRevenueWithSubsidy: pick(valueRow, cols.grossRevenue),
        productsSold: pick(valueRow, cols.productsSold),
        uniqueBuyers: pick(valueRow, cols.buyers),
        pageViews: pick(valueRow, cols.pageViews),
        shopVisits: pick(valueRow, cols.shopVisits),
        skuOrders: pick(valueRow, cols.skuOrders),
        orders: pick(valueRow, cols.orders),
        conversionRate: cols.conversion >= 0 ? pctVal(valueRow[cols.conversion]) : 0,
      };
    }
  }

  const daily: DailyBusinessData[] = [];
  if (dailyHeaderIdx >= 0) {
    const cols = buildColMap(rawData[dailyHeaderIdx]);
    for (let i = dailyHeaderIdx + 1; i < rawData.length; i++) {
      const row = rawData[i] || [];
      const date = toIso(row[0]);
      if (!date) continue;
      daily.push({
        date,
        gmv: pick(row, cols.gmv),
        refund: pick(row, cols.refund),
        grossRevenueWithSubsidy: pick(row, cols.grossRevenue),
        productsSold: pick(row, cols.productsSold),
        uniqueBuyers: pick(row, cols.buyers),
        pageViews: pick(row, cols.pageViews),
        shopVisits: pick(row, cols.shopVisits),
        skuOrders: pick(row, cols.skuOrders),
        orders: pick(row, cols.orders),
        conversionRate: cols.conversion >= 0 ? pctVal(row[cols.conversion]) : 0,
      });
    }
    daily.sort((a, b) => a.date.localeCompare(b.date));
  }

  // Jika ringkasan kosong tapi ada data harian, hitung dari harian
  if (summary.gmv === 0 && daily.length > 0) {
    const sum = (k: keyof DailyBusinessData) => daily.reduce((a, d) => a + (Number(d[k]) || 0), 0);
    summary = {
      gmv: sum('gmv'), refund: sum('refund'), grossRevenueWithSubsidy: sum('grossRevenueWithSubsidy'),
      productsSold: sum('productsSold'), uniqueBuyers: sum('uniqueBuyers'), pageViews: sum('pageViews'),
      shopVisits: sum('shopVisits'), skuOrders: sum('skuOrders'), orders: sum('orders'),
      conversionRate: daily.reduce((a, d) => a + d.conversionRate, 0) / daily.length,
    };
  }

  return {
    summary,
    daily,
    period: {
      start: daily[0]?.date ?? '',
      end: daily[daily.length - 1]?.date ?? '',
      month: formatMonthLabel(daily[0]?.date ?? ''),
    },
  };
}

// Pecah hasil parse multi-bulan menjadi satu BusinessOverviewData per bulan.
// Berguna untuk export Shop Analytics yang rentangnya melebihi 1 bulan.
export function splitOverviewByMonth(parsed: BusinessOverviewData): BusinessOverviewData[] {
  const groups = new Map<string, DailyBusinessData[]>();
  for (const d of parsed.daily) {
    const key = d.date.substring(0, 7); // YYYY-MM
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(d);
  }
  if (groups.size <= 1) return [parsed];

  return [...groups.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, days]) => {
      const sum = (k: keyof DailyBusinessData) => days.reduce((a, d) => a + (Number(d[k]) || 0), 0);
      const nonZeroConv = days.filter((d) => d.conversionRate > 0);
      const summary: BusinessOverviewSummary = {
        gmv: sum('gmv'),
        refund: sum('refund'),
        grossRevenueWithSubsidy: sum('grossRevenueWithSubsidy'),
        productsSold: sum('productsSold'),
        uniqueBuyers: sum('uniqueBuyers'),
        pageViews: sum('pageViews'),
        shopVisits: sum('shopVisits'),
        skuOrders: sum('skuOrders'),
        orders: sum('orders'),
        conversionRate: nonZeroConv.length > 0
          ? nonZeroConv.reduce((a, d) => a + d.conversionRate, 0) / nonZeroConv.length
          : 0,
      };
      return {
        summary,
        daily: days,
        period: {
          start: days[0].date,
          end: days[days.length - 1].date,
          month: formatMonthLabel(days[0].date),
        },
      };
    });
}

export function parseBusinessOverview(rawData: any[][]): BusinessOverviewData {
  // Format baru "Shop Analytics_Key metrics" terdeteksi otomatis
  if (isNewShopAnalyticsFormat(rawData)) {
    return parseShopAnalyticsFormat(rawData);
  }

  const parsePercent = (val: any): number => {
    if (typeof val === 'string') return parseFloat(val.replace('%', '').trim());
    if (typeof val === 'number') return val;
    return 0;
  };

  // Ringkasan: header di baris 0, nilai di baris 1
  const summaryRow = rawData[1];
  const summary: BusinessOverviewSummary = {
    gmv:                      Number(summaryRow[1]) || 0,
    refund:                   Number(summaryRow[2]) || 0,
    grossRevenueWithSubsidy:  Number(summaryRow[3]) || 0,
    productsSold:             Number(summaryRow[4]) || 0,
    uniqueBuyers:             Number(summaryRow[5]) || 0,
    pageViews:                Number(summaryRow[6]) || 0,
    shopVisits:               Number(summaryRow[7]) || 0,
    skuOrders:                Number(summaryRow[8]) || 0,
    orders:                   Number(summaryRow[9]) || 0,
    conversionRate:           parsePercent(summaryRow[10]),
  };

  // Data harian: mulai dari baris index 5, header di baris 4
  const dailyRows = rawData.slice(5).filter(
    (row: any) => row[0] !== undefined && row[0] !== null && row[0] !== ''
  );

  const daily: DailyBusinessData[] = dailyRows.map((row: any) => ({
    date:                     String(row[0]).substring(0, 10),
    gmv:                      Number(row[1]) || 0,
    refund:                   Number(row[2]) || 0,
    grossRevenueWithSubsidy:  Number(row[3]) || 0,
    productsSold:             Number(row[4]) || 0,
    uniqueBuyers:             Number(row[5]) || 0,
    pageViews:                Number(row[6]) || 0,
    shopVisits:               Number(row[7]) || 0,
    skuOrders:                Number(row[8]) || 0,
    orders:                   Number(row[9]) || 0,
    conversionRate:           parsePercent(row[10]),
  }));

  return {
    summary,
    daily,
    period: {
      start: daily[0]?.date ?? '',
      end:   daily[daily.length - 1]?.date ?? '',
      month: formatMonthLabel(daily[0]?.date ?? ''),
    },
  };
}

export function getWeeklyBreakdown(daily: DailyBusinessData[]): WeeklyData[] {
  const weeks: WeeklyData[] = [];
  const sorted = [...daily].sort((a, b) => a.date.localeCompare(b.date));
  const chunkSize = 7;

  for (let w = 0; w < 4; w++) {
    const start = w * chunkSize;
    const chunk = sorted.slice(start, start + chunkSize);
    if (chunk.length === 0) break;

    const totalGMV = chunk.reduce((s, d) => s + d.gmv, 0);
    const totalOrders = chunk.reduce((s, d) => s + d.orders, 0);
    const avgConversion = chunk.reduce((s, d) => s + d.conversionRate, 0) / chunk.length;
    const avgPageViews = chunk.reduce((s, d) => s + d.pageViews, 0) / chunk.length;

    const prevGMV = w > 0 ? weeks[w - 1]?.totalGMV : null;
    const growthGMV = prevGMV != null && prevGMV > 0 ? ((totalGMV - prevGMV) / prevGMV) * 100 : null;

    weeks.push({
      week: w + 1,
      label: `Minggu ${w + 1}`,
      totalGMV,
      totalOrders,
      avgConversion,
      avgPageViews,
      growthGMV,
    });
  }
  return weeks;
}

export function getBusinessInsights(data: BusinessOverviewData): BusinessInsight[] {
  const { summary, daily } = data;
  const insights: BusinessInsight[] = [];

  if (daily.length === 0) return insights;

  const bestDay = daily.reduce((a, b) => (b.gmv > a.gmv ? b : a), daily[0]);
  const worstDay = daily.reduce((a, b) => (b.gmv < a.gmv ? b : a), daily[0]);
  const avgGMV = daily.reduce((s, d) => s + d.gmv, 0) / daily.length;
  const avgOrders = daily.reduce((s, d) => s + d.orders, 0) / daily.length;
  const refundPct = summary.gmv > 0 ? (summary.refund / summary.gmv) * 100 : 0;

  function fmtDate(ds: string) {
    const d = new Date(ds);
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  }

  insights.push({
    type: "best_day", label: "Hari Terbaik (GMV Tertinggi)",
    value: `${fmtDate(bestDay.date)} — ${formatRupiah(bestDay.gmv)}`,
    trend: "up", color: "bg-green-50 text-green-700", icon: "📅",
  });
  insights.push({
    type: "worst_day", label: "Hari Terlemah (GMV Terendah)",
    value: `${fmtDate(worstDay.date)} — ${formatRupiah(worstDay.gmv)}`,
    trend: "down", color: "bg-red-50 text-red-700", icon: "📅",
  });
  insights.push({
    type: "avg_gmv", label: "Rata-rata GMV Harian",
    value: formatRupiah(avgGMV),
    trend: "neutral", color: "bg-blue-50 text-blue-700", icon: "📈",
  });
  insights.push({
    type: "avg_orders", label: "Rata-rata Pesanan per Hari",
    value: fmtDec(avgOrders, 1),
    trend: "neutral", color: "bg-purple-50 text-purple-700", icon: "📦",
  });
  insights.push({
    type: "refund", label: "Total Refund & % dari GMV",
    value: `${formatRupiah(summary.refund)} (${fmtDec(refundPct, 1)}%)`,
    trend: refundPct > 5 ? "down" : "neutral", color: "bg-orange-50 text-orange-700", icon: "🔄",
  });

  // Tren minggu 4 vs minggu 1
  const weeks = getWeeklyBreakdown(daily);
  if (weeks.length >= 2) {
    const first = weeks[0].totalGMV;
    const last = weeks[weeks.length - 1].totalGMV;
    const tren = last >= first ? "up" : "down";
    const pctChange = first > 0 ? ((last - first) / first) * 100 : 0;
    insights.push({
      type: "trend", label: `Tren GMV Minggu ${weeks.length} vs Minggu 1`,
      value: `${tren === "up" ? "↑ Naik" : "↓ Turun"} ${fmtDec(Math.abs(pctChange), 1)}%`,
      trend: tren, color: tren === "up" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700", icon: "📊",
    });
  }

  // Hari terbaik dalam seminggu
  const dayMap = new Map<number, { total: number; count: number }>();
  daily.forEach(d => {
    const dow = new Date(d.date).getDay();
    const existing = dayMap.get(dow) || { total: 0, count: 0 };
    existing.total += d.gmv;
    existing.count += 1;
    dayMap.set(dow, existing);
  });
  const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  let bestDOW = 0;
  let bestDOWAvg = 0;
  dayMap.forEach((v, k) => {
    const avg = v.total / v.count;
    if (avg > bestDOWAvg) { bestDOWAvg = avg; bestDOW = k; }
  });
  insights.push({
    type: "best_dow", label: "Hari Terbaik dalam Seminggu",
    value: `${HARI[bestDOW]} — Avg ${formatRupiah(bestDOWAvg)}`,
    trend: "up", color: "bg-yellow-50 text-yellow-700", icon: "🏆",
  });

  return insights;
}

// ============================
// Multi-Month Analytics Functions
// ============================

export function compareMonths(months: BusinessOverviewData[]): MonthComparison[] {
  if (months.length === 0) return [];
  const sorted = [...months].sort((a, b) => a.period.start.localeCompare(b.period.start));

  function row(metrik: string, extract: (m: BusinessOverviewData) => number, fmt: (n: number) => string, invert = false): MonthComparison {
    const values = sorted.map(m => ({ month: m.period.month, value: extract(m), formatted: fmt(extract(m)) }));
    let trendPct: number | null = null;
    let trendDir: "up" | "down" | "same" = "same";
    if (values.length >= 2) {
      const prev = values[values.length - 2].value;
      const curr = values[values.length - 1].value;
      trendPct = prev > 0 ? ((curr - prev) / prev) * 100 : null;
      trendDir = curr > prev ? "up" : curr < prev ? "down" : "same";
    }
    return { metrik, values, trendPct, trendDir, invertTrend: invert };
  }

  return [
    row("GMV (Rp)", m => m.summary.gmv, n => formatRupiahShort(n)),
    row("Total Pesanan", m => m.summary.orders, n => formatNum(n)),
    row("Pembeli Unik", m => m.summary.uniqueBuyers, n => formatNum(n)),
    row("Avg GMV/Hari", m => m.daily.length > 0 ? m.summary.gmv / m.daily.length : 0, n => formatRupiahShort(n)),
    row("Konversi (%)", m => m.summary.conversionRate, n => fmtDec(n, 1) + "%"),
    row("Tayangan", m => m.summary.pageViews, n => formatNum(n)),
    row("Kunjungan Toko", m => m.summary.shopVisits, n => formatNum(n)),
    row("Refund (Rp)", m => m.summary.refund, n => formatRupiahShort(n), true),
    row("Refund Rate (%)", m => m.summary.gmv > 0 ? (m.summary.refund / m.summary.gmv) * 100 : 0, n => fmtDec(n, 2) + "%", true),
  ];
}

export function groupByQuarter(months: BusinessOverviewData[]): QuarterData[] {
  const qMap = new Map<string, BusinessOverviewData[]>();
  months.forEach(m => {
    const d = new Date(m.period.start);
    const q = Math.floor(d.getMonth() / 3) + 1;
    const y = d.getFullYear();
    const key = `Q${q} ${y}`;
    const arr = qMap.get(key) || [];
    arr.push(m);
    qMap.set(key, arr);
  });

  const quarters: QuarterData[] = [];
  const sortedKeys = Array.from(qMap.keys()).sort();
  sortedKeys.forEach(key => {
    const ms = qMap.get(key)!;
    const totalGMV = ms.reduce((s, m) => s + m.summary.gmv, 0);
    const totalOrders = ms.reduce((s, m) => s + m.summary.orders, 0);
    const avgConversion = ms.reduce((s, m) => s + m.summary.conversionRate, 0) / ms.length;
    const totalBuyers = ms.reduce((s, m) => s + m.summary.uniqueBuyers, 0);
    const best = ms.reduce((a, b) => b.summary.gmv > a.summary.gmv ? b : a, ms[0]);
    const parts = key.split(" ");
    quarters.push({
      quarter: parts[0],
      label: key,
      year: parseInt(parts[1]),
      totalGMV, totalOrders, avgConversion, totalBuyers,
      bestMonth: best.period.month,
      bestMonthGMV: best.summary.gmv,
      growthVsPrev: null,
      months: ms,
    });
  });

  for (let i = 1; i < quarters.length; i++) {
    const prev = quarters[i - 1].totalGMV;
    if (prev > 0) quarters[i].growthVsPrev = ((quarters[i].totalGMV - prev) / prev) * 100;
  }
  return quarters;
}

const HARI_NAMES = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export function avgByDayOfWeek(months: BusinessOverviewData[]): DayOfWeekStats[] {
  const map = new Map<number, { totalGMV: number; totalOrders: number; count: number }>();
  for (let i = 0; i < 7; i++) map.set(i, { totalGMV: 0, totalOrders: 0, count: 0 });

  months.forEach(m => m.daily.forEach(d => {
    const dow = new Date(d.date).getDay();
    const e = map.get(dow)!;
    e.totalGMV += d.gmv;
    e.totalOrders += d.orders;
    e.count += 1;
  }));

  return Array.from(map.entries())
    .map(([dayIndex, v]) => ({
      day: HARI_NAMES[dayIndex],
      dayIndex,
      avgGMV: v.count > 0 ? v.totalGMV / v.count : 0,
      avgOrders: v.count > 0 ? v.totalOrders / v.count : 0,
      totalDays: v.count,
    }))
    .sort((a, b) => b.avgGMV - a.avgGMV);
}

export function detectAnomalies(months: BusinessOverviewData[]): AnomalyData[] {
  const anomalies: AnomalyData[] = [];
  months.forEach(m => {
    const dailyGMV = m.daily.map(d => d.gmv);
    if (dailyGMV.length === 0) return;
    const mean = dailyGMV.reduce((s, v) => s + v, 0) / dailyGMV.length;
    const std = Math.sqrt(dailyGMV.reduce((s, v) => s + (v - mean) ** 2, 0) / dailyGMV.length);
    if (std === 0) return;

    m.daily.forEach(d => {
      const dev = (d.gmv - mean) / std;
      let status: "spike" | "drop" | "normal" = "normal";
      if (dev > 2) status = "spike";
      else if (dev < -2) status = "drop";
      else return;

      const dt = new Date(d.date);
      const dow = dt.getDay();
      const day = dt.getDate();
      let cause = "";
      if (dow === 0 || dow === 6) cause = "Weekend traffic";
      if (day === 1 || day === 15 || day === 25) cause = "Tanggal gajian";
      if (day === 11 || day === 12) cause = "Harbolnas/double date";
      if (!cause) cause = status === "spike" ? "Kemungkinan promo/viral" : "Penurunan traffic";

      anomalies.push({ date: d.date, gmv: d.gmv, status, deviation: dev, possibleCause: cause, month: m.period.month });
    });
  });
  return anomalies.sort((a, b) => a.date.localeCompare(b.date));
}

export function forecastNextMonth(months: BusinessOverviewData[]): ForecastResult | null {
  if (months.length < 2) return null;
  const sorted = [...months].sort((a, b) => a.period.start.localeCompare(b.period.start));
  const n = sorted.length;
  const dataPoints = sorted.map((m, i) => ({ month: m.period.month, gmv: m.summary.gmv, index: i }));

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  dataPoints.forEach(p => { sumX += p.index; sumY += p.gmv; sumXY += p.index * p.gmv; sumX2 += p.index * p.index; });

  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return null;
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  const nextIdx = n;
  const nextMonthEstimate = Math.max(0, intercept + slope * nextIdx);

  const residuals = dataPoints.map(p => p.gmv - (intercept + slope * p.index));
  const rmse = Math.sqrt(residuals.reduce((s, r) => s + r * r, 0) / n);
  const confidence = rmse;

  const lastDate = new Date(sorted[n - 1].period.start);
  lastDate.setMonth(lastDate.getMonth() + 1);
  const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const nextMonthLabel = BULAN[lastDate.getMonth()] + " " + lastDate.getFullYear();

  const trendLine = [];
  for (let i = 0; i <= nextIdx; i++) trendLine.push({ index: i, value: Math.max(0, intercept + slope * i) });

  return { slope, intercept, nextMonthEstimate, confidence, nextMonthLabel, dataPoints, trendLine };
}

export function buildFunnel(summary: BusinessOverviewSummary): FunnelStep[] {
  const steps: FunnelStep[] = [];
  steps.push({ label: "Tayangan Halaman", value: summary.pageViews, dropRate: null, color: "#7B1FA2" });
  const drop1 = summary.pageViews > 0 ? ((summary.pageViews - summary.shopVisits) / summary.pageViews) * 100 : 0;
  steps.push({ label: "Kunjungan Toko", value: summary.shopVisits, dropRate: drop1, color: "#1565C0" });
  const drop2 = summary.shopVisits > 0 ? ((summary.shopVisits - summary.orders) / summary.shopVisits) * 100 : 0;
  steps.push({ label: "Pesanan", value: summary.orders, dropRate: drop2, color: "#2E7D32" });
  return steps;
}

// --- Video Performance Parser ---

export function parseVideoPerformance(rawData: any[][]): VideoPerformanceData {
  // STEP 1: Ambil periode HANYA dari rawData[0][0] — ini selalu benar
  const periodRawFull = String(rawData[0]?.[0] || "");
  const periodRaw = periodRawFull.replace("[Rentang Tanggal]:", "").trim();
  // periodRaw = "2026-03-01 ~ 2026-03-31"

  // STEP 2: Parse bulan dan tahun dari periodRaw, BUKAN dari kolom Waktu
  const startDateStr = periodRaw.split("~")[0].trim(); // "2026-03-01"
  const startDate = new Date(startDateStr);
  const period = isNaN(startDate.getTime())
    ? periodRaw
    : startDate.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  // period = "Maret 2026"

  const parsePercent = (val: any): number => {
    if (typeof val === "string") return parseFloat(val.replace("%", "").replace(",", ".").trim()) || 0;
    return typeof val === "number" ? val : 0;
  };

  // STEP 3: Ambil data video mulai baris index 3
  // Filter: kolom 0 (Nama Kreator) tidak kosong dan bukan header ulang
  const rows = rawData.slice(3).filter((r) => {
    const col0 = String(r[0] || "").trim();
    return col0 !== "" &&
           col0 !== "Nama Kreator" &&
           !col0.startsWith("[Rentang Tanggal]");
  });

  const videos: VideoPerformanceItem[] = rows.map((r) => {
    const vv = Number(r[6]) || 0;
    const gpm = Number(r[18]) || 0;
    const gmv = Number(r[19]) || 0;
    const ctr = parsePercent(r[20]);
    const watchRate = parsePercent(r[22]);
    const ctor = parsePercent(r[23]);
    const videoOrders = Number(r[15]) || 0;

    const gpmScore = Math.min((gpm / 500000) * 30, 30);
    const ctrScore = Math.min((ctr / 5) * 20, 20);
    const ctorScore = Math.min((ctor / 10) * 20, 20);
    const watchScore = Math.min((watchRate / 10) * 15, 15);
    const gmvScore = Math.min((gmv / 5000000) * 15, 15);
    const videoScore = Math.round(gpmScore + ctrScore + ctorScore + watchScore + gmvScore);

    let videoStatus: VideoPerformanceItem["videoStatus"] = "⬜ NO SALES";
    if (gmv === 0 && videoOrders === 0) videoStatus = "⬜ NO SALES";
    else if (gpm >= 200000 && ctr >= 3 && ctor >= 3) videoStatus = "🏆 TOP PERFORMER";
    else if (gpm >= 50000 || (ctr >= 2 && ctor >= 1)) videoStatus = "✅ POTENSIAL";
    else if (vv > 1000 && videoOrders === 0) videoStatus = "⚠️ PERLU PERBAIKAN";
    else if (videoOrders > 0 && gpm < 50000) videoStatus = "⚠️ PERLU PERBAIKAN";
    else videoStatus = "🔴 UNDERPERFORM";

    const boostCandidate = vv >= 5000 && gmv > 0 && gpm >= 50000;

    return {
      creatorName: String(r[0] || ""),
      creatorId: String(r[1] || ""),
      videoInfo: String(r[2] || ""),
      videoId: String(r[3] || ""),
      postedAt: String(r[4] || ""),
      products: String(r[5] || "").split(",").map((p: string) => p.trim()).filter(Boolean),
      vv,
      likes: Number(r[7]) || 0,
      comments: Number(r[8]) || 0,
      shares: Number(r[9]) || 0,
      newFollowers: Number(r[10]) || 0,
      clickToLive: Number(r[11]) || 0,
      productViews: Number(r[12]) || 0,
      productClicks: Number(r[13]) || 0,
      uniqueBuyers: Number(r[14]) || 0,
      videoOrders,
      productsSold: Number(r[16]) || 0,
      grossRevenue: Number(r[17]) || 0,
      gpm,
      gmv,
      ctr,
      liveRate: parsePercent(r[21]),
      watchRate,
      ctor,
      diagnosis: String(r[24] || ""),
      videoScore,
      videoStatus,
      boostCandidate,
    };
  });

  // STEP 4: Hitung summary dari data video
  const withSales = videos.filter((v) => v.gmv > 0);
  const creatorGMV = videos.reduce((acc, v) => {
    acc[v.creatorName] = (acc[v.creatorName] || 0) + v.gmv;
    return acc;
  }, {} as Record<string, number>);
  const topCreator = Object.entries(creatorGMV).sort((a, b) => b[1] - a[1])[0]?.[0] || "";

  const summary: VideoSummary = {
    totalVideos: videos.length,
    totalVV: videos.reduce((a, v) => a + v.vv, 0),
    totalGMV: videos.reduce((a, v) => a + v.gmv, 0),
    totalOrders: videos.reduce((a, v) => a + v.videoOrders, 0),
    totalProductViews: videos.reduce((a, v) => a + v.productViews, 0),
    totalProductClicks: videos.reduce((a, v) => a + v.productClicks, 0),
    totalUniqueBuyers: videos.reduce((a, v) => a + v.uniqueBuyers, 0),
    avgGPM: withSales.length
      ? withSales.reduce((a, v) => a + v.gpm, 0) / withSales.length : 0,
    avgCTR: videos.length
      ? videos.reduce((a, v) => a + v.ctr, 0) / videos.length : 0,
    avgCTOR: videos.length
      ? videos.reduce((a, v) => a + v.ctor, 0) / videos.length : 0,
    avgWatchRate: videos.length
      ? videos.reduce((a, v) => a + v.watchRate, 0) / videos.length : 0,
    topCreator,
    totalCreators: new Set(videos.map((v) => v.creatorName)).size,
  };

  // STEP 5: Return dengan period dari rawData[0][0], BUKAN dari kolom Waktu
  return { period, periodRaw, videos, summary };
}

// ═══════════════════════════════════════════════════════
// COMBINED STORE UTILITIES
// ═══════════════════════════════════════════════════════

export function combineOverviewData(
  dataA: BusinessOverviewData,
  dataB: BusinessOverviewData,
  storeAInfo: { id: string; name: string; color: string },
  storeBInfo: { id: string; name: string; color: string },
): CombinedStoreData {
  const s = dataA.summary;
  const t = dataB.summary;
  const totalOrders = s.orders + t.orders;
  const totalVisits = s.shopVisits + t.shopVisits;
  return {
    period: dataA.period.month,
    stores: [storeAInfo, storeBInfo],
    combinedGMV: s.gmv + t.gmv,
    combinedOrders: totalOrders,
    combinedUniqueBuyers: s.uniqueBuyers + t.uniqueBuyers,
    combinedPageViews: s.pageViews + t.pageViews,
    combinedShopVisits: totalVisits,
    combinedRefund: s.refund + t.refund,
    combinedConversionRate: totalVisits > 0 ? (totalOrders / totalVisits) * 100 : 0,
    combinedVideoGMV: 0,
    combinedVideoOrders: 0,
    combinedTotalVV: 0,
    combinedProductViews: 0,
    combinedProductClicks: 0,
    combinedAvgGPM: 0,
    combinedAvgCTR: 0,
    combinedAvgCTOR: 0,
    combinedAvgWatchRate: 0,
    combinedTotalVideos: 0,
  };
}

// ═══════════════════════════════════════
// AFFILIATE PARSING FUNCTIONS
// ═══════════════════════════════════════

export function parseAffRp(val: unknown): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val || val === '--' || val === '-') return 0;
  return parseFloat(String(val).replace(/Rp/gi, '').replace(/\./g, '').replace(/,/g, '.').replace(/\s/g, '').trim()) || 0;
}

export type AffiliateFileType = 'coreMetrics' | 'creatorListPerf' | 'coreStats' | 'creatorListAnalitik' | 'unknown';

export function detectAffiliateFileType(filename: string): AffiliateFileType {
  const name = filename.toLowerCase();
  // FILE A: Transaction_Analysis_Core_Metrics_*.xlsx
  if (name.includes('core_metrics') || (name.includes('transaction_analysis') && name.includes('core') && !name.includes('creator'))) {
    return 'coreMetrics';
  }
  // FILE B: Transaction_Analysis_Creator_List_*.xlsx
  if (name.includes('transaction_analysis') && name.includes('creator')) {
    return 'creatorListPerf';
  }
  // FILE C: Core_Stats_*.xlsx
  if (name.includes('core_stats')) {
    return 'coreStats';
  }
  // FILE D: Creator_List_*.xlsx (dari Analitik → Kreator, bukan Transaction)
  if (name.includes('creator_list') && !name.includes('transaction')) {
    return 'creatorListAnalitik';
  }
  return 'unknown';
}

export function parsePeriodFromFilename(filename: string): { period: string; periodRaw: string } {
  const match = filename.match(/(\d{8})-(\d{8})/);
  if (!match) return { period: 'Unknown', periodRaw: '' };
  const start = match[1];
  const end = match[2];
  const startDate = new Date(`${start.slice(0,4)}-${start.slice(4,6)}-${start.slice(6,8)}`);
  const endDate = new Date(`${end.slice(0,4)}-${end.slice(4,6)}-${end.slice(6,8)}`);
  const periodRaw = `${start.slice(0,4)}-${start.slice(4,6)}-${start.slice(6,8)} ~ ${end.slice(0,4)}-${end.slice(4,6)}-${end.slice(6,8)}`;
  const startMonth = startDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  const endMonth = endDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  const period = startMonth === endMonth ? startMonth : `${startDate.toLocaleDateString('id-ID', { month: 'short' })}–${endMonth}`;
  return { period, periodRaw };
}

export function parseTransactionCoreMetrics(rawData: unknown[][]): AffiliateCoreSummary {
  const headers = rawData[0] as string[];
  const values = rawData[1] || [];
  const get = (key: string) => {
    const idx = headers.findIndex((h) => String(h || '').toLowerCase().includes(key.toLowerCase()));
    return idx >= 0 ? parseAffRp(values[idx]) : 0;
  };
  return {
    gmvFromCreator: get('GMV dari kreator') || get('GMV from creator'),
    productsSoldViaAffiliate: get('Produk yang terjual melalui afiliasi') || get('Products sold'),
    refundAmount: get('Pengembalian dana') || get('Refund'),
    productsRefunded: get('Produk yang dikembalikan') || get('Products refunded'),
    avgDailyBuyers: get('Rata-rata pembeli harian') || get('Avg. daily buyers'),
    aov: get('AOV'),
    videoCount: get('Video'),
    liveStreamCount: get('Siaran LIVE') || get('LIVE stream'),
    avgDailyCreatorsWithSales: get('kreator dengan penjualan harian') || get('creators with daily sales'),
    avgDailyCreatorsPosting: get('kreator yang memosting') || get('creators posting'),
    avgDailyProductsSold: get('produk terjual harian') || get('products sold daily'),
    avgDailyProductsInCollab: get('produk dalam kolaborasi') || get('products in collab'),
    samplesSent: get('Sampel terkirim') || get('Samples sent'),
    avgDailyLiveWithSales: get('Siaran LIVE dengan penjualan') || get('LIVE with sales'),
    avgDailyVideoWithSales: get('video dengan penjualan harian') || get('video with daily sales'),
    estimatedCommission: get('Perkiraan komisi') || get('Est. commission'),
  };
}

export function parseCoreStats(rawData: unknown[][]): AffiliateCoreStats {
  const headers = rawData[0] as string[];
  const values = rawData[1] || [];
  const get = (key: string) => {
    const idx = headers.findIndex((h) => String(h || '').toLowerCase().includes(key.toLowerCase()));
    return idx >= 0 ? parseAffRp(values[idx]) : 0;
  };
  return {
    affiliateGMV: get('Affiliate GMV') || get('GMV'),
    affiliateLiveGMV: get('LIVE GMV'),
    affiliateShoppableVideoGMV: get('shoppable video GMV') || get('Video GMV'),
    affiliateProductCardGMV: get('product card GMV') || get('Product card'),
    itemsSold: get('Items sold') || get('Produk terjual'),
    estCommission: get('commission') || get('komisi'),
    estFlatFee: get('flat fee') || 0,
    affiliateCollaborations: get('collaborations') || get('kolaborasi'),
    affiliateLiveStreams: get('LIVE streams') || get('Siaran LIVE'),
    affiliateShoppableVideos: get('shoppable videos') || get('Video'),
    affiliateRefundedGMV: get('refunded GMV') || get('Pengembalian'),
    affiliateItemsRefunded: get('items refunded') || get('Produk dikembalikan'),
  };
}

function getAffCreatorTier(followers: number): AffiliateCreatorItem['creatorTier'] {
  if (followers === 0) return 'Unknown';
  if (followers < 1000) return 'Nano';
  if (followers < 10000) return 'Micro';
  if (followers < 100000) return 'Mid';
  if (followers < 1000000) return 'Macro';
  return 'Mega';
}

export function parseCreatorList(rawData: unknown[][]): AffiliateCreatorItem[] {
  const headers = (rawData[0] || []).map((h) => String(h || '').trim());
  const rows = rawData.slice(1).filter((r) => r[0] && String(r[0]).trim() !== '');

  const getCol = (row: unknown[], key: string): unknown => {
    const idx = headers.findIndex((h) => h.toLowerCase().includes(key.toLowerCase()));
    return idx >= 0 ? row[idx] : null;
  };
  const parsePct = (val: unknown): number => {
    if (!val) return 0;
    return parseFloat(String(val).replace('%', '').trim()) || 0;
  };

  return rows.map((row) => {
    const affiliateGMV = parseAffRp(getCol(row, 'Affiliate GMV') ?? getCol(row, 'GMV dari kreator') ?? getCol(row, 'GMV'));
    const affiliateRefundedGMV = parseAffRp(getCol(row, 'refunded GMV') ?? getCol(row, 'Pengembalian'));
    const estCommission = parseAffRp(getCol(row, 'commission') ?? getCol(row, 'komisi'));
    const videos = Number(getCol(row, 'shoppable video') ?? getCol(row, 'Video')) || 0;
    const followers = Number(getCol(row, 'follower')) || 0;
    const orders = Number(getCol(row, 'order') ?? getCol(row, 'Pesanan')) || 0;

    const refundRate = affiliateGMV > 0 ? (affiliateRefundedGMV / affiliateGMV * 100) : 0;
    const commissionRate = affiliateGMV > 0 ? (estCommission / affiliateGMV * 100) : 0;
    const gmvPerVideo = videos > 0 ? (affiliateGMV / videos) : 0;

    const gmvScore = Math.min(affiliateGMV / 10000000 * 40, 40);
    const videoScore = Math.min(videos / 30 * 20, 20);
    const orderScore = Math.min(orders / 50 * 20, 20);
    const refundPenalty = Math.min(refundRate * 2, 20);
    const creatorScore = Math.max(0, Math.round(gmvScore + videoScore + orderScore - refundPenalty));

    let creatorStatus: AffiliateCreatorItem['creatorStatus'] = '😴 TIDAK AKTIF';
    if (affiliateGMV >= 5000000) creatorStatus = '🏆 TOP';
    else if (affiliateGMV >= 500000) creatorStatus = '✅ AKTIF';
    else if (affiliateGMV > 0) creatorStatus = '⚠️ PERLU DORONG';

    return {
      creatorUsername: String(row[0] || '').trim(),
      affiliateGMV,
      affiliateLiveGMV: parseAffRp(getCol(row, 'LIVE GMV')),
      affiliateShoppableVideoGMV: parseAffRp(getCol(row, 'shoppable video GMV') ?? getCol(row, 'Video GMV')),
      affiliateProductCardGMV: parseAffRp(getCol(row, 'product card GMV') ?? getCol(row, 'Product card')),
      affiliateProductsSold: Number(getCol(row, 'products sold') ?? getCol(row, 'Produk terjual')) || 0,
      itemsSold: Number(getCol(row, 'Items sold') ?? getCol(row, 'Produk yang terjual')) || 0,
      estCommission,
      estFlatFee: parseAffRp(getCol(row, 'flat fee')),
      avgOrderValue: parseAffRp(getCol(row, 'order value') ?? getCol(row, 'AOV')),
      affiliateProductShowcase: Number(getCol(row, 'showcase')) || 0,
      affiliateOrders: orders,
      ctr: parsePct(getCol(row, 'CTR')),
      productImpressions: Number(getCol(row, 'impression')) || 0,
      avgAffiliateCustomers: Number(getCol(row, 'customer')) || 0,
      affiliateLiveStreams: Number(getCol(row, 'LIVE stream') ?? getCol(row, 'Siaran LIVE')) || 0,
      affiliateShoppableVideos: videos,
      targetCollabGMV: parseAffRp(getCol(row, 'Target collaboration GMV') ?? getCol(row, 'Target collab GMV')),
      targetCollabEstCommission: parseAffRp(getCol(row, 'Target collaboration est') ?? getCol(row, 'Target collab est')),
      openCollabGMV: parseAffRp(getCol(row, 'Open collaboration GMV') ?? getCol(row, 'Open collab GMV')),
      openCollabEstCommission: parseAffRp(getCol(row, 'Open collaboration est') ?? getCol(row, 'Open collab est')),
      affiliateRefundedGMV,
      affiliateItemsRefunded: Number(getCol(row, 'items refunded') ?? getCol(row, 'Produk dikembalikan')) || 0,
      affiliateFollowers: followers,
      creatorTier: getAffCreatorTier(followers),
      refundRate,
      commissionRate,
      gmvPerVideo,
      creatorScore,
      creatorStatus,
      sampelTerkirim: Number(getCol(row, 'sampel terkirim') ?? getCol(row, 'samples sent')) || 0,
    };
  });
}

export function parseAffiliateData(
  files: { name: string; rawData: unknown[][] }[]
): AffiliateMonthData {
  let coreSummary: AffiliateCoreSummary | undefined;
  let coreStats: AffiliateCoreStats | undefined;
  let creatorsPerf: AffiliateCreatorItem[] = [];
  let creatorsAnalitik: AffiliateCreatorItem[] = [];
  let period = 'Unknown';
  let periodRaw = '';

  files.forEach((file) => {
    const { period: p, periodRaw: pr } = parsePeriodFromFilename(file.name);
    if (p && p !== 'Unknown') { period = p; periodRaw = pr; }

    const type = detectAffiliateFileType(file.name);
    if (type === 'coreMetrics') {
      coreSummary = parseTransactionCoreMetrics(file.rawData);
    } else if (type === 'coreStats') {
      coreStats = parseCoreStats(file.rawData);
    } else if (type === 'creatorListPerf') {
      creatorsPerf = parseCreatorList(file.rawData);
    } else if (type === 'creatorListAnalitik') {
      creatorsAnalitik = parseCreatorList(file.rawData);
    }
  });

  // FILE D (Analitik, 24 cols) is more complete → prioritise it; fall back to FILE B
  const creators = creatorsAnalitik.length > 0 ? creatorsAnalitik
    : creatorsPerf.length > 0 ? creatorsPerf : [];

  const activeCreators = creators.filter((c) => c.affiliateGMV > 0);
  const totalGMV = creators.reduce((a, c) => a + c.affiliateGMV, 0);
  const totalRefunded = creators.reduce((a, c) => a + c.affiliateRefundedGMV, 0);
  const topCreator = [...activeCreators].sort((a, b) => b.affiliateGMV - a.affiliateGMV)[0];

  const summary: AffiliateMonthSummary = {
    totalCreators: creators.length,
    activeCreators: activeCreators.length,
    inactiveCreators: creators.length - activeCreators.length,
    activeRate: creators.length > 0 ? (activeCreators.length / creators.length * 100) : 0,
    totalGMV,
    totalOrders: creators.reduce((a, c) => a + c.affiliateOrders, 0),
    totalVideos: creators.reduce((a, c) => a + c.affiliateShoppableVideos, 0),
    totalLive: creators.reduce((a, c) => a + c.affiliateLiveStreams, 0),
    totalCommission: creators.reduce((a, c) => a + c.estCommission, 0),
    totalRefundedGMV: totalRefunded,
    refundRate: totalGMV > 0 ? (totalRefunded / totalGMV * 100) : 0,
    avgAOV: activeCreators.length > 0
      ? activeCreators.filter((c) => c.avgOrderValue > 0)
          .reduce((a, c) => a + c.avgOrderValue, 0) /
        (activeCreators.filter((c) => c.avgOrderValue > 0).length || 1) : 0,
    avgGMVPerCreator: activeCreators.length > 0 ? (totalGMV / activeCreators.length) : 0,
    topCreator: topCreator?.creatorUsername || '',
    topCreatorGMV: topCreator?.affiliateGMV || 0,
    nanoCount: activeCreators.filter((c) => c.creatorTier === 'Nano').length,
    microCount: activeCreators.filter((c) => c.creatorTier === 'Micro').length,
    midCount: activeCreators.filter((c) => c.creatorTier === 'Mid').length,
    macroCount: activeCreators.filter((c) => c.creatorTier === 'Macro').length,
    megaCount: activeCreators.filter((c) => c.creatorTier === 'Mega').length,
    videoGMV: coreStats?.affiliateShoppableVideoGMV ?? creators.reduce((a, c) => a + c.affiliateShoppableVideoGMV, 0),
    liveGMV: coreStats?.affiliateLiveGMV ?? creators.reduce((a, c) => a + c.affiliateLiveGMV, 0),
    productCardGMV: coreStats?.affiliateProductCardGMV ?? creators.reduce((a, c) => a + c.affiliateProductCardGMV, 0),
    activePromoters: creators.filter((c) => c.affiliateShoppableVideos > 0 || c.affiliateLiveStreams > 0).length,
    videoCreators: creators.filter((c) => c.affiliateShoppableVideos > 0).length,
    liveCreators: creators.filter((c) => c.affiliateLiveStreams > 0).length,
    bothVideoAndLive: creators.filter((c) => c.affiliateShoppableVideos > 0 && c.affiliateLiveStreams > 0).length,
  };

  return {
    period,
    periodRaw,
    storeId: '',
    source: coreSummary && coreStats ? 'combined' : coreStats ? 'analitik' : 'transaction',
    coreSummary,
    coreStats,
    creators,
    summary,
  };
}

export function combineVideoData(
  videoA: VideoPerformanceData,
  videoB: VideoPerformanceData,
): Partial<CombinedStoreData> {
  const allVideos = [...videoA.videos, ...videoB.videos];
  const withSales = allVideos.filter((v) => v.gmv > 0);
  return {
    combinedVideoGMV: videoA.summary.totalGMV + videoB.summary.totalGMV,
    combinedVideoOrders: videoA.summary.totalOrders + videoB.summary.totalOrders,
    combinedTotalVV: videoA.summary.totalVV + videoB.summary.totalVV,
    combinedProductViews: videoA.summary.totalProductViews + videoB.summary.totalProductViews,
    combinedProductClicks: videoA.summary.totalProductClicks + videoB.summary.totalProductClicks,
    combinedAvgGPM: withSales.length ? withSales.reduce((a, v) => a + v.gpm, 0) / withSales.length : 0,
    combinedAvgCTR: allVideos.length ? allVideos.reduce((a, v) => a + v.ctr, 0) / allVideos.length : 0,
    combinedAvgCTOR: allVideos.length ? allVideos.reduce((a, v) => a + v.ctor, 0) / allVideos.length : 0,
    combinedAvgWatchRate: allVideos.length ? allVideos.reduce((a, v) => a + v.watchRate, 0) / allVideos.length : 0,
    combinedTotalVideos: allVideos.length,
  };
}
