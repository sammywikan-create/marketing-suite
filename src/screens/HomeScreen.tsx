"use client";
import { useState, useMemo, useCallback } from "react";
import { useStoreManager } from "@/store/useStoreManager";
import type { AffiliateMonthData, AffiliateCreatorItem, AffiliateTarget } from "@/lib/types";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
  PieChart, Pie, Cell,
} from "recharts";
import { Upload, FileText, Video, Zap } from "lucide-react";

// ─── HELPERS ──────────────────────────────────────────────
const fRp = (n: number) => "Rp " + Math.round(n).toLocaleString("id-ID");
const fN = (n: number) => Math.round(n).toLocaleString("id-ID");
const fP = (n: number) => n.toFixed(1) + "%";

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
  const { stores, getActiveStore } = useStoreManager();
  const [dismissedAlerts, setDismissedAlerts] = useState<number[]>([]);
  const [activeMetric, setActiveMetric] = useState<"gmv" | "refund">("gmv");

  // ─── AGGREGATE DATA ─────────────────────────────────────
  const allAffiliateData = useMemo(() => {
    const all: AffiliateMonthData[] = [];
    stores.forEach((s) => {
      if (s.affiliateData) all.push(...s.affiliateData);
    });
    return all;
  }, [stores]);

  const currentMonth = useMemo(() => new Date().toISOString().slice(0, 7), []);

  const thisMonthData = useMemo(
    () => allAffiliateData.filter((d) => d.period?.startsWith(currentMonth)),
    [allAffiliateData, currentMonth]
  );

  const lastMonthKey = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 7);
  }, []);

  const lastMonthData = useMemo(
    () => allAffiliateData.filter((d) => d.period?.startsWith(lastMonthKey)),
    [allAffiliateData, lastMonthKey]
  );

  // ─── KPI CALCULATIONS ──────────────────────────────────
  const agg = useMemo(() => {
    const totalGMV = thisMonthData.reduce((a, d) => a + d.summary.totalGMV, 0);
    const totalRefund = thisMonthData.reduce((a, d) => a + d.summary.totalRefundedGMV, 0);
    const totalOrders = thisMonthData.reduce((a, d) => a + d.summary.totalOrders, 0);
    const totalVideos = thisMonthData.reduce((a, d) => a + d.summary.totalVideos, 0);
    const totalLive = thisMonthData.reduce((a, d) => a + d.summary.totalLive, 0);
    const totalCommission = thisMonthData.reduce((a, d) => a + d.summary.totalCommission, 0);
    const videoGMV = thisMonthData.reduce((a, d) => a + d.summary.videoGMV, 0);
    const liveGMV = thisMonthData.reduce((a, d) => a + d.summary.liveGMV, 0);
    const productCardGMV = thisMonthData.reduce((a, d) => a + d.summary.productCardGMV, 0);
    const activeCreators = thisMonthData.reduce((a, d) => a + d.summary.activeCreators, 0);
    const totalCreators = thisMonthData.reduce((a, d) => a + d.summary.totalCreators, 0);
    const refundRate = totalGMV > 0 ? (totalRefund / totalGMV) * 100 : 0;
    const netGMV = totalGMV - totalRefund;

    const lastGMV = lastMonthData.reduce((a, d) => a + d.summary.totalGMV, 0);
    const momGrowth = lastGMV > 0 ? ((totalGMV - lastGMV) / lastGMV) * 100 : 0;

    return {
      totalGMV, totalRefund, totalOrders, totalVideos, totalLive,
      totalCommission, videoGMV, liveGMV, productCardGMV,
      activeCreators, totalCreators, refundRate, netGMV, momGrowth,
    };
  }, [thisMonthData, lastMonthData]);

  // ─── TARGET ─────────────────────────────────────────────
  const target = useMemo(() => {
    let t: AffiliateTarget | null = null;
    for (const s of stores) {
      const targets = s.affiliateTargets || [];
      const found = targets.find((tg) => tg.period === currentMonth || tg.period === "all");
      if (found) { t = found; break; }
    }
    return t;
  }, [stores, currentMonth]);

  const targetGMV = target?.targetGMV || 0;
  const targetProgress = targetGMV > 0 ? (agg.totalGMV / targetGMV) * 100 : 0;
  const targetRemaining = Math.max(0, targetGMV - agg.totalGMV);

  // ─── CREATORS ───────────────────────────────────────────
  const thisMonthCreators = useMemo(() => {
    const all: AffiliateCreatorItem[] = [];
    thisMonthData.forEach((d) => {
      d.creators.forEach((c) => {
        if (c.affiliateGMV > 0) all.push(c);
      });
    });
    return all.sort((a, b) => b.affiliateGMV - a.affiliateGMV);
  }, [thisMonthData]);

  const top5Creators = thisMonthCreators.slice(0, 5);

  const highRefundCreators = useMemo(
    () => thisMonthCreators.filter((c) => c.refundRate > 50 && c.affiliateGMV > 500000),
    [thisMonthCreators]
  );

  // Dormant
  const allCreatorsThisMonth = useMemo(() => {
    const all: AffiliateCreatorItem[] = [];
    thisMonthData.forEach((d) => all.push(...d.creators));
    return all;
  }, [thisMonthData]);
  const dormantCount = allCreatorsThisMonth.filter((c) => c.affiliateGMV === 0).length;
  const dormantRate = allCreatorsThisMonth.length > 0 ? (dormantCount / allCreatorsThisMonth.length) * 100 : 0;

  // ─── SEGMENTATION ──────────────────────────────────────
  const segmentasi = useMemo(() => {
    const avgGMV = thisMonthCreators.length > 0
      ? thisMonthCreators.reduce((a, c) => a + c.affiliateGMV, 0) / thisMonthCreators.length
      : 0;
    const bintang: AffiliateCreatorItem[] = [];
    const efisien: AffiliateCreatorItem[] = [];
    const potensi: AffiliateCreatorItem[] = [];
    const perluDorong: AffiliateCreatorItem[] = [];

    allCreatorsThisMonth.forEach((c) => {
      const hasContent = (c.affiliateShoppableVideos || 0) + (c.affiliateLiveStreams || 0) >= 1;
      const highGMV = c.affiliateGMV >= avgGMV && c.affiliateGMV > 0;
      if (highGMV && hasContent) bintang.push(c);
      else if (highGMV && !hasContent) efisien.push(c);
      else if (!highGMV && hasContent) potensi.push(c);
      else perluDorong.push(c);
    });

    return { bintang, efisien, potensi, perluDorong };
  }, [thisMonthCreators, allCreatorsThisMonth]);

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

    if (targetProgress >= 80 && targetProgress < 100) {
      list.push({
        type: "info", icon: "🎯", title: "Target Hampir Tercapai!",
        message: `GMV bulan ini ${fP(targetProgress)} dari target. Tinggal ${fRp(targetRemaining)} lagi.`,
        action: { label: "Lihat Target", tab: "affiliate" },
      });
    }

    if (targetProgress >= 100) {
      list.push({
        type: "success", icon: "🎉", title: `Target Bulan Ini Tercapai! ${fP(targetProgress)}`,
        message: `GMV ${fRp(agg.totalGMV)} melampaui target ${fRp(targetGMV)}. Luar biasa!`,
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
  }, [agg, targetProgress, targetRemaining, targetGMV, dormantRate, dormantCount, highRefundCreators]);

  const visibleAlerts = alerts.filter((_, i) => !dismissedAlerts.includes(i));
  const dismissAlert = useCallback((i: number) => {
    setDismissedAlerts((prev) => [...prev, i]);
  }, []);

  // ─── TREND DATA ─────────────────────────────────────────
  const trendData = useMemo(() => {
    const periodMap: Record<string, Record<string, number>> = {};

    allAffiliateData.forEach((d) => {
      const period = d.period?.slice(0, 7) || "";
      if (!period) return;
      if (!periodMap[period]) periodMap[period] = {};
      const storeName = stores.find((s) => s.id === d.storeId)?.name || "Toko";
      periodMap[period][storeName] = (periodMap[period][storeName] || 0) + d.summary.totalGMV / 1_000_000;
      periodMap[period][storeName + "_refund"] = d.summary.refundRate;
    });

    return Object.entries(periodMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, vals]) => ({ period: period.slice(2), ...vals }));
  }, [allAffiliateData, stores]);

  const storeNames = useMemo(() => stores.map((s) => s.name), [stores]);
  const STORE_COLORS = ["#1a237e", "#00bcd4", "#ff6b35", "#7c3aed"];

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
      id: "gmv", label: "Total GMV Bulan Ini", value: fRp(agg.totalGMV),
      sub: `${agg.momGrowth >= 0 ? "↑" : "↓"} ${Math.abs(agg.momGrowth).toFixed(1)}% vs bulan lalu`,
      subColor: agg.momGrowth >= 0 ? "text-green-600" : "text-red-500",
      icon: "💰", color: "blue" as const, tab: "affiliate",
    },
    {
      id: "netgmv", label: "Net GMV (Setelah Refund)", value: fRp(agg.netGMV),
      sub: `Refund ${fRp(agg.totalRefund)} (${fP(agg.refundRate)})`,
      subColor: agg.refundRate > 15 ? "text-red-500" : "text-green-600",
      icon: "✅", color: "green" as const, tab: "affiliate",
    },
    {
      id: "orders", label: "Total Pesanan", value: fN(agg.totalOrders),
      sub: `AOV ${fRp(agg.totalOrders > 0 ? agg.totalGMV / agg.totalOrders : 0)}`,
      subColor: "text-gray-500", icon: "🛒", color: "purple" as const, tab: "affiliate",
    },
    {
      id: "creators", label: "Kreator Aktif", value: fN(agg.activeCreators),
      sub: `${agg.totalCreators > 0 ? fP((agg.activeCreators / agg.totalCreators) * 100) : "0%"} dari ${fN(agg.totalCreators)} terdaftar`,
      subColor: "text-gray-500", icon: "🎥", color: "orange" as const, tab: "affiliate",
    },
    {
      id: "commission", label: "Total Komisi", value: fRp(agg.totalCommission),
      sub: `${fP(agg.totalGMV > 0 ? (agg.totalCommission / agg.totalGMV) * 100 : 0)} dari GMV`,
      subColor: "text-gray-500", icon: "💳", color: "teal" as const, tab: "affiliate",
    },
    {
      id: "target", label: "Progress Target", value: targetGMV > 0 ? fP(targetProgress) : "—",
      sub: targetGMV > 0 ? `${fRp(agg.totalGMV)} / ${fRp(targetGMV)}` : "Belum set target",
      subColor: targetProgress >= 100 ? "text-green-600" : targetProgress >= 70 ? "text-yellow-600" : "text-red-500",
      icon: "🎯", color: targetProgress >= 100 ? "green" : "yellow", tab: "affiliate",
    },
    {
      id: "videos", label: "Total Konten Kreator", value: fN(agg.totalVideos + agg.totalLive),
      sub: `${fN(agg.totalVideos)} video + ${fN(agg.totalLive)} LIVE`,
      subColor: "text-gray-500", icon: "📹", color: "indigo" as const, tab: "video-performance",
    },
    {
      id: "refund", label: "Refund Rate", value: fP(agg.refundRate),
      sub: agg.refundRate > 20 ? "⚠️ Melebihi batas aman" : agg.refundRate > 10 ? "🟡 Perlu dipantau" : "🟢 Aman",
      subColor: agg.refundRate > 20 ? "text-red-500" : agg.refundRate > 10 ? "text-yellow-600" : "text-green-600",
      icon: "↩️", color: agg.refundRate > 20 ? "red" : "gray", tab: "affiliate",
    },
  ], [agg, targetGMV, targetProgress]);

  // ─── CHANNEL DATA ───────────────────────────────────────
  const channelData = useMemo(() => [
    { name: "Video", value: agg.videoGMV, color: "#1a237e" },
    { name: "Product Card", value: agg.productCardGMV, color: "#00bcd4" },
    { name: "LIVE", value: agg.liveGMV, color: "#ff6b35" },
  ].filter((d) => d.value > 0), [agg]);

  // ─── QUICK ACTIONS ──────────────────────────────────────
  const quickActions = useMemo(() => [
    { icon: <Upload className="w-5 h-5" />, label: "Upload Data", desc: "Import Excel TikTok / Tokopedia", tab: "gmv-upload", color: "bg-blue-600 hover:bg-blue-700" },
    { icon: <FileText className="w-5 h-5" />, label: "Generate Laporan", desc: "Export PDF atau Excel", tab: "report-builder", color: "bg-indigo-600 hover:bg-indigo-700" },
    { icon: <Video className="w-5 h-5" />, label: "Performa Video", desc: "Analisis konten kreator", tab: "video-performance", color: "bg-purple-600 hover:bg-purple-700" },
    { icon: <Zap className="w-5 h-5" />, label: "GMV Max", desc: "Iklan & creative performance", tab: "gmv-creative", color: "bg-orange-500 hover:bg-orange-600" },
  ], []);

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
      {/* ─── BAGIAN 1: GREETING ─── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {greeting}, Kak 👋
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {dateStr} — {stores.map((s) => s.name).join(" + ")}
        </p>
      </div>

      {/* ─── BAGIAN 2: ALERT BANNERS ─── */}
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

      {/* ─── BAGIAN 3: KPI CARDS ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card) => {
          const c = colorMap[card.color] || colorMap.gray;
          return (
            <button
              key={card.id}
              onClick={() => onNavigate(card.tab)}
              className={`text-left ${c.bg} border ${c.border} rounded-2xl p-4 hover:shadow-md transition group`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`${c.icon} rounded-xl p-2.5 text-xl`}>
                  {card.icon}
                </div>
                <span className="text-xs text-gray-400 group-hover:text-gray-600 transition">→</span>
              </div>
              <div className={`text-2xl font-bold ${c.text} mb-1`}>{card.value}</div>
              <div className="text-xs text-gray-500 font-medium">{card.label}</div>
              <div className={`text-xs mt-1 ${card.subColor}`}>{card.sub}</div>
            </button>
          );
        })}
      </div>

      {/* ─── BAGIAN 4: TREND CHART ─── */}
      {trendData.length > 1 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Tren GMV Bulanan</h2>
              <p className="text-xs text-gray-400 mt-0.5">Semua toko — dalam juta rupiah</p>
            </div>
            <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
              {(["gmv", "refund"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setActiveMetric(m)}
                  className={`text-xs px-3 py-1.5 rounded-md font-medium transition ${
                    activeMetric === m
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {m === "gmv" ? "💰 GMV" : "↩️ Refund %"}
                </button>
              ))}
            </div>
          </div>

          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={trendData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="period" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                axisLine={false} tickLine={false}
                tickFormatter={(v) => activeMetric === "gmv" ? `${v}Jt` : `${v}%`}
              />
              <Tooltip
                contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}
                formatter={(val: any, name: any) => [
                  activeMetric === "gmv" ? `Rp ${Number(val).toFixed(1)}Jt` : `${Number(val).toFixed(1)}%`,
                  String(name).replace("_refund", ""),
                ]}
              />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }} formatter={(name) => name.replace("_refund", "")} />
              {activeMetric === "gmv" && targetGMV > 0 && (
                <ReferenceLine
                  y={parseFloat((targetGMV / 1_000_000).toFixed(1))}
                  stroke="#ef4444" strokeDasharray="4 4"
                  label={{ value: "Target", fill: "#ef4444", fontSize: 11 }}
                />
              )}
              {storeNames.map((name, i) => (
                <Line
                  key={name}
                  type="monotone"
                  dataKey={activeMetric === "gmv" ? name : name + "_refund"}
                  stroke={STORE_COLORS[i % STORE_COLORS.length]}
                  strokeWidth={2.5}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6, strokeWidth: 2, stroke: "white" }}
                  name={name}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ─── BAGIAN 5: 3-COLUMN SECTION ─── */}
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
            <p className="text-xs text-gray-400 text-center py-8">Belum ada data kreator bulan ini</p>
          ) : (
            <div className="space-y-3">
              {top5Creators.map((c, i) => {
                const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];
                return (
                  <div key={c.creatorUsername} className="flex items-center gap-3">
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
            <span className="text-xs text-gray-400">Bulan ini</span>
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
              { emoji: "⭐", label: "Bintang", desc: "GMV tinggi + konten", data: segmentasi.bintang, bg: "bg-yellow-50", border: "border-yellow-200", text: "text-yellow-700" },
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

      {/* ─── BAGIAN 6: QUICK ACTIONS ─── */}
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
