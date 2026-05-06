"use client";
import { useState, useMemo, useCallback, useEffect } from "react";
import { useStoreManager } from "@/store/useStoreManager";
import type { AffiliateMonthData, AffiliateCreatorItem } from "@/lib/types";
import { loadAffiliateCreators } from "@/lib/db";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
  PieChart, Pie, Cell,
} from "recharts";

// ─── HELPERS ──────────────────────────────────────────────
const fRp = (n: number) => "Rp " + Math.round(n).toLocaleString("id-ID");
const fN = (n: number) => Math.round(n).toLocaleString("id-ID");
const fP = (n: number) => n.toFixed(1) + "%";

const STORE_COLORS = ["#1a237e", "#00bcd4", "#ff6b35", "#7c3aed"];

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
  if (/^\d{4}-\d{2}-\d{2}/.test(period)) {
    const d = new Date(period);
    return `${BULAN_ID[d.getMonth()]} ${d.getFullYear()}`;
  }
  return period;
}

// ─── TYPES ────────────────────────────────────────────────
interface Alert {
  type: "error" | "warning" | "success" | "info";
  icon: string;
  title: string;
  message: string;
  action?: { label: string; tab: string };
}

interface HomeScreenProps {
  onNavigate: (tab: string) => void;
}

// ═══════════════════════════════════════════════════════════
// HOME SCREEN COMPONENT
// ═══════════════════════════════════════════════════════════
export default function HomeScreen({ onNavigate }: HomeScreenProps) {
  const { stores } = useStoreManager();
  const [dismissedAlerts, setDismissedAlerts] = useState<number[]>([]);
  const [chartView, setChartView] = useState<"gabungan" | "pertoko">("gabungan");
  const [chartMetric, setChartMetric] = useState<"gmv" | "refund">("gmv");
  const [showTargetForm, setShowTargetForm] = useState(false);
  const [targetInput, setTargetInput] = useState("");
  const [targetVersion, setTargetVersion] = useState(0);

  // ─── ALL AFFILIATE DATA ─────────────────────────────────
  const allAffiliateData = useMemo(() => {
    const all: AffiliateMonthData[] = [];
    stores.forEach((s) => {
      if (s.affiliateData) all.push(...s.affiliateData);
    });
    return all;
  }, [stores]);

  // ─── ACTIVE STORES (exclude test data) ──────────────────
  const activeStores = useMemo(() => {
    const storeIdsWithData = new Set(allAffiliateData.map((d) => d.storeId));
    return stores.filter(
      (s) => storeIdsWithData.has(s.id) && !["toko", "toko2"].includes(s.name)
    );
  }, [stores, allAffiliateData]);

  // ─── PERIOD SELECTOR (chronological sort) ─────────────
  const allPeriods = useMemo(
    () => [...new Set(allAffiliateData.map((d) => d.period))].sort((a, b) => {
      const pa = a.match(/(\d{4})-(\d{2})/);
      const pb = b.match(/(\d{4})-(\d{2})/);
      if (pa && pb) return a.localeCompare(b);
      // fallback: parse as date
      return new Date(a + "-01").getTime() - new Date(b + "-01").getTime();
    }),
    [allAffiliateData]
  );
  const latestPeriod = allPeriods[allPeriods.length - 1] || "";
  const [selectedPeriod, setSelectedPeriod] = useState("");

  useEffect(() => {
    if (!selectedPeriod && latestPeriod) setSelectedPeriod(latestPeriod);
  }, [latestPeriod, selectedPeriod]);

  const activePeriod = selectedPeriod || latestPeriod;

  // ─── PERIOD SUMMARIES (gabungan semua toko, 1 periode) ──
  const periodSummaries = useMemo(
    () => allAffiliateData.filter((d) => d.period === activePeriod),
    [allAffiliateData, activePeriod]
  );

  // ─── KPI CALCULATIONS ──────────────────────────────────
  const agg = useMemo(() => {
    const totalGMV = periodSummaries.reduce((a, d) => a + (d.summary.totalGMV || 0), 0);
    const totalRefund = periodSummaries.reduce((a, d) => a + (d.summary.totalRefundedGMV || 0), 0);
    const totalOrders = periodSummaries.reduce((a, d) => a + (d.summary.totalOrders || 0), 0);
    const totalVideos = periodSummaries.reduce((a, d) => a + (d.summary.totalVideos || 0), 0);
    const totalLive = periodSummaries.reduce((a, d) => a + (d.summary.totalLive || 0), 0);
    const totalCommission = periodSummaries.reduce((a, d) => a + (d.summary.totalCommission || 0), 0);
    const videoGMV = periodSummaries.reduce((a, d) => a + (d.summary.videoGMV || 0), 0);
    const liveGMV = periodSummaries.reduce((a, d) => a + (d.summary.liveGMV || 0), 0);
    const productCardGMV = periodSummaries.reduce((a, d) => a + (d.summary.productCardGMV || 0), 0);
    const activeCreators = periodSummaries.reduce((a, d) => a + (d.summary.activeCreators || 0), 0);
    const totalCreators = periodSummaries.reduce((a, d) => a + (d.summary.totalCreators || 0), 0);
    const refundRate = totalGMV > 0 ? (totalRefund / totalGMV) * 100 : 0;
    const netGMV = totalGMV - totalRefund;
    const netAfterComm = netGMV - totalCommission;
    const aov = totalOrders > 0 ? totalGMV / totalOrders : 0;
    const commRate = totalGMV > 0 ? (totalCommission / totalGMV) * 100 : 0;

    return {
      totalGMV, totalRefund, totalOrders, totalVideos, totalLive,
      totalCommission, videoGMV, liveGMV, productCardGMV,
      activeCreators, totalCreators, refundRate, netGMV, netAfterComm, aov, commRate,
    };
  }, [periodSummaries]);

  // ─── MoM COMPARISON ─────────────────────────────────────
  const prevPeriod = useMemo(() => {
    const idx = allPeriods.indexOf(activePeriod);
    return idx > 0 ? allPeriods[idx - 1] : null;
  }, [allPeriods, activePeriod]);

  const momGrowth = useMemo(() => {
    if (!prevPeriod) return null;
    const prevGMV = allAffiliateData
      .filter((d) => d.period === prevPeriod)
      .reduce((a, d) => a + (d.summary.totalGMV || 0), 0);
    return prevGMV > 0 ? ((agg.totalGMV - prevGMV) / prevGMV) * 100 : null;
  }, [prevPeriod, allAffiliateData, agg.totalGMV]);

  // ─── TARGET (Supabase) ──────────────────────────────
  const getTarget = useCallback(async (period: string) => {
    try {
      const res = await fetch(`/api/target?period=${period}&type=gmv`);
      const data = await res.json();
      return data.target_value || 0;
    } catch {
      return 0;
    }
  }, []);

  const [targetGMV, setTargetGMV] = useState(0);

  useEffect(() => {
    getTarget(activePeriod).then(setTargetGMV);
  }, [activePeriod, targetVersion, getTarget]);
  const targetProgress = targetGMV > 0 ? (agg.totalGMV / targetGMV) * 100 : 0;
  const targetRemaining = Math.max(0, targetGMV - agg.totalGMV);

  // ─── CREATORS (load from Supabase directly) ───────────
  const [supabaseCreators, setSupabaseCreators] = useState<AffiliateCreatorItem[]>([]);
  const [creatorsLoading, setCreatorsLoading] = useState(false);

  useEffect(() => {
    if (!activeStores.length || !activePeriod) return;
    let cancelled = false;
    async function fetchAll() {
      setCreatorsLoading(true);
      try {
        const results = await Promise.all(
          activeStores.map((s) => loadAffiliateCreators(s.id, activePeriod).catch(() => [] as AffiliateCreatorItem[]))
        );
        if (!cancelled) {
          const combined = results.flat();
          console.log("=== DEBUG KREATOR ===");
          console.log("Loaded from Supabase:", combined.length, "creators for period", activePeriod);
          console.log("Stores queried:", activeStores.map((s) => s.name));
          setSupabaseCreators(combined);
        }
      } catch (err) {
        console.error("Failed to load creators:", err);
        if (!cancelled) setSupabaseCreators([]);
      } finally {
        if (!cancelled) setCreatorsLoading(false);
      }
    }
    fetchAll();
    return () => { cancelled = true; };
  }, [activeStores, activePeriod]);

  const periodCreators = useMemo(() => {
    return supabaseCreators
      .filter((c) => (c.affiliateGMV || 0) > 0)
      .sort((a, b) => b.affiliateGMV - a.affiliateGMV);
  }, [supabaseCreators]);

  const allCreatorsPeriod = supabaseCreators;

  const top5Creators = periodCreators.slice(0, 5);

  const highRefundCreators = useMemo(
    () => periodCreators.filter((c) => c.refundRate > 50 && c.affiliateGMV > 500000),
    [periodCreators]
  );

  const dormantCount = allCreatorsPeriod.filter((c) => c.affiliateGMV === 0).length;
  const dormantRate = allCreatorsPeriod.length > 0 ? (dormantCount / allCreatorsPeriod.length) * 100 : 0;

  // ─── SEGMENTATION ──────────────────────────────────────
  const segmentasi = useMemo(() => {
    if (!periodCreators.length) return { bintang: [] as AffiliateCreatorItem[], efisien: [] as AffiliateCreatorItem[], potensi: [] as AffiliateCreatorItem[], perluDorong: [] as AffiliateCreatorItem[] };
    const avgGMV = periodCreators.reduce((a, c) => a + c.affiliateGMV, 0) / periodCreators.length;
    const bintang: AffiliateCreatorItem[] = [];
    const efisien: AffiliateCreatorItem[] = [];
    const potensi: AffiliateCreatorItem[] = [];
    const perluDorong: AffiliateCreatorItem[] = [];

    allCreatorsPeriod.forEach((c) => {
      const hasContent = (c.affiliateShoppableVideos || 0) + (c.affiliateLiveStreams || 0) >= 1;
      const highGMV = c.affiliateGMV >= avgGMV && c.affiliateGMV > 0;
      if (highGMV && hasContent) bintang.push(c);
      else if (highGMV && !hasContent) efisien.push(c);
      else if (!highGMV && c.affiliateGMV > 0 && hasContent) potensi.push(c);
      else perluDorong.push(c);
    });

    return { bintang, efisien, potensi, perluDorong };
  }, [periodCreators, allCreatorsPeriod]);

  // ─── ALERTS ─────────────────────────────────────────────
  const alerts = useMemo(() => {
    const list: Alert[] = [];

    if (agg.refundRate > 20) {
      list.push({
        type: "error", icon: "🚨", title: "Refund Rate Tinggi",
        message: `Refund affiliate mencapai ${fP(agg.refundRate)} — jauh di atas batas aman 15%. Cek kreator bermasalah.`,
        action: { label: "Lihat Kreator", tab: "affiliate" },
      });
    }

    if (targetGMV > 0 && targetProgress >= 100) {
      list.push({
        type: "success", icon: "🎉", title: `Target ${formatPeriod(activePeriod)} Tercapai! ${fP(targetProgress)}`,
        message: `GMV ${fRp(agg.totalGMV)} melampaui target ${fRp(targetGMV)}.`,
      });
    }

    if (targetGMV > 0 && targetProgress >= 80 && targetProgress < 100) {
      list.push({
        type: "info", icon: "🎯", title: "Target Hampir Tercapai!",
        message: `${fP(targetProgress)} tercapai. Sisa ${fRp(targetRemaining)} lagi.`,
        action: { label: "Lihat Detail", tab: "affiliate" },
      });
    }

    if (momGrowth !== null && momGrowth < -20) {
      list.push({
        type: "warning", icon: "📉", title: "GMV Turun Signifikan",
        message: `GMV turun ${Math.abs(momGrowth).toFixed(1)}% dibanding ${formatPeriod(prevPeriod || "")}. Perlu investigasi.`,
        action: { label: "Lihat Tren", tab: "affiliate" },
      });
    }

    if (dormantRate > 85) {
      list.push({
        type: "warning", icon: "😴", title: "Kreator Dormant Sangat Tinggi",
        message: `${fP(dormantRate)} kreator (${dormantCount} orang) tidak menghasilkan GMV. Pertimbangkan reaktivasi.`,
        action: { label: "Lihat Segmentasi", tab: "affiliate" },
      });
    }

    if (highRefundCreators.length > 0) {
      list.push({
        type: "warning", icon: "⚠️", title: `${highRefundCreators.length} Kreator Refund Ekstrem`,
        message: `${highRefundCreators.slice(0, 3).map((c) => "@" + c.creatorUsername).join(", ")} refund >50%. Perlu investigasi segera.`,
        action: { label: "Investigasi", tab: "affiliate" },
      });
    }

    return list;
  }, [agg, targetGMV, targetProgress, targetRemaining, activePeriod, momGrowth, prevPeriod, dormantRate, dormantCount, highRefundCreators]);

  const visibleAlerts = alerts.filter((_, i) => !dismissedAlerts.includes(i));
  const dismissAlert = useCallback((i: number) => {
    setDismissedAlerts((prev) => [...prev, i]);
  }, []);

  // ─── DAILY AVERAGES ───────────────────────────────────
  const dailyAvg = useMemo(() => {
    const days = 30;
    return {
      revenuePerDay: agg.totalGMV / days,
      ordersPerDay: agg.totalOrders / days,
      contentPerDay: (agg.totalVideos + agg.totalLive) / days,
      gmvPerVideo: agg.totalVideos > 0 ? agg.videoGMV / agg.totalVideos : 0,
      gmvPerLive: agg.totalLive > 0 ? agg.liveGMV / agg.totalLive : 0,
      gmvPerCreator: agg.activeCreators > 0 ? agg.totalGMV / agg.activeCreators : 0,
    };
  }, [agg]);

  // ─── TREND DATA ───────────────────────────────────────
  const trendData = useMemo(() => {
    return allPeriods.map((period) => {
      const ps = allAffiliateData.filter((d) => d.period === period);
      const gabGMV = ps.reduce((a, d) => a + (d.summary.totalGMV || 0), 0);
      const gabRefund = ps.reduce((a, d) => a + (d.summary.totalRefundedGMV || 0), 0);
      const row: Record<string, string | number> = {
        period: formatPeriod(period),
        Gabungan: parseFloat((gabGMV / 1e6).toFixed(1)),
        Gabungan_refund: parseFloat((gabGMV > 0 ? (gabRefund / gabGMV) * 100 : 0).toFixed(1)),
      };
      activeStores.forEach((store) => {
        const s = ps.find((x) => x.storeId === store.id);
        row[store.name] = s ? parseFloat(((s.summary.totalGMV || 0) / 1e6).toFixed(1)) : 0;
        row[store.name + "_refund"] = s ? parseFloat(((s.summary.refundRate || 0)).toFixed(1)) : 0;
      });
      return row;
    });
  }, [allAffiliateData, allPeriods, activeStores]);

  // ─── STORE BREAKDOWN ────────────────────────────────────
  const storeBreakdown = useMemo(() => {
    return activeStores.map((store) => {
      const s = periodSummaries.find((x) => x.storeId === store.id);
      const sm = s?.summary;
      return {
        store,
        gmv: sm?.totalGMV || 0,
        netGMV: (sm?.totalGMV || 0) - (sm?.totalRefundedGMV || 0),
        refund: sm?.totalRefundedGMV || 0,
        refundRate: sm?.refundRate || 0,
        orders: sm?.totalOrders || 0,
        videos: sm?.totalVideos || 0,
        live: sm?.totalLive || 0,
        creators: sm?.activeCreators || 0,
        commission: sm?.totalCommission || 0,
        videoGMV: sm?.videoGMV || 0,
        liveGMV: sm?.liveGMV || 0,
        productCardGMV: sm?.productCardGMV || 0,
        share: agg.totalGMV > 0 ? ((sm?.totalGMV || 0) / agg.totalGMV) * 100 : 0,
      };
    })
    .filter((s) => s.gmv > 0)
    .sort((a, b) => b.gmv - a.gmv);
  }, [activeStores, periodSummaries, agg.totalGMV]);

  // ─── CHANNEL DATA ───────────────────────────────────────
  const channelData = useMemo(() => [
    { name: "Video Shoppable", value: agg.videoGMV, color: "#1a237e" },
    { name: "Product Card", value: agg.productCardGMV, color: "#00bcd4" },
    { name: "LIVE Stream", value: agg.liveGMV, color: "#ff6b35" },
  ].filter((d) => d.value > 0), [agg]);

  // ─── GREETING ───────────────────────────────────────────
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 11) return "Selamat Pagi";
    if (hour < 15) return "Selamat Siang";
    if (hour < 18) return "Selamat Sore";
    return "Selamat Malam";
  }, []);

  const dateStr = useMemo(
    () => new Date().toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" }),
    []
  );

  // ─── KPI CARDS ──────────────────────────────────────────
  const kpiCards = useMemo(() => [
    {
      id: "gmv", label: "Total GMV", value: fRp(agg.totalGMV),
      sub: momGrowth !== null
        ? `${momGrowth >= 0 ? "↑" : "↓"} ${Math.abs(momGrowth).toFixed(1)}% vs ${formatPeriod(prevPeriod || "")}`
        : "Periode pertama",
      subOk: momGrowth === null || momGrowth >= 0,
      icon: "💰", color: "blue", tab: "affiliate",
    },
    {
      id: "netgmv", label: "Net GMV (setelah refund)", value: fRp(agg.netGMV),
      sub: `Refund ${fRp(agg.totalRefund)} (${fP(agg.refundRate)})`,
      subOk: agg.refundRate <= 15,
      icon: "✅", color: "green", tab: "affiliate",
    },
    {
      id: "netcomm", label: "Net Setelah Komisi", value: fRp(agg.netAfterComm),
      sub: `Komisi ${fRp(agg.totalCommission)} (${fP(agg.commRate)})`,
      subOk: true,
      icon: "💳", color: "teal", tab: "affiliate",
    },
    {
      id: "orders", label: "Total Pesanan", value: fN(agg.totalOrders),
      sub: `AOV ${fRp(agg.aov)} per pesanan`,
      subOk: true,
      icon: "🛒", color: "purple", tab: "affiliate",
    },
    {
      id: "creators", label: "Kreator Aktif", value: fN(agg.activeCreators),
      sub: `dari ${fN(agg.totalCreators)} terdaftar (${agg.totalCreators > 0 ? fP((agg.activeCreators / agg.totalCreators) * 100) : "0%"})`,
      subOk: agg.totalCreators > 0 ? (agg.activeCreators / agg.totalCreators) * 100 >= 5 : true,
      icon: "🎥", color: "orange", tab: "affiliate",
    },
    {
      id: "videos", label: "Konten Dibuat", value: fN(agg.totalVideos + agg.totalLive),
      sub: `${fN(agg.totalVideos)} video + ${fN(agg.totalLive)} LIVE`,
      subOk: true,
      icon: "📹", color: "indigo", tab: "video-performance",
    },
    {
      id: "refund", label: "Refund Rate", value: fP(agg.refundRate),
      sub: agg.refundRate > 20 ? "🔴 Di atas batas aman (15%)" : agg.refundRate > 10 ? "🟡 Perlu dipantau" : "🟢 Aman",
      subOk: agg.refundRate <= 15,
      icon: "↩️", color: agg.refundRate > 20 ? "red" : agg.refundRate > 10 ? "yellow" : "gray",
      tab: "affiliate",
    },
    {
      id: "target", label: "Progress Target",
      value: targetGMV > 0 ? fP(targetProgress) : "Belum diset",
      sub: targetGMV > 0
        ? (targetProgress >= 100
            ? `🎉 Tercapai! ${fRp(agg.totalGMV)} / ${fRp(targetGMV)}`
            : `Sisa ${fRp(targetRemaining)} lagi`)
        : "Klik untuk set target",
      subOk: targetProgress >= 100 || targetGMV === 0,
      icon: "🎯", color: targetProgress >= 100 ? "green" : targetProgress >= 70 ? "yellow" : "red",
      tab: "",
    },
  ], [agg, momGrowth, prevPeriod, targetGMV, targetProgress, targetRemaining]);

  // ─── QUICK ACTIONS ──────────────────────────────────────
  const quickActions = [
    { icon: "📤", label: "Upload Data", desc: "Import Excel TikTok / Tokopedia", tab: "gmv-upload", color: "bg-blue-600 hover:bg-blue-700" },
    { icon: "📄", label: "Generate Laporan", desc: "Export PDF atau Excel", tab: "report-builder", color: "bg-indigo-600 hover:bg-indigo-700" },
    { icon: "🎥", label: "Performa Video", desc: "Analisis konten kreator", tab: "video-performance", color: "bg-purple-600 hover:bg-purple-700" },
    { icon: "🎯", label: "GMV Max", desc: "Iklan & creative performance", tab: "gmv-creative", color: "bg-orange-500 hover:bg-orange-600" },
  ];

  // ─── COLOR MAP ──────────────────────────────────────────
  const colorMap: Record<string, { bg: string; icon: string; text: string; border: string }> = {
    blue: { bg: "bg-blue-50", icon: "bg-blue-100", text: "text-blue-700", border: "border-blue-100" },
    green: { bg: "bg-green-50", icon: "bg-green-100", text: "text-green-700", border: "border-green-100" },
    purple: { bg: "bg-purple-50", icon: "bg-purple-100", text: "text-purple-700", border: "border-purple-100" },
    orange: { bg: "bg-orange-50", icon: "bg-orange-100", text: "text-orange-700", border: "border-orange-100" },
    teal: { bg: "bg-teal-50", icon: "bg-teal-100", text: "text-teal-700", border: "border-teal-100" },
    yellow: { bg: "bg-yellow-50", icon: "bg-yellow-100", text: "text-yellow-700", border: "border-yellow-100" },
    indigo: { bg: "bg-indigo-50", icon: "bg-indigo-100", text: "text-indigo-700", border: "border-indigo-100" },
    red: { bg: "bg-red-50", icon: "bg-red-100", text: "text-red-700", border: "border-red-100" },
    gray: { bg: "bg-gray-50", icon: "bg-gray-100", text: "text-gray-600", border: "border-gray-100" },
  };

  // ═══════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════
  return (
    <div className="space-y-6">

      {/* ═══ ZONA 1: HEADER + PERIOD SELECTOR ═══ */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{greeting}, Kak 👋</h1>
          <p className="text-sm text-gray-500 mt-1">
            {dateStr} — {activeStores.map((s) => s.name).join(" & ")}
          </p>
        </div>
        {allPeriods.length > 0 && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-gray-400">Periode:</span>
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1 flex-wrap">
              {allPeriods.map((period) => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
                    activePeriod === period
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {formatPeriod(period)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ═══ ZONA 2: ALERT BANNERS ═══ */}
      {visibleAlerts.length > 0 && (
        <div className="space-y-2">
          {visibleAlerts.map((alert, i) => {
            const origIdx = alerts.indexOf(alert);
            return (
              <div
                key={i}
                className={`flex items-start gap-3 p-4 rounded-xl border ${
                  alert.type === "error" ? "bg-red-50 border-red-200" :
                  alert.type === "warning" ? "bg-yellow-50 border-yellow-200" :
                  alert.type === "success" ? "bg-green-50 border-green-200" :
                  "bg-blue-50 border-blue-200"
                }`}
              >
                <span className="text-xl flex-shrink-0 mt-0.5">{alert.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-semibold ${
                    alert.type === "error" ? "text-red-800" :
                    alert.type === "warning" ? "text-yellow-800" :
                    alert.type === "success" ? "text-green-800" :
                    "text-blue-800"
                  }`}>{alert.title}</div>
                  <div className={`text-xs mt-0.5 ${
                    alert.type === "error" ? "text-red-600" :
                    alert.type === "warning" ? "text-yellow-600" :
                    alert.type === "success" ? "text-green-600" :
                    "text-blue-600"
                  }`}>{alert.message}</div>
                </div>
                {alert.action && (
                  <button
                    onClick={() => onNavigate(alert.action!.tab)}
                    className={`text-xs font-medium px-3 py-1.5 rounded-lg flex-shrink-0 ${
                      alert.type === "error" ? "bg-red-100 text-red-700 hover:bg-red-200" :
                      alert.type === "warning" ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200" :
                      alert.type === "success" ? "bg-green-100 text-green-700 hover:bg-green-200" :
                      "bg-blue-100 text-blue-700 hover:bg-blue-200"
                    }`}
                  >
                    {alert.action.label} →
                  </button>
                )}
                <button
                  onClick={() => dismissAlert(origIdx)}
                  className="text-gray-400 hover:text-gray-600 flex-shrink-0 text-lg leading-none"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ ZONA 3: KPI GABUNGAN ═══ */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          📊 Ringkasan {formatPeriod(activePeriod)} — Gabungan Semua Toko
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiCards.map((card) => {
            const c = colorMap[card.color] || colorMap.gray;
            return (
              <button
                key={card.id}
                onClick={() => {
                  if (card.id === "target") {
                    document.getElementById("target-section")?.scrollIntoView({ behavior: "smooth" });
                  } else if (card.tab) {
                    onNavigate(card.tab);
                  }
                }}
                className={`text-left ${c.bg} border ${c.border} rounded-2xl p-4 hover:shadow-md transition group`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`${c.icon} rounded-xl p-2.5 text-xl`}>{card.icon}</div>
                  <span className="text-xs text-gray-400 group-hover:text-gray-600 transition">→</span>
                </div>
                <div className={`text-2xl font-bold ${c.text} mb-1`}>{card.value}</div>
                <div className="text-xs text-gray-500 font-medium">{card.label}</div>
                <div className={`text-xs mt-1 ${card.subOk ? "text-green-600" : "text-red-500"}`}>{card.sub}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══ ZONA 3.5: RATA-RATA HARIAN ═══ */}
      {agg.totalGMV > 0 && (
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Omset/Hari", value: fRp(dailyAvg.revenuePerDay), icon: "📅" },
            { label: "Pesanan/Hari", value: fN(Math.round(dailyAvg.ordersPerDay)), icon: "🛒" },
            { label: "Konten/Hari", value: fN(Math.round(dailyAvg.contentPerDay)), icon: "📹" },
            { label: "GMV/Video", value: fRp(dailyAvg.gmvPerVideo), icon: "🎬" },
            { label: "GMV/LIVE", value: fRp(dailyAvg.gmvPerLive), icon: "🔴" },
            { label: "GMV/Kreator", value: fRp(dailyAvg.gmvPerCreator), icon: "👤" },
          ].map((item) => (
            <div key={item.label} className="bg-white border border-gray-100 rounded-xl p-3 text-center">
              <div className="text-lg mb-1">{item.icon}</div>
              <div className="text-sm font-bold text-gray-900">{item.value}</div>
              <div className="text-xs text-gray-400 mt-0.5">{item.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ═══ ZONA 4: TREND CHART ═══ */}
      {trendData.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                Tren {chartMetric === "gmv" ? "GMV" : "Refund Rate"} Bulanan
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {chartMetric === "gmv" ? "dalam juta rupiah" : "dalam persen"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex bg-gray-100 rounded-lg p-1">
                {(["gabungan", "pertoko"] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setChartView(v)}
                    className={`text-xs px-3 py-1.5 rounded-md font-medium transition ${
                      chartView === v ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {v === "gabungan" ? "🔀 Gabungan" : "🏪 Per Toko"}
                  </button>
                ))}
              </div>
              <div className="flex bg-gray-100 rounded-lg p-1">
                {(["gmv", "refund"] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setChartMetric(v)}
                    className={`text-xs px-3 py-1.5 rounded-md font-medium transition ${
                      chartMetric === v ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {v === "gmv" ? "💰 GMV" : "↩️ Refund"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={trendData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" vertical={false} />
              <XAxis dataKey="period" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                axisLine={false} tickLine={false}
                tickFormatter={(v) => chartMetric === "gmv" ? `${v}Jt` : `${v}%`}
              />
              <Tooltip
                contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}
                formatter={(val: any, name: any) => [
                  chartMetric === "gmv" ? `Rp ${Number(val).toFixed(1)}Jt` : `${Number(val).toFixed(1)}%`,
                  String(name).replace("_refund", ""),
                ]}
              />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }}
                formatter={(name) => String(name).replace("_refund", "")} />
              {chartMetric === "gmv" && targetGMV > 0 && (
                <ReferenceLine
                  y={parseFloat((targetGMV / 1e6).toFixed(1))}
                  stroke="#ef4444" strokeDasharray="4 4"
                  label={{ value: `Target ${fRp(targetGMV)}`, fill: "#ef4444", fontSize: 10 }}
                />
              )}
              {chartView === "gabungan" ? (
                <Line type="monotone"
                  dataKey={chartMetric === "gmv" ? "Gabungan" : "Gabungan_refund"}
                  stroke="#1a237e" strokeWidth={3}
                  dot={{ r: 5, fill: "#1a237e" }}
                  activeDot={{ r: 7, stroke: "white", strokeWidth: 2 }}
                  name="Gabungan"
                  connectNulls
                />
              ) : (
                activeStores.map((store, i) => (
                  <Line
                    key={store.id}
                    type="monotone"
                    dataKey={chartMetric === "gmv" ? store.name : store.name + "_refund"}
                    stroke={STORE_COLORS[i % STORE_COLORS.length]}
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6, stroke: "white", strokeWidth: 2 }}
                    name={store.name}
                    connectNulls
                  />
                ))
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ═══ ZONA 5: KONTRIBUSI PER TOKO ═══ */}
      {storeBreakdown.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            � Kontribusi Per Toko — {formatPeriod(activePeriod)}
          </h2>
          <div className={`grid grid-cols-1 ${storeBreakdown.length >= 2 ? "lg:grid-cols-2" : ""} gap-4`}>
            {storeBreakdown.map((sd, i) => (
              <div key={sd.store.id} className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                      style={{ backgroundColor: STORE_COLORS[i % STORE_COLORS.length] + "20" }}>
                      {sd.store.avatar || "🏪"}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">{sd.store.name}</div>
                      <div className="text-xs text-gray-400">{formatPeriod(activePeriod)}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold" style={{ color: STORE_COLORS[i % STORE_COLORS.length] }}>
                      {fP(sd.share)}
                    </div>
                    <div className="text-xs text-gray-400">kontribusi GMV</div>
                  </div>
                </div>

                <div className="w-full bg-gray-100 rounded-full h-2 mb-4">
                  <div className="h-2 rounded-full transition-all"
                    style={{ width: `${sd.share}%`, backgroundColor: STORE_COLORS[i % STORE_COLORS.length] }} />
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { label: "GMV", value: fRp(sd.gmv) },
                    { label: "Net GMV", value: fRp(sd.netGMV) },
                    { label: "Orders", value: fN(sd.orders) },
                    { label: "Kreator Aktif", value: fN(sd.creators) },
                    { label: "Video", value: fN(sd.videos) },
                    { label: "LIVE", value: fN(sd.live) },
                  ].map((item) => (
                    <div key={item.label} className="text-center p-2 bg-gray-50 rounded-lg">
                      <div className="text-xs text-gray-400 mb-0.5">{item.label}</div>
                      <div className="text-sm font-bold text-gray-800">{item.value}</div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-gray-100 pt-3">
                  <div className="text-xs text-gray-400 mb-2">Kontribusi Channel</div>
                  <div className="space-y-1.5">
                    {[
                      { label: "Video", gmv: sd.videoGMV, color: "#1a237e" },
                      { label: "Product Card", gmv: sd.productCardGMV, color: "#00bcd4" },
                      { label: "LIVE", gmv: sd.liveGMV, color: "#ff6b35" },
                    ].filter((ch) => ch.gmv > 0).map((ch) => (
                      <div key={ch.label} className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 w-20 flex-shrink-0">{ch.label}</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                          <div className="h-1.5 rounded-full"
                            style={{ width: `${sd.gmv > 0 ? (ch.gmv / sd.gmv) * 100 : 0}%`, backgroundColor: ch.color }} />
                        </div>
                        <span className="text-xs font-medium text-gray-700 w-16 text-right">{fRp(ch.gmv)}</span>
                        <span className="text-xs text-gray-400 w-10 text-right">
                          {fP(sd.gmv > 0 ? (ch.gmv / sd.gmv) * 100 : 0)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {sd.refundRate > 15 && (
                  <div className="mt-3 flex items-center gap-2 bg-red-50 rounded-lg px-3 py-2">
                    <span>⚠️</span>
                    <span className="text-xs text-red-600 font-medium">
                      Refund rate {fP(sd.refundRate)} — di atas batas aman
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ ZONA 6: 3-COLUMN SECTION ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Top 5 Kreator */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">🏆 Top 5 Kreator</h3>
            <button onClick={() => onNavigate("affiliate")} className="text-xs text-blue-600 hover:underline">
              Lihat semua →
            </button>
          </div>
          {top5Creators.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">Belum ada data kreator periode ini</p>
          ) : (
            <div className="space-y-3">
              {top5Creators.map((c, i) => {
                const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];
                return (
                  <div key={c.creatorUsername + i} className="flex items-center gap-3">
                    <span className="text-lg w-7 text-center flex-shrink-0">{medals[i]}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">@{c.creatorUsername}</div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                          <div
                            className="bg-blue-500 h-1.5 rounded-full"
                            style={{ width: `${Math.min(100, (c.affiliateGMV / top5Creators[0].affiliateGMV) * 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-400 flex-shrink-0">{fRp(c.affiliateGMV)}</span>
                      </div>
                    </div>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                      c.refundRate > 30 ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"
                    }`}>
                      {c.refundRate > 30 ? "⚠️" : "✅"} {fP(c.refundRate)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Channel Mix Donut */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">📊 Kontribusi Channel</h3>
            <span className="text-xs text-gray-400">{formatPeriod(activePeriod)}</span>
          </div>
          {channelData.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">Belum ada data channel</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie
                    data={channelData}
                    cx="50%" cy="50%"
                    innerRadius={40} outerRadius={60}
                    paddingAngle={3} dataKey="value"
                  >
                    {channelData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [fRp(Number(val)), ""]}
                    contentStyle={{ borderRadius: "8px", fontSize: "12px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-1">
                {channelData.map((ch) => (
                  <div key={ch.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: ch.color }} />
                      <span className="text-gray-600">{ch.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold text-gray-900">{fRp(ch.value)}</span>
                      <span className="text-gray-400 ml-1">
                        {fP(agg.totalGMV > 0 ? (ch.value / agg.totalGMV) * 100 : 0)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Segmentasi Ringkas */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">🗂️ Segmentasi Kreator</h3>
            <button onClick={() => onNavigate("affiliate")} className="text-xs text-blue-600 hover:underline">
              Detail →
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { emoji: "⭐", label: "Bintang", desc: "GMV tinggi + konten aktif", data: segmentasi.bintang, bg: "bg-yellow-50", border: "border-yellow-200", text: "text-yellow-700" },
              { emoji: "💎", label: "Efisien", desc: "GMV tinggi, no konten", data: segmentasi.efisien, bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700" },
              { emoji: "🚀", label: "Potensi", desc: "Ada konten, GMV rendah", data: segmentasi.potensi, bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700" },
              { emoji: "🌱", label: "Perlu Dorong", desc: "Dormant / tidak aktif", data: segmentasi.perluDorong, bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-600" },
            ].map((seg) => (
              <div key={seg.label} className={`${seg.bg} border ${seg.border} rounded-xl p-3`}>
                <div className="text-xl mb-1">{seg.emoji}</div>
                <div className={`text-lg font-bold ${seg.text}`}>{seg.data.length}</div>
                <div className="text-xs font-medium text-gray-700">{seg.label}</div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {fRp(seg.data.reduce((a, c) => a + c.affiliateGMV, 0))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ ZONA 7: TARGET GMV ═══ */}
      <div id="target-section" className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              🎯 Target GMV — {formatPeriod(activePeriod)}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {targetGMV > 0
                ? `Target: ${fRp(targetGMV)} | Tercapai: ${fP(targetProgress)}`
                : "Belum ada target untuk periode ini"}
            </p>
          </div>
          <button
            onClick={() => setShowTargetForm(!showTargetForm)}
            className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-lg font-medium transition"
          >
            {targetGMV > 0 ? "✏️ Edit Target" : "+ Set Target"}
          </button>
        </div>

        {targetGMV > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1.5">
              <span>Progress</span>
              <span>{fRp(agg.totalGMV)} dari {fRp(targetGMV)}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all duration-500 ${
                  targetProgress >= 100 ? "bg-green-500" :
                  targetProgress >= 70 ? "bg-yellow-500" : "bg-red-500"
                }`}
                style={{ width: `${Math.min(100, targetProgress)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs mt-1">
              <span className={
                targetProgress >= 100 ? "text-green-600 font-semibold" :
                targetProgress >= 70 ? "text-yellow-600" : "text-red-500"
              }>
                {targetProgress >= 100
                  ? `🎉 Tercapai ${fP(targetProgress)}!`
                  : `${fP(targetProgress)} — butuh ${fRp(targetRemaining)} lagi`}
              </span>
              <span className="text-gray-400">
                ~{fN(Math.ceil(targetRemaining / (agg.aov || 1)))} pesanan lagi
              </span>
            </div>
          </div>
        )}

        {showTargetForm && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Contoh: 150000000 (= Rp 150Jt)"
                value={targetInput}
                onChange={(e) => setTargetInput(e.target.value)}
                className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={async () => {
                  const val = Number(targetInput);
                  if (val > 0) {
                    await fetch('/api/target', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ period: activePeriod, target_value: val, type: 'gmv' }),
                    });
                    setShowTargetForm(false);
                    setTargetInput("");
                    setTargetVersion((v) => v + 1);
                  }
                }}
                className="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition"
              >
                Simpan
              </button>
              <button
                onClick={() => setShowTargetForm(false)}
                className="border border-gray-200 text-gray-600 px-4 py-2.5 rounded-xl text-sm hover:bg-gray-50 transition"
              >
                Batal
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              💡 Target disimpan per periode. Ganti periode di atas untuk set target periode lain.
            </p>
          </div>
        )}
      </div>

      {/* ═══ ZONA 8: QUICK ACTIONS ═══ */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Akses Cepat
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {quickActions.map((action) => (
            <button
              key={action.label}
              onClick={() => onNavigate(action.tab)}
              className={`${action.color} text-white rounded-xl p-4 flex items-center gap-3 transition cursor-pointer text-left`}
            >
              <span className="flex-shrink-0">{action.icon}</span>
              <div>
                <div className="text-sm font-semibold">{action.label}</div>
                <div className="text-xs opacity-80">{action.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}
