"use client";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import * as XLSX from "xlsx";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ScatterChart, Scatter, ZAxis, LineChart, Line,
} from "recharts";
import {
  Video, Upload, ChevronDown, ChevronUp, Search, Copy, Check, Rocket,
  TrendingUp, Eye, ShoppingCart, Target, BarChart3, Clock, Users,
  DollarSign, Package, ArrowRight, Trash2,
} from "lucide-react";
import type { VideoPerformanceData, VideoPerformanceItem } from "@/lib/types";
import { parseVideoPerformance, formatRupiah, formatNum, fmtDec } from "@/utils/gmvAnalyzer";
import { useStoreManager } from "@/store/useStoreManager";
import { useRawFileStore } from "@/store/useRawFileStore";

const STATUS_COLORS: Record<string, string> = {
  "🏆 TOP PERFORMER": "#1B5E20",
  "✅ POTENSIAL": "#4CAF50",
  "⚠️ PERLU PERBAIKAN": "#FFC107",
  "🔴 UNDERPERFORM": "#F44336",
  "⬜ NO SALES": "#9E9E9E",
};

// ══════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════
export default function VideoPerformanceScreen() {
  const { getActiveStore, saveVideoData, deleteVideoData, stores, activeStoreId } = useStoreManager();
  const activeStore = getActiveStore();
  const setRawFile = useRawFileStore((s) => s.setFile);

  const [allMonths, setAllMonths] = useState<VideoPerformanceData[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [activeTab, setActiveTab] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  // Sync from store manager when active store changes
  useEffect(() => {
    if (activeStore) {
      setAllMonths(activeStore.videoData);
      setSelectedIdx(Math.max(0, activeStore.videoData.length - 1));
    } else {
      setAllMonths([]);
      setSelectedIdx(0);
    }
  }, [activeStoreId, stores]);

  const handleUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeStore) return;
    setRawFile(activeStore.id, 'video', file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const wb = XLSX.read(ev.target?.result, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
      const parsed = parseVideoPerformance(raw);
      const dupIdx = activeStore.videoData.findIndex((m) => m.periodRaw === parsed.periodRaw);
      if (dupIdx >= 0) {
        if (!confirm(`Data periode "${parsed.periodRaw}" sudah ada. Ganti dengan data baru?`)) return;
      }
      saveVideoData(activeStore.id, parsed);
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  }, [activeStore, saveVideoData]);

  const handleDeleteMonth = useCallback((idx: number) => {
    if (!activeStore) return;
    const m = allMonths[idx];
    if (!confirm(`Hapus data periode "${m.period || m.periodRaw}"?`)) return;
    deleteVideoData(activeStore.id, m.periodRaw);
    setSelectedIdx((prev) => Math.min(prev, Math.max(allMonths.length - 2, 0)));
  }, [allMonths, activeStore, deleteVideoData]);

  const handleDeleteAll = useCallback(() => {
    if (!activeStore) return;
    if (!confirm("Hapus SEMUA data video performance? Tindakan ini tidak bisa dibatalkan.")) return;
    activeStore.videoData.forEach((d) => deleteVideoData(activeStore.id, d.periodRaw));
    setSelectedIdx(0);
  }, [activeStore, deleteVideoData]);

  const data = allMonths[selectedIdx] || null;
  const tabs = useMemo(() => {
    const base = ["Dashboard", "Video Leaderboard", "Creator Comparison", "Kandidat Boost"];
    if (allMonths.length >= 2) base.push("📈 Tren Bulanan");
    return base;
  }, [allMonths.length]);

  // ── EMPTY STATE ──
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-24 h-24 rounded-full bg-blue-50 flex items-center justify-center mb-6">
          <Video size={48} className="text-blue-500" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Upload Video Performance Report</h2>
        <p className="text-gray-500 mb-6 max-w-md">
          Export dari TikTok Seller Center → Kreator → Performa Video → Export Data
        </p>
        <label className="cursor-pointer bg-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2">
          <Upload size={20} /> Upload File Excel
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleUpload} />
        </label>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Video size={24} className="text-blue-600" /> Video Performance</h1>
          <p className="text-sm text-gray-500">Periode: {data.period || data.periodRaw} · {data.summary.totalVideos} video · {data.summary.totalCreators} kreator</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2">
            <Upload size={16} /> Upload Baru
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleUpload} />
          </label>
          <button onClick={handleDeleteAll} className="px-4 py-2 rounded-lg text-sm font-semibold border border-red-200 text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2" title="Hapus semua data">
            <Trash2 size={16} /> Hapus Semua
          </button>
        </div>
      </div>

      {/* MONTH CHIPS */}
      {allMonths.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {allMonths.map((m, i) => (
            <div key={m.periodRaw} className="flex items-center gap-1">
              <button onClick={() => setSelectedIdx(i)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${i === selectedIdx ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                {m.period || m.periodRaw}
              </button>
              <button onClick={(e) => { e.stopPropagation(); handleDeleteMonth(i); }}
                className="p-1 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors" title={`Hapus ${m.period || m.periodRaw}`}>
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* TABS */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto">
        {tabs.map((t, i) => (
          <button key={t} onClick={() => setActiveTab(i)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${i === activeTab ? "bg-white shadow text-blue-700" : "text-gray-500 hover:text-gray-700"}`}>
            {t}
          </button>
        ))}
      </div>

      {/* TAB CONTENT */}
      {activeTab === 0 && <DashboardTab data={data} />}
      {activeTab === 1 && <LeaderboardTab videos={data.videos} />}
      {activeTab === 2 && <CreatorTab videos={data.videos} />}
      {activeTab === 3 && <BoostTab videos={data.videos} />}
      {activeTab === 4 && allMonths.length >= 2 && <TrenTab allMonths={allMonths} />}
    </div>
  );
}

// ══════════════════════════════════════
// TAB 1: DASHBOARD
// ══════════════════════════════════════
function DashboardTab({ data }: { data: VideoPerformanceData }) {
  const s = data.summary;
  const kpis = [
    { icon: <Video size={18} />, label: "Total Video", value: formatNum(s.totalVideos), color: "bg-blue-50 text-blue-600" },
    { icon: <Eye size={18} />, label: "Total Views", value: formatNum(s.totalVV), color: "bg-purple-50 text-purple-600" },
    { icon: <DollarSign size={18} />, label: "Total GMV Video", value: formatRupiah(s.totalGMV), color: "bg-green-50 text-green-600" },
    { icon: <ShoppingCart size={18} />, label: "Total Pesanan", value: formatNum(s.totalOrders), color: "bg-orange-50 text-orange-600" },
    { icon: <Target size={18} />, label: "Avg GPM (Rp)", value: formatRupiah(Math.round(s.avgGPM)), color: "bg-emerald-50 text-emerald-600" },
    { icon: <BarChart3 size={18} />, label: "Avg CTR (%)", value: fmtDec(s.avgCTR, 2) + "%", color: "bg-cyan-50 text-cyan-600" },
    { icon: <Package size={18} />, label: "Avg CTOR (%)", value: fmtDec(s.avgCTOR, 2) + "%", color: "bg-indigo-50 text-indigo-600" },
    { icon: <Clock size={18} />, label: "Avg Watch Rate (%)", value: fmtDec(s.avgWatchRate, 2) + "%", color: "bg-pink-50 text-pink-600" },
  ];

  const statusDist = useMemo(() => {
    const counts: Record<string, number> = {};
    data.videos.forEach((v) => { counts[v.videoStatus] = (counts[v.videoStatus] || 0) + 1; });
    return Object.entries(STATUS_COLORS).map(([name, color]) => ({
      name, value: counts[name] || 0, color,
    }));
  }, [data.videos]);

  const funnelData = useMemo(() => {
    const steps = [
      { name: "Total VV", value: s.totalVV },
      { name: "Produk Dilihat", value: s.totalProductViews },
      { name: "Klik Produk", value: s.totalProductClicks },
      { name: "Pesanan Video", value: s.totalOrders },
    ];
    return steps.map((st, i) => ({
      ...st,
      pctPrev: i === 0 ? 100 : steps[i - 1].value > 0 ? (st.value / steps[i - 1].value * 100) : 0,
      fill: ["#0D47A1", "#1565C0", "#42A5F5", "#90CAF9"][i],
    }));
  }, [s]);

  const scatterData = useMemo(() =>
    data.videos.filter((v) => v.gmv > 0).map((v) => ({
      x: v.watchRate, y: v.gmv / 1000, z: Math.max(v.vv / 500, 5),
      fill: STATUS_COLORS[v.videoStatus] || "#999",
      caption: v.videoInfo.substring(0, 50),
      vv: v.vv, gpm: v.gpm, ctr: v.ctr, ctor: v.ctor, gmv: v.gmv,
    }))
  , [data.videos]);

  const benchmarks = useMemo(() => {
    const vWithSales = data.videos.filter((v) => v.gmv > 0).length;
    const pctSales = data.videos.length > 0 ? (vWithSales / data.videos.length * 100) : 0;
    const boostCount = data.videos.filter((v) => v.boostCandidate).length;
    const pctBoost = data.videos.length > 0 ? (boostCount / data.videos.length * 100) : 0;
    return [
      { metrik: "Avg GPM", yours: formatRupiah(Math.round(s.avgGPM)), target: "> Rp 100.000", ok: s.avgGPM >= 100000 },
      { metrik: "Avg CTR", yours: fmtDec(s.avgCTR, 2) + "%", target: "> 3%", ok: s.avgCTR >= 3 },
      { metrik: "Avg CTOR", yours: fmtDec(s.avgCTOR, 2) + "%", target: "> 3%", ok: s.avgCTOR >= 3 },
      { metrik: "Avg Watch Rate", yours: fmtDec(s.avgWatchRate, 2) + "%", target: "> 10%", ok: s.avgWatchRate >= 10 },
      { metrik: "% Video ada penjualan", yours: fmtDec(pctSales, 1) + "%", target: "> 30%", ok: pctSales >= 30 },
      { metrik: "% Kandidat Boost", yours: fmtDec(pctBoost, 1) + "%", target: "> 20%", ok: pctBoost >= 20 },
    ];
  }, [data.videos, s]);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="bg-white rounded-xl border p-4">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${k.color}`}>{k.icon}</div>
            <p className="text-xs text-gray-500">{k.label}</p>
            <p className="text-lg font-bold">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Status Distribution */}
      <div className="bg-white rounded-xl border p-6">
        <h3 className="font-semibold mb-4">Video Status Distribution</h3>
        <div className="flex flex-col lg:flex-row gap-6 items-center">
          <div className="w-64 h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={statusDist.filter((d) => d.value > 0)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100}
                  label={({ name, percent }: any) => `${(percent * 100).toFixed(0)}%`} labelLine>
                  {statusDist.filter((d) => d.value > 0).map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {statusDist.map((d) => (
              <div key={d.name} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                <div>
                  <p className="text-sm font-medium">{d.name}</p>
                  <p className="text-lg font-bold">{d.value} video</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Video Funnel */}
      <div className="bg-white rounded-xl border p-6">
        <h3 className="font-semibold mb-4">Video Funnel</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={funnelData} layout="vertical" margin={{ left: 20, right: 40 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" tickFormatter={(v) => formatNum(v)} />
            <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v: any) => formatNum(Number(v))} />
            <Bar dataKey="value" radius={[0, 6, 6, 0]}>
              {funnelData.map((d, i) => <Cell key={i} fill={d.fill} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex flex-wrap gap-4 mt-3 justify-center text-xs">
          {funnelData.map((d, i) => (
            <span key={d.name} className="flex items-center gap-1">
              <span className="font-semibold">{d.name}:</span> {formatNum(d.value)}
              {i > 0 && <span className="text-gray-400">({fmtDec(d.pctPrev, 1)}%)</span>}
              {i < funnelData.length - 1 && <ArrowRight size={12} className="text-gray-300 ml-1" />}
            </span>
          ))}
        </div>
      </div>

      {/* Scatter: Watch Rate vs GMV */}
      {scatterData.length > 0 && (
        <div className="bg-white rounded-xl border p-6">
          <h3 className="font-semibold mb-4">Watch Rate vs GMV</h3>
          <ResponsiveContainer width="100%" height={350}>
            <ScatterChart margin={{ left: 10, right: 20, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" dataKey="x" name="Watch Rate" unit="%" tick={{ fontSize: 11 }} />
              <YAxis type="number" dataKey="y" name="GMV" unit="K" tick={{ fontSize: 11 }} tickFormatter={(v) => `${formatNum(v)}K`} />
              <ZAxis type="number" dataKey="z" range={[30, 400]} />
              <Tooltip content={({ payload }: any) => {
                if (!payload?.[0]) return null;
                const d = payload[0].payload;
                return (
                  <div className="bg-white shadow-lg border rounded-lg p-3 text-xs max-w-xs">
                    <p className="font-semibold mb-1">{d.caption}...</p>
                    <p>VV: {formatNum(d.vv)} · GMV: {formatRupiah(d.gmv)}</p>
                    <p>GPM: {formatRupiah(d.gpm)} · CTR: {fmtDec(d.ctr, 2)}%</p>
                    <p>CTOR: {fmtDec(d.ctor, 2)}% · Watch: {fmtDec(d.x, 2)}%</p>
                  </div>
                );
              }} />
              <Scatter data={scatterData}>
                {scatterData.map((d, i) => <Cell key={i} fill={d.fill} fillOpacity={0.7} />)}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Benchmark Table */}
      <div className="bg-white rounded-xl border p-6">
        <h3 className="font-semibold mb-4">Benchmark Performa Video</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-gray-50">
              <th className="text-left p-3">Metrik</th><th className="text-left p-3">Data Kamu</th><th className="text-left p-3">Target</th><th className="text-center p-3">Status</th>
            </tr></thead>
            <tbody>
              {benchmarks.map((b) => (
                <tr key={b.metrik} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium">{b.metrik}</td>
                  <td className="p-3">{b.yours}</td>
                  <td className="p-3 text-gray-500">{b.target}</td>
                  <td className="p-3 text-center text-lg">{b.ok ? "✅" : "🔴"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════
// TAB 2: VIDEO LEADERBOARD
// ══════════════════════════════════════
function LeaderboardTab({ videos }: { videos: VideoPerformanceItem[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [creatorFilter, setCreatorFilter] = useState("");
  const [boostFilter, setBoostFilter] = useState("");
  const [diagnosisFilter, setDiagnosisFilter] = useState("");
  const [sortBy, setSortBy] = useState<string>("score");
  const [minVV, setMinVV] = useState("");
  const [hasSales, setHasSales] = useState("");
  const [page, setPage] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const PER_PAGE = 15;

  const creators = useMemo(() => [...new Set(videos.map((v) => v.creatorName))].sort(), [videos]);
  const statuses = useMemo(() => [...new Set(videos.map((v) => v.videoStatus))], [videos]);
  const diagnoses = useMemo(() => [...new Set(videos.map((v) => v.diagnosis).filter(Boolean))].sort(), [videos]);

  const sortOptions = [
    { value: "score", label: "Score (Tertinggi)" },
    { value: "gmv", label: "GMV (Tertinggi)" },
    { value: "gpm", label: "GPM (Tertinggi)" },
    { value: "vv", label: "Views (Tertinggi)" },
    { value: "ctr", label: "CTR (Tertinggi)" },
    { value: "ctor", label: "CTOR (Tertinggi)" },
    { value: "watchRate", label: "Watch Rate (Tertinggi)" },
    { value: "orders", label: "Pesanan (Tertinggi)" },
    { value: "newest", label: "Terbaru" },
  ];

  const filtered = useMemo(() => {
    let list = [...videos];
    if (search) list = list.filter((v) => v.videoInfo.toLowerCase().includes(search.toLowerCase()));
    if (statusFilter) list = list.filter((v) => v.videoStatus === statusFilter);
    if (creatorFilter) list = list.filter((v) => v.creatorName === creatorFilter);
    if (boostFilter === "yes") list = list.filter((v) => v.boostCandidate);
    if (boostFilter === "no") list = list.filter((v) => !v.boostCandidate);
    if (diagnosisFilter) list = list.filter((v) => v.diagnosis === diagnosisFilter);
    if (minVV) { const n = Number(minVV); if (n > 0) list = list.filter((v) => v.vv >= n); }
    if (hasSales === "yes") list = list.filter((v) => v.gmv > 0);
    if (hasSales === "no") list = list.filter((v) => v.gmv === 0);

    switch (sortBy) {
      case "gmv": list.sort((a, b) => b.gmv - a.gmv); break;
      case "gpm": list.sort((a, b) => b.gpm - a.gpm); break;
      case "vv": list.sort((a, b) => b.vv - a.vv); break;
      case "ctr": list.sort((a, b) => b.ctr - a.ctr); break;
      case "ctor": list.sort((a, b) => b.ctor - a.ctor); break;
      case "watchRate": list.sort((a, b) => b.watchRate - a.watchRate); break;
      case "orders": list.sort((a, b) => b.videoOrders - a.videoOrders); break;
      case "newest": list.sort((a, b) => b.postedAt.localeCompare(a.postedAt)); break;
      default: list.sort((a, b) => b.videoScore - a.videoScore);
    }
    return list;
  }, [videos, search, statusFilter, creatorFilter, boostFilter, diagnosisFilter, minVV, hasSales, sortBy]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const pageData = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE);

  const activeFilterCount = [statusFilter, creatorFilter, boostFilter, diagnosisFilter, minVV, hasSales].filter(Boolean).length;

  useEffect(() => { setPage(0); }, [search, statusFilter, creatorFilter, boostFilter, diagnosisFilter, minVV, hasSales, sortBy]);

  const resetFilters = () => {
    setSearch(""); setStatusFilter(""); setCreatorFilter(""); setBoostFilter("");
    setDiagnosisFilter(""); setSortBy("score"); setMinVV(""); setHasSales("");
  };

  const rowBg = (v: VideoPerformanceItem) => {
    if (v.videoStatus === "🏆 TOP PERFORMER") return "bg-amber-50";
    if (v.videoStatus === "🔴 UNDERPERFORM") return "bg-red-50";
    return "";
  };

  return (
    <div className="space-y-4">
      {/* Row 1: Search + Sort */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari caption..." className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm" />
        </div>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="border rounded-lg px-3 py-2 text-sm bg-white">
          {sortOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <button onClick={() => setShowAdvanced(!showAdvanced)}
          className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors flex items-center gap-1 ${showAdvanced ? "bg-blue-50 border-blue-300 text-blue-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
          <Target size={14} /> Filter {activeFilterCount > 0 && <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">{activeFilterCount}</span>}
        </button>
        {activeFilterCount > 0 && (
          <button onClick={resetFilters} className="px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 border border-red-200 transition-colors">Reset</button>
        )}
      </div>

      {/* Row 2: Filter dropdowns (expandable) */}
      {showAdvanced && (
        <div className="bg-gray-50 rounded-xl p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase mb-1 block">Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-xs bg-white">
              <option value="">Semua</option>
              {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase mb-1 block">Kreator</label>
            <select value={creatorFilter} onChange={(e) => setCreatorFilter(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-xs bg-white">
              <option value="">Semua</option>
              {creators.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase mb-1 block">Kandidat Boost</label>
            <select value={boostFilter} onChange={(e) => setBoostFilter(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-xs bg-white">
              <option value="">Semua</option>
              <option value="yes">🚀 Layak Boost</option>
              <option value="no">Tidak Layak</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase mb-1 block">Ada Penjualan</label>
            <select value={hasSales} onChange={(e) => setHasSales(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-xs bg-white">
              <option value="">Semua</option>
              <option value="yes">✅ Ada GMV</option>
              <option value="no">⬜ Tanpa GMV</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase mb-1 block">Min. Views</label>
            <input type="number" value={minVV} onChange={(e) => setMinVV(e.target.value)} placeholder="cth: 1000" className="w-full border rounded-lg px-2 py-1.5 text-xs" />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase mb-1 block">Diagnosis</label>
            <select value={diagnosisFilter} onChange={(e) => setDiagnosisFilter(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-xs bg-white">
              <option value="">Semua</option>
              {diagnoses.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-500">{filtered.length} video ditemukan {activeFilterCount > 0 ? `(${activeFilterCount} filter aktif)` : ""}</p>

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-x-auto">
        <table className="w-full text-xs">
          <thead><tr className="border-b bg-gray-50 text-left">
            <th className="p-2 w-8">No</th><th className="p-2 min-w-[180px]">Caption</th><th className="p-2">Kreator</th><th className="p-2">Tanggal</th>
            <th className="p-2 text-right">VV</th><th className="p-2 text-right">GPM</th><th className="p-2 text-right">GMV</th>
            <th className="p-2 text-right">Pesanan</th><th className="p-2 text-right">CTR%</th><th className="p-2 text-right">CTOR%</th>
            <th className="p-2 text-right">Watch%</th><th className="p-2 text-right">Score</th><th className="p-2">Status</th>
          </tr></thead>
          <tbody>
            {pageData.map((v, i) => (
              <RowGroup key={v.videoId + i} v={v} idx={page * PER_PAGE + i + 1} rowBg={rowBg(v)}
                expanded={expandedId === v.videoId} onToggle={() => setExpandedId(expandedId === v.videoId ? null : v.videoId)} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="px-3 py-1 rounded border text-sm disabled:opacity-40">Prev</button>
          <span className="px-3 py-1 text-sm">{page + 1} / {totalPages}</span>
          <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1} className="px-3 py-1 rounded border text-sm disabled:opacity-40">Next</button>
        </div>
      )}
    </div>
  );
}

function RowGroup({ v, idx, rowBg, expanded, onToggle }: {
  v: VideoPerformanceItem; idx: number; rowBg: string; expanded: boolean; onToggle: () => void;
}) {
  return (
    <>
      <tr className={`border-b hover:bg-gray-50 cursor-pointer ${rowBg}`} onClick={onToggle}>
        <td className="p-2">{idx}</td>
        <td className="p-2" title={v.videoInfo}>{v.videoInfo.substring(0, 50)}{v.videoInfo.length > 50 ? "..." : ""}</td>
        <td className="p-2 whitespace-nowrap">{v.creatorName}</td>
        <td className="p-2 whitespace-nowrap">{v.postedAt.split(" ")[0]}</td>
        <td className="p-2 text-right">{formatNum(v.vv)}</td>
        <td className="p-2 text-right">{formatRupiah(v.gpm)}</td>
        <td className="p-2 text-right">{formatRupiah(v.gmv)}</td>
        <td className="p-2 text-right">{v.videoOrders}</td>
        <td className="p-2 text-right">{fmtDec(v.ctr, 2)}</td>
        <td className="p-2 text-right">{fmtDec(v.ctor, 2)}</td>
        <td className="p-2 text-right">{fmtDec(v.watchRate, 2)}</td>
        <td className="p-2 text-right font-bold">{v.videoScore}</td>
        <td className="p-2 whitespace-nowrap">{v.videoStatus}</td>
      </tr>
      {expanded && (
        <tr className="bg-blue-50/50">
          <td colSpan={13} className="p-4">
            <div className="space-y-3">
              <p className="text-sm"><strong>Caption:</strong> {v.videoInfo}</p>
              {v.products.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  <strong className="text-sm mr-1">Produk:</strong>
                  {v.products.map((p, i) => <span key={i} className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs">{p}</span>)}
                </div>
              )}
              {v.boostCandidate && <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold"><Rocket size={12} /> KANDIDAT BOOST</span>}
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 text-xs">
                {[
                  ["VV", formatNum(v.vv)], ["Likes", formatNum(v.likes)], ["Komentar", formatNum(v.comments)],
                  ["Dibagikan", formatNum(v.shares)], ["Pengikut Baru", formatNum(v.newFollowers)],
                  ["Klik ke LIVE", formatNum(v.clickToLive)], ["Produk Dilihat", formatNum(v.productViews)],
                  ["Klik Produk", formatNum(v.productClicks)], ["Pembeli Unik", formatNum(v.uniqueBuyers)],
                  ["Pesanan", formatNum(v.videoOrders)], ["Produk Terjual", formatNum(v.productsSold)],
                  ["Gross Revenue", formatRupiah(v.grossRevenue)], ["GPM", formatRupiah(v.gpm)],
                  ["GMV", formatRupiah(v.gmv)], ["CTR", fmtDec(v.ctr, 2) + "%"],
                  ["Live Rate", fmtDec(v.liveRate, 2) + "%"], ["Watch Rate", fmtDec(v.watchRate, 2) + "%"],
                  ["CTOR", fmtDec(v.ctor, 2) + "%"], ["Diagnosis", v.diagnosis],
                  ["Score", String(v.videoScore)],
                ].map(([l, val]) => (
                  <div key={l} className="bg-white rounded-lg p-2 border">
                    <p className="text-gray-500">{l}</p>
                    <p className="font-semibold">{val}</p>
                  </div>
                ))}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ══════════════════════════════════════
// TAB 3: CREATOR COMPARISON
// ══════════════════════════════════════
function CreatorTab({ videos }: { videos: VideoPerformanceItem[] }) {
  const creators = useMemo(() => {
    const map = new Map<string, VideoPerformanceItem[]>();
    videos.forEach((v) => {
      if (!map.has(v.creatorName)) map.set(v.creatorName, []);
      map.get(v.creatorName)!.push(v);
    });
    return Array.from(map.entries()).map(([name, vids]) => {
      const withSales = vids.filter((v) => v.gmv > 0);
      return {
        name,
        videos: vids.length,
        totalVV: vids.reduce((a, v) => a + v.vv, 0),
        totalGMV: vids.reduce((a, v) => a + v.gmv, 0),
        totalOrders: vids.reduce((a, v) => a + v.videoOrders, 0),
        avgGPM: withSales.length ? withSales.reduce((a, v) => a + v.gpm, 0) / withSales.length : 0,
        avgCTR: vids.reduce((a, v) => a + v.ctr, 0) / vids.length,
        avgCTOR: vids.reduce((a, v) => a + v.ctor, 0) / vids.length,
        avgWatch: vids.reduce((a, v) => a + v.watchRate, 0) / vids.length,
        topCount: vids.filter((v) => v.videoStatus === "🏆 TOP PERFORMER").length,
      };
    }).sort((a, b) => b.totalGMV - a.totalGMV);
  }, [videos]);

  const globalAvg = useMemo(() => {
    const withSales = videos.filter((v) => v.gmv > 0);
    return {
      gpm: withSales.length ? withSales.reduce((a, v) => a + v.gpm, 0) / withSales.length : 0,
      ctr: videos.reduce((a, v) => a + v.ctr, 0) / videos.length,
      ctor: videos.reduce((a, v) => a + v.ctor, 0) / videos.length,
      watch: videos.reduce((a, v) => a + v.watchRate, 0) / videos.length,
    };
  }, [videos]);

  const totalGMV = creators.reduce((a, c) => a + c.totalGMV, 0);

  const gmvChartData = creators.map((c) => ({ name: c.name, value: c.totalGMV }));
  const gpmChartData = creators.map((c) => ({ name: c.name, value: Math.round(c.avgGPM) }));

  return (
    <div className="space-y-6">
      {/* Table */}
      <div className="bg-white rounded-xl border overflow-x-auto">
        <table className="w-full text-xs">
          <thead><tr className="border-b bg-gray-50 text-left">
            <th className="p-2">Kreator</th><th className="p-2 text-right">Video</th><th className="p-2 text-right">Total VV</th>
            <th className="p-2 text-right">Total GMV</th><th className="p-2 text-right">Pesanan</th>
            <th className="p-2 text-right">Avg GPM</th><th className="p-2 text-right">Avg CTR</th>
            <th className="p-2 text-right">Avg CTOR</th><th className="p-2 text-right">Avg Watch</th>
            <th className="p-2 text-right">🏆</th>
          </tr></thead>
          <tbody>
            {creators.map((c) => (
              <tr key={c.name} className="border-b hover:bg-gray-50">
                <td className="p-2 font-medium">{c.name}</td>
                <td className="p-2 text-right">{c.videos}</td>
                <td className="p-2 text-right">{formatNum(c.totalVV)}</td>
                <td className="p-2 text-right">{formatRupiah(c.totalGMV)}</td>
                <td className="p-2 text-right">{c.totalOrders}</td>
                <td className="p-2 text-right">{formatRupiah(Math.round(c.avgGPM))}</td>
                <td className="p-2 text-right">{fmtDec(c.avgCTR, 2)}%</td>
                <td className="p-2 text-right">{fmtDec(c.avgCTOR, 2)}%</td>
                <td className="p-2 text-right">{fmtDec(c.avgWatch, 2)}%</td>
                <td className="p-2 text-right">{c.topCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border p-6">
          <h3 className="font-semibold mb-4 text-sm">Total GMV per Kreator</h3>
          <ResponsiveContainer width="100%" height={Math.max(200, creators.length * 40)}>
            <BarChart data={gmvChartData} layout="vertical" margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={(v) => `${(v / 1000000).toFixed(1)}Jt`} tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: any) => formatRupiah(Number(v))} />
              <Bar dataKey="value" fill="#1A237E" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-xl border p-6">
          <h3 className="font-semibold mb-4 text-sm">Avg GPM per Kreator</h3>
          <ResponsiveContainer width="100%" height={Math.max(200, creators.length * 40)}>
            <BarChart data={gpmChartData} layout="vertical" margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={(v) => formatRupiah(v)} tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: any) => formatRupiah(Number(v))} />
              <Bar dataKey="value" fill="#2E7D32" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Creator Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {creators.map((c) => {
          const share = totalGMV > 0 ? (c.totalGMV / totalGMV * 100) : 0;
          const strengths: string[] = [];
          const weaknesses: string[] = [];
          if (c.avgGPM > globalAvg.gpm) strengths.push("GPM"); else weaknesses.push("GPM");
          if (c.avgCTR > globalAvg.ctr) strengths.push("CTR"); else weaknesses.push("CTR");
          if (c.avgCTOR > globalAvg.ctor) strengths.push("CTOR"); else weaknesses.push("CTOR");
          if (c.avgWatch > globalAvg.watch) strengths.push("Watch Rate"); else weaknesses.push("Watch Rate");
          return (
            <div key={c.name} className="bg-white rounded-xl border p-5">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-bold text-sm flex items-center gap-2"><Users size={14} /> {c.name}</h4>
                  <p className="text-xs text-gray-500">{c.videos} video · {c.totalOrders} pesanan</p>
                </div>
                <span className="text-xs font-bold text-blue-600">{fmtDec(share, 1)}% GMV</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${Math.min(share, 100)}%` }} />
              </div>
              <div className="flex gap-2 flex-wrap">
                {strengths.map((s) => <span key={s} className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-medium">💪 {s}</span>)}
                {weaknesses.map((w) => <span key={w} className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-medium">⚠️ {w}</span>)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ══════════════════════════════════════
// TAB 4: KANDIDAT BOOST
// ══════════════════════════════════════
function BoostTab({ videos }: { videos: VideoPerformanceItem[] }) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const candidates = useMemo(() =>
    videos.filter((v) => v.boostCandidate).sort((a, b) => b.videoScore - a.videoScore)
  , [videos]);

  const copyInfo = (v: VideoPerformanceItem) => {
    const text = `Video: ${v.videoInfo} | VV: ${v.vv} | GMV: Rp ${v.gmv.toLocaleString("id-ID")} | GPM: Rp ${v.gpm.toLocaleString("id-ID")} | CTR: ${v.ctr}% | CTOR: ${v.ctor}%`;
    navigator.clipboard.writeText(text);
    setCopiedId(v.videoId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const reasons = (v: VideoPerformanceItem): string[] => {
    const r: string[] = [];
    if (v.gpm >= 200000) r.push("💰 GPM sangat tinggi — efisien untuk di-scale");
    if (v.ctr >= 3) r.push("🎯 CTR bagus — hook & thumbnail terbukti menarik");
    if (v.ctor >= 3) r.push("🛒 CTOR tinggi — konversi klik ke order kuat");
    if (v.vv >= 50000) r.push("📈 Views tinggi — potensi jangkauan besar");
    if (v.watchRate >= 10) r.push("⏱️ Watch rate baik — penonton engaged");
    return r;
  };

  if (candidates.length === 0) {
    return (
      <div className="bg-white rounded-xl border p-12 text-center">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4"><Rocket size={32} className="text-gray-400" /></div>
        <h3 className="text-lg font-bold mb-2">Belum Ada Kandidat Boost</h3>
        <p className="text-sm text-gray-500 max-w-md mx-auto">
          Belum ada video yang memenuhi kriteria boost (VV≥5.000, GMV&gt;0, GPM≥Rp50.000).
          Coba upload data bulan lain atau tingkatkan performa video organik terlebih dahulu.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600"><strong>{candidates.length}</strong> video layak di-boost</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {candidates.map((v) => (
          <div key={v.videoId} className="bg-white rounded-xl border p-5 relative">
            <span className="absolute top-3 right-3 bg-green-100 text-green-700 px-2 py-1 rounded-full text-[10px] font-bold flex items-center gap-1">
              <Rocket size={10} /> LAYAK DI-BOOST
            </span>
            <p className="text-sm font-semibold pr-28 mb-1" title={v.videoInfo}>{v.videoInfo.substring(0, 60)}{v.videoInfo.length > 60 ? "..." : ""}</p>
            <p className="text-xs text-gray-500 mb-3">{v.creatorName} · {v.postedAt.split(" ")[0]}</p>
            <div className="grid grid-cols-3 gap-2 text-xs mb-3">
              {[["VV", formatNum(v.vv)], ["GMV", formatRupiah(v.gmv)], ["GPM", formatRupiah(v.gpm)],
                ["CTR", fmtDec(v.ctr, 2) + "%"], ["CTOR", fmtDec(v.ctor, 2) + "%"], ["Watch", fmtDec(v.watchRate, 2) + "%"],
              ].map(([l, val]) => (
                <div key={l} className="bg-gray-50 rounded-lg p-2 text-center">
                  <p className="text-gray-500">{l}</p><p className="font-bold">{val}</p>
                </div>
              ))}
            </div>
            <div className="mb-3">
              <div className="flex justify-between text-xs mb-1"><span>Score</span><span className="font-bold">{v.videoScore}/100</span></div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${v.videoScore}%` }} />
              </div>
            </div>
            <ul className="text-xs space-y-1 mb-3">
              {reasons(v).map((r, i) => <li key={i}>{r}</li>)}
            </ul>
            <button onClick={() => copyInfo(v)} className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border text-xs font-medium hover:bg-gray-50 transition-colors">
              {copiedId === v.videoId ? <><Check size={12} className="text-green-600" /> Copied!</> : <><Copy size={12} /> Copy Info</>}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════
// TAB 5: TREN BULANAN
// ══════════════════════════════════════
function TrenTab({ allMonths }: { allMonths: VideoPerformanceData[] }) {
  const chartData = useMemo(() =>
    allMonths.map((m, i) => ({
      name: m.period || m.periodRaw,
      gmv: m.summary.totalGMV,
      gpm: Math.round(m.summary.avgGPM),
      ctr: parseFloat(m.summary.avgCTR.toFixed(2)),
      ctor: parseFloat(m.summary.avgCTOR.toFixed(2)),
      videos: m.summary.totalVideos,
      vv: m.summary.totalVV,
      orders: m.summary.totalOrders,
      growthGMV: i === 0 ? null : allMonths[i - 1].summary.totalGMV > 0
        ? ((m.summary.totalGMV - allMonths[i - 1].summary.totalGMV) / allMonths[i - 1].summary.totalGMV * 100)
        : null,
    }))
  , [allMonths]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GMV per bulan */}
        <div className="bg-white rounded-xl border p-6">
          <h3 className="font-semibold mb-4 text-sm">Total GMV per Bulan</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tickFormatter={(v) => `${(v / 1000000).toFixed(0)}Jt`} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: any) => formatRupiah(Number(v))} />
              <Line type="monotone" dataKey="gmv" stroke="#1A237E" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        {/* Avg GPM per bulan */}
        <div className="bg-white rounded-xl border p-6">
          <h3 className="font-semibold mb-4 text-sm">Avg GPM per Bulan</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tickFormatter={(v) => formatRupiah(v)} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: any) => formatRupiah(Number(v))} />
              <Line type="monotone" dataKey="gpm" stroke="#2E7D32" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* CTR & CTOR */}
      <div className="bg-white rounded-xl border p-6">
        <h3 className="font-semibold mb-4 text-sm">Avg CTR & CTOR per Bulan</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis unit="%" tick={{ fontSize: 10 }} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="ctr" name="CTR" stroke="#1565C0" strokeWidth={2} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="ctor" name="CTOR" stroke="#FF6F00" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Trend Table */}
      <div className="bg-white rounded-xl border p-6">
        <h3 className="font-semibold mb-4 text-sm">Ringkasan Tren Bulanan</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="border-b bg-gray-50 text-left">
              <th className="p-2">Bulan</th><th className="p-2 text-right">Video</th><th className="p-2 text-right">Total VV</th>
              <th className="p-2 text-right">Total GMV</th><th className="p-2 text-right">Avg GPM</th>
              <th className="p-2 text-right">Avg CTR</th><th className="p-2 text-right">Avg CTOR</th>
              <th className="p-2 text-right">Growth GMV</th>
            </tr></thead>
            <tbody>
              {chartData.map((d) => (
                <tr key={d.name} className="border-b hover:bg-gray-50">
                  <td className="p-2 font-medium">{d.name}</td>
                  <td className="p-2 text-right">{d.videos}</td>
                  <td className="p-2 text-right">{formatNum(d.vv)}</td>
                  <td className="p-2 text-right">{formatRupiah(d.gmv)}</td>
                  <td className="p-2 text-right">{formatRupiah(d.gpm)}</td>
                  <td className="p-2 text-right">{d.ctr}%</td>
                  <td className="p-2 text-right">{d.ctor}%</td>
                  <td className={`p-2 text-right font-medium ${d.growthGMV === null ? "" : d.growthGMV >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {d.growthGMV === null ? "-" : `${d.growthGMV >= 0 ? "+" : ""}${fmtDec(d.growthGMV, 1)}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
