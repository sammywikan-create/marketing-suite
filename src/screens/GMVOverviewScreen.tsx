"use client";
import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { BusinessOverviewData, BusinessOverviewSummary, DailyBusinessData } from "@/lib/types";
import {
  parseBusinessOverview, splitOverviewByMonth, getWeeklyBreakdown, getBusinessInsights,
  formatRupiah, formatRupiahShort, fmtDec, formatNum,
  compareMonths, groupByQuarter, avgByDayOfWeek, detectAnomalies,
  forecastNextMonth, buildFunnel,
} from "@/utils/gmvAnalyzer";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend, ReferenceLine,
} from "recharts";
import { Upload, BarChart2, ArrowUpDown, ChevronLeft, ChevronRight, Trash2, Plus } from "lucide-react";
import * as XLSX from "xlsx";
import { useStoreManager } from "@/store/useStoreManager";
import { useRawFileStore } from "@/store/useRawFileStore";

// ─── Constants ──────────────────────────────────────────
const LS_TARGET_KEY = "gmv_target_monthly";
const PAGE_SIZE = 10;
const MONTH_COLORS = ["#1A237E", "#E65100", "#2E7D32", "#7B1FA2", "#C62828", "#00695C", "#4527A0", "#EF6C00", "#1565C0", "#AD1457", "#283593", "#558B2F"];

type OverviewTab = "bulanan" | "komparasi" | "kuartal" | "analitik";
type SortKey = "date" | "gmv" | "refund" | "grossRevenueWithSubsidy" | "productsSold" | "uniqueBuyers" | "pageViews" | "shopVisits" | "orders" | "conversionRate";

// ─── Helpers ────────────────────────────────────────────
function fmtShortDate(ds: string) {
  const d = new Date(ds);
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}
function fmtJt(v: number) {
  if (v >= 1_000_000) return fmtDec(v / 1_000_000, 1) + " Jt";
  if (v >= 1_000) return fmtDec(v / 1_000, 0) + " Rb";
  return formatNum(v);
}

// ─── Empty State ────────────────────────────────────────
function EmptyState({ onUpload }: { onUpload: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <svg width="120" height="120" viewBox="0 0 120 120" fill="none" className="mb-6 opacity-80">
        <rect x="20" y="30" width="80" height="70" rx="8" fill="#E8EAF6" stroke="#1A237E" strokeWidth="2" />
        <path d="M60 50 L60 80" stroke="#1A237E" strokeWidth="3" strokeLinecap="round" />
        <path d="M45 65 L60 50 L75 65" stroke="#1A237E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="35" y="20" width="50" height="15" rx="4" fill="#C5CAE9" stroke="#1A237E" strokeWidth="1.5" />
      </svg>
      <h2 className="text-xl font-bold text-foreground mb-2">Upload File Overview Business Performance</h2>
      <p className="text-muted text-sm max-w-md mb-2">
        Upload file Excel <strong>&quot;Overview My Business Performance&quot;</strong> dari TikTok Shop untuk melihat analisis performa bisnis bulanan Anda.
      </p>
      <div className="bg-blue-50 rounded-lg p-4 text-xs text-blue-700 max-w-md mb-6 text-left">
        <p className="font-semibold mb-1">Cara export dari TikTok Seller Center:</p>
        <ol className="list-decimal pl-4 space-y-0.5">
          <li>Buka TikTok Seller Center &rarr; Data Compass &rarr; Overview</li>
          <li>Pilih periode 1 bulan</li>
          <li>Klik tombol Export &rarr; Download file Excel</li>
          <li>Upload file tersebut di sini</li>
        </ol>
      </div>
      <button onClick={onUpload} className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-primary/20">
        <Upload size={18} /> Upload File Excel
      </button>
    </div>
  );
}

function KPICard({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <div className={`rounded-xl p-4 shadow-sm border border-border ${color} hover:shadow-md transition-shadow`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{icon}</span>
        <span className="text-xs font-medium text-muted">{label}</span>
      </div>
      <p className="text-lg font-bold text-foreground">{value}</p>
    </div>
  );
}

function TabEmpty({ msg }: { msg: string }) {
  return <div className="flex flex-col items-center justify-center py-16 text-center text-muted"><p className="text-sm">{msg}</p></div>;
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════
export default function GMVOverviewScreen() {
  const { getActiveStore, saveOverviewData, deleteOverviewData, stores, activeStoreId } = useStoreManager();
  const activeStore = getActiveStore();
  const setRawFile = useRawFileStore((s) => s.setFile);

  // ─── Multi-month state ────────────────────────────────
  const [allMonths, setAllMonths] = useState<BusinessOverviewData[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [activeTab, setActiveTab] = useState<OverviewTab>("bulanan");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmReplace, setConfirmReplace] = useState<{ parsed: BusinessOverviewData; idx: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Table state (Tab 1)
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(0);

  // Target GMV (Tab 4)
  const [targetGMV, setTargetGMV] = useState(0);

  // AI insight state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState("");

  // ─── Sync from store manager ──────────────────────────
  useEffect(() => {
    if (activeStore) {
      setAllMonths(activeStore.overviewData);
      setSelectedIdx(Math.max(0, activeStore.overviewData.length - 1));
    } else {
      setAllMonths([]);
      setSelectedIdx(0);
    }
  }, [activeStoreId, stores]);

  useEffect(() => {
    try {
      const t = localStorage.getItem(LS_TARGET_KEY);
      if (t) setTargetGMV(Number(t) || 0);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (targetGMV > 0) localStorage.setItem(LS_TARGET_KEY, String(targetGMV));
  }, [targetGMV]);

  // ─── Derived single-month data ────────────────────────
  const data = allMonths[selectedIdx] || null;

  // ─── File handler ─────────────────────────────────────
  const handleFile = useCallback(async (file: File) => {
    if (!file.name.match(/\.xlsx?$/i)) { setError("File harus berformat .xlsx atau .xls"); return; }
    if (!activeStore) { setError("Pilih toko terlebih dahulu."); return; }
    setRawFile(activeStore.id, 'overview', file);
    setLoading(true); setError("");
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array", cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null }) as any[][];
      const parsed = parseBusinessOverview(raw);
      if (parsed.daily.length === 0) { setError("Tidak ditemukan data harian di file ini."); setLoading(false); return; }

      // File Shop Analytics bisa mencakup >1 bulan → pecah dan simpan per bulan
      const months = splitOverviewByMonth(parsed);
      if (months.length > 1) {
        months.forEach((m) => saveOverviewData(activeStore.id, m));
        setActiveTab("bulanan");
      } else {
        const single = months[0];
        const existingIdx = allMonths.findIndex(m => m.period.month === single.period.month);
        if (existingIdx >= 0) {
          setConfirmReplace({ parsed: single, idx: existingIdx });
        } else {
          saveOverviewData(activeStore.id, single);
          setActiveTab("bulanan");
        }
      }
    } catch { setError("Gagal membaca file. Pastikan file Excel valid."); }
    setLoading(false);
  }, [allMonths, activeStore, saveOverviewData]);

  const doReplace = () => {
    if (!confirmReplace || !activeStore) return;
    saveOverviewData(activeStore.id, confirmReplace.parsed);
    setConfirmReplace(null);
    setActiveTab("bulanan");
  };

  const removeMonth = (idx: number) => {
    if (!activeStore) return;
    const m = allMonths[idx];
    deleteOverviewData(activeStore.id, m.period.month);
    if (selectedIdx >= allMonths.length - 1) setSelectedIdx(Math.max(0, allMonths.length - 2));
  };

  const triggerUpload = () => fileRef.current?.click();
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; };

  // ─── Tab 1 memos ─────────────────────────────────────
  const insights = useMemo(() => data ? getBusinessInsights(data) : [], [data]);
  const weeks = useMemo(() => data ? getWeeklyBreakdown(data.daily) : [], [data]);
  const bestGMVDate = useMemo(() => {
    if (!data || data.daily.length === 0) return "";
    return data.daily.reduce((a, b) => (b.gmv > a.gmv ? b : a), data.daily[0]).date;
  }, [data]);
  const sortedDaily = useMemo(() => {
    if (!data) return [];
    const arr = [...data.daily];
    arr.sort((a, b) => {
      const va = a[sortKey] as number | string; const vb = b[sortKey] as number | string;
      if (typeof va === "string") return sortAsc ? va.localeCompare(vb as string) : (vb as string).localeCompare(va);
      return sortAsc ? (va as number) - (vb as number) : (vb as number) - (va as number);
    });
    return arr;
  }, [data, sortKey, sortAsc]);
  const totalPages = Math.ceil(sortedDaily.length / PAGE_SIZE);
  const pagedDaily = sortedDaily.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const toggleSort = (key: SortKey) => { if (sortKey === key) setSortAsc(!sortAsc); else { setSortKey(key); setSortAsc(key === "date"); } };
  const chartDaily = useMemo(() => {
    if (!data) return [];
    return data.daily.map(d => ({ ...d, dateLabel: fmtShortDate(d.date), gmvJt: d.gmv / 1_000_000 }));
  }, [data]);

  // ─── Multi-month memos ────────────────────────────────
  const comparisons = useMemo(() => compareMonths(allMonths), [allMonths]);
  const quarters = useMemo(() => groupByQuarter(allMonths), [allMonths]);
  const dowStats = useMemo(() => avgByDayOfWeek(allMonths), [allMonths]);
  const anomalies = useMemo(() => detectAnomalies(allMonths), [allMonths]);
  const forecast = useMemo(() => forecastNextMonth(allMonths), [allMonths]);

  const multiLineData = useMemo(() => {
    if (allMonths.length < 2) return [];
    const maxDays = Math.max(...allMonths.map(m => m.daily.length));
    const rows: any[] = [];
    for (let d = 0; d < maxDays; d++) {
      const row: any = { dayNum: d + 1 };
      allMonths.forEach((m, mi) => { row[m.period.month] = m.daily[d]?.gmv ?? null; });
      rows.push(row);
    }
    return rows;
  }, [allMonths]);

  const barMonthlyData = useMemo(() =>
    [...allMonths].sort((a, b) => a.period.start.localeCompare(b.period.start)).map(m => ({
      month: m.period.month, gmvJt: m.summary.gmv / 1_000_000, orders: m.summary.orders,
    })), [allMonths]);

  const convTrendData = useMemo(() =>
    [...allMonths].sort((a, b) => a.period.start.localeCompare(b.period.start)).map(m => ({
      month: m.period.month, conversion: m.summary.conversionRate,
    })), [allMonths]);

  const aggregatedSummary = useMemo((): BusinessOverviewSummary => {
    const z: BusinessOverviewSummary = { gmv: 0, refund: 0, grossRevenueWithSubsidy: 0, productsSold: 0, uniqueBuyers: 0, pageViews: 0, shopVisits: 0, skuOrders: 0, orders: 0, conversionRate: 0 };
    allMonths.forEach(m => { const s = m.summary; z.gmv += s.gmv; z.refund += s.refund; z.grossRevenueWithSubsidy += s.grossRevenueWithSubsidy; z.productsSold += s.productsSold; z.uniqueBuyers += s.uniqueBuyers; z.pageViews += s.pageViews; z.shopVisits += s.shopVisits; z.skuOrders += s.skuOrders; z.orders += s.orders; });
    if (allMonths.length > 0) z.conversionRate = allMonths.reduce((s, m) => s + m.summary.conversionRate, 0) / allMonths.length;
    return z;
  }, [allMonths]);

  const funnelSteps = useMemo(() => buildFunnel(aggregatedSummary), [aggregatedSummary]);

  // Heatmap data
  const heatmapData = useMemo(() => {
    const allDaily = allMonths.flatMap(m => m.daily);
    if (allDaily.length === 0) return { weeks: [] as { weekLabel: string; days: { dow: number; gmv: number; date: string }[] }[], max: 0 };
    allDaily.sort((a, b) => a.date.localeCompare(b.date));
    const max = Math.max(...allDaily.map(d => d.gmv));
    const weekMap: { weekLabel: string; days: { dow: number; gmv: number; date: string }[] }[] = [];
    let currentWeek: typeof weekMap[0] | null = null;
    allDaily.forEach((d, i) => {
      const dt = new Date(d.date);
      const dow = dt.getDay();
      if (dow === 1 || i === 0 || !currentWeek) {
        currentWeek = { weekLabel: fmtShortDate(d.date), days: [] };
        weekMap.push(currentWeek);
      }
      currentWeek.days.push({ dow, gmv: d.gmv, date: d.date });
    });
    return { weeks: weekMap, max };
  }, [allMonths]);

  // AI Multi-Month
  const handleAI = async () => {
    setAiLoading(true); setAiResult("");
    try {
      const context = {
        type: "multi_month_analysis",
        months: allMonths.map(m => ({
          month: m.period.month, gmv: m.summary.gmv, orders: m.summary.orders,
          conversionRate: m.summary.conversionRate, uniqueBuyers: m.summary.uniqueBuyers,
          pageViews: m.summary.pageViews, shopVisits: m.summary.shopVisits,
          refundRate: m.summary.gmv > 0 ? (m.summary.refund / m.summary.gmv) * 100 : 0,
        })),
        quarters: quarters.map(q => ({ label: q.label, totalGMV: q.totalGMV, totalOrders: q.totalOrders })),
        trend: allMonths.length >= 2 ? (allMonths[allMonths.length - 1].summary.gmv >= allMonths[0].summary.gmv ? "naik" : "turun") : "belum cukup data",
      };
      const res = await fetch("/api/ai-chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "system", content: "Analisis tren bisnis TikTok Shop berdasarkan data multi-bulan berikut. Identifikasi: 1) Tren GMV (naik/turun/seasonal), 2) Bulan terbaik dan terburuk beserta kemungkinan penyebabnya, 3) Rekomendasi konkret untuk meningkatkan performa bulan berikutnya, 4) Red flags yang perlu diperhatikan." },
            { role: "user", content: JSON.stringify(context) },
          ],
        }),
      });
      if (!res.ok) throw new Error("API error");
      const json = await res.json();
      setAiResult(json.result || json.content || json.message || JSON.stringify(json));
    } catch {
      setAiResult("Gagal menghubungi AI. Pastikan endpoint /api/ai-chat sudah dikonfigurasi.");
    }
    setAiLoading(false);
  };

  // ─── TAB CONFIG ───────────────────────────────────────
  const tabs: { key: OverviewTab; label: string; minMonths: number }[] = [
    { key: "bulanan", label: "📅 Bulanan", minMonths: 1 },
    { key: "komparasi", label: "📊 Komparasi", minMonths: 2 },
    { key: "kuartal", label: "🗓️ Kuartal", minMonths: 3 },
    { key: "analitik", label: "🔬 Analitik", minMonths: 1 },
  ];

  // ═════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════
  return (
    <div>
      <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={onFileChange} className="hidden" />

      {/* Confirm replace dialog */}
      {confirmReplace && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-md shadow-xl">
            <h3 className="font-bold text-lg mb-2">Bulan Sudah Ada</h3>
            <p className="text-sm text-muted mb-4">Data untuk <strong>{confirmReplace.parsed.period.month}</strong> sudah ada. Timpa data lama?</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmReplace(null)} className="px-4 py-2 rounded-lg text-sm border border-border hover:bg-gray-50">Batal</button>
              <button onClick={doReplace} className="px-4 py-2 rounded-lg text-sm bg-primary text-white hover:opacity-90">Timpa</button>
            </div>
          </div>
        </div>
      )}

      {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">{error}</div>}
      {loading && <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent" /></div>}

      {!loading && allMonths.length === 0 ? (
        <EmptyState onUpload={triggerUpload} />
      ) : allMonths.length > 0 && (
        <>
          {/* ── HEADER ──────────────────────── */}
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <BarChart2 size={24} className="text-primary" /> Overview Bisnis Bulanan
            </h1>
            <button onClick={triggerUpload} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
              <Plus size={16} /> Upload Bulan Baru
            </button>
          </div>

          {/* ── MONTH SELECTOR ──────────────── */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {allMonths.map((m, i) => (
              <div key={m.period.month} className="flex items-center gap-0.5">
                <button
                  onClick={() => { setSelectedIdx(i); setActiveTab("bulanan"); setPage(0); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${selectedIdx === i && activeTab === "bulanan" ? "bg-primary text-white" : "bg-gray-100 text-foreground hover:bg-gray-200"}`}
                >
                  {m.period.month}
                </button>
                <button onClick={() => removeMonth(i)} className="p-1 rounded hover:bg-red-100 text-muted hover:text-red-600 transition-colors" title="Hapus bulan">
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>

          {/* ── TAB NAVIGATION ──────────────── */}
          <div className="flex gap-1 mb-6 border-b border-border">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === t.key ? "border-primary text-primary" : "border-transparent text-muted hover:text-foreground"}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* ════════════════════════════════════ */}
          {/* TAB 1: BULANAN (existing)           */}
          {/* ════════════════════════════════════ */}
          {activeTab === "bulanan" && data && (
            <>
              <p className="text-sm text-muted mb-4">
                Periode: <strong>{data.period.month || `${data.period.start} — ${data.period.end}`}</strong> &middot; {data.daily.length} hari
              </p>

              {/* KPI CARDS */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
                <KPICard icon="💰" label="GMV (Gross Revenue)" value={formatRupiah(data.summary.gmv)} color="bg-green-50" />
                <KPICard icon="💸" label="Total Pengembalian Dana" value={formatRupiah(data.summary.refund)} color="bg-red-50" />
                <KPICard icon="🎯" label="Pendapatan Bruto + Subsidi" value={formatRupiah(data.summary.grossRevenueWithSubsidy)} color="bg-green-50" />
                <KPICard icon="📦" label="Produk Terjual" value={formatNum(data.summary.productsSold)} color="bg-blue-50" />
                <KPICard icon="👥" label="Pembeli Unik" value={formatNum(data.summary.uniqueBuyers)} color="bg-purple-50" />
                <KPICard icon="👁️" label="Tayangan Halaman" value={formatNum(data.summary.pageViews)} color="bg-blue-50" />
                <KPICard icon="🏪" label="Kunjungan Toko" value={formatNum(data.summary.shopVisits)} color="bg-blue-50" />
                <KPICard icon="🛒" label="Pesanan SKU" value={formatNum(data.summary.skuOrders)} color="bg-green-50" />
                <KPICard icon="✅" label="Total Pesanan" value={formatNum(data.summary.orders)} color="bg-green-50" />
                <KPICard icon="📈" label="Persentase Konversi" value={fmtDec(data.summary.conversionRate, 1) + "%"} color="bg-purple-50" />
              </div>

              {/* CHARTS */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                <div className="bg-white rounded-xl p-5 shadow-sm border border-border">
                  <h3 className="font-semibold mb-4 text-sm">📈 GMV Harian</h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={chartDaily} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                      <defs><linearGradient id="gmvGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#1A237E" stopOpacity={0.3} /><stop offset="95%" stopColor="#1A237E" stopOpacity={0.02} /></linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="dateLabel" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => fmtDec(v, 1) + " Jt"} />
                      <Tooltip formatter={(value: any) => [formatRupiah(Number(value) * 1_000_000), "GMV"]} labelFormatter={(l: any) => `Tanggal: ${l}`} />
                      <Area type="monotone" dataKey="gmvJt" stroke="#1A237E" strokeWidth={2} fill="url(#gmvGrad)" name="GMV" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="bg-white rounded-xl p-5 shadow-sm border border-border">
                  <h3 className="font-semibold mb-4 text-sm">📦 Pesanan & Produk Terjual Harian</h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={chartDaily} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="dateLabel" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v: any, name: any) => [formatNum(Number(v)), name]} />
                      <Legend />
                      <Bar dataKey="orders" name="Pesanan" fill="#1A237E" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="productsSold" name="Produk Terjual" fill="#4CAF50" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="bg-white rounded-xl p-5 shadow-sm border border-border">
                  <h3 className="font-semibold mb-4 text-sm">👁️ Traffic Harian</h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={chartDaily} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="dateLabel" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => fmtJt(v)} />
                      <Tooltip formatter={(v: any, name: any) => [formatNum(Number(v)), name]} />
                      <Legend />
                      <Line type="monotone" dataKey="pageViews" name="Tayangan Halaman" stroke="#7B1FA2" strokeWidth={2} dot={{ r: 2 }} />
                      <Line type="monotone" dataKey="shopVisits" name="Kunjungan Toko" stroke="#FF6F00" strokeWidth={2} dot={{ r: 2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="bg-white rounded-xl p-5 shadow-sm border border-border">
                  <h3 className="font-semibold mb-4 text-sm">📊 Persentase Konversi Harian</h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={chartDaily} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="dateLabel" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => fmtDec(v, 0) + "%"} />
                      <Tooltip formatter={(v: any) => [fmtDec(Number(v), 2) + "%", "Konversi"]} />
                      <ReferenceLine y={10} stroke="#94A3B8" strokeDasharray="6 4" label={{ value: "Target 10%", position: "insideTopRight", fill: "#94A3B8", fontSize: 11 }} />
                      <Line type="monotone" dataKey="conversionRate" name="Konversi" stroke="#4CAF50" strokeWidth={2}
                        dot={(props: any) => {
                          const { cx, cy, payload } = props;
                          if (payload.conversionRate > 15) return <circle cx={cx} cy={cy} r={5} fill="#FFD600" stroke="#FF8F00" strokeWidth={2} key={`dot-${payload.date}`} />;
                          return <circle cx={cx} cy={cy} r={2.5} fill="#4CAF50" key={`dot-${payload.date}`} />;
                        }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* INSIGHTS */}
              <div className="mb-6">
                <h3 className="font-semibold mb-3 text-sm">💡 Insight Otomatis</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {insights.map((ins, i) => (
                    <div key={i} className={`rounded-xl p-4 border border-border ${ins.color}`}>
                      <div className="flex items-center gap-2 mb-1"><span className="text-lg">{ins.icon}</span><span className="text-xs font-semibold">{ins.label}</span></div>
                      <p className="text-sm font-bold">{ins.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* WEEKLY BREAKDOWN */}
              <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden mb-6">
                <div className="px-5 py-3 bg-gray-50 border-b border-border"><h3 className="font-semibold text-sm">📅 Weekly Breakdown</h3></div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="bg-gray-50 border-b border-border">
                      <th className="text-left px-4 py-3 font-semibold text-muted">Minggu</th>
                      <th className="text-right px-4 py-3 font-semibold text-muted">Total GMV</th>
                      <th className="text-right px-4 py-3 font-semibold text-muted">Total Pesanan</th>
                      <th className="text-right px-4 py-3 font-semibold text-muted">Avg Konversi%</th>
                      <th className="text-right px-4 py-3 font-semibold text-muted">Avg Tayangan</th>
                      <th className="text-right px-4 py-3 font-semibold text-muted">Growth vs Sebelumnya</th>
                    </tr></thead>
                    <tbody>{weeks.map(w => (
                      <tr key={w.week} className="border-b border-border hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium">{w.label}</td>
                        <td className="px-4 py-3 text-right font-semibold">{formatRupiah(w.totalGMV)}</td>
                        <td className="px-4 py-3 text-right">{formatNum(w.totalOrders)}</td>
                        <td className="px-4 py-3 text-right">{fmtDec(w.avgConversion, 1)}%</td>
                        <td className="px-4 py-3 text-right">{formatNum(Math.round(w.avgPageViews))}</td>
                        <td className="px-4 py-3 text-right font-semibold">
                          {w.growthGMV == null ? <span className="text-muted">—</span> : w.growthGMV >= 0 ? <span className="text-green-600">↑ {fmtDec(w.growthGMV, 1)}%</span> : <span className="text-red-600">↓ {fmtDec(Math.abs(w.growthGMV), 1)}%</span>}
                        </td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              </div>

              {/* DAILY TABLE */}
              <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
                <div className="px-5 py-3 bg-gray-50 border-b border-border flex items-center justify-between">
                  <h3 className="font-semibold text-sm">📋 Data Harian Lengkap</h3>
                  <span className="text-xs text-muted">{sortedDaily.length} baris &middot; Halaman {page + 1}/{totalPages || 1}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10"><tr className="bg-gray-50 border-b border-border">
                      {([["date","Tanggal"],["gmv","GMV (Rp)"],["refund","Refund (Rp)"],["grossRevenueWithSubsidy","Pendapatan+Subsidi"],["productsSold","Produk"],["uniqueBuyers","Pembeli"],["pageViews","Tayangan"],["shopVisits","Kunjungan"],["orders","Pesanan"],["conversionRate","Konversi%"]] as [SortKey,string][]).map(([key,label]) => (
                        <th key={key} onClick={() => toggleSort(key)} className="px-3 py-3 font-semibold text-muted text-right cursor-pointer hover:text-foreground select-none first:text-left whitespace-nowrap">
                          <span className="inline-flex items-center gap-1">{label} <ArrowUpDown size={12} className="opacity-40" /></span>
                        </th>
                      ))}
                    </tr></thead>
                    <tbody>{pagedDaily.map(row => {
                      const isHighGMV = row.date === bestGMVDate;
                      const convColor = row.conversionRate < 8 ? "text-red-600" : row.conversionRate <= 12 ? "text-yellow-600" : "text-green-600";
                      return (
                        <tr key={row.date} className={`border-b border-border hover:bg-gray-50 transition-colors ${isHighGMV ? "bg-yellow-50" : ""}`}>
                          <td className="px-3 py-2.5 font-medium whitespace-nowrap">{fmtShortDate(row.date)}</td>
                          <td className="px-3 py-2.5 text-right font-semibold text-green-700">{formatRupiah(row.gmv)}</td>
                          <td className="px-3 py-2.5 text-right">{formatRupiah(row.refund)}</td>
                          <td className="px-3 py-2.5 text-right">{formatRupiah(row.grossRevenueWithSubsidy)}</td>
                          <td className="px-3 py-2.5 text-right">{formatNum(row.productsSold)}</td>
                          <td className="px-3 py-2.5 text-right">{formatNum(row.uniqueBuyers)}</td>
                          <td className="px-3 py-2.5 text-right">{formatNum(row.pageViews)}</td>
                          <td className="px-3 py-2.5 text-right">{formatNum(row.shopVisits)}</td>
                          <td className="px-3 py-2.5 text-right">{formatNum(row.orders)}</td>
                          <td className={`px-3 py-2.5 text-right font-semibold ${convColor}`}>{fmtDec(row.conversionRate, 1)}%</td>
                        </tr>
                      );
                    })}</tbody>
                  </table>
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 py-3 border-t border-border">
                    <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30"><ChevronLeft size={16} /></button>
                    {Array.from({ length: totalPages }, (_, i) => (
                      <button key={i} onClick={() => setPage(i)} className={`w-8 h-8 rounded text-xs font-medium ${page === i ? "bg-primary text-white" : "hover:bg-gray-100 text-muted"}`}>{i + 1}</button>
                    ))}
                    <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page === totalPages - 1} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30"><ChevronRight size={16} /></button>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ════════════════════════════════════ */}
          {/* TAB 2: KOMPARASI BULANAN            */}
          {/* ════════════════════════════════════ */}
          {activeTab === "komparasi" && (allMonths.length < 2 ? (
            <TabEmpty msg="Upload minimal 2 bulan data untuk melihat fitur Komparasi Bulanan." />
          ) : (
            <>
              {/* 2A: Comparison KPI Table */}
              <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden mb-6">
                <div className="px-5 py-3 bg-gray-50 border-b border-border"><h3 className="font-semibold text-sm">📊 Perbandingan KPI Antar Bulan</h3></div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="bg-gray-50 border-b border-border">
                      <th className="text-left px-4 py-3 font-semibold text-muted">Metrik</th>
                      {comparisons[0]?.values.map(v => <th key={v.month} className="text-right px-4 py-3 font-semibold text-muted whitespace-nowrap">{v.month}</th>)}
                      <th className="text-right px-4 py-3 font-semibold text-muted">Tren</th>
                    </tr></thead>
                    <tbody>{comparisons.map((c, i) => (
                      <tr key={i} className="border-b border-border hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{c.metrik}</td>
                        {c.values.map(v => <td key={v.month} className="px-4 py-3 text-right">{v.formatted}</td>)}
                        <td className="px-4 py-3 text-right font-semibold whitespace-nowrap">
                          {c.trendPct == null ? <span className="text-muted">—</span> :
                            (() => {
                              const isGood = c.invertTrend ? c.trendDir === "down" : c.trendDir === "up";
                              const isBad = c.invertTrend ? c.trendDir === "up" : c.trendDir === "down";
                              const arrow = c.trendDir === "up" ? "↑" : c.trendDir === "down" ? "↓" : "→";
                              const color = isGood ? "text-green-600" : isBad ? "text-red-600" : "text-gray-500";
                              return <span className={color}>{arrow} {fmtDec(Math.abs(c.trendPct), 1)}%</span>;
                            })()
                          }
                        </td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              </div>

              {/* 2B: Multi-month GMV Line Chart */}
              <div className="bg-white rounded-xl p-5 shadow-sm border border-border mb-6">
                <h3 className="font-semibold mb-4 text-sm">📈 Perbandingan GMV Harian Antar Bulan</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={multiLineData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="dayNum" tick={{ fontSize: 10 }} label={{ value: "Hari ke-", position: "insideBottom", offset: -2, fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => fmtDec(v / 1_000_000, 1) + " Jt"} />
                    <Tooltip formatter={(v: any, name: any) => [formatRupiah(Number(v)), name]} labelFormatter={(l: any) => `Hari ke-${l}`} />
                    <Legend />
                    {allMonths.map((m, i) => (
                      <Line key={m.period.month} type="monotone" dataKey={m.period.month} stroke={MONTH_COLORS[i % MONTH_COLORS.length]} strokeWidth={2} dot={{ r: 2 }} connectNulls />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* 2C: Bar Chart Komparasi Bulanan */}
              <div className="bg-white rounded-xl p-5 shadow-sm border border-border mb-6">
                <h3 className="font-semibold mb-4 text-sm">📊 GMV & Pesanan per Bulan</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={barMonthlyData} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 10 }} tickFormatter={(v: number) => fmtDec(v, 0) + " Jt"} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v: any, name: any) => [name === "GMV (Jt Rp)" ? fmtDec(Number(v), 1) + " Jt" : formatNum(Number(v)), name]} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="gmvJt" name="GMV (Jt Rp)" fill="#1A237E" radius={[3, 3, 0, 0]} />
                    <Bar yAxisId="right" dataKey="orders" name="Pesanan" fill="#4CAF50" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* 2D: Conversion Rate Trend */}
              <div className="bg-white rounded-xl p-5 shadow-sm border border-border mb-6">
                <h3 className="font-semibold mb-4 text-sm">📈 Tren Konversi Bulanan</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={convTrendData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => fmtDec(v, 0) + "%"} />
                    <Tooltip formatter={(v: any) => [fmtDec(Number(v), 2) + "%", "Konversi"]} />
                    <ReferenceLine y={12} stroke="#94A3B8" strokeDasharray="6 4" label={{ value: "Benchmark 12%", position: "insideTopRight", fill: "#94A3B8", fontSize: 11 }} />
                    <Line type="monotone" dataKey="conversion" name="Konversi" stroke="#2E7D32" strokeWidth={2.5} dot={{ r: 4, fill: "#2E7D32" }}
                      label={(props: any) => {
                        const { x, y, value } = props;
                        if (value < 12) return <text x={x} y={y - 10} textAnchor="middle" fill="#C62828" fontSize={10}>⚠️</text>;
                        return null;
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* AI Multi-Month Button */}
              {allMonths.length >= 2 && (
                <div className="bg-white rounded-xl p-5 shadow-sm border border-border mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-sm">🤖 Analisis AI Multi-Bulan</h3>
                    <button onClick={handleAI} disabled={aiLoading} className="px-4 py-2 bg-primary text-white rounded-lg text-xs font-medium hover:opacity-90 disabled:opacity-50">
                      {aiLoading ? "Menganalisis..." : "Analisis Sekarang"}
                    </button>
                  </div>
                  {aiResult && <div className="bg-gray-50 rounded-lg p-4 text-sm whitespace-pre-wrap">{aiResult}</div>}
                </div>
              )}
            </>
          ))}

          {/* ════════════════════════════════════ */}
          {/* TAB 3: KUARTAL                      */}
          {/* ════════════════════════════════════ */}
          {activeTab === "kuartal" && (allMonths.length < 3 ? (
            <TabEmpty msg="Upload minimal 3 bulan data untuk melihat fitur Analisis Kuartal." />
          ) : (
            <>
              {/* 3A: Quarterly KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
                {quarters.map(q => (
                  <div key={q.label} className="bg-white rounded-xl p-5 shadow-sm border border-border">
                    <h4 className="text-sm font-bold text-primary mb-3">{q.label}</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-muted">Total GMV</span><span className="font-semibold">{formatRupiahShort(q.totalGMV)}</span></div>
                      <div className="flex justify-between"><span className="text-muted">Total Pesanan</span><span className="font-semibold">{formatNum(q.totalOrders)}</span></div>
                      <div className="flex justify-between"><span className="text-muted">Avg Konversi</span><span className="font-semibold">{fmtDec(q.avgConversion, 1)}%</span></div>
                      <div className="flex justify-between"><span className="text-muted">Bulan Terbaik</span><span className="font-semibold text-green-700">{q.bestMonth}</span></div>
                      {q.growthVsPrev != null && (
                        <div className="flex justify-between"><span className="text-muted">Growth</span>
                          <span className={`font-semibold ${q.growthVsPrev >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {q.growthVsPrev >= 0 ? "↑" : "↓"} {fmtDec(Math.abs(q.growthVsPrev), 1)}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* 3B: Quarterly Comparison Table */}
              <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden mb-6">
                <div className="px-5 py-3 bg-gray-50 border-b border-border"><h3 className="font-semibold text-sm">🗓️ Perbandingan Kuartal</h3></div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="bg-gray-50 border-b border-border">
                      <th className="text-left px-4 py-3 font-semibold text-muted">Metrik</th>
                      {quarters.map(q => <th key={q.label} className="text-right px-4 py-3 font-semibold text-muted">{q.label}</th>)}
                      {quarters.length >= 2 && <th className="text-right px-4 py-3 font-semibold text-muted">Growth</th>}
                    </tr></thead>
                    <tbody>
                      {[
                        { label: "Total GMV", vals: quarters.map(q => formatRupiahShort(q.totalGMV)), nums: quarters.map(q => q.totalGMV) },
                        { label: "Total Pesanan", vals: quarters.map(q => formatNum(q.totalOrders)), nums: quarters.map(q => q.totalOrders) },
                        { label: "Avg Konversi", vals: quarters.map(q => fmtDec(q.avgConversion, 1) + "%"), nums: quarters.map(q => q.avgConversion) },
                        { label: "Total Pembeli", vals: quarters.map(q => formatNum(q.totalBuyers)), nums: quarters.map(q => q.totalBuyers) },
                      ].map((row, ri) => (
                        <tr key={ri} className="border-b border-border hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium">{row.label}</td>
                          {row.vals.map((v, vi) => <td key={vi} className="px-4 py-3 text-right">{v}</td>)}
                          {quarters.length >= 2 && (() => {
                            const prev = row.nums[row.nums.length - 2];
                            const curr = row.nums[row.nums.length - 1];
                            const pct = prev > 0 ? ((curr - prev) / prev) * 100 : 0;
                            return <td className="px-4 py-3 text-right font-semibold">
                              <span className={pct >= 0 ? "text-green-600" : "text-red-600"}>{pct >= 0 ? "↑" : "↓"} {fmtDec(Math.abs(pct), 1)}%</span>
                            </td>;
                          })()}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 3C: Quarterly GMV Bar Chart */}
              <div className="bg-white rounded-xl p-5 shadow-sm border border-border mb-6">
                <h3 className="font-semibold mb-4 text-sm">📊 Total GMV per Kuartal</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={quarters.map(q => ({ label: q.label, gmvJt: q.totalGMV / 1_000_000 }))} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => fmtDec(v, 0) + " Jt"} />
                    <Tooltip formatter={(v: any) => [fmtDec(Number(v), 1) + " Jt Rp", "GMV"]} />
                    <Bar dataKey="gmvJt" name="GMV" fill="#1A237E" radius={[4, 4, 0, 0]}
                      label={{ position: "top", fontSize: 10, formatter: (v: any) => fmtDec(Number(v), 1) + " Jt" }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          ))}

          {/* ════════════════════════════════════ */}
          {/* TAB 4: ANALITIK                     */}
          {/* ════════════════════════════════════ */}
          {activeTab === "analitik" && (
            <>
              {/* 4A: Best Day of Week */}
              <div className="bg-white rounded-xl p-5 shadow-sm border border-border mb-6">
                <h3 className="font-semibold mb-4 text-sm">📅 Rata-rata GMV per Hari dalam Seminggu</h3>
                {dowStats.length > 0 && (
                  <div className="bg-green-50 rounded-lg p-3 mb-4 text-sm text-green-700">
                    💡 Hari terbaik untuk promosi: <strong>{dowStats[0].day}</strong> dengan avg GMV <strong>{formatRupiah(dowStats[0].avgGMV)}</strong>
                  </div>
                )}
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={dowStats} layout="vertical" margin={{ top: 5, right: 10, left: 60, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v: number) => fmtJt(v)} />
                    <YAxis type="category" dataKey="day" tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: any) => [formatRupiah(Number(v)), "Avg GMV"]} />
                    <Bar dataKey="avgGMV" name="Avg GMV" fill="#1A237E" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* 4B: Weekly Pattern Heatmap */}
              <div className="bg-white rounded-xl p-5 shadow-sm border border-border mb-6">
                <h3 className="font-semibold mb-4 text-sm">🗓️ Heatmap GMV Mingguan</h3>
                <div className="overflow-x-auto">
                  <div className="min-w-[500px]">
                    <div className="grid grid-cols-8 gap-1 text-xs mb-1">
                      <div className="text-muted font-medium">Minggu</div>
                      {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map(d => <div key={d} className="text-center text-muted font-medium">{d}</div>)}
                    </div>
                    {heatmapData.weeks.map((w, wi) => (
                      <div key={wi} className="grid grid-cols-8 gap-1 mb-1">
                        <div className="text-[10px] text-muted flex items-center">{w.weekLabel}</div>
                        {[1, 2, 3, 4, 5, 6, 0].map(dow => {
                          const cell = w.days.find(d => d.dow === dow);
                          if (!cell) return <div key={dow} className="h-8 rounded bg-gray-50" />;
                          const intensity = heatmapData.max > 0 ? cell.gmv / heatmapData.max : 0;
                          const bg = `rgba(26, 35, 126, ${0.08 + intensity * 0.85})`;
                          return (
                            <div key={dow} className="h-8 rounded flex items-center justify-center text-[9px] font-medium cursor-default" style={{ background: bg, color: intensity > 0.5 ? "#fff" : "#1A237E" }} title={`${fmtShortDate(cell.date)}: ${formatRupiah(cell.gmv)}`}>
                              {fmtDec(cell.gmv / 1_000_000, 1)}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                    <div className="flex items-center gap-2 mt-3 text-[10px] text-muted">
                      <span>Rendah</span>
                      <div className="flex gap-0.5">{[0.1, 0.3, 0.5, 0.7, 0.9].map(v => <div key={v} className="w-6 h-3 rounded" style={{ background: `rgba(26,35,126,${0.08 + v * 0.85})` }} />)}</div>
                      <span>Tinggi (Jt Rp)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4C: Conversion Funnel */}
              <div className="bg-white rounded-xl p-5 shadow-sm border border-border mb-6">
                <h3 className="font-semibold mb-4 text-sm">🔄 Conversion Funnel (Semua Bulan)</h3>
                <div className="max-w-lg mx-auto space-y-2">
                  {funnelSteps.map((step, i) => {
                    const widthPct = funnelSteps[0].value > 0 ? Math.max(20, (step.value / funnelSteps[0].value) * 100) : 100;
                    return (
                      <div key={i}>
                        {step.dropRate != null && (
                          <div className="text-center text-xs text-red-500 py-1">↓ Drop {fmtDec(step.dropRate, 1)}%</div>
                        )}
                        <div className="relative rounded-lg overflow-hidden" style={{ width: `${widthPct}%`, margin: "0 auto" }}>
                          <div className="py-3 px-4 text-white text-sm font-medium flex justify-between" style={{ background: step.color }}>
                            <span>{step.label}</span>
                            <span>{formatNum(step.value)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 4D: Anomaly Detection */}
              {anomalies.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden mb-6">
                  <div className="px-5 py-3 bg-gray-50 border-b border-border"><h3 className="font-semibold text-sm">⚡ Anomaly Detection</h3></div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="bg-gray-50 border-b border-border">
                        <th className="text-left px-4 py-3 font-semibold text-muted">Tanggal</th>
                        <th className="text-left px-4 py-3 font-semibold text-muted">Bulan</th>
                        <th className="text-right px-4 py-3 font-semibold text-muted">GMV</th>
                        <th className="text-center px-4 py-3 font-semibold text-muted">Status</th>
                        <th className="text-left px-4 py-3 font-semibold text-muted">Kemungkinan Penyebab</th>
                      </tr></thead>
                      <tbody>{anomalies.map((a, i) => (
                        <tr key={i} className="border-b border-border hover:bg-gray-50">
                          <td className="px-4 py-3">{fmtShortDate(a.date)}</td>
                          <td className="px-4 py-3 text-muted">{a.month}</td>
                          <td className="px-4 py-3 text-right font-semibold">{formatRupiah(a.gmv)}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${a.status === "spike" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                              {a.status === "spike" ? "📈 Spike" : "📉 Drop"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">{a.possibleCause}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 4E: Target vs Actual */}
              <div className="bg-white rounded-xl p-5 shadow-sm border border-border mb-6">
                <h3 className="font-semibold mb-4 text-sm">🎯 Target vs Actual GMV Bulanan</h3>
                <div className="flex items-center gap-3 mb-4">
                  <label className="text-sm text-muted">Target GMV (Rp):</label>
                  <input type="number" value={targetGMV || ""} onChange={e => setTargetGMV(Number(e.target.value) || 0)} placeholder="Contoh: 100000000"
                    className="border border-border rounded-lg px-3 py-1.5 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  {targetGMV > 0 && <span className="text-xs text-muted">= {formatRupiah(targetGMV)}</span>}
                </div>
                {targetGMV > 0 && (
                  <div className="space-y-3">
                    {allMonths.map((m, i) => {
                      const pct = (m.summary.gmv / targetGMV) * 100;
                      const color = pct < 70 ? "bg-red-500" : pct < 90 ? "bg-yellow-500" : "bg-green-500";
                      const daysInMonth = m.daily.length;
                      const avgDaily = daysInMonth > 0 ? m.summary.gmv / daysInMonth : 0;
                      const projected = avgDaily * 30;
                      return (
                        <div key={i}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium">{m.period.month}</span>
                            <span className="text-muted">{formatRupiahShort(m.summary.gmv)} / {formatRupiahShort(targetGMV)} ({fmtDec(pct, 1)}%)</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-3">
                            <div className={`h-3 rounded-full ${color} transition-all`} style={{ width: `${Math.min(100, pct)}%` }} />
                          </div>
                          {daysInMonth < 30 && <p className="text-[10px] text-muted mt-0.5">Proyeksi 30 hari: {formatRupiahShort(projected)}</p>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 4F: Revenue Forecast */}
              {forecast && (
                <div className="bg-white rounded-xl p-5 shadow-sm border border-border mb-6">
                  <h3 className="font-semibold mb-2 text-sm">🔮 Revenue Forecast</h3>
                  <div className="bg-blue-50 rounded-lg p-3 mb-4 text-sm text-blue-700">
                    Estimasi <strong>{forecast.nextMonthLabel}</strong>: <strong>{formatRupiah(forecast.nextMonthEstimate)}</strong> (±{formatRupiahShort(forecast.confidence)})
                  </div>
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="index" type="number" domain={[0, forecast.trendLine.length - 1]}
                        tick={{ fontSize: 10 }}
                        tickFormatter={(v: number) => forecast.dataPoints[v]?.month || forecast.nextMonthLabel}
                      />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => fmtDec(v / 1_000_000, 0) + " Jt"} />
                      <Tooltip formatter={(v: any) => [formatRupiah(Number(v)), ""]} labelFormatter={(v: any) => forecast.dataPoints[Number(v)]?.month || forecast.nextMonthLabel} />
                      <Line data={forecast.dataPoints} dataKey="gmv" name="Actual" stroke="#1A237E" strokeWidth={2.5} dot={{ r: 4, fill: "#1A237E" }} />
                      <Line data={forecast.trendLine} dataKey="value" name="Tren" stroke="#94A3B8" strokeWidth={1.5} strokeDasharray="6 4" dot={false} />
                      <Line data={[{ index: forecast.dataPoints.length, value: forecast.nextMonthEstimate }]} dataKey="value" name="Estimasi" stroke="#E65100" strokeWidth={0} dot={{ r: 6, fill: "#E65100", stroke: "#fff", strokeWidth: 2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
