"use client";
import { useState, useMemo, useCallback, useEffect } from "react";
import { useStoreManager } from "@/store/useStoreManager";
import type { AffiliateMonthData, AffiliateCreatorItem } from "@/lib/types";
import { loadAffiliateCreators } from "@/lib/db";
import { listLaporanHarianPeriods, loadLaporanHarianData } from "@/lib/db";
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
    // Creator activity breakdown
    const activePromoters = periodSummaries.reduce((a, d) => a + (d.summary.activePromoters || 0), 0);
    const videoCreators = periodSummaries.reduce((a, d) => a + (d.summary.videoCreators || 0), 0);
    const liveCreators = periodSummaries.reduce((a, d) => a + (d.summary.liveCreators || 0), 0);
    const bothVideoAndLive = periodSummaries.reduce((a, d) => a + (d.summary.bothVideoAndLive || 0), 0);
    const refundRate = totalGMV > 0 ? (totalRefund / totalGMV) * 100 : 0;
    const netGMV = totalGMV - totalRefund;
    const netAfterComm = netGMV - totalCommission;
    const aov = totalOrders > 0 ? totalGMV / totalOrders : 0;
    const commRate = totalGMV > 0 ? (totalCommission / totalGMV) * 100 : 0;

    return {
      totalGMV, totalRefund, totalOrders, totalVideos, totalLive,
      totalCommission, videoGMV, liveGMV, productCardGMV,
      activeCreators, totalCreators, refundRate, netGMV, netAfterComm, aov, commRate,
      activePromoters, videoCreators, liveCreators, bothVideoAndLive,
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

  // ─── MULTI-TARGET GOALS (Supabase) ──────────────────────
  type GoalsMap = Record<string, number>;
  const [goals, setGoals] = useState<GoalsMap>({});
  const [goalsEditing, setGoalsEditing] = useState(false);
  const [goalsForm, setGoalsForm] = useState<GoalsMap>({});

  useEffect(() => {
    if (!activePeriod) return;
    fetch(`/api/target?period=${activePeriod}&type=all`)
      .then((r) => r.json())
      .then((d) => setGoals(d.targets || {}))
      .catch(() => setGoals({}));
  }, [activePeriod, targetVersion]);

  const targetGMV = goals.gmv || 0;
  const targetProgress = targetGMV > 0 ? (agg.totalGMV / targetGMV) * 100 : 0;
  const targetRemaining = Math.max(0, targetGMV - agg.totalGMV);

  // ─── LAPORAN HARIAN DATA ──────────────────────────────
  const [lhData, setLhData] = useState<any | null>(null);
  const [lhLoading, setLhLoading] = useState(false);

  useEffect(() => {
    if (!activePeriod) return;
    let cancelled = false;
    async function fetchLh() {
      setLhLoading(true);
      try {
        // Cari period Laporan Harian yang cocok dengan periode affiliate aktif
        const periods = await listLaporanHarianPeriods();
        const match = periods.find((p) => p.period === activePeriod);
        const targetPeriod = match ? match.period : (periods[0]?.period || null);
        if (!targetPeriod) { if (!cancelled) setLhData(null); return; }
        const data = await loadLaporanHarianData(targetPeriod);
        if (!cancelled) setLhData(data);
      } catch {
        if (!cancelled) setLhData(null);
      } finally {
        if (!cancelled) setLhLoading(false);
      }
    }
    fetchLh();
    return () => { cancelled = true; };
  }, [activePeriod]);

  // ─── CREATORS (load from Supabase directly) ───────────────────────
  const [supabaseCreators, setSupabaseCreators] = useState<AffiliateCreatorItem[]>([]);
  const [creatorsLoading, setCreatorsLoading] = useState(false);

  // ─── AI EVALUASI ───────────────────────────────────
  const [aiContent, setAiContent] = useState<string>("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string>("");
  const [aiCacheKey, setAiCacheKey] = useState<string>("");
  const [aiSettings, setAiSettings] = useState<any>(null);

  // Load AI settings from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('ai_settings');
      if (raw) setAiSettings(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  const runAiEvaluasi = useCallback(async () => {
    if (!aiSettings) { setAiError('Konfigurasikan AI terlebih dahulu di menu AI Analyst.'); return; }
    const cacheKey = `exec_ai_${activePeriod}_${aiSettings.provider}`;
    if (aiCacheKey === cacheKey && aiContent) return; // already cached
    setAiLoading(true);
    setAiError("");
    try {
      const ch = lhData?.channels || {};
      const s2 = lhData?.summary;
      // Prioritas: summary.total_omzet_fv > evaluasi_per_brand.freshvision > shop_tab > total_omzet
      const displayOmzet =
        (s2?.total_omzet_fv || 0) > 0
          ? (s2!.total_omzet_fv)
          : (lhData?.evaluasi_per_brand?.freshvision || 0) > 0
          ? (lhData.evaluasi_per_brand.freshvision as number)
          : (ch.shop_tab?.total_omzet || 0) > 0
          ? ch.shop_tab!.total_omzet
          : (s2?.total_omzet || 0);
      const res = await fetch('/api/executive-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: aiSettings,
          period: formatPeriod(activePeriod),
          targetGMV,
          targetProgress,
          lh: lhData?.summary ? {
            total_omzet: displayOmzet,
            total_biaya_iklan: lhData.summary.total_biaya_iklan || 0,
            roas: lhData.summary.total_biaya_iklan > 0 ? displayOmzet / lhData.summary.total_biaya_iklan : 0,
            rata_cac_ads: lhData.summary.rata_cac_ads || 0,
            margin_after_cost: displayOmzet - (lhData.summary.total_biaya_iklan || 0) - (lhData.summary.total_komisi_aff || 0),
            total_closing: lhData.summary.total_closing || 0,
            total_botol: lhData.summary.total_botol || 0,
            rata_upsell: lhData.summary.rata_upsell || 0,
            cost_per_closing: lhData.summary.cost_per_closing || 0,
            hari: lhData.summary.hari || 0,
            channels: lhData.channels || {},
          } : null,
          aff: agg.totalGMV > 0 ? {
            totalGMV: agg.totalGMV,
            netGMV: agg.netGMV,
            totalRefund: agg.totalRefund,
            refundRate: agg.refundRate,
            totalOrders: agg.totalOrders,
            activeCreators: agg.activeCreators,
            activePromoters: agg.activePromoters,
            videoCreators: agg.videoCreators,
            liveCreators: agg.liveCreators,
            bothVideoAndLive: agg.bothVideoAndLive,
            totalCreators: agg.totalCreators,
            totalCommission: agg.totalCommission,
            videoGMV: agg.videoGMV,
            liveGMV: agg.liveGMV,
            totalVideos: agg.totalVideos,
            totalLive: agg.totalLive,
            momGrowth: momGrowth,
            topCreator: supabaseCreators.filter(c => (c.affiliateGMV || 0) > 0).sort((a,b) => b.affiliateGMV - a.affiliateGMV)[0]?.creatorUsername || '-',
            topCreatorGMV: supabaseCreators.filter(c => (c.affiliateGMV || 0) > 0).sort((a,b) => b.affiliateGMV - a.affiliateGMV)[0]?.affiliateGMV || 0,
          } : null,
          goals: Object.keys(goals).length > 0 ? goals : null,
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'AI error'); }
      const d = await res.json();
      setAiContent(d.content);
      setAiCacheKey(cacheKey);
    } catch (e: any) {
      setAiError(e.message || 'Gagal menghubungi AI');
    } finally {
      setAiLoading(false);
    }
  }, [aiSettings, activePeriod, aiCacheKey, aiContent, lhData, agg, momGrowth, supabaseCreators, targetGMV, targetProgress]);

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
    const days = lhData?.summary?.hari || 30;
    return {
      revenuePerDay: agg.totalGMV / days,
      ordersPerDay: agg.totalOrders / days,
      contentPerDay: (agg.totalVideos + agg.totalLive) / days,
      gmvPerVideo: agg.totalVideos > 0 ? agg.videoGMV / agg.totalVideos : 0,
      gmvPerLive: agg.totalLive > 0 ? agg.liveGMV / agg.totalLive : 0,
      gmvPerCreator: agg.activePromoters > 0 ? agg.totalGMV / agg.activePromoters : 0,
      days,
    };
  }, [agg, lhData]);

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
        creators: sm?.activePromoters || sm?.activeCreators || 0,
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

  // ─── KPI CARDS (simplified: only 4 most critical) ──────
  const heroCards = useMemo(() => {
    const s = lhData?.summary;
    const ch = lhData?.channels || {};
    const displayOmzet =
      (s?.total_omzet_fv || 0) > 0 ? s!.total_omzet_fv
        : (lhData?.evaluasi_per_brand?.freshvision || 0) > 0 ? (lhData!.evaluasi_per_brand!.freshvision as number)
          : (ch.shop_tab?.total_omzet || 0) > 0 ? ch.shop_tab!.total_omzet
            : (s?.total_omzet || 0);
    const displayRoas = s && s.total_biaya_iklan > 0 ? displayOmzet / s.total_biaya_iklan : 0;
    const daysElapsed = s?.hari || 0;
    const dailyAvgOmzet = daysElapsed > 0 ? displayOmzet / daysElapsed : 0;
    const projectedEOM = dailyAvgOmzet * 30;

    return { displayOmzet, displayRoas, daysElapsed, dailyAvgOmzet, projectedEOM };
  }, [lhData]);

  // ─── MoM COMPARISON (all metrics) ─────────────────────
  const momAll = useMemo(() => {
    if (!prevPeriod) return null;
    const prev = allAffiliateData.filter((d) => d.period === prevPeriod);
    const pGMV = prev.reduce((a, d) => a + (d.summary.totalGMV || 0), 0);
    const pOrders = prev.reduce((a, d) => a + (d.summary.totalOrders || 0), 0);
    const pVideos = prev.reduce((a, d) => a + (d.summary.totalVideos || 0), 0);
    const pLive = prev.reduce((a, d) => a + (d.summary.totalLive || 0), 0);
    const pCreators = prev.reduce((a, d) => a + (d.summary.activePromoters || d.summary.activeCreators || 0), 0);
    const pRefund = prev.reduce((a, d) => a + (d.summary.totalRefundedGMV || 0), 0);
    const pRefundRate = pGMV > 0 ? (pRefund / pGMV) * 100 : 0;
    const pComm = prev.reduce((a, d) => a + (d.summary.totalCommission || 0), 0);
    const g = (curr: number, p: number) => p > 0 ? ((curr - p) / p) * 100 : (curr > 0 ? 100 : 0);
    return {
      gmv: g(agg.totalGMV, pGMV),
      orders: g(agg.totalOrders, pOrders),
      videos: g(agg.totalVideos, pVideos),
      live: g(agg.totalLive, pLive),
      creators: g(agg.activePromoters, pCreators),
      refundRate: agg.refundRate - pRefundRate, // difference in pp
      commission: g(agg.totalCommission, pComm),
      prevPeriodLabel: formatPeriod(prevPeriod),
    };
  }, [prevPeriod, allAffiliateData, agg]);

  // ─── BUSINESS HEALTH SCORE ─────────────────────────────
  const healthScore = useMemo(() => {
    let score = 0;
    let maxScore = 0;

    // 1. Target achievement (30 pts)
    if (targetGMV > 0) {
      maxScore += 30;
      score += Math.min(30, (targetProgress / 100) * 30);
    }

    // 2. Refund rate health (20 pts) — <10% = full, >30% = 0
    maxScore += 20;
    if (agg.refundRate <= 10) score += 20;
    else if (agg.refundRate <= 15) score += 15;
    else if (agg.refundRate <= 20) score += 10;
    else if (agg.refundRate <= 30) score += 5;

    // 3. Creator activity rate (20 pts)
    maxScore += 20;
    const activityRate = agg.totalCreators > 0 ? (agg.activePromoters / agg.totalCreators) * 100 : 0;
    if (activityRate >= 30) score += 20;
    else if (activityRate >= 20) score += 15;
    else if (activityRate >= 10) score += 10;
    else if (activityRate > 0) score += 5;

    // 4. MoM growth (15 pts)
    maxScore += 15;
    if (momGrowth !== null) {
      if (momGrowth >= 20) score += 15;
      else if (momGrowth >= 10) score += 12;
      else if (momGrowth >= 0) score += 10;
      else if (momGrowth >= -10) score += 5;
    } else {
      score += 8; // no previous data, neutral
    }

    // 5. Content productivity (15 pts)
    maxScore += 15;
    const contentCount = agg.totalVideos + agg.totalLive;
    if (contentCount >= 100) score += 15;
    else if (contentCount >= 50) score += 12;
    else if (contentCount >= 20) score += 8;
    else if (contentCount > 0) score += 4;

    const finalScore = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
    const label = finalScore >= 80 ? "Excellent" : finalScore >= 60 ? "Good" : finalScore >= 40 ? "Fair" : "Needs Work";
    const color = finalScore >= 80 ? "text-green-600" : finalScore >= 60 ? "text-blue-600" : finalScore >= 40 ? "text-yellow-600" : "text-red-600";
    const bgColor = finalScore >= 80 ? "from-green-500 to-emerald-600" : finalScore >= 60 ? "from-blue-500 to-indigo-600" : finalScore >= 40 ? "from-yellow-500 to-amber-600" : "from-red-500 to-rose-600";
    const ringColor = finalScore >= 80 ? "stroke-green-500" : finalScore >= 60 ? "stroke-blue-500" : finalScore >= 40 ? "stroke-yellow-500" : "stroke-red-500";

    return { score: finalScore, label, color, bgColor, ringColor, activityRate };
  }, [agg, targetGMV, targetProgress, momGrowth]);

  // ─── AUTO-GENERATED INSIGHTS ───────────────────────────
  const autoInsights = useMemo(() => {
    const insights: { icon: string; text: string; type: "positive" | "warning" | "neutral" }[] = [];
    if (agg.totalGMV <= 0) return insights;

    // Video vs LIVE efficiency
    if (agg.totalVideos > 0 && agg.totalLive > 0) {
      const gmvPerVid = agg.videoGMV / agg.totalVideos;
      const gmvPerLiv = agg.liveGMV / agg.totalLive;
      if (gmvPerVid > gmvPerLiv * 1.5) {
        insights.push({ icon: "📹", text: `Video menghasilkan ${(gmvPerVid/gmvPerLiv).toFixed(1)}× lebih banyak GMV per konten dibanding LIVE`, type: "neutral" });
      } else if (gmvPerLiv > gmvPerVid * 1.5) {
        insights.push({ icon: "🔴", text: `LIVE menghasilkan ${(gmvPerLiv/gmvPerVid).toFixed(1)}× lebih banyak GMV per sesi dibanding Video`, type: "neutral" });
      }
    }

    // Dormant creators
    if (dormantRate > 60) {
      insights.push({ icon: "😴", text: `${Math.round(dormantRate)}% kreator (${dormantCount} orang) tidak menghasilkan GMV — pertimbangkan program reaktivasi`, type: "warning" });
    }

    // MoM growth with context
    if (momAll) {
      if (momAll.gmv > 10 && momAll.creators < -5) {
        insights.push({ icon: "💪", text: `GMV naik ${momAll.gmv.toFixed(0)}% tapi kreator aktif turun ${Math.abs(momAll.creators).toFixed(0)}% — kreator existing makin produktif`, type: "positive" });
      }
      if (momAll.gmv < -10) {
        insights.push({ icon: "📉", text: `GMV turun ${Math.abs(momAll.gmv).toFixed(0)}% dari bulan lalu. Evaluasi strategi konten dan kreator diperlukan`, type: "warning" });
      }
      if (momAll.refundRate > 5) {
        insights.push({ icon: "⚠️", text: `Refund rate naik ${momAll.refundRate.toFixed(1)}pp vs bulan lalu — periksa kualitas kreator`, type: "warning" });
      }
    }

    // Channel concentration
    const maxChannel = Math.max(agg.videoGMV, agg.liveGMV, agg.productCardGMV);
    if (maxChannel > 0 && maxChannel / agg.totalGMV > 0.7) {
      const name = maxChannel === agg.videoGMV ? "Video" : maxChannel === agg.liveGMV ? "LIVE" : "Product Card";
      insights.push({ icon: "🎯", text: `${fP(maxChannel / agg.totalGMV * 100)} GMV berasal dari ${name} — diversifikasi channel untuk mengurangi risiko`, type: "neutral" });
    }

    // High refund warning
    if (highRefundCreators.length >= 3) {
      const totalRefundGMV = highRefundCreators.reduce((a, c) => a + c.affiliateRefundedGMV, 0);
      insights.push({ icon: "🚨", text: `${highRefundCreators.length} kreator refund >50% dengan total refund ${fRp(totalRefundGMV)} — perlu tindakan segera`, type: "warning" });
    }

    // Commission efficiency
    if (agg.totalCommission > 0 && agg.totalGMV > 0) {
      const roi = agg.totalGMV / agg.totalCommission;
      insights.push({ icon: "💰", text: `Setiap Rp1 komisi menghasilkan ${fRp(roi)} GMV (ROI ${roi.toFixed(1)}×)`, type: roi >= 5 ? "positive" : "neutral" });
    }

    // Projected EOM
    if (heroCards.projectedEOM > 0 && targetGMV > 0) {
      const projected = heroCards.projectedEOM;
      if (projected >= targetGMV) {
        insights.push({ icon: "🎉", text: `Proyeksi EOM ${fRp(projected)} — on track untuk melampaui target ${fRp(targetGMV)}`, type: "positive" });
      } else {
        insights.push({ icon: "⏳", text: `Proyeksi EOM ${fRp(projected)} — masih kurang ${fRp(targetGMV - projected)} dari target`, type: "warning" });
      }
    }

    return insights.slice(0, 6);
  }, [agg, dormantRate, dormantCount, momAll, highRefundCreators, heroCards, targetGMV]);

  // ─── PER-STORE MoM ────────────────────────────────────
  const storeMoM = useMemo(() => {
    if (!prevPeriod) return null;
    const prev = allAffiliateData.filter((d) => d.period === prevPeriod);
    const map: Record<string, { prevGMV: number; prevOrders: number; prevRefundRate: number }> = {};
    prev.forEach((d) => {
      const store = activeStores.find((s) => s.id === d.storeId);
      if (!store) return;
      map[store.id] = {
        prevGMV: d.summary.totalGMV || 0,
        prevOrders: d.summary.totalOrders || 0,
        prevRefundRate: d.summary.refundRate || 0,
      };
    });
    return map;
  }, [prevPeriod, allAffiliateData, activeStores]);

  // ═══════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════
  return (
    <div className="dashboard-shell">

      {/* ═══ ZONA 1: EXECUTIVE COMMAND CENTER ═══ */}
      <header className="dashboard-panel overflow-hidden stagger-1">
        <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="dashboard-eyebrow">Executive command center</p>
            <h1 className="dashboard-title mt-2 text-balance">{greeting}. Berikut kondisi bisnis Anda.</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Ringkasan keputusan untuk {formatPeriod(activePeriod) || "periode terbaru"} · {activeStores.length} toko aktif · diperbarui {dateStr}.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-foreground">Health score {healthScore.score}/100</span>
              {momGrowth !== null && (
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${momGrowth >= 0 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                  GMV {momGrowth >= 0 ? "+" : ""}{momGrowth.toFixed(1)}% vs bulan lalu
                </span>
              )}
              <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-muted">{visibleAlerts.length} perhatian aktif</span>
            </div>
          </div>
          {allPeriods.length > 0 && (
            <label className="flex min-w-56 flex-col gap-2 text-xs font-semibold text-muted">
              Periode laporan
              <select
                value={activePeriod}
                onChange={(event) => setSelectedPeriod(event.target.value)}
                className="min-h-11 rounded-xl border border-border bg-card px-3 text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-primary/25"
                aria-label="Pilih periode executive summary"
              >
                {allPeriods.map((period) => <option key={period} value={period}>{formatPeriod(period)}</option>)}
              </select>
            </label>
          )}
        </div>

        {/* Detailed Purpose & Benefit Explanation Card for Executive Summary */}
        <div className="mx-5 mb-5 sm:mx-6 p-4 rounded-xl border border-primary/20 bg-primary/5 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs leading-relaxed">
          <div className="space-y-1">
            <span className="font-bold text-foreground flex items-center gap-1.5 text-xs">
              🎯 Tujuan Executive Summary:
            </span>
            <p className="text-muted">
              Menyajikan gambaran besar (*bird&apos;s-eye view*) seluruh kondisi bisnis dan pemasaran toko Anda dalam 1 layar komando eksekutif tanpa perlu membaca puluhan tabel terpisah.
            </p>
          </div>
          <div className="space-y-1">
            <span className="font-bold text-foreground flex items-center gap-1.5 text-xs">
              💡 Manfaat untuk Direksi & Manajemen:
            </span>
            <p className="text-muted">
              Memungkinkan evaluasi kesehatan bisnis (*Health Score*) dalam 10 detik, memantau perolehan omset vs target bulanan real, serta menerima notifikasi peringatan (*Alert Panel*) untuk potensi kerugian.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-border bg-background px-5 py-3 sm:px-6">
          <span className="mr-1 text-xs font-semibold text-muted">Buka detail:</span>
          {[
            { label: "Affiliate Manager", tab: "affiliate" },
            { label: "Laporan Harian", tab: "laporan-harian" },
            { label: "OKR", tab: "okr" },
            { label: "Report Builder", tab: "report-builder" },
          ].map((item) => (
            <button key={item.tab} onClick={() => onNavigate(item.tab)} className="dashboard-action border border-border bg-card px-3 text-foreground hover:border-primary/30 hover:text-primary">
              {item.label}
            </button>
          ))}
        </div>
      </header>

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

      {/* Quick Actions removed — not executive-level data */}

      {/* ═══ ZONA 3: HERO KPI — 4 angka paling penting ═══ */}
      <div className="stagger-3">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
          📊 Ringkasan {formatPeriod(activePeriod)} — Gabungan Semua Toko
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: GMV vs Target */}
          <button onClick={() => document.getElementById("goals-section")?.scrollIntoView({ behavior: "smooth" })}
            className="text-left bg-gradient-to-br from-blue-600 to-indigo-700 dark:from-blue-700 dark:to-indigo-800 rounded-2xl p-5 text-white shadow-lg hover:shadow-xl transition-all group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">💰</span>
              {momGrowth !== null && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${momGrowth >= 0 ? "bg-green-400/20 text-green-200" : "bg-red-400/20 text-red-200"}`}>
                  {momGrowth >= 0 ? "↑" : "↓"} {Math.abs(momGrowth).toFixed(1)}%
                </span>
              )}
            </div>
            <p className="text-3xl font-extrabold leading-tight">{fRp(agg.totalGMV)}</p>
            <p className="text-blue-200 text-xs mt-1 font-medium">Total GMV Affiliate</p>
            {targetGMV > 0 && (
              <div className="mt-3">
                <div className="flex justify-between text-xs text-blue-200 mb-1">
                  <span>Target: {fRp(targetGMV)}</span>
                  <span className="font-bold">{fP(targetProgress)}</span>
                </div>
                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${targetProgress >= 100 ? "bg-green-400" : "bg-white/60"}`}
                    style={{ width: `${Math.min(100, targetProgress)}%` }} />
                </div>
              </div>
            )}
          </button>

          {/* Card 2: Omzet FreshVision (Laporan Harian) */}
          <button onClick={() => onNavigate("laporan-harian")}
            className="text-left bg-gradient-to-br from-emerald-600 to-teal-700 dark:from-emerald-700 dark:to-teal-800 rounded-2xl p-5 text-white shadow-lg hover:shadow-xl transition-all group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">📋</span>
              {heroCards.daysElapsed > 0 && <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{heroCards.daysElapsed} hari</span>}
            </div>
            <p className="text-3xl font-extrabold leading-tight">{heroCards.displayOmzet > 0 ? fRp(heroCards.displayOmzet) : "—"}</p>
            <p className="text-emerald-200 text-xs mt-1 font-medium">Omzet FreshVision</p>
            {heroCards.displayOmzet > 0 && heroCards.daysElapsed > 0 && (
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-emerald-200">Rata-rata:</span>
                <span className="text-xs font-bold text-white">{fRp(heroCards.dailyAvgOmzet)}/hari</span>
              </div>
            )}
          </button>

          {/* Card 3: Kreator Aktif Promosi */}
          <button onClick={() => onNavigate("affiliate")}
            className="text-left bg-gradient-to-br from-orange-500 to-amber-600 dark:from-orange-600 dark:to-amber-700 rounded-2xl p-5 text-white shadow-lg hover:shadow-xl transition-all group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">🎥</span>
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                {agg.totalCreators > 0 ? fP((agg.activePromoters / agg.totalCreators) * 100) : "0%"} aktif
              </span>
            </div>
            <p className="text-3xl font-extrabold leading-tight">{fN(agg.activePromoters)}</p>
            <p className="text-amber-200 text-xs mt-1 font-medium">Kreator Aktif Promosi dari {fN(agg.totalCreators)}</p>
            <div className="mt-3 flex items-center gap-2 text-xs flex-wrap">
              <span className="bg-white/15 px-1.5 py-0.5 rounded">📹 {fN(agg.videoCreators)} video</span>
              <span className="bg-white/15 px-1.5 py-0.5 rounded">🔴 {fN(agg.liveCreators)} LIVE</span>
              <span className="bg-white/15 px-1.5 py-0.5 rounded">🔄 {fN(agg.bothVideoAndLive)} keduanya</span>
            </div>
          </button>

          {/* Card 4: ROAS */}
          <button onClick={() => onNavigate("laporan-harian")}
            className={`text-left rounded-2xl p-5 text-white shadow-lg hover:shadow-xl transition-all group ${
              heroCards.displayRoas >= 3 ? "bg-gradient-to-br from-green-600 to-emerald-700 dark:from-green-700 dark:to-emerald-800"
                : heroCards.displayRoas >= 2 ? "bg-gradient-to-br from-yellow-600 to-amber-700"
                  : heroCards.displayRoas > 0 ? "bg-gradient-to-br from-red-600 to-rose-700"
                    : "bg-gradient-to-br from-gray-600 to-gray-700"
            }`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">🎯</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                heroCards.displayRoas >= 3 ? "bg-green-400/20 text-green-200" : heroCards.displayRoas >= 2 ? "bg-yellow-400/20 text-yellow-200" : "bg-red-400/20 text-red-200"
              }`}>{heroCards.displayRoas >= 3 ? "✅ Sehat" : heroCards.displayRoas >= 2 ? "⚠️ Waspada" : heroCards.displayRoas > 0 ? "🔴 Rendah" : "—"}</span>
            </div>
            <p className="text-3xl font-extrabold leading-tight">{heroCards.displayRoas > 0 ? `${heroCards.displayRoas.toFixed(2)}×` : "—"}</p>
            <p className="text-white/70 text-xs mt-1 font-medium">ROAS (Return on Ad Spend)</p>
            {heroCards.displayRoas > 0 && lhData?.summary && (
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-white/60">Ad Spend:</span>
                <span className="text-xs font-bold text-white">{fRp(lhData.summary.total_biaya_iklan || 0)}</span>
              </div>
            )}
          </button>
        </div>

        {/* Secondary KPIs row */}
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 mt-3">
          {[
            { label: "Net GMV", value: fRp(agg.netGMV), ok: true },
            { label: "Refund Rate", value: fP(agg.refundRate), ok: agg.refundRate <= 15 },
            { label: "Total Pesanan", value: fN(agg.totalOrders), ok: true },
            { label: "AOV", value: fRp(agg.aov), ok: true },
            { label: "Komisi Aff", value: fRp(agg.totalCommission), ok: true },
            { label: "Net - Komisi", value: fRp(agg.netAfterComm), ok: agg.netAfterComm > 0 },
          ].map((item) => (
            <div key={item.label} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-3 text-center">
              <div className={`text-sm font-bold ${item.ok ? "text-gray-900 dark:text-white" : "text-red-600"}`}>{item.value}</div>
              <div className="text-[11px] text-gray-400 mt-0.5">{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ ZONA 3.1: HEALTH SCORE + MoM COMPARISON + DAILY AVG ═══ */}
      {agg.totalGMV > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* ── HEALTH SCORE ── */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col items-center justify-center text-center">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">🏥 Skor Kesehatan Bisnis</h3>
            <div className="relative w-28 h-28 mb-3">
              <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                <circle cx="50" cy="50" r="42" fill="none" className={healthScore.ringColor} strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={`${healthScore.score * 2.64} 264`} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-3xl font-black ${healthScore.color}`}>{healthScore.score}</span>
                <span className="text-[10px] text-gray-400 font-medium">/100</span>
              </div>
            </div>
            <span className={`text-sm font-bold ${healthScore.color}`}>{healthScore.label}</span>
            <div className="grid grid-cols-2 gap-2 mt-3 w-full text-[10px]">
              <div className="bg-gray-50 rounded-lg p-1.5">
                <div className="font-bold text-gray-700">{fP(agg.refundRate)}</div>
                <div className="text-gray-400">Refund</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-1.5">
                <div className="font-bold text-gray-700">{fP(healthScore.activityRate)}</div>
                <div className="text-gray-400">Aktivitas</div>
              </div>
            </div>
          </div>

          {/* ── MoM COMPARISON STRIP ── */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              📈 Perubahan vs {momAll?.prevPeriodLabel || "Bulan Lalu"}
            </h3>
            {momAll ? (
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "GMV", val: momAll.gmv, isBetter: momAll.gmv >= 0 },
                  { label: "Orders", val: momAll.orders, isBetter: momAll.orders >= 0 },
                  { label: "Kreator", val: momAll.creators, isBetter: momAll.creators >= 0 },
                  { label: "Video", val: momAll.videos, isBetter: momAll.videos >= 0 },
                  { label: "LIVE", val: momAll.live, isBetter: momAll.live >= 0 },
                  { label: "Refund", val: momAll.refundRate, isBetter: momAll.refundRate <= 0, suffix: "pp" },
                  { label: "Komisi", val: momAll.commission, isBetter: true },
                ].map((m) => (
                  <div key={m.label} className={`flex items-center justify-between rounded-lg px-3 py-2 ${m.isBetter ? "bg-green-50" : "bg-red-50"}`}>
                    <span className="text-xs text-gray-600">{m.label}</span>
                    <span className={`text-xs font-bold ${m.isBetter ? "text-green-600" : "text-red-600"}`}>
                      {m.val >= 0 ? "▲" : "▼"} {Math.abs(m.val).toFixed(1)}{m.suffix || "%"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-400 text-xs">
                <p>Data bulan sebelumnya belum tersedia</p>
                <p className="mt-1 text-gray-300">Upload minimal 2 periode untuk perbandingan</p>
              </div>
            )}
          </div>

          {/* ── DAILY AVERAGES + PROJECTED EOM ── */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">⚡ Rata-rata Harian & Proyeksi</h3>
            <div className="space-y-2.5">
              {[
                { icon: "💰", label: "Revenue/Hari", value: fRp(dailyAvg.revenuePerDay) },
                { icon: "📦", label: "Pesanan/Hari", value: fN(Math.round(dailyAvg.ordersPerDay)) },
                { icon: "🎬", label: "Konten/Hari", value: dailyAvg.contentPerDay.toFixed(1) },
                { icon: "📹", label: "GMV/Video", value: fRp(dailyAvg.gmvPerVideo) },
                { icon: "🔴", label: "GMV/LIVE", value: fRp(dailyAvg.gmvPerLive) },
                { icon: "👤", label: "GMV/Kreator", value: fRp(dailyAvg.gmvPerCreator) },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">{item.icon} {item.label}</span>
                  <span className="text-xs font-bold text-gray-800">{item.value}</span>
                </div>
              ))}
            </div>
            {heroCards.projectedEOM > 0 && (
              <div className={`mt-3 rounded-lg p-3 ${heroCards.projectedEOM >= targetGMV && targetGMV > 0 ? "bg-green-50 border border-green-100" : "bg-amber-50 border border-amber-100"}`}>
                <div className="text-[10px] text-gray-500 uppercase font-medium">Proyeksi End of Month</div>
                <div className={`text-lg font-black mt-0.5 ${heroCards.projectedEOM >= targetGMV && targetGMV > 0 ? "text-green-600" : "text-amber-600"}`}>
                  {fRp(heroCards.projectedEOM)}
                </div>
                {targetGMV > 0 && (
                  <div className="text-[10px] text-gray-400 mt-0.5">
                    {heroCards.projectedEOM >= targetGMV ? "✅ On track melampaui target" : `⚠️ Masih kurang ${fRp(targetGMV - heroCards.projectedEOM)}`}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ ZONA 3.2: AUTO-GENERATED INSIGHTS ═══ */}
      {autoInsights.length > 0 && (
        <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-2xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs">💡</span>
            Insight Otomatis
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {autoInsights.map((insight, i) => (
              <div key={i} className={`flex items-start gap-2.5 rounded-xl px-3.5 py-2.5 border ${
                insight.type === "positive" ? "bg-green-50 border-green-100" :
                insight.type === "warning" ? "bg-amber-50 border-amber-100" :
                "bg-white border-gray-100"
              }`}>
                <span className="text-base flex-shrink-0 mt-0.5">{insight.icon}</span>
                <p className={`text-xs leading-relaxed ${
                  insight.type === "positive" ? "text-green-700" :
                  insight.type === "warning" ? "text-amber-700" :
                  "text-gray-600"
                }`}>{insight.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ ZONA 3.6: LAPORAN HARIAN SUMMARY ═══ */}
      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">📋</span>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Laporan Harian — FreshVision</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {lhData?.period ? `Periode: ${formatPeriod(lhData.period)}` : `Sinkron dengan periode ${formatPeriod(activePeriod)}`}
              </p>
            </div>
          </div>
          <button onClick={() => onNavigate("laporan-harian")} className="text-xs text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-3 py-1.5 rounded-lg font-medium transition">
            Lihat Detail →
          </button>
        </div>

        {lhLoading ? (
          <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
            <div className="w-4 h-4 border-2 border-emerald-300 border-t-emerald-600 rounded-full animate-spin" />
            Memuat data laporan harian...
          </div>
        ) : !lhData?.summary ? (
          <div className="text-center py-5 bg-white/60 rounded-xl border border-emerald-100">
            <span className="text-2xl block mb-2">📂</span>
            <p className="text-xs text-gray-500">Belum ada data Laporan Harian untuk periode ini.</p>
            <button onClick={() => onNavigate("laporan-harian")} className="mt-2 text-xs text-emerald-600 hover:underline">Upload Sekarang →</button>
          </div>
        ) : (() => {
          const s = lhData.summary;
          const ch = lhData.channels || {};

          // ✔ Sumber omzet FreshVision (prioritas dari atas):
          // 1. summary.total_omzet_fv  = dari sheet Evaluasi Harian FreshVision (selalu ada)
          // 2. evaluasi_per_brand.freshvision = sama, versi terstruktur
          // 3. channels.shop_tab = gabungan tab SHOP
          // 4. summary.total_omzet = fallback terakhir
          const displayOmzet =
            (s.total_omzet_fv || 0) > 0
              ? s.total_omzet_fv
              : (lhData.evaluasi_per_brand?.freshvision || 0) > 0
              ? (lhData.evaluasi_per_brand.freshvision as number)
              : (ch.shop_tab?.total_omzet || 0) > 0
              ? ch.shop_tab!.total_omzet
              : (s.total_omzet || 0);
          const displayRoas = s.total_biaya_iklan > 0 ? displayOmzet / s.total_biaya_iklan : 0;
          const displayMargin = displayOmzet - (s.total_biaya_iklan || 0) - (s.total_komisi_aff || 0);

          const roasColor = displayRoas >= 3 ? "text-green-600" : displayRoas >= 2 ? "text-yellow-600" : "text-red-500";
          const marginColor = displayMargin >= 0 ? "text-green-600" : "text-red-500";

          return (
            <>
              {/* KPI Utama */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
                {[
                  { label: "Total Omzet FreshVision", value: fRp(displayOmzet), icon: "💰", color: "text-emerald-700", bg: "bg-white" },
                  { label: "Biaya Iklan", value: fRp(s.total_biaya_iklan || 0), icon: "📣", color: "text-blue-700", bg: "bg-white" },
                  { label: "ROAS", value: `${displayRoas.toFixed(2)}×`, icon: "🎯", color: roasColor, bg: "bg-white" },
                  { label: "CAC Ads", value: fRp(s.rata_cac_ads || 0), icon: "💸", color: "text-purple-700", bg: "bg-white" },
                  { label: "Estimasi Margin", value: fRp(displayMargin), icon: "📈", color: marginColor, bg: "bg-white" },
                ].map((item) => (
                  <div key={item.label} className={`${item.bg} rounded-xl p-3 border border-emerald-100`}>
                    <div className="text-base mb-1">{item.icon}</div>
                    <div className={`text-sm font-bold ${item.color} leading-tight`}>{item.value}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{item.label}</div>
                  </div>
                ))}
              </div>

              {/* Metrik tambahan */}
              <div className="grid grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
                {[
                  { label: "Closing", value: fN(s.total_closing || 0) },
                  { label: "Botol Terjual", value: fN(s.total_botol || 0) },
                  { label: "Avg Upsell", value: `${(s.rata_upsell || 0).toFixed(1)}×` },
                  { label: "Cost/Closing", value: fRp(s.cost_per_closing || 0) },
                  { label: "Cost/Botol", value: fRp(s.cost_per_botol || 0) },
                  { label: "Hari Data", value: `${s.hari || 0} hari` },
                ].map((item) => (
                  <div key={item.label} className="bg-white/70 rounded-lg p-2 text-center border border-emerald-50">
                    <div className="text-xs font-bold text-gray-800">{item.value}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">{item.label}</div>
                  </div>
                ))}
              </div>

              {/* Channel Breakdown */}
              {Object.keys(ch).length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 font-medium mb-2">Breakdown per Channel</p>
                  <div className="space-y-1.5">
                    {([
                      { key: "shop", label: "📦 SHOP", color: "#059669" },
                      { key: "video", label: "📹 Video", color: "#1a237e" },
                      { key: "live", label: "🔴 Live", color: "#ef4444" },
                    ] as const).filter(c => ch[c.key]?.total_omzet > 0).map(({ key, label, color }) => {
                      const cData = ch[key];
                      const pct = displayOmzet > 0 ? (cData.total_omzet / displayOmzet) * 100 : 0;
                      return (
                        <div key={key} className="flex items-center gap-2">
                          <span className="text-xs text-gray-600 w-24 flex-shrink-0">{label}</span>
                          <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                            <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                          </div>
                          <span className="text-xs font-medium text-gray-700 w-28 text-right">{fRp(cData.total_omzet)}</span>
                          <span className="text-[10px] text-gray-400 w-8 text-right">{pct.toFixed(0)}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          );
        })()}
      </div>

      {/* ═══ ZONA 3.5: GOALS & TARGET DASHBOARD ═══ */}
      {agg.totalGMV > 0 && (() => {
        const goalsDef = [
          { key: "gmv", icon: "💰", label: "Target GMV", actual: agg.totalGMV, fmt: fRp, unit: "", desc: "Total pendapatan dari affiliate", inputPlaceholder: "cth: 200000000" },
          { key: "videos", icon: "📹", label: "Target Video", actual: agg.totalVideos, fmt: fN, unit: " video", desc: "Jumlah shoppable video kreator", inputPlaceholder: "cth: 500" },
          { key: "live", icon: "🔴", label: "Target LIVE", actual: agg.totalLive, fmt: fN, unit: " sesi", desc: "Jumlah siaran LIVE kreator", inputPlaceholder: "cth: 50" },
          { key: "active-creators", icon: "👥", label: "Target Kreator Aktif", actual: agg.activePromoters, fmt: fN, unit: " kreator", desc: "Kreator yang buat video/live", inputPlaceholder: "cth: 1000" },
          { key: "max-refund", icon: "📉", label: "Batas Refund Rate", actual: agg.refundRate, fmt: fP, unit: "", desc: "Maksimal refund rate yang diterima", inputPlaceholder: "cth: 15", isInverse: true },
        ];
        const hasAnyGoal = goalsDef.some((g) => (goals[g.key] || 0) > 0);
        const achievedCount = goalsDef.filter((g) => {
          const target = goals[g.key] || 0;
          if (target <= 0) return false;
          if ((g as any).isInverse) return g.actual <= target;
          return g.actual >= target;
        }).length;
        const totalGoals = goalsDef.filter((g) => (goals[g.key] || 0) > 0).length;

        return (
          <div id="goals-section" className="bg-gradient-to-br from-blue-50 via-indigo-50 to-violet-50 rounded-2xl border border-indigo-200/60 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-base">🎯</span>
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">Goals & Target — {formatPeriod(activePeriod)}</h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {hasAnyGoal ? `${achievedCount}/${totalGoals} target tercapai` : "Belum ada target yang di-set"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setGoalsEditing(!goalsEditing); if (!goalsEditing) setGoalsForm({ ...goals }); }}
                className="text-xs bg-indigo-100 text-indigo-700 hover:bg-indigo-200 px-3 py-1.5 rounded-lg font-medium transition"
              >
                {goalsEditing ? "✕ Batal" : hasAnyGoal ? "✏️ Edit Target" : "＋ Set Target"}
              </button>
            </div>

            {/* Edit Form */}
            {goalsEditing && (
              <div className="bg-white rounded-xl border border-indigo-100 p-4 mb-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {goalsDef.map((g) => (
                    <div key={g.key}>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">{g.icon} {g.label}</label>
                      <input
                        type="number"
                        placeholder={g.inputPlaceholder}
                        value={goalsForm[g.key] || ""}
                        onChange={(e) => setGoalsForm((prev) => ({ ...prev, [g.key]: Number(e.target.value) || 0 }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-end gap-2 mt-3">
                  <button
                    onClick={async () => {
                      // Save all goals
                      await Promise.all(
                        goalsDef.map((g) =>
                          goalsForm[g.key] ? fetch('/api/target', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ period: activePeriod, target_value: goalsForm[g.key], type: g.key }),
                          }) : Promise.resolve()
                        )
                      );
                      setGoalsEditing(false);
                      setTargetVersion((v) => v + 1);
                    }}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
                  >
                    💾 Simpan Semua Target
                  </button>
                </div>
              </div>
            )}

            {/* Goals Progress */}
            {hasAnyGoal && (
              <div className="space-y-3">
                {goalsDef.filter((g) => (goals[g.key] || 0) > 0).map((g) => {
                  const target = goals[g.key] || 0;
                  const isInverse = (g as any).isInverse;
                  const progress = isInverse
                    ? (target > 0 ? Math.max(0, ((target - g.actual) / target) * 100 + 100) : 0)
                    : (target > 0 ? (g.actual / target) * 100 : 0);
                  const achieved = isInverse ? g.actual <= target : g.actual >= target;
                  const nearTarget = !achieved && progress >= 70;
                  const statusColor = achieved ? "text-green-600" : nearTarget ? "text-yellow-600" : "text-red-500";
                  const barColor = achieved ? "bg-green-500" : nearTarget ? "bg-yellow-500" : "bg-red-400";
                  const statusLabel = achieved ? "✅ Tercapai" : nearTarget ? "⚡ Hampir" : "🔴 Behind";

                  return (
                    <div key={g.key} className="bg-white rounded-xl p-3 border border-indigo-50">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{g.icon}</span>
                          <span className="text-xs font-medium text-gray-700">{g.label}</span>
                        </div>
                        <span className={`text-xs font-semibold ${statusColor}`}>{statusLabel}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-gray-100 rounded-full h-2.5">
                          <div
                            className={`h-2.5 rounded-full transition-all duration-500 ${barColor}`}
                            style={{ width: `${Math.min(100, isInverse ? (achieved ? 100 : Math.max(0, 100 - (g.actual - target) * 3)) : progress)}%` }}
                          />
                        </div>
                        <div className="text-right flex-shrink-0 w-36">
                          <span className="text-xs font-bold text-gray-900">{g.fmt(g.actual)}</span>
                          <span className="text-xs text-gray-400"> / {g.fmt(target)}{g.unit}</span>
                        </div>
                      </div>
                      {!achieved && !isInverse && (
                        <p className="text-[10px] text-gray-400 mt-1">
                          Butuh {g.fmt(target - g.actual)} lagi{g.key === "gmv" ? ` (~${fN(Math.ceil((target - g.actual) / (agg.aov || 1)))} pesanan)` : ""}
                        </p>
                      )}
                      {!achieved && isInverse && (
                        <p className="text-[10px] text-red-400 mt-1">
                          ⚠ Saat ini {g.fmt(g.actual)}, melebihi batas {g.fmt(target)}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {!hasAnyGoal && !goalsEditing && (
              <div className="text-center py-6 bg-white/50 rounded-xl border border-indigo-100">
                <div className="text-3xl mb-2">🎯</div>
                <p className="text-sm font-medium text-gray-700">Belum ada target untuk {formatPeriod(activePeriod)}</p>
                <p className="text-xs text-gray-400 mt-1">Set target GMV, Video, LIVE, Kreator Aktif, dan Refund Rate untuk memantau progress bulanan.</p>
                <button
                  onClick={() => { setGoalsEditing(true); setGoalsForm({}); }}
                  className="mt-3 text-xs bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition"
                >
                  ＋ Set Target Sekarang
                </button>
              </div>
            )}
          </div>
        );
      })()}

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
                      <div className="font-semibold text-gray-900 flex items-center gap-2">
                        {sd.store.name}
                        {storeMoM?.[sd.store.id] && (() => {
                          const prev = storeMoM[sd.store.id];
                          const growth = prev.prevGMV > 0 ? ((sd.gmv - prev.prevGMV) / prev.prevGMV) * 100 : 0;
                          return growth !== 0 ? (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${growth >= 0 ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}>
                              {growth >= 0 ? "▲" : "▼"}{Math.abs(growth).toFixed(0)}%
                            </span>
                          ) : null;
                        })()}
                      </div>
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
                    { label: "Kreator Promosi", value: fN(sd.creators) },
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

      {/* Old Target GMV section removed — replaced by Goals Dashboard above */}

      {/* ═══ ZONA 7.5: AI EVALUASI ═══ */}
      <div className="bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50 rounded-2xl border border-violet-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-base">🤖</span>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">AI Evaluasi &amp; Rekomendasi</h2>
              <p className="text-xs text-gray-400 mt-0.5">Analisis gabungan Affiliate + Laporan Harian &mdash; {formatPeriod(activePeriod)}</p>
            </div>
          </div>
          <button
            onClick={() => { setAiContent(""); setAiCacheKey(""); runAiEvaluasi(); }}
            disabled={aiLoading}
            className="flex items-center gap-1.5 text-xs bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white px-3 py-1.5 rounded-lg font-medium transition"
          >
            {aiLoading ? (
              <><div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Menganalisis...</>
            ) : (
              <>{aiContent ? '🔄 Refresh' : '✨ Analisis Sekarang'}</>
            )}
          </button>
        </div>

        {!aiContent && !aiLoading && !aiError && (
          <div className="text-center py-8 bg-white/50 rounded-xl border border-violet-100">
            <div className="text-3xl mb-3">🧠</div>
            <p className="text-sm font-medium text-gray-700">Dapatkan Evaluasi &amp; Langkah Aksi dari AI</p>
            <p className="text-xs text-gray-400 mt-1 mb-4">AI akan menganalisis performa bisnis Anda dan memberikan rekomendasi konkret</p>
            {!aiSettings && (
              <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mx-auto max-w-xs">
                ⚠️ Konfigurasikan AI terlebih dahulu di menu <strong>AI Analyst</strong>
              </p>
            )}
          </div>
        )}

        {aiLoading && (
          <div className="space-y-3">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-4 bg-violet-100 rounded animate-pulse" style={{ width: `${[90,75,85,60][i-1]}%` }} />
            ))}
          </div>
        )}

        {aiError && (
          <div className="flex items-start gap-2 bg-red-50 rounded-xl p-4 border border-red-100">
            <span className="text-red-500 text-lg flex-shrink-0">⚠️</span>
            <div>
              <p className="text-sm font-medium text-red-700">Gagal menganalisis</p>
              <p className="text-xs text-red-500 mt-0.5">{aiError}</p>
              <button onClick={runAiEvaluasi} className="mt-2 text-xs text-red-600 hover:underline">Coba lagi →</button>
            </div>
          </div>
        )}

        {aiContent && !aiLoading && (
          <div className="prose prose-sm max-w-none bg-white/70 rounded-xl p-4 border border-violet-100">
            {aiContent.split('\n').map((line, i) => {
              if (line.startsWith('## ')) return <h3 key={i} className="text-sm font-bold text-gray-900 mt-4 mb-2 first:mt-0 flex items-center gap-1">{line.slice(3)}</h3>;
              if (line.startsWith('### ')) return <h4 key={i} className="text-xs font-bold text-gray-800 mt-3 mb-1">{line.slice(4)}</h4>;
              if (line.match(/^\d+\. /)) return <p key={i} className="text-xs text-gray-700 ml-4 mb-1">{line}</p>;
              if (line.startsWith('- ')) return <p key={i} className="text-xs text-gray-700 ml-4 mb-1 flex gap-1"><span className="text-violet-400 flex-shrink-0">•</span><span>{line.slice(2)}</span></p>;
              if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="text-xs font-semibold text-gray-800 mb-1">{line.slice(2, -2)}</p>;
              if (!line.trim()) return <div key={i} className="h-2" />;
              return <p key={i} className="text-xs text-gray-700 mb-1 leading-relaxed">{line}</p>;
            })}
          </div>
        )}
      </div>

      {/* Quick Actions removed from here — moved to top (Zona 2.5) */}

    </div>
  );
}
