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

const MONTH_NAMES_ID = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
function formatPeriodVP(code: string): string {
  if (!code || code === "all") return "Semua";
  const [y, m] = code.split("-");
  const mi = parseInt(m) - 1;
  return mi >= 0 && mi < 12 ? `${MONTH_NAMES_ID[mi]} ${y}` : code;
}

const colorMap: Record<string, { bg: string; border: string; text: string; ring: string }> = {
  blue: { bg: "bg-blue-50", border: "border-blue-100", text: "text-blue-700", ring: "bg-blue-100" },
  green: { bg: "bg-green-50", border: "border-green-100", text: "text-green-700", ring: "bg-green-100" },
  purple: { bg: "bg-purple-50", border: "border-purple-100", text: "text-purple-700", ring: "bg-purple-100" },
  orange: { bg: "bg-orange-50", border: "border-orange-100", text: "text-orange-700", ring: "bg-orange-100" },
  emerald: { bg: "bg-emerald-50", border: "border-emerald-100", text: "text-emerald-700", ring: "bg-emerald-100" },
  cyan: { bg: "bg-cyan-50", border: "border-cyan-100", text: "text-cyan-700", ring: "bg-cyan-100" },
  indigo: { bg: "bg-indigo-50", border: "border-indigo-100", text: "text-indigo-700", ring: "bg-indigo-100" },
  pink: { bg: "bg-pink-50", border: "border-pink-100", text: "text-pink-700", ring: "bg-pink-100" },
  red: { bg: "bg-red-50", border: "border-red-100", text: "text-red-700", ring: "bg-red-100" },
  rose: { bg: "bg-rose-50", border: "border-rose-100", text: "text-rose-700", ring: "bg-rose-100" },
  amber: { bg: "bg-amber-50", border: "border-amber-100", text: "text-amber-700", ring: "bg-amber-100" },
  gray: { bg: "bg-gray-50", border: "border-gray-100", text: "text-gray-700", ring: "bg-gray-100" },
};

// ══════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════
export default function VideoPerformanceScreen() {
  const { getActiveStore, saveVideoData, deleteVideoData, stores, activeStoreId } = useStoreManager();
  const activeStore = getActiveStore();
  const activeStores = stores;
  const setRawFile = useRawFileStore((s) => s.setFile);
  const fileRef = useRef<HTMLInputElement>(null);

  // ─── VIEW MODE ──────────────────────────────────────
  const [viewMode, setViewMode] = useState<"gabungan" | string>("gabungan");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("all");
  const [activeTab, setActiveTab] = useState(0);

  // ─── COLLECT ALL VIDEO DATA ─────────────────────────
  const allVideoData = useMemo(() => {
    const result: { storeId: string; storeName: string; data: VideoPerformanceData }[] = [];
    activeStores.forEach((store) => {
      (store.videoData || []).forEach((d) => {
        result.push({ storeId: store.id, storeName: store.name, data: d });
      });
    });
    return result;
  }, [stores, activeStoreId]);

  // ─── ALL PERIODS (unique months) ────────────────────
  const allPeriods = useMemo(() => {
    const set = new Set<string>();
    allVideoData.forEach(({ data }) => {
      const raw = data.periodRaw?.split("~")[0]?.trim()?.slice(0, 7) || "";
      if (raw) set.add(raw);
    });
    return [...set].sort();
  }, [allVideoData]);

  // ─── FILTERED VIDEOS ────────────────────────────────
  const filteredVideos = useMemo(() => {
    let items: (VideoPerformanceItem & { _storeId: string; _storeName: string; _period: string })[] = [];
    allVideoData.forEach(({ storeId, storeName, data }) => {
      if (viewMode !== "gabungan" && storeId !== viewMode) return;
      const rawPeriod = data.periodRaw?.split("~")[0]?.trim()?.slice(0, 7) || "";
      if (selectedPeriod !== "all" && rawPeriod !== selectedPeriod) return;
      data.videos.forEach((v) => {
        items.push({ ...v, _storeId: storeId, _storeName: storeName, _period: rawPeriod });
      });
    });
    return items;
  }, [allVideoData, viewMode, selectedPeriod]);

  // ─── UPLOAD ─────────────────────────────────────────
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

  // ─── DELETE ─────────────────────────────────────────
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteStore, setDeleteStore] = useState("");
  const [deletePeriodRaw, setDeletePeriodRaw] = useState("");

  const openDeleteDialog = useCallback(() => {
    setDeleteStore(activeStore?.id || "");
    setDeletePeriodRaw("");
    setShowDeleteConfirm(true);
  }, [activeStore]);

  const handleDelete = useCallback(() => {
    if (!deleteStore) return;
    const store = stores.find((s) => s.id === deleteStore);
    if (!store) return;
    if (deletePeriodRaw) {
      deleteVideoData(deleteStore, deletePeriodRaw);
    } else {
      store.videoData.forEach((d) => deleteVideoData(deleteStore, d.periodRaw));
    }
    setShowDeleteConfirm(false);
  }, [deleteStore, deletePeriodRaw, stores, deleteVideoData]);

  // ─── KPI ────────────────────────────────────────────
  const kpi = useMemo(() => {
    const vids = filteredVideos;
    const n = vids.length || 1;
    const withSales = vids.filter((v) => v.gmv > 0);
    const nSales = withSales.length || 1;
    return {
      totalGMV: vids.reduce((a, v) => a + v.gmv, 0),
      avgGPM: withSales.reduce((a, v) => a + v.gpm, 0) / nSales,
      totalVV: vids.reduce((a, v) => a + v.vv, 0),
      avgCTR: vids.reduce((a, v) => a + v.ctr, 0) / n,
      avgOrderPerClick: vids.reduce((a, v) => a + v.ctor, 0) / n,
      totalBuyers: vids.reduce((a, v) => a + v.uniqueBuyers, 0),
      totalProducts: vids.reduce((a, v) => a + v.productsSold, 0),
      totalOrders: vids.reduce((a, v) => a + v.videoOrders, 0),
      totalLikes: vids.reduce((a, v) => a + v.likes, 0),
      totalShares: vids.reduce((a, v) => a + v.shares, 0),
      totalNewFollowers: vids.reduce((a, v) => a + v.newFollowers, 0),
      avgWatchRate: vids.reduce((a, v) => a + v.watchRate, 0) / n,
      totalVideos: vids.length,
      totalCreators: new Set(vids.map((v) => v.creatorName)).size,
      pctWithSales: vids.length > 0 ? (withSales.length / vids.length) * 100 : 0,
    };
  }, [filteredVideos]);

  // ─── EMPTY STATE ────────────────────────────────────
  if (allVideoData.length === 0) {
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

  const tabs = ["📈 Overview", "📅 Evaluasi Mingguan", "🎬 Videos", "👤 Kreator"];

  return (
    <div className="space-y-6">
      {/* ═══ HEADER ═══ */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              🎥 Video Performance
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {kpi.totalVideos} video · {kpi.totalCreators} kreator
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium cursor-pointer transition">
              📤 Upload
              <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleUpload} />
            </label>
            <button onClick={openDeleteDialog} disabled={allVideoData.length === 0}
              className="flex items-center gap-1.5 bg-white hover:bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-xl text-sm font-medium transition disabled:opacity-40">
              🗑️ Hapus Data
            </button>
          </div>
        </div>

        {/* View Mode + Period */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
            <button onClick={() => setViewMode("gabungan")}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${viewMode === "gabungan" ? "bg-blue-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              🔀 Gabungan
            </button>
            {activeStores.map((store) => (
              <button key={store.id} onClick={() => setViewMode(store.id)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${viewMode === store.id ? "bg-blue-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                🏪 {store.name.replace("Fresh Vision Official", "FVO").replace("Freshvision Shop", "FVS")}
              </button>
            ))}
          </div>
          <div className="flex bg-gray-100 rounded-xl p-1 gap-1 flex-wrap">
            <button onClick={() => setSelectedPeriod("all")}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${selectedPeriod === "all" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              📊 Semua
            </button>
            {allPeriods.map((m) => (
              <button key={m} onClick={() => setSelectedPeriod(m)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${selectedPeriod === m ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                {formatPeriodVP(m)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ DELETE CONFIRMATION ═══ */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">⚠️</div>
              <h3 className="text-lg font-bold text-gray-900">Hapus Data Video</h3>
            </div>
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-500 mb-1">Toko</label>
              <select value={deleteStore} onChange={(e) => { setDeleteStore(e.target.value); setDeletePeriodRaw(""); }}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
                {activeStores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-500 mb-1">Periode</label>
              <select value={deletePeriodRaw} onChange={(e) => setDeletePeriodRaw(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
                <option value="">🗑️ Semua Periode</option>
                {(stores.find((s) => s.id === deleteStore)?.videoData || []).map((d) => (
                  <option key={d.periodRaw} value={d.periodRaw}>{d.period || d.periodRaw}</option>
                ))}
              </select>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-xl p-3 mb-4">
              <p className="text-xs text-red-600 font-medium text-center">
                {deletePeriodRaw ? `Data periode "${deletePeriodRaw}" akan dihapus permanen.` : "Semua data video toko ini akan dihapus permanen."}
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-medium transition">Batal</button>
              <button onClick={handleDelete} className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition">🗑️ Ya, Hapus</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ STORE CONTRIBUTION (Gabungan only) ═══ */}
      {viewMode === "gabungan" && activeStores.length > 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {activeStores.map((store, i) => {
            const storeVids = filteredVideos.filter((v) => v._storeId === store.id);
            const storeGMV = storeVids.reduce((a, v) => a + v.gmv, 0);
            const share = kpi.totalGMV > 0 ? (storeGMV / kpi.totalGMV) * 100 : 0;
            const COLORS = ["#2563eb", "#f97316"];
            return (
              <div key={store.id} className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🏪</span>
                    <div>
                      <div className="font-semibold text-sm text-gray-900">{store.name}</div>
                      <div className="text-xs text-gray-400">{storeVids.length} video</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold" style={{ color: COLORS[i] }}>{share.toFixed(1)}%</div>
                    <div className="text-xs text-gray-400">kontribusi GMV</div>
                  </div>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 mb-4">
                  <div className="h-2 rounded-full" style={{ width: `${share}%`, backgroundColor: COLORS[i] }} />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "GMV Video", value: formatRupiah(storeGMV) },
                    { label: "Pesanan", value: formatNum(storeVids.reduce((a, v) => a + v.videoOrders, 0)) },
                    { label: "Pembeli", value: formatNum(storeVids.reduce((a, v) => a + v.uniqueBuyers, 0)) },
                  ].map((item) => (
                    <div key={item.label} className="bg-gray-50 rounded-xl p-2.5 text-center">
                      <div className="text-xs text-gray-400 mb-0.5">{item.label}</div>
                      <div className="text-sm font-bold text-gray-800">{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ 12 KPI CARDS ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {[
          { icon: "💰", label: "GMV Video", color: "green", value: formatRupiah(kpi.totalGMV), sub: `${kpi.pctWithSales.toFixed(0)}% video ada penjualan` },
          { icon: "📊", label: "Avg GPM", color: "emerald", value: formatRupiah(Math.round(kpi.avgGPM)), sub: kpi.avgGPM >= 100000 ? "🟢 Di atas target" : "🔴 Di bawah 100rb" },
          { icon: "👁️", label: "Total Views", color: "purple", value: formatNum(kpi.totalVV), sub: `${kpi.totalVideos} video` },
          { icon: "🖱️", label: "Avg CTR", color: "cyan", value: fmtDec(kpi.avgCTR, 2) + "%", sub: kpi.avgCTR >= 3 ? "🟢 Bagus (≥3%)" : "🔴 Perlu perbaikan" },
          { icon: "🛒", label: "Avg CTOR", color: "indigo", value: fmtDec(kpi.avgOrderPerClick, 2) + "%", sub: kpi.avgOrderPerClick >= 3 ? "🟢 Konversi baik" : "🔴 Perlu optimasi" },
          { icon: "👥", label: "Pembeli", color: "blue", value: formatNum(kpi.totalBuyers), sub: `${formatNum(kpi.totalOrders)} pesanan` },
          { icon: "📦", label: "Produk Terjual", color: "orange", value: formatNum(kpi.totalProducts), sub: `AOV ${formatRupiah(kpi.totalBuyers > 0 ? Math.round(kpi.totalGMV / kpi.totalBuyers) : 0)}` },
          { icon: "🔄", label: "View→Order", color: "amber", value: kpi.totalVV > 0 ? fmtDec((kpi.totalOrders / kpi.totalVV) * 100, 3) + "%" : "0%", sub: "Rasio konversi total" },
          { icon: "❤️", label: "Total Likes", color: "rose", value: formatNum(kpi.totalLikes), sub: `💬 ${formatNum(filteredVideos.reduce((a, v) => a + v.comments, 0))} komentar` },
          { icon: "↗️", label: "Shares", color: "pink", value: formatNum(kpi.totalShares), sub: "Kali dibagikan" },
          { icon: "🌟", label: "Followers Baru", color: "green", value: `+${formatNum(kpi.totalNewFollowers)}`, sub: "Dari video" },
          { icon: "🏆", label: "Watch Rate", color: "amber", value: fmtDec(kpi.avgWatchRate, 2) + "%", sub: kpi.avgWatchRate >= 10 ? "🟢 Bagus (≥10%)" : "🔴 Rendah (<10%)" },
        ].map((card) => {
          const c = colorMap[card.color] || colorMap.gray;
          return (
            <div key={card.label} className={`${c.bg} border ${c.border} rounded-2xl p-4`}>
              <div className={`${c.ring} rounded-xl p-2.5 text-xl w-fit mb-3`}>{card.icon}</div>
              <div className={`text-lg font-bold ${c.text} mb-0.5 leading-tight`}>{card.value}</div>
              <div className="text-xs text-gray-500 font-medium mb-0.5">{card.label}</div>
              <div className="text-[11px] text-gray-400">{card.sub}</div>
            </div>
          );
        })}
      </div>

      {/* ═══ TABS ═══ */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto">
        {tabs.map((t, i) => (
          <button key={t} onClick={() => setActiveTab(i)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${i === activeTab ? "bg-white shadow text-blue-700" : "text-gray-500 hover:text-gray-700"}`}>
            {t}
          </button>
        ))}
      </div>

      {/* TAB CONTENT */}
      {activeTab === 0 && <OverviewTab videos={filteredVideos} allVideoData={allVideoData} viewMode={viewMode} selectedPeriod={selectedPeriod} />}
      {activeTab === 1 && <WeeklyTab videos={filteredVideos} />}
      {activeTab === 2 && <LeaderboardTab videos={filteredVideos} />}
      {activeTab === 3 && <CreatorTab videos={filteredVideos} />}
    </div>
  );
}

// ══════════════════════════════════════
// TAB 1: OVERVIEW
// ══════════════════════════════════════
type VidExtended = VideoPerformanceItem & { _storeId: string; _storeName: string; _period: string };

function OverviewTab({ videos, allVideoData, viewMode, selectedPeriod }: {
  videos: VidExtended[];
  allVideoData: { storeId: string; storeName: string; data: VideoPerformanceData }[];
  viewMode: string;
  selectedPeriod: string;
}) {
  // GMV by period for chart
  const gmvChartData = useMemo(() => {
    const map = new Map<string, number>();
    videos.forEach((v) => {
      const key = v._period || "unknown";
      map.set(key, (map.get(key) || 0) + v.gmv);
    });
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([p, gmv]) => ({
      name: formatPeriodVP(p), gmv,
    }));
  }, [videos]);

  // GPM / CTR / CTOR / Watch Rate metrics
  const metrics = useMemo(() => {
    const n = videos.length || 1;
    const withSales = videos.filter((v) => v.gmv > 0);
    const nSales = withSales.length || 1;
    return {
      avgGPM: withSales.reduce((a, v) => a + v.gpm, 0) / nSales,
      avgCTR: videos.reduce((a, v) => a + v.ctr, 0) / n,
      avgCTOR: videos.reduce((a, v) => a + v.ctor, 0) / n,
      avgWatch: videos.reduce((a, v) => a + v.watchRate, 0) / n,
    };
  }, [videos]);

  // Status distribution
  const statusDist = useMemo(() => {
    const counts: Record<string, number> = {};
    videos.forEach((v) => { counts[v.videoStatus] = (counts[v.videoStatus] || 0) + 1; });
    return Object.entries(STATUS_COLORS).map(([name, color]) => ({
      name, value: counts[name] || 0, color,
    }));
  }, [videos]);

  // Video funnel
  const funnelData = useMemo(() => {
    const totalVV = videos.reduce((a, v) => a + v.vv, 0);
    const totalPV = videos.reduce((a, v) => a + v.productViews, 0);
    const totalPC = videos.reduce((a, v) => a + v.productClicks, 0);
    const totalOrd = videos.reduce((a, v) => a + v.videoOrders, 0);
    const steps = [
      { name: "Total VV", value: totalVV },
      { name: "Produk Dilihat", value: totalPV },
      { name: "Klik Produk", value: totalPC },
      { name: "Pesanan Video", value: totalOrd },
    ];
    return steps.map((st, i) => ({
      ...st,
      pctPrev: i === 0 ? 100 : steps[i - 1].value > 0 ? (st.value / steps[i - 1].value * 100) : 0,
      fill: ["#0D47A1", "#1565C0", "#42A5F5", "#90CAF9"][i],
    }));
  }, [videos]);

  // Benchmarks
  const benchmarks = useMemo(() => {
    const n = videos.length || 1;
    const withSales = videos.filter((v) => v.gmv > 0);
    const nSales = withSales.length || 1;
    const avgGPM = withSales.reduce((a, v) => a + v.gpm, 0) / nSales;
    const avgCTR = videos.reduce((a, v) => a + v.ctr, 0) / n;
    const avgCTOR = videos.reduce((a, v) => a + v.ctor, 0) / n;
    const avgWatch = videos.reduce((a, v) => a + v.watchRate, 0) / n;
    const pctSales = videos.length > 0 ? (withSales.length / videos.length * 100) : 0;
    const boostCount = videos.filter((v) => v.boostCandidate).length;
    const pctBoost = videos.length > 0 ? (boostCount / videos.length * 100) : 0;
    return [
      { metrik: "Avg GPM", yours: formatRupiah(Math.round(avgGPM)), target: "> Rp 100.000", ok: avgGPM >= 100000 },
      { metrik: "Avg CTR", yours: fmtDec(avgCTR, 2) + "%", target: "> 3%", ok: avgCTR >= 3 },
      { metrik: "Avg CTOR", yours: fmtDec(avgCTOR, 2) + "%", target: "> 3%", ok: avgCTOR >= 3 },
      { metrik: "Avg Watch Rate", yours: fmtDec(avgWatch, 2) + "%", target: "> 10%", ok: avgWatch >= 10 },
      { metrik: "% Video ada penjualan", yours: fmtDec(pctSales, 1) + "%", target: "> 30%", ok: pctSales >= 30 },
      { metrik: "% Kandidat Boost", yours: fmtDec(pctBoost, 1) + "%", target: "> 20%", ok: pctBoost >= 20 },
    ];
  }, [videos]);

  return (
    <div className="space-y-6">
      {/* GMV Chart */}
      {gmvChartData.length > 0 && (
        <div className="bg-white rounded-2xl border p-6">
          <h3 className="font-semibold mb-4 text-sm">📊 GMV Video per Periode</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={gmvChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => `${(v / 1000000).toFixed(0)}Jt`} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: any) => formatRupiah(Number(v))} />
              <Bar dataKey="gmv" name="GMV" fill="#2563eb" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* GPM / CTR / CTOR / Watch Rate gauge cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Avg GPM", value: formatRupiah(Math.round(metrics.avgGPM)), target: 100000, actual: metrics.avgGPM, unit: "", ok: metrics.avgGPM >= 100000 },
          { label: "Avg CTR", value: fmtDec(metrics.avgCTR, 2) + "%", target: 3, actual: metrics.avgCTR, unit: "%", ok: metrics.avgCTR >= 3 },
          { label: "Avg CTOR", value: fmtDec(metrics.avgCTOR, 2) + "%", target: 3, actual: metrics.avgCTOR, unit: "%", ok: metrics.avgCTOR >= 3 },
          { label: "Avg Watch Rate", value: fmtDec(metrics.avgWatch, 2) + "%", target: 10, actual: metrics.avgWatch, unit: "%", ok: metrics.avgWatch >= 10 },
        ].map((m) => (
          <div key={m.label} className={`rounded-2xl border p-5 ${m.ok ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100"}`}>
            <div className="text-xs text-gray-500 font-medium mb-1">{m.label}</div>
            <div className={`text-xl font-bold ${m.ok ? "text-green-700" : "text-red-700"}`}>{m.value}</div>
            <div className="text-[11px] text-gray-400 mt-1">Target: {m.unit === "%" ? `≥${m.target}%` : `≥ ${formatRupiah(m.target)}`}</div>
            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
              <div className={`h-1.5 rounded-full ${m.ok ? "bg-green-500" : "bg-red-400"}`}
                style={{ width: `${Math.min((m.actual / m.target) * 100, 100)}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* Status Distribution */}
      <div className="bg-white rounded-2xl border p-6">
        <h3 className="font-semibold mb-4 text-sm">🏷️ Distribusi Status Video</h3>
        <div className="flex flex-col lg:flex-row gap-6 items-center">
          <div className="w-64 h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={statusDist.filter((d) => d.value > 0)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100}
                  label={({ percent }: any) => `${(percent * 100).toFixed(0)}%`} labelLine>
                  {statusDist.filter((d) => d.value > 0).map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {statusDist.map((d) => (
              <div key={d.name} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
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
      <div className="bg-white rounded-2xl border p-6">
        <h3 className="font-semibold mb-4 text-sm">🔄 Video Funnel</h3>
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

      {/* Benchmark Table */}
      <div className="bg-white rounded-2xl border p-6">
        <h3 className="font-semibold mb-4 text-sm">📋 Benchmark Performa Video</h3>
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
// TAB 2: EVALUASI MINGGUAN
// ══════════════════════════════════════
function WeeklyTab({ videos }: { videos: VidExtended[] }) {
  // Group videos by week
  const weeklyData = useMemo(() => {
    const weekMap = new Map<string, VidExtended[]>();
    videos.forEach((v) => {
      const date = v.postedAt?.split(" ")[0] || "";
      if (!date) return;
      const d = new Date(date.replace(/\//g, "-"));
      if (isNaN(d.getTime())) return;
      const dayOfWeek = d.getDay();
      const monday = new Date(d);
      monday.setDate(d.getDate() - ((dayOfWeek + 6) % 7));
      const key = monday.toISOString().slice(0, 10);
      if (!weekMap.has(key)) weekMap.set(key, []);
      weekMap.get(key)!.push(v);
    });
    return [...weekMap.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([weekStart, vids]) => {
      const end = new Date(weekStart);
      end.setDate(end.getDate() + 6);
      const n = vids.length || 1;
      const withSales = vids.filter((v) => v.gmv > 0);
      const nSales = withSales.length || 1;
      return {
        weekStart,
        weekLabel: `${weekStart.slice(5)} ~ ${end.toISOString().slice(5, 10)}`,
        videos: vids.length,
        totalGMV: vids.reduce((a, v) => a + v.gmv, 0),
        totalVV: vids.reduce((a, v) => a + v.vv, 0),
        totalOrders: vids.reduce((a, v) => a + v.videoOrders, 0),
        avgGPM: withSales.reduce((a, v) => a + v.gpm, 0) / nSales,
        avgCTR: vids.reduce((a, v) => a + v.ctr, 0) / n,
        avgCTOR: vids.reduce((a, v) => a + v.ctor, 0) / n,
        avgWatch: vids.reduce((a, v) => a + v.watchRate, 0) / n,
        topPerformers: vids.filter((v) => v.videoStatus === "🏆 TOP PERFORMER").length,
        underperformers: vids.filter((v) => v.videoStatus === "🔴 UNDERPERFORM").length,
        vids,
      };
    });
  }, [videos]);

  const [expandedWeek, setExpandedWeek] = useState<string | null>(null);

  // Recommendations
  const recommendations = useMemo(() => {
    const tips: string[] = [];
    if (videos.length === 0) return tips;
    const n = videos.length;
    const avgCTR = videos.reduce((a, v) => a + v.ctr, 0) / n;
    const avgCTOR = videos.reduce((a, v) => a + v.ctor, 0) / n;
    const avgWatch = videos.reduce((a, v) => a + v.watchRate, 0) / n;
    const withSales = videos.filter((v) => v.gmv > 0);
    const pctSales = (withSales.length / n) * 100;

    if (avgCTR < 3) tips.push("🎯 CTR rendah (<3%) — Perbaiki hook 3 detik pertama & thumbnail. Gunakan teks overlay yang menarik perhatian.");
    if (avgCTOR < 3) tips.push("🛒 CTOR rendah (<3%) — Tingkatkan call-to-action di video. Tampilkan produk lebih jelas dan berikan alasan untuk beli sekarang.");
    if (avgWatch < 10) tips.push("⏱️ Watch Rate rendah (<10%) — Video terlalu panjang atau kurang engaging. Coba durasi 15-30 detik dengan konten padat.");
    if (pctSales < 30) tips.push("📉 Kurang dari 30% video menghasilkan penjualan — Fokus pada konten yang demonstrasikan produk secara langsung.");
    if (tips.length === 0) tips.push("✅ Performa video sudah bagus! Pertahankan konsistensi konten.");

    return tips;
  }, [videos]);

  return (
    <div className="space-y-6">
      {/* Weekly GMV Chart */}
      {weeklyData.length > 0 && (
        <div className="bg-white rounded-2xl border p-6">
          <h3 className="font-semibold mb-4 text-sm">📊 GMV per Minggu</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="weekLabel" tick={{ fontSize: 10 }} />
              <YAxis tickFormatter={(v) => `${(v / 1000000).toFixed(1)}Jt`} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: any) => formatRupiah(Number(v))} />
              <Bar dataKey="totalGMV" name="GMV" fill="#10b981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Weekly metrics */}
      {weeklyData.length > 1 && (
        <div className="bg-white rounded-2xl border p-6">
          <h3 className="font-semibold mb-4 text-sm">📈 Tren Mingguan CTR & CTOR</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="weekLabel" tick={{ fontSize: 10 }} />
              <YAxis unit="%" tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="avgCTR" name="CTR" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="avgCTOR" name="CTOR" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Weekly Accordion */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm">📅 Detail per Minggu</h3>
        {weeklyData.map((w) => (
          <div key={w.weekStart} className="bg-white rounded-2xl border overflow-hidden">
            <button onClick={() => setExpandedWeek(expandedWeek === w.weekStart ? null : w.weekStart)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition">
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-gray-900">Minggu {w.weekLabel}</span>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{w.videos} video</span>
                {w.topPerformers > 0 && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">🏆 {w.topPerformers}</span>}
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm font-bold text-green-700">{formatRupiah(w.totalGMV)}</span>
                {expandedWeek === w.weekStart ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            </button>
            {expandedWeek === w.weekStart && (
              <div className="border-t p-4 space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  {[
                    ["GMV", formatRupiah(w.totalGMV)], ["Views", formatNum(w.totalVV)],
                    ["Pesanan", formatNum(w.totalOrders)], ["Avg GPM", formatRupiah(Math.round(w.avgGPM))],
                    ["Avg CTR", fmtDec(w.avgCTR, 2) + "%"], ["Avg CTOR", fmtDec(w.avgCTOR, 2) + "%"],
                    ["Watch Rate", fmtDec(w.avgWatch, 2) + "%"], ["Under-perform", String(w.underperformers)],
                  ].map(([l, val]) => (
                    <div key={l} className="bg-gray-50 rounded-xl p-3">
                      <div className="text-gray-400 mb-0.5">{l}</div>
                      <div className="font-bold text-gray-800">{val}</div>
                    </div>
                  ))}
                </div>
                {/* Top 3 videos of the week */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2">🏆 Top Video Minggu Ini</p>
                  {w.vids.sort((a, b) => b.gmv - a.gmv).slice(0, 3).map((v, i) => (
                    <div key={v.videoId + i} className="flex items-center gap-2 py-1.5 border-b border-gray-100 last:border-0 text-xs">
                      <span className="font-bold text-gray-400 w-5">{i + 1}.</span>
                      <span className="flex-1 truncate">{v.videoInfo.substring(0, 60)}</span>
                      <span className="text-green-700 font-bold">{formatRupiah(v.gmv)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Recommendations */}
      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6">
        <h3 className="font-semibold text-sm mb-3">💡 Rekomendasi Konten</h3>
        <ul className="space-y-2">
          {recommendations.map((r, i) => (
            <li key={i} className="text-sm text-gray-700">{r}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ══════════════════════════════════════
// TAB 3: VIDEOS (LEADERBOARD)
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
// TAB 4: KREATOR
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

