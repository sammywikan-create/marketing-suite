"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import useSWR from "swr";
import {
  ResponsiveContainer, ComposedChart, Bar, Line, LineChart, BarChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine,
  PieChart, Pie, Cell, AreaChart, Area,
} from "recharts";
import {
  RefreshCw, Loader2, TrendingUp, TrendingDown, Settings, X, Save,
  ShoppingBag, Video, Radio, Store, Users, AlertTriangle, CheckCircle2,
  Target, DollarSign, Zap, BarChart3, ArrowUpRight, ArrowDownRight,
  FileDown, Presentation, Download, Upload, Calendar, ChevronLeft, ChevronRight,
  Trash2, Database, Check,
} from "lucide-react";
import { generatePdf } from "@/lib/exportPdf";
import { generatePpt } from "@/lib/exportPpt";
import {
  saveLaporanHarianData,
  loadLaporanHarianData,
  listLaporanHarianPeriods,
  deleteLaporanHarianData,
} from "@/lib/db";
import { isSupabaseConfigured } from "@/lib/supabase";
import * as XLSX from "xlsx";
import AIInsightsCard from "@/components/AIInsightsCard";
import AlertPanel from "@/components/alerts/AlertPanel";

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════
interface HarianRow {
  tanggal: string; closing: number; botol: number; nilai_per_txn: number;
  omzet: number; cac_ads: number; cac_total: number; upsell: number;
  biaya_iklan: number; komisi_affiliate: number;
  omzet_total_brand: number; pct_kontribusi_fv: number;
}
interface ChannelRow {
  tanggal: string; omzet: number; closing: number; botol: number;
  upsell: number; cac_ads: number; cac_total: number;
  biaya_iklan: number;
}
interface ChannelSummary {
  total_omzet: number; total_closing: number; total_botol: number;
  total_biaya_iklan: number;
  rata_upsell: number; rata_cac: number; hari: number;
  roi: number;
  cost_per_closing: number; cost_per_botol: number;
  omzet_per_closing: number; bottle_per_closing: number;
}
interface WeeklyRow {
  label: string; hari: number; total_omzet: number; total_closing: number;
  total_botol: number; rata_upsell: number; rata_cac: number;
  rata_omzet_harian: number; wow_omzet: number; wow_closing: number;
}
interface Summary {
  total_omzet: number; total_botol: number; total_closing: number;
  rata_upsell: number; rata_cac: number; rata_cac_ads: number;
  total_biaya_iklan: number; total_komisi_aff: number; total_cost: number;
  roas: number; cost_per_closing: number; cost_per_botol: number;
  margin_after_cost: number;
  total_omzet_all: number; total_omzet_fv: number; pct_kontribusi_fv: number;
  hari: number; avg_omzet_harian: number; avg_closing_harian: number;
  avg_botol_harian: number; nilai_per_txn: number;
}
interface Highlights {
  best_day: { tanggal: string; omzet: number } | null;
  worst_day: { tanggal: string; omzet: number } | null;
  anomalies: { tanggal: string; omzet: number; type: "spike" | "drop"; deviation: number }[];
}
interface EvaluasiPerBrand { freshvision: number; nutriflakes: number; freshmag: number; etawaku: number; total: number; }
interface ApiResponse {
  summary: Summary; harian: HarianRow[]; weekly: WeeklyRow[];
  channels: Record<string, ChannelSummary>;
  channel_data: { video: ChannelRow[]; live: ChannelRow[]; shop_tab: ChannelRow[]; affiliate: ChannelRow[] };
  evaluasi_per_brand: EvaluasiPerBrand; highlights: Highlights;
  period?: string;
}

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════
const fetcher = (url: string) => fetch(url).then((r) => r.json());
function fR(v: number) {
  return `Rp${Math.round(v).toLocaleString("id-ID")}`;
}
function fN(v: number) { return v.toLocaleString("id-ID"); }

const BULAN_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function formatPeriod(period: string): string {
  if (/^\d{4}-\d{2}$/.test(period)) {
    const [year, month] = period.split("-");
    return `${BULAN_ID[parseInt(month) - 1]} ${year}`;
  }
  return period;
}

function getCurrentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// Compute the previous period (YYYY-MM) for MoM comparison.
// e.g., "2026-02" → "2026-01"; "2026-01" → "2025-12"
function getPreviousPeriod(period: string): string {
  if (!/^\d{4}-\d{2}$/.test(period)) return "";
  const [yStr, mStr] = period.split("-");
  let year = parseInt(yStr);
  let month = parseInt(mStr) - 1;
  if (month < 1) { month = 12; year -= 1; }
  return `${year}-${String(month).padStart(2, "0")}`;
}

function detectPeriodFromData(data: ApiResponse | null | undefined): string {
  // If period was explicitly set during import (with correct year), use it
  if (data?.period && /^\d{4}-\d{2}$/.test(data.period)) return data.period;

  if (!data?.harian?.length) return getCurrentPeriod();
  // Try to extract month from first harian date like "1 Apr", "15 Jan"
  const BULAN_TO_NUM: Record<string, string> = {
    jan: "01", feb: "02", mar: "03", apr: "04", mei: "05", jun: "06",
    jul: "07", agu: "08", sep: "09", okt: "10", nov: "11", des: "12",
  };
  for (const row of data.harian) {
    const m = row.tanggal?.match(/(Jan|Feb|Mar|Apr|Mei|Jun|Jul|Agu|Sep|Okt|Nov|Des)/i);
    if (m) {
      const mon = BULAN_TO_NUM[m[1].toLowerCase()];
      if (mon) {
        // Use current year only as fallback — period field should have correct year
        const year = new Date().getFullYear();
        return `${year}-${mon}`;
      }
    }
  }
  return getCurrentPeriod();
}

function useTarget() {
  const [target, setTargetState] = useState(350_000_000);
  useEffect(() => {
    const saved = localStorage.getItem("fv_target_omzet");
    if (saved) setTargetState(parseInt(saved));
  }, []);
  const setTarget = useCallback((v: number) => {
    setTargetState(v);
    localStorage.setItem("fv_target_omzet", String(v));
  }, []);
  return { target, setTarget };
}

// ═══════════════════════════════════════════════════════════
// EXCEL IMPORT PARSER
// Uses the EXACT same column mapping & cleaners as googleSheets.ts
// ═══════════════════════════════════════════════════════════

// Same cleaners as googleSheets.ts
function cleanRp(val: unknown): number {
  if (!val) return 0;
  if (typeof val === "number") return val;
  const s = String(val).replace(/Rp/gi, "").replace(/\./g, "").replace(",", ".").trim();
  return parseFloat(s) || 0;
}
function cleanPct(val: unknown): number {
  if (!val) return 0;
  if (typeof val === "number") return val > 1 ? val : val * 100;
  const s = String(val).replace("%", "").replace(",", ".").trim();
  return parseFloat(s) || 0;
}
function cleanDecimal(val: unknown): number {
  if (!val) return 0;
  if (typeof val === "number") return val;
  return parseFloat(String(val).replace(",", ".").trim()) || 0;
}
function cleanInt(val: unknown): number {
  if (!val) return 0;
  if (typeof val === "number") return Math.round(val);
  return parseInt(String(val).replace(/\./g, "").replace(",", ".")) || 0;
}

// Same date check as googleSheets.ts: "Rabu, April 1, 2026"
function isDateRow(val: unknown): boolean {
  if (!val) return false;
  if (typeof val === "number" && val > 30000 && val < 60000) return true;
  const s = String(val).trim();
  if (/\w+,\s+\w+\s+\d+,\s*\d{4}/.test(s)) return true;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return true;
  if (/^\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}/.test(s)) return true;
  if (/\d+\s+(Jan|Feb|Mar|Apr|Mei|Jun|Jul|Agu|Sep|Okt|Nov|Des|May|Aug|Oct|Dec)/i.test(s)) return true;
  return false;
}

// Same date formatter as googleSheets.ts: "Rabu, April 1, 2026" → "1 Apr" + period
const BULAN_SHORT = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
const MONTH_MAP: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  januari: 1, februari: 2, maret: 3, mei: 5, juni: 6, juli: 7,
  agustus: 8, oktober: 10, desember: 12,
  jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, agu: 8, sep: 9, okt: 10, nov: 11, des: 12,
  aug: 8, oct: 10, dec: 12,
};

function cleanDate(val: unknown): { dateStr: string; period: string } {
  if (!val) return { dateStr: "", period: "" };
  let dateStr = "";
  let period = "";

  if (typeof val === "number" && val > 30000 && val < 60000) {
    const d = XLSX.SSF.parse_date_code(val);
    if (d) {
      dateStr = `${d.d} ${BULAN_SHORT[d.m - 1]}`;
      period = `${d.y}-${String(d.m).padStart(2, "0")}`;
    }
    return { dateStr, period };
  }

  const s = String(val).trim();
  // "Rabu, April 1, 2026" or "April 1, 2026" (same regex as googleSheets.ts)
  const m1 = s.match(/(\w+)\s+(\d+),\s*(\d{4})$/);
  if (m1) {
    const mon = MONTH_MAP[m1[1].toLowerCase()];
    if (mon) {
      dateStr = `${m1[2]} ${BULAN_SHORT[mon - 1]}`;
      period = `${m1[3]}-${String(mon).padStart(2, "0")}`;
      return { dateStr, period };
    }
  }
  // ISO
  const m2 = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m2) {
    dateStr = `${parseInt(m2[3])} ${BULAN_SHORT[parseInt(m2[2]) - 1]}`;
    period = `${m2[1]}-${m2[2]}`;
    return { dateStr, period };
  }
  // dd/mm/yyyy
  const m3 = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/);
  if (m3) {
    const year = m3[3].length === 2 ? 2000 + parseInt(m3[3]) : parseInt(m3[3]);
    dateStr = `${parseInt(m3[1])} ${BULAN_SHORT[parseInt(m3[2]) - 1]}`;
    period = `${year}-${String(parseInt(m3[2])).padStart(2, "0")}`;
    return { dateStr, period };
  }
  // "1 Apr"
  const m4 = s.match(/^(\d{1,2})\s+(\w+)/);
  if (m4) {
    const mon = MONTH_MAP[m4[2].toLowerCase()];
    if (mon) return { dateStr: `${m4[1]} ${BULAN_SHORT[mon - 1]}`, period };
  }
  return { dateStr: s, period };
}

// ─── Sheet name patterns — EXACT same names as googleSheets.ts SHEETS constant ───
// NOTE: Excel limits sheet names to 31 chars. Long names get TRUNCATED:
//   "ADV SAEFUL - FRESHVISION(SHOP TAB)" (34) → "ADV SAEFUL - FRESHVISION(SHOP T"
//   "ADV SAEFUL - FRESHVISION(AFFILIATE)" (35) → "ADV SAEFUL - FRESHVISION(AFFILI"
//   "ADV SAEFUL - FRESHVISION(LIVE STREAMING)" (40) → "ADV SAEFUL - FRESHVISION(LIVE S"
//   "ADV SAEFUL - FRESHVISION(PROPORSI TOTAL OMSET)" (47) → "ADV SAEFUL - FRESHVISION(PROPOR"
// Patterns must match BOTH full + truncated forms.
const SHEET_PATTERNS = {
  SHOP:      ["freshvision(shop)"],         // closing paren prevents matching SHOP TAB / SHOP T
  VIDEO:     ["freshvision(video)"],
  LIVE:      ["freshvision(live"],          // matches "live streaming)" and truncated "live s"
  SHOP_TAB:  ["freshvision(shop t"],        // matches "shop tab)" and truncated "shop t"
  AFFILIATE: ["freshvision(affili"],        // matches "affiliate)" and truncated "affili"
  PROPORSI:  ["freshvision(propor", "freshvision (propor", "proporsi total omset"],
  EVALUASI:  ["evaluasi produk"],           // matches "evaluasi produk (tiktokshop)" and truncated
};

function findSheet(wb: XLSX.WorkBook, patterns: string[], exclude?: string[]): { rows: any[][]; name: string } | null {
  for (const pat of patterns) {
    const found = wb.SheetNames.find((n) => {
      const lower = n.toLowerCase();
      if (!lower.includes(pat)) return false;
      if (exclude && exclude.some((ex) => lower.includes(ex))) return false;
      return true;
    });
    if (found) {
      const ws = wb.Sheets[found];
      return { rows: XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][], name: found };
    }
  }
  return null;
}

// Filter rows: keep only date rows, skip TOTAL/RATA-RATA
function getDateRows(rows: any[][]): { dataRows: any[][]; dataStart: number } {
  let dataStart = -1;
  for (let i = 0; i < Math.min(20, rows.length); i++) {
    if (rows[i] && isDateRow(rows[i][0])) { dataStart = i; break; }
  }
  if (dataStart < 0) return { dataRows: [], dataStart: -1 };
  const dataRows = rows.slice(dataStart).filter((r) => {
    if (!r || !r[0]) return false;
    const s = String(r[0] ?? "").toLowerCase();
    if (s.includes("total") || s.includes("rata") || s.includes("average")) return false;
    return isDateRow(r[0]);
  });
  return { dataRows, dataStart };
}

// ─── Parse SHOP — mirrors getFreshVisionShop() from googleSheets.ts ───
// Kolom: A=tanggal, D=biaya_iklan, J=komisi, K=closing, L=botol, M=nilai, N=omzet, O=cac_ads, P=cac_total, Q=upsell
function parseShopSheet(rows: any[][]): { shop: HarianRow[]; period: string } {
  const { dataRows } = getDateRows(rows);
  if (!dataRows.length) return { shop: [], period: "" };

  let period = "";
  const shop: HarianRow[] = [];
  for (const r of dataRows) {
    const { dateStr, period: p } = cleanDate(r[0]);
    if (!dateStr) continue;
    if (p && !period) period = p;
    const omzet = cleanRp(r[13]); // N
    if (omzet <= 0) continue;
    shop.push({
      tanggal: dateStr,
      biaya_iklan:      cleanRp(r[3]),       // D
      komisi_affiliate: cleanRp(r[9]),       // J
      closing:          cleanInt(r[10]),     // K
      botol:            cleanInt(r[11]),     // L
      nilai_per_txn:    cleanRp(r[12]),      // M
      omzet,                                  // N
      cac_ads:          cleanPct(r[14]),     // O
      cac_total:        cleanPct(r[15]),     // P
      upsell:           cleanDecimal(r[16]), // Q
      omzet_total_brand: 0,
      pct_kontribusi_fv: 0,
    });
  }
  if (shop.length > 0) {
    console.log(`[Excel Import] SHOP: ${shop.length} rows, first:`, shop[0]);
    console.log(`[Excel Import] SHOP total omzet: ${shop.reduce((a, r) => a + r.omzet, 0).toLocaleString()}`);
  }
  return { shop, period };
}

// ─── Parse VIDEO/LIVE/SHOP_TAB — mirrors getFreshVisionVideo/Live/ShopTab() ───
// Layout: A=tanggal, D=biaya, E=closing, F=botol, G=nilai, H=omzet, I=cac, J=upsell
// SHOP_TAB sheet juga punya sub-sections (K-S, T-AB) tapi kita hanya butuh TOTAL di B-J.
function parseVideoLiveShopTabSheet(rows: any[][], label: string): ChannelRow[] {
  const { dataRows } = getDateRows(rows);
  if (!dataRows.length) return [];

  const result: ChannelRow[] = [];
  for (const r of dataRows) {
    const { dateStr } = cleanDate(r[0]);
    if (!dateStr) continue;
    const omzet = cleanRp(r[7]); // H
    if (omzet <= 0) continue;
    result.push({
      tanggal: dateStr,
      biaya_iklan: cleanRp(r[3]),       // D
      omzet,                            // H
      closing:   cleanInt(r[4]),        // E
      botol:     cleanInt(r[5]),        // F
      upsell:    cleanDecimal(r[9]),    // J
      cac_ads:   cleanPct(r[8]),        // I
      cac_total: cleanPct(r[8]),        // I
    });
  }
  if (result.length > 0) {
    console.log(`[Excel Import] ${label}: ${result.length} rows, first:`, result[0]);
    console.log(`[Excel Import] ${label} total omzet: ${result.reduce((a, r) => a + r.omzet, 0).toLocaleString()}`);
  }
  return result;
}

// ─── Parse AFFILIATE — mirrors getFreshVisionAffiliate() ───
// Layout (no biaya_iklan): A=tanggal, B=komisi, C=closing, D=botol, E=nilai, F=omzet, G=cac, H=upsell
function parseAffiliateSheet(rows: any[][]): ChannelRow[] {
  const { dataRows } = getDateRows(rows);
  if (!dataRows.length) return [];

  const result: ChannelRow[] = [];
  for (const r of dataRows) {
    const { dateStr } = cleanDate(r[0]);
    if (!dateStr) continue;
    const omzet = cleanRp(r[5]); // F
    if (omzet <= 0) continue;
    result.push({
      tanggal: dateStr,
      biaya_iklan: cleanRp(r[1]),       // B = komisi affiliate (treated as cost)
      omzet,                            // F
      closing:   cleanInt(r[2]),        // C
      botol:     cleanInt(r[3]),        // D
      upsell:    cleanDecimal(r[7]),    // H
      cac_ads:   cleanPct(r[6]),        // G
      cac_total: cleanPct(r[6]),        // G
    });
  }
  if (result.length > 0) {
    console.log(`[Excel Import] AFFILIATE: ${result.length} rows, first:`, result[0]);
    console.log(`[Excel Import] AFFILIATE total omzet: ${result.reduce((a, r) => a + r.omzet, 0).toLocaleString()}`);
  }
  return result;
}

// ─── Parse EVALUASI — mirrors getEvaluasiHarian() ───
// Kolom: r[175]=etawaku, r[256]=freshmag, r[273]=nutriflakes, r[322]=freshvision, r[339]=total
interface EvalRow {
  tanggal: string; omzet_freshvision: number; omzet_nutriflakes: number;
  omzet_freshmag: number; omzet_etawaku: number; omzet_total: number;
}
function parseEvaluasiSheet(rows: any[][]): EvalRow[] {
  const { dataRows } = getDateRows(rows);
  if (!dataRows.length) {
    console.log("[Excel Import] EVALUASI: no date rows found");
    return [];
  }

  const maxCols = Math.max(...dataRows.map(r => r?.length || 0));
  console.log(`[Excel Import] EVALUASI: ${dataRows.length} data rows, maxCols=${maxCols}`);

  // Fixed column indices — same as googleSheets.ts getEvaluasiHarian()
  if (maxCols > 339) {
    const result: EvalRow[] = [];
    for (const r of dataRows) {
      const { dateStr } = cleanDate(r[0]);
      if (!dateStr) continue;
      const omzet_total = cleanRp(r[339]);
      if (omzet_total > 0) {
        result.push({
          tanggal: dateStr,
          omzet_freshvision: cleanRp(r[322]),
          omzet_nutriflakes: cleanRp(r[273]),
          omzet_freshmag:    cleanRp(r[256]),
          omzet_etawaku:     cleanRp(r[175]),
          omzet_total,
        });
      }
    }
    if (result.length > 0) {
      console.log("[Excel Import] EVALUASI: used fixed indices (same as live API), rows:", result.length);
      console.log("[Excel Import] EVALUASI first row:", result[0]);
      return result;
    }
  }

  // Fallback: scan headers for brand names (when Excel export strips empty columns)
  console.log("[Excel Import] EVALUASI: maxCols<=339, scanning headers for brand names...");
  const brandCols: Record<string, number> = {};
  const brandKW: [string, string[]][] = [
    ["freshvision", ["total fresh vision", "total freshvision", "freshvision"]],
    ["nutriflakes", ["total nutriflakes", "nutriflakes"]],
    ["freshmag", ["total freshmag", "freshmag"]],
    ["etawaku", ["total etawaku", "etawaku"]],
  ];
  const { dataStart } = getDateRows(rows);
  const scanLimit = Math.min(rows.length, (dataStart >= 0 ? dataStart : 5) + 3);
  for (let i = 0; i < scanLimit; i++) {
    const row = rows[i] || [];
    for (let j = 0; j < row.length; j++) {
      const cell = String(row[j] ?? "").toLowerCase().trim();
      if (!cell) continue;
      for (const [brand, kws] of brandKW) {
        if (!(brand in brandCols) && kws.some((k) => cell.includes(k))) brandCols[brand] = j;
      }
      if (!("total" in brandCols) && (cell === "total" || cell.includes("grand total"))) {
        brandCols["total"] = j;
      }
    }
  }
  console.log("[Excel Import] EVALUASI brand columns from headers:", brandCols);

  // For each brand anchor, find nearby column with highest monetary sum
  function findOmzetNear(anchor: number): number {
    let bestCol = anchor, bestSum = 0;
    for (let c = anchor; c < Math.min(anchor + 6, maxCols); c++) {
      let s = 0;
      for (const r of dataRows.slice(0, 5)) { const v = cleanRp(r?.[c]); if (v > 10000) s += v; }
      if (s > bestSum) { bestSum = s; bestCol = c; }
    }
    return bestSum > 0 ? bestCol : anchor;
  }

  const iFV = brandCols.freshvision !== undefined ? findOmzetNear(brandCols.freshvision) : -1;
  const iNF = brandCols.nutriflakes !== undefined ? findOmzetNear(brandCols.nutriflakes) : -1;
  const iFM = brandCols.freshmag !== undefined ? findOmzetNear(brandCols.freshmag) : -1;
  const iET = brandCols.etawaku !== undefined ? findOmzetNear(brandCols.etawaku) : -1;
  const iTotal = brandCols.total !== undefined ? findOmzetNear(brandCols.total) : -1;

  const result: EvalRow[] = [];
  for (const r of dataRows) {
    const { dateStr } = cleanDate(r[0]);
    if (!dateStr) continue;
    const omzet_freshvision = iFV >= 0 ? cleanRp(r[iFV]) : 0;
    const omzet_nutriflakes = iNF >= 0 ? cleanRp(r[iNF]) : 0;
    const omzet_freshmag = iFM >= 0 ? cleanRp(r[iFM]) : 0;
    const omzet_etawaku = iET >= 0 ? cleanRp(r[iET]) : 0;
    let omzet_total = iTotal >= 0 ? cleanRp(r[iTotal]) : 0;
    if (omzet_total <= 0) {
      omzet_total = omzet_freshvision + omzet_nutriflakes + omzet_freshmag + omzet_etawaku;
    }
    if (omzet_total > 0) {
      result.push({ tanggal: dateStr, omzet_freshvision, omzet_nutriflakes, omzet_freshmag, omzet_etawaku, omzet_total });
    }
  }
  if (result.length > 0) console.log("[Excel Import] EVALUASI first row:", result[0]);
  else console.warn("[Excel Import] EVALUASI: no valid rows found!");
  return result;
}

// ─── Parse PROPORSI sheet (brand contribution data) ───
function parseProporsiSheet(rows: any[][]): EvalRow[] {
  const { dataRows, dataStart } = getDateRows(rows);
  if (!dataRows.length) {
    console.log("[Excel Import] PROPORSI: no date rows found");
    return [];
  }

  // Scan headers for brand column names
  const brandCols: Record<string, number> = {};
  const brandKW: [string, string[]][] = [
    ["freshvision", ["freshvision", "fresh vision"]],
    ["nutriflakes", ["nutriflakes", "nutri flakes"]],
    ["freshmag", ["freshmag", "fresh mag"]],
    ["etawaku", ["etawaku", "eta waku"]],
  ];
  for (let i = 0; i < dataStart; i++) {
    const row = rows[i] || [];
    for (let j = 0; j < row.length; j++) {
      const cell = String(row[j] ?? "").toLowerCase().trim();
      if (!cell) continue;
      for (const [brand, kws] of brandKW) {
        if (!(brand in brandCols) && kws.some((k) => cell.includes(k))) brandCols[brand] = j;
      }
      if (!("total" in brandCols) && (cell === "total" || cell.includes("total omset") || cell.includes("total omzet"))) {
        brandCols["total"] = j;
      }
    }
  }
  console.log("[Excel Import] PROPORSI brand columns:", brandCols);

  const iFV = brandCols.freshvision ?? -1;
  const iNF = brandCols.nutriflakes ?? -1;
  const iFM = brandCols.freshmag ?? -1;
  const iET = brandCols.etawaku ?? -1;
  const iTotal = brandCols.total ?? -1;

  const result: EvalRow[] = [];
  for (const r of dataRows) {
    const { dateStr } = cleanDate(r[0]);
    if (!dateStr) continue;
    const omzet_freshvision = iFV >= 0 ? cleanRp(r[iFV]) : 0;
    const omzet_nutriflakes = iNF >= 0 ? cleanRp(r[iNF]) : 0;
    const omzet_freshmag = iFM >= 0 ? cleanRp(r[iFM]) : 0;
    const omzet_etawaku = iET >= 0 ? cleanRp(r[iET]) : 0;
    let omzet_total = iTotal >= 0 ? cleanRp(r[iTotal]) : 0;
    if (omzet_total <= 0) {
      omzet_total = omzet_freshvision + omzet_nutriflakes + omzet_freshmag + omzet_etawaku;
    }
    if (omzet_total > 0) {
      result.push({ tanggal: dateStr, omzet_freshvision, omzet_nutriflakes, omzet_freshmag, omzet_etawaku, omzet_total });
    }
  }
  if (result.length > 0) console.log("[Excel Import] PROPORSI first row:", result[0]);
  else console.warn("[Excel Import] PROPORSI: no valid rows found!");
  return result;
}

// ─── Build full ApiResponse — identical structure to API route ───
function buildFullApiResponse(
  shop: HarianRow[],
  video: ChannelRow[],
  live: ChannelRow[],
  shopTab: ChannelRow[],
  affiliate: ChannelRow[],
  evaluasi: EvalRow[],
): ApiResponse {
  const sum = <T,>(a: T[], fn: (r: T) => number) => a.reduce((s, r) => s + fn(r), 0);
  const avg = <T,>(a: T[], fn: (r: T) => number) => a.length ? sum(a, fn) / a.length : 0;
  const pct = (part: number, total: number) => total > 0 ? parseFloat((part / total * 100).toFixed(2)) : 0;

  // Merge shop with evaluasi kontribusi %
  const shopMerged = shop.map((row) => {
    const evalRow = evaluasi.find((e) => e.tanggal === row.tanggal);
    return {
      ...row,
      omzet_total_brand: evalRow?.omzet_total || 0,
      pct_kontribusi_fv: pct(row.omzet, evalRow?.omzet_total || 0),
    };
  });

  const totalOmzet = sum(shop, (r) => r.omzet);
  const totalBotol = sum(shop, (r) => r.botol);
  const totalClosing = sum(shop, (r) => r.closing);
  const totalBiayaIklan = sum(shop, (r) => r.biaya_iklan);
  const totalKomisiAff = sum(shop, (r) => r.komisi_affiliate);
  const totalCost = totalBiayaIklan + totalKomisiAff;
  const totalOmzetAll = evaluasi.length > 0 ? sum(evaluasi, (r) => r.omzet_total) : totalOmzet;
  const totalOmzetFV = evaluasi.length > 0 ? sum(evaluasi, (r) => r.omzet_freshvision) : totalOmzet;
  const hari = shop.length;

  const roas = totalBiayaIklan > 0 ? parseFloat((totalOmzet / totalBiayaIklan).toFixed(2)) : 0;
  const costPerClosing = totalClosing > 0 ? Math.round(totalCost / totalClosing) : 0;
  const costPerBotol = totalBotol > 0 ? Math.round(totalCost / totalBotol) : 0;
  const marginAfterCost = totalOmzet > 0 ? parseFloat(((totalOmzet - totalCost) / totalOmzet * 100).toFixed(1)) : 0;

  const summary: Summary = {
    total_omzet: totalOmzet,
    total_botol: totalBotol,
    total_closing: totalClosing,
    rata_upsell: avg(shop, (r) => r.upsell),
    rata_cac: avg(shop, (r) => r.cac_total),
    rata_cac_ads: avg(shop, (r) => r.cac_ads),
    total_biaya_iklan: totalBiayaIklan,
    total_komisi_aff: totalKomisiAff,
    total_cost: totalCost,
    roas,
    cost_per_closing: costPerClosing,
    cost_per_botol: costPerBotol,
    margin_after_cost: marginAfterCost,
    total_omzet_all: totalOmzetAll,
    total_omzet_fv: totalOmzetFV,
    pct_kontribusi_fv: pct(totalOmzetFV, totalOmzetAll),
    hari,
    avg_omzet_harian: hari > 0 ? Math.round(totalOmzet / hari) : 0,
    avg_closing_harian: hari > 0 ? Math.round(totalClosing / hari) : 0,
    avg_botol_harian: hari > 0 ? Math.round(totalBotol / hari) : 0,
    nilai_per_txn: totalClosing > 0 ? Math.round(totalOmzet / totalClosing) : 0,
  };

  // Weekly grouping (same as API route groupByWeek)
  const weekly: WeeklyRow[] = [];
  for (let i = 0; i < shopMerged.length; i += 7) {
    const chunk = shopMerged.slice(i, i + 7);
    const wOmzet = chunk.reduce((a, r) => a + r.omzet, 0);
    const wClosing = chunk.reduce((a, r) => a + r.closing, 0);
    const wBotol = chunk.reduce((a, r) => a + r.botol, 0);
    const prev = weekly[weekly.length - 1];
    weekly.push({
      label: `Minggu ${weekly.length + 1}`,
      hari: chunk.length,
      total_omzet: wOmzet,
      total_closing: wClosing,
      total_botol: wBotol,
      rata_upsell: chunk.reduce((a, r) => a + r.upsell, 0) / chunk.length,
      rata_cac: chunk.reduce((a, r) => a + r.cac_total, 0) / chunk.length,
      rata_omzet_harian: wOmzet / chunk.length,
      wow_omzet: prev && prev.total_omzet > 0 ? parseFloat(((wOmzet - prev.total_omzet) / prev.total_omzet * 100).toFixed(1)) : 0,
      wow_closing: prev && prev.total_closing > 0 ? parseFloat(((wClosing - prev.total_closing) / prev.total_closing * 100).toFixed(1)) : 0,
    });
  }

  // Channel summaries (same as API route channelSummary)
  const chanSum = (rows: (ChannelRow | HarianRow)[]): ChannelSummary => {
    const total_omzet = sum(rows, (r) => r.omzet);
    const total_closing = sum(rows, (r) => r.closing);
    const total_botol = sum(rows, (r) => r.botol);
    const total_biaya_iklan = sum(rows, (r) => r.biaya_iklan);
    return {
      total_omzet,
      total_closing,
      total_botol,
      total_biaya_iklan,
      rata_upsell: avg(rows, (r) => r.upsell),
      rata_cac: avg(rows, (r) => r.cac_total),
      hari: rows.length,
      roi: total_biaya_iklan > 0 ? parseFloat((total_omzet / total_biaya_iklan).toFixed(2)) : 0,
      cost_per_closing: total_closing > 0 ? Math.round(total_biaya_iklan / total_closing) : 0,
      cost_per_botol: total_botol > 0 ? Math.round(total_biaya_iklan / total_botol) : 0,
      omzet_per_closing: total_closing > 0 ? Math.round(total_omzet / total_closing) : 0,
      bottle_per_closing: total_closing > 0 ? parseFloat((total_botol / total_closing).toFixed(2)) : 0,
    };
  };

  // Highlights (same as API route)
  const sorted = [...shop].sort((a, b) => b.omzet - a.omzet);
  const avgOmzet = hari > 0 ? totalOmzet / hari : 0;
  const stdDev = Math.sqrt(avg(shop, (r) => Math.pow(r.omzet - avgOmzet, 2)));
  const anomalies = shop
    .filter((r) => Math.abs(r.omzet - avgOmzet) > 1.5 * stdDev)
    .map((r) => ({
      tanggal: r.tanggal, omzet: r.omzet,
      type: (r.omzet > avgOmzet ? "spike" : "drop") as "spike" | "drop",
      deviation: parseFloat(((r.omzet - avgOmzet) / avgOmzet * 100).toFixed(1)),
    }));

  return {
    summary,
    harian: shopMerged,
    weekly,
    channels: {
      shop: chanSum(shop),
      video: chanSum(video),
      live: chanSum(live),
      shop_tab: chanSum(shopTab),
      affiliate: chanSum(affiliate),
    },
    channel_data: { video, live, shop_tab: shopTab, affiliate },
    evaluasi_per_brand: {
      freshvision: totalOmzetFV,
      nutriflakes: evaluasi.length > 0 ? sum(evaluasi, (r) => r.omzet_nutriflakes) : 0,
      freshmag: evaluasi.length > 0 ? sum(evaluasi, (r) => r.omzet_freshmag) : 0,
      etawaku: evaluasi.length > 0 ? sum(evaluasi, (r) => r.omzet_etawaku) : 0,
      total: totalOmzetAll,
    },
    highlights: {
      best_day: sorted[0] ? { tanggal: sorted[0].tanggal, omzet: sorted[0].omzet } : null,
      worst_day: sorted[sorted.length - 1] ? { tanggal: sorted[sorted.length - 1].tanggal, omzet: sorted[sorted.length - 1].omzet } : null,
      anomalies,
    },
  };
}

interface ImportResult {
  response: ApiResponse;
  period: string;
}

function parseImportedExcel(file: File): Promise<ImportResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });

        console.log("[Excel Import] Sheets found:", wb.SheetNames);

        // ─── Find each sheet ───
        // SHOP excludes "shop tab", "200 ml", "130ml" to avoid false match with sub-product sheets
        const shopMatch = findSheet(wb, SHEET_PATTERNS.SHOP, ["shop tab", "200 ml", "200ml", "130ml", "130 ml"]);
        const videoMatch = findSheet(wb, SHEET_PATTERNS.VIDEO);
        const liveMatch = findSheet(wb, SHEET_PATTERNS.LIVE);
        const shopTabMatch = findSheet(wb, SHEET_PATTERNS.SHOP_TAB);
        const affiliateMatch = findSheet(wb, SHEET_PATTERNS.AFFILIATE);
        const evaluasiMatch = findSheet(wb, SHEET_PATTERNS.EVALUASI);
        const proporsiMatch = findSheet(wb, SHEET_PATTERNS.PROPORSI);

        console.log("[Excel Import] Matched sheets:", {
          shop: shopMatch?.name ?? "NOT FOUND",
          video: videoMatch?.name ?? "NOT FOUND",
          live: liveMatch?.name ?? "NOT FOUND",
          shopTab: shopTabMatch?.name ?? "NOT FOUND",
          affiliate: affiliateMatch?.name ?? "NOT FOUND",
          evaluasi: evaluasiMatch?.name ?? "NOT FOUND",
          proporsi: proporsiMatch?.name ?? "NOT FOUND",
        });

        // Parse SHOP (required) — try named sheet first, else try first/largest sheet
        let shopResult: { shop: HarianRow[]; period: string };
        if (shopMatch) {
          shopResult = parseShopSheet(shopMatch.rows);
        } else {
          // Fallback: try all sheets, pick the one with most data
          let best: { shop: HarianRow[]; period: string } = { shop: [], period: "" };
          for (const sheetName of wb.SheetNames) {
            const ws = wb.Sheets[sheetName];
            const r2: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
            if (!r2 || r2.length < 3) continue;
            const r = parseShopSheet(r2);
            if (r.shop.length > best.shop.length) best = r;
          }
          shopResult = best;
        }

        if (!shopResult.shop.length) {
          reject(new Error("Tidak ada data SHOP valid ditemukan di file Excel."));
          return;
        }

        // Parse channels — exact same column indices as googleSheets.ts
        // VIDEO/LIVE/SHOP_TAB use layout with biaya_iklan column → omzet at H (idx 7)
        // AFFILIATE only has no biaya_iklan column → omzet at F (idx 5)
        const video     = videoMatch    ? parseVideoLiveShopTabSheet(videoMatch.rows, "VIDEO")       : [];
        const live      = liveMatch     ? parseVideoLiveShopTabSheet(liveMatch.rows, "LIVE")         : [];
        const shopTab   = shopTabMatch  ? parseVideoLiveShopTabSheet(shopTabMatch.rows, "SHOP_TAB")  : [];
        const affiliate = affiliateMatch ? parseAffiliateSheet(affiliateMatch.rows)                  : [];

        // Brand/evaluasi data: try PROPORSI first (simpler layout), then EVALUASI
        let evaluasi: EvalRow[] = [];
        if (proporsiMatch) {
          evaluasi = parseProporsiSheet(proporsiMatch.rows);
          console.log(`[Excel Import] PROPORSI → ${evaluasi.length} rows`);
        }
        if (evaluasi.length === 0 && evaluasiMatch) {
          evaluasi = parseEvaluasiSheet(evaluasiMatch.rows);
          console.log(`[Excel Import] EVALUASI fallback → ${evaluasi.length} rows`);
        }

        console.log("[Excel Import] Parsed rows:", {
          shop: shopResult.shop.length, video: video.length, live: live.length,
          shopTab: shopTab.length, affiliate: affiliate.length, evaluasi: evaluasi.length,
        });

        // Build full response — same as API route
        const response = buildFullApiResponse(shopResult.shop, video, live, shopTab, affiliate, evaluasi);

        // Stamp period into the response so it's persisted with the data
        const period = shopResult.period || "";
        if (period) response.period = period;

        console.log("[Excel Import] Final Summary:", {
          period,
          omzet: response.summary.total_omzet,
          closing: response.summary.total_closing,
          botol: response.summary.total_botol,
          biayaIklan: response.summary.total_biaya_iklan,
          komisiAff: response.summary.total_komisi_aff,
          evaluasiRows: evaluasi.length,
          brandFV: response.evaluasi_per_brand.freshvision,
          brandTotal: response.evaluasi_per_brand.total,
          channels: {
            shop: response.channels.shop?.total_omzet,
            video: response.channels.video?.total_omzet,
            live: response.channels.live?.total_omzet,
            shop_tab: response.channels.shop_tab?.total_omzet,
            affiliate: response.channels.affiliate?.total_omzet,
          },
        });

        resolve({ response, period });
      } catch (err: any) {
        reject(new Error("Gagal parse Excel: " + (err?.message || err)));
      }
    };
    reader.onerror = () => reject(new Error("Gagal membaca file."));
    reader.readAsArrayBuffer(file);
  });
}

function healthScore(s: Summary, target: number): { score: number; label: string; color: string } {
  let score = 0;
  // Omzet vs target (40 pts)
  const pctTarget = Math.min(s.total_omzet / target, 1);
  score += pctTarget * 40;
  // Upsell (20 pts) — 1.3x = 20, 1.0x = 0
  score += Math.min(((s.rata_upsell - 1) / 0.3) * 20, 20);
  // CAC (20 pts) — <50% = 20, >70% = 0
  score += Math.max(0, Math.min(((70 - s.rata_cac) / 20) * 20, 20));
  // ROAS (20 pts) — >4 = 20, <2 = 0
  score += Math.min(Math.max(0, (s.roas - 2) / 2) * 20, 20);

  score = Math.round(Math.max(0, Math.min(100, score)));
  if (score >= 80) return { score, label: "Excellent", color: "text-green-600" };
  if (score >= 60) return { score, label: "Good", color: "text-blue-600" };
  if (score >= 40) return { score, label: "Needs Improvement", color: "text-yellow-600" };
  return { score, label: "Critical", color: "text-red-600" };
}

// ═══════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════
export default function LaporanHarianScreen() {
  // ─── Live data from Google Sheets (current month) ───
  const { data: liveData, error, isLoading, mutate } = useSWR<ApiResponse>("/api/laporan-harian", fetcher, { refreshInterval: 5 * 60 * 1000 });

  // ─── Month & data management ───
  const [selectedPeriod, setSelectedPeriod] = useState<string>("live");
  const [savedPeriods, setSavedPeriods] = useState<{ period: string; saved_at: string }[]>([]);
  const [savedData, setSavedData] = useState<ApiResponse | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const prevPeriodRef = useRef<string>("live");

  // ─── Data mode: "live" | "saved" | "imported" ───
  const [dataMode, setDataMode] = useState<"live" | "saved" | "imported">("live");

  // ─── Import state ───
  const [isImporting, setIsImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importPeriod, setImportPeriod] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // ─── UI state ───
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [showSettings, setShowSettings] = useState(false);
  const { target, setTarget } = useTarget();

  // ─── MoM comparison: previous month's data ───
  const [prevMonthData, setPrevMonthData] = useState<ApiResponse | null>(null);
  const [prevMonthPeriod, setPrevMonthPeriod] = useState<string>("");

  // ─── Load saved periods list ───
  useEffect(() => {
    listLaporanHarianPeriods()
      .then(setSavedPeriods)
      .catch(() => {});
  }, []);

  // ─── Auto-save live data when it arrives (only in live mode) ───
  const autoSaveRef = useRef(false);
  useEffect(() => {
    if (!liveData?.summary || autoSaveRef.current) return;
    if (dataMode !== "live") return; // Don't auto-save when viewing imported/saved data
    autoSaveRef.current = true;
    const period = detectPeriodFromData(liveData);
    saveLaporanHarianData(period, liveData)
      .then(() => {
        listLaporanHarianPeriods().then(setSavedPeriods).catch(() => {});
      })
      .catch(() => {});
  }, [liveData, dataMode]);

  useEffect(() => { if (liveData?.summary) setLastUpdate(new Date()); }, [liveData]);

  // ─── Save current data before switching months ───
  const saveCurrentBeforeSwitch = useCallback(async (currentPeriod: string, dataToSave: ApiResponse | null) => {
    if (!dataToSave?.summary) return;
    const period = currentPeriod === "live" ? detectPeriodFromData(dataToSave) : currentPeriod;
    try {
      await saveLaporanHarianData(period, dataToSave);
      const periods = await listLaporanHarianPeriods();
      setSavedPeriods(periods);
    } catch {}
  }, []);

  // ─── Switch month handler ───
  const handlePeriodChange = useCallback(async (newPeriod: string) => {
    const oldPeriod = prevPeriodRef.current;
    const oldData = oldPeriod === "live" ? liveData : savedData;

    // Auto-save old month before switching
    if (oldPeriod !== newPeriod) {
      await saveCurrentBeforeSwitch(oldPeriod, oldData || null);
    }

    setSelectedPeriod(newPeriod);
    prevPeriodRef.current = newPeriod;
    setSaveMsg(null);
    setImportMsg(null);

    if (newPeriod === "live") {
      setSavedData(null);
      setDataMode("live");
      return;
    }

    setDataMode("saved");

    // Load saved data for selected month
    setIsLoadingSaved(true);
    try {
      const loaded = await loadLaporanHarianData(newPeriod);
      setSavedData(loaded);
    } catch (err: any) {
      setSaveMsg({ type: "err", text: "Gagal memuat data: " + (err?.message || err) });
      setSavedData(null);
    } finally {
      setIsLoadingSaved(false);
    }
  }, [liveData, savedData, saveCurrentBeforeSwitch]);

  // ─── Manual save handler ───
  const handleManualSave = useCallback(async () => {
    const currentData = selectedPeriod === "live" ? liveData : savedData;
    if (!currentData?.summary) return;
    const period = selectedPeriod === "live" ? detectPeriodFromData(currentData) : selectedPeriod;
    setIsSaving(true);
    setSaveMsg(null);
    try {
      await saveLaporanHarianData(period, currentData);
      const periods = await listLaporanHarianPeriods();
      setSavedPeriods(periods);
      setSaveMsg({ type: "ok", text: `Data ${formatPeriod(period)} berhasil disimpan!` });
    } catch (err: any) {
      setSaveMsg({ type: "err", text: "Gagal menyimpan: " + (err?.message || err) });
    } finally {
      setIsSaving(false);
    }
  }, [selectedPeriod, liveData, savedData]);

  // ─── Import Excel handler ───
  const handleImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.match(/\.xlsx?$/i) && !file.name.match(/\.csv$/i)) {
      setImportMsg({ type: "err", text: "Hanya file .xlsx, .xls, atau .csv yang diterima." });
      return;
    }
    setIsImporting(true);
    setImportMsg(null);
    try {
      const { response, period: detectedPeriod } = await parseImportedExcel(file);
      const period = importPeriod || detectedPeriod || getCurrentPeriod();

      await saveLaporanHarianData(period, response);
      const periods = await listLaporanHarianPeriods();
      setSavedPeriods(periods);

      setSavedData(response);
      setSelectedPeriod(period);
      prevPeriodRef.current = period;
      setDataMode("imported");
      const chCount = [response.channel_data.video, response.channel_data.live, response.channel_data.shop_tab, response.channel_data.affiliate].filter(c => c.length > 0).length;
      setImportMsg({ type: "ok", text: `Berhasil import ${response.harian.length} hari data + ${chCount} channel untuk ${formatPeriod(period)}!` });
      setShowImportModal(false);
    } catch (err: any) {
      setImportMsg({ type: "err", text: err?.message || "Gagal import file." });
    } finally {
      setIsImporting(false);
      if (e.target) e.target.value = "";
    }
  }, [importPeriod]);

  // ─── Delete saved month ───
  const handleDeletePeriod = useCallback(async (period: string) => {
    if (!confirm(`Hapus data ${formatPeriod(period)}?`)) return;
    try {
      await deleteLaporanHarianData(period);
      const periods = await listLaporanHarianPeriods();
      setSavedPeriods(periods);
      if (selectedPeriod === period) {
        setSelectedPeriod("live");
        prevPeriodRef.current = "live";
        setSavedData(null);
      }
      setSaveMsg({ type: "ok", text: `Data ${formatPeriod(period)} berhasil dihapus.` });
    } catch (err: any) {
      setSaveMsg({ type: "err", text: "Gagal menghapus: " + (err?.message || err) });
    }
  }, [selectedPeriod]);

  // ─── Determine active data ───
  const isLive = selectedPeriod === "live";
  const activeData = isLive ? liveData : savedData;

  // ─── Auto-load previous month for MoM comparison ───
  useEffect(() => {
    if (!activeData?.summary) {
      setPrevMonthData(null);
      setPrevMonthPeriod("");
      return;
    }
    const currentPeriod = isLive ? detectPeriodFromData(activeData) : selectedPeriod;
    const prevPeriod = getPreviousPeriod(currentPeriod);
    if (!prevPeriod) {
      setPrevMonthData(null);
      setPrevMonthPeriod("");
      return;
    }
    if (prevPeriod === prevMonthPeriod && prevMonthData) return; // already loaded
    loadLaporanHarianData(prevPeriod)
      .then((d) => {
        setPrevMonthData(d);
        setPrevMonthPeriod(prevPeriod);
      })
      .catch(() => {
        setPrevMonthData(null);
        setPrevMonthPeriod(prevPeriod);
      });
  }, [activeData, isLive, selectedPeriod, prevMonthPeriod, prevMonthData]);

  if (isLoading && isLive) return <LoadingState />;
  if (isLoadingSaved) return <LoadingState />;
  if (isLive && (error || !liveData?.summary)) return <ErrorState error={error} data={liveData} onRetry={() => mutate()} />;
  if (!isLive && !savedData?.summary) {
    return (
      <div className="space-y-5 pb-10">
        <MonthHeader
          selectedPeriod={selectedPeriod} savedPeriods={savedPeriods}
          onPeriodChange={handlePeriodChange} onImport={() => setShowImportModal(true)}
          onSave={handleManualSave} isSaving={isSaving} isLive={isLive}
          onDelete={handleDeletePeriod}
        />
        {saveMsg && <MsgBanner type={saveMsg.type} text={saveMsg.text} />}
        <div className="flex items-center justify-center py-24">
          <div className="text-center max-w-sm space-y-3">
            <Database size={36} className="text-gray-300 mx-auto" />
            <h2 className="font-bold text-gray-900">Belum Ada Data</h2>
            <p className="text-sm text-gray-500">Tidak ada data tersimpan untuk {formatPeriod(selectedPeriod)}. Import file Excel untuk menambahkan data.</p>
            <button onClick={() => setShowImportModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-1.5">
              <Upload size={14} /> Import Excel
            </button>
          </div>
        </div>
        {showImportModal && <ImportModal importPeriod={importPeriod} setImportPeriod={setImportPeriod} onImport={handleImport} onClose={() => setShowImportModal(false)} isImporting={isImporting} importMsg={importMsg} fileRef={fileRef} />}
      </div>
    );
  }

  const data = activeData!;
  const { summary: s, harian, weekly, channels, channel_data, evaluasi_per_brand, highlights } = data;
  const health = healthScore(s, target);

  const handleExport = (type: "pdf" | "ppt") => {
    const exportData = {
      summary: s, harian, channels, weekly, evaluasi_per_brand, highlights,
      target, healthScore: health.score, healthLabel: health.label,
    };
    if (type === "pdf") generatePdf(exportData);
    else generatePpt(exportData);
  };
  const tabs = [
    { key: "overview", label: "Overview", icon: <BarChart3 size={14} /> },
    { key: "cost", label: "Cost Analysis", icon: <DollarSign size={14} /> },
    { key: "channels", label: "Per Channel", icon: <Zap size={14} /> },
    { key: "weekly", label: "Evaluasi Mingguan", icon: <Target size={14} /> },
  ];

  return (
    <div className="space-y-5 pb-10">
      {/* ═══ MONTH SELECTOR & HEADER ═══ */}
      <MonthHeader
        selectedPeriod={selectedPeriod} savedPeriods={savedPeriods}
        onPeriodChange={handlePeriodChange} onImport={() => setShowImportModal(true)}
        onSave={handleManualSave} isSaving={isSaving} isLive={isLive}
        onDelete={handleDeletePeriod}
      />
      {saveMsg && <MsgBanner type={saveMsg.type} text={saveMsg.text} />}
      {importMsg && <MsgBanner type={importMsg.type} text={importMsg.text} />}

      {/* ═══ HEADER ═══ */}
      <div className="bg-white rounded-2xl border p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Laporan Harian FreshVision
                {!isLive && <span className="text-base font-medium text-gray-400 ml-2">— {formatPeriod(selectedPeriod)}</span>}
              </h1>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                <span>Update: {lastUpdate ? lastUpdate.toLocaleString("id-ID") : "—"}</span>
                {dataMode === "live" && <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 animate-pulse">● Live</span>}
                {dataMode === "imported" && <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600"><Upload size={10} /> Data Diimport</span>}
                {dataMode === "saved" && <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600"><Database size={10} /> Data Tersimpan</span>}
              </div>
            </div>
            {/* Health Score Badge */}
            <div className="hidden sm:flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
              <div className={`text-2xl font-black ${health.color}`}>{health.score}</div>
              <div className="text-[10px] leading-tight">
                <div className="font-bold text-gray-600">Health Score</div>
                <div className={`font-semibold ${health.color}`}>{health.label}</div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setShowSettings(true)} className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50 text-sm transition">
              <Settings size={14} /> Setting
            </button>
            <button onClick={() => handleExport("pdf")} className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50 text-sm transition">
              <FileDown size={14} /> PDF
            </button>
            <button onClick={() => handleExport("ppt")} className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50 text-sm transition">
              <Presentation size={14} /> PPT
            </button>
            {isLive && (
              <button onClick={() => mutate()} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition">
                <RefreshCw size={14} /> Refresh
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ═══ SETTINGS MODAL ═══ */}
      {showSettings && <SettingsModal target={target} onSave={setTarget} onClose={() => setShowSettings(false)} />}
      {/* ═══ IMPORT MODAL ═══ */}
      {showImportModal && <ImportModal importPeriod={importPeriod} setImportPeriod={setImportPeriod} onImport={handleImport} onClose={() => setShowImportModal(false)} isImporting={isImporting} importMsg={importMsg} fileRef={fileRef} />}

      {/* ═══ EXECUTIVE SUMMARY ═══ */}
      <ExecutiveSummary s={s} target={target} health={health} highlights={highlights} prevMonthData={prevMonthData} prevMonthPeriod={prevMonthPeriod} />

      {/* ═══ TAB BAR ═══ */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${activeTab === t.key ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ═══ TAB CONTENT ═══ */}
      {activeTab === "overview" && (
        <OverviewTab
          s={s}
          target={target}
          harian={harian}
          evaluasi={evaluasi_per_brand}
          snapshot={data}
          prevSnapshot={prevMonthData}
          periodKey={isLive ? detectPeriodFromData(data) : selectedPeriod}
        />
      )}
      {activeTab === "cost" && <CostTab s={s} harian={harian} />}
      {activeTab === "channels" && <ChannelsTab channels={channels} channelData={channel_data} />}
      {activeTab === "weekly" && <WeeklyTab weekly={weekly} s={s} target={target} harian={harian} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MONTH HEADER / SELECTOR
// ═══════════════════════════════════════════════════════════
function MonthHeader({
  selectedPeriod, savedPeriods, onPeriodChange, onImport, onSave, isSaving, isLive, onDelete,
}: {
  selectedPeriod: string;
  savedPeriods: { period: string; saved_at: string }[];
  onPeriodChange: (p: string) => void;
  onImport: () => void;
  onSave: () => void;
  isSaving: boolean;
  isLive: boolean;
  onDelete: (p: string) => void;
}) {
  return (
    <div className="bg-white rounded-2xl border p-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Calendar size={16} className="text-gray-400" />
          <span className="text-sm font-medium text-gray-600">Periode:</span>
          {/* Live button */}
          <button
            onClick={() => onPeriodChange("live")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              isLive
                ? "bg-red-50 text-red-700 border border-red-200 ring-1 ring-red-200"
                : "bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100"
            }`}
          >
            <span className="inline-flex items-center gap-1">
              {isLive && <span className="animate-pulse">●</span>} Live
            </span>
          </button>
          {/* Saved months */}
          {savedPeriods.map((sp) => (
            <div key={sp.period} className="relative group">
              <button
                onClick={() => onPeriodChange(sp.period)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  selectedPeriod === sp.period
                    ? "bg-blue-50 text-blue-700 border border-blue-200 ring-1 ring-blue-200"
                    : "bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100"
                }`}
              >
                {formatPeriod(sp.period)}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(sp.period); }}
                className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Hapus data"
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onImport} className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-xs font-medium transition">
            <Upload size={13} /> Import Excel
          </button>
          <button onClick={onSave} disabled={isSaving} className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white px-3 py-2 rounded-lg text-xs font-medium transition">
            {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            {isSaving ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// IMPORT MODAL
// ═══════════════════════════════════════════════════════════
function ImportModal({
  importPeriod, setImportPeriod, onImport, onClose, isImporting, importMsg, fileRef,
}: {
  importPeriod: string;
  setImportPeriod: (v: string) => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClose: () => void;
  isImporting: boolean;
  importMsg: { type: "ok" | "err"; text: string } | null;
  fileRef: React.RefObject<HTMLInputElement | null>;
}) {
  const months = [];
  for (let y = 2025; y <= 2027; y++) {
    for (let m = 1; m <= 12; m++) {
      months.push(`${y}-${String(m).padStart(2, "0")}`);
    }
  }
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-gray-900">Import Data Laporan Harian</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Pilih Bulan (Opsional)</label>
          <select
            value={importPeriod}
            onChange={(e) => setImportPeriod(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          >
            <option value="">Auto-detect dari file</option>
            {months.map((m) => (
              <option key={m} value={m}>{formatPeriod(m)}</option>
            ))}
          </select>
          <p className="text-[11px] text-gray-400 mt-1">Jika tidak dipilih, bulan akan dideteksi otomatis dari kolom tanggal di Excel.</p>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">File Excel (.xlsx / .xls)</label>
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-blue-300 transition cursor-pointer"
            onClick={() => fileRef.current?.click()}
          >
            <Upload size={24} className="text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Klik untuk pilih file atau drag & drop</p>
            <p className="text-[10px] text-gray-400 mt-1">Kolom wajib: Tanggal, Omzet. Kolom opsional: Closing, Botol, Upsell, CAC, Biaya Iklan, Komisi Affiliate</p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={onImport}
            className="hidden"
          />
        </div>
        {isImporting && (
          <div className="flex items-center gap-2 text-sm text-blue-600">
            <Loader2 size={14} className="animate-spin" /> Memproses file...
          </div>
        )}
        {importMsg && <MsgBanner type={importMsg.type} text={importMsg.text} />}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MESSAGE BANNER
// ═══════════════════════════════════════════════════════════
function MsgBanner({ type, text }: { type: "ok" | "err"; text: string }) {
  return (
    <div className={`text-xs px-4 py-2.5 rounded-xl border flex items-center gap-2 ${
      type === "ok" ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"
    }`}>
      {type === "ok" ? <Check size={14} /> : <AlertTriangle size={14} />}
      {text}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// LOADING & ERROR STATES
// ═══════════════════════════════════════════════════════════
function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`bg-gray-200 rounded-lg animate-pulse ${className}`} />;
}
function LoadingState() {
  return (
    <div className="space-y-5 pb-10">
      {/* Header skeleton */}
      <div className="bg-white rounded-2xl border p-5">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-3 w-40" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-20 rounded-lg" />
            <Skeleton className="h-9 w-16 rounded-lg" />
            <Skeleton className="h-9 w-16 rounded-lg" />
            <Skeleton className="h-9 w-24 rounded-lg" />
          </div>
        </div>
      </div>
      {/* Executive summary skeleton */}
      <div className="bg-white rounded-2xl border p-5 space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between"><Skeleton className="h-4 w-48" /><Skeleton className="h-4 w-16" /></div>
          <Skeleton className="h-3 w-full rounded-full" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="text-center space-y-1.5">
              <Skeleton className="h-3 w-12 mx-auto" />
              <Skeleton className="h-5 w-20 mx-auto" />
              <Skeleton className="h-3 w-14 mx-auto" />
            </div>
          ))}
        </div>
        <Skeleton className="h-8 w-full rounded-lg" />
      </div>
      {/* Tabs skeleton */}
      <div className="flex gap-1"><Skeleton className="h-9 w-28 rounded-lg" /><Skeleton className="h-9 w-28 rounded-lg" /><Skeleton className="h-9 w-28 rounded-lg" /><Skeleton className="h-9 w-36 rounded-lg" /></div>
      {/* Chart skeleton */}
      <div className="bg-white rounded-2xl border p-5 space-y-3">
        <Skeleton className="h-5 w-44" />
        <Skeleton className="h-[300px] w-full rounded-xl" />
      </div>
      {/* Two-col skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border p-5 space-y-3"><Skeleton className="h-5 w-36" /><Skeleton className="h-[260px] w-full rounded-xl" /></div>
        <div className="bg-white rounded-2xl border p-5 space-y-3"><Skeleton className="h-5 w-36" /><Skeleton className="h-[260px] w-full rounded-xl" /></div>
      </div>
      <div className="text-center text-xs text-gray-400 animate-pulse">Memuat data dari Google Sheets…</div>
    </div>
  );
}
function ErrorState({ error, data, onRetry }: { error: unknown; data: unknown; onRetry: () => void }) {
  const msg = (error as Error)?.message || (data as { error?: string })?.error || "Gagal memuat data";
  return (
    <div className="flex items-center justify-center py-24">
      <div className="text-center max-w-sm space-y-3">
        <AlertTriangle size={36} className="text-red-400 mx-auto" />
        <h2 className="font-bold text-gray-900">Gagal Memuat Data</h2>
        <p className="text-sm text-gray-500">{msg}</p>
        <button onClick={onRetry} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-1.5"><RefreshCw size={14} /> Coba Lagi</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SETTINGS MODAL
// ═══════════════════════════════════════════════════════════
function SettingsModal({ target, onSave, onClose }: { target: number; onSave: (v: number) => void; onClose: () => void }) {
  const [val, setVal] = useState(String(target));
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-gray-900">⚙️ Pengaturan Dashboard</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Target Omzet Bulanan</label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Rp</span>
            <input type="number" value={val} onChange={(e) => setVal(e.target.value)}
              className="flex-1 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
          </div>
          <div className="flex gap-2 mt-2 flex-wrap">
            {[200_000_000, 300_000_000, 350_000_000, 400_000_000, 500_000_000].map((v) => (
              <button key={v} onClick={() => setVal(String(v))} className={`text-xs px-2.5 py-1 rounded-full border transition ${parseInt(val) === v ? "bg-blue-50 border-blue-300 text-blue-700" : "hover:bg-gray-50 text-gray-500"}`}>
                {fR(v)}
              </button>
            ))}
          </div>
        </div>
        <button onClick={() => { onSave(parseInt(val) || 350_000_000); onClose(); }}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 transition">
          <Save size={14} /> Simpan
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// EXECUTIVE SUMMARY
// ═══════════════════════════════════════════════════════════
// ─── MoM helper: compute % delta safely ───
// Returns null when previous value is 0 (can't compute %).
// Higher-is-better sets the color; for inverse metrics (CAC) flip with isInverse.
function pctDelta(curr: number, prev: number): number | null {
  if (!prev || prev === 0) return null;
  return parseFloat((((curr - prev) / prev) * 100).toFixed(1));
}

function ExecutiveSummary({ s, target, health, highlights, prevMonthData, prevMonthPeriod }: { s: Summary; target: number; health: { score: number; label: string; color: string }; highlights: Highlights; prevMonthData?: ApiResponse | null; prevMonthPeriod?: string }) {
  const pctTarget = (s.total_omzet / target) * 100;
  const sisaTarget = Math.max(0, target - s.total_omzet);
  const sisaHari = Math.max(1, 30 - s.hari);
  const needPerDay = sisaTarget / sisaHari;
  const onTrack = s.avg_omzet_harian >= (target / 30);

  // ─── MoM deltas (only computed when prev data exists & has summary) ───
  const prev = prevMonthData?.summary;
  const deltas = prev ? {
    omzet:   pctDelta(s.total_omzet, prev.total_omzet),
    avgDay:  pctDelta(s.avg_omzet_harian, prev.avg_omzet_harian),
    botol:   pctDelta(s.total_botol, prev.total_botol),
    nilai:   pctDelta(s.nilai_per_txn, prev.nilai_per_txn),
    upsell:  pctDelta(s.rata_upsell, prev.rata_upsell),
    cac:     pctDelta(s.rata_cac, prev.rata_cac),
    roas:    pctDelta(s.roas, prev.roas),
  } : null;

  const prevLabel = prevMonthPeriod ? `vs ${formatPeriod(prevMonthPeriod).split(" ")[0]}` : "";

  const alerts: { type: "success" | "warning" | "danger"; text: string }[] = [];
  if (pctTarget >= 100) alerts.push({ type: "success", text: "🎉 Target bulanan sudah tercapai!" });
  else if (onTrack) alerts.push({ type: "success", text: `✅ On track — pace saat ini ${fR(s.avg_omzet_harian)}/hari sudah cukup` });
  else alerts.push({ type: "warning", text: `⚠️ Butuh ${fR(Math.round(needPerDay))}/hari di ${sisaHari} hari tersisa untuk capai target` });

  if (s.rata_cac > 60) alerts.push({ type: "danger", text: `🔴 CAC ${s.rata_cac.toFixed(1)}% terlalu tinggi — evaluasi spending iklan` });
  if (s.rata_upsell < 1.1) alerts.push({ type: "danger", text: `🔴 Upsell ${s.rata_upsell.toFixed(2)}x sangat rendah — push bundling/promo` });
  if (s.roas < 2.5) alerts.push({ type: "warning", text: `⚠️ ROAS ${s.roas.toFixed(1)}x rendah — iklan kurang efisien` });

  // MoM-driven alerts (only when delta available)
  if (deltas?.omzet != null && deltas.omzet <= -10) {
    alerts.push({ type: "warning", text: `📉 Omzet turun ${Math.abs(deltas.omzet)}% ${prevLabel} — investigasi penyebabnya` });
  }
  if (deltas?.cac != null && deltas.cac >= 15) {
    alerts.push({ type: "danger", text: `🔴 CAC naik ${deltas.cac}% ${prevLabel} — biaya akuisisi makin mahal` });
  }
  if (deltas?.omzet != null && deltas.omzet >= 20) {
    alerts.push({ type: "success", text: `🚀 Omzet naik ${deltas.omzet}% ${prevLabel} — pertahankan momentum!` });
  }

  if (highlights.anomalies.length > 0) {
    highlights.anomalies.forEach((a) => {
      if (a.type === "drop") alerts.push({ type: "warning", text: `📉 Anomali: ${a.tanggal} omzet turun ${Math.abs(a.deviation)}% dari rata-rata` });
    });
  }

  const alertColors = { success: "bg-green-50 border-green-200 text-green-800", warning: "bg-yellow-50 border-yellow-200 text-yellow-800", danger: "bg-red-50 border-red-200 text-red-800" };

  return (
    <div className="bg-white rounded-2xl border p-5 space-y-4">
      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between text-sm mb-1.5">
          <span className="font-medium text-gray-700">Progress Target: <strong>{fR(s.total_omzet)}</strong> / {fR(target)}</span>
          <span className={`font-bold ${pctTarget >= 100 ? "text-green-600" : pctTarget >= 70 ? "text-blue-600" : "text-orange-600"}`}>{pctTarget.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
          <div className={`h-3 rounded-full transition-all duration-700 ${pctTarget >= 100 ? "bg-green-500" : pctTarget >= 70 ? "bg-blue-500" : "bg-orange-500"}`}
            style={{ width: `${Math.min(pctTarget, 100)}%` }} />
        </div>
      </div>
      {/* MoM badge */}
      {deltas && (
        <div className="flex items-center gap-2 text-[11px] text-gray-500">
          <span className="font-medium">Bandingkan:</span>
          <span className="bg-gray-50 px-2 py-0.5 rounded border">{prevLabel}</span>
        </div>
      )}
      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <MiniKpi label="Omzet" value={fR(s.total_omzet)} sub={`${s.hari} hari`} delta={deltas?.omzet} />
        <MiniKpi label="Avg/Hari" value={fR(s.avg_omzet_harian)} sub={`${fN(s.avg_closing_harian)} closing`} delta={deltas?.avgDay} />
        <MiniKpi label="Botol" value={fN(s.total_botol)} sub={`~${fN(s.avg_botol_harian)}/hari`} delta={deltas?.botol} />
        <MiniKpi label="Nilai/Txn" value={fR(s.nilai_per_txn)} sub={`${fN(s.total_closing)} txn`} delta={deltas?.nilai} />
        <MiniKpi label="Upsell" value={`${s.rata_upsell.toFixed(2)}x`} sub={s.rata_upsell >= 1.3 ? "🟢 Baik" : s.rata_upsell >= 1.1 ? "🟡 Cukup" : "🔴 Rendah"} delta={deltas?.upsell} />
        <MiniKpi label="CAC" value={`${s.rata_cac.toFixed(1)}%`} sub={s.rata_cac <= 50 ? "🟢 Efisien" : s.rata_cac <= 60 ? "🟡 Normal" : "🔴 Tinggi"} delta={deltas?.cac} isInverse />
        <MiniKpi label="ROAS" value={`${s.roas.toFixed(1)}x`} sub={s.roas >= 4 ? "🟢 Excellent" : s.roas >= 3 ? "🟡 OK" : "🔴 Low"} delta={deltas?.roas} />
      </div>
      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-1.5">
          {alerts.map((a, i) => (
            <div key={i} className={`text-xs px-3 py-2 rounded-lg border ${alertColors[a.type]}`}>{a.text}</div>
          ))}
        </div>
      )}
      {/* Best / Worst */}
      {highlights.best_day && highlights.worst_day && (
        <div className="flex flex-wrap gap-3 text-xs">
          <span className="bg-green-50 text-green-700 px-2.5 py-1 rounded-full">⭐ Best: {highlights.best_day.tanggal} ({fR(highlights.best_day.omzet)})</span>
          <span className="bg-red-50 text-red-700 px-2.5 py-1 rounded-full">📉 Lowest: {highlights.worst_day.tanggal} ({fR(highlights.worst_day.omzet)})</span>
          <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full">🏆 Kontribusi FV: {s.pct_kontribusi_fv}%</span>
        </div>
      )}
    </div>
  );
}
function MiniKpi({ label, value, sub, delta, isInverse }: { label: string; value: string; sub: string; delta?: number | null; isInverse?: boolean }) {
  // For inverse metrics (CAC), down is good. For normal metrics, up is good.
  const isUp = delta != null && delta > 0;
  const isDown = delta != null && delta < 0;
  const isPositive = isInverse ? isDown : isUp;
  const isNegative = isInverse ? isUp : isDown;
  const deltaColor = isPositive ? "text-green-600" : isNegative ? "text-red-600" : "text-gray-400";
  const arrow = isUp ? "↑" : isDown ? "↓" : "—";
  return (
    <div className="text-center">
      <div className="text-[10px] text-gray-400 font-medium">{label}</div>
      <div className="text-sm font-bold text-gray-900 mt-0.5">{value}</div>
      <div className="text-[10px] text-gray-400">{sub}</div>
      {delta != null && (
        <div className={`text-[10px] font-semibold mt-0.5 ${deltaColor}`}>
          {arrow} {Math.abs(delta)}%
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// OVERVIEW TAB
// ═══════════════════════════════════════════════════════════
function OverviewTab({
  s, target, harian, evaluasi,
  snapshot, prevSnapshot, periodKey,
}: {
  s: Summary;
  target: number;
  harian: HarianRow[];
  evaluasi: EvaluasiPerBrand;
  snapshot?: ApiResponse;
  prevSnapshot?: ApiResponse | null;
  periodKey?: string;
}) {
  return (
    <div className="space-y-5">
      {/* Alert Monitor & AI Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <AIInsightsCard
            snapshot={snapshot || null}
            prevSnapshot={prevSnapshot ?? undefined}
            target={target}
            periodKey={periodKey || "current"}
          />
        </div>
        <AlertPanel
          summary={s}
          harian={harian.map(h => ({ tanggal: h.tanggal, omzet: h.omzet, biaya_iklan: h.biaya_iklan }))}
          target={target}
          period={periodKey}
        />
      </div>
      {/* Executive Report */}
      <ExecutiveReport s={s} target={target} harian={harian} />
      {/* Heatmap Calendar */}
      <HeatmapCalendar harian={harian} target={target} />
      {/* Omzet & Botol Chart */}
      <OmzetBotolChart harian={harian} avgTarget={target / 30} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <BrandDonutChart evaluasi={evaluasi} />
        <UpsellCacChart harian={harian} />
      </div>
      <HarianTable harian={harian} s={s} />
    </div>
  );
}

function ExecutiveReport({ s, target, harian }: { s: Summary; target: number; harian: HarianRow[] }) {
  const report = useMemo(() => {
    const pctTarget = (s.total_omzet / target) * 100;
    const projected = s.avg_omzet_harian * 30;
    const sisaHari = Math.max(1, 30 - s.hari);
    const sisaTarget = Math.max(0, target - s.total_omzet);
    const needPerDay = sisaTarget / sisaHari;

    // Trend: compare last 7 days avg vs first 7 days avg
    const first7 = harian.slice(0, Math.min(7, harian.length));
    const last7 = harian.slice(-Math.min(7, harian.length));
    const avgFirst7 = first7.reduce((a, r) => a + r.omzet, 0) / first7.length;
    const avgLast7 = last7.reduce((a, r) => a + r.omzet, 0) / last7.length;
    const trendPct = avgFirst7 > 0 ? ((avgLast7 - avgFirst7) / avgFirst7) * 100 : 0;
    const trendDir = trendPct > 5 ? "naik" : trendPct < -5 ? "turun" : "stabil";

    const lines: string[] = [];
    lines.push(`Dalam ${s.hari} hari operasional, FreshVision mencatatkan total omzet ${fR(s.total_omzet)} dari target bulanan ${fR(target)} (${pctTarget.toFixed(1)}%). Rata-rata omzet harian ${fR(s.avg_omzet_harian)} dengan ${fN(s.avg_closing_harian)} closing per hari.`);

    if (pctTarget >= 100) {
      lines.push(`🎉 Target bulanan sudah tercapai! Proyeksi akhir bulan ${fR(Math.round(projected))}.`);
    } else if (projected >= target) {
      lines.push(`Dengan pace saat ini, proyeksi akhir bulan ${fR(Math.round(projected))} — on track untuk mencapai target. Sisa ${fR(sisaTarget)} dalam ${sisaHari} hari.`);
    } else {
      lines.push(`⚠️ Proyeksi akhir bulan ${fR(Math.round(projected))} — masih di bawah target. Dibutuhkan rata-rata ${fR(Math.round(needPerDay))}/hari di ${sisaHari} hari tersisa.`);
    }

    lines.push(`Tren omzet 7 hari terakhir ${trendDir} ${Math.abs(trendPct).toFixed(0)}% dibanding 7 hari pertama. Upsell rata-rata ${s.rata_upsell.toFixed(2)}x ${s.rata_upsell >= 1.3 ? "(baik)" : s.rata_upsell >= 1.1 ? "(perlu ditingkatkan)" : "(kritis)"}, CAC total ${s.rata_cac.toFixed(1)}% ${s.rata_cac <= 50 ? "(efisien)" : s.rata_cac <= 60 ? "(normal)" : "(tinggi)"}, ROAS ${s.roas.toFixed(1)}x ${s.roas >= 4 ? "(excellent)" : s.roas >= 3 ? "(cukup)" : "(rendah)"}.`);

    const recs: string[] = [];
    if (s.rata_upsell < 1.2) recs.push("Tingkatkan upsell melalui bundling dan promo beli 2");
    if (s.rata_cac > 55) recs.push("Evaluasi efisiensi iklan, kurangi audience yang tidak perform");
    if (s.roas < 3) recs.push("Fokus budget iklan ke produk dan audience dengan ROAS tertinggi");
    if (trendDir === "turun") recs.push("Tren menurun — perlu campaign boost atau promo flash sale");
    if (recs.length > 0) lines.push(`Rekomendasi: ${recs.join("; ")}.`);

    return lines;
  }, [s, target, harian]);

  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-blue-900 flex items-center gap-1.5">📝 Executive Report</h3>
        <button onClick={() => setExpanded(!expanded)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
          {expanded ? "Sembunyikan" : "Selengkapnya"}
        </button>
      </div>
      <div className="text-xs text-gray-700 leading-relaxed space-y-2">
        <p>{report[0]}</p>
        {(expanded ? report.slice(1) : report.slice(1, 2)).map((line, i) => (
          <p key={i}>{line}</p>
        ))}
      </div>
    </div>
  );
}

function HeatmapCalendar({ harian, target }: { harian: HarianRow[]; target: number }) {
  const dailyTarget = target / 30;
  const maxOmzet = Math.max(...harian.map((r) => r.omzet));

  const getColor = (omzet: number): string => {
    if (omzet >= dailyTarget * 1.2) return "bg-green-500 text-white";
    if (omzet >= dailyTarget) return "bg-green-300 text-green-900";
    if (omzet >= dailyTarget * 0.7) return "bg-yellow-300 text-yellow-900";
    if (omzet > 0) return "bg-red-300 text-red-900";
    return "bg-gray-100 text-gray-400";
  };

  return (
    <div className="bg-white rounded-2xl border p-5">
      <h3 className="text-sm font-semibold mb-3">📅 Heatmap Omzet Harian</h3>
      <div className="grid grid-cols-7 sm:grid-cols-10 lg:grid-cols-15 gap-1.5">
        {harian.map((r, i) => (
          <div key={i} className={`rounded-lg p-1.5 text-center cursor-default transition hover:scale-105 ${getColor(r.omzet)} ${r.omzet === maxOmzet ? "ring-2 ring-blue-500" : ""}`}
            title={`${r.tanggal}: ${fR(r.omzet)}`}>
            <div className="text-[9px] font-bold leading-tight">{r.tanggal}</div>
            <div className="text-[8px] leading-tight mt-0.5">{fR(r.omzet)}</div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3 mt-3 text-[10px] text-gray-500">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500 inline-block" /> &gt;120% target</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-300 inline-block" /> On target</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-300 inline-block" /> 70-99%</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-300 inline-block" /> &lt;70%</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// COST ANALYSIS TAB
// ═══════════════════════════════════════════════════════════
function CostTab({ s, harian }: { s: Summary; harian: HarianRow[] }) {
  const costData = useMemo(() => harian.map((r) => ({
    tgl: r.tanggal,
    biaya_iklan: r.biaya_iklan,
    komisi_aff: r.komisi_affiliate,
    omzet: r.omzet,
    cac: r.cac_total,
  })), [harian]);

  return (
    <div className="space-y-5">
      {/* Cost KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <CostKpiCard label="Total Biaya Iklan" value={fR(s.total_biaya_iklan)} icon="📣" />
        <CostKpiCard label="Total Komisi Affiliate" value={fR(s.total_komisi_aff)} icon="🤝" />
        <CostKpiCard label="Total Cost" value={fR(s.total_cost)} icon="💸" />
        <CostKpiCard label="ROAS" value={`${s.roas.toFixed(1)}x`} icon="📈" highlight={s.roas >= 3} />
        <CostKpiCard label="Cost/Closing" value={fR(s.cost_per_closing)} icon="🏷️" />
        <CostKpiCard label="Margin Setelah Biaya" value={`${s.margin_after_cost}%`} icon="💰" highlight={s.margin_after_cost > 50} />
      </div>

      {/* Cost vs Omzet Chart */}
      <div className="bg-white rounded-2xl border p-5">
        <h3 className="text-sm font-semibold mb-3">📊 Biaya vs Omzet Harian</h3>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={costData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="tgl" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 9 }} tickFormatter={(v) => fR(v)} />
            <Tooltip content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0]?.payload;
              return (
                <div className="bg-white border rounded-xl shadow-lg p-3 text-xs space-y-1">
                  <div className="font-bold">{d.tgl}</div>
                  <div>💰 Omzet: <strong>{fR(d.omzet)}</strong></div>
                  <div>📣 Iklan: <strong>{fR(d.biaya_iklan)}</strong></div>
                  <div>🤝 Affiliate: <strong>{fR(d.komisi_aff)}</strong></div>
                  <div>💸 CAC: <strong>{d.cac.toFixed(1)}%</strong></div>
                </div>
              );
            }} />
            <Legend />
            <Bar dataKey="biaya_iklan" name="Biaya Iklan" fill="#f97316" radius={[3, 3, 0, 0]} stackId="cost" />
            <Bar dataKey="komisi_aff" name="Komisi Affiliate" fill="#8b5cf6" radius={[3, 3, 0, 0]} stackId="cost" />
            <Line type="monotone" dataKey="omzet" name="Omzet" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* ROAS Trend */}
      <div className="bg-white rounded-2xl border p-5">
        <h3 className="text-sm font-semibold mb-3">📈 Tren ROAS Harian</h3>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={harian.map((r) => ({
            tgl: r.tanggal,
            roas: r.biaya_iklan > 0 ? +(r.omzet / r.biaya_iklan).toFixed(2) : 0,
          }))}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="tgl" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} unit="x" />
            <Tooltip formatter={(v) => `${v}x`} />
            <ReferenceLine y={3} stroke="#10b981" strokeDasharray="6 3" label={{ value: "Target 3x", fontSize: 10, fill: "#10b981" }} />
            <Area type="monotone" dataKey="roas" name="ROAS" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
function CostKpiCard({ label, value, icon, highlight }: { label: string; value: string; icon: string; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${highlight ? "bg-green-50 border-green-200" : "bg-white"}`}>
      <div className="text-lg">{icon}</div>
      <div className="text-xs text-gray-400 mt-1">{label}</div>
      <div className="text-base font-bold text-gray-900 mt-0.5">{value}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// CHANNELS TAB
// ═══════════════════════════════════════════════════════════
const CH_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  shop: { label: "Shop", icon: <ShoppingBag size={16} />, color: "#3b82f6" },
  video: { label: "Video", icon: <Video size={16} />, color: "#8b5cf6" },
  live: { label: "Live", icon: <Radio size={16} />, color: "#ef4444" },
  shop_tab: { label: "Shop Tab", icon: <Store size={16} />, color: "#10b981" },
  affiliate: { label: "Affiliate", icon: <Users size={16} />, color: "#f97316" },
};

function ChannelsTab({ channels, channelData }: { channels: Record<string, ChannelSummary>; channelData: { video: ChannelRow[]; live: ChannelRow[]; shop_tab: ChannelRow[]; affiliate: ChannelRow[] } }) {
  const totalAll = Object.values(channels).reduce((s, c) => s + c.total_omzet, 0);
  const barData = Object.entries(channels).map(([k, c]) => ({
    channel: CH_META[k]?.label || k,
    omzet: c.total_omzet,
    closing: c.total_closing,
    fill: CH_META[k]?.color || "#94a3b8",
  }));

  // ROI threshold colors: >5x = excellent, >3x = good, >2x = ok, <2x = low
  const roiColor = (roi: number) => {
    if (roi >= 5) return { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" };
    if (roi >= 3) return { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" };
    if (roi >= 2) return { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" };
    return { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" };
  };

  // Find best channel by ROI for highlighting
  const channelsArr = Object.entries(channels).map(([k, c]) => ({ key: k, ...c }));
  const validRoi = channelsArr.filter(c => c.roi > 0);
  const bestRoiKey = validRoi.length > 0 ? validRoi.reduce((a, b) => a.roi > b.roi ? a : b).key : null;

  return (
    <div className="space-y-5">
      {/* ═══ Channel cards with ROI ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {Object.entries(channels).map(([k, c]) => {
          const meta = CH_META[k];
          const pct = totalAll > 0 ? ((c.total_omzet / totalAll) * 100).toFixed(1) : "0";
          const roiC = roiColor(c.roi);
          const isBest = k === bestRoiKey;
          return (
            <div key={k} className={`bg-white rounded-2xl border p-4 relative ${isBest ? "ring-2 ring-green-400 ring-offset-1" : ""}`}>
              {isBest && <div className="absolute -top-2 right-2 bg-green-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">BEST ROI</div>}
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg" style={{ backgroundColor: meta.color + "15", color: meta.color }}>{meta.icon}</div>
                <span className="text-sm font-semibold text-gray-700">{meta.label}</span>
              </div>
              <div className="text-lg font-bold text-gray-900">{fR(c.total_omzet)}</div>
              <div className="text-[10px] text-gray-400 mb-2">{pct}% · {c.hari} hari</div>
              {/* ROI badge */}
              {c.total_biaya_iklan > 0 && (
                <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-bold mb-2 ${roiC.bg} ${roiC.text} ${roiC.border}`}>
                  ROI {c.roi.toFixed(2)}x
                </div>
              )}
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                <div><span className="text-gray-400">Closing</span> <strong>{fN(c.total_closing)}</strong></div>
                <div><span className="text-gray-400">Botol</span> <strong>{fN(c.total_botol)}</strong></div>
                <div><span className="text-gray-400">Upsell</span> <strong>{c.rata_upsell.toFixed(2)}x</strong></div>
                <div><span className="text-gray-400">CAC</span> <strong>{c.rata_cac.toFixed(1)}%</strong></div>
                <div><span className="text-gray-400">Avg Trx</span> <strong>{fR(c.omzet_per_closing)}</strong></div>
                <div><span className="text-gray-400">Btl/Cls</span> <strong>{c.bottle_per_closing.toFixed(2)}</strong></div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ═══ Efficiency Comparison Table ═══ */}
      <div className="bg-white rounded-2xl border p-5">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Zap size={16} className="text-amber-500" />
          Channel Efficiency Ranking
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-gray-50 text-left">
                <th className="p-2">Channel</th>
                <th className="p-2 text-right">Omzet</th>
                <th className="p-2 text-right">Iklan/Komisi</th>
                <th className="p-2 text-right">ROI</th>
                <th className="p-2 text-right">Cost/Closing</th>
                <th className="p-2 text-right">Cost/Botol</th>
                <th className="p-2 text-right">Avg Trx</th>
                <th className="p-2 text-right">Btl/Cls</th>
              </tr>
            </thead>
            <tbody>
              {[...channelsArr].sort((a, b) => b.roi - a.roi).map((c) => {
                const meta = CH_META[c.key] || { label: c.key, color: "#94a3b8" };
                const roiC = roiColor(c.roi);
                return (
                  <tr key={c.key} className="border-b hover:bg-gray-50">
                    <td className="p-2 font-medium" style={{ color: meta.color }}>{meta.label}</td>
                    <td className="p-2 text-right">{fR(c.total_omzet)}</td>
                    <td className="p-2 text-right text-gray-500">{fR(c.total_biaya_iklan)}</td>
                    <td className="p-2 text-right">
                      {c.total_biaya_iklan > 0 ? (
                        <span className={`inline-block px-1.5 py-0.5 rounded font-bold ${roiC.bg} ${roiC.text}`}>
                          {c.roi.toFixed(2)}x
                        </span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="p-2 text-right">{c.cost_per_closing > 0 ? fR(c.cost_per_closing) : "—"}</td>
                    <td className="p-2 text-right">{c.cost_per_botol > 0 ? fR(c.cost_per_botol) : "—"}</td>
                    <td className="p-2 text-right">{fR(c.omzet_per_closing)}</td>
                    <td className="p-2 text-right">{c.bottle_per_closing.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-3 text-[10px] text-gray-400 leading-relaxed">
          <span className="inline-block w-3 h-3 rounded bg-green-100 border border-green-200 align-middle mr-1"></span>ROI ≥5x (Excellent)
          <span className="inline-block w-3 h-3 rounded bg-blue-100 border border-blue-200 align-middle mr-1 ml-3"></span>ROI ≥3x (Good)
          <span className="inline-block w-3 h-3 rounded bg-amber-100 border border-amber-200 align-middle mr-1 ml-3"></span>ROI ≥2x (OK)
          <span className="inline-block w-3 h-3 rounded bg-red-100 border border-red-200 align-middle mr-1 ml-3"></span>ROI &lt;2x (Low)
        </div>
      </div>

      <div className="bg-white rounded-2xl border p-5">
        <h3 className="text-sm font-semibold mb-3">Perbandingan Omzet Per Channel</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={barData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="channel" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 9 }} tickFormatter={(v) => fR(Number(v))} />
            <Tooltip formatter={(v) => fR(Number(v))} />
            <Bar dataKey="omzet" name="Omzet" radius={[6, 6, 0, 0]}>
              {barData.map((d, i) => <Cell key={i} fill={d.fill} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {(["video", "live", "shop_tab", "affiliate"] as const).map((k) => {
        const rows = channelData[k];
        if (!rows?.length) return null;
        const meta = CH_META[k];
        return (
          <div key={k} className="bg-white rounded-2xl border p-5">
            <h3 className="text-sm font-semibold mb-2" style={{ color: meta.color }}>{meta.label} — Harian</h3>
            <div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="border-b bg-gray-50 text-left">
              <th className="p-2">Tgl</th><th className="p-2 text-right">Omzet</th><th className="p-2 text-right">Closing</th><th className="p-2 text-right">Botol</th><th className="p-2 text-right">Upsell</th><th className="p-2 text-right">CAC</th>
            </tr></thead><tbody>
              {[...rows].reverse().map((r, i) => (
                <tr key={i} className="border-b hover:bg-gray-50">
                  <td className="p-2 font-medium">{r.tanggal}</td><td className="p-2 text-right">{fR(r.omzet)}</td><td className="p-2 text-right">{fN(r.closing)}</td>
                  <td className="p-2 text-right">{fN(r.botol)}</td><td className="p-2 text-right">{r.upsell.toFixed(2)}x</td><td className="p-2 text-right">{r.cac_total.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody></table></div>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// WEEKLY TAB
// ═══════════════════════════════════════════════════════════
function WeeklyTab({ weekly, s, target, harian }: { weekly: WeeklyRow[]; s: Summary; target: number; harian: HarianRow[] }) {
  const weeklyTarget = target / 4;
  const sisaHari = Math.max(1, 30 - s.hari);
  const sisaTarget = Math.max(0, target - s.total_omzet);
  const projected = s.avg_omzet_harian * 30;

  function evaluate(w: WeeklyRow): { notes: string[]; grade: string } {
    const notes: string[] = [];
    const pctT = (w.total_omzet / weeklyTarget) * 100;
    if (pctT >= 100) { notes.push(`✅ Target tercapai (${pctT.toFixed(0)}%)`); }
    else if (pctT >= 80) { notes.push(`🟡 Hampir target (${pctT.toFixed(0)}%)`); }
    else { notes.push(`🔴 Di bawah target (${pctT.toFixed(0)}%)`); }

    if (w.rata_upsell >= 1.3) notes.push("✅ Upsell bagus");
    else if (w.rata_upsell >= 1.1) notes.push("🟡 Upsell perlu ditingkatkan");
    else notes.push("🔴 Upsell kritis — push bundling");

    if (w.rata_cac <= 50) notes.push("✅ CAC efisien");
    else if (w.rata_cac <= 60) notes.push("🟡 CAC normal");
    else notes.push("🔴 CAC tinggi — kurangi spending");

    if (w.wow_omzet > 10) notes.push(`📈 Omzet naik ${w.wow_omzet}% vs minggu lalu`);
    else if (w.wow_omzet < -10) notes.push(`📉 Omzet turun ${Math.abs(w.wow_omzet)}% vs minggu lalu`);

    const grade = pctT >= 100 && w.rata_upsell >= 1.3 && w.rata_cac <= 50 ? "A"
      : pctT >= 80 && w.rata_upsell >= 1.1 && w.rata_cac <= 60 ? "B"
      : pctT >= 60 ? "C" : "D";
    return { notes, grade };
  }
  const gradeColors: Record<string, string> = { A: "bg-green-100 text-green-700", B: "bg-blue-100 text-blue-700", C: "bg-yellow-100 text-yellow-700", D: "bg-red-100 text-red-700" };

  return (
    <div className="space-y-5">
      {/* Proyeksi */}
      <div className="bg-white rounded-2xl border p-5">
        <h3 className="text-sm font-semibold mb-3">🎯 Proyeksi & Target Bulanan</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-blue-50 rounded-xl p-4 text-center">
            <div className="text-xs text-gray-500">Target Bulan</div>
            <div className="text-xl font-bold text-blue-700">{fR(target)}</div>
          </div>
          <div className="bg-green-50 rounded-xl p-4 text-center">
            <div className="text-xs text-gray-500">Tercapai ({s.hari} hari)</div>
            <div className="text-xl font-bold text-green-700">{fR(s.total_omzet)}</div>
            <div className="text-xs text-gray-400">{((s.total_omzet / target) * 100).toFixed(1)}%</div>
          </div>
          <div className="bg-orange-50 rounded-xl p-4 text-center">
            <div className="text-xs text-gray-500">Sisa Target</div>
            <div className="text-xl font-bold text-orange-700">{fR(sisaTarget)}</div>
            <div className="text-xs text-gray-400">~{fR(Math.round(sisaTarget / sisaHari))}/hari × {sisaHari} hari</div>
          </div>
          <div className={`rounded-xl p-4 text-center ${projected >= target ? "bg-green-50" : "bg-red-50"}`}>
            <div className="text-xs text-gray-500">Proyeksi Akhir Bulan</div>
            <div className={`text-xl font-bold ${projected >= target ? "text-green-700" : "text-red-700"}`}>{fR(Math.round(projected))}</div>
            <div className="text-xs text-gray-400">{projected >= target ? "✅ On Track" : "⚠️ Below Target"}</div>
          </div>
        </div>
      </div>

      {/* Weekly Chart */}
      <div className="bg-white rounded-2xl border p-5">
        <h3 className="text-sm font-semibold mb-3">Omzet Per Minggu</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={weekly}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 9 }} tickFormatter={(v) => fR(Number(v))} />
            <Tooltip formatter={(v) => fR(Number(v))} />
            <ReferenceLine y={weeklyTarget} stroke="#ef4444" strokeDasharray="6 3" label={{ value: `Target ${fR(weeklyTarget)}`, fontSize: 9, fill: "#ef4444" }} />
            <Bar dataKey="total_omzet" name="Omzet" fill="#3b82f6" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Weekly Cards */}
      {weekly.map((w, i) => {
        const { notes, grade } = evaluate(w);
        return (
          <div key={i} className="bg-white rounded-2xl border p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-gray-900">{w.label}</h3>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${gradeColors[grade]}`}>Grade {grade}</span>
                {w.wow_omzet !== 0 && (
                  <span className={`text-xs flex items-center gap-0.5 ${w.wow_omzet > 0 ? "text-green-600" : "text-red-600"}`}>
                    {w.wow_omzet > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    {w.wow_omzet > 0 ? "+" : ""}{w.wow_omzet}% WoW
                  </span>
                )}
              </div>
              <span className="text-xs text-gray-400">{w.hari} hari</span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 text-center text-xs mb-3">
              <div><div className="text-gray-400">Omzet</div><div className="font-bold text-blue-700">{fR(w.total_omzet)}</div></div>
              <div><div className="text-gray-400">Closing</div><div className="font-bold">{fN(w.total_closing)}</div></div>
              <div><div className="text-gray-400">Botol</div><div className="font-bold">{fN(w.total_botol)}</div></div>
              <div><div className="text-gray-400">Avg/Hari</div><div className="font-bold">{fR(w.rata_omzet_harian)}</div></div>
              <div><div className="text-gray-400">Upsell</div><div className="font-bold">{w.rata_upsell.toFixed(2)}x</div></div>
              <div><div className="text-gray-400">CAC</div><div className="font-bold">{w.rata_cac.toFixed(1)}%</div></div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 space-y-1">
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Evaluasi Otomatis</div>
              {notes.map((n, ni) => <div key={ni} className="text-xs">{n}</div>)}
            </div>
          </div>
        );
      })}

      {/* Daily Evaluation Table */}
      <DailyEvalTable harian={harian} avgTarget={target / 30} />
    </div>
  );
}

function DailyEvalTable({ harian, avgTarget }: { harian: HarianRow[]; avgTarget: number }) {
  const rows = useMemo(() => [...harian].reverse().map((r) => {
    let score = 0;
    if (r.omzet >= avgTarget) score += 40; else score += (r.omzet / avgTarget) * 40;
    if (r.upsell >= 1.3) score += 25; else if (r.upsell >= 1.1) score += 15; else score += 5;
    if (r.cac_total <= 50) score += 20; else if (r.cac_total <= 60) score += 10; else score += 0;
    score += Math.min(15, (r.closing / 100) * 15);
    score = Math.round(Math.min(100, score));
    const grade = score >= 80 ? "A" : score >= 60 ? "B" : score >= 40 ? "C" : "D";
    return { ...r, score, grade };
  }), [harian, avgTarget]);

  const gradeStyle: Record<string, string> = { A: "bg-green-100 text-green-700", B: "bg-blue-100 text-blue-700", C: "bg-yellow-100 text-yellow-700", D: "bg-red-100 text-red-700" };
  const omzCol = (v: number) => v >= avgTarget ? "text-green-700 font-bold" : v >= avgTarget * 0.7 ? "text-yellow-700" : "text-red-600";

  return (
    <div className="bg-white rounded-2xl border p-5">
      <h3 className="text-sm font-semibold mb-3">📋 Evaluasi Harian Detail</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead><tr className="border-b bg-gray-50 text-left">
            <th className="p-2">Tgl</th><th className="p-2 text-right">Omzet</th><th className="p-2 text-right">Closing</th><th className="p-2 text-right">Botol</th>
            <th className="p-2 text-right">Upsell</th><th className="p-2 text-right">CAC</th><th className="p-2 text-center">Score</th><th className="p-2 text-center">Grade</th>
          </tr></thead>
          <tbody>{rows.map((r, i) => (
            <tr key={i} className={`border-b hover:bg-gray-50 ${r.grade === "A" ? "bg-green-50/50" : r.grade === "D" ? "bg-red-50/30" : ""}`}>
              <td className="p-2 font-medium">{r.tanggal}</td>
              <td className={`p-2 text-right ${omzCol(r.omzet)}`}>{fR(r.omzet)}</td>
              <td className="p-2 text-right">{fN(r.closing)}</td>
              <td className="p-2 text-right">{fN(r.botol)}</td>
              <td className={`p-2 text-right ${r.upsell >= 1.3 ? "text-green-700 font-bold" : r.upsell >= 1.1 ? "text-yellow-700" : "text-red-600"}`}>{r.upsell.toFixed(2)}x</td>
              <td className={`p-2 text-right ${r.cac_total <= 50 ? "text-green-700 font-bold" : r.cac_total <= 60 ? "text-yellow-700" : "text-red-600"}`}>{r.cac_total.toFixed(1)}%</td>
              <td className="p-2 text-center font-bold">{r.score}</td>
              <td className="p-2 text-center"><span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${gradeStyle[r.grade]}`}>{r.grade}</span></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// CHARTS (shared)
// ═══════════════════════════════════════════════════════════
function OmzetBotolChart({ harian, avgTarget }: { harian: HarianRow[]; avgTarget: number }) {
  const chartData = useMemo(() => {
    const maxOmzet = Math.max(...harian.map((r) => r.omzet));
    return harian.map((r, i) => {
      // 7-day moving average
      const window = harian.slice(Math.max(0, i - 6), i + 1);
      const ma7 = Math.round(window.reduce((s, d) => s + d.omzet, 0) / window.length);
      return {
        tgl: r.tanggal, omzet: r.omzet, botol: r.botol, ma7,
        closing: r.closing, upsell: r.upsell, cac: r.cac_total, isBest: r.omzet === maxOmzet,
      };
    });
  }, [harian]);

  return (
    <div className="bg-white rounded-2xl border p-5">
      <h3 className="text-sm font-semibold mb-3">Omzet & Botol Harian <span className="text-gray-400 font-normal text-xs ml-1">(garis oranye = 7-day MA)</span></h3>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="tgl" tick={{ fontSize: 10 }} />
          <YAxis yAxisId="left" tick={{ fontSize: 9 }} tickFormatter={(v) => fR(Number(v))} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} unit=" btl" />
          <Tooltip content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0]?.payload;
            return (
              <div className="bg-white border rounded-xl shadow-lg p-3 text-xs space-y-1">
                <div className="font-bold">{d.tgl}</div>
                <div>💰 {fR(d.omzet)} {d.isBest ? "⭐" : ""}</div>
                <div>� MA-7: {fR(d.ma7)}</div>
                <div>�📦 {d.botol} botol · 🏷️ {d.closing} closing</div>
                <div>📈 {d.upsell?.toFixed(2)}x · 💸 {d.cac?.toFixed(1)}%</div>
              </div>
            );
          }} />
          <Legend />
          <ReferenceLine yAxisId="left" y={avgTarget} stroke="#10b981" strokeDasharray="6 3" label={{ value: `Target ${fR(avgTarget)}`, fontSize: 9, fill: "#10b981" }} />
          <Bar yAxisId="left" dataKey="omzet" name="Omzet" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          <Line yAxisId="left" type="monotone" dataKey="ma7" name="MA-7" stroke="#f97316" strokeWidth={2.5} dot={false} strokeDasharray="5 3" />
          <Line yAxisId="right" type="monotone" dataKey="botol" name="Botol" stroke="#10b981" strokeWidth={2} dot={{ r: 2.5 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

const BRAND_COLORS: Record<string, string> = { FreshVision: "#3b82f6", Etawaku: "#10b981", Freshmag: "#f97316", Nutriflakes: "#8b5cf6" };
function BrandDonutChart({ evaluasi }: { evaluasi: EvaluasiPerBrand }) {
  const pieData = useMemo(() => [
    { name: "FreshVision", value: evaluasi.freshvision },
    { name: "Etawaku", value: evaluasi.etawaku },
    { name: "Freshmag", value: evaluasi.freshmag },
    { name: "Nutriflakes", value: evaluasi.nutriflakes },
  ].filter((d) => d.value > 0), [evaluasi]);

  return (
    <div className="bg-white rounded-2xl border p-5">
      <h3 className="text-sm font-semibold mb-3">Kontribusi Per Brand</h3>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie data={pieData} cx="50%" cy="50%" innerRadius={65} outerRadius={100} paddingAngle={3} dataKey="value"
            label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(1)}%`}>
            {pieData.map((e) => <Cell key={e.name} fill={BRAND_COLORS[e.name] || "#94a3b8"} />)}
          </Pie>
          <Tooltip formatter={(v) => fR(Number(v))} />
        </PieChart>
      </ResponsiveContainer>
      <div className="text-center -mt-3 mb-2">
        <div className="text-[10px] text-gray-400">Total</div>
        <div className="text-base font-bold">{fR(evaluasi.total)}</div>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        {pieData.map((d) => (
          <div key={d.name} className="flex items-center gap-1 text-xs">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: BRAND_COLORS[d.name] }} />
            <span className="text-gray-500">{d.name}</span> <strong>{fR(d.value)}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function UpsellCacChart({ harian }: { harian: HarianRow[] }) {
  const data = useMemo(() => harian.map((r) => ({ tgl: r.tanggal, upsell: +r.upsell.toFixed(2), cac: +r.cac_total.toFixed(1) })), [harian]);
  return (
    <div className="bg-white rounded-2xl border p-5">
      <h3 className="text-sm font-semibold mb-3">Tren Upsell & CAC</h3>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="tgl" tick={{ fontSize: 10 }} />
          <YAxis yAxisId="left" tick={{ fontSize: 10 }} domain={[0, "auto"]} unit="x" />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} unit="%" />
          <Tooltip content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0]?.payload;
            return <div className="bg-white border rounded-xl shadow-lg p-3 text-xs space-y-1"><div className="font-bold">{d.tgl}</div><div>📈 {d.upsell}x · 💸 {d.cac}%</div></div>;
          }} />
          <Legend />
          <ReferenceLine yAxisId="left" y={1.3} stroke="#10b981" strokeDasharray="6 3" label={{ value: "1.3x", fontSize: 9, fill: "#10b981" }} />
          <ReferenceLine yAxisId="right" y={60} stroke="#ef4444" strokeDasharray="6 3" label={{ value: "60%", fontSize: 9, fill: "#ef4444" }} />
          <Line yAxisId="left" type="monotone" dataKey="upsell" name="Upsell" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2.5 }} />
          <Line yAxisId="right" type="monotone" dataKey="cac" name="CAC" stroke="#ef4444" strokeWidth={2} dot={{ r: 2.5 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function HarianTable({ harian, s }: { harian: HarianRow[]; s: Summary }) {
  const sorted = useMemo(() => {
    const avgO = s.avg_omzet_harian;
    const top3 = [...harian].sort((a, b) => b.omzet - a.omzet).slice(0, 3).map((r) => r.tanggal);
    return [...harian].reverse().map((r) => ({
      ...r,
      status: top3.includes(r.tanggal) ? "⭐" : r.omzet >= avgO ? "✅" : "⚠️",
    }));
  }, [harian, s]);

  return (
    <div className="bg-white rounded-2xl border p-5">
      <h3 className="text-sm font-semibold mb-3">Tabel Harian (Shop)</h3>
      <div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="border-b bg-gray-50 text-left">
        <th className="p-2">Tgl</th><th className="p-2 text-right">Closing</th><th className="p-2 text-right">Botol</th>
        <th className="p-2 text-right">Omzet</th><th className="p-2 text-right">Upsell</th><th className="p-2 text-right">CAC</th>
        <th className="p-2 text-right">Kontribusi</th><th className="p-2 text-center">Status</th>
      </tr></thead><tbody>
        {sorted.map((r, i) => (
          <tr key={i} className={`border-b hover:bg-gray-50 ${r.status === "⭐" ? "bg-yellow-50/60" : ""}`}>
            <td className="p-2 font-medium">{r.tanggal}</td>
            <td className="p-2 text-right">{fN(r.closing)}</td>
            <td className="p-2 text-right">{fN(r.botol)}</td>
            <td className={`p-2 text-right ${r.omzet >= 15e6 ? "text-green-700 font-bold" : r.omzet >= 10e6 ? "text-yellow-700" : "text-red-600"}`}>{fR(r.omzet)}</td>
            <td className={`p-2 text-right ${r.upsell >= 1.3 ? "text-green-700 font-bold" : r.upsell >= 1.1 ? "text-yellow-700" : "text-red-600"}`}>{r.upsell.toFixed(2)}x</td>
            <td className={`p-2 text-right ${r.cac_total <= 50 ? "text-green-700 font-bold" : r.cac_total <= 60 ? "text-yellow-700" : "text-red-600"}`}>{r.cac_total.toFixed(1)}%</td>
            <td className="p-2 text-right">{r.pct_kontribusi_fv.toFixed(1)}%</td>
            <td className="p-2 text-center">{r.status}</td>
          </tr>
        ))}
      </tbody>
      <tfoot className="sticky bottom-0"><tr className="bg-blue-50 border-t-2 border-blue-200 font-bold">
        <td className="p-2">TOTAL</td><td className="p-2 text-right">{fN(s.total_closing)}</td><td className="p-2 text-right">{fN(s.total_botol)}</td>
        <td className="p-2 text-right text-blue-700">{fR(s.total_omzet)}</td><td className="p-2 text-right">{s.rata_upsell.toFixed(2)}x</td>
        <td className="p-2 text-right">{s.rata_cac.toFixed(1)}%</td><td className="p-2 text-right">{s.pct_kontribusi_fv}%</td><td className="p-2 text-center">—</td>
      </tr></tfoot></table></div>
    </div>
  );
}
