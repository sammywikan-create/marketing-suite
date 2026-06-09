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
  Trash2, Database, Check, MessageSquare, Flame, Award, Eye, StickyNote,
  Rocket, Activity, Brain, Clock, Star, Sun, CloudRain, Trophy,
} from "lucide-react";
import { generatePdf } from "@/lib/exportPdf";
import { generatePpt } from "@/lib/exportPpt";
import {
  saveLaporanHarianData,
  loadLaporanHarianData,
  listLaporanHarianPeriods,
  deleteLaporanHarianData,
  saveDailyNote,
  loadDailyNotes,
  deleteDailyNote,
  type DailyNote,
} from "@/lib/db";
import { isSupabaseConfigured } from "@/lib/supabase";
import * as XLSX from "xlsx";
import AIInsightsCard from "@/components/AIInsightsCard";
import AlertPanel from "@/components/alerts/AlertPanel";
import ReportButton from "@/components/reports/ReportButton";
import TelegramQuickActions from "@/components/telegram/TelegramQuickActions";

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════
interface HarianRow {
  tanggal: string; closing: number; botol: number; nilai_per_txn: number;
  omzet: number; cac_ads: number; cac_total: number; upsell: number;
  biaya_iklan: number; komisi_affiliate: number;
  omzet_total_brand: number; pct_kontribusi_fv: number;
  // Cost breakdown columns (from Excel B-J, S-U)
  biaya_gmv_max: number; biaya_non_gmv_max: number;
  komisi_platform: number; shipping_cost: number; biaya_layanan_mall: number;
  biaya_komisi_dinamis: number; program_growth_extra: number; biaya_pemrosesan: number;
  roi_no_ppn: number; roi_ads: number; total_roi: number;
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
  // Cost breakdown totals
  total_biaya_gmv_max: number; total_biaya_non_gmv_max: number;
  total_komisi_platform: number; total_shipping_cost: number;
  total_biaya_layanan_mall: number; total_biaya_komisi_dinamis: number;
  total_program_growth_extra: number; total_biaya_pemrosesan: number;
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

// Number of calendar days in a period like "2026-02" (accounts for leap years).
// Fallback to 30 when the period is invalid.
function daysInPeriod(period: string | undefined | null): number {
  if (!period || !/^\d{4}-\d{2}$/.test(period)) return 30;
  const [y, m] = period.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

// Number of ISO calendar weeks a period spans. Used for weekly targets.
// A month spans the weeks from its first day to its last day.
function weeksInPeriod(period: string | undefined | null): number {
  const days = daysInPeriod(period);
  // Typical month spans 4–6 calendar weeks; use 4.345 (365.25/7/12) as the weighted average.
  return days / 7;
}

function detectPeriodFromData(data: ApiResponse | null | undefined, selectedPeriod?: string): string {
  // 1. Period stamped on the data (most reliable — set during import or API response)
  if (data?.period && /^\d{4}-\d{2}$/.test(data.period)) return data.period;

  // 2. Currently selected period (user explicitly chose a historical month)
  if (selectedPeriod && /^\d{4}-\d{2}$/.test(selectedPeriod)) return selectedPeriod;

  if (!data?.harian?.length) return getCurrentPeriod();
  // 3. Try to extract month from first harian date like "1 Apr", "15 Jan"
  const BULAN_TO_NUM: Record<string, string> = {
    jan: "01", feb: "02", mar: "03", apr: "04", mei: "05", jun: "06",
    jul: "07", agu: "08", sep: "09", okt: "10", nov: "11", des: "12",
  };
  for (const row of data.harian) {
    const m = row.tanggal?.match(/(Jan|Feb|Mar|Apr|Mei|Jun|Jul|Agu|Sep|Okt|Nov|Des)/i);
    if (m) {
      const mon = BULAN_TO_NUM[m[1].toLowerCase()];
      if (mon) {
        // Use current year only as final fallback — period field should have correct year
        const year = new Date().getFullYear();
        return `${year}-${mon}`;
      }
    }
  }
  return getCurrentPeriod();
}

function useTarget(period?: string) {
  const [target, setTargetState] = useState(350_000_000);
  const [loading, setLoading] = useState(true);
  const effectivePeriod = period || new Date().toISOString().slice(0, 7);

  const loadTarget = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/target?period=${effectivePeriod}&type=omzet`);
      const data = await res.json();
      // API returns { target_value } when record exists; undefined = no target set for this period yet.
      // Reset to default when switching to a period without a saved target.
      setTargetState(typeof data.target_value === "number" ? data.target_value : 350_000_000);
    } catch {
      setTargetState(350_000_000);
    } finally {
      setLoading(false);
    }
  }, [effectivePeriod]);

  useEffect(() => {
    loadTarget();
  }, [loadTarget]);

  const setTarget = useCallback(async (v: number) => {
    setTargetState(v);
    try {
      await fetch('/api/target', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period: effectivePeriod, target_value: v, type: 'omzet' }),
      });
    } catch {
      console.error('Failed to save target to Supabase');
    }
  }, [effectivePeriod]);

  return { target, setTarget, loading };
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

// ─── Parse SHOP — mirrors getFreshVisionShop() dari googleSheets.ts ───
// Kolom baru (setelah penambahan BIAYA PEMROSESAN PESANAN di kolom J):
//   A=tanggal, B=gmv max, C=non gmv max, D=total biaya iklan+ppn
//   E=komisi platform, F=shipping, G=biaya layanan mall
//   H=biaya komisi dinamis, I=program growth extra, J=biaya pemrosesan pesanan (BARU!)
//   K=komisi affiliate, L=closing, M=botol, N=nilai per txn, O=omzet
//   P=cac of ads, Q=cac total, R=upsell, S=roi no ppn, T=roi ads, U=total roi
function parseShopSheet(rows: any[][]): { shop: HarianRow[]; period: string } {
  const { dataRows } = getDateRows(rows);
  if (!dataRows.length) return { shop: [], period: "" };

  let period = "";
  const shop: HarianRow[] = [];
  for (const r of dataRows) {
    const { dateStr, period: p } = cleanDate(r[0]);
    if (!dateStr) continue;
    if (p && !period) period = p;
    const omzet = cleanRp(r[14]); // O
    if (omzet <= 0) continue;
    shop.push({
      tanggal: dateStr,
      biaya_gmv_max:        cleanRp(r[1]),       // B
      biaya_non_gmv_max:    cleanRp(r[2]),       // C
      biaya_iklan:          cleanRp(r[3]),       // D = total biaya iklan+ppn
      komisi_platform:      cleanRp(r[4]),       // E
      shipping_cost:        cleanRp(r[5]),       // F
      biaya_layanan_mall:   cleanRp(r[6]),       // G
      biaya_komisi_dinamis: cleanRp(r[7]),       // H
      program_growth_extra: cleanRp(r[8]),       // I
      biaya_pemrosesan:     cleanRp(r[9]),       // J
      komisi_affiliate:     cleanRp(r[10]),      // K
      closing:              cleanInt(r[11]),     // L
      botol:                cleanInt(r[12]),     // M
      nilai_per_txn:        cleanRp(r[13]),      // N
      omzet,                                      // O
      cac_ads:              cleanPct(r[15]),     // P
      cac_total:            cleanPct(r[16]),     // Q
      upsell:               cleanDecimal(r[17]), // R
      roi_no_ppn:           cleanDecimal(r[18]), // S
      roi_ads:              cleanDecimal(r[19]), // T
      total_roi:            cleanDecimal(r[20]), // U
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
// FreshVision block di LQ (index 328) to MH (index 345):
//   +0 GMV MAX, +1 NON GMV MAX, +2 TOTAL BIAYA+PPN, +3 KOMISI PLATFORM
//   +4 SHIPPING, +5 LAYANAN MALL, +6 KOMISI DINAMIS, +7 GROWTH EXTRA
//   +8 BIAYA PEMROSESAN, +9 KOMISI AFF, +10 CLOSING, +11 BOTOL
//   +12 UPSELL, +13 NILAI/TXN, +14 OMZET, +15 CAC ADS, +16 CAC TOTAL, +17 ROI
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

  const FV_START = 328;  // LQ (0-indexed) = awal block FreshVision
  const FV_END   = 345;  // MH (0-indexed) = akhir block FreshVision
  const maxCols  = Math.max(...dataRows.map(r => r?.length || 0));
  console.log(`[Excel Import] EVALUASI: ${dataRows.length} data rows, maxCols=${maxCols}`);

  // Deteksi header: cari kolom OMZET dalam rentang FV (LQ-MH)
  let fvOmzetIdx = FV_START + 14; // default: LQ+14 = index 342
  const scanLimit = Math.min(rows.length, 8);
  for (let i = 0; i < scanLimit; i++) {
    const row = rows[i] || [];
    for (let j = FV_START; j <= Math.min(FV_END, row.length - 1); j++) {
      const cell = String(row[j] ?? "").toLowerCase().trim();
      if (cell === "omzet" || cell === "total omzet") {
        fvOmzetIdx = j;
        console.log(`[Excel Import] EVALUASI: OMZET FreshVision ditemukan di index ${j} (baris ${i})`);
        break;
      }
    }
    if (fvOmzetIdx !== FV_START + 14) break;
  }

  // Jika maxCols tidak mencapai LQ, fallback ke header-based scan lama
  if (maxCols <= FV_START) {
    console.log("[Excel Import] EVALUASI: maxCols < LQ, menggunakan header scan brand...");
    const brandCols: Record<string, number> = {};
    const brandKW: [string, string[]][] = [
      ["freshvision", ["total fresh vision", "total freshvision", "freshvision"]],
      ["nutriflakes", ["total nutriflakes", "nutriflakes"]],
      ["freshmag", ["total freshmag", "freshmag"]],
      ["etawaku", ["total etawaku", "etawaku"]],
    ];
    const { dataStart } = getDateRows(rows);
    const limit = Math.min(rows.length, (dataStart >= 0 ? dataStart : 5) + 3);
    for (let i = 0; i < limit; i++) {
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
    function findOmzetNear(anchor: number): number {
      let bestCol = anchor, bestSum = 0;
      for (let c = anchor; c < Math.min(anchor + 20, maxCols); c++) {
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
      const omzet_freshmag    = iFM >= 0 ? cleanRp(r[iFM]) : 0;
      const omzet_etawaku     = iET >= 0 ? cleanRp(r[iET]) : 0;
      let omzet_total = iTotal >= 0 ? cleanRp(r[iTotal]) : 0;
      if (omzet_total <= 0) omzet_total = omzet_freshvision + omzet_nutriflakes + omzet_freshmag + omzet_etawaku;
      if (omzet_total > 0) result.push({ tanggal: dateStr, omzet_freshvision, omzet_nutriflakes, omzet_freshmag, omzet_etawaku, omzet_total });
    }
    if (result.length > 0) console.log("[Excel Import] EVALUASI first row:", result[0]);
    else console.warn("[Excel Import] EVALUASI: no valid rows found (fallback)!");
    return result;
  }

  // Utama: gunakan FreshVision block di LQ-MH
  const result: EvalRow[] = [];
  for (const r of dataRows) {
    const { dateStr } = cleanDate(r[0]);
    if (!dateStr) continue;
    const omzet_fv = cleanRp(r[fvOmzetIdx]);
    if (omzet_fv > 0) {
      result.push({
        tanggal: dateStr,
        omzet_freshvision: omzet_fv,
        omzet_nutriflakes: 0,
        omzet_freshmag:    0,
        omzet_etawaku:     0,
        omzet_total:       omzet_fv,
      });
    }
  }
  if (result.length > 0) console.log("[Excel Import] EVALUASI first row:", result[0]);
  else console.warn("[Excel Import] EVALUASI: no valid FreshVision rows found at LQ-MH!");
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
    // Cost breakdown totals
    total_biaya_gmv_max: sum(shop, (r) => r.biaya_gmv_max),
    total_biaya_non_gmv_max: sum(shop, (r) => r.biaya_non_gmv_max),
    total_komisi_platform: sum(shop, (r) => r.komisi_platform),
    total_shipping_cost: sum(shop, (r) => r.shipping_cost),
    total_biaya_layanan_mall: sum(shop, (r) => r.biaya_layanan_mall),
    total_biaya_komisi_dinamis: sum(shop, (r) => r.biaya_komisi_dinamis),
    total_program_growth_extra: sum(shop, (r) => r.program_growth_extra),
    total_biaya_pemrosesan: sum(shop, (r) => r.biaya_pemrosesan),
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
// EXCEL EXPORT
// Generates a multi-sheet .xlsx with summary, daily rows, channels, weekly, and brands.
// Users can pivot / analyze the raw numbers in Excel rather than static PDF/PPT.
// ═══════════════════════════════════════════════════════════
function exportLaporanHarianToExcel(
  data: ApiResponse,
  target: number,
  health: { score: number; label: string; color: string },
  period: string,
) {
  const wb = XLSX.utils.book_new();
  const { summary: s, harian, weekly, channels, channel_data, evaluasi_per_brand, highlights } = data;
  const days = daysInPeriod(period);
  const projected = s.avg_omzet_harian * days;

  // ─── Sheet 1: Summary ───
  const summaryRows: (string | number)[][] = [
    ["Laporan Harian FreshVision — Ringkasan"],
    ["Periode", formatPeriod(period)],
    ["Hari berjalan", s.hari],
    ["Hari di bulan ini", days],
    [],
    ["KPI", "Nilai"],
    ["Total Omzet", s.total_omzet],
    ["Target Bulan", target],
    ["% Target Tercapai", parseFloat(((s.total_omzet / target) * 100).toFixed(2))],
    ["Proyeksi Akhir Bulan", Math.round(projected)],
    ["Total Closing", s.total_closing],
    ["Total Botol", s.total_botol],
    ["Avg Omzet Harian", s.avg_omzet_harian],
    ["Avg Closing Harian", s.avg_closing_harian],
    ["Nilai per Transaksi", s.nilai_per_txn],
    ["Rata Upsell (×)", parseFloat(s.rata_upsell.toFixed(2))],
    ["Rata CAC Total (%)", parseFloat(s.rata_cac.toFixed(2))],
    ["Rata CAC Ads (%)", parseFloat(s.rata_cac_ads.toFixed(2))],
    ["Total Biaya Iklan", s.total_biaya_iklan],
    ["Total Komisi Affiliate", s.total_komisi_aff],
    ["Total Cost", s.total_cost],
    ["ROAS (×)", parseFloat(s.roas.toFixed(2))],
    ["Cost per Closing", s.cost_per_closing],
    ["Cost per Botol", s.cost_per_botol],
    ["Margin Setelah Biaya (%)", s.margin_after_cost],
    ["Kontribusi FV (%)", s.pct_kontribusi_fv],
    [],
    ["Health Score", health.score, health.label],
    ["Best Day", highlights.best_day?.tanggal ?? "", highlights.best_day?.omzet ?? ""],
    ["Worst Day", highlights.worst_day?.tanggal ?? "", highlights.worst_day?.omzet ?? ""],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryRows), "Ringkasan");

  // ─── Sheet 2: Daily rows ───
  const harianHeader = [
    "Tanggal", "Omzet", "Closing", "Botol", "Nilai/Trx",
    "Biaya Iklan", "Komisi Affiliate", "CAC Ads (%)", "CAC Total (%)",
    "Upsell (×)", "Omzet Total Brand", "Kontribusi FV (%)",
  ];
  const harianRows = harian.map((r) => [
    r.tanggal, r.omzet, r.closing, r.botol, r.nilai_per_txn,
    r.biaya_iklan, r.komisi_affiliate, r.cac_ads, r.cac_total,
    r.upsell, r.omzet_total_brand, r.pct_kontribusi_fv,
  ]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([harianHeader, ...harianRows]), "Harian");

  // ─── Sheet 3: Channels summary ───
  const chanHeader = [
    "Channel", "Omzet", "Closing", "Botol", "Biaya/Komisi",
    "ROI (×)", "Cost/Closing", "Cost/Botol", "Avg Trx", "Botol/Closing",
    "Upsell (×)", "CAC (%)", "Hari",
  ];
  const chanRows = Object.entries(channels).map(([k, c]) => [
    k, c.total_omzet, c.total_closing, c.total_botol, c.total_biaya_iklan,
    c.roi, c.cost_per_closing, c.cost_per_botol, c.omzet_per_closing, c.bottle_per_closing,
    parseFloat(c.rata_upsell.toFixed(2)), parseFloat(c.rata_cac.toFixed(2)), c.hari,
  ]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([chanHeader, ...chanRows]), "Channel Summary");

  // ─── Sheet 4: Weekly ───
  const weekHeader = ["Minggu", "Hari", "Omzet", "Closing", "Botol", "Avg Omzet/Hari", "Upsell", "CAC (%)", "WoW Omzet (%)", "WoW Closing (%)"];
  const weekRows = weekly.map((w) => [
    w.label, w.hari, w.total_omzet, w.total_closing, w.total_botol,
    Math.round(w.rata_omzet_harian), parseFloat(w.rata_upsell.toFixed(2)),
    parseFloat(w.rata_cac.toFixed(2)), w.wow_omzet, w.wow_closing,
  ]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([weekHeader, ...weekRows]), "Mingguan");

  // ─── Sheet 5: Brand comparison ───
  const brandRows: (string | number)[][] = [
    ["Brand", "Omzet", "% Share"],
    ["FreshVision", evaluasi_per_brand.freshvision, pctOf(evaluasi_per_brand.freshvision, evaluasi_per_brand.total)],
    ["Nutriflakes", evaluasi_per_brand.nutriflakes, pctOf(evaluasi_per_brand.nutriflakes, evaluasi_per_brand.total)],
    ["Freshmag", evaluasi_per_brand.freshmag, pctOf(evaluasi_per_brand.freshmag, evaluasi_per_brand.total)],
    ["Etawaku", evaluasi_per_brand.etawaku, pctOf(evaluasi_per_brand.etawaku, evaluasi_per_brand.total)],
    ["Total", evaluasi_per_brand.total, 100],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(brandRows), "Brand Mix");

  // ─── Sheet 6+: Per-channel daily rows (only when data exists) ───
  const chDailyHeader = ["Tanggal", "Omzet", "Closing", "Botol", "Biaya Iklan", "Upsell", "CAC (%)"];
  const addChanDailySheet = (name: string, rows: ChannelRow[]) => {
    if (!rows?.length) return;
    const body = rows.map((r) => [r.tanggal, r.omzet, r.closing, r.botol, r.biaya_iklan, r.upsell, r.cac_total]);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([chDailyHeader, ...body]), name);
  };
  addChanDailySheet("Video", channel_data.video);
  addChanDailySheet("Live", channel_data.live);
  addChanDailySheet("Shop Tab", channel_data.shop_tab);
  addChanDailySheet("Affiliate", channel_data.affiliate);

  const filename = `LaporanHarian_${period || "export"}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename);
}

function pctOf(part: number, total: number): number {
  return total > 0 ? parseFloat(((part / total) * 100).toFixed(2)) : 0;
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
  const [noteCount, setNoteCount] = useState(0);

  // ─── Determine active data & period (needed for target lookup) ───
  const isLive = selectedPeriod === "live";
  const activeData = isLive ? liveData : savedData;
  const activePeriod = useMemo(
    () => detectPeriodFromData(activeData, isLive ? undefined : selectedPeriod),
    [activeData, isLive, selectedPeriod],
  );

  // Target is now period-scoped: loading a historical month shows that month's target.
  const { target, setTarget } = useTarget(activePeriod);
  const daysInCurrentPeriod = daysInPeriod(activePeriod);

  // Load note count for badge
  useEffect(() => {
    loadDailyNotes(activePeriod).then(n => {
      setNoteCount(Object.keys(n).length);
    }).catch(() => setNoteCount(0));
  }, [activePeriod, activeTab]);

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
  // Use a content-hash as the guard so SWR refreshes that bring genuinely new data
  // trigger another save, instead of permanently blocking after the first save.
  const autoSaveHashRef = useRef<string>("");
  useEffect(() => {
    if (!liveData?.summary) return;
    if (dataMode !== "live") return; // Don't auto-save when viewing imported/saved data
    const hash = `${liveData.summary.total_omzet}:${liveData.summary.hari}:${liveData.harian?.length ?? 0}`;
    if (hash === autoSaveHashRef.current) return;
    autoSaveHashRef.current = hash;
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

  // ─── Auto-load previous month for MoM comparison ───
  useEffect(() => {
    if (!activeData?.summary) {
      setPrevMonthData(null);
      setPrevMonthPeriod("");
      return;
    }
    const currentPeriod = activePeriod;
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
  }, [activeData, activePeriod, prevMonthPeriod, prevMonthData]);

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

  const handleExport = (type: "pdf" | "ppt" | "excel") => {
    const exportData = {
      summary: s, harian, channels, weekly, evaluasi_per_brand, highlights,
      target, healthScore: health.score, healthLabel: health.label,
      period: activePeriod,
    };
    if (type === "pdf") generatePdf(exportData);
    else if (type === "ppt") generatePpt(exportData);
    else exportLaporanHarianToExcel(data, target, health, activePeriod);
  };
  const tabs = [
    { key: "overview", label: "Overview", icon: <BarChart3 size={14} /> },
    { key: "insights", label: "Insights", icon: <Eye size={14} /> },
    { key: "forecast", label: "Forecast", icon: <Rocket size={14} /> },
    { key: "cost", label: "Cost Analysis", icon: <DollarSign size={14} /> },
    { key: "channels", label: "Per Channel", icon: <Zap size={14} /> },
    { key: "weekly", label: "Evaluasi Mingguan", icon: <Target size={14} /> },
    { key: "scorecard", label: "Scorecard", icon: <Trophy size={14} /> },
    { key: "notes", label: "Notes", icon: <StickyNote size={14} />, badge: noteCount },
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
            <div className={`hidden sm:flex items-center gap-2 rounded-xl px-3.5 py-2.5 relative group cursor-help transition-all duration-300 ${health.score >= 80 ? 'bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 animate-pulse-glow' : health.score >= 60 ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200' : health.score >= 40 ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200' : 'bg-gradient-to-r from-red-50 to-rose-50 border border-red-200'}`}>
              <div className={`text-2xl font-black ${health.color} animate-score-reveal text-number`}>{health.score}</div>
              <div className="text-[10px] leading-tight">
                <div className="font-bold text-gray-600">Health Score</div>
                <div className={`font-semibold ${health.color}`}>{health.label}</div>
              </div>
              {/* Tooltip */}
              <div className="absolute top-full left-0 mt-2 hidden group-hover:block z-20 w-72 bg-gray-900 text-white text-[11px] rounded-lg shadow-xl p-3 leading-relaxed">
                <div className="font-bold mb-1.5">Cara perhitungan (total 100):</div>
                <div className="space-y-0.5 text-gray-200">
                  <div>• <strong>Omzet vs Target</strong> (40 pts): {(Math.min(s.total_omzet / target, 1) * 40).toFixed(0)}</div>
                  <div>• <strong>Upsell</strong> (20 pts): {Math.min(((s.rata_upsell - 1) / 0.3) * 20, 20).toFixed(0)} — 1.3× = max</div>
                  <div>• <strong>CAC</strong> (20 pts): {Math.max(0, Math.min(((70 - s.rata_cac) / 20) * 20, 20)).toFixed(0)} — &lt;50% = max</div>
                  <div>• <strong>ROAS</strong> (20 pts): {Math.min(Math.max(0, (s.roas - 2) / 2) * 20, 20).toFixed(0)} — &gt;4× = max</div>
                </div>
                <div className="mt-1.5 pt-1.5 border-t border-gray-700 text-gray-300">
                  ≥80 Excellent · ≥60 Good · ≥40 Needs Improvement · &lt;40 Critical
                </div>
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
            <button onClick={() => handleExport("excel")} className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50 text-sm transition" title="Download Excel (.xlsx)">
              <Download size={14} /> Excel
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
      <ExecutiveSummary s={s} target={target} health={health} highlights={highlights} prevMonthData={prevMonthData} prevMonthPeriod={prevMonthPeriod} daysInPeriod={daysInCurrentPeriod} harian={harian} />

      {/* ═══ TAB BAR ═══ */}
      <div className="relative">
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto scrollbar-hide">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${activeTab === t.key ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
              {t.icon} {t.label}
              {(t as any).badge > 0 && (
                <span className="bg-orange-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">{(t as any).badge}</span>
              )}
            </button>
          ))}
        </div>
        {/* Scroll gradient indicator for mobile */}
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-gray-100 to-transparent rounded-r-xl pointer-events-none sm:hidden" />
      </div>

      {/* ═══ TAB CONTENT ═══ */}
      <div className="animate-fade-slide-up" key={activeTab}>
      {activeTab === "overview" && (
        <OverviewTab
          s={s}
          target={target}
          harian={harian}
          evaluasi={evaluasi_per_brand}
          snapshot={data}
          prevSnapshot={prevMonthData}
          periodKey={activePeriod}
          daysInPeriod={daysInCurrentPeriod}
        />
      )}
      {activeTab === "insights" && (
        <InsightsTab
          s={s}
          target={target}
          harian={harian}
          channels={channels}
          channelData={channel_data}
          daysInPeriod={daysInCurrentPeriod}
          activePeriod={activePeriod}
        />
      )}
      {activeTab === "forecast" && (
        <ForecastTab
          s={s}
          target={target}
          harian={harian}
          daysInPeriod={daysInCurrentPeriod}
        />
      )}
      {activeTab === "cost" && <CostTab s={s} harian={harian} />}
      {activeTab === "channels" && <ChannelsTab channels={channels} channelData={channel_data} />}
      {activeTab === "weekly" && <WeeklyTab weekly={weekly} s={s} target={target} harian={harian} daysInPeriod={daysInCurrentPeriod} />}
      {activeTab === "scorecard" && (
        <ScorecardTab
          s={s}
          target={target}
          harian={harian}
          channels={channels}
          daysInPeriod={daysInCurrentPeriod}
          prevMonthData={prevMonthData}
        />
      )}
      {activeTab === "notes" && (
        <DailyNotesJournal
          harian={harian}
          activePeriod={activePeriod}
        />
      )}
      </div>
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

function ExecutiveSummary({ s, target, health, highlights, prevMonthData, prevMonthPeriod, daysInPeriod, harian = [] }: { s: Summary; target: number; health: { score: number; label: string; color: string }; highlights: Highlights; prevMonthData?: ApiResponse | null; prevMonthPeriod?: string; daysInPeriod: number; harian?: HarianRow[] }) {
  // Sparkline data: last 7 data points for each metric
  const sparkLen = Math.min(7, harian.length);
  const tail = harian.slice(-sparkLen);
  const sparkOmzet = tail.map(r => r.omzet);
  const sparkBotol = tail.map(r => r.botol);
  const sparkUpsell = tail.map(r => r.upsell);
  const sparkCac = tail.map(r => r.cac_total);
  const sparkRoas = tail.map(r => r.biaya_iklan > 0 ? r.omzet / r.biaya_iklan : 0);
  const pctTarget = (s.total_omzet / target) * 100;
  const sisaTarget = Math.max(0, target - s.total_omzet);
  const sisaHari = Math.max(1, daysInPeriod - s.hari);
  const needPerDay = sisaTarget / sisaHari;
  const onTrack = s.avg_omzet_harian >= (target / daysInPeriod);

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
    <div className="bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/20 rounded-2xl border border-blue-100/50 p-5 space-y-4 shadow-sm">
      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between text-sm mb-1.5">
          <span className="font-medium text-gray-700">Progress Target: <strong>{fR(s.total_omzet)}</strong> / {fR(target)}</span>
          <span className={`font-bold ${pctTarget >= 100 ? "text-green-600" : pctTarget >= 70 ? "text-blue-600" : "text-orange-600"}`}>{pctTarget.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3.5 overflow-hidden shadow-inner">
          <div className={`h-3.5 rounded-full transition-all duration-1000 animate-progress-fill ${pctTarget >= 100 ? "bg-gradient-to-r from-green-400 to-emerald-500" : pctTarget >= 70 ? "bg-gradient-to-r from-blue-400 to-blue-600" : "bg-gradient-to-r from-orange-400 to-orange-600"}`}
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
        <MiniKpi label="Omzet" value={fR(s.total_omzet)} sub={`${s.hari} hari`} delta={deltas?.omzet} sparkData={sparkOmzet} />
        <MiniKpi label="Avg/Hari" value={fR(s.avg_omzet_harian)} sub={`${fN(s.avg_closing_harian)} closing`} delta={deltas?.avgDay} sparkData={sparkOmzet} />
        <MiniKpi label="Botol" value={fN(s.total_botol)} sub={`~${fN(s.avg_botol_harian)}/hari`} delta={deltas?.botol} sparkData={sparkBotol} />
        <MiniKpi label="Nilai/Txn" value={fR(s.nilai_per_txn)} sub={`${fN(s.total_closing)} txn`} delta={deltas?.nilai} />
        <MiniKpi label="Upsell" value={`${s.rata_upsell.toFixed(2)}x`} sub={s.rata_upsell >= 1.3 ? "🟢 Baik" : s.rata_upsell >= 1.1 ? "🟡 Cukup" : "🔴 Rendah"} delta={deltas?.upsell} sparkData={sparkUpsell} />
        <MiniKpi label="CAC" value={`${s.rata_cac.toFixed(1)}%`} sub={s.rata_cac <= 50 ? "🟢 Efisien" : s.rata_cac <= 60 ? "🟡 Normal" : "🔴 Tinggi"} delta={deltas?.cac} isInverse sparkData={sparkCac} />
        <MiniKpi label="ROAS" value={`${s.roas.toFixed(1)}x`} sub={s.roas >= 4 ? "🟢 Excellent" : s.roas >= 3 ? "🟡 OK" : "🔴 Low"} delta={deltas?.roas} sparkData={sparkRoas} />
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
function MiniKpi({ label, value, sub, delta, isInverse, sparkData }: { label: string; value: string; sub: string; delta?: number | null; isInverse?: boolean; sparkData?: number[] }) {
  const isUp = delta != null && delta > 0;
  const isDown = delta != null && delta < 0;
  const isPositive = isInverse ? isDown : isUp;
  const isNegative = isInverse ? isUp : isDown;
  const deltaColor = isPositive ? "text-green-600" : isNegative ? "text-red-600" : "text-gray-400";
  const arrow = isUp ? "↑" : isDown ? "↓" : "—";
  const sparkSvg = useMemo(() => {
    if (!sparkData || sparkData.length < 2) return null;
    const w = 56, h = 16;
    const mn = Math.min(...sparkData), mx = Math.max(...sparkData);
    const range = mx - mn || 1;
    const points = sparkData.map((v, i) => {
      const x = (i / (sparkData.length - 1)) * w;
      const y = h - ((v - mn) / range) * (h - 2) - 1;
      return `${x},${y}`;
    }).join(" ");
    const trend = sparkData[sparkData.length - 1] >= sparkData[0];
    const color = isInverse ? (trend ? "#ef4444" : "#22c55e") : (trend ? "#22c55e" : "#ef4444");
    return (
      <svg width={w} height={h} className="mx-auto mt-0.5">
        <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
      </svg>
    );
  }, [sparkData, isInverse]);
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
      {sparkSvg}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// OVERVIEW TAB
// ═══════════════════════════════════════════════════════════
function OverviewTab({
  s, target, harian, evaluasi,
  snapshot, prevSnapshot, periodKey, daysInPeriod,
}: {
  s: Summary;
  target: number;
  harian: HarianRow[];
  evaluasi: EvaluasiPerBrand;
  snapshot?: ApiResponse;
  prevSnapshot?: ApiResponse | null;
  periodKey?: string;
  daysInPeriod: number;
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
        <div className="space-y-5">
          <AlertPanel
            summary={s}
            harian={harian.map(h => ({ tanggal: h.tanggal, omzet: h.omzet, biaya_iklan: h.biaya_iklan }))}
            target={target}
            period={periodKey}
          />
          <TelegramQuickActions />
          <ReportButton
            summary={s}
            target={target}
            channels={snapshot?.channels}
            harian={harian}
            evaluasi_per_brand={evaluasi}
            highlights={snapshot?.highlights}
            aiSummary={undefined}
            period={periodKey}
          />
        </div>
      </div>
      {/* Executive Report */}
      <ExecutiveReport s={s} target={target} harian={harian} daysInPeriod={daysInPeriod} />
      {/* Heatmap Calendar */}
      <HeatmapCalendar harian={harian} target={target} daysInPeriod={daysInPeriod} />
      {/* Omzet & Botol Chart */}
      <OmzetBotolChart harian={harian} avgTarget={target / daysInPeriod} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <BrandDonutChart evaluasi={evaluasi} />
        <UpsellCacChart harian={harian} />
      </div>
      <HarianTable harian={harian} s={s} />
    </div>
  );
}

function ExecutiveReport({ s, target, harian, daysInPeriod }: { s: Summary; target: number; harian: HarianRow[]; daysInPeriod: number }) {
  const report = useMemo(() => {
    const pctTarget = (s.total_omzet / target) * 100;
    const projected = s.avg_omzet_harian * daysInPeriod;
    const sisaHari = Math.max(1, daysInPeriod - s.hari);
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
  }, [s, target, harian, daysInPeriod]);

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

function HeatmapCalendar({ harian, target, daysInPeriod }: { harian: HarianRow[]; target: number; daysInPeriod: number }) {
  const dailyTarget = target / daysInPeriod;
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

  // Cost breakdown items for the structure panel
  const costBreakdown = useMemo(() => {
    const items = [
      { label: "Biaya Iklan GMV Max", value: s.total_biaya_gmv_max, color: "#3b82f6", icon: "📣" },
      { label: "Biaya Iklan Non GMV Max", value: s.total_biaya_non_gmv_max, color: "#8b5cf6", icon: "📢" },
      { label: "Komisi Platform", value: s.total_komisi_platform, color: "#f97316", icon: "🏪" },
      { label: "Shipping Cost", value: s.total_shipping_cost, color: "#10b981", icon: "🚚" },
      { label: "Biaya Layanan Mall", value: s.total_biaya_layanan_mall, color: "#ef4444", icon: "🏬" },
      { label: "Biaya Komisi Dinamis", value: s.total_biaya_komisi_dinamis, color: "#f59e0b", icon: "⚡" },
      { label: "Program Growth Extra", value: s.total_program_growth_extra, color: "#6366f1", icon: "🌱" },
      { label: "Biaya Pemrosesan Pesanan", value: s.total_biaya_pemrosesan, color: "#ec4899", icon: "📦" },
      { label: "Komisi Affiliate", value: s.total_komisi_aff, color: "#14b8a6", icon: "🤝" },
    ].filter(item => item.value > 0);
    const totalAllCosts = items.reduce((a, i) => a + i.value, 0);
    return items.map(item => ({
      ...item,
      pct: totalAllCosts > 0 ? (item.value / totalAllCosts) * 100 : 0,
      avgDaily: s.hari > 0 ? Math.round(item.value / s.hari) : 0,
    })).sort((a, b) => b.value - a.value);
  }, [s]);

  const totalPlatformFees = s.total_komisi_platform + s.total_shipping_cost +
    s.total_biaya_layanan_mall + s.total_biaya_komisi_dinamis +
    s.total_program_growth_extra + s.total_biaya_pemrosesan;
  const grandTotalCost = s.total_biaya_iklan + s.total_komisi_aff + totalPlatformFees;
  const netProfit = s.total_omzet - grandTotalCost;
  const netMargin = s.total_omzet > 0 ? (netProfit / s.total_omzet) * 100 : 0;

  return (
    <div className="space-y-5">
      {/* Cost KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <CostKpiCard label="Total Biaya Iklan" value={fR(s.total_biaya_iklan)} icon="📣" />
        <CostKpiCard label="Total Komisi Affiliate" value={fR(s.total_komisi_aff)} icon="🤝" />
        <CostKpiCard label="Total Biaya Platform" value={fR(totalPlatformFees)} icon="🏪" />
        <CostKpiCard label="ROAS" value={`${s.roas.toFixed(1)}x`} icon="📈" highlight={s.roas >= 3} />
        <CostKpiCard label="Cost/Closing" value={fR(s.cost_per_closing)} icon="🏷️" />
        <CostKpiCard label="Net Margin" value={`${netMargin.toFixed(1)}%`} icon="💰" highlight={netMargin > 30} />
      </div>

      {/* ═══ COST STRUCTURE BREAKDOWN ═══ */}
      <div className="bg-gradient-to-br from-slate-900 via-gray-900 to-zinc-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/[0.02] rounded-full -mr-24 -mt-24" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/[0.02] rounded-full -ml-16 -mb-16" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-5">
            <div className="bg-white/10 p-2 rounded-xl"><DollarSign size={20} /></div>
            <div>
              <h3 className="text-base font-bold">Cost Structure Breakdown</h3>
              <p className="text-xs text-white/50">Detail seluruh komponen biaya bulanan</p>
            </div>
          </div>

          {/* Summary boxes */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <div className="bg-white/5 rounded-xl p-3 border border-white/10">
              <div className="text-[10px] text-white/40 uppercase">Total Omzet</div>
              <div className="text-lg font-black text-number text-emerald-400">{fR(s.total_omzet)}</div>
            </div>
            <div className="bg-white/5 rounded-xl p-3 border border-white/10">
              <div className="text-[10px] text-white/40 uppercase">Total Biaya</div>
              <div className="text-lg font-black text-number text-rose-400">{fR(grandTotalCost)}</div>
            </div>
            <div className="bg-white/5 rounded-xl p-3 border border-white/10">
              <div className="text-[10px] text-white/40 uppercase">Net Profit</div>
              <div className={`text-lg font-black text-number ${netProfit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{fR(netProfit)}</div>
            </div>
            <div className="bg-white/5 rounded-xl p-3 border border-white/10">
              <div className="text-[10px] text-white/40 uppercase">Net Margin</div>
              <div className={`text-lg font-black text-number ${netMargin >= 30 ? "text-emerald-400" : netMargin >= 15 ? "text-amber-400" : "text-rose-400"}`}>{netMargin.toFixed(1)}%</div>
            </div>
          </div>

          {/* Horizontal bar breakdown */}
          <div className="space-y-2.5">
            {costBreakdown.map((item, i) => (
              <div key={i} className="group">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span>{item.icon}</span>
                    <span className="text-white/80 font-medium">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-white/40">{fR(item.avgDaily)}/hari</span>
                    <span className="font-bold text-white">{fR(item.value)}</span>
                    <span className="text-white/50 w-12 text-right">{item.pct.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="w-full bg-white/5 rounded-full h-2.5 overflow-hidden">
                  <div className="h-2.5 rounded-full transition-all duration-700 group-hover:opacity-80"
                    style={{ width: `${Math.min(item.pct, 100)}%`, backgroundColor: item.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ DAILY COST BREAKDOWN TABLE ═══ */}
      <div className="bg-white rounded-2xl border p-5">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
          📋 Detail Biaya Harian
          <span className="text-[10px] text-gray-400 font-normal ml-1">(scroll horizontal →)</span>
        </h3>
        <div className="overflow-x-auto -mx-2 px-2">
          <table className="w-full text-xs min-w-[900px]">
            <thead>
              <tr className="border-b-2 border-gray-100">
                <th className="py-2 px-2 text-left font-bold text-gray-600 sticky left-0 bg-white">Tanggal</th>
                <th className="py-2 px-2 text-right font-bold text-blue-600">GMV Max</th>
                <th className="py-2 px-2 text-right font-bold text-purple-600">Non GMV</th>
                <th className="py-2 px-2 text-right font-bold text-orange-600">Iklan+PPN</th>
                <th className="py-2 px-2 text-right font-bold text-orange-500">Komisi Plt</th>
                <th className="py-2 px-2 text-right font-bold text-emerald-600">Shipping</th>
                <th className="py-2 px-2 text-right font-bold text-red-500">Mall</th>
                <th className="py-2 px-2 text-right font-bold text-amber-600">K. Dinamis</th>
                <th className="py-2 px-2 text-right font-bold text-indigo-600">Growth</th>
                <th className="py-2 px-2 text-right font-bold text-pink-600">Proses</th>
                <th className="py-2 px-2 text-right font-bold text-teal-600">Affiliate</th>
                <th className="py-2 px-2 text-right font-bold text-gray-800">Total</th>
                <th className="py-2 px-2 text-right font-bold text-emerald-700">Omzet</th>
                <th className="py-2 px-2 text-right font-bold text-gray-600">Net</th>
              </tr>
            </thead>
            <tbody>
              {harian.map((r, i) => {
                const rowTotal = r.biaya_iklan + r.komisi_affiliate + r.komisi_platform +
                  r.shipping_cost + r.biaya_layanan_mall + r.biaya_komisi_dinamis +
                  r.program_growth_extra + r.biaya_pemrosesan;
                const rowNet = r.omzet - rowTotal;
                return (
                  <tr key={i} className={`border-b border-gray-50 hover:bg-gray-50/50 transition ${i % 2 === 0 ? "" : "bg-gray-50/30"}`}>
                    <td className="py-1.5 px-2 font-bold text-gray-700 sticky left-0 bg-white">{r.tanggal}</td>
                    <td className="py-1.5 px-2 text-right text-number">{r.biaya_gmv_max > 0 ? fR(r.biaya_gmv_max) : "—"}</td>
                    <td className="py-1.5 px-2 text-right text-number">{r.biaya_non_gmv_max > 0 ? fR(r.biaya_non_gmv_max) : "—"}</td>
                    <td className="py-1.5 px-2 text-right text-number font-medium">{fR(r.biaya_iklan)}</td>
                    <td className="py-1.5 px-2 text-right text-number">{r.komisi_platform > 0 ? fR(r.komisi_platform) : "—"}</td>
                    <td className="py-1.5 px-2 text-right text-number">{r.shipping_cost > 0 ? fR(r.shipping_cost) : "—"}</td>
                    <td className="py-1.5 px-2 text-right text-number">{r.biaya_layanan_mall > 0 ? fR(r.biaya_layanan_mall) : "—"}</td>
                    <td className="py-1.5 px-2 text-right text-number">{r.biaya_komisi_dinamis > 0 ? fR(r.biaya_komisi_dinamis) : "—"}</td>
                    <td className="py-1.5 px-2 text-right text-number">{r.program_growth_extra > 0 ? fR(r.program_growth_extra) : "—"}</td>
                    <td className="py-1.5 px-2 text-right text-number">{r.biaya_pemrosesan > 0 ? fR(r.biaya_pemrosesan) : "—"}</td>
                    <td className="py-1.5 px-2 text-right text-number">{r.komisi_affiliate > 0 ? fR(r.komisi_affiliate) : "—"}</td>
                    <td className="py-1.5 px-2 text-right text-number font-bold text-gray-800">{fR(rowTotal)}</td>
                    <td className="py-1.5 px-2 text-right text-number font-bold text-emerald-700">{fR(r.omzet)}</td>
                    <td className={`py-1.5 px-2 text-right text-number font-bold ${rowNet >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{fR(rowNet)}</td>
                  </tr>
                );
              })}
              {/* Totals row */}
              <tr className="border-t-2 border-gray-200 bg-gray-50 font-bold">
                <td className="py-2 px-2 sticky left-0 bg-gray-50 text-gray-800">TOTAL</td>
                <td className="py-2 px-2 text-right text-number">{fR(s.total_biaya_gmv_max)}</td>
                <td className="py-2 px-2 text-right text-number">{fR(s.total_biaya_non_gmv_max)}</td>
                <td className="py-2 px-2 text-right text-number">{fR(s.total_biaya_iklan)}</td>
                <td className="py-2 px-2 text-right text-number">{fR(s.total_komisi_platform)}</td>
                <td className="py-2 px-2 text-right text-number">{fR(s.total_shipping_cost)}</td>
                <td className="py-2 px-2 text-right text-number">{fR(s.total_biaya_layanan_mall)}</td>
                <td className="py-2 px-2 text-right text-number">{fR(s.total_biaya_komisi_dinamis)}</td>
                <td className="py-2 px-2 text-right text-number">{fR(s.total_program_growth_extra)}</td>
                <td className="py-2 px-2 text-right text-number">{fR(s.total_biaya_pemrosesan)}</td>
                <td className="py-2 px-2 text-right text-number">{fR(s.total_komisi_aff)}</td>
                <td className="py-2 px-2 text-right text-number text-gray-800">{fR(grandTotalCost)}</td>
                <td className="py-2 px-2 text-right text-number text-emerald-700">{fR(s.total_omzet)}</td>
                <td className={`py-2 px-2 text-right text-number ${netProfit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{fR(netProfit)}</td>
              </tr>
            </tbody>
          </table>
        </div>
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
function WeeklyTab({ weekly, s, target, harian, daysInPeriod }: { weekly: WeeklyRow[]; s: Summary; target: number; harian: HarianRow[]; daysInPeriod: number }) {
  // Use exact month length instead of hardcoded 30, so Feb/Apr/etc. are accurate.
  const weeksInMonth = daysInPeriod / 7;
  const weeklyTarget = target / weeksInMonth;
  const sisaHari = Math.max(1, daysInPeriod - s.hari);
  const sisaTarget = Math.max(0, target - s.total_omzet);
  const projected = s.avg_omzet_harian * daysInPeriod;

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
      <DailyEvalTable harian={harian} avgTarget={target / daysInPeriod} />
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

// ═══════════════════════════════════════════════════════════
// 🏆 TOP DAYS LEADERBOARD
// ═══════════════════════════════════════════════════════════
function TopDaysLeaderboard({ harian, s }: { harian: HarianRow[]; s: Summary }) {
  const top5 = useMemo(() =>
    [...harian].sort((a, b) => b.omzet - a.omzet).slice(0, 5).map((r, i) => ({
      ...r, rank: i + 1,
      pctOfTotal: s.total_omzet > 0 ? ((r.omzet / s.total_omzet) * 100) : 0,
    })),
    [harian, s]
  );
  const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];
  const barMax = top5[0]?.omzet || 1;

  return (
    <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 rounded-2xl border border-amber-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="bg-amber-500 text-white p-1.5 rounded-lg"><Award size={16} /></div>
        <h3 className="text-sm font-bold text-gray-900">Top 5 Hari Terbaik</h3>
      </div>
      <div className="space-y-2.5">
        {top5.map((r) => (
          <div key={r.tanggal} className="flex items-center gap-3 group">
            <span className="text-lg w-8 text-center">{medals[r.rank - 1]}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-xs font-semibold text-gray-800">{r.tanggal}</span>
                <span className="text-xs font-bold text-amber-700">{fR(r.omzet)}</span>
              </div>
              <div className="w-full bg-amber-100 rounded-full h-2 overflow-hidden">
                <div
                  className="h-2 rounded-full transition-all duration-700"
                  style={{
                    width: `${(r.omzet / barMax) * 100}%`,
                    background: r.rank === 1 ? 'linear-gradient(90deg, #f59e0b, #ef4444)' :
                      r.rank === 2 ? 'linear-gradient(90deg, #f59e0b, #f97316)' :
                        r.rank === 3 ? 'linear-gradient(90deg, #fbbf24, #f59e0b)' : '#fbbf24',
                  }}
                />
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-400">
                <span>{fN(r.closing)} closing</span>
                <span>·</span>
                <span>{fN(r.botol)} btl</span>
                <span>·</span>
                <span>{r.pctOfTotal.toFixed(1)}% total</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 📊 CUMULATIVE TRACKER
// ═══════════════════════════════════════════════════════════
function CumulativeTracker({ harian, target, daysInPeriod }: { harian: HarianRow[]; target: number; daysInPeriod: number }) {
  const chartData = useMemo(() => {
    let cumulative = 0;
    return harian.map((r, i) => {
      cumulative += r.omzet;
      const idealPace = (target / daysInPeriod) * (i + 1);
      return {
        tgl: r.tanggal,
        cumulative,
        target_pace: Math.round(idealPace),
        gap: cumulative - idealPace,
      };
    });
  }, [harian, target, daysInPeriod]);

  const lastData = chartData[chartData.length - 1];
  const isAhead = lastData && lastData.gap >= 0;

  return (
    <div className="bg-white rounded-2xl border p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          📊 Akumulasi Omzet vs Target Pace
        </h3>
        {lastData && (
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isAhead ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {isAhead ? '▲' : '▼'} {fR(Math.abs(lastData.gap))} {isAhead ? 'ahead' : 'behind'}
          </span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="gradCumulative" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="tgl" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 9 }} tickFormatter={(v) => fR(Number(v))} />
          <Tooltip content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0]?.payload;
            return (
              <div className="bg-white border rounded-xl shadow-lg p-3 text-xs space-y-1">
                <div className="font-bold">{d.tgl}</div>
                <div>📊 Akumulasi: <strong>{fR(d.cumulative)}</strong></div>
                <div>🎯 Target Pace: <strong>{fR(d.target_pace)}</strong></div>
                <div className={d.gap >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {d.gap >= 0 ? '▲' : '▼'} Gap: <strong>{fR(Math.abs(d.gap))}</strong>
                </div>
              </div>
            );
          }} />
          <Legend />
          <Area type="monotone" dataKey="cumulative" name="Akumulasi Omzet" stroke="#3b82f6" fill="url(#gradCumulative)" strokeWidth={2.5} />
          <Line type="monotone" dataKey="target_pace" name="Target Pace" stroke="#ef4444" strokeWidth={2} strokeDasharray="6 3" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 🔥 STREAK & CONSISTENCY TRACKER
// ═══════════════════════════════════════════════════════════
function StreakTracker({ harian, target, daysInPeriod }: { harian: HarianRow[]; target: number; daysInPeriod: number }) {
  const stats = useMemo(() => {
    const dailyTarget = target / daysInPeriod;
    const avgOmzet = harian.length > 0 ? harian.reduce((a, r) => a + r.omzet, 0) / harian.length : 0;

    // Streaks (consecutive days above average)
    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;
    for (const r of harian) {
      if (r.omzet >= avgOmzet) {
        tempStreak++;
        bestStreak = Math.max(bestStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    }
    currentStreak = tempStreak;

    // Consistency: % days meeting daily target
    const daysAboveTarget = harian.filter(r => r.omzet >= dailyTarget).length;
    const consistency = harian.length > 0 ? (daysAboveTarget / harian.length) * 100 : 0;

    // Volatility: coefficient of variation
    const stdDev = Math.sqrt(
      harian.reduce((sum, r) => sum + Math.pow(r.omzet - avgOmzet, 2), 0) / (harian.length || 1)
    );
    const volatility = avgOmzet > 0 ? (stdDev / avgOmzet) * 100 : 0;

    return { currentStreak, bestStreak, consistency, volatility, daysAboveTarget, avgOmzet, dailyTarget };
  }, [harian, target, daysInPeriod]);

  const consistencyColor = stats.consistency >= 70 ? '#22c55e' : stats.consistency >= 50 ? '#f59e0b' : '#ef4444';
  const circlePerimeter = 2 * Math.PI * 38;
  const dashOffset = circlePerimeter * (1 - stats.consistency / 100);

  return (
    <div className="bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 rounded-2xl border border-orange-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="bg-orange-500 text-white p-1.5 rounded-lg"><Flame size={16} /></div>
        <h3 className="text-sm font-bold text-gray-900">Streak & Konsistensi</h3>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Consistency Gauge */}
        <div className="flex flex-col items-center">
          <div className="relative w-24 h-24">
            <svg width="96" height="96" viewBox="0 0 96 96">
              <circle cx="48" cy="48" r="38" fill="none" stroke="#e5e7eb" strokeWidth="6" />
              <circle cx="48" cy="48" r="38" fill="none" stroke={consistencyColor} strokeWidth="6"
                strokeLinecap="round" strokeDasharray={circlePerimeter} strokeDashoffset={dashOffset}
                transform="rotate(-90 48 48)" className="transition-all duration-1000" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-lg font-black" style={{ color: consistencyColor }}>{stats.consistency.toFixed(0)}%</div>
                <div className="text-[8px] text-gray-400">Konsistensi</div>
              </div>
            </div>
          </div>
          <div className="text-[10px] text-gray-500 mt-1">{stats.daysAboveTarget}/{harian.length} hari on target</div>
        </div>
        {/* Current Streak */}
        <div className="flex flex-col items-center justify-center bg-white/60 rounded-xl p-3">
          <Flame size={20} className="text-orange-500 mb-1" />
          <div className="text-2xl font-black text-orange-600">{stats.currentStreak}</div>
          <div className="text-[10px] text-gray-500 text-center">Current Streak</div>
          <div className="text-[9px] text-gray-400 mt-0.5">hari berturut-turut ≥ rata²</div>
        </div>
        {/* Best Streak */}
        <div className="flex flex-col items-center justify-center bg-white/60 rounded-xl p-3">
          <Award size={20} className="text-amber-500 mb-1" />
          <div className="text-2xl font-black text-amber-600">{stats.bestStreak}</div>
          <div className="text-[10px] text-gray-500 text-center">Best Streak</div>
          <div className="text-[9px] text-gray-400 mt-0.5">rekor terpanjang bulan ini</div>
        </div>
        {/* Volatility */}
        <div className="flex flex-col items-center justify-center bg-white/60 rounded-xl p-3">
          <TrendingUp size={20} className={`mb-1 ${stats.volatility <= 20 ? 'text-green-500' : stats.volatility <= 35 ? 'text-yellow-500' : 'text-red-500'}`} />
          <div className={`text-2xl font-black ${stats.volatility <= 20 ? 'text-green-600' : stats.volatility <= 35 ? 'text-yellow-600' : 'text-red-600'}`}>
            {stats.volatility.toFixed(0)}%
          </div>
          <div className="text-[10px] text-gray-500 text-center">Volatility</div>
          <div className="text-[9px] text-gray-400 mt-0.5">
            {stats.volatility <= 20 ? '🟢 Stabil' : stats.volatility <= 35 ? '🟡 Fluktuatif' : '🔴 Volatile'}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 🎯 DAILY TARGET GAUGE (SVG Speedometer)
// ═══════════════════════════════════════════════════════════
function DailyTargetGauge({ harian, target, daysInPeriod }: { harian: HarianRow[]; target: number; daysInPeriod: number }) {
  const dailyTarget = target / daysInPeriod;
  const lastDay = harian[harian.length - 1];
  const todayOmzet = lastDay?.omzet || 0;
  const pct = Math.min((todayOmzet / dailyTarget) * 100, 150);

  // SVG gauge arc parameters
  const cx = 120, cy = 110, r = 80;
  const startAngle = -210; // degrees (from bottom left)
  const endAngle = 30;
  const totalAngle = endAngle - startAngle;
  const currentAngle = startAngle + (pct / 150) * totalAngle;

  const polarToXY = (angle: number, radius: number) => {
    const rad = (angle * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  };

  const arcStart = polarToXY(startAngle, r);
  const arcEnd = polarToXY(endAngle, r);
  const needleEnd = polarToXY(currentAngle, r - 10);

  const gaugeColor = pct >= 100 ? '#22c55e' : pct >= 70 ? '#f59e0b' : '#ef4444';

  // Arc path for background
  const bgArc = `M ${arcStart.x} ${arcStart.y} A ${r} ${r} 0 1 1 ${arcEnd.x} ${arcEnd.y}`;

  // Arc path for filled portion
  const filledEnd = polarToXY(currentAngle, r);
  const largeArc = (currentAngle - startAngle) > 180 ? 1 : 0;
  const filledArc = `M ${arcStart.x} ${arcStart.y} A ${r} ${r} 0 ${largeArc} 1 ${filledEnd.x} ${filledEnd.y}`;

  return (
    <div className="bg-white rounded-2xl border p-5">
      <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
        🎯 Omzet Hari Terakhir vs Target Harian
      </h3>
      <div className="flex items-center justify-center">
        <svg width="240" height="150" viewBox="0 0 240 150">
          {/* Background arc */}
          <path d={bgArc} fill="none" stroke="#e5e7eb" strokeWidth="12" strokeLinecap="round" />
          {/* Filled arc */}
          <path d={filledArc} fill="none" stroke={gaugeColor} strokeWidth="12" strokeLinecap="round" className="transition-all duration-1000" />
          {/* Needle */}
          <line x1={cx} y1={cy} x2={needleEnd.x} y2={needleEnd.y} stroke="#374151" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx={cx} cy={cy} r="5" fill="#374151" />
          {/* Labels */}
          <text x={cx} y={cy + 25} textAnchor="middle" className="text-xs font-bold" fill={gaugeColor}>
            {pct.toFixed(0)}%
          </text>
          <text x={cx} y={cy + 38} textAnchor="middle" className="text-[9px]" fill="#6b7280">
            {fR(todayOmzet)} / {fR(dailyTarget)}
          </text>
          {/* 0%, 100%, 150% markers */}
          <text x={arcStart.x - 10} y={arcStart.y + 15} textAnchor="middle" className="text-[8px]" fill="#9ca3af">0%</text>
          <text x={arcEnd.x + 10} y={arcEnd.y + 15} textAnchor="middle" className="text-[8px]" fill="#9ca3af">150%</text>
        </svg>
      </div>
      <div className="text-center text-[10px] text-gray-400 -mt-2">
        {lastDay ? `Data hari: ${lastDay.tanggal}` : 'Belum ada data'}
        {pct >= 100 && ' · ✅ Target harian tercapai!'}
        {pct >= 70 && pct < 100 && ' · 🟡 Hampir tercapai'}
        {pct < 70 && pct > 0 && ' · 🔴 Di bawah target'}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 🗒️ DAILY NOTES MODAL
// ═══════════════════════════════════════════════════════════
function DailyNotesModal({ date, period, existingNote, onSave, onClose }: {
  date: string; period: string; existingNote?: string;
  onSave: (date: string, text: string) => void; onClose: () => void;
}) {
  const [text, setText] = useState(existingNote || "");
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900 flex items-center gap-1.5">
            <StickyNote size={16} className="text-amber-500" /> Catatan — {date}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Tambahkan catatan untuk hari ini... (contoh: flash sale, libur, ganti iklan)"
          className="w-full border rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none resize-none h-28"
          autoFocus
        />
        <div className="flex gap-2">
          <button
            onClick={() => { onSave(date, text); onClose(); }}
            className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 transition"
          >
            <Save size={14} /> Simpan
          </button>
          {existingNote && (
            <button
              onClick={() => { onSave(date, ""); onClose(); }}
              className="px-3 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 📅 ENHANCED HEATMAP WITH NOTES
// ═══════════════════════════════════════════════════════════
function HeatmapWithNotes({ harian, target, daysInPeriod, activePeriod }: {
  harian: HarianRow[]; target: number; daysInPeriod: number; activePeriod: string;
}) {
  const dailyTarget = target / daysInPeriod;
  const maxOmzet = Math.max(...harian.map((r) => r.omzet));
  const [notes, setNotes] = useState<Record<string, DailyNote>>({});
  const [noteModal, setNoteModal] = useState<{ date: string } | null>(null);

  useEffect(() => {
    loadDailyNotes(activePeriod).then(setNotes).catch(() => setNotes({}));
  }, [activePeriod]);

  const handleSaveNote = useCallback(async (date: string, text: string) => {
    await saveDailyNote(activePeriod, date, text);
    const updated = await loadDailyNotes(activePeriod);
    setNotes(updated);
  }, [activePeriod]);

  const getColor = (omzet: number): string => {
    if (omzet >= dailyTarget * 1.2) return "bg-green-500 text-white";
    if (omzet >= dailyTarget) return "bg-green-300 text-green-900";
    if (omzet >= dailyTarget * 0.7) return "bg-yellow-300 text-yellow-900";
    if (omzet > 0) return "bg-red-300 text-red-900";
    return "bg-gray-100 text-gray-400";
  };

  return (
    <div className="bg-white rounded-2xl border p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">📅 Heatmap Omzet Harian <span className="text-gray-400 font-normal text-[10px]">(klik untuk catatan)</span></h3>
        {Object.keys(notes).length > 0 && (
          <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
            📝 {Object.keys(notes).length} catatan
          </span>
        )}
      </div>
      <div className="grid grid-cols-7 sm:grid-cols-10 lg:grid-cols-15 gap-1.5">
        {harian.map((r, i) => {
          const hasNote = !!notes[r.tanggal];
          return (
            <div key={i}
              onClick={() => setNoteModal({ date: r.tanggal })}
              className={`rounded-lg p-1.5 text-center cursor-pointer transition hover:scale-105 hover:ring-2 hover:ring-blue-400 ${getColor(r.omzet)} ${r.omzet === maxOmzet ? "ring-2 ring-blue-500" : ""} ${hasNote ? "ring-1 ring-amber-400" : ""}`}
              title={`${r.tanggal}: ${fR(r.omzet)}${hasNote ? ` — 📝 ${notes[r.tanggal].text}` : ''}`}>
              <div className="text-[9px] font-bold leading-tight">{r.tanggal}</div>
              <div className="text-[8px] leading-tight mt-0.5">{fR(r.omzet)}</div>
              {hasNote && <div className="text-[7px] mt-0.5">📝</div>}
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-3 mt-3 text-[10px] text-gray-500">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500 inline-block" /> &gt;120% target</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-300 inline-block" /> On target</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-300 inline-block" /> 70-99%</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-300 inline-block" /> &lt;70%</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-200 ring-1 ring-amber-400 inline-block" /> Ada catatan</span>
      </div>
      {noteModal && (
        <DailyNotesModal
          date={noteModal.date}
          period={activePeriod}
          existingNote={notes[noteModal.date]?.text}
          onSave={handleSaveNote}
          onClose={() => setNoteModal(null)}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 🌊 CHANNEL MIX STACKED AREA CHART
// ═══════════════════════════════════════════════════════════
function ChannelMixAreaChart({ harian, channelData }: {
  harian: HarianRow[];
  channelData: { video: ChannelRow[]; live: ChannelRow[]; shop_tab: ChannelRow[]; affiliate: ChannelRow[] };
}) {
  const chartData = useMemo(() => {
    // Build a date-indexed map for each channel
    const videoMap = new Map(channelData.video.map(r => [r.tanggal, r.omzet]));
    const liveMap = new Map(channelData.live.map(r => [r.tanggal, r.omzet]));
    const shopTabMap = new Map(channelData.shop_tab.map(r => [r.tanggal, r.omzet]));
    const affiliateMap = new Map(channelData.affiliate.map(r => [r.tanggal, r.omzet]));

    return harian.map(r => ({
      tgl: r.tanggal,
      shop: r.omzet - (videoMap.get(r.tanggal) || 0) - (liveMap.get(r.tanggal) || 0) - (shopTabMap.get(r.tanggal) || 0) - (affiliateMap.get(r.tanggal) || 0),
      video: videoMap.get(r.tanggal) || 0,
      live: liveMap.get(r.tanggal) || 0,
      shop_tab: shopTabMap.get(r.tanggal) || 0,
      affiliate: affiliateMap.get(r.tanggal) || 0,
    })).map(d => ({
      ...d,
      shop: Math.max(0, d.shop), // prevent negative from subtraction rounding
    }));
  }, [harian, channelData]);

  const hasMultiChannel = channelData.video.length > 0 || channelData.live.length > 0 || channelData.shop_tab.length > 0 || channelData.affiliate.length > 0;

  if (!hasMultiChannel) {
    return (
      <div className="bg-white rounded-2xl border p-5">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5">🌊 Channel Mix Harian</h3>
        <div className="text-center py-8 text-xs text-gray-400">
          Data per-channel belum tersedia. Import file Excel dengan sheet Video/Live/Shop Tab/Affiliate.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border p-5">
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5">🌊 Channel Mix Harian</h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="gradShop" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.6} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="gradVideo" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.6} />
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="gradLive" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.6} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="gradShopTab" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.6} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="gradAffiliate" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f97316" stopOpacity={0.6} />
              <stop offset="95%" stopColor="#f97316" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="tgl" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 9 }} tickFormatter={(v) => fR(Number(v))} />
          <Tooltip content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0]?.payload;
            const total = (d.shop || 0) + (d.video || 0) + (d.live || 0) + (d.shop_tab || 0) + (d.affiliate || 0);
            return (
              <div className="bg-white border rounded-xl shadow-lg p-3 text-xs space-y-1">
                <div className="font-bold">{d.tgl}</div>
                <div><span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-1" />Shop: <strong>{fR(d.shop)}</strong></div>
                <div><span className="inline-block w-2 h-2 rounded-full bg-purple-500 mr-1" />Video: <strong>{fR(d.video)}</strong></div>
                <div><span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1" />Live: <strong>{fR(d.live)}</strong></div>
                <div><span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1" />Shop Tab: <strong>{fR(d.shop_tab)}</strong></div>
                <div><span className="inline-block w-2 h-2 rounded-full bg-orange-500 mr-1" />Affiliate: <strong>{fR(d.affiliate)}</strong></div>
                <div className="pt-1 border-t font-bold">Total: {fR(total)}</div>
              </div>
            );
          }} />
          <Legend />
          <Area type="monotone" dataKey="shop" name="Shop" stackId="1" stroke="#3b82f6" fill="url(#gradShop)" strokeWidth={1.5} />
          <Area type="monotone" dataKey="video" name="Video" stackId="1" stroke="#8b5cf6" fill="url(#gradVideo)" strokeWidth={1.5} />
          <Area type="monotone" dataKey="live" name="Live" stackId="1" stroke="#ef4444" fill="url(#gradLive)" strokeWidth={1.5} />
          <Area type="monotone" dataKey="shop_tab" name="Shop Tab" stackId="1" stroke="#10b981" fill="url(#gradShopTab)" strokeWidth={1.5} />
          <Area type="monotone" dataKey="affiliate" name="Affiliate" stackId="1" stroke="#f97316" fill="url(#gradAffiliate)" strokeWidth={1.5} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 📊 INSIGHTS TAB (enhanced with new features)
// ═══════════════════════════════════════════════════════════
function InsightsTab({ s, target, harian, channels, channelData, daysInPeriod, activePeriod }: {
  s: Summary;
  target: number;
  harian: HarianRow[];
  channels: Record<string, ChannelSummary>;
  channelData: { video: ChannelRow[]; live: ChannelRow[]; shop_tab: ChannelRow[]; affiliate: ChannelRow[] };
  daysInPeriod: number;
  activePeriod: string;
}) {
  return (
    <div className="space-y-5">
      {/* Row 1: Gauge + Streak side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <DailyTargetGauge harian={harian} target={target} daysInPeriod={daysInPeriod} />
        <StreakTracker harian={harian} target={target} daysInPeriod={daysInPeriod} />
      </div>

      {/* Growth Momentum */}
      <GrowthMomentum harian={harian} />

      {/* Cumulative Tracker */}
      <CumulativeTracker harian={harian} target={target} daysInPeriod={daysInPeriod} />

      {/* Row 2: Leaderboard + Day-of-Week Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <TopDaysLeaderboard harian={harian} s={s} />
        <DayOfWeekAnalysis harian={harian} />
      </div>

      {/* Smart Anomaly Detection */}
      <SmartAnomalyPanel harian={harian} s={s} />

      {/* Channel Mix */}
      <ChannelMixAreaChart harian={harian} channelData={channelData} />

      {/* Heatmap with Notes */}
      <HeatmapWithNotes harian={harian} target={target} daysInPeriod={daysInPeriod} activePeriod={activePeriod} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 🚀 FORECAST TAB
// ═══════════════════════════════════════════════════════════
function ForecastTab({ s, target, harian, daysInPeriod }: {
  s: Summary; target: number; harian: HarianRow[]; daysInPeriod: number;
}) {
  const forecast = useMemo(() => {
    if (harian.length < 3) return null;

    const last7 = harian.slice(-Math.min(7, harian.length));
    const last3 = harian.slice(-Math.min(3, harian.length));
    const avgAll = s.avg_omzet_harian;
    const avgLast7 = last7.reduce((a, r) => a + r.omzet, 0) / last7.length;
    const avgLast3 = last3.reduce((a, r) => a + r.omzet, 0) / last3.length;
    const sisaHari = Math.max(0, daysInPeriod - s.hari);

    // 3 scenarios
    const conservative = s.total_omzet + (Math.min(avgAll, avgLast7) * 0.85) * sisaHari;
    const normal = s.total_omzet + avgLast7 * sisaHari;
    const optimistic = s.total_omzet + (Math.max(avgLast3, avgLast7) * 1.15) * sisaHari;

    // Confidence: based on consistency (low std dev = high confidence)
    const stdDev = Math.sqrt(harian.reduce((sum, r) => sum + Math.pow(r.omzet - avgAll, 2), 0) / harian.length);
    const cv = avgAll > 0 ? (stdDev / avgAll) * 100 : 100;
    const confidence = Math.round(Math.max(30, Math.min(95, 100 - cv)));

    // Weekly run rates
    const weeks: { label: string; avgDaily: number; total: number }[] = [];
    for (let i = 0; i < harian.length; i += 7) {
      const chunk = harian.slice(i, i + 7);
      const total = chunk.reduce((a, r) => a + r.omzet, 0);
      weeks.push({ label: `W${weeks.length + 1}`, avgDaily: total / chunk.length, total });
    }

    // Trend line for forecast chart
    const forecastChartData = harian.map((r, i) => {
      let cum = 0;
      for (let j = 0; j <= i; j++) cum += harian[j].omzet;
      return { tgl: r.tanggal, actual: cum, targetPace: Math.round((target / daysInPeriod) * (i + 1)) };
    });
    // Extend forecast line to end of month
    const lastCum = forecastChartData[forecastChartData.length - 1]?.actual || 0;
    for (let d = 1; d <= sisaHari; d++) {
      const dayIdx = s.hari + d;
      forecastChartData.push({
        tgl: `+${d}`,
        actual: 0,
        targetPace: Math.round((target / daysInPeriod) * dayIdx),
      });
    }

    return {
      conservative, normal, optimistic, confidence, weeks,
      avgAll, avgLast7, avgLast3, sisaHari, forecastChartData, stdDev,
    };
  }, [s, harian, target, daysInPeriod]);

  if (!forecast) {
    return (
      <div className="bg-white rounded-2xl border p-10 text-center">
        <Rocket size={36} className="text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500">Minimal 3 hari data diperlukan untuk membuat forecast.</p>
      </div>
    );
  }

  const { conservative, normal, optimistic, confidence, weeks, avgAll, avgLast7, avgLast3, sisaHari, forecastChartData } = forecast;
  const pctNormal = (normal / target) * 100;

  const scenarios = [
    { label: "Conservative", value: conservative, color: "from-amber-500 to-orange-600", bgCard: "gradient-card-amber", icon: <CloudRain size={18} />, desc: "85% pace terakhir", pct: (conservative / target) * 100 },
    { label: "Normal", value: normal, color: "from-blue-500 to-indigo-600", bgCard: "gradient-card-blue", icon: <Sun size={18} />, desc: "Pace 7 hari terakhir", pct: (normal / target) * 100 },
    { label: "Optimistic", value: optimistic, color: "from-emerald-500 to-green-600", bgCard: "gradient-card-green", icon: <Rocket size={18} />, desc: "115% pace terbaik", pct: (optimistic / target) * 100 },
  ];

  return (
    <div className="space-y-5">
      {/* Forecast Header */}
      <div className="bg-gradient-to-br from-indigo-600 via-blue-600 to-purple-700 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-white/20 p-2 rounded-xl"><Rocket size={22} /></div>
          <div>
            <h2 className="text-lg font-bold">Revenue Forecast</h2>
            <p className="text-xs text-white/70">Proyeksi omzet akhir bulan berdasarkan tren aktual</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div className="bg-white/10 rounded-xl p-3">
            <div className="text-[10px] text-white/60 uppercase tracking-wide">Sisa Hari</div>
            <div className="text-2xl font-black text-number">{sisaHari}</div>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <div className="text-[10px] text-white/60 uppercase tracking-wide">Avg/Hari</div>
            <div className="text-lg font-bold text-number">{fR(avgAll)}</div>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <div className="text-[10px] text-white/60 uppercase tracking-wide">Avg 7-Day</div>
            <div className="text-lg font-bold text-number">{fR(avgLast7)}</div>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <div className="text-[10px] text-white/60 uppercase tracking-wide">Butuh/Hari</div>
            <div className={`text-lg font-bold text-number ${sisaHari > 0 && (target - s.total_omzet) / sisaHari > avgLast7 ? 'text-rose-300' : 'text-emerald-300'}`}>
              {sisaHari > 0 ? fR(Math.round(Math.max(0, (target - s.total_omzet)) / sisaHari)) : '—'}
            </div>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <div className="text-[10px] text-white/60 uppercase tracking-wide">Confidence</div>
            <div className="text-2xl font-black text-number">{confidence}%</div>
          </div>
        </div>
      </div>

      {/* 3 Scenario Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {scenarios.map((sc) => (
          <div key={sc.label} className={`${sc.bgCard} rounded-2xl p-5 border relative overflow-hidden`}>
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-8 -mt-8" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <div className={`bg-gradient-to-r ${sc.color} text-white p-1.5 rounded-lg`}>{sc.icon}</div>
                <div>
                  <div className="text-xs font-bold text-gray-700">{sc.label}</div>
                  <div className="text-[10px] text-gray-400">{sc.desc}</div>
                </div>
              </div>
              <div className="text-2xl font-black text-gray-900 text-number">{fR(Math.round(sc.value))}</div>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex-1 bg-white/80 rounded-full h-2 overflow-hidden">
                  <div className={`h-2 rounded-full bg-gradient-to-r ${sc.color} animate-progress-fill`}
                    style={{ width: `${Math.min(sc.pct, 100)}%` }} />
                </div>
                <span className={`text-xs font-bold ${sc.pct >= 100 ? "text-green-600" : sc.pct >= 80 ? "text-blue-600" : "text-orange-600"}`}>
                  {sc.pct.toFixed(0)}%
                </span>
              </div>
              {sc.pct >= 100 && <div className="text-[10px] text-green-600 font-bold mt-1">✅ Target tercapai!</div>}
              {sc.pct < 100 && <div className="text-[10px] text-gray-500 mt-1">Gap: {fR(Math.round(Math.max(0, target - sc.value)))}</div>}
            </div>
          </div>
        ))}
      </div>

      {/* Forecast Area Chart */}
      <div className="bg-white rounded-2xl border p-5">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
          📈 Akumulasi Aktual vs Target Pace
          <span className="text-[10px] text-gray-400 font-normal ml-1">(area = aktual, garis = target)</span>
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={forecastChartData}>
            <defs>
              <linearGradient id="gradForecast" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="tgl" tick={{ fontSize: 9 }} />
            <YAxis tick={{ fontSize: 9 }} tickFormatter={(v) => fR(Number(v))} />
            <Tooltip content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0]?.payload;
              return (
                <div className="bg-white border rounded-xl shadow-lg p-3 text-xs space-y-1">
                  <div className="font-bold">{d.tgl}</div>
                  {d.actual > 0 && <div>📊 Aktual: <strong>{fR(d.actual)}</strong></div>}
                  <div>🎯 Target: <strong>{fR(d.targetPace)}</strong></div>
                </div>
              );
            }} />
            <Legend />
            <ReferenceLine y={target} stroke="#ef4444" strokeDasharray="8 4"
              label={{ value: `Target ${fR(target)}`, fontSize: 10, fill: "#ef4444" }} />
            <Area type="monotone" dataKey="actual" name="Akumulasi" stroke="#6366f1" fill="url(#gradForecast)" strokeWidth={2.5}
              connectNulls={false} />
            <Line type="monotone" dataKey="targetPace" name="Target Pace" stroke="#ef4444" strokeWidth={2} strokeDasharray="6 3" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Weekly Run Rate */}
      <div className="bg-white rounded-2xl border p-5">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
          <Clock size={16} className="text-indigo-500" /> Weekly Run Rate
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {weeks.map((w, i) => {
            const prevWeek = i > 0 ? weeks[i - 1] : null;
            const change = prevWeek && prevWeek.avgDaily > 0 ? ((w.avgDaily - prevWeek.avgDaily) / prevWeek.avgDaily * 100) : 0;
            return (
              <div key={w.label} className="bg-gradient-to-br from-gray-50 to-white rounded-xl border p-3 text-center">
                <div className="text-xs font-bold text-indigo-600">{w.label}</div>
                <div className="text-lg font-black text-gray-900 text-number mt-1">{fR(Math.round(w.avgDaily))}</div>
                <div className="text-[10px] text-gray-400">/hari</div>
                <div className="text-xs font-bold text-gray-700 mt-1">{fR(w.total)}</div>
                <div className="text-[10px] text-gray-400">total</div>
                {i > 0 && (
                  <div className={`text-[10px] font-bold mt-1 ${change >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {change >= 0 ? "↑" : "↓"} {Math.abs(change).toFixed(0)}%
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Forecast Summary Box */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 p-5">
        <h3 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-1.5">
          <Brain size={16} className="text-blue-600" /> Forecast Insights
        </h3>
        <div className="text-xs text-gray-700 leading-relaxed space-y-2">
          <p>
            Berdasarkan {s.hari} hari data, proyeksi <strong>skenario normal</strong> menunjukkan omzet akhir bulan
            sebesar <strong>{fR(Math.round(normal))}</strong> ({pctNormal.toFixed(0)}% dari target {fR(target)}).
            {pctNormal >= 100
              ? " 🎉 Target diperkirakan akan tercapai dengan pace saat ini!"
              : pctNormal >= 85
              ? ` Masih ada peluang untuk mencapai target jika pace dijaga di ${fR(Math.round((target - s.total_omzet) / sisaHari))}/hari.`
              : ` ⚠️ Perlu effort tambahan — ${avgLast7 > 0 ? `pace harus naik ${((target / daysInPeriod / avgLast7 - 1) * 100).toFixed(0)}% dari rata-rata 7 hari terakhir.` : `butuh ${sisaHari > 0 ? fR(Math.round((target - s.total_omzet) / sisaHari)) : '—'}/hari untuk mencapai target.`}`
            }
          </p>
          <p>
            Confidence level forecast: <strong>{confidence}%</strong>
            {confidence >= 80 ? " (data stabil dan konsisten)" : confidence >= 60 ? " (variasi sedang)" : " (data sangat fluktuatif — forecast kurang reliable)"}
          </p>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 📅 DAY-OF-WEEK ANALYSIS
// ═══════════════════════════════════════════════════════════
const HARI_ID = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const BULAN_SHORT_MAP: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, mei: 4, jun: 5,
  jul: 6, agu: 7, sep: 8, okt: 9, nov: 10, des: 11,
};

function parseTanggalToDate(tanggal: string): Date | null {
  // "1 Apr" → Date(currentYear, 3, 1)
  const m = tanggal.match(/^(\d{1,2})\s+(\w+)/);
  if (!m) return null;
  const day = parseInt(m[1]);
  const monStr = m[2].toLowerCase().slice(0, 3);
  const month = BULAN_SHORT_MAP[monStr];
  if (month === undefined) return null;
  return new Date(new Date().getFullYear(), month, day);
}

function DayOfWeekAnalysis({ harian }: { harian: HarianRow[] }) {
  const analysis = useMemo(() => {
    const dayBuckets: { omzet: number[]; closing: number[]; botol: number[] }[] =
      Array.from({ length: 7 }, () => ({ omzet: [], closing: [], botol: [] }));

    for (const r of harian) {
      const d = parseTanggalToDate(r.tanggal);
      if (!d) continue;
      const dow = d.getDay();
      dayBuckets[dow].omzet.push(r.omzet);
      dayBuckets[dow].closing.push(r.closing);
      dayBuckets[dow].botol.push(r.botol);
    }

    const dayStats = dayBuckets.map((b, i) => {
      const avgOmzet = b.omzet.length > 0 ? b.omzet.reduce((a, v) => a + v, 0) / b.omzet.length : 0;
      const avgClosing = b.closing.length > 0 ? b.closing.reduce((a, v) => a + v, 0) / b.closing.length : 0;
      return {
        day: HARI_ID[i],
        shortDay: HARI_ID[i].slice(0, 3),
        avgOmzet,
        avgClosing,
        count: b.omzet.length,
        totalOmzet: b.omzet.reduce((a, v) => a + v, 0),
      };
    }).filter(d => d.count > 0);

    const maxOmzet = Math.max(...dayStats.map(d => d.avgOmzet));
    const best = dayStats.reduce((a, b) => a.avgOmzet > b.avgOmzet ? a : b, dayStats[0]);
    const worst = dayStats.reduce((a, b) => a.avgOmzet < b.avgOmzet ? a : b, dayStats[0]);

    // Radar data (normalize to 0-100)
    const radarData = dayStats.map(d => ({
      ...d,
      normalized: maxOmzet > 0 ? (d.avgOmzet / maxOmzet) * 100 : 0,
    }));

    return { dayStats, radarData, best, worst, maxOmzet };
  }, [harian]);

  if (analysis.dayStats.length < 3) {
    return (
      <div className="bg-white rounded-2xl border p-5">
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><Sun size={16} className="text-amber-500" /> Analisis Per Hari</h3>
        <p className="text-xs text-gray-400 text-center py-6">Butuh minimal 3 hari berbeda untuk analisis.</p>
      </div>
    );
  }

  const { dayStats, best, worst, maxOmzet } = analysis;

  // SVG Radar Chart
  const radarSize = 200;
  const cx = radarSize / 2, cy = radarSize / 2, rMax = 75;
  const angleStep = (2 * Math.PI) / dayStats.length;

  const getPoint = (idx: number, value: number) => {
    const angle = -Math.PI / 2 + angleStep * idx;
    const r = (value / maxOmzet) * rMax;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  };

  const polygonPoints = dayStats.map((d, i) => {
    const p = getPoint(i, d.avgOmzet);
    return `${p.x},${p.y}`;
  }).join(" ");

  const gridLevels = [0.25, 0.5, 0.75, 1];

  return (
    <div className="bg-gradient-to-br from-blue-50 via-indigo-50/30 to-purple-50/20 rounded-2xl border border-indigo-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
          <Sun size={16} className="text-amber-500" /> Performa Per Hari
        </h3>
        <div className="flex gap-2 text-[10px]">
          <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">Best: {best?.day}</span>
          <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">Worst: {worst?.day}</span>
        </div>
      </div>
      <div className="flex flex-col lg:flex-row items-center gap-4">
        {/* SVG Radar */}
        <div className="shrink-0">
          <svg width={radarSize} height={radarSize}>
            {/* Grid */}
            {gridLevels.map((level, li) => {
              const points = dayStats.map((_, i) => {
                const angle = -Math.PI / 2 + angleStep * i;
                const r = rMax * level;
                return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
              }).join(" ");
              return <polygon key={li} points={points} fill="none" stroke="#e5e7eb" strokeWidth="0.5" />;
            })}
            {/* Axes */}
            {dayStats.map((d, i) => {
              const angle = -Math.PI / 2 + angleStep * i;
              const endX = cx + rMax * Math.cos(angle);
              const endY = cy + rMax * Math.sin(angle);
              const labelX = cx + (rMax + 14) * Math.cos(angle);
              const labelY = cy + (rMax + 14) * Math.sin(angle);
              return (
                <g key={i}>
                  <line x1={cx} y1={cy} x2={endX} y2={endY} stroke="#d1d5db" strokeWidth="0.5" />
                  <text x={labelX} y={labelY} textAnchor="middle" dominantBaseline="middle"
                    className="text-[9px] font-bold" fill={d.day === best?.day ? "#16a34a" : d.day === worst?.day ? "#dc2626" : "#6b7280"}>
                    {d.shortDay}
                  </text>
                </g>
              );
            })}
            {/* Data polygon */}
            <polygon points={polygonPoints} fill="rgba(99, 102, 241, 0.2)" stroke="#6366f1" strokeWidth="2" />
            {/* Data points */}
            {dayStats.map((d, i) => {
              const p = getPoint(i, d.avgOmzet);
              return <circle key={i} cx={p.x} cy={p.y} r="3.5" fill={d.day === best?.day ? "#22c55e" : d.day === worst?.day ? "#ef4444" : "#6366f1"} stroke="white" strokeWidth="1.5" />;
            })}
          </svg>
        </div>
        {/* Day Stats Table */}
        <div className="flex-1 w-full">
          <div className="space-y-1.5">
            {[...dayStats].sort((a, b) => b.avgOmzet - a.avgOmzet).map((d) => (
              <div key={d.day} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${d.day === best?.day ? "bg-green-50 border border-green-200" : d.day === worst?.day ? "bg-red-50 border border-red-200" : "bg-white/60"}`}>
                <span className={`font-bold w-14 ${d.day === best?.day ? "text-green-700" : d.day === worst?.day ? "text-red-600" : "text-gray-700"}`}>
                  {d.day === best?.day ? "🥇 " : d.day === worst?.day ? "📉 " : ""}{d.day}
                </span>
                <div className="flex-1">
                  <div className="bg-gray-200 rounded-full h-1.5 overflow-hidden">
                    <div className={`h-1.5 rounded-full ${d.day === best?.day ? "bg-green-500" : d.day === worst?.day ? "bg-red-400" : "bg-indigo-400"}`}
                      style={{ width: `${(d.avgOmzet / maxOmzet) * 100}%` }} />
                  </div>
                </div>
                <span className="font-bold text-gray-800 w-24 text-right text-number">{fR(Math.round(d.avgOmzet))}</span>
                <span className="text-gray-400 w-8 text-right">{d.count}×</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 📈 GROWTH MOMENTUM INDICATOR
// ═══════════════════════════════════════════════════════════
function GrowthMomentum({ harian }: { harian: HarianRow[] }) {
  const momentum = useMemo(() => {
    if (harian.length < 5) return null;

    const avgAll = harian.reduce((a, r) => a + r.omzet, 0) / harian.length;
    const last7 = harian.slice(-Math.min(7, harian.length));
    const first7 = harian.slice(0, Math.min(7, harian.length));
    const avgLast7 = last7.reduce((a, r) => a + r.omzet, 0) / last7.length;
    const avgFirst7 = first7.reduce((a, r) => a + r.omzet, 0) / first7.length;

    // Velocity: recent trend direction (positive = growing)
    const velocity = avgFirst7 > 0 ? ((avgLast7 - avgFirst7) / avgFirst7) * 100 : 0;

    // Acceleration: is growth speeding up or slowing down?
    const mid = Math.floor(harian.length / 2);
    const firstHalf = harian.slice(0, mid);
    const secondHalf = harian.slice(mid);
    const avgFirstHalf = firstHalf.reduce((a, r) => a + r.omzet, 0) / firstHalf.length;
    const avgSecondHalf = secondHalf.reduce((a, r) => a + r.omzet, 0) / secondHalf.length;
    const accel = avgFirstHalf > 0 ? ((avgSecondHalf - avgFirstHalf) / avgFirstHalf) * 100 : 0;

    // Consistency: std dev based
    const stdDev = Math.sqrt(harian.reduce((sum, r) => sum + Math.pow(r.omzet - avgAll, 2), 0) / harian.length);
    const cv = avgAll > 0 ? (stdDev / avgAll) * 100 : 100;
    const consistency = Math.max(0, Math.min(100, 100 - cv));

    // Momentum score: weighted combination
    const velocityScore = Math.max(0, Math.min(100, 50 + velocity * 2));
    const accelScore = Math.max(0, Math.min(100, 50 + accel * 2));
    const score = Math.round(velocityScore * 0.4 + accelScore * 0.3 + consistency * 0.3);

    // MA data for chart
    const maData = harian.map((r, i) => {
      const w7 = harian.slice(Math.max(0, i - 6), i + 1);
      const w14 = harian.slice(Math.max(0, i - 13), i + 1);
      return {
        tgl: r.tanggal,
        omzet: r.omzet,
        ma7: Math.round(w7.reduce((s, d) => s + d.omzet, 0) / w7.length),
        ma14: i >= 6 ? Math.round(w14.reduce((s, d) => s + d.omzet, 0) / w14.length) : null,
      };
    });

    return {
      score, velocity: Math.round(velocity), acceleration: Math.round(accel),
      consistency: Math.round(consistency), maData,
      label: score >= 80 ? "Strong 🚀" : score >= 60 ? "Moderate ⚡" : score >= 40 ? "Weak 🔻" : "Critical ⚠️",
      color: score >= 80 ? "#22c55e" : score >= 60 ? "#3b82f6" : score >= 40 ? "#f59e0b" : "#ef4444",
    };
  }, [harian]);

  if (!momentum) return null;

  const { score, velocity, acceleration, consistency, maData, label, color } = momentum;

  const dimensions = [
    { name: "Velocity", value: Math.max(0, Math.min(100, 50 + velocity * 2)), desc: `Tren ${velocity >= 0 ? "naik" : "turun"} ${Math.abs(velocity)}%`, icon: <TrendingUp size={14} /> },
    { name: "Acceleration", value: Math.max(0, Math.min(100, 50 + acceleration * 2)), desc: acceleration >= 0 ? "Pertumbuhan mempercepat" : "Pertumbuhan melambat", icon: <Activity size={14} /> },
    { name: "Consistency", value: consistency, desc: consistency >= 70 ? "Sangat stabil" : consistency >= 50 ? "Cukup stabil" : "Fluktuatif", icon: <Target size={14} /> },
  ];

  // SVG circular gauge
  const gaugeR = 50;
  const gaugeCirc = 2 * Math.PI * gaugeR;
  const gaugeDash = gaugeCirc * (score / 100);

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 rounded-2xl p-5 text-white shadow-xl">
      <div className="flex items-center gap-2 mb-4">
        <div className="bg-white/10 p-1.5 rounded-lg"><Activity size={18} /></div>
        <div>
          <h3 className="text-sm font-bold">Growth Momentum</h3>
          <p className="text-[10px] text-white/50">Seberapa kuat tren pertumbuhan Anda</p>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-center">
        {/* Gauge */}
        <div className="flex flex-col items-center">
          <div className="relative">
            <svg width="120" height="120" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r={gaugeR} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
              <circle cx="60" cy="60" r={gaugeR} fill="none" stroke={color} strokeWidth="8"
                strokeLinecap="round" strokeDasharray={`${gaugeDash} ${gaugeCirc}`}
                transform="rotate(-90 60 60)" className="transition-all duration-1000" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-3xl font-black animate-score-reveal text-number" style={{ color }}>{score}</div>
                <div className="text-[8px] text-white/50 uppercase tracking-widest">Momentum</div>
              </div>
            </div>
          </div>
          <div className="text-xs font-bold mt-2" style={{ color }}>{label}</div>
        </div>
        {/* 3 dimensions */}
        {dimensions.map((dim) => (
          <div key={dim.name} className="bg-white/5 rounded-xl p-3 border border-white/10">
            <div className="flex items-center gap-1.5 mb-2 text-white/70">
              {dim.icon}
              <span className="text-[10px] font-bold uppercase tracking-wide">{dim.name}</span>
            </div>
            <div className="text-xl font-black text-number">{dim.value.toFixed(0)}</div>
            <div className="mt-2 bg-white/10 rounded-full h-1.5 overflow-hidden">
              <div className="h-1.5 rounded-full transition-all duration-700"
                style={{ width: `${dim.value}%`, backgroundColor: dim.value >= 70 ? "#22c55e" : dim.value >= 50 ? "#f59e0b" : "#ef4444" }} />
            </div>
            <div className="text-[9px] text-white/40 mt-1">{dim.desc}</div>
          </div>
        ))}
      </div>
      {/* MA Crossover Chart */}
      <div className="mt-4 bg-white/5 rounded-xl p-3 border border-white/10">
        <div className="text-[10px] text-white/50 font-bold uppercase tracking-wide mb-2">MA-7 vs MA-14 Crossover</div>
        <ResponsiveContainer width="100%" height={140}>
          <LineChart data={maData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="tgl" tick={{ fontSize: 8, fill: "rgba(255,255,255,0.3)" }} />
            <YAxis tick={{ fontSize: 8, fill: "rgba(255,255,255,0.3)" }} tickFormatter={(v) => fR(Number(v))} />
            <Tooltip content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0]?.payload;
              return (
                <div className="glass-dark rounded-lg p-2 text-[10px] text-white space-y-0.5">
                  <div className="font-bold">{d.tgl}</div>
                  <div>Omzet: {fR(d.omzet)}</div>
                  <div style={{ color: "#60a5fa" }}>MA-7: {fR(d.ma7)}</div>
                  {d.ma14 != null && <div style={{ color: "#f97316" }}>MA-14: {fR(d.ma14)}</div>}
                </div>
              );
            }} />
            <Line type="monotone" dataKey="ma7" name="MA-7" stroke="#60a5fa" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="ma14" name="MA-14" stroke="#f97316" strokeWidth={2} dot={false} strokeDasharray="4 3" connectNulls={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 💡 SMART ANOMALY DETECTION PANEL
// ═══════════════════════════════════════════════════════════
function SmartAnomalyPanel({ harian, s }: { harian: HarianRow[]; s: Summary }) {
  const anomalies = useMemo(() => {
    if (harian.length < 5) return [];

    const avgOmzet = s.avg_omzet_harian;
    const stdDev = Math.sqrt(harian.reduce((sum, r) => sum + Math.pow(r.omzet - avgOmzet, 2), 0) / harian.length);

    if (stdDev === 0) return [];

    return harian
      .map((r) => {
        const zScore = (r.omzet - avgOmzet) / stdDev;
        if (Math.abs(zScore) < 1.3) return null;

        const type = zScore > 0 ? "spike" as const : "drop" as const;
        const severity = Math.abs(zScore) >= 2.5 ? "high" as const : Math.abs(zScore) >= 1.8 ? "medium" as const : "low" as const;
        const deviation = ((r.omzet - avgOmzet) / avgOmzet * 100);

        // Context analysis
        const idx = harian.indexOf(r);
        const prev = idx > 0 ? harian[idx - 1] : null;
        const dayChange = prev ? ((r.omzet - prev.omzet) / prev.omzet * 100) : 0;

        // CAC/Upsell correlation
        const avgCac = s.rata_cac;
        const cacAnomaly = Math.abs(r.cac_total - avgCac) > 15;
        const avgUpsell = s.rata_upsell;
        const upsellAnomaly = Math.abs(r.upsell - avgUpsell) > 0.3;

        let context = "";
        if (type === "spike") {
          if (r.closing > s.avg_closing_harian * 1.3) context = "Closing tinggi → kemungkinan flash sale atau campaign efektif";
          else if (upsellAnomaly && r.upsell > avgUpsell) context = "Upsell tinggi → bundling atau promo berhasil";
          else context = "Traffic organic atau event khusus";
        } else {
          if (cacAnomaly && r.cac_total > avgCac) context = "CAC naik signifikan → biaya akuisisi mahal";
          else if (r.closing < s.avg_closing_harian * 0.5) context = "Closing anjlok → kemungkinan hari libur atau gangguan teknis";
          else context = "Penurunan tanpa pattern jelas — investigasi lebih lanjut";
        }

        return {
          tanggal: r.tanggal, omzet: r.omzet, type, severity, zScore: +zScore.toFixed(2),
          deviation: +deviation.toFixed(1), dayChange: +dayChange.toFixed(1),
          context, closing: r.closing, upsell: r.upsell, cac: r.cac_total,
          cacAnomaly, upsellAnomaly,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x != null)
      .sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore));
  }, [harian, s]);

  if (anomalies.length === 0) {
    return (
      <div className="bg-white rounded-2xl border p-5">
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
          <Brain size={16} className="text-purple-500" /> Anomaly Detection
        </h3>
        <div className="text-center py-6">
          <CheckCircle2 size={28} className="text-green-400 mx-auto mb-2" />
          <p className="text-xs text-gray-500">Tidak ada anomali terdeteksi — data berjalan normal 🎉</p>
        </div>
      </div>
    );
  }

  const sevColors = {
    high: { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", badge: "bg-red-100 text-red-700" },
    medium: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", badge: "bg-amber-100 text-amber-700" },
    low: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", badge: "bg-blue-100 text-blue-700" },
  };

  return (
    <div className="bg-white rounded-2xl border p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
          <Brain size={16} className="text-purple-500" /> Smart Anomaly Detection
        </h3>
        <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold">
          {anomalies.length} anomali
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {anomalies.slice(0, 6).map((a) => {
          if (!a) return null;
          const sc = sevColors[a.severity];
          return (
            <div key={a.tanggal} className={`${sc.bg} ${sc.border} border rounded-xl p-3.5 transition-all hover:scale-[1.02] hover:shadow-md`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-800">{a.tanggal}</span>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${sc.badge}`}>
                    {a.type === "spike" ? "📈 Spike" : "📉 Drop"}
                  </span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${sc.badge}`}>
                    {a.severity}
                  </span>
                </div>
              </div>
              <div className="text-lg font-black text-gray-900 text-number">{fR(a.omzet)}</div>
              <div className={`text-xs font-bold ${a.type === "spike" ? "text-green-600" : "text-red-600"}`}>
                {a.deviation >= 0 ? "+" : ""}{a.deviation}% dari rata-rata
              </div>
              <div className="mt-2 text-[10px] text-gray-600 leading-relaxed bg-white/60 rounded-lg p-2">
                💡 {a.context}
              </div>
              <div className="flex gap-2 mt-2 text-[10px]">
                <span className="text-gray-500">{fN(a.closing)} cls</span>
                <span className="text-gray-500">{a.upsell.toFixed(2)}x ups</span>
                <span className="text-gray-500">{a.cac.toFixed(1)}% cac</span>
                {a.cacAnomaly && <span className="text-red-500 font-bold">⚠ CAC</span>}
                {a.upsellAnomaly && <span className="text-purple-500 font-bold">⚡ Upsell</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 📋 MONTHLY SCORECARD TAB
// ═══════════════════════════════════════════════════════════
function ScorecardTab({ s, target, harian, channels, daysInPeriod, prevMonthData }: {
  s: Summary; target: number; harian: HarianRow[];
  channels: Record<string, ChannelSummary>; daysInPeriod: number;
  prevMonthData?: ApiResponse | null;
}) {
  const scorecard = useMemo(() => {
    // === 5 Dimension Scoring ===
    // 1. Revenue Achievement (0-100)
    const pctTarget = Math.min((s.total_omzet / target) * 100, 100);
    const revenueScore = Math.round(pctTarget);

    // 2. Efficiency / CAC (0-100): ≤40%=100, 50%=75, 60%=50, ≥70%=0
    const effScore = Math.round(Math.max(0, Math.min(100, ((70 - s.rata_cac) / 30) * 100)));

    // 3. Upsell Quality (0-100): ≥1.5=100, 1.3=75, 1.1=40, 1.0=0
    const upsScore = Math.round(Math.max(0, Math.min(100, ((s.rata_upsell - 1.0) / 0.5) * 100)));

    // 4. Growth Momentum (0-100)
    const first7 = harian.slice(0, Math.min(7, harian.length));
    const last7 = harian.slice(-Math.min(7, harian.length));
    const avgFirst = first7.reduce((a, r) => a + r.omzet, 0) / first7.length;
    const avgLast = last7.reduce((a, r) => a + r.omzet, 0) / last7.length;
    const growthPct = avgFirst > 0 ? ((avgLast - avgFirst) / avgFirst) * 100 : 0;
    const growthScore = Math.round(Math.max(0, Math.min(100, 50 + growthPct * 2)));

    // 5. Consistency (0-100): low volatility = high score
    const avgOmzet = s.avg_omzet_harian;
    const stdDev = Math.sqrt(harian.reduce((sum, r) => sum + Math.pow(r.omzet - avgOmzet, 2), 0) / (harian.length || 1));
    const cv = avgOmzet > 0 ? (stdDev / avgOmzet) * 100 : 100;
    const consistScore = Math.round(Math.max(0, Math.min(100, 100 - cv)));

    // Overall score (weighted average)
    const overall = Math.round(
      revenueScore * 0.35 + effScore * 0.20 + upsScore * 0.15 + growthScore * 0.15 + consistScore * 0.15
    );

    // Grade
    const grade = overall >= 90 ? "A+" : overall >= 80 ? "A" : overall >= 70 ? "B+"
      : overall >= 60 ? "B" : overall >= 50 ? "C+" : overall >= 40 ? "C" : overall >= 30 ? "D" : "F";

    const gradeColor = overall >= 80 ? "#22c55e" : overall >= 60 ? "#3b82f6"
      : overall >= 40 ? "#f59e0b" : "#ef4444";

    const dimensions = [
      { key: "revenue", label: "Revenue Achievement", score: revenueScore, weight: 35, icon: <DollarSign size={16} />,
        detail: `${pctTarget.toFixed(1)}% target tercapai (${fR(s.total_omzet)} / ${fR(target)})`,
        color: "#3b82f6" },
      { key: "efficiency", label: "Cost Efficiency", score: effScore, weight: 20, icon: <Target size={16} />,
        detail: `CAC ${s.rata_cac.toFixed(1)}%, ROAS ${s.roas.toFixed(1)}x`,
        color: "#10b981" },
      { key: "upsell", label: "Upsell Quality", score: upsScore, weight: 15, icon: <TrendingUp size={16} />,
        detail: `Rata-rata upsell ${s.rata_upsell.toFixed(2)}x`,
        color: "#8b5cf6" },
      { key: "growth", label: "Growth Momentum", score: growthScore, weight: 15, icon: <Rocket size={16} />,
        detail: `Tren ${growthPct >= 0 ? "naik" : "turun"} ${Math.abs(growthPct).toFixed(0)}% (awal vs akhir)`,
        color: "#f97316" },
      { key: "consist", label: "Consistency", score: consistScore, weight: 15, icon: <Award size={16} />,
        detail: `Volatility ${cv.toFixed(0)}% — ${cv <= 20 ? "sangat stabil" : cv <= 35 ? "cukup stabil" : "fluktuatif"}`,
        color: "#ec4899" },
    ];

    return { overall, grade, gradeColor, dimensions, revenueScore, effScore, upsScore, growthScore, consistScore };
  }, [s, target, harian, daysInPeriod]);

  const { overall, grade, gradeColor, dimensions } = scorecard;

  // Pentagon radar SVG
  const radarSize = 220;
  const cx = radarSize / 2, cy = radarSize / 2, rMax = 80;
  const n = 5;
  const angleStep = (2 * Math.PI) / n;

  const getPoint = (idx: number, value: number) => {
    const angle = -Math.PI / 2 + angleStep * idx;
    const r = (value / 100) * rMax;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  };

  const dataPoints = dimensions.map((d, i) => getPoint(i, d.score));
  const polygonPoints = dataPoints.map(p => `${p.x},${p.y}`).join(" ");
  const gridLevels = [0.25, 0.5, 0.75, 1];

  // Previous month comparison
  const prev = prevMonthData?.summary;

  return (
    <div className="space-y-5">
      {/* Grade Display */}
      <div className="relative overflow-hidden rounded-2xl p-8 text-white shadow-xl"
        style={{ background: `linear-gradient(135deg, ${gradeColor}dd, ${gradeColor}88, ${gradeColor}44)` }}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-16 -mb-16" />
        <div className="relative flex flex-col lg:flex-row items-center gap-8">
          {/* Large Grade */}
          <div className="flex flex-col items-center">
            <div className="text-[10px] uppercase tracking-widest text-white/60 mb-2 font-bold">Monthly Grade</div>
            <div className="text-8xl font-black animate-score-reveal drop-shadow-lg">{grade}</div>
            <div className="text-lg font-bold mt-1">{overall}/100</div>
            <div className="text-xs text-white/70 mt-1">
              {overall >= 80 ? "Outstanding Performance! 🏆" : overall >= 60 ? "Good Performance 👍" : overall >= 40 ? "Needs Improvement ⚡" : "Urgent Action Required ⚠️"}
            </div>
          </div>

          {/* Pentagon Radar */}
          <div className="flex-1 flex justify-center">
            <svg width={radarSize} height={radarSize}>
              {/* Grid */}
              {gridLevels.map((level, li) => {
                const pts = dimensions.map((_, i) => {
                  const angle = -Math.PI / 2 + angleStep * i;
                  const r = rMax * level;
                  return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
                }).join(" ");
                return <polygon key={li} points={pts} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />;
              })}
              {/* Axes + labels */}
              {dimensions.map((d, i) => {
                const angle = -Math.PI / 2 + angleStep * i;
                const endX = cx + rMax * Math.cos(angle);
                const endY = cy + rMax * Math.sin(angle);
                const labelR = rMax + 18;
                const labelX = cx + labelR * Math.cos(angle);
                const labelY = cy + labelR * Math.sin(angle);
                return (
                  <g key={i}>
                    <line x1={cx} y1={cy} x2={endX} y2={endY} stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
                    <text x={labelX} y={labelY} textAnchor="middle" dominantBaseline="middle"
                      fill="white" fontSize="8" fontWeight="bold" opacity="0.8">
                      {d.label.split(" ")[0]}
                    </text>
                    <text x={labelX} y={labelY + 11} textAnchor="middle" dominantBaseline="middle"
                      fill="white" fontSize="10" fontWeight="900" opacity="1">
                      {d.score}
                    </text>
                  </g>
                );
              })}
              {/* Data polygon */}
              <polygon points={polygonPoints} fill="rgba(255,255,255,0.2)" stroke="white" strokeWidth="2" />
              {/* Data points */}
              {dataPoints.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r="4" fill="white" stroke={dimensions[i].color} strokeWidth="2" />
              ))}
            </svg>
          </div>
        </div>
      </div>

      {/* Dimension Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {dimensions.map((dim) => {
          const circR = 28;
          const circC = 2 * Math.PI * circR;
          const dash = circC * (dim.score / 100);
          return (
            <div key={dim.key} className="bg-white rounded-2xl border p-4 hover:shadow-md transition-all duration-200">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-lg" style={{ backgroundColor: dim.color + "15", color: dim.color }}>{dim.icon}</div>
                <div className="text-[11px] font-bold text-gray-700">{dim.label}</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  <svg width="64" height="64" viewBox="0 0 64 64">
                    <circle cx="32" cy="32" r={circR} fill="none" stroke="#f0f0f0" strokeWidth="5" />
                    <circle cx="32" cy="32" r={circR} fill="none" stroke={dim.color} strokeWidth="5"
                      strokeLinecap="round" strokeDasharray={`${dash} ${circC}`}
                      transform="rotate(-90 32 32)" className="transition-all duration-1000" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-black text-number" style={{ color: dim.color }}>{dim.score}</span>
                  </div>
                </div>
                <div className="text-[10px] text-gray-500 leading-relaxed">{dim.detail}</div>
              </div>
              <div className="text-[9px] text-gray-400 mt-2">Bobot: {dim.weight}%</div>
            </div>
          );
        })}
      </div>

      {/* Previous Month Comparison */}
      {prev && (
        <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl border p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-1.5">
            <Star size={16} className="text-amber-500" /> Perbandingan vs Bulan Lalu
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: "Omzet", curr: s.total_omzet, prev: prev.total_omzet, format: fR, inverse: false },
              { label: "Closing", curr: s.total_closing, prev: prev.total_closing, format: fN, inverse: false },
              { label: "Botol", curr: s.total_botol, prev: prev.total_botol, format: fN, inverse: false },
              { label: "CAC", curr: s.rata_cac, prev: prev.rata_cac, format: (v: number) => v.toFixed(1) + "%", inverse: true },
              { label: "Upsell", curr: s.rata_upsell, prev: prev.rata_upsell, format: (v: number) => v.toFixed(2) + "x", inverse: false },
              { label: "ROAS", curr: s.roas, prev: prev.roas, format: (v: number) => v.toFixed(1) + "x", inverse: false },
            ].map((m) => {
              const delta = m.prev > 0 ? ((m.curr - m.prev) / m.prev) * 100 : 0;
              const isGood = m.inverse ? delta < 0 : delta > 0;
              return (
                <div key={m.label} className={`rounded-xl p-3 text-center border ${isGood ? "bg-green-50 border-green-200" : delta === 0 ? "bg-gray-50 border-gray-200" : "bg-red-50 border-red-200"}`}>
                  <div className="text-[10px] text-gray-500 font-medium">{m.label}</div>
                  <div className="text-sm font-black text-gray-900 mt-0.5 text-number">{m.format(m.curr)}</div>
                  <div className={`text-[10px] font-bold mt-0.5 ${isGood ? "text-green-600" : delta === 0 ? "text-gray-400" : "text-red-600"}`}>
                    {delta >= 0 ? "↑" : "↓"} {Math.abs(delta).toFixed(1)}%
                  </div>
                  <div className="text-[9px] text-gray-400">prev: {m.format(m.prev)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Action Items */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100 p-5">
        <h3 className="text-sm font-bold text-indigo-900 mb-3 flex items-center gap-1.5">
          <Brain size={16} className="text-indigo-600" /> Rekomendasi Aksi
        </h3>
        <div className="space-y-2">
          {dimensions
            .filter(d => d.score < 70)
            .sort((a, b) => a.score - b.score)
            .map((dim) => {
              const recs: Record<string, string> = {
                revenue: "Fokus pada peningkatan volume penjualan. Pertimbangkan flash sale, promo bundling, atau ekspansi ke channel baru.",
                efficiency: "Evaluasi efisiensi iklan — kurangi audience yang tidak perform, optimasi bid, dan fokus pada produk ROI tinggi.",
                upsell: "Tingkatkan rata-rata pembelian per transaksi. Bundling produk, promo beli 2, atau cross-sell complementary products.",
                growth: "Pertumbuhan melambat — perlu campaign boost. Evaluasi creative yang mulai fatigue dan refresh konten iklan.",
                consist: "Stabilkan operasional harian. Identifikasi faktor yang menyebabkan fluktuasi dan minimalisir downtime.",
              };
              return (
                <div key={dim.key} className="flex items-start gap-2 bg-white/60 rounded-xl p-3 border border-indigo-100/50">
                  <div className="p-1 rounded-lg shrink-0" style={{ backgroundColor: dim.color + "15", color: dim.color }}>{dim.icon}</div>
                  <div>
                    <div className="text-xs font-bold text-gray-800">{dim.label} — Score {dim.score}/100</div>
                    <div className="text-[10px] text-gray-600 mt-0.5">{recs[dim.key] || "Perlu evaluasi lebih lanjut."}</div>
                  </div>
                </div>
              );
            })}
          {dimensions.every(d => d.score >= 70) && (
            <div className="text-center py-4">
              <Trophy size={28} className="text-amber-400 mx-auto mb-2" />
              <p className="text-xs text-gray-600 font-medium">Semua dimensi sudah di atas 70 — Excellent! Pertahankan performa ini! 🏆</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 📝 DAILY NOTES JOURNAL (Premium)
// ═══════════════════════════════════════════════════════════
const NOTE_TAGS = [
  { key: "catatan", label: "📝 Catatan", color: "bg-gray-100 text-gray-700 border-gray-200" },
  { key: "flash-sale", label: "⚡ Flash Sale", color: "bg-amber-100 text-amber-700 border-amber-200" },
  { key: "campaign", label: "📢 Campaign", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { key: "libur", label: "🏖️ Libur/Off", color: "bg-rose-100 text-rose-700 border-rose-200" },
  { key: "evaluasi", label: "📊 Evaluasi", color: "bg-purple-100 text-purple-700 border-purple-200" },
  { key: "milestone", label: "🏆 Milestone", color: "bg-green-100 text-green-700 border-green-200" },
];

const NOTE_MOODS = [
  { key: "great", emoji: "🔥", label: "Luar Biasa", color: "text-green-600" },
  { key: "good", emoji: "😊", label: "Bagus", color: "text-blue-600" },
  { key: "neutral", emoji: "😐", label: "Biasa", color: "text-gray-600" },
  { key: "bad", emoji: "😰", label: "Kurang", color: "text-red-600" },
];

function DailyNotesJournal({ harian, activePeriod }: { harian: HarianRow[]; activePeriod: string }) {
  const [notes, setNotes] = useState<Record<string, DailyNote>>({});
  const [showForm, setShowForm] = useState(false);
  const [editDate, setEditDate] = useState("");
  const [noteText, setNoteText] = useState("");
  const [noteTag, setNoteTag] = useState("catatan");
  const [noteMood, setNoteMood] = useState("neutral");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Load notes on mount / period change
  useEffect(() => {
    loadDailyNotes(activePeriod).then(setNotes).catch(() => setNotes({}));
  }, [activePeriod]);

  const refreshNotes = () => loadDailyNotes(activePeriod).then(setNotes).catch(() => {});

  const handleSave = async () => {
    if (!editDate || !noteText.trim()) return;
    await saveDailyNote(activePeriod, editDate, noteText, noteTag, noteMood);
    await refreshNotes();
    setShowForm(false);
    setEditDate("");
    setNoteText("");
    setNoteTag("catatan");
    setNoteMood("neutral");
  };

  const handleDelete = async (date: string) => {
    await deleteDailyNote(activePeriod, date);
    await refreshNotes();
    setConfirmDelete(null);
  };

  const handleEdit = (note: DailyNote) => {
    setEditDate(note.date);
    setNoteText(note.text);
    setNoteTag(note.tag || "catatan");
    setNoteMood(note.mood || "neutral");
    setShowForm(true);
  };

  // Build sorted notes list with performance data
  const noteEntries = useMemo(() => {
    const entries = Object.values(notes)
      .filter((n) => {
        if (filterTag && n.tag !== filterTag) return false;
        if (searchQuery && !n.text.toLowerCase().includes(searchQuery.toLowerCase()) && !n.date.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => {
        // Sort by date descending (most recent first)
        const da = parseTanggalToDate(a.date);
        const db = parseTanggalToDate(b.date);
        if (da && db) return db.getTime() - da.getTime();
        return b.date.localeCompare(a.date);
      });

    // Enrich with performance data
    return entries.map((note) => {
      const dayData = harian.find((h) => h.tanggal === note.date);
      return { ...note, dayData };
    });
  }, [notes, harian, filterTag, searchQuery]);

  // Available dates that don't have notes yet — sorted chronologically (newest first)
  const availableDates = harian
    .map((h) => h.tanggal)
    .filter((d) => !notes[d])
    .sort((a, b) => {
      const da = parseTanggalToDate(a);
      const db = parseTanggalToDate(b);
      if (da && db) return db.getTime() - da.getTime();
      return b.localeCompare(a);
    });

  const totalNotes = Object.keys(notes).length;
  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const n of Object.values(notes)) {
      const t = n.tag || "catatan";
      counts[t] = (counts[t] || 0) + 1;
    }
    return counts;
  }, [notes]);

  return (
    <div className="space-y-5">
      {/* Header Card */}
      <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -mr-16 -mt-16" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full -ml-12 -mb-12" />
        <div className="relative flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-white/20 p-2 rounded-xl"><StickyNote size={22} /></div>
              <div>
                <h2 className="text-lg font-bold">Daily Notes Journal</h2>
                <p className="text-xs text-white/70">Catat insight, keputusan, dan observasi harian Anda</p>
              </div>
            </div>
            <div className="flex gap-3 mt-3 text-xs">
              <div className="bg-white/15 rounded-lg px-3 py-1.5">
                <span className="text-white/60">Total Notes</span>
                <span className="font-bold ml-1.5">{totalNotes}</span>
              </div>
              <div className="bg-white/15 rounded-lg px-3 py-1.5">
                <span className="text-white/60">Periode</span>
                <span className="font-bold ml-1.5">{activePeriod}</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => { setShowForm(!showForm); setEditDate(""); setNoteText(""); setNoteTag("catatan"); setNoteMood("neutral"); }}
            className="bg-white text-orange-600 font-bold text-sm px-4 py-2.5 rounded-xl hover:bg-white/90 transition-all shadow-md flex items-center gap-1.5"
          >
            {showForm ? <X size={16} /> : <StickyNote size={16} />}
            {showForm ? "Tutup" : "Tulis Note"}
          </button>
        </div>
      </div>

      {/* Quick Add Form */}
      {showForm && (
        <div className="bg-white rounded-2xl border-2 border-orange-200 p-5 shadow-md animate-fade-slide-up">
          <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-1.5">
            <StickyNote size={16} className="text-orange-500" />
            {editDate ? `Edit Note: ${editDate}` : "Tulis Note Baru"}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            {/* Date Select */}
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1 block">Tanggal</label>
              <select
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="w-full border rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:ring-2 focus:ring-orange-300 focus:border-orange-300 outline-none"
              >
                <option value="">Pilih tanggal...</option>
                {editDate && !availableDates.includes(editDate) && (
                  <option value={editDate}>{editDate}</option>
                )}
                {availableDates.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* Tag Select */}
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1 block">Kategori</label>
              <div className="flex flex-wrap gap-1.5">
                {NOTE_TAGS.map((tag) => (
                  <button
                    key={tag.key}
                    onClick={() => setNoteTag(tag.key)}
                    className={`text-[11px] px-2.5 py-1.5 rounded-lg border font-medium transition-all ${
                      noteTag === tag.key
                        ? tag.color + " ring-2 ring-offset-1 ring-orange-300 font-bold"
                        : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    {tag.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Mood Select */}
          <div className="mb-4">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1 block">Mood Hari Ini</label>
            <div className="flex gap-2">
              {NOTE_MOODS.map((mood) => (
                <button
                  key={mood.key}
                  onClick={() => setNoteMood(mood.key)}
                  className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl border transition-all ${
                    noteMood === mood.key
                      ? "bg-orange-50 border-orange-300 font-bold ring-2 ring-offset-1 ring-orange-200"
                      : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  <span className="text-base">{mood.emoji}</span>
                  <span className={noteMood === mood.key ? mood.color : "text-gray-500"}>{mood.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Text Area */}
          <div className="mb-4">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1 block">Catatan</label>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Tulis insight, keputusan, observasi hari ini... Contoh: 'Flash sale jam 12 siang, omzet melonjak 3x. Next time prepare stok lebih banyak.'"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:ring-2 focus:ring-orange-300 focus:border-orange-300 outline-none resize-none"
              rows={4}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="text-[10px] text-gray-400">
              {noteText.length > 0 && `${noteText.length} karakter`}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setShowForm(false); setEditDate(""); setNoteText(""); }}
                className="text-xs text-gray-500 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={!editDate || !noteText.trim()}
                className="bg-gradient-to-r from-orange-500 to-rose-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl hover:from-orange-600 hover:to-rose-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md flex items-center gap-1.5"
              >
                <Save size={14} /> Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl border p-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          {/* Search */}
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 Cari catatan..."
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:ring-2 focus:ring-orange-200 focus:border-orange-300 outline-none"
            />
          </div>
          {/* Tag Filters */}
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setFilterTag(null)}
              className={`text-[10px] px-2.5 py-1.5 rounded-lg border font-medium transition-all ${!filterTag ? "bg-orange-100 text-orange-700 border-orange-200 font-bold" : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"}`}
            >
              Semua ({totalNotes})
            </button>
            {NOTE_TAGS.map((tag) => (
              <button
                key={tag.key}
                onClick={() => setFilterTag(filterTag === tag.key ? null : tag.key)}
                className={`text-[10px] px-2.5 py-1.5 rounded-lg border font-medium transition-all ${
                  filterTag === tag.key ? tag.color + " font-bold" : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
                }`}
              >
                {tag.label.split(" ")[0]} {tagCounts[tag.key] || 0}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Notes Timeline */}
      {noteEntries.length === 0 ? (
        <div className="bg-white rounded-2xl border p-10 text-center">
          <StickyNote size={36} className="text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-500 font-medium">
            {totalNotes === 0 ? "Belum ada catatan" : "Tidak ada catatan yang cocok"}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {totalNotes === 0 ? "Mulai catat insight harian Anda — klik 'Tulis Note' untuk mulai!" : "Coba ubah filter atau keyword pencarian."}
          </p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-orange-300 via-amber-200 to-transparent hidden sm:block" />

          <div className="space-y-3">
            {noteEntries.map((entry, idx) => {
              const tagInfo = NOTE_TAGS.find((t) => t.key === entry.tag) || NOTE_TAGS[0];
              const moodInfo = NOTE_MOODS.find((m) => m.key === entry.mood) || NOTE_MOODS[2];
              const dayData = entry.dayData;

              return (
                <div key={entry.date} className="flex gap-3 sm:gap-4 animate-fade-slide-up" style={{ animationDelay: `${idx * 40}ms` }}>
                  {/* Timeline pin */}
                  <div className="hidden sm:flex flex-col items-center shrink-0">
                    <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-base shadow-sm z-10 bg-white ${
                      entry.tag === "milestone" ? "border-green-400" :
                      entry.tag === "flash-sale" ? "border-amber-400" :
                      entry.tag === "campaign" ? "border-blue-400" :
                      entry.tag === "libur" ? "border-rose-400" :
                      entry.tag === "evaluasi" ? "border-purple-400" :
                      "border-gray-300"
                    }`}>
                      {moodInfo.emoji}
                    </div>
                  </div>

                  {/* Note Card */}
                  <div className="flex-1 bg-white rounded-2xl border hover:shadow-md transition-all duration-200 overflow-hidden group">
                    {/* Card Header */}
                    <div className="flex items-center justify-between px-4 pt-3 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-900">{entry.date}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${tagInfo.color}`}>
                          {tagInfo.label}
                        </span>
                        <span className="sm:hidden text-base">{moodInfo.emoji}</span>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEdit(entry)}
                          className="text-[10px] text-gray-400 hover:text-blue-600 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                        >
                          ✏️ Edit
                        </button>
                        {confirmDelete === entry.date ? (
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleDelete(entry.date)}
                              className="text-[10px] text-red-600 font-bold px-2 py-1 rounded-lg bg-red-50 hover:bg-red-100">
                              Hapus
                            </button>
                            <button onClick={() => setConfirmDelete(null)}
                              className="text-[10px] text-gray-400 px-2 py-1 rounded-lg hover:bg-gray-100">
                              Batal
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDelete(entry.date)}
                            className="text-[10px] text-gray-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="px-4 pb-3">
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{entry.text}</p>
                    </div>

                    {/* Performance Footer */}
                    {dayData && (
                      <div className="px-4 pb-3 pt-1 border-t bg-gradient-to-r from-gray-50/80 to-transparent">
                        <div className="flex flex-wrap items-center gap-3 text-[10px]">
                          <span className="text-gray-400 font-medium uppercase tracking-wide">📊 Performa:</span>
                          <span className="font-bold text-gray-700">
                            💰 {fR(dayData.omzet)}
                          </span>
                          <span className="text-gray-500">{fN(dayData.closing)} closing</span>
                          <span className="text-gray-500">{fN(dayData.botol)} botol</span>
                          <span className="text-gray-500">{dayData.upsell.toFixed(2)}x upsell</span>
                          <span className={`font-bold ${dayData.cac_total <= 40 ? "text-green-600" : dayData.cac_total <= 55 ? "text-amber-600" : "text-red-600"}`}>
                            CAC {dayData.cac_total.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stats Summary */}
      {totalNotes > 0 && (
        <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl border p-5">
          <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-1.5">
            <BarChart3 size={14} className="text-orange-500" /> Ringkasan Notes
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {NOTE_TAGS.map((tag) => {
              const count = tagCounts[tag.key] || 0;
              if (count === 0) return null;
              return (
                <div key={tag.key} className={`rounded-xl p-3 text-center border ${tag.color}`}>
                  <div className="text-lg font-black text-number">{count}</div>
                  <div className="text-[10px] font-medium mt-0.5">{tag.label}</div>
                </div>
              );
            })}
          </div>
          {/* Mood Distribution */}
          <div className="flex items-center gap-3 mt-3">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Mood:</span>
            {NOTE_MOODS.map((mood) => {
              const count = Object.values(notes).filter((n) => (n.mood || "neutral") === mood.key).length;
              if (count === 0) return null;
              return (
                <span key={mood.key} className="text-xs flex items-center gap-1 bg-gray-100 rounded-lg px-2 py-1">
                  <span>{mood.emoji}</span>
                  <span className="font-bold text-gray-700">{count}</span>
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}


