"use client";
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useStoreManager } from "@/store/useStoreManager";
import { useLiveAnalytics } from "@/hooks/useLiveAnalytics";
import type { LiveCoreStat, LiveSession } from "@/hooks/useLiveAnalytics";
import { parseLiveExcel } from "@/lib/liveParser";
import { saveLiveCoreStats, saveLiveSessions } from "@/lib/db";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, Cell,
  ScatterChart, Scatter,
  ComposedChart,
} from "recharts";

// ─── HELPERS ──────────────────────────────────────────────
const fRp = (n: number) => "Rp " + Math.round(n).toLocaleString("id-ID");
const fN = (n: number) => Math.round(n).toLocaleString("id-ID");
const fP = (n: number) => n.toFixed(1) + "%";

const BULAN_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function formatPeriod(period: string): string {
  if (!period) return "";
  if (/^\d{4}-\d{2}$/.test(period)) {
    const [year, month] = period.split("-");
    return `${BULAN_ID[parseInt(month) - 1]} ${year}`;
  }
  return period;
}

function getPrevMonth(m: string): string {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(y, mo - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// ─── COLOR MAP ──────────────────────────────────────────
const colorMap: Record<string, { bg: string; ring: string; text: string; border: string }> = {
  red:    { bg: "bg-red-50",    ring: "bg-red-100",    text: "text-red-700",    border: "border-red-100" },
  orange: { bg: "bg-orange-50", ring: "bg-orange-100", text: "text-orange-700", border: "border-orange-100" },
  purple: { bg: "bg-purple-50", ring: "bg-purple-100", text: "text-purple-700", border: "border-purple-100" },
  blue:   { bg: "bg-blue-50",   ring: "bg-blue-100",   text: "text-blue-700",   border: "border-blue-100" },
  teal:   { bg: "bg-teal-50",   ring: "bg-teal-100",   text: "text-teal-700",   border: "border-teal-100" },
  indigo: { bg: "bg-indigo-50", ring: "bg-indigo-100", text: "text-indigo-700", border: "border-indigo-100" },
  yellow: { bg: "bg-yellow-50", ring: "bg-yellow-100", text: "text-yellow-700", border: "border-yellow-100" },
  pink:   { bg: "bg-pink-50",   ring: "bg-pink-100",   text: "text-pink-700",   border: "border-pink-100" },
  rose:   { bg: "bg-rose-50",   ring: "bg-rose-100",   text: "text-rose-700",   border: "border-rose-100" },
  green:  { bg: "bg-green-50",  ring: "bg-green-100",  text: "text-green-700",  border: "border-green-100" },
  gray:   { bg: "bg-gray-50",   ring: "bg-gray-100",   text: "text-gray-600",   border: "border-gray-100" },
};

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════
export default function LiveAnalyticsScreen() {
  const { stores, getActiveStore } = useStoreManager();
  const activeStore = getActiveStore();

  // Active stores (exclude test)
  const activeStores = useMemo(
    () => stores.filter((s) => !["toko", "toko2"].includes(s.name)),
    [stores]
  );

  const { coreStats, sessions, isLoading } = useLiveAnalytics(activeStores);

  // ─── UPLOAD STATE ─────────────────────────────────────
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeStore) return;
    if (!file.name.match(/\.xlsx?$/i)) {
      setUploadMsg({ type: "err", text: "Hanya file .xlsx atau .xls yang diterima." });
      return;
    }
    setIsUploading(true);
    setUploadMsg(null);
    try {
      const { sessions: parsedSessions, coreStats: parsedStats } = await parseLiveExcel(file, activeStore.id);
      if (parsedSessions.length === 0) {
        setUploadMsg({ type: "err", text: "File tidak mengandung data sesi LIVE yang valid." });
        setIsUploading(false);
        return;
      }
      await Promise.all([
        saveLiveCoreStats(parsedStats),
        saveLiveSessions(parsedSessions),
      ]);
      setUploadMsg({ type: "ok", text: `✅ Berhasil upload ${parsedSessions.length} sesi LIVE (${parsedStats.length} hari). Refresh halaman untuk melihat data.` });
      setReloadKey((k) => k + 1);
    } catch (err: any) {
      console.error("Upload LIVE error:", err);
      setUploadMsg({ type: "err", text: err?.message || "Gagal memproses file." });
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = "";
    }
  }, [activeStore]);

  // ─── STATE ──────────────────────────────────────────
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"gabungan" | string>("gabungan");
  const [activeTab, setActiveTab] = useState<"overview" | "sessions" | "harian">("overview");

  // Sessions tab state
  const [searchSess, setSearchSess] = useState("");
  const [filterGMV, setFilterGMV] = useState<"all" | "gmv" | "nogmv">("all");
  const [sortBy, setSortBy] = useState<"gmv" | "viewers" | "duration" | "date">("gmv");

  // Harian tab state
  const [visibleMetrics, setVisibleMetrics] = useState(
    new Set(["gmv", "viewers", "ctr", "gpm"])
  );
  const toggleMetric = (m: string) => {
    setVisibleMetrics((prev) => {
      const next = new Set(prev);
      next.has(m) ? next.delete(m) : next.add(m);
      return next;
    });
  };

  // ─── DERIVED: All months ────────────────────────────
  const allMonths = useMemo(() => {
    const months = [...new Set([
      ...coreStats.map((s) => s.date.slice(0, 7)),
      ...sessions.map((s) => s.session_date?.slice(0, 7)).filter(Boolean),
    ])];
    return months.sort();
  }, [coreStats, sessions]);

  useEffect(() => {
    if (allMonths.length && selectedMonth === "all") {
      // Default to latest month (not "all") on first load if desired
      // Keep "all" for now since user wanted "Semua" option
    }
  }, [allMonths, selectedMonth]);

  // ─── FILTERED DATA ─────────────────────────────────
  const selectedStore = viewMode === "gabungan" ? "all" : viewMode;

  const filteredStats = useMemo(
    () =>
      coreStats.filter(
        (s) =>
          (selectedStore === "all" || s.store_id === selectedStore) &&
          (selectedMonth === "all" || s.date.startsWith(selectedMonth))
      ),
    [coreStats, selectedStore, selectedMonth]
  );

  const filteredSessions = useMemo(
    () =>
      sessions.filter(
        (s) =>
          (selectedStore === "all" || s.store_id === selectedStore) &&
          (selectedMonth === "all" || s.session_date?.startsWith(selectedMonth)) &&
          s.is_valid_session
      ),
    [sessions, selectedStore, selectedMonth]
  );

  // ─── KPI ───────────────────────────────────────────
  const kpi = useMemo(() => {
    const totalGMV = filteredStats.reduce((a, s) => a + (s.gmv_live || 0), 0);
    const totalGMVEarned = filteredStats.reduce((a, s) => a + (s.gmv_earned || 0), 0);
    const totalSessions = filteredStats.reduce((a, s) => a + (s.sessions_total || 0), 0);
    const sessionsWithGMV = filteredStats.reduce((a, s) => a + (s.sessions_with_gmv || 0), 0);
    const totalBuyers = filteredStats.reduce((a, s) => a + (s.buyers || 0), 0);
    const totalProducts = filteredStats.reduce((a, s) => a + (s.products_sold || 0), 0);
    const totalImpressions = filteredStats.reduce((a, s) => a + (s.impressions || 0), 0);
    const avgGPM = filteredStats.length > 0
      ? filteredStats.reduce((a, s) => a + (s.gpm || 0), 0) / filteredStats.length : 0;
    const avgCTR = filteredStats.length > 0
      ? filteredStats.reduce((a, s) => a + (s.ctr_live || 0), 0) / filteredStats.length : 0;
    const avgOrderPerClick = filteredStats.length > 0
      ? filteredStats.reduce((a, s) => a + (s.order_per_click || 0), 0) / filteredStats.length : 0;
    const avgWatchTime = filteredStats.length > 0
      ? filteredStats.reduce((a, s) => a + (s.avg_watch_time || 0), 0) / filteredStats.length : 0;

    const validSessions = filteredSessions.filter((s) => s.is_valid_session);
    const gmvSessions = validSessions.filter((s) => s.has_gmv);
    const totalDuration = validSessions.reduce((a, s) => a + (s.duration_minutes || 0), 0);
    const avgDuration = validSessions.length > 0 ? totalDuration / validSessions.length : 0;
    const totalLikes = validSessions.reduce((a, s) => a + (s.likes || 0), 0);
    const totalComments = validSessions.reduce((a, s) => a + (s.comments || 0), 0);
    const totalShares = validSessions.reduce((a, s) => a + (s.shares || 0), 0);
    const totalNewFollowers = validSessions.reduce((a, s) => a + (s.new_followers || 0), 0);
    const peakViewers = validSessions.length > 0
      ? Math.max(...validSessions.map((s) => s.unique_viewers || 0)) : 0;
    const avgViewers = validSessions.length > 0
      ? validSessions.reduce((a, s) => a + (s.unique_viewers || 0), 0) / validSessions.length : 0;

    const convRate = totalSessions > 0 ? (sessionsWithGMV / totalSessions) * 100 : 0;
    const aov = totalBuyers > 0 ? totalGMV / totalBuyers : 0;

    const latestMonth = selectedMonth !== "all" ? selectedMonth : (allMonths[allMonths.length - 1] || "");
    const prevMonth = latestMonth ? getPrevMonth(latestMonth) : "";
    const prevStats = prevMonth ? coreStats.filter(
      (s) =>
        (selectedStore === "all" || s.store_id === selectedStore) &&
        s.date.startsWith(prevMonth)
    ) : [];
    const prevGMV = prevStats.reduce((a, s) => a + (s.gmv_live || 0), 0);
    const momGMV = prevGMV > 0 ? ((totalGMV - prevGMV) / prevGMV) * 100 : null;

    return {
      totalGMV, totalGMVEarned, totalSessions, sessionsWithGMV,
      totalBuyers, totalProducts, totalImpressions,
      avgGPM, avgCTR, avgOrderPerClick, avgWatchTime,
      validSessions: validSessions.length,
      gmvSessions: gmvSessions.length,
      totalDuration, avgDuration,
      totalLikes, totalComments, totalShares, totalNewFollowers,
      peakViewers, avgViewers, convRate, aov, momGMV, prevMonth,
    };
  }, [filteredStats, filteredSessions, coreStats, selectedStore, selectedMonth]);

  // ─── CHART DATA ────────────────────────────────────
  const gmvHarian = useMemo(
    () => filteredStats.map((s) => ({
      date: s.date.slice(5),
      gmv: Math.round((s.gmv_live || 0) / 1000),
      sesi: s.sessions_total || 0,
      sesiGMV: s.sessions_with_gmv || 0,
    })),
    [filteredStats]
  );

  const gpmHarian = useMemo(
    () => filteredStats.map((s) => ({
      date: s.date.slice(5),
      gpm: s.gpm || 0,
      ctr: s.ctr_live || 0,
      o2c: s.order_per_click || 0,
    })),
    [filteredStats]
  );

  const jamDistribusi = useMemo(() => {
    return Array.from({ length: 24 }, (_, hour) => {
      const sessHour = filteredSessions.filter((s) => {
        const h = new Date(s.started_at).getHours();
        return h === hour && s.is_valid_session;
      });
      return {
        jam: `${String(hour).padStart(2, "0")}:00`,
        sesi: sessHour.length,
        gmv: sessHour.reduce((a, s) => a + (s.gmv || 0), 0),
        avgGMV: sessHour.length > 0
          ? sessHour.reduce((a, s) => a + (s.gmv || 0), 0) / sessHour.length : 0,
      };
    });
  }, [filteredSessions]);

  const scatterData = useMemo(
    () => filteredSessions
      .filter((s) => s.is_valid_session && s.duration_minutes > 0)
      .map((s) => ({
        x: s.duration_minutes,
        y: Math.round((s.gmv || 0) / 1000),
        viewers: s.unique_viewers || 0,
        date: s.session_date,
      })),
    [filteredSessions]
  );

  // ─── CALENDAR DATA ─────────────────────────────────
  const calendarMonth = selectedMonth !== "all" ? selectedMonth : (allMonths[allMonths.length - 1] || "");

  const calendarData = useMemo(() => {
    if (!calendarMonth) return { days: [] as { day: number; date: string; gmv: number; sessions: number; viewers: number }[], maxGMV: 1, firstDay: 0 };
    const dailyMap: Record<string, { gmv: number; sessions: number; viewers: number }> = {};
    filteredStats.filter((s) => s.date.startsWith(calendarMonth)).forEach((s) => {
      dailyMap[s.date] = {
        gmv: s.gmv_live || 0,
        sessions: s.sessions_total || 0,
        viewers: 0,
      };
    });
    filteredSessions.filter((s) => s.session_date?.startsWith(calendarMonth)).forEach((s) => {
      if (!dailyMap[s.session_date]) dailyMap[s.session_date] = { gmv: 0, sessions: 0, viewers: 0 };
      dailyMap[s.session_date].viewers += s.unique_viewers || 0;
    });

    const [year, month] = calendarMonth.split("-").map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDay = new Date(year, month - 1, 1).getDay();
    const days = Array.from({ length: daysInMonth }, (_, i) => {
      const d = `${calendarMonth}-${String(i + 1).padStart(2, "0")}`;
      return { day: i + 1, date: d, ...(dailyMap[d] || { gmv: 0, sessions: 0, viewers: 0 }) };
    });
    const maxGMV = Math.max(...days.map((d) => d.gmv), 1);

    return { days, maxGMV, firstDay };
  }, [calendarMonth, filteredStats, filteredSessions]);

  // ─── TOP 10 SESSIONS ──────────────────────────────
  const top10 = useMemo(
    () => [...filteredSessions]
      .filter((s) => s.has_gmv)
      .sort((a, b) => b.gmv - a.gmv)
      .slice(0, 10),
    [filteredSessions]
  );

  // ─── SESSIONS TAB DATA ────────────────────────────
  const displaySessions = useMemo(() => {
    const q = searchSess.toLowerCase();
    return filteredSessions
      .filter((s) => {
        const matchSearch = !q ||
          s.session_date?.includes(q) ||
          s.creator_name?.toLowerCase().includes(q) ||
          s.creator_username?.toLowerCase().includes(q);
        const matchGMV =
          filterGMV === "all" ? true :
          filterGMV === "gmv" ? s.has_gmv : !s.has_gmv;
        return matchSearch && matchGMV;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case "gmv": return b.gmv - a.gmv;
          case "viewers": return b.unique_viewers - a.unique_viewers;
          case "duration": return b.duration_minutes - a.duration_minutes;
          case "date": return b.started_at.localeCompare(a.started_at);
          default: return 0;
        }
      });
  }, [filteredSessions, searchSess, filterGMV, sortBy]);

  // ─── HARIAN TAB DATA ──────────────────────────────
  const METRICS = [
    { key: "gmv", label: "GMV", color: "#ef4444", unit: "rp" },
    { key: "gpm", label: "GPM", color: "#f97316", unit: "rp" },
    { key: "viewers", label: "Penonton", color: "#8b5cf6", unit: "num" },
    { key: "ctr", label: "CTR", color: "#06b6d4", unit: "pct" },
    { key: "o2c", label: "Order/Klik", color: "#10b981", unit: "pct" },
    { key: "watchtime", label: "Watch Time", color: "#f59e0b", unit: "sec" },
    { key: "likes", label: "Likes", color: "#ec4899", unit: "num" },
    { key: "sessions", label: "Sesi", color: "#6366f1", unit: "num" },
  ];

  const dailyAgg = useMemo(
    () => filteredStats.map((stat) => {
      const daySessions = filteredSessions.filter((s) => s.session_date === stat.date);
      return {
        date: stat.date.slice(5),
        gmv: Math.round((stat.gmv_live || 0) / 1000),
        gpm: stat.gpm || 0,
        viewers: daySessions.length > 0
          ? Math.round(daySessions.reduce((a, s) => a + (s.unique_viewers || 0), 0) / daySessions.length) : 0,
        ctr: stat.ctr_live || 0,
        o2c: stat.order_per_click || 0,
        watchtime: stat.avg_watch_time || 0,
        likes: daySessions.reduce((a, s) => a + (s.likes || 0), 0),
        sessions: stat.sessions_total || 0,
      };
    }),
    [filteredStats, filteredSessions]
  );

  const weeklyData = useMemo(() => {
    const weeks: Record<number, { week: string; gmv: number; sessions: number; buyers: number; impressions: number; days: number }> = {};
    filteredStats.forEach((s) => {
      const d = new Date(s.date);
      const weekNum = Math.ceil(d.getDate() / 7);
      if (!weeks[weekNum]) weeks[weekNum] = {
        week: `Minggu ${weekNum}`, gmv: 0, sessions: 0, buyers: 0, impressions: 0, days: 0,
      };
      weeks[weekNum].gmv += s.gmv_live || 0;
      weeks[weekNum].sessions += s.sessions_total || 0;
      weeks[weekNum].buyers += s.buyers || 0;
      weeks[weekNum].impressions += s.impressions || 0;
      weeks[weekNum].days += 1;
    });
    return Object.values(weeks);
  }, [filteredStats]);

  // ─── INSIGHTS ──────────────────────────────────────
  const insights = useMemo(() => {
    const list: string[] = [];

    const bestHour = jamDistribusi
      .filter((j) => j.sesi > 0)
      .sort((a, b) => b.avgGMV - a.avgGMV)[0];
    if (bestHour)
      list.push(`🕐 Jam terbaik live adalah ${bestHour.jam} (avg GMV ${fRp(bestHour.avgGMV)} per sesi)`);

    const longSess = filteredSessions.filter((s) => s.duration_minutes >= 240);
    const shortSess = filteredSessions.filter(
      (s) => s.duration_minutes >= 30 && s.duration_minutes < 240
    );
    const avgGMVLong = longSess.length > 0
      ? longSess.reduce((a, s) => a + s.gmv, 0) / longSess.length : 0;
    const avgGMVShort = shortSess.length > 0
      ? shortSess.reduce((a, s) => a + s.gmv, 0) / shortSess.length : 0;
    if (avgGMVLong > avgGMVShort && longSess.length > 0)
      list.push(`⏱️ Live >4 jam rata-rata ${fRp(avgGMVLong)} vs live pendek ${fRp(avgGMVShort)} — durasi panjang lebih efektif`);

    if (kpi.avgWatchTime < 30)
      list.push(`⚠️ Avg watch time hanya ${Math.round(kpi.avgWatchTime)}s — coba buat opening yang lebih menarik untuk menahan penonton`);
    else if (kpi.avgWatchTime >= 60)
      list.push(`✅ Avg watch time ${Math.round(kpi.avgWatchTime)}s — penonton engage dengan baik!`);

    if (kpi.avgCTR < 3)
      list.push(`📦 CTR produk ${fP(kpi.avgCTR)} — coba pin produk bestseller di posisi pertama showcase`);
    else
      list.push(`✅ CTR produk ${fP(kpi.avgCTR)} — produk showcase menarik perhatian penonton`);

    const zeroGMVRate = filteredSessions.length > 0
      ? (filteredSessions.filter((s) => !s.has_gmv).length / filteredSessions.length) * 100 : 0;
    if (zeroGMVRate > 50)
      list.push(`📉 ${fP(zeroGMVRate)} sesi tidak menghasilkan GMV — pertimbangkan kurangi frekuensi dan fokus ke kualitas sesi`);

    return list;
  }, [kpi, jamDistribusi, filteredSessions]);

  // ═══════════════════════════════════════════════════
  // LOADING STATE
  // ═══════════════════════════════════════════════════
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-100 rounded-xl w-64 animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="bg-gray-50 border border-gray-100 rounded-2xl p-4 h-32 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!coreStats.length && !sessions.length) {
    return (
      <div className="text-center py-20">
        <div className="text-5xl mb-4">🔴</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Belum ada data LIVE</h2>
        <p className="text-sm text-gray-400 mb-6">
          Upload file Excel LIVE analytics dari TikTok Seller Center.
        </p>
        <label className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl text-sm font-medium cursor-pointer transition">
          {isUploading ? "⏳ Memproses..." : "📤 Upload File LIVE"}
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleUpload} disabled={isUploading || !activeStore} />
        </label>
        {uploadMsg && (
          <div className={`mt-4 text-sm ${uploadMsg.type === "ok" ? "text-green-600" : "text-red-600"}`}>
            {uploadMsg.text}
          </div>
        )}
        {!activeStore && <p className="text-xs text-red-400 mt-2">Pilih toko aktif terlebih dahulu.</p>}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════
  return (
    <div className="space-y-6">

      {/* ═══ HEADER & FILTER ═══ */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              🔴 Live Analytics
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Performa LIVE streaming per sesi &amp; harian
            </p>
          </div>
          <label className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-sm font-medium cursor-pointer transition w-fit">
            {isUploading ? "⏳ Memproses..." : "📤 Upload LIVE"}
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleUpload} disabled={isUploading || !activeStore} />
          </label>
        </div>

        {/* View Mode: Gabungan / per Toko */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
            <button
              onClick={() => setViewMode("gabungan")}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
                viewMode === "gabungan"
                  ? "bg-red-600 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              🔀 Gabungan
            </button>
            {activeStores.map((store) => (
              <button
                key={store.id}
                onClick={() => setViewMode(store.id)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
                  viewMode === store.id
                    ? "bg-red-600 text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                🏪 {store.name.replace("Fresh Vision Official", "FVO").replace("Freshvision Shop", "FVS")}
              </button>
            ))}
          </div>

          {/* Periode: Semua + per bulan */}
          <div className="flex bg-gray-100 rounded-xl p-1 gap-1 flex-wrap">
            <button
              onClick={() => setSelectedMonth("all")}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
                selectedMonth === "all"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              📊 Semua
            </button>
            {allMonths.map((m) => (
              <button
                key={m}
                onClick={() => setSelectedMonth(m)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
                  selectedMonth === m
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {formatPeriod(m)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Upload feedback */}
      {uploadMsg && (
        <div className={`rounded-xl px-4 py-3 text-sm flex items-center justify-between ${
          uploadMsg.type === "ok" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
        }`}>
          <span>{uploadMsg.text}</span>
          <button onClick={() => setUploadMsg(null)} className="ml-2 font-bold hover:opacity-70">×</button>
        </div>
      )}

      {/* ═══ KPI CARDS (10) ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          {
            icon: "💰", label: "GMV LIVE", color: "red",
            value: fRp(kpi.totalGMV),
            sub: kpi.momGMV !== null
              ? `${kpi.momGMV >= 0 ? "↑" : "↓"} ${Math.abs(kpi.momGMV).toFixed(1)}% vs ${formatPeriod(kpi.prevMonth)}`
              : "Bulan pertama",
            subOk: kpi.momGMV === null || kpi.momGMV >= 0,
          },
          {
            icon: "📊", label: "GPM Rata-rata", color: "orange",
            value: fRp(kpi.avgGPM),
            sub: "GMV per 1.000 tayangan",
            subOk: true,
          },
          {
            icon: "🎬", label: "Total Sesi LIVE", color: "purple",
            value: fN(kpi.totalSessions),
            sub: `${fN(kpi.gmvSessions)} sesi hasilkan GMV (${fP(kpi.convRate)})`,
            subOk: kpi.convRate >= 30,
          },
          {
            icon: "👥", label: "Total Pembeli", color: "blue",
            value: fN(kpi.totalBuyers),
            sub: `AOV ${fRp(kpi.aov)} per pembeli`,
            subOk: true,
          },
          {
            icon: "👁️", label: "Avg Penonton", color: "teal",
            value: fN(Math.round(kpi.avgViewers)),
            sub: `Peak: ${fN(kpi.peakViewers)} penonton`,
            subOk: true,
          },
          {
            icon: "⏱️", label: "Avg Durasi Sesi", color: "indigo",
            value: `${Math.floor(kpi.avgDuration / 60)}j ${Math.round(kpi.avgDuration % 60)}m`,
            sub: `Total ${Math.floor(kpi.totalDuration / 60)} jam live bulan ini`,
            subOk: true,
          },
          {
            icon: "🖱️", label: "CTR Produk", color: "yellow",
            value: fP(kpi.avgCTR),
            sub: `Order/Klik: ${fP(kpi.avgOrderPerClick)}`,
            subOk: kpi.avgCTR >= 3,
          },
          {
            icon: "⌚", label: "Avg Watch Time", color: "pink",
            value: `${Math.round(kpi.avgWatchTime)}s`,
            sub: kpi.avgWatchTime >= 60 ? "🟢 Bagus (>60s)" :
                 kpi.avgWatchTime >= 30 ? "🟡 Cukup (30-60s)" : "🔴 Rendah (<30s)",
            subOk: kpi.avgWatchTime >= 30,
          },
          {
            icon: "❤️", label: "Total Likes", color: "rose",
            value: fN(kpi.totalLikes),
            sub: `💬 ${fN(kpi.totalComments)} komentar`,
            subOk: true,
          },
          {
            icon: "🌟", label: "Followers Baru", color: "green",
            value: `+${fN(kpi.totalNewFollowers)}`,
            sub: `↗️ ${fN(kpi.totalShares)} kali dibagikan`,
            subOk: true,
          },
        ].map((card) => {
          const c = colorMap[card.color] || colorMap.gray;
          return (
            <div key={card.label} className={`${c.bg} border ${c.border} rounded-2xl p-4`}>
              <div className={`${c.ring} rounded-xl p-2.5 text-xl w-fit mb-3`}>{card.icon}</div>
              <div className={`text-xl font-bold ${c.text} mb-0.5 leading-tight`}>{card.value}</div>
              <div className="text-xs text-gray-500 font-medium mb-0.5">{card.label}</div>
              <div className={`text-xs ${card.subOk ? "text-gray-400" : "text-red-500"}`}>{card.sub}</div>
            </div>
          );
        })}
      </div>

      {/* ═══ STORE CONTRIBUTION (Gabungan mode only) ═══ */}
      {viewMode === "gabungan" && activeStores.length > 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {activeStores.map((store, i) => {
            const storeStats = filteredStats.filter((s) => s.store_id === store.id);
            const storeGMV = storeStats.reduce((a, s) => a + (s.gmv_live || 0), 0);
            const storeSess = storeStats.reduce((a, s) => a + (s.sessions_total || 0), 0);
            const storeBuyers = storeStats.reduce((a, s) => a + (s.buyers || 0), 0);
            const totalGMV = filteredStats.reduce((a, s) => a + (s.gmv_live || 0), 0);
            const share = totalGMV > 0 ? (storeGMV / totalGMV) * 100 : 0;
            const COLORS = ["#ef4444", "#f97316"];
            return (
              <div key={store.id} className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🏪</span>
                    <div>
                      <div className="font-semibold text-sm text-gray-900">{store.name}</div>
                      <div className="text-xs text-gray-400">TikTok Shop</div>
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
                    { label: "GMV LIVE", value: fRp(storeGMV) },
                    { label: "Total Sesi", value: fN(storeSess) },
                    { label: "Pembeli", value: fN(storeBuyers) },
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

      {/* ═══ TAB NAVIGATION ═══ */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {([
          { key: "overview" as const, label: "📈 Overview" },
          { key: "sessions" as const, label: "🎬 Per Sesi" },
          { key: "harian" as const, label: "📅 Tren Harian" },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`text-sm px-4 py-2 rounded-lg font-medium transition ${
              activeTab === tab.key
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══ TAB 1: OVERVIEW ═══ */}
      {activeTab === "overview" && (
        <div className="space-y-6">

          {/* Row 1: GMV Harian + GPM & CTR */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-1">💰 GMV LIVE Harian</h3>
              <p className="text-xs text-gray-400 mb-4">dalam ribu rupiah</p>
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={gmvHarian} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false}
                    interval={Math.max(0, Math.floor(gmvHarian.length / 6))} />
                  <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false}
                    tickFormatter={(v: number) => `${v}k`} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb" }}
                    formatter={(val: any, name: any) => [
                      name === "gmv" ? `Rp ${val}k` : `${val} sesi`, name
                    ]} />
                  <Bar yAxisId="left" dataKey="gmv" fill="#fca5a5" radius={[3, 3, 0, 0]} name="GMV (ribu)" />
                  <Line yAxisId="right" type="monotone" dataKey="sesi" stroke="#ef4444" strokeWidth={2} dot={false} name="Sesi" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-1">📊 GPM &amp; CTR Harian</h3>
              <p className="text-xs text-gray-400 mb-4">GPM = GMV per 1000 tayangan, CTR = rasio klik tayang</p>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={gpmHarian} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false}
                    interval={Math.max(0, Math.floor(gpmHarian.length / 6))} />
                  <YAxis yAxisId="gpm" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false}
                    tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                  <YAxis yAxisId="pct" orientation="right" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false}
                    tickFormatter={(v: number) => `${v}%`} />
                  <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb" }}
                    formatter={(val: any, name: any) => [
                      name === "GPM (Rp)" ? fRp(Number(val)) : `${val}%`, name
                    ]} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
                  <Line yAxisId="gpm" type="monotone" dataKey="gpm" stroke="#f97316" strokeWidth={2} dot={false} name="GPM (Rp)" />
                  <Line yAxisId="pct" type="monotone" dataKey="ctr" stroke="#8b5cf6" strokeWidth={2} dot={false} name="CTR %" />
                  <Line yAxisId="pct" type="monotone" dataKey="o2c" stroke="#06b6d4" strokeWidth={2} dot={false} name="Order/Klik %" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Row 2: Jam Distribusi + Scatter */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-1">🕐 Distribusi Jam Mulai Live</h3>
              <p className="text-xs text-gray-400 mb-4">Jam berapa live paling banyak menghasilkan GMV?</p>
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={jamDistribusi} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" vertical={false} />
                  <XAxis dataKey="jam" tick={{ fontSize: 9, fill: "#9ca3af" }} axisLine={false} tickLine={false} interval={2} />
                  <YAxis yAxisId="sesi" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="gmv" orientation="right" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false}
                    tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} />
                  <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb" }}
                    formatter={(val: any, name: any) => [
                      name === "sesi" ? `${val} sesi` : fRp(Number(val)), name
                    ]} />
                  <Bar yAxisId="sesi" dataKey="sesi" fill="#fca5a5" radius={[3, 3, 0, 0]} name="sesi">
                    {jamDistribusi.map((entry, i) => (
                      <Cell key={i}
                        fill={entry.avgGMV > 500000 ? "#ef4444" :
                              entry.avgGMV > 200000 ? "#f97316" :
                              entry.sesi > 0 ? "#fca5a5" : "#f3f4f6"} />
                    ))}
                  </Bar>
                  <Line yAxisId="gmv" type="monotone" dataKey="avgGMV" stroke="#1a237e" strokeWidth={2} dot={false} name="Avg GMV" />
                </ComposedChart>
              </ResponsiveContainer>
              <div className="flex gap-4 mt-2 text-xs text-gray-400">
                <span><span className="text-red-500 font-bold">■</span> Avg GMV &gt;500k</span>
                <span><span className="text-orange-400 font-bold">■</span> 200k–500k</span>
                <span><span className="text-red-200 font-bold">■</span> Ada sesi, GMV rendah</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-1">⏱️ Durasi vs GMV per Sesi</h3>
              <p className="text-xs text-gray-400 mb-4">Apakah live lebih lama = GMV lebih tinggi?</p>
              <ResponsiveContainer width="100%" height={220}>
                <ScatterChart margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
                  <XAxis type="number" dataKey="x" name="Durasi" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false}
                    tickFormatter={(v: number) => `${v}m`} />
                  <YAxis type="number" dataKey="y" name="GMV" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false}
                    tickFormatter={(v: number) => `${v}k`} />
                  <Tooltip cursor={{ strokeDasharray: "3 3" }} contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb" }}
                    formatter={(val: any, name: any) => [
                      name === "Durasi" ? `${val} menit` : `Rp ${val}k`, name
                    ]} />
                  <Scatter data={scatterData} fill="#ef4444" fillOpacity={0.6} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Row 3: Calendar Heatmap */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">📅 Kalender Performa Live</h3>
            <p className="text-xs text-gray-400 mb-4">Setiap hari dalam bulan ini — warna menunjukkan total GMV</p>
            <div className="grid grid-cols-7 gap-1 text-center">
              {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((h) => (
                <div key={h} className="text-xs text-gray-400 font-medium py-1">{h}</div>
              ))}
              {Array.from({ length: calendarData.firstDay }).map((_, i) => (
                <div key={`pad-${i}`} />
              ))}
              {calendarData.days.map((d) => {
                const intensity = d.gmv / calendarData.maxGMV;
                const bg = d.gmv === 0
                  ? "bg-gray-100"
                  : intensity > 0.7 ? "bg-red-500"
                  : intensity > 0.4 ? "bg-red-300"
                  : intensity > 0.1 ? "bg-red-200"
                  : "bg-red-100";
                const text = intensity > 0.7 ? "text-white" : "text-gray-700";
                return (
                  <div key={d.day}
                    className={`${bg} rounded-lg p-1.5 cursor-pointer hover:ring-2 hover:ring-red-400 transition`}
                    title={`${d.date}\nGMV: ${fRp(d.gmv)}\n${d.sessions} sesi`}
                  >
                    <div className={`text-xs font-bold ${text}`}>{d.day}</div>
                    {d.gmv > 0 && (
                      <div className={`text-[9px] ${text} opacity-80 mt-0.5`}>
                        {Math.round(d.gmv / 1000)}k
                      </div>
                    )}
                    {d.sessions > 0 && (
                      <div className={`text-[8px] ${text} opacity-60`}>{d.sessions}×</div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-3 mt-3 text-xs text-gray-400">
              <span>Rendah</span>
              <div className="flex gap-1">
                {["bg-gray-100", "bg-red-100", "bg-red-200", "bg-red-300", "bg-red-500"].map((c, i) => (
                  <div key={i} className={`w-4 h-4 rounded ${c}`} />
                ))}
              </div>
              <span>Tinggi</span>
            </div>
          </div>

          {/* Row 4: Top 10 Sessions */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">🏆 Top 10 Sesi Live Terbaik</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 border-b border-gray-100">
                    <th className="text-left pb-3 font-medium">#</th>
                    <th className="text-left pb-3 font-medium">Tanggal &amp; Jam</th>
                    <th className="text-right pb-3 font-medium">Durasi</th>
                    <th className="text-right pb-3 font-medium">GMV</th>
                    <th className="text-right pb-3 font-medium">GPM</th>
                    <th className="text-right pb-3 font-medium">Penonton</th>
                    <th className="text-right pb-3 font-medium">CTR</th>
                    <th className="text-right pb-3 font-medium">Order/Klik</th>
                    <th className="text-right pb-3 font-medium">Watch Time</th>
                    <th className="text-right pb-3 font-medium">Likes</th>
                  </tr>
                </thead>
                <tbody>
                  {top10.map((s, i) => {
                    const medals = ["🥇", "🥈", "🥉"];
                    const gpm = s.unique_viewers > 0 ? Math.round(s.gmv / s.unique_viewers * 1000) : 0;
                    return (
                      <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                        <td className="py-3 text-base">{medals[i] || `${i + 1}`}</td>
                        <td className="py-3">
                          <div className="font-medium text-gray-900">
                            {new Date(s.started_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })}
                          </div>
                          <div className="text-xs text-gray-400">
                            {new Date(s.started_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB
                          </div>
                        </td>
                        <td className="py-3 text-right text-gray-700">
                          {Math.floor(s.duration_minutes / 60)}j {Math.round(s.duration_minutes % 60)}m
                        </td>
                        <td className="py-3 text-right font-bold text-gray-900">{fRp(s.gmv)}</td>
                        <td className="py-3 text-right">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            gpm > 15000 ? "bg-green-100 text-green-700" :
                            gpm > 7000 ? "bg-yellow-100 text-yellow-700" :
                            "bg-gray-100 text-gray-600"
                          }`}>{fRp(gpm)}</span>
                        </td>
                        <td className="py-3 text-right text-gray-700">{fN(s.unique_viewers)}</td>
                        <td className="py-3 text-right">
                          <span className={s.ctr >= 5 ? "text-green-600 font-medium" : s.ctr >= 3 ? "text-yellow-600" : "text-gray-500"}>
                            {fP(s.ctr)}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <span className={s.order_per_click >= 8 ? "text-green-600 font-medium" : s.order_per_click >= 4 ? "text-yellow-600" : "text-gray-500"}>
                            {fP(s.order_per_click)}
                          </span>
                        </td>
                        <td className="py-3 text-right text-gray-500">{s.avg_watch_time}s</td>
                        <td className="py-3 text-right text-gray-500">{fN(s.likes)}</td>
                      </tr>
                    );
                  })}
                  {top10.length === 0 && (
                    <tr><td colSpan={10} className="py-8 text-center text-gray-400 text-xs">Belum ada sesi dengan GMV</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══ TAB 2: PER SESI ═══ */}
      {activeTab === "sessions" && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex flex-col lg:flex-row gap-3 mb-5">
            <input
              placeholder="Cari tanggal atau kreator..."
              value={searchSess}
              onChange={(e) => setSearchSess(e.target.value)}
              className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            />
            <div className="flex gap-2">
              {(["all", "gmv", "nogmv"] as const).map((f) => (
                <button key={f}
                  onClick={() => setFilterGMV(f)}
                  className={`text-xs px-3 py-2 rounded-xl font-medium transition border ${
                    filterGMV === f
                      ? "bg-red-600 text-white border-red-600"
                      : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {f === "all" ? "Semua" : f === "gmv" ? "✅ Ada GMV" : "❌ Tidak GMV"}
                </button>
              ))}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "gmv" | "viewers" | "duration" | "date")}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-white"
              >
                <option value="gmv">Sort: GMV</option>
                <option value="viewers">Sort: Penonton</option>
                <option value="duration">Sort: Durasi</option>
                <option value="date">Sort: Tanggal</option>
              </select>
            </div>
          </div>

          <div className="flex gap-4 mb-4 text-xs text-gray-500 flex-wrap">
            <span>Menampilkan <b className="text-gray-900">{displaySessions.length}</b> sesi</span>
            <span>Total GMV: <b className="text-red-600">{fRp(displaySessions.reduce((a, s) => a + s.gmv, 0))}</b></span>
            <span>Sesi ada GMV: <b className="text-green-600">{displaySessions.filter((s) => s.has_gmv).length}</b></span>
            <span>Sesi kosong: <b className="text-gray-500">{displaySessions.filter((s) => !s.has_gmv).length}</b></span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="text-xs text-gray-400 border-b border-gray-100">
                  <th className="text-left pb-3 font-medium">Waktu</th>
                  <th className="text-right pb-3 font-medium">Durasi</th>
                  <th className="text-right pb-3 font-medium">GMV</th>
                  <th className="text-right pb-3 font-medium">Penonton</th>
                  <th className="text-right pb-3 font-medium">Prod. Lihat</th>
                  <th className="text-right pb-3 font-medium">Klik</th>
                  <th className="text-right pb-3 font-medium">CTR</th>
                  <th className="text-right pb-3 font-medium">O/K</th>
                  <th className="text-right pb-3 font-medium">Pembeli</th>
                  <th className="text-right pb-3 font-medium">AOV</th>
                  <th className="text-right pb-3 font-medium">Watch</th>
                  <th className="text-right pb-3 font-medium">Likes</th>
                  <th className="text-right pb-3 font-medium">Follower+</th>
                </tr>
              </thead>
              <tbody>
                {displaySessions.map((s) => (
                  <tr key={s.id} className={`border-b border-gray-50 hover:bg-gray-50 transition ${!s.has_gmv ? "opacity-50" : ""}`}>
                    <td className="py-2.5">
                      <div className="font-medium text-gray-900 text-xs">
                        {new Date(s.started_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })}{" "}
                        {new Date(s.started_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </td>
                    <td className="py-2.5 text-right text-xs text-gray-600">
                      {Math.floor(s.duration_minutes / 60)}j {Math.round(s.duration_minutes % 60)}m
                    </td>
                    <td className="py-2.5 text-right font-bold text-xs">
                      <span className={s.gmv > 0 ? "text-red-600" : "text-gray-300"}>
                        {s.gmv > 0 ? fRp(s.gmv) : "—"}
                      </span>
                    </td>
                    <td className="py-2.5 text-right text-xs text-gray-600">{fN(s.unique_viewers)}</td>
                    <td className="py-2.5 text-right text-xs text-gray-500">{fN(s.product_views)}</td>
                    <td className="py-2.5 text-right text-xs text-gray-500">{fN(s.product_clicks)}</td>
                    <td className="py-2.5 text-right text-xs">
                      <span className={s.ctr >= 5 ? "text-green-600" : s.ctr >= 3 ? "text-yellow-500" : "text-gray-400"}>
                        {fP(s.ctr)}
                      </span>
                    </td>
                    <td className="py-2.5 text-right text-xs">
                      <span className={s.order_per_click >= 8 ? "text-green-600" : s.order_per_click >= 4 ? "text-yellow-500" : "text-gray-400"}>
                        {fP(s.order_per_click)}
                      </span>
                    </td>
                    <td className="py-2.5 text-right text-xs text-gray-600">{fN(s.unique_buyers)}</td>
                    <td className="py-2.5 text-right text-xs text-gray-500">
                      {s.avg_order_value > 0 ? fRp(s.avg_order_value) : "—"}
                    </td>
                    <td className="py-2.5 text-right text-xs text-gray-400">{s.avg_watch_time}s</td>
                    <td className="py-2.5 text-right text-xs text-gray-400">{fN(s.likes)}</td>
                    <td className="py-2.5 text-right text-xs text-green-600">
                      {s.new_followers > 0 ? `+${fN(s.new_followers)}` : "—"}
                    </td>
                  </tr>
                ))}
                {displaySessions.length === 0 && (
                  <tr><td colSpan={13} className="py-8 text-center text-gray-400 text-xs">Tidak ada sesi ditemukan</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══ TAB 3: TREN HARIAN ═══ */}
      {activeTab === "harian" && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <h3 className="text-sm font-semibold text-gray-900">📈 Tren Harian Multi-Metrik</h3>
              <div className="flex gap-1.5 flex-wrap justify-end">
                {METRICS.map((m) => (
                  <button key={m.key}
                    onClick={() => toggleMetric(m.key)}
                    className={`text-xs px-2.5 py-1 rounded-lg font-medium transition border ${
                      visibleMetrics.has(m.key)
                        ? "text-white border-transparent"
                        : "bg-white text-gray-400 border-gray-200"
                    }`}
                    style={visibleMetrics.has(m.key) ? { backgroundColor: m.color, borderColor: m.color } : {}}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={dailyAgg} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false}
                  interval={Math.max(0, Math.floor(dailyAgg.length / 7))} />
                <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb" }} />
                {METRICS.filter((m) => visibleMetrics.has(m.key)).map((m) => (
                  <Line key={m.key} type="monotone" dataKey={m.key} stroke={m.color} strokeWidth={2}
                    dot={false} name={m.label} activeDot={{ r: 5, stroke: "white", strokeWidth: 2 }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">📊 Ringkasan Per Minggu</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {weeklyData.map((w) => (
                <div key={w.week} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <div className="text-xs text-gray-400 font-medium mb-2">{w.week}</div>
                  <div className="text-lg font-bold text-gray-900">{fRp(w.gmv)}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {w.sessions} sesi · {w.buyers} pembeli
                  </div>
                  <div className="text-xs text-gray-400">
                    Avg/hari: {fRp(w.days > 0 ? Math.round(w.gmv / w.days) : 0)}
                  </div>
                </div>
              ))}
              {weeklyData.length === 0 && (
                <div className="col-span-4 py-8 text-center text-gray-400 text-xs">Belum ada data harian</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ INSIGHTS ═══ */}
      {insights.length > 0 && (
        <div className="bg-gradient-to-br from-red-50 to-orange-50 border border-red-100 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">💡 Insight Otomatis</h3>
          <div className="space-y-3">
            {insights.map((insight, i) => (
              <div key={i} className="text-xs text-gray-700 bg-white rounded-xl p-3 border border-white/50 leading-relaxed">
                {insight}
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
