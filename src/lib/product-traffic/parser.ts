import * as XLSX from "xlsx";
import type {
  ProductTrafficDaily,
  ProductTrafficContentType,
  ProductCatalogEntry,
  VideoCoreStatDaily,
} from "@/lib/types";
import type { LiveCoreStat } from "@/hooks/useLiveAnalytics";

// ═══════════════════════════════════════════════════════════
// PARSER EXPORT TIKTOK SHOP — Analisis Trafik Produk & Channel Harian
//
// Auto-detect 5 jenis file:
//   1. PT_KEY_METRICS  — Product_Traffic_[total]_Key_Metrics_*.xlsx
//                        (sheet Summary + Trend, harian per produk × 5 jenis konten)
//   2. PT_LIST         — Product_Traffic_[total]_List_*.xlsx
//                        (agregat funnel per channel utk rentang analisis)
//   3. PRODUCT_LIST    — product_list_*.xlsx (katalog semua produk, breakdown channel)
//   4. VIDEO_DAILY     — Video Performance Core Stats_*.xlsx (harian channel video)
//   5. LIVE_DAILY      — Live Performance Core Stats_*.xlsx (harian channel LIVE)
// ═══════════════════════════════════════════════════════════

export type ProductTrafficFileType =
  | "PT_KEY_METRICS"
  | "PT_LIST"
  | "PRODUCT_LIST"
  | "VIDEO_DAILY"
  | "LIVE_DAILY"
  | "UNKNOWN";

export const FILE_TYPE_LABELS: Record<ProductTrafficFileType, string> = {
  PT_KEY_METRICS: "📦 Trafik Produk — Key Metrics Harian",
  PT_LIST: "📊 Trafik Produk — Rekap per Channel",
  PRODUCT_LIST: "🗂️ Katalog Produk (product_list)",
  VIDEO_DAILY: "📹 Video Performance Harian",
  LIVE_DAILY: "🔴 Live Performance Harian",
  UNKNOWN: "❓ Format tidak dikenali",
};

export interface PtListChannelRow {
  channel: string;
  gmv: number;
  orders: number;
  sku_orders: number;
  products_sold: number;
  buyers: number;
  aov: number;
  impressions: number;
  clicks: number;
  ctr: number;
  atc: number;
  atc_rate: number;
  ctor: number;
}

export type ParsedProductTrafficFile =
  | {
      type: "PT_KEY_METRICS";
      productId: string;
      productName: string;
      periodStart: string;
      periodEnd: string;
      rows: ProductTrafficDaily[];
    }
  | { type: "PT_LIST"; periodStart: string; periodEnd: string; channels: PtListChannelRow[] }
  | { type: "PRODUCT_LIST"; periodStart: string; periodEnd: string; items: ProductCatalogEntry[] }
  | { type: "VIDEO_DAILY"; rows: VideoCoreStatDaily[] }
  | { type: "LIVE_DAILY"; rows: Omit<LiveCoreStat, "id">[] }
  | { type: "UNKNOWN"; reason: string };

// ─── HELPER: ANGKA FORMAT INDONESIA ─────────────────────────
// Menerima: 3574417 | "3574417" | "Rp3.574.417" | "Rp 3.574.417" | "1.234,56" | "-"
export function parseIdNumber(v: unknown): number {
  if (typeof v === "number") return isFinite(v) ? v : 0;
  if (v == null) return 0;
  let s = String(v).trim();
  if (!s || s === "-" || s === "—") return 0;
  s = s.replace(/rp/i, "").replace(/%/g, "").replace(/\s/g, "");
  if (/,\d+$/.test(s)) {
    // Format ID: titik ribuan, koma desimal → "1.234,56"
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (/^\-?\d{1,3}(\.\d{3})+$/.test(s)) {
    // Titik murni sebagai pemisah ribuan → "3.574.417"
    s = s.replace(/\./g, "");
  } else {
    s = s.replace(/,/g, "");
  }
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

// Persentase: "3.23%" → 3.23 ; 0.0323 (rasio) → 3.23 ; 3.23 → 3.23
export function parsePct(v: unknown): number {
  if (v == null) return 0;
  const hasPctSign = typeof v === "string" && v.includes("%");
  const n = parseIdNumber(v);
  if (hasPctSign) return n;
  // Nilai rasio (≤1) dianggap fraksi → konversi ke persen
  return Math.abs(n) <= 1 ? n * 100 : n;
}

// ─── HELPER: TANGGAL ────────────────────────────────────────
// Menerima: "01/04/2026" (DD/MM/YYYY) | "2026-04-01" | Date | serial Excel
export function toIsoDate(v: unknown): string | null {
  if (v == null || v === "") return null;
  if (v instanceof Date && !isNaN(v.getTime())) {
    // Pakai komponen lokal (bukan toISOString) agar tanggal tidak bergeser -1 hari
    const y = v.getFullYear();
    const mo = String(v.getMonth() + 1).padStart(2, "0");
    const d = String(v.getDate()).padStart(2, "0");
    return `${y}-${mo}-${d}`;
  }
  if (typeof v === "number" && v > 20000 && v < 80000) {
    // Serial date Excel (epoch 1900)
    const d = new Date(Math.round((v - 25569) * 86400 * 1000));
    return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }
  const s = String(v).trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return null;
}

// "01/04/2026-22/07/2026" → { start, end }
function parsePeriodRange(s: string): { start: string; end: string } {
  const parts = String(s).match(/(\d{2}\/\d{2}\/\d{4})\s*-\s*(\d{2}\/\d{2}\/\d{4})/);
  if (parts) {
    return { start: toIsoDate(parts[1]) || "", end: toIsoDate(parts[2]) || "" };
  }
  const single = String(s).match(/(\d{2}\/\d{2}\/\d{4})/);
  const iso = single ? toIsoDate(single[1]) || "" : "";
  return { start: iso, end: iso };
}

// ─── HELPER: MAPPING HEADER → METRIK ────────────────────────
type MetricKey =
  | "gmv" | "orders" | "sku_orders" | "products_sold" | "buyers" | "aov"
  | "impressions" | "clicks" | "ctr" | "atc" | "atc_rate" | "ctor"
  | "impressions_unique" | "clicks_unique" | "ctr_unique";

const PCT_KEYS: MetricKey[] = ["ctr", "atc_rate", "ctor", "ctr_unique"];

// Urutan penting: pola paling spesifik dicek lebih dulu.
function metricKeyFromHeader(header: string): MetricKey | null {
  const h = header.trim().toLowerCase();
  if (!h) return null;
  if (h.startsWith("impresi produk unik")) return "impressions_unique";
  if (h.startsWith("impresi produk")) return "impressions";
  if (h.startsWith("klik unik")) return "clicks_unique";
  if (h.startsWith("klik produk")) return "clicks";
  if (h.startsWith("ctr unik")) return "ctr_unique";
  if (h === "ctr") return "ctr";
  if (h.startsWith("ctor")) return "ctor";
  if (h.startsWith("jumlah tambahkan ke keranjang")) return "atc";
  if (h.startsWith("persentase tambahkan ke keranjang")) return "atc_rate";
  if (h.startsWith("aov")) return "aov";
  if (h.startsWith("est. pembeli") || h === "pembeli") return "buyers";
  if (h.startsWith("produk terjual")) return "products_sold";
  if (h.startsWith("pesanan sku")) return "sku_orders";
  if (h === "pesanan") return "orders";
  if (h === "gmv") return "gmv";
  return null;
}

const CONTENT_TYPE_MAP: Record<string, ProductTrafficContentType> = {
  semua: "all",
  "live penjual": "live_penjual",
  "video penjual": "video_penjual",
  "kartu produk penjual": "kartu_produk",
  afiliasi: "afiliasi",
};

export const CONTENT_TYPE_LABELS: Record<ProductTrafficContentType, string> = {
  all: "Semua",
  live_penjual: "LIVE Penjual",
  video_penjual: "Video Penjual",
  kartu_produk: "Kartu Produk",
  afiliasi: "Afiliasi",
};

function sheetRows(wb: XLSX.WorkBook, sheetName: string): unknown[][] {
  const ws = wb.Sheets[sheetName];
  if (!ws) return [];
  return XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" });
}

function rowText(row: unknown[]): string {
  return (row || []).map((c) => String(c ?? "")).join("§").toLowerCase();
}

// ─── DETEKSI JENIS FILE ─────────────────────────────────────
export function detectProductTrafficFile(wb: XLSX.WorkBook): ProductTrafficFileType {
  const names = wb.SheetNames;

  // 1. PT_KEY_METRICS: punya sheet Summary + Trend, A1 "Content type: ..."
  if (names.includes("Summary") && names.includes("Trend")) {
    const r0 = rowText(sheetRows(wb, "Summary")[0] || []);
    if (r0.includes("content type")) return "PT_KEY_METRICS";
  }

  const first = sheetRows(wb, names[0]);
  const scan = first.slice(0, 10);

  // 2. VIDEO_DAILY / LIVE_DAILY: header "Waktu" + kolom khas
  for (const row of scan) {
    const t = rowText(row);
    if (t.startsWith("waktu§") || t.includes("§waktu§") || (row[0] === "Waktu")) {
      if (t.includes("gmv dari video")) return "VIDEO_DAILY";
      if (t.includes("gmv dari live")) return "LIVE_DAILY";
    }
  }

  // 3. PRODUCT_LIST: header "Nama" + "ID Produk"
  for (const row of scan) {
    if (String(row[0]).trim() === "Nama" && String(row[1]).trim() === "ID Produk") {
      return "PRODUCT_LIST";
    }
  }

  // 4. PT_LIST: baris "Content type:" + header funnel dengan kolom GMV,
  //    body berisi nama channel (Afiliasi / LIVE penjual / dst.)
  const joinedTop = scan.map(rowText).join("¶");
  if (joinedTop.includes("content type") && joinedTop.includes("analysis date")) {
    for (const row of scan) {
      if (String(row[1]).trim() === "GMV" && String(row[0]).trim() === "") return "PT_LIST";
    }
  }

  return "UNKNOWN";
}

// ─── PARSER 1: PT KEY METRICS (Summary + Trend) ─────────────
export function parsePtKeyMetrics(
  wb: XLSX.WorkBook,
  storeId: string
): Extract<ParsedProductTrafficFile, { type: "PT_KEY_METRICS" }> {
  const summary = sheetRows(wb, "Summary");
  const trend = sheetRows(wb, "Trend");

  // Info produk dari Summary row 0: "Product name: X" / "Product ID: Y"
  let productName = "";
  let productId = "";
  for (const cell of (summary[0] || []).map((c) => String(c ?? ""))) {
    const mName = cell.match(/product name:\s*(.+)/i);
    if (mName) productName = mName[1].trim();
    const mId = cell.match(/product id:\s*(\d+)/i);
    if (mId) productId = mId[1].trim();
  }
  if (!productId) productId = "unknown";

  // Periode dari Summary row 1: "Analysis date: 01/04/2026-22/07/2026"
  let periodStart = "";
  let periodEnd = "";
  for (const cell of (summary[1] || []).map((c) => String(c ?? ""))) {
    if (/analysis date/i.test(cell)) {
      const p = parsePeriodRange(cell);
      periodStart = p.start;
      periodEnd = p.end;
    }
  }

  // Header Trend: baris dengan kolom 0 === "Tanggal"; grup konten di baris atasnya
  const headerIdx = trend.findIndex((r) => String(r?.[0]).trim() === "Tanggal");
  if (headerIdx < 1) {
    throw new Error("Sheet Trend tidak memiliki header 'Tanggal' — format tidak dikenali.");
  }
  const headers = (trend[headerIdx] || []).map((c) => String(c ?? ""));
  const groupsRaw = (trend[headerIdx - 1] || []).map((c) => String(c ?? "").trim());

  // Forward-fill grup konten (antisipasi merged cells)
  const groups: (ProductTrafficContentType | null)[] = [];
  let lastGroup: ProductTrafficContentType | null = null;
  for (let j = 0; j < headers.length; j++) {
    const g = CONTENT_TYPE_MAP[groupsRaw[j]?.toLowerCase() || ""];
    if (g) lastGroup = g;
    groups[j] = j === 0 ? null : lastGroup;
  }

  const rows: ProductTrafficDaily[] = [];
  for (let i = headerIdx + 1; i < trend.length; i++) {
    const row = trend[i] || [];
    const date = toIsoDate(row[0]);
    if (!date) continue;

    const perType = new Map<ProductTrafficContentType, Partial<Record<MetricKey, number>>>();
    for (let j = 1; j < headers.length; j++) {
      const group = groups[j];
      if (!group) continue;
      const key = metricKeyFromHeader(headers[j]);
      if (!key) continue;
      const bag = perType.get(group) || {};
      if (bag[key] !== undefined) continue; // kolom pertama menang (hindari duplikat header di grup afiliasi)
      bag[key] = PCT_KEYS.includes(key) ? parsePct(row[j]) : parseIdNumber(row[j]);
      perType.set(group, bag);
    }

    perType.forEach((bag, contentType) => {
      rows.push({
        store_id: storeId,
        product_id: productId,
        product_name: productName,
        date,
        content_type: contentType,
        gmv: bag.gmv || 0,
        orders: bag.orders || 0,
        sku_orders: bag.sku_orders || 0,
        products_sold: bag.products_sold || 0,
        buyers: bag.buyers || 0,
        aov: bag.aov || 0,
        impressions: bag.impressions || 0,
        clicks: bag.clicks || 0,
        ctr: bag.ctr || 0,
        atc: bag.atc || 0,
        atc_rate: bag.atc_rate || 0,
        ctor: bag.ctor || 0,
        impressions_unique: bag.impressions_unique || 0,
        clicks_unique: bag.clicks_unique || 0,
        ctr_unique: bag.ctr_unique || 0,
      });
    });
  }

  return { type: "PT_KEY_METRICS", productId, productName, periodStart, periodEnd, rows };
}

// ─── PARSER 2: PT LIST (agregat per channel) ────────────────
export function parsePtList(
  wb: XLSX.WorkBook
): Extract<ParsedProductTrafficFile, { type: "PT_LIST" }> {
  const channels: PtListChannelRow[] = [];
  let periodStart = "";
  let periodEnd = "";

  for (const sheetName of wb.SheetNames) {
    const rows = sheetRows(wb, sheetName);
    for (const row of rows.slice(0, 4)) {
      const joined = (row || []).map((c) => String(c ?? "")).join(" ");
      if (/analysis date/i.test(joined)) {
        const p = parsePeriodRange(joined);
        if (p.start) {
          periodStart = p.start;
          periodEnd = p.end;
        }
      }
    }
    const headerIdx = rows.findIndex(
      (r) => String(r?.[1]).trim() === "GMV" && String(r?.[0]).trim() === ""
    );
    if (headerIdx < 0) continue;
    const headers = (rows[headerIdx] || []).map((c) => String(c ?? ""));

    for (let i = headerIdx + 1; i < rows.length; i++) {
      const row = rows[i] || [];
      const channel = String(row[0] ?? "").trim();
      if (!channel) continue;
      const bag: Partial<Record<MetricKey, number>> = {};
      for (let j = 1; j < headers.length; j++) {
        const key = metricKeyFromHeader(headers[j]);
        if (!key || bag[key] !== undefined) continue;
        bag[key] = PCT_KEYS.includes(key) ? parsePct(row[j]) : parseIdNumber(row[j]);
      }
      channels.push({
        channel,
        gmv: bag.gmv || 0,
        orders: bag.orders || 0,
        sku_orders: bag.sku_orders || 0,
        products_sold: bag.products_sold || 0,
        buyers: bag.buyers || 0,
        aov: bag.aov || 0,
        impressions: bag.impressions || 0,
        clicks: bag.clicks || 0,
        ctr: bag.ctr || 0,
        atc: bag.atc || 0,
        atc_rate: bag.atc_rate || 0,
        ctor: bag.ctor || 0,
      });
    }
  }

  return { type: "PT_LIST", periodStart, periodEnd, channels };
}

// ─── PARSER 3: PRODUCT LIST (katalog produk) ────────────────
// Slug channel dari header GMV, mis. "GMV dari LIVE penjual" → "dari_live_penjual"
function channelSlug(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/^gmv\s*/i, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function parseProductList(
  wb: XLSX.WorkBook,
  storeId: string
): Extract<ParsedProductTrafficFile, { type: "PRODUCT_LIST" }> {
  const rows = sheetRows(wb, wb.SheetNames[0]);

  // Periode dari row 0: "Tanggal analisis: 01/04/2026-22/07/2026"
  let periodStart = "";
  let periodEnd = "";
  const topJoined = (rows[0] || []).map((c) => String(c ?? "")).join(" ");
  if (topJoined) {
    const p = parsePeriodRange(topJoined);
    periodStart = p.start;
    periodEnd = p.end;
  }

  const headerIdx = rows.findIndex(
    (r) => String(r?.[0]).trim() === "Nama" && String(r?.[1]).trim() === "ID Produk"
  );
  if (headerIdx < 0) {
    throw new Error("Header 'Nama / ID Produk' tidak ditemukan — format product_list tidak dikenali.");
  }
  const headers = (rows[headerIdx] || []).map((c) => String(c ?? ""));

  const items: ProductCatalogEntry[] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i] || [];
    const name = String(row[0] ?? "").trim();
    const productId = String(row[1] ?? "").trim();
    if (!name || !productId) continue;

    const channelGmv: Record<string, number> = {};
    const bag: Partial<Record<MetricKey, number>> = {};

    for (let j = 2; j < headers.length; j++) {
      const h = headers[j].trim();
      if (!h) continue;
      if (/^gmv$/i.test(h)) {
        if (bag.gmv === undefined) bag.gmv = parseIdNumber(row[j]);
        continue;
      }
      if (/^gmv\s+.+/i.test(h)) {
        // Kolom breakdown channel: "GMV dari LIVE penjual", "GMV video Afiliasi", dst.
        channelGmv[channelSlug(h)] = parseIdNumber(row[j]);
        continue;
      }
      const key = metricKeyFromHeader(h);
      if (!key || bag[key] !== undefined) continue;
      bag[key] = PCT_KEYS.includes(key) ? parsePct(row[j]) : parseIdNumber(row[j]);
    }

    items.push({
      store_id: storeId,
      product_id: productId,
      name,
      status: String(row[3] ?? "").trim(),
      gmv_range: String(row[2] ?? "").trim(),
      period_start: periodStart || "1970-01-01",
      period_end: periodEnd || periodStart || "1970-01-01",
      gmv: bag.gmv || 0,
      channel_gmv: channelGmv,
      orders: bag.orders || 0,
      sku_orders: bag.sku_orders || 0,
      products_sold: bag.products_sold || 0,
      buyers: bag.buyers || 0,
      aov: bag.aov || 0,
      impressions: bag.impressions || 0,
      clicks: bag.clicks || 0,
      ctr: bag.ctr || 0,
      atc: bag.atc || 0,
      atc_rate: bag.atc_rate || 0,
      ctor: bag.ctor || 0,
    });
  }

  return { type: "PRODUCT_LIST", periodStart, periodEnd, items };
}

// ─── HELPER: header lookup utk file harian (Waktu) ──────────
function findCol(headers: string[], ...keywords: string[]): number {
  const lower = headers.map((h) => h.toLowerCase());
  for (const kw of keywords) {
    const idx = lower.findIndex((h) => h.includes(kw.toLowerCase()));
    if (idx >= 0) return idx;
  }
  return -1;
}

function dailyVal(row: unknown[], headers: string[], ...keywords: string[]): number {
  const idx = findCol(headers, ...keywords);
  return idx >= 0 ? parseIdNumber(row[idx]) : 0;
}

function dailyPct(row: unknown[], headers: string[], ...keywords: string[]): number {
  const idx = findCol(headers, ...keywords);
  return idx >= 0 ? parsePct(row[idx]) : 0;
}

// ─── PARSER 4: VIDEO PERFORMANCE CORE STATS HARIAN ──────────
export function parseVideoDaily(wb: XLSX.WorkBook, storeId: string): VideoCoreStatDaily[] {
  const rows = sheetRows(wb, wb.SheetNames[0]);
  const headerIdx = rows.findIndex((r) => String(r?.[0]).trim() === "Waktu");
  if (headerIdx < 0) throw new Error("Header 'Waktu' tidak ditemukan pada file Video Core Stats.");
  const headers = (rows[headerIdx] || []).map((c) => String(c ?? ""));

  const out: VideoCoreStatDaily[] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i] || [];
    const date = toIsoDate(row[0]);
    if (!date) continue;
    out.push({
      store_id: storeId,
      date,
      gmv_from_video: dailyVal(row, headers, "gmv dari video"),
      gmv_video: dailyVal(row, headers, "gmv video"),
      gmv_indirect: dailyVal(row, headers, "gmv tidak langsung"),
      vv: dailyVal(row, headers, "vv"),
      gpm: dailyVal(row, headers, "gpm"),
      sku_orders_attr: dailyVal(row, headers, "pesanan sku teratribusi"),
      sku_orders_video: dailyVal(row, headers, "pesanan sku dari video"),
      sku_orders_indirect: dailyVal(row, headers, "pesanan sku tidak langsung"),
      avg_daily_buyers: dailyVal(row, headers, "rata-rata pembeli"),
      product_viewers: dailyVal(row, headers, "penonton video produk"),
      product_impressions: dailyVal(row, headers, "impresi produk"),
      product_clicks: dailyVal(row, headers, "klik produk"),
      ctr_video: dailyPct(row, headers, "rasio klik tayang"),
      ctor_video: dailyPct(row, headers, "ctor"),
    });
  }
  return out;
}

// ─── PARSER 5: LIVE PERFORMANCE CORE STATS HARIAN ───────────
// Dipetakan ke tabel live_core_stats yang SUDAH ADA agar Live Analytics ikut terisi.
export function parseLiveDaily(wb: XLSX.WorkBook, storeId: string): Omit<LiveCoreStat, "id">[] {
  const rows = sheetRows(wb, wb.SheetNames[0]);
  const headerIdx = rows.findIndex((r) => String(r?.[0]).trim() === "Waktu");
  if (headerIdx < 0) throw new Error("Header 'Waktu' tidak ditemukan pada file Live Core Stats.");
  const headers = (rows[headerIdx] || []).map((c) => String(c ?? ""));

  const out: Omit<LiveCoreStat, "id">[] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i] || [];
    const date = toIsoDate(row[0]);
    if (!date) continue;
    out.push({
      store_id: storeId,
      date,
      gmv_live: dailyVal(row, headers, "gmv dari live"), // total teratribusi
      gmv_earned: dailyVal(row, headers, "gmv live"), // direct
      gpm: dailyVal(row, headers, "gpm"),
      sessions_total: dailyVal(row, headers, "siaran live"),
      sessions_with_gmv: dailyVal(row, headers, "yang menghasilkan"),
      products_sold: dailyVal(row, headers, "produk yang terjual melalui live", "produk yang terjual"),
      sku_orders: dailyVal(row, headers, "pesanan sku teratribusi"),
      buyers: dailyVal(row, headers, "pembeli"),
      impressions: dailyVal(row, headers, "tayangan live"),
      ctr_live: dailyPct(row, headers, "rasio klik tayang"),
      order_per_click: dailyPct(row, headers, "ctor"),
      avg_watch_time: dailyVal(row, headers, "durasi menonton"),
    });
  }
  return out;
}

// ─── ENTRY POINT ────────────────────────────────────────────
export async function parseProductTrafficFile(
  file: File,
  storeId: string
): Promise<ParsedProductTrafficFile> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: true });
  const type = detectProductTrafficFile(wb);

  switch (type) {
    case "PT_KEY_METRICS":
      return parsePtKeyMetrics(wb, storeId);
    case "PT_LIST":
      return parsePtList(wb);
    case "PRODUCT_LIST":
      return parseProductList(wb, storeId);
    case "VIDEO_DAILY":
      return { type: "VIDEO_DAILY", rows: parseVideoDaily(wb, storeId) };
    case "LIVE_DAILY":
      return { type: "LIVE_DAILY", rows: parseLiveDaily(wb, storeId) };
    default:
      return {
        type: "UNKNOWN",
        reason:
          "Format tidak dikenali. File yang didukung: Product_Traffic Key Metrics/List, product_list, Video/Live Performance Core Stats.",
      };
  }
}
