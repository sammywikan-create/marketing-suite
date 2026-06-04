"use client";
import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useStoreManager } from "@/store/useStoreManager";
import { useRawFileStore } from "@/store/useRawFileStore";
import { parseAffiliateFiles } from "@/lib/affiliateParser";
import { loadAffiliateCreators } from "@/lib/db";
import type { AffiliateMonthData, AffiliateCreatorItem, AffiliateTarget } from "@/lib/types";
import { nanoid } from "nanoid";
import {
  Upload, Users, Trash2, Search, AlertTriangle, TrendingUp,
  TrendingDown, ChevronDown, ChevronUp, Video, ShoppingBag,
  DollarSign, BarChart3, Package, Eye, ArrowUpRight, ArrowDownRight,
  Star, Filter, X, Zap, Target, Lightbulb, PieChart, Activity, Plus, Edit3, Save, CheckCircle, Download, RefreshCw
} from "lucide-react";
import AffiliateAIInsightsCard from "@/components/AffiliateAIInsightsCard";

// ═══════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════
type ViewMode = "dashboard" | "creators" | "comparison" | "retention";
type SortKey = "gmv" | "orders" | "refund" | "videos" | "commission" | "score";
type StatusFilter = "all" | "top" | "active" | "needs-push" | "inactive" | "high-refund";

// ═══════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════
function fRp(v: number): string {
  return `Rp ${Math.round(v).toLocaleString("id-ID")}`;
}
function fN(v: number): string { return v.toLocaleString("id-ID"); }
function fP(v: number): string { return `${v.toFixed(1)}%`; }

function creatorStatusSimple(c: AffiliateCreatorItem): StatusFilter {
  if (c.refundRate > 30 && c.affiliateGMV > 0) return "high-refund";
  if (c.affiliateGMV >= 5000000) return "top";
  if (c.affiliateGMV >= 500000) return "active";
  if (c.affiliateGMV > 0) return "needs-push";
  return "inactive";
}

const STATUS_CONFIG: Record<StatusFilter, { label: string; cls: string; icon: string }> = {
  all: { label: "Semua", cls: "", icon: "" },
  top: { label: "Top Performer", cls: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: "star" },
  active: { label: "Aktif", cls: "bg-green-100 text-green-700 border-green-200", icon: "check" },
  "needs-push": { label: "Perlu Dorong", cls: "bg-orange-100 text-orange-700 border-orange-200", icon: "alert" },
  inactive: { label: "Tidak Aktif", cls: "bg-gray-100 text-gray-500 border-gray-200", icon: "minus" },
  "high-refund": { label: "Refund Tinggi", cls: "bg-red-100 text-red-700 border-red-200", icon: "alert-triangle" },
};

const TIER_COLORS: Record<string, string> = {
  Mega: "bg-purple-100 text-purple-700",
  Macro: "bg-yellow-100 text-yellow-700",
  Mid: "bg-blue-100 text-blue-700",
  Micro: "bg-green-100 text-green-700",
  Nano: "bg-gray-100 text-gray-600",
  Unknown: "bg-gray-50 text-gray-400",
};

// ═══════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════
export default function AffiliateScreen() {
  const { getActiveStore, saveAffiliateData, deleteAffiliateData, saveAffiliateTarget, deleteAffiliateTarget } = useStoreManager();
  const stores = useStoreManager((s) => s.stores);
  const activeStore = getActiveStore();
  const setRawFile = useRawFileStore((s) => s.setFile);
  const [combinedMode, setCombinedMode] = useState(false);
  const [showTargetForm, setShowTargetForm] = useState(false);
  const [editingTarget, setEditingTarget] = useState<AffiliateTarget | null>(null);

  const allMonths: AffiliateMonthData[] = useMemo(() => {
    if (combinedMode) {
      // Merge affiliate data from ALL stores
      return stores.flatMap((s) =>
        (s.affiliateData || []).map((d) => ({ ...d, _storeName: s.name }))
      );
    }
    return (activeStore?.affiliateData || []).map((d) => ({ ...d, _storeName: activeStore?.name || '' }));
  }, [combinedMode, stores, activeStore]);

  const [view, setView] = useState<ViewMode>("dashboard");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("all");
  const [platformFilter, setPlatformFilter] = useState<"all" | "tiktok" | "tokopedia">("all");
  const [isUploading, setIsUploading] = useState(false);
  const [searchCreator, setSearchCreator] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("gmv");
  const [sortAsc, setSortAsc] = useState(false);
  const [filterStatus, setFilterStatus] = useState<StatusFilter>("all");
  const [expandedCreator, setExpandedCreator] = useState<string | null>(null);
  const [filterTier, setFilterTier] = useState<string>("all");
  const [drillDownCreator, setDrillDownCreator] = useState<string | null>(null);
  const [supabaseCreators, setSupabaseCreators] = useState<AffiliateCreatorItem[]>([]);
  const [isLoadingCreators, setIsLoadingCreators] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  // Fitur 5: Target manual per kreator (localStorage)
  const [creatorTargets, setCreatorTargets] = useState<Record<string, number>>(() => {
    try { return JSON.parse(localStorage.getItem('affiliateCreatorTargets') || '{}'); } catch { return {}; }
  });
  const saveCreatorTarget = (username: string, target: number) => {
    setCreatorTargets((prev) => {
      const next = { ...prev, [username]: target };
      try { localStorage.setItem('affiliateCreatorTargets', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  // ─── LOAD CREATORS FROM SUPABASE ────────────────────────
  useEffect(() => {
    if (!activeStore?.id) return;
    let cancelled = false;
    async function fetchCreators() {
      setIsLoadingCreators(true);
      try {
        const period = selectedPeriod !== "all"
          ? (selectedPeriod.split(" ~ ")[0]?.slice(0, 7) || selectedPeriod)
          : undefined;
        const plt = platformFilter !== "all" ? platformFilter : undefined;
        const creators = await loadAffiliateCreators(activeStore!.id, period, plt);
        if (!cancelled) setSupabaseCreators(creators);
      } catch (err: any) {
        if (err?.message !== '__SUPABASE_NOT_CONFIGURED__') {
          console.error("Failed to load creators from Supabase:", err);
        }
        if (!cancelled) setSupabaseCreators([]);
      } finally {
        if (!cancelled) setIsLoadingCreators(false);
      }
    }
    fetchCreators();
    return () => { cancelled = true; };
  }, [activeStore?.id, selectedPeriod, platformFilter]);

  // ─── UPLOAD HANDLER ───────────────────────────────────
  const handleUpload = useCallback(async (
    e: React.ChangeEvent<HTMLInputElement>,
    period: string,
    platform: "tiktok" | "tokopedia",
  ) => {
    const fileList = e.target.files;
    if (!fileList?.length || !activeStore) return;
    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);
    try {
      const files = Array.from(fileList);
      const monthData = await parseAffiliateFiles(files, period, platform);

      // Validate parsed data has at least some content
      if (!monthData.summary.totalCreators && !monthData.summary.totalGMV && !monthData.coreSummary) {
        throw new Error('File tidak terbaca dengan benar. Pastikan format file sesuai (TikTok Creator List / Core Metrics, atau Tokopedia Creator List / Core Stats).');
      }

      await saveAffiliateData(activeStore.id, { ...monthData, storeId: activeStore.id });

      // Reload creators from Supabase after save
      try {
        const p = monthData.periodRaw?.split(" ~ ")[0]?.slice(0, 7) || period;
        const fresh = await loadAffiliateCreators(activeStore.id, p, platform);
        setSupabaseCreators((prev) => {
          const otherCreators = prev.filter((c) => {
            const existing = fresh.find((f) => f.creatorUsername === c.creatorUsername);
            return !existing;
          });
          return [...otherCreators, ...fresh];
        });
      } catch { /* creators will load on next filter change */ }

      // Save raw files for PDF report generation
      files.forEach((file) => {
        const n = file.name.toLowerCase();
        if (platform === "tiktok") {
          if (n.includes("core_metrics") || (n.includes("transaction_analysis") && n.includes("core") && !n.includes("creator")))
            setRawFile(activeStore.id, "affiliateTikTokCore", file);
          else
            setRawFile(activeStore.id, "affiliateTikTok", file);
        } else {
          if (n.includes("core_stats"))
            setRawFile(activeStore.id, "affiliateTokopediaCore", file);
          else
            setRawFile(activeStore.id, "affiliateTokopedia", file);
        }
      });

      const creatorCount = monthData.summary.totalCreators;
      const gmv = monthData.summary.totalGMV;
      setUploadSuccess(`✅ Berhasil disimpan ke Supabase! ${creatorCount} kreator, GMV ${Math.round(gmv).toLocaleString('id-ID')} untuk periode ${monthData.period || period} (${platform}).`);
      // Auto-dismiss success after 8 seconds
      setTimeout(() => setUploadSuccess(null), 8000);

    } catch (err: any) {
      console.error("Error uploading affiliate files:", err);
      const msg = (err?.message || err?.details || String(err) || '').toLowerCase();
      // Detect common Supabase errors and give actionable messages
      if (msg.includes('connect') || msg.includes('network') || msg.includes('fetch failed') ||
          msg.includes('econnrefused') || msg.includes('timeout') || msg.includes('paused') ||
          msg.includes('unavailable') || msg.includes('503') || msg.includes('502')) {
        setUploadError(`⚠️ Database Supabase tidak dapat dijangkau. Kemungkinan database sedang PAUSE karena tidak aktif selama 7+ hari. Buka https://supabase.com/dashboard, pilih project Anda, lalu klik “Resume”. Setelah database aktif kembali, upload ulang file ini.`);
      } else if (msg.includes('violates') || msg.includes('policy') || msg.includes('rls') || msg.includes('permission')) {
        setUploadError(`❌ Gagal menyimpan ke database: Izin ditolak (RLS policy). Pastikan Supabase RLS policy sudah dikonfigurasi untuk tabel affiliate_summaries dan affiliate_creators.`);
      } else if (msg.includes('duplicate') || msg.includes('unique') || msg.includes('conflict')) {
        setUploadError(`⚠️ Data periode ini sudah ada di database. Coba hapus data lama terlebih dahulu lalu upload ulang.`);
      } else if (msg.includes('does not exist') || msg.includes('relation') || msg.includes('42p01')) {
        setUploadError(`❌ Tabel database tidak ditemukan. Jalankan migration.sql di Supabase SQL Editor terlebih dahulu.`);
      } else if (msg.includes('tidak terbaca')) {
        setUploadError(`⚠️ ${err?.message || msg}`);
      } else {
        setUploadError(`❌ Gagal menyimpan ke Supabase: ${err?.message || msg || 'Unknown error'}`);
      }
    } finally {
      setIsUploading(false);
    }
    e.target.value = "";
  }, [activeStore, saveAffiliateData, setRawFile]);

  // ─── FILTERED DATA ────────────────────────────────────
  const filteredData = useMemo(() => {
    let data = allMonths;
    if (selectedPeriod !== "all") data = data.filter((d) => d.periodRaw === selectedPeriod);
    if (platformFilter !== "all") data = data.filter((d) => d.platform === platformFilter);
    return data;
  }, [allMonths, selectedPeriod, platformFilter]);

  // ─── AGGREGATED METRICS ───────────────────────────────
  const agg = useMemo(() => {
    // Di combined mode, supabaseCreators tidak dipakai → hanya cek filteredData.
    // Di single mode, salah satu sumber cukup (supabaseCreators atau filteredData).
    if (combinedMode ? !filteredData.length : (!filteredData.length && !supabaseCreators.length)) return null;

    // ── CREATOR SOURCE SELECTION ──
    // Combined mode (gabungan toko):
    //   - supabaseCreators hanya berisi data toko aktif → TIDAK dipakai
    //   - Gunakan localCreators dari filteredData (allMonths sudah mencakup semua toko)
    //   - Key = "storeName::username" agar kreator yang sama di toko berbeda tidak di-merge
    //
    // Single-store mode:
    //   - Supabase creators tetap jadi sumber utama (canonical)
    //   - Local creators mengisi gap yang tidak ada di Supabase
    //   - Key = "username" (merge lintas periode dalam satu toko, perilaku lama)
    const localCreators = filteredData.flatMap((d) =>
      d.creators.map((c) => ({ ...c, _storeKey: (d as any)._storeName as string || '' }))
    );
    type CreatorWithStore = AffiliateCreatorItem & { _months: number; _storeKey: string };
    let creatorSource: (AffiliateCreatorItem & { _storeKey: string })[];

    if (combinedMode) {
      // Bug fix: di combined mode, bypass supabaseCreators (hanya toko aktif).
      // filteredData sudah berisi data semua toko dari allMonths.
      creatorSource = localCreators;
    } else if (supabaseCreators.length > 0) {
      // Single mode: Supabase takes priority, local fills gaps
      const supabaseUsernames = new Set(supabaseCreators.map((c) => c.creatorUsername));
      const localOnly = localCreators.filter((c) => !supabaseUsernames.has(c.creatorUsername));
      creatorSource = [
        ...supabaseCreators.map((c) => ({ ...c, _storeKey: '' })),
        ...localOnly,
      ];
    } else {
      creatorSource = localCreators;
    }

    const creatorMap: Record<string, CreatorWithStore> = {};
    creatorSource.forEach((c) => {
      // Bug fix: di combined mode gunakan composite key agar kreator yang sama
      // di toko berbeda tetap terpisah (affiliate per-toko memang independen).
      const key = combinedMode
        ? `${c._storeKey}::${c.creatorUsername}`
        : c.creatorUsername;

      if (!creatorMap[key]) {
        creatorMap[key] = { ...c, _months: 0 };
      } else {
        creatorMap[key].affiliateGMV += c.affiliateGMV;
        creatorMap[key].affiliateOrders += c.affiliateOrders;
        creatorMap[key].affiliateShoppableVideos += c.affiliateShoppableVideos;
        creatorMap[key].affiliateLiveStreams += c.affiliateLiveStreams;
        creatorMap[key].affiliateRefundedGMV += c.affiliateRefundedGMV;
        creatorMap[key].estCommission += c.estCommission;
        creatorMap[key].itemsSold += c.itemsSold;
        creatorMap[key].affiliateLiveGMV += c.affiliateLiveGMV;
        creatorMap[key].affiliateShoppableVideoGMV += c.affiliateShoppableVideoGMV;
        creatorMap[key].affiliateProductCardGMV += c.affiliateProductCardGMV;
        creatorMap[key].productImpressions += c.productImpressions || 0;
      }
      if (c.affiliateGMV > 0) creatorMap[key]._months++;
    });

    const creators = Object.values(creatorMap).map((c) => ({
      ...c,
      refundRate: c.affiliateGMV > 0 ? (c.affiliateRefundedGMV / c.affiliateGMV) * 100 : 0,
      commissionRate: c.affiliateGMV > 0 ? (c.estCommission / c.affiliateGMV) * 100 : 0,
      gmvPerVideo: c.affiliateShoppableVideos > 0 ? c.affiliateGMV / c.affiliateShoppableVideos : 0,
      avgOrderValue: c.affiliateOrders > 0 ? c.affiliateGMV / c.affiliateOrders : 0,
    }));

    const totalGMV = filteredData.reduce((a, d) => a + d.summary.totalGMV, 0);
    const totalRefund = filteredData.reduce((a, d) => a + d.summary.totalRefundedGMV, 0);
    const totalOrders = filteredData.reduce((a, d) => a + d.summary.totalOrders, 0);
    const totalCommission = filteredData.reduce((a, d) => a + d.summary.totalCommission, 0);
    const totalVideos = filteredData.reduce((a, d) => a + d.summary.totalVideos, 0);
    const totalLive = filteredData.reduce((a, d) => a + d.summary.totalLive, 0);
    const videoGMV = filteredData.reduce((a, d) => a + d.summary.videoGMV, 0);
    const liveGMV = filteredData.reduce((a, d) => a + d.summary.liveGMV, 0);
    const productCardGMV = filteredData.reduce((a, d) => a + d.summary.productCardGMV, 0);
    const sampleSent = filteredData.reduce((a, d) => a + (d.coreSummary?.samplesSent || 0), 0);
    const activeCreators = creators.filter((c) => c.affiliateGMV > 0).length;

    // ── TOTAL IMPRESI ──
    const totalImpressions = creators.reduce((a, c) => a + (c.productImpressions || 0), 0);
    const totalCtr = totalImpressions > 0 ? (totalOrders / totalImpressions) * 100 : 0;
    const gmvPerImpression = totalImpressions > 0 ? totalGMV / totalImpressions : 0;

    // ── NET GMV ──
    const netGMV = totalGMV - totalRefund;

    // ── EFFICIENCY ──
    const gmvPerVideo = totalVideos > 0 ? totalGMV / totalVideos : 0;
    const gmvPerLive = totalLive > 0 ? totalGMV / totalLive : 0;
    const ordersPerVideo = totalVideos > 0 ? totalOrders / totalVideos : 0;
    const ordersPerLive = totalLive > 0 ? totalOrders / totalLive : 0;
    const totalContent = totalVideos + totalLive;
    const gmvPerContent = totalContent > 0 ? totalGMV / totalContent : 0;

    // ── PARETO / CONCENTRATION ──
    const sortedByGMV = [...creators].filter((c) => c.affiliateGMV > 0).sort((a, b) => b.affiliateGMV - a.affiliateGMV);
    let cumulGMV = 0;
    let pareto80Count = 0;
    for (const c of sortedByGMV) {
      cumulGMV += c.affiliateGMV;
      pareto80Count++;
      if (cumulGMV >= totalGMV * 0.8) break;
    }
    const top10Creators = sortedByGMV.slice(0, 10);
    const top10GMV = top10Creators.reduce((a, c) => a + c.affiliateGMV, 0);
    const top5Creators = sortedByGMV.slice(0, 5);
    const top5GMV = top5Creators.reduce((a, c) => a + c.affiliateGMV, 0);
    const paretoPercent = activeCreators > 0 ? (pareto80Count / activeCreators) * 100 : 0;

    // ── SEGMENTATION MATRIX ──
    // Threshold: mean GMV (bukan median) + konten >= 1
    const activeList = creators.filter((c) => c.affiliateGMV > 0);
    const avgGMVThreshold = activeList.length > 0 ? activeList.reduce((a, c) => a + c.affiliateGMV, 0) / activeList.length : 0;
    const contentThreshold = 1; // punya minimal 1 video atau 1 LIVE

    const segmentation = {
      stars: [] as typeof creators,       // GMV tinggi + punya konten
      efficient: [] as typeof creators,   // GMV tinggi + tanpa konten (product card only)
      potential: [] as typeof creators,   // GMV rendah + punya konten
      nurture: [] as typeof creators,     // GMV rendah + tanpa konten (dormant)
    };
    activeList.forEach((c) => {
      const contentCount = c.affiliateShoppableVideos + c.affiliateLiveStreams;
      const highGMV = c.affiliateGMV >= avgGMVThreshold;
      const hasContent = contentCount >= contentThreshold;
      if (highGMV && hasContent) segmentation.stars.push(c);
      else if (highGMV && !hasContent) segmentation.efficient.push(c);
      else if (!highGMV && hasContent) segmentation.potential.push(c);
      else segmentation.nurture.push(c);
    });

    // ── ROI / EFFICIENCY METRICS ──
    const netGMVAfterCommission = netGMV - totalCommission;
    const costPerOrder = totalOrders > 0 ? (totalCommission + sampleSent) / totalOrders : 0;
    const revenuePerCreator = activeCreators > 0 ? totalGMV / activeCreators : 0;

    // ── TARGET vs ACHIEVEMENT ──
    const creatorsWithTarget = creators.filter((c) => c.targetCollabGMV > 0);
    const totalTargetGMV = creatorsWithTarget.reduce((a, c) => a + c.targetCollabGMV, 0);
    const totalTargetAchieved = creatorsWithTarget.reduce((a, c) => a + c.affiliateGMV, 0);
    const targetAchievementRate = totalTargetGMV > 0 ? (totalTargetAchieved / totalTargetGMV) * 100 : 0;

    return {
      totalGMV, totalRefund, totalOrders, totalCommission,
      totalVideos, totalLive, videoGMV, liveGMV, productCardGMV,
      sampleSent, activeCreators, totalCreators: creators.length,
      refundRate: totalGMV > 0 ? (totalRefund / totalGMV) * 100 : 0,
      commissionRate: totalGMV > 0 ? (totalCommission / totalGMV) * 100 : 0,
      avgAOV: totalOrders > 0 ? totalGMV / totalOrders : 0,
      creators,
      coreSummary: filteredData.find((d) => d.coreSummary)?.coreSummary || null,
      // New metrics
      netGMV,
      gmvPerVideo, gmvPerLive, ordersPerVideo, ordersPerLive, gmvPerContent,
      pareto80Count, paretoPercent, top10GMV, top5GMV,
      segmentation, avgGMVThreshold, contentThreshold,
      netGMVAfterCommission, costPerOrder, revenuePerCreator,
      creatorsWithTarget, totalTargetGMV, totalTargetAchieved, targetAchievementRate,
      // Impresi
      totalImpressions, totalCtr, gmvPerImpression,
    };
  }, [filteredData, supabaseCreators, combinedMode]);

  // ─── CREATOR LIST (filtered, sorted) ──────────────────
  const creatorList = useMemo(() => {
    if (!agg) return [];
    let list = agg.creators as (AffiliateCreatorItem & { _months: number })[];
    if (filterStatus !== "all") list = list.filter((c) => creatorStatusSimple(c) === filterStatus);
    if (filterTier !== "all") list = list.filter((c) => c.creatorTier === filterTier);
    if (searchCreator) {
      const q = searchCreator.toLowerCase();
      list = list.filter((c) => c.creatorUsername.toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => {
      let diff = 0;
      if (sortBy === "gmv") diff = b.affiliateGMV - a.affiliateGMV;
      else if (sortBy === "orders") diff = b.affiliateOrders - a.affiliateOrders;
      else if (sortBy === "refund") diff = b.refundRate - a.refundRate;
      else if (sortBy === "videos") diff = b.affiliateShoppableVideos - a.affiliateShoppableVideos;
      else if (sortBy === "commission") diff = b.estCommission - a.estCommission;
      else if (sortBy === "score") diff = b.creatorScore - a.creatorScore;
      return sortAsc ? -diff : diff;
    });
  }, [agg, filterStatus, filterTier, searchCreator, sortBy, sortAsc]);

  // ─── STATUS COUNTS ────────────────────────────────────
  const statusCounts = useMemo(() => {
    if (!agg) return { top: 0, active: 0, "needs-push": 0, inactive: 0, "high-refund": 0 };
    const counts: Record<string, number> = { top: 0, active: 0, "needs-push": 0, inactive: 0, "high-refund": 0 };
    agg.creators.forEach((c) => { counts[creatorStatusSimple(c)]++; });
    return counts;
  }, [agg]);

  // ─── FITUR 3: SPARKLINE DATA (GMV per kreator per bulan) ──
  const sparklineData = useMemo(() => {
    const map: Record<string, number[]> = {};
    const sorted = [...filteredData].sort((a, b) => a.periodRaw.localeCompare(b.periodRaw));
    sorted.forEach((d) => {
      d.creators.forEach((c) => {
        if (!map[c.creatorUsername]) map[c.creatorUsername] = [];
        map[c.creatorUsername].push(c.affiliateGMV);
      });
    });
    return map;
  }, [filteredData]);

  // ─── FITUR 2: ACTION ITEMS (kreator yang perlu tindakan) ──
  const actionItems = useMemo(() => {
    if (!agg || filteredData.length < 1) return [];
    const items: { username: string; reason: string; severity: 'high' | 'medium' | 'low' }[] = [];
    // Rule 1: High refund
    agg.creators.filter((c) => c.refundRate > 30 && c.affiliateGMV > 0).slice(0, 5).forEach((c) => {
      items.push({ username: c.creatorUsername, reason: `Refund rate ${c.refundRate.toFixed(0)}% — perlu investigasi produk yang dijual`, severity: 'high' });
    });
    // Rule 2: Product card GMV tapi 0 video (perlu didorong buat konten)
    agg.creators.filter((c) => c.affiliateProductCardGMV > 0 && c.affiliateShoppableVideos === 0 && c.affiliateLiveStreams === 0).slice(0, 5).forEach((c) => {
      items.push({ username: c.creatorUsername, reason: `GMV dari Product Card (${fRp(c.affiliateProductCardGMV)}) tapi 0 video & 0 LIVE — dorong untuk buat konten`, severity: 'medium' });
    });
    // Rule 3: Score rendah dengan GMV cukup besar
    agg.creators.filter((c) => c.creatorScore < 40 && c.affiliateGMV > 500000).slice(0, 5).forEach((c) => {
      items.push({ username: c.creatorUsername, reason: `Score rendah (${c.creatorScore}/100) padahal GMV ${fRp(c.affiliateGMV)} — evaluasi kualitas konten`, severity: 'medium' });
    });
    // Rule 4: Inactive padahal pernah top
    const sorted = [...filteredData].sort((a, b) => b.periodRaw.localeCompare(a.periodRaw));
    if (sorted.length >= 2) {
      const latest = sorted[0].creators;
      const prev = sorted[1].creators;
      prev.filter((c) => c.affiliateGMV >= 5000000).forEach((c) => {
        const inLatest = latest.find((lc) => lc.creatorUsername === c.creatorUsername);
        if (!inLatest || inLatest.affiliateGMV === 0) {
          items.push({ username: c.creatorUsername, reason: `Top creator bulan lalu (GMV ${fRp(c.affiliateGMV)}) tidak aktif bulan ini`, severity: 'high' });
        }
      });
    }
    return items.slice(0, 10);
  }, [agg, filteredData]);

  // ─── FITUR 1: EXPORT EXCEL ───────────────────────────────
  const exportToExcel = useCallback(async () => {
    if (!agg) return;
    try {
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();
      // Sheet 1: Kreator
      const headers = ['#','Username','Tier','Followers','GMV','Net GMV','Orders','AOV','Videos','LIVE','Items Sold','Refund GMV','Refund%','Komisi','Score','Status','Target GMV','Target %'];
      const rows = creatorList.map((c, i) => {
        const netGMV = c.affiliateGMV - c.affiliateRefundedGMV;
        const target = creatorTargets[c.creatorUsername] || 0;
        const targetPct = target > 0 ? ((c.affiliateGMV / target) * 100).toFixed(1) + '%' : '-';
        return [i+1, '@'+c.creatorUsername, c.creatorTier, c.affiliateFollowers,
          c.affiliateGMV, netGMV, c.affiliateOrders, Math.round(c.avgOrderValue),
          c.affiliateShoppableVideos, c.affiliateLiveStreams, c.itemsSold,
          c.affiliateRefundedGMV, +c.refundRate.toFixed(1), c.estCommission,
          c.creatorScore, creatorStatusSimple(c), target, targetPct];
      });
      const ws1 = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      ws1['!cols'] = headers.map((h, i) => ({ wch: [3,20,8,12,14,14,8,12,8,6,10,12,8,12,6,12,12,8][i] || 12 }));
      XLSX.utils.book_append_sheet(wb, ws1, 'Kreator');
      // Sheet 2: Monthly Trend
      const h2 = ['Periode','Platform','GMV','Kreator Aktif','Total Kreator','Videos','LIVE','Orders','Refund%','Komisi'];
      const r2 = allMonths.map((d) => [d.period, d.platform||d.source, d.summary.totalGMV, d.summary.activeCreators, d.summary.totalCreators, d.summary.totalVideos, d.summary.totalLive, d.summary.totalOrders, +d.summary.refundRate.toFixed(1), d.summary.totalCommission]);
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([h2, ...r2]), 'Tren Bulanan');
      const filename = `affiliate-kreator-${activeStore?.name || 'export'}-${new Date().toISOString().slice(0,10)}.xlsx`;
      XLSX.writeFile(wb, filename);
    } catch (e) { console.error('Export failed:', e); alert('Export gagal. Pastikan library xlsx terinstall.'); }
  }, [agg, creatorList, creatorTargets, allMonths, activeStore]);

  // ═══════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════
  return (
    <div className="space-y-6">
      {/* ── HEADER ──────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-7 h-7 text-blue-600" />
            Affiliate & KOL Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {combinedMode
              ? `Gabungan ${stores.length} toko: ${stores.map((s) => s.name).join(" + ")} — ${filteredData.length} periode data`
              : agg
                ? `${fN(agg.activeCreators)} kreator aktif dari ${fN(agg.totalCreators)} terdaftar — ${filteredData.length} periode data`
                : "Upload file affiliate untuk memulai analisis"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {stores.length >= 2 && (
            <button
              onClick={() => { setCombinedMode(!combinedMode); setSelectedPeriod("all"); }}
              className={`text-sm font-medium px-3 py-2 rounded-lg border transition-colors flex items-center gap-1.5 ${
                combinedMode
                  ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white border-transparent shadow-sm"
                  : "bg-white text-gray-600 hover:bg-gray-50 border-gray-200"
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              {combinedMode ? "Gabungan Aktif" : "Gabungan"}
            </button>
          )}
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value as "all" | "tiktok" | "tokopedia")}
            className="text-sm border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">Semua Platform</option>
            <option value="tiktok">TikTok</option>
            <option value="tokopedia">Tokopedia</option>
          </select>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="text-sm border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">Semua Bulan</option>
            {(() => {
              const seen = new Set<string>();
              return allMonths.filter((d) => {
                const key = `${d.platform || "all"}-${d.periodRaw}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
              }).map((d) => (
                <option key={`${d.platform || "all"}-${d.periodRaw}`} value={d.periodRaw}>
                  {d.period} {d.platform ? `(${d.platform})` : ""}
                </option>
              ));
            })()}
          </select>
          <div className="flex border rounded-lg overflow-hidden">
            {(["dashboard", "creators", "comparison", "retention"] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  view === v ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                {v === "dashboard" ? "Dashboard" : v === "creators" ? "Kreator" : v === "comparison" ? "Perbandingan" : "Retensi"}
              </button>
            ))}
          </div>
          <button
            onClick={async () => {
              if (!activeStore?.id) return;
              setIsLoadingCreators(true);
              try {
                // Pull latest summary + creators from Supabase so viewers on other
                // devices see uploads made elsewhere without needing a full reload.
                await useStoreManager.getState().loadAffiliateFromSupabase(activeStore.id);
                const period = selectedPeriod !== "all"
                  ? (selectedPeriod.split(" ~ ")[0]?.slice(0, 7) || selectedPeriod)
                  : undefined;
                const plt = platformFilter !== "all" ? platformFilter : undefined;
                const fresh = await loadAffiliateCreators(activeStore.id, period, plt);
                setSupabaseCreators(fresh);
              } catch (err: any) {
                if (err?.message !== '__SUPABASE_NOT_CONFIGURED__') {
                  console.error("Refresh failed:", err);
                }
              } finally {
                setIsLoadingCreators(false);
              }
            }}
            disabled={isLoadingCreators || !activeStore?.id}
            className="text-sm font-medium px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors flex items-center gap-1.5"
            title="Ambil data terbaru dari server (device lain)"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingCreators ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          {!combinedMode && <UploadButton onUpload={handleUpload} isUploading={isUploading} />}
        </div>
      </div>

      {/* ── UPLOAD ERROR BANNER ──────────────────────── */}
      {uploadError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-red-700 text-sm">Upload Gagal Disimpan ke Database</p>
            <p className="text-sm text-red-600 mt-1">{uploadError}</p>
            <p className="text-xs text-red-400 mt-2">
              Data mungkin tersimpan di browser lokal saja. Buka DevTools (F12) → Console untuk melihat detail error teknis.
            </p>
          </div>
          <button onClick={() => setUploadError(null)} className="text-red-400 hover:text-red-600 shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {uploadSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
          <p className="text-sm text-green-700 flex-1">{uploadSuccess}</p>
          <button onClick={() => setUploadSuccess(null)} className="text-green-400 hover:text-green-600 shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── EMPTY STATE ─────────────────────────────── */}
      {!agg && <EmptyAffiliate onUpload={handleUpload} />}


      {agg && (
        <>
          {/* ═══════════════════════════════════════════ */}
          {/* DASHBOARD VIEW                              */}
          {/* ═══════════════════════════════════════════ */}
          {view === "dashboard" && (
            <div className="space-y-6">
              {/* ROW 1: 4 PRIMARY KPIs */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                  title="Total GMV Affiliate"
                  value={fRp(agg.totalGMV)}
                  sub={`${filteredData.length} periode data`}
                  color="blue"
                  icon={<DollarSign className="w-5 h-5" />}
                />
                <KPICard
                  title="Kreator Aktif"
                  value={fN(agg.activeCreators)}
                  sub={`dari ${fN(agg.totalCreators)} terdaftar (${fP(agg.totalCreators > 0 ? (agg.activeCreators / agg.totalCreators) * 100 : 0)})`}
                  color="green"
                  icon={<Users className="w-5 h-5" />}
                />
                <KPICard
                  title="Total Video Kreator"
                  value={fN(agg.totalVideos)}
                  sub={`${fN(agg.totalLive)} sesi LIVE`}
                  color="purple"
                  icon={<Video className="w-5 h-5" />}
                />
                <KPICard
                  title="Refund Rate"
                  value={fP(agg.refundRate)}
                  sub={`${fRp(agg.totalRefund)} dikembalikan`}
                  color={agg.refundRate > 15 ? "red" : "green"}
                  icon={<Package className="w-5 h-5" />}
                  alert={agg.refundRate > 15}
                />
              </div>

              {/* ROW IMPRESI */}
              {agg.totalImpressions > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <KPICard
                    title="Total Impresi Produk"
                    value={fN(agg.totalImpressions)}
                    sub={`dari ${fN(agg.totalCreators)} kreator terdaftar`}
                    color="indigo"
                    icon={<Eye className="w-5 h-5" />}
                  />
                  <KPICard
                    title="CTR (Impresi → Order)"
                    value={fP(agg.totalCtr)}
                    sub={`${fN(agg.totalOrders)} order dari ${fN(agg.totalImpressions)} impresi`}
                    color={agg.totalCtr >= 1 ? "green" : agg.totalCtr >= 0.3 ? "orange" : "red"}
                    icon={<ArrowUpRight className="w-5 h-5" />}
                  />
                  <KPICard
                    title="GMV per Impresi"
                    value={fRp(agg.gmvPerImpression)}
                    sub={`Efisiensi impresi ke revenue`}
                    color="teal"
                    icon={<TrendingUp className="w-5 h-5" />}
                  />
                </div>
              )}

              {/* ROW 2: 4 SECONDARY KPIs */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                  title="Total Pesanan"
                  value={fN(agg.totalOrders)}
                  sub={`AOV ${fRp(agg.avgAOV)}`}
                  color="teal"
                  icon={<ShoppingBag className="w-5 h-5" />}
                />
                <KPICard
                  title="Total Komisi"
                  value={fRp(agg.totalCommission)}
                  sub={`Rate ${fP(agg.commissionRate)}`}
                  color="orange"
                  icon={<DollarSign className="w-5 h-5" />}
                />
                <KPICard
                  title="Sample Terkirim"
                  value={fN(agg.sampleSent)}
                  sub="Total sampel ke kreator"
                  color="gray"
                  icon={<Package className="w-5 h-5" />}
                />
                <KPICard
                  title="GMV Video"
                  value={fRp(agg.videoGMV)}
                  sub={`${fP(agg.totalGMV > 0 ? (agg.videoGMV / agg.totalGMV) * 100 : 0)} dari total GMV`}
                  color="indigo"
                  icon={<Video className="w-5 h-5" />}
                />
              </div>

              {/* AI INSIGHTS CARD — sesudah KPI rows, sebelum detail charts */}
              {(() => {
                // Ambil data periode aktif terpilih (atau periode terbaru)
                const currentMonthData = filteredData.length > 0
                  ? filteredData[filteredData.length - 1]
                  : null;
                const prevMonthData = filteredData.length > 1
                  ? filteredData[filteredData.length - 2]
                  : null;
                const aiPeriodKey = currentMonthData
                  ? `${currentMonthData.period}:${currentMonthData.platform}`
                  : `affiliate:${activeStore?.id || 'unknown'}`;
                return (
                  <AffiliateAIInsightsCard
                    monthData={currentMonthData}
                    prevMonthData={prevMonthData}
                    periodKey={aiPeriodKey}
                  />
                );
              })()}

              {/* DAILY AVERAGES (if TikTok core data available) */}
              {agg.coreSummary && (
                <div className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl border p-5">
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-blue-600" />
                    Rata-Rata Harian (dari Core Metrics)
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    {[
                      { label: "Pembeli/Hari", val: fN(agg.coreSummary.avgDailyBuyers) },
                      { label: "Kreator Jual/Hari", val: fN(agg.coreSummary.avgDailyCreatorsWithSales) },
                      { label: "Kreator Post/Hari", val: fN(agg.coreSummary.avgDailyCreatorsPosting) },
                      { label: "Produk Terjual/Hari", val: fN(agg.coreSummary.avgDailyProductsSold) },
                      { label: "Video Jual/Hari", val: fN(agg.coreSummary.avgDailyVideoWithSales) },
                      { label: "LIVE Jual/Hari", val: fN(agg.coreSummary.avgDailyLiveWithSales) },
                    ].map((item) => (
                      <div key={item.label} className="bg-white rounded-lg p-3 text-center border border-gray-100">
                        <p className="text-lg font-bold text-gray-900">{item.val}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{item.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CHANNEL MIX */}
              <div className="bg-white rounded-xl border p-5">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-purple-600" />
                  Kontribusi per Channel
                </h3>
                <div className="grid grid-cols-3 gap-6">
                  {[
                    { label: "Video Shoppable", gmv: agg.videoGMV, color: "bg-blue-500", textColor: "text-blue-600" },
                    { label: "Product Card", gmv: agg.productCardGMV, color: "bg-purple-500", textColor: "text-purple-600" },
                    { label: "LIVE Stream", gmv: agg.liveGMV, color: "bg-green-500", textColor: "text-green-600" },
                  ].map((ch) => {
                    const pct = agg.totalGMV > 0 ? (ch.gmv / agg.totalGMV) * 100 : 0;
                    return (
                      <div key={ch.label} className="text-center">
                        <p className={`text-xl font-bold ${ch.textColor}`}>{fRp(ch.gmv)}</p>
                        <p className="text-sm text-gray-500 mt-1">{ch.label}</p>
                        <div className="mt-3 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${ch.color} transition-all duration-500`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-400 mt-1 font-medium">{fP(pct)}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* STATUS OVERVIEW CARDS */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {(["top", "active", "needs-push", "inactive", "high-refund"] as StatusFilter[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => { setFilterStatus(s === filterStatus ? "all" : s); setView("creators"); }}
                    className={`rounded-xl border p-3 text-center transition-all hover:shadow-md ${
                      filterStatus === s ? "ring-2 ring-blue-500" : ""
                    }`}
                  >
                    <p className="text-2xl font-bold text-gray-900">{statusCounts[s] || 0}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{STATUS_CONFIG[s].label}</p>
                    <span className={`inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_CONFIG[s].cls}`}>
                      {STATUS_CONFIG[s].label}
                    </span>
                  </button>
                ))}
              </div>

              {/* TIER BREAKDOWN */}
              <div className="bg-white rounded-xl border p-5">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-500" />
                  Kreator per Tier
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-gray-500">
                        <th className="pb-2.5 font-medium">Tier</th>
                        <th className="pb-2.5 font-medium text-right">Kreator Aktif</th>
                        <th className="pb-2.5 font-medium text-right">Total GMV</th>
                        <th className="pb-2.5 font-medium text-right">% dari Total</th>
                        <th className="pb-2.5 font-medium text-right">Avg GMV/Kreator</th>
                        <th className="pb-2.5 font-medium text-right">Avg Video</th>
                        <th className="pb-2.5 font-medium text-right">Refund Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(["Mega", "Macro", "Mid", "Micro", "Nano"] as const).map((tier) => {
                        const tc = agg.creators.filter((c) => c.creatorTier === tier && c.affiliateGMV > 0);
                        const tGMV = tc.reduce((a, c) => a + c.affiliateGMV, 0);
                        const tRef = tc.reduce((a, c) => a + c.affiliateRefundedGMV, 0);
                        const tVid = tc.reduce((a, c) => a + c.affiliateShoppableVideos, 0);
                        if (!tc.length) return null;
                        const refRate = tGMV > 0 ? (tRef / tGMV) * 100 : 0;
                        return (
                          <tr key={tier} className="border-b hover:bg-gray-50 transition-colors">
                            <td className="py-2.5">
                              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${TIER_COLORS[tier]}`}>
                                {tier}
                              </span>
                            </td>
                            <td className="py-2.5 text-right font-medium">{fN(tc.length)}</td>
                            <td className="py-2.5 text-right font-bold text-blue-600">{fRp(tGMV)}</td>
                            <td className="py-2.5 text-right">{fP(agg.totalGMV > 0 ? (tGMV / agg.totalGMV) * 100 : 0)}</td>
                            <td className="py-2.5 text-right">{fRp(tc.length > 0 ? tGMV / tc.length : 0)}</td>
                            <td className="py-2.5 text-right">{fN(tc.length > 0 ? Math.round(tVid / tc.length) : 0)}</td>
                            <td className={`py-2.5 text-right font-medium ${refRate > 15 ? "text-red-600" : "text-green-600"}`}>
                              {fP(refRate)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* TOP 10 KREATOR */}
              <div className="bg-white rounded-xl border p-5">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    Top 10 Kreator by GMV
                  </h3>
                  <button onClick={() => setView("creators")} className="text-sm text-blue-600 hover:underline font-medium">
                    Lihat semua kreator →
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-gray-500">
                        <th className="pb-2 font-medium w-8">#</th>
                        <th className="pb-2 font-medium">Kreator</th>
                        <th className="pb-2 font-medium">Tier</th>
                        <th className="pb-2 font-medium text-right">GMV</th>
                        <th className="pb-2 font-medium text-right">Net GMV</th>
                        <th className="pb-2 font-medium text-right">Orders</th>
                        <th className="pb-2 font-medium text-right">Videos</th>
                        <th className="pb-2 font-medium text-right">LIVE</th>
                        <th className="pb-2 font-medium text-right">Refund%</th>
                        <th className="pb-2 font-medium text-right">Komisi</th>
                        <th className="pb-2 font-medium text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {creatorList.slice(0, 10).map((c, i) => {
                        const cNetGMV = c.affiliateGMV - c.affiliateRefundedGMV;
                        return (
                        <tr key={c.creatorUsername} className="border-b hover:bg-gray-50 transition-colors">
                          <td className="py-2.5 font-bold text-gray-400">#{i + 1}</td>
                          <td className="py-2.5">
                            <p className="font-medium text-gray-900">@{c.creatorUsername}</p>
                            {c.affiliateFollowers > 0 && (
                              <p className="text-xs text-gray-400 mt-0.5">{fN(c.affiliateFollowers)} followers</p>
                            )}
                          </td>
                          <td className="py-2.5">
                            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${TIER_COLORS[c.creatorTier]}`}>
                              {c.creatorTier}
                            </span>
                          </td>
                          <td className="py-2.5 text-right font-bold text-blue-600">{fRp(c.affiliateGMV)}</td>
                          <td className={`py-2.5 text-right font-medium ${cNetGMV < c.affiliateGMV * 0.5 ? "text-red-600" : "text-green-600"}`}>{fRp(cNetGMV)}</td>
                          <td className="py-2.5 text-right">{fN(c.affiliateOrders)}</td>
                          <td className="py-2.5 text-right">{fN(c.affiliateShoppableVideos)}</td>
                          <td className="py-2.5 text-right">{fN(c.affiliateLiveStreams)}</td>
                          <td className={`py-2.5 text-right font-medium ${c.refundRate > 20 ? "text-red-600" : c.refundRate > 10 ? "text-yellow-600" : "text-green-600"}`}>
                            {fP(c.refundRate)}
                          </td>
                          <td className="py-2.5 text-right text-purple-600 font-medium">{fRp(c.estCommission)}</td>
                          <td className="py-2.5 text-center">
                            <StatusBadge status={creatorStatusSimple(c)} />
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* REFUND ALERT */}
              {agg.creators.filter((c) => c.refundRate > 30 && c.affiliateGMV > 0).length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold text-red-700">
                        Kreator dengan Refund Tinggi (&gt;30%) — Perlu Investigasi
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {agg.creators
                          .filter((c) => c.refundRate > 30 && c.affiliateGMV > 0)
                          .sort((a, b) => b.refundRate - a.refundRate)
                          .slice(0, 20)
                          .map((c) => (
                            <span key={c.creatorUsername} className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full font-medium">
                              @{c.creatorUsername} ({fP(c.refundRate)} — {fRp(c.affiliateRefundedGMV)})
                            </span>
                          ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ═══ NET GMV & EFFICIENCY METRICS ═══ */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                  title="Net GMV (setelah Refund)"
                  value={fRp(agg.netGMV)}
                  sub={`Refund ${fRp(agg.totalRefund)} (${fP(agg.refundRate)})`}
                  color="teal"
                  icon={<DollarSign className="w-5 h-5" />}
                />
                <KPICard
                  title="GMV per Video"
                  value={fRp(agg.gmvPerVideo)}
                  sub={`${fN(agg.totalVideos)} video total`}
                  color="indigo"
                  icon={<Zap className="w-5 h-5" />}
                />
                <KPICard
                  title="GMV per LIVE"
                  value={fRp(agg.gmvPerLive)}
                  sub={`${fN(agg.totalLive)} sesi LIVE total`}
                  color="purple"
                  icon={<Activity className="w-5 h-5" />}
                />
                <KPICard
                  title="GMV per Konten"
                  value={fRp(agg.gmvPerContent)}
                  sub={`Orders/Video: ${agg.ordersPerVideo.toFixed(1)} — Orders/LIVE: ${agg.ordersPerLive.toFixed(1)}`}
                  color="blue"
                  icon={<BarChart3 className="w-5 h-5" />}
                />
              </div>

              {/* ═══ ROI / EFISIENSI KOMISI ═══ */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                  title="Net GMV (setelah Refund + Komisi)"
                  value={fRp(agg.netGMVAfterCommission)}
                  sub={`Komisi ${fRp(agg.totalCommission)} + Refund ${fRp(agg.totalRefund)}`}
                  color="green"
                  icon={<DollarSign className="w-5 h-5" />}
                />
                <KPICard
                  title="Cost per Order"
                  value={fRp(agg.costPerOrder)}
                  sub={`(Komisi + Sample) / ${fN(agg.totalOrders)} orders`}
                  color="orange"
                  icon={<ShoppingBag className="w-5 h-5" />}
                />
                <KPICard
                  title="Revenue per Kreator"
                  value={fRp(agg.revenuePerCreator)}
                  sub={`GMV / ${fN(agg.activeCreators)} kreator aktif`}
                  color="blue"
                  icon={<Users className="w-5 h-5" />}
                />
                <KPICard
                  title="Commission Rate"
                  value={fP(agg.commissionRate)}
                  sub={`${fRp(agg.totalCommission)} dari ${fRp(agg.totalGMV)}`}
                  color="purple"
                  icon={<DollarSign className="w-5 h-5" />}
                />
              </div>

              {/* ═══ PARETO / CONCENTRATION ANALYSIS ═══ */}
              {agg.activeCreators > 0 && (
                <div className="bg-white rounded-xl border p-5">
                  <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-orange-600" />
                    Analisis Konsentrasi (Pareto)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Pareto 80/20 */}
                    <div className="text-center">
                      <div className="relative w-28 h-28 mx-auto">
                        <svg className="w-28 h-28 -rotate-90" viewBox="0 0 120 120">
                          <circle cx="60" cy="60" r="50" fill="none" stroke="#e5e7eb" strokeWidth="10" />
                          <circle cx="60" cy="60" r="50" fill="none" stroke="#f97316" strokeWidth="10"
                            strokeDasharray={`${Math.min(agg.paretoPercent, 100) * 3.14} 314`} strokeLinecap="round" />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-2xl font-bold text-orange-600">{fP(agg.paretoPercent)}</span>
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-gray-700 mt-2">
                        {fN(agg.pareto80Count)} dari {fN(agg.activeCreators)} kreator
                      </p>
                      <p className="text-xs text-gray-500">menghasilkan 80% total GMV</p>
                      <p className={`text-xs font-medium mt-1 ${agg.paretoPercent <= 20 ? "text-red-600" : agg.paretoPercent <= 40 ? "text-yellow-600" : "text-green-600"}`}>
                        {agg.paretoPercent <= 20 ? "⚠ Sangat terkonsentrasi — risiko tinggi" : agg.paretoPercent <= 40 ? "⚡ Cukup terkonsentrasi" : "✅ Distribusi sehat"}
                      </p>
                    </div>
                    {/* Top 5 Concentration */}
                    <div className="text-center">
                      <div className="relative w-28 h-28 mx-auto">
                        <svg className="w-28 h-28 -rotate-90" viewBox="0 0 120 120">
                          <circle cx="60" cy="60" r="50" fill="none" stroke="#e5e7eb" strokeWidth="10" />
                          <circle cx="60" cy="60" r="50" fill="none" stroke="#8b5cf6" strokeWidth="10"
                            strokeDasharray={`${Math.min(agg.totalGMV > 0 ? (agg.top5GMV / agg.totalGMV) * 100 : 0, 100) * 3.14} 314`} strokeLinecap="round" />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-2xl font-bold text-purple-600">{fP(agg.totalGMV > 0 ? (agg.top5GMV / agg.totalGMV) * 100 : 0)}</span>
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-gray-700 mt-2">Top 5 Kreator</p>
                      <p className="text-xs text-gray-500">kontribusi {fRp(agg.top5GMV)} dari {fRp(agg.totalGMV)}</p>
                    </div>
                    {/* Top 10 Concentration */}
                    <div className="text-center">
                      <div className="relative w-28 h-28 mx-auto">
                        <svg className="w-28 h-28 -rotate-90" viewBox="0 0 120 120">
                          <circle cx="60" cy="60" r="50" fill="none" stroke="#e5e7eb" strokeWidth="10" />
                          <circle cx="60" cy="60" r="50" fill="none" stroke="#3b82f6" strokeWidth="10"
                            strokeDasharray={`${Math.min(agg.totalGMV > 0 ? (agg.top10GMV / agg.totalGMV) * 100 : 0, 100) * 3.14} 314`} strokeLinecap="round" />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-2xl font-bold text-blue-600">{fP(agg.totalGMV > 0 ? (agg.top10GMV / agg.totalGMV) * 100 : 0)}</span>
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-gray-700 mt-2">Top 10 Kreator</p>
                      <p className="text-xs text-gray-500">kontribusi {fRp(agg.top10GMV)} dari {fRp(agg.totalGMV)}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* ═══ AUTOMATED INSIGHTS ═══ */}
              {agg.activeCreators > 0 && (
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-5">
                  <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-600" />
                    Insights & Rekomendasi
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(() => {
                      const insights: { icon: string; text: string; type: "info" | "warning" | "success" | "danger" }[] = [];
                      // Pareto insight
                      if (agg.paretoPercent <= 20) {
                        insights.push({ icon: "🔴", text: `Hanya ${fN(agg.pareto80Count)} kreator (${fP(agg.paretoPercent)}) menghasilkan 80% GMV. Diversifikasi basis kreator untuk kurangi risiko.`, type: "danger" });
                      } else if (agg.paretoPercent <= 35) {
                        insights.push({ icon: "🟡", text: `${fN(agg.pareto80Count)} kreator (${fP(agg.paretoPercent)}) menghasilkan 80% GMV. Cukup terkonsentrasi — pertimbangkan rekrut kreator mid-tier baru.`, type: "warning" });
                      } else {
                        insights.push({ icon: "🟢", text: `GMV terdistribusi sehat — ${fP(agg.paretoPercent)} kreator berkontribusi 80% GMV. Basis kreator sudah kuat.`, type: "success" });
                      }
                      // Refund insight
                      if (agg.refundRate > 15) {
                        const highRefundCount = agg.creators.filter((c) => c.refundRate > 30 && c.affiliateGMV > 0).length;
                        insights.push({ icon: "🔴", text: `Refund rate ${fP(agg.refundRate)} di atas batas aman (15%). ${highRefundCount} kreator punya refund >30% — perlu audit produk & kreator.`, type: "danger" });
                      } else if (agg.refundRate > 8) {
                        insights.push({ icon: "🟡", text: `Refund rate ${fP(agg.refundRate)} — masih terkendali tapi pantau kreator dengan refund tinggi.`, type: "warning" });
                      } else {
                        insights.push({ icon: "🟢", text: `Refund rate ${fP(agg.refundRate)} sangat rendah. Kualitas penjualan baik.`, type: "success" });
                      }
                      // Efficiency insight
                      const potentialCreators = agg.segmentation.potential;
                      if (potentialCreators.length > 0) {
                        const topPotential = [...potentialCreators].sort((a, b) => (b.affiliateShoppableVideos + b.affiliateLiveStreams) - (a.affiliateShoppableVideos + a.affiliateLiveStreams)).slice(0, 3);
                        insights.push({ icon: "💡", text: `${fN(potentialCreators.length)} kreator punya konten banyak tapi GMV rendah (potensi tinggi). Top: ${topPotential.map((c) => "@" + c.creatorUsername).join(", ")}. Coaching atau perbaiki strategi konten mereka.`, type: "info" });
                      }
                      // Inactive insight
                      const inactiveCount = agg.creators.filter((c) => c.affiliateGMV === 0).length;
                      if (inactiveCount > 0) {
                        const inactivePct = (inactiveCount / agg.creators.length) * 100;
                        insights.push({ icon: inactivePct > 50 ? "🔴" : "🟡", text: `${fN(inactiveCount)} kreator (${fP(inactivePct)}) tidak menghasilkan GMV. Evaluasi apakah perlu diaktivasi ulang atau dilepas.`, type: inactivePct > 50 ? "danger" : "warning" });
                      }
                      // LIVE efficiency
                      if (agg.totalLive > 0 && agg.totalVideos > 0) {
                        const liveEfficiency = agg.gmvPerLive;
                        const videoEfficiency = agg.gmvPerVideo;
                        if (liveEfficiency > videoEfficiency * 2) {
                          insights.push({ icon: "🎯", text: `LIVE stream ${fRp(agg.gmvPerLive)}/sesi jauh lebih efektif dari video ${fRp(agg.gmvPerVideo)}/video. Dorong kreator untuk lebih sering LIVE.`, type: "success" });
                        } else if (videoEfficiency > liveEfficiency * 2) {
                          insights.push({ icon: "🎯", text: `Video shoppable ${fRp(agg.gmvPerVideo)}/video lebih efektif dari LIVE ${fRp(agg.gmvPerLive)}/sesi. Fokuskan strategi ke konten video.`, type: "info" });
                        }
                      }
                      // Stars insight
                      if (agg.segmentation.stars.length > 0) {
                        const starsGMV = agg.segmentation.stars.reduce((a, c) => a + c.affiliateGMV, 0);
                        insights.push({ icon: "⭐", text: `${fN(agg.segmentation.stars.length)} kreator bintang (GMV & konten tinggi) menghasilkan ${fRp(starsGMV)}. Pertahankan dan beri insentif ekstra.`, type: "success" });
                      }
                      // Commission efficiency
                      if (agg.commissionRate > 0) {
                        insights.push({ icon: "💰", text: `Cost of sale: ${fP(agg.commissionRate)} dari GMV. Net margin setelah refund & komisi: ${fRp(agg.netGMV - agg.totalCommission)}.`, type: "info" });
                      }
                      return insights.map((ins, idx) => {
                        const bgMap = { info: "bg-blue-50 border-blue-200", warning: "bg-yellow-50 border-yellow-200", success: "bg-green-50 border-green-200", danger: "bg-red-50 border-red-200" };
                        return (
                          <div key={idx} className={`rounded-lg border p-3 ${bgMap[ins.type]}`}>
                            <p className="text-sm text-gray-700">
                              <span className="mr-1.5">{ins.icon}</span>
                              {ins.text}
                            </p>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}

              {/* ═══ CREATOR SEGMENTATION MATRIX ═══ */}
              {agg.activeCreators > 0 && (
                <div className="bg-white rounded-xl border p-5">
                  <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                    <Star className="w-4 h-4 text-indigo-600" />
                    Segmentasi Kreator (Matrix)
                  </h3>
                  <p className="text-xs text-gray-500 mb-4">
                    Threshold: Rata-rata GMV {fRp(agg.avgGMVThreshold)} — Konten min. {fN(agg.contentThreshold)} piece (video/LIVE)
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Stars */}
                    <div className="border-2 border-yellow-300 bg-yellow-50 rounded-xl p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-bold text-yellow-800 flex items-center gap-1">⭐ Bintang</p>
                          <p className="text-xs text-yellow-600">GMV Tinggi + Punya Konten</p>
                        </div>
                        <span className="text-2xl font-bold text-yellow-700">{agg.segmentation.stars.length}</span>
                      </div>
                      <p className="text-xs text-yellow-700 font-medium">
                        GMV: {fRp(agg.segmentation.stars.reduce((a, c) => a + c.affiliateGMV, 0))}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {[...agg.segmentation.stars].sort((a, b) => b.affiliateGMV - a.affiliateGMV).slice(0, 5).map((c) => (
                          <span key={c.creatorUsername} className="text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded font-medium">@{c.creatorUsername}</span>
                        ))}
                        {agg.segmentation.stars.length > 5 && <span className="text-xs text-yellow-600">+{agg.segmentation.stars.length - 5}</span>}
                      </div>
                    </div>
                    {/* Efficient */}
                    <div className="border-2 border-blue-300 bg-blue-50 rounded-xl p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-bold text-blue-800 flex items-center gap-1">💎 Efisien</p>
                          <p className="text-xs text-blue-600">GMV Tinggi + Tanpa Video/LIVE (Product Card)</p>
                        </div>
                        <span className="text-2xl font-bold text-blue-700">{agg.segmentation.efficient.length}</span>
                      </div>
                      <p className="text-xs text-blue-700 font-medium">
                        GMV: {fRp(agg.segmentation.efficient.reduce((a, c) => a + c.affiliateGMV, 0))}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {[...agg.segmentation.efficient].sort((a, b) => b.affiliateGMV - a.affiliateGMV).slice(0, 5).map((c) => (
                          <span key={c.creatorUsername} className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-medium">@{c.creatorUsername}</span>
                        ))}
                        {agg.segmentation.efficient.length > 5 && <span className="text-xs text-blue-600">+{agg.segmentation.efficient.length - 5}</span>}
                      </div>
                    </div>
                    {/* Potential */}
                    <div className="border-2 border-green-300 bg-green-50 rounded-xl p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-bold text-green-800 flex items-center gap-1">🚀 Potensi Tinggi</p>
                          <p className="text-xs text-green-600">GMV Rendah + Punya Konten</p>
                        </div>
                        <span className="text-2xl font-bold text-green-700">{agg.segmentation.potential.length}</span>
                      </div>
                      <p className="text-xs text-green-700 font-medium">
                        GMV: {fRp(agg.segmentation.potential.reduce((a, c) => a + c.affiliateGMV, 0))}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {[...agg.segmentation.potential].sort((a, b) => (b.affiliateShoppableVideos + b.affiliateLiveStreams) - (a.affiliateShoppableVideos + a.affiliateLiveStreams)).slice(0, 5).map((c) => (
                          <span key={c.creatorUsername} className="text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded font-medium">@{c.creatorUsername}</span>
                        ))}
                        {agg.segmentation.potential.length > 5 && <span className="text-xs text-green-600">+{agg.segmentation.potential.length - 5}</span>}
                      </div>
                    </div>
                    {/* Nurture */}
                    <div className="border-2 border-gray-300 bg-gray-50 rounded-xl p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-bold text-gray-700 flex items-center gap-1">🌱 Perlu Dorong</p>
                          <p className="text-xs text-gray-500">GMV Rendah + Tanpa Video/LIVE (Dormant)</p>
                        </div>
                        <span className="text-2xl font-bold text-gray-600">{agg.segmentation.nurture.length}</span>
                      </div>
                      <p className="text-xs text-gray-600 font-medium">
                        GMV: {fRp(agg.segmentation.nurture.reduce((a, c) => a + c.affiliateGMV, 0))}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {[...agg.segmentation.nurture].sort((a, b) => b.affiliateGMV - a.affiliateGMV).slice(0, 5).map((c) => (
                          <span key={c.creatorUsername} className="text-xs bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded font-medium">@{c.creatorUsername}</span>
                        ))}
                        {agg.segmentation.nurture.length > 5 && <span className="text-xs text-gray-500">+{agg.segmentation.nurture.length - 5}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ═══ TARGET vs ACHIEVEMENT (Manual Targets) ═══ */}
              <div className="bg-white rounded-xl border p-5">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                    <Target className="w-4 h-4 text-red-600" />
                    Target vs Pencapaian {combinedMode && <span className="text-xs font-normal text-gray-400">(Gabungan semua toko)</span>}
                  </h3>
                  {!combinedMode && (
                    <button
                      onClick={() => { setEditingTarget(null); setShowTargetForm(true); }}
                      className="text-sm font-medium px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" /> Tambah Target
                    </button>
                  )}
                </div>
                {(() => {
                  const targets: (AffiliateTarget & { _storeName?: string })[] = combinedMode
                    ? stores.flatMap((s) => (s.affiliateTargets || []).map((t) => ({ ...t, _storeName: s.name })))
                    : (activeStore?.affiliateTargets || []);
                  if (targets.length === 0) {
                    return (
                      <div className="text-center py-8 text-gray-400">
                        <Target className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p className="text-sm font-medium">Belum ada target yang ditentukan</p>
                        <p className="text-xs mt-1">{combinedMode ? "Tambah target di masing-masing toko untuk melihat perbandingan." : 'Klik "Tambah Target" untuk menentukan target GMV, video, LIVE, dll.'}</p>
                      </div>
                    );
                  }
                  return (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-gray-500">
                            {combinedMode && <th className="pb-2 font-medium">Toko</th>}
                            <th className="pb-2 font-medium">Periode</th>
                              <th className="pb-2 font-medium text-right">Target GMV</th>
                              <th className="pb-2 font-medium text-right">Actual GMV</th>
                              <th className="pb-2 font-medium text-right">Target Video</th>
                              <th className="pb-2 font-medium text-right">Actual Video</th>
                              <th className="pb-2 font-medium text-right">Target LIVE</th>
                              <th className="pb-2 font-medium text-right">Actual LIVE</th>
                              <th className="pb-2 font-medium text-right">Target Orders</th>
                              <th className="pb-2 font-medium text-right">Actual Orders</th>
                            <th className="pb-2 font-medium text-center">GMV %</th>
                            {!combinedMode && <th className="pb-2 font-medium text-center w-20">Aksi</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {targets.map((t) => {
                              const periodData = t.period === "all"
                                ? filteredData
                                : allMonths.filter((d) => d.periodRaw.startsWith(t.period));
                              const actualGMV = periodData.reduce((a, d) => a + d.summary.totalGMV, 0);
                              const actualVideos = periodData.reduce((a, d) => a + d.summary.totalVideos, 0);
                              const actualLive = periodData.reduce((a, d) => a + d.summary.totalLive, 0);
                              const actualOrders = periodData.reduce((a, d) => a + d.summary.totalOrders, 0);
                              const gmvAch = t.targetGMV > 0 ? (actualGMV / t.targetGMV) * 100 : 0;
                              const achColor = (v: number) => v >= 100 ? "text-green-600" : v >= 70 ? "text-yellow-600" : "text-red-600";
                              const achBadge = (v: number) => v >= 100 ? "bg-green-100 text-green-700" : v >= 70 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700";
                              const pctCell = (actual: number, target: number) => {
                                if (target <= 0) return <span className="text-gray-300">—</span>;
                                const pct = (actual / target) * 100;
                                return <span className={`font-bold ${achColor(pct)}`}>{fP(pct)}</span>;
                              };
                            return (
                              <tr key={`${(t as any)._storeName || ''}-${t.id}`} className="border-b hover:bg-gray-50">
                                {combinedMode && <td className="py-2.5 text-xs font-medium text-gray-500">{(t as any)._storeName}</td>}
                                <td className="py-2.5 font-medium">{t.period === "all" ? "Semua Periode" : t.period}{t.notes && <span className="text-xs text-gray-400 ml-1">({t.notes})</span>}</td>
                                  <td className="py-2.5 text-right">{t.targetGMV > 0 ? fRp(t.targetGMV) : <span className="text-gray-300">—</span>}</td>
                                  <td className="py-2.5 text-right font-bold text-blue-600">{fRp(actualGMV)}</td>
                                  <td className="py-2.5 text-right">{t.targetVideos > 0 ? fN(t.targetVideos) : <span className="text-gray-300">—</span>}</td>
                                  <td className="py-2.5 text-right font-medium">{fN(actualVideos)}{t.targetVideos > 0 && <> {pctCell(actualVideos, t.targetVideos)}</>}</td>
                                  <td className="py-2.5 text-right">{t.targetLive > 0 ? fN(t.targetLive) : <span className="text-gray-300">—</span>}</td>
                                  <td className="py-2.5 text-right font-medium">{fN(actualLive)}{t.targetLive > 0 && <> {pctCell(actualLive, t.targetLive)}</>}</td>
                                  <td className="py-2.5 text-right">{t.targetOrders > 0 ? fN(t.targetOrders) : <span className="text-gray-300">—</span>}</td>
                                  <td className="py-2.5 text-right font-medium">{fN(actualOrders)}{t.targetOrders > 0 && <> {pctCell(actualOrders, t.targetOrders)}</>}</td>
                                  <td className="py-2.5 text-center">
                                    {t.targetGMV > 0 ? (
                                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${achBadge(gmvAch)}`}>
                                        {fP(gmvAch)}
                                      </span>
                                    ) : <span className="text-gray-300">—</span>}
                                  </td>
                                {!combinedMode && (
                                  <td className="py-2.5 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                      <button onClick={() => { setEditingTarget(t); setShowTargetForm(true); }} className="text-gray-400 hover:text-blue-500 p-0.5"><Edit3 className="w-3.5 h-3.5" /></button>
                                      <button onClick={() => activeStore && deleteAffiliateTarget(activeStore.id, t.id)} className="text-gray-400 hover:text-red-500 p-0.5"><Trash2 className="w-3.5 h-3.5" /></button>
                                    </div>
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      {/* Summary row */}
                      {targets.some((t) => t.targetGMV > 0) && (() => {
                        const sumTargetGMV = targets.reduce((a, t) => a + t.targetGMV, 0);
                        const sumActualGMV = agg.totalGMV;
                        const overallAch = sumTargetGMV > 0 ? (sumActualGMV / sumTargetGMV) * 100 : 0;
                        return (
                          <div className="mt-4 bg-gray-50 rounded-lg p-4">
                            <div className="grid grid-cols-3 gap-4 text-center">
                              <div>
                                <p className="text-xs text-gray-500 font-medium uppercase">Total Target GMV</p>
                                <p className="text-lg font-bold text-gray-900">{fRp(sumTargetGMV)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 font-medium uppercase">Total Actual GMV</p>
                                <p className="text-lg font-bold text-blue-600">{fRp(sumActualGMV)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 font-medium uppercase">Overall Achievement</p>
                                <p className={`text-lg font-bold ${overallAch >= 100 ? "text-green-600" : overallAch >= 70 ? "text-yellow-600" : "text-red-600"}`}>{fP(overallAch)}</p>
                                <div className="mt-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                                  <div className={`h-full rounded-full transition-all duration-500 ${overallAch >= 100 ? "bg-green-500" : overallAch >= 70 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${Math.min(overallAch, 100)}%` }} />
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  );
                })()}
              </div>

              {/* Target Form Modal */}
              {showTargetForm && activeStore && (
                <TargetFormModal
                  initial={editingTarget}
                  onSave={(t) => { saveAffiliateTarget(activeStore.id, t); setShowTargetForm(false); }}
                  onClose={() => setShowTargetForm(false)}
                />
              )}

              {/* MONTHLY TREND */}
              {allMonths.length > 1 && (
                <div className="bg-white rounded-xl border p-5">
                  <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                    Tren Bulanan
                  </h3>
                  {/* SVG Line Chart */}
                  {(() => {
                    const sorted = [...allMonths].sort((a, b) => a.periodRaw.localeCompare(b.periodRaw));
                    const maxGMV = Math.max(...sorted.map((d) => d.summary.totalGMV), 1);
                    const maxOrders = Math.max(...sorted.map((d) => d.summary.totalOrders), 1);
                    const W = 700, H = 200, PX = 50, PY = 20;
                    const cW = W - PX * 2, cH = H - PY * 2;
                    const pts = sorted.map((d, i) => ({
                      x: PX + (sorted.length > 1 ? (i / (sorted.length - 1)) * cW : cW / 2),
                      yGMV: PY + cH - (d.summary.totalGMV / maxGMV) * cH,
                      yOrd: PY + cH - (d.summary.totalOrders / maxOrders) * cH,
                      label: d.period?.replace(/\s*~.*/, "") || d.periodRaw.slice(0, 7),
                      gmv: d.summary.totalGMV,
                      orders: d.summary.totalOrders,
                      store: (d as any)._storeName || "",
                    }));
                    const gmvLine = pts.map((p) => `${p.x},${p.yGMV}`).join(" ");
                    const ordLine = pts.map((p) => `${p.x},${p.yOrd}`).join(" ");
                    return (
                      <div className="mb-6 overflow-x-auto">
                        <svg viewBox={`0 0 ${W} ${H + 30}`} className="w-full max-w-[720px] mx-auto" preserveAspectRatio="xMidYMid meet">
                          {/* Grid lines */}
                          {[0, 0.25, 0.5, 0.75, 1].map((f) => (
                            <g key={f}>
                              <line x1={PX} y1={PY + cH * (1 - f)} x2={W - PX} y2={PY + cH * (1 - f)} stroke="#e5e7eb" strokeWidth="1" />
                              <text x={PX - 5} y={PY + cH * (1 - f) + 4} textAnchor="end" className="text-[9px] fill-gray-400">{fRp(maxGMV * f)}</text>
                            </g>
                          ))}
                          {/* GMV line */}
                          <polyline points={gmvLine} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinejoin="round" />
                          {/* Orders line */}
                          <polyline points={ordLine} fill="none" stroke="#10b981" strokeWidth="1.5" strokeDasharray="6 3" strokeLinejoin="round" />
                          {/* Dots + labels */}
                          {pts.map((p, i) => (
                            <g key={i}>
                              <circle cx={p.x} cy={p.yGMV} r="4" fill="#3b82f6" stroke="white" strokeWidth="2" />
                              <circle cx={p.x} cy={p.yOrd} r="3" fill="#10b981" stroke="white" strokeWidth="1.5" />
                              <text x={p.x} y={H + 12} textAnchor="middle" className="text-[9px] fill-gray-500">{p.label}</text>
                              {combinedMode && p.store && <text x={p.x} y={H + 24} textAnchor="middle" className="text-[7px] fill-gray-400">{p.store}</text>}
                            </g>
                          ))}
                          {/* Legend */}
                          <circle cx={PX} cy={H + 22} r="4" fill="#3b82f6" />
                          <text x={PX + 8} y={H + 25} className="text-[9px] fill-gray-600">GMV</text>
                          <circle cx={PX + 50} cy={H + 22} r="3" fill="#10b981" />
                          <text x={PX + 58} y={H + 25} className="text-[9px] fill-gray-600">Orders (skala kanan)</text>
                        </svg>
                      </div>
                    );
                  })()}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-gray-500">
                          <th className="pb-2 font-medium">Periode</th>
                          <th className="pb-2 font-medium">Platform</th>
                          <th className="pb-2 font-medium text-right">GMV</th>
                          <th className="pb-2 font-medium text-right">Kreator Aktif</th>
                          <th className="pb-2 font-medium text-right">Videos</th>
                          <th className="pb-2 font-medium text-right">LIVE</th>
                          <th className="pb-2 font-medium text-right">Orders</th>
                          <th className="pb-2 font-medium text-right">Refund%</th>
                          <th className="pb-2 font-medium text-right">Komisi</th>
                          <th className="pb-2 font-medium text-center w-20">{combinedMode ? "Toko" : "Aksi"}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allMonths.map((d, i) => {
                          const prev = allMonths[i - 1];
                          const growth = prev && prev.summary.totalGMV > 0
                            ? ((d.summary.totalGMV - prev.summary.totalGMV) / prev.summary.totalGMV) * 100
                            : null;
                          return (
                            <tr key={`${(d as any)._storeName || ''}-${d.platform}-${d.periodRaw}`} className="border-b hover:bg-gray-50">
                              <td className="py-2.5 font-medium">{d.period}</td>
                              <td className="py-2.5">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                  d.platform === "tiktok" ? "bg-gray-900 text-white" : d.platform === "tokopedia" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                                }`}>
                                  {d.platform || d.source}
                                </span>
                              </td>
                              <td className="py-2.5 text-right font-bold text-blue-600">
                                {fRp(d.summary.totalGMV)}
                                {growth !== null && (
                                  <span className={`ml-1 text-xs font-medium ${growth >= 0 ? "text-green-500" : "text-red-500"}`}>
                                    {growth >= 0 ? "↑" : "↓"}{Math.abs(growth).toFixed(0)}%
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 text-right">{fN(d.summary.activeCreators)}/{fN(d.summary.totalCreators)}</td>
                              <td className="py-2.5 text-right">{fN(d.summary.totalVideos)}</td>
                              <td className="py-2.5 text-right">{fN(d.summary.totalLive)}</td>
                              <td className="py-2.5 text-right">{fN(d.summary.totalOrders)}</td>
                              <td className={`py-2.5 text-right font-medium ${d.summary.refundRate > 15 ? "text-red-600" : "text-green-600"}`}>
                                {fP(d.summary.refundRate)}
                              </td>
                              <td className="py-2.5 text-right text-purple-600">{fRp(d.summary.totalCommission)}</td>
                              <td className="py-2.5 text-center">
                                {combinedMode ? (
                                  <span className="text-xs text-gray-400">{(d as any)._storeName}</span>
                                ) : (
                                  <button
                                    onClick={() => activeStore && deleteAffiliateData(activeStore.id, d.periodRaw, d.platform)}
                                    className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                    title="Hapus periode ini"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ═══ NEW vs REPEAT CREATORS ═══ */}
              {allMonths.length >= 2 && (() => {
                const sorted = [...allMonths].sort((a, b) => a.periodRaw.localeCompare(b.periodRaw));
                const results: { period: string; newCount: number; repeatCount: number; lostCount: number; retentionRate: number; newNames: string[]; lostNames: string[] }[] = [];
                for (let i = 1; i < sorted.length; i++) {
                  const prevSet = new Set(sorted[i - 1].creators.filter((c) => c.affiliateGMV > 0).map((c) => c.creatorUsername));
                  const currActive = sorted[i].creators.filter((c) => c.affiliateGMV > 0);
                  const currSet = new Set(currActive.map((c) => c.creatorUsername));
                  const newCreators = currActive.filter((c) => !prevSet.has(c.creatorUsername));
                  const repeatCreators = currActive.filter((c) => prevSet.has(c.creatorUsername));
                  const lostCreators = [...prevSet].filter((u) => !currSet.has(u));
                  const retention = prevSet.size > 0 ? (repeatCreators.length / prevSet.size) * 100 : 0;
                  results.push({
                    period: sorted[i].period || sorted[i].periodRaw,
                    newCount: newCreators.length,
                    repeatCount: repeatCreators.length,
                    lostCount: lostCreators.length,
                    retentionRate: retention,
                    newNames: newCreators.sort((a, b) => b.affiliateGMV - a.affiliateGMV).slice(0, 5).map((c) => c.creatorUsername),
                    lostNames: lostCreators.slice(0, 5),
                  });
                }
                if (!results.length || results.every((r) => r.newCount === 0 && r.repeatCount === 0)) return null;
                return (
                  <div className="bg-white rounded-xl border p-5">
                    <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 text-indigo-600" />
                      Kreator Baru vs Repeat (Month-over-Month)
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-gray-500">
                            <th className="pb-2 font-medium">Periode</th>
                            <th className="pb-2 font-medium text-right">Baru</th>
                            <th className="pb-2 font-medium text-right">Repeat</th>
                            <th className="pb-2 font-medium text-right">Hilang</th>
                            <th className="pb-2 font-medium text-right">Retention Rate</th>
                            <th className="pb-2 font-medium">Top Kreator Baru</th>
                          </tr>
                        </thead>
                        <tbody>
                          {results.map((r) => (
                            <tr key={r.period} className="border-b hover:bg-gray-50">
                              <td className="py-2.5 font-medium">{r.period}</td>
                              <td className="py-2.5 text-right font-bold text-green-600">+{fN(r.newCount)}</td>
                              <td className="py-2.5 text-right font-medium text-blue-600">{fN(r.repeatCount)}</td>
                              <td className="py-2.5 text-right font-medium text-red-600">-{fN(r.lostCount)}</td>
                              <td className={`py-2.5 text-right font-bold ${r.retentionRate >= 70 ? "text-green-600" : r.retentionRate >= 50 ? "text-yellow-600" : "text-red-600"}`}>{fP(r.retentionRate)}</td>
                              <td className="py-2.5">
                                <div className="flex flex-wrap gap-1">
                                  {r.newNames.map((n) => <span key={n} className="text-xs bg-green-50 text-green-700 px-1.5 py-0.5 rounded">@{n}</span>)}
                                  {r.newCount > 5 && <span className="text-xs text-gray-400">+{r.newCount - 5}</span>}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}

              {/* ═══ PER-STORE COMPARISON (Combined Mode) ═══ */}
              {combinedMode && stores.length >= 2 && (() => {
                const storeMetrics = stores.map((s) => {
                  const data = s.affiliateData || [];
                  const gmv = data.reduce((a, d) => a + d.summary.totalGMV, 0);
                  const orders = data.reduce((a, d) => a + d.summary.totalOrders, 0);
                  const refund = data.reduce((a, d) => a + d.summary.totalRefundedGMV, 0);
                  const videos = data.reduce((a, d) => a + d.summary.totalVideos, 0);
                  const live = data.reduce((a, d) => a + d.summary.totalLive, 0);
                  const commission = data.reduce((a, d) => a + d.summary.totalCommission, 0);
                  const activeCreators = new Set(data.flatMap((d) => d.creators.filter((c) => c.affiliateGMV > 0).map((c) => c.creatorUsername))).size;
                  return { name: s.name, color: s.color, periods: data.length, gmv, orders, refund, videos, live, commission, activeCreators, refundRate: gmv > 0 ? (refund / gmv) * 100 : 0 };
                });
                const maxGMV = Math.max(...storeMetrics.map((s) => s.gmv), 1);
                return (
                  <div className="bg-white rounded-xl border p-5">
                    <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4 text-purple-600" />
                      Perbandingan Per Toko
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-gray-500">
                            <th className="pb-2 font-medium">Toko</th>
                            <th className="pb-2 font-medium text-right">Periode</th>
                            <th className="pb-2 font-medium text-right">GMV</th>
                            <th className="pb-2 font-medium text-right">Orders</th>
                            <th className="pb-2 font-medium text-right">Kreator Aktif</th>
                            <th className="pb-2 font-medium text-right">Video</th>
                            <th className="pb-2 font-medium text-right">LIVE</th>
                            <th className="pb-2 font-medium text-right">Refund%</th>
                            <th className="pb-2 font-medium text-right">Komisi</th>
                            <th className="pb-2 font-medium">Share GMV</th>
                          </tr>
                        </thead>
                        <tbody>
                          {storeMetrics.map((s) => (
                            <tr key={s.name} className="border-b hover:bg-gray-50">
                              <td className="py-2.5 font-bold">{s.name}</td>
                              <td className="py-2.5 text-right">{s.periods}</td>
                              <td className="py-2.5 text-right font-bold text-blue-600">{fRp(s.gmv)}</td>
                              <td className="py-2.5 text-right">{fN(s.orders)}</td>
                              <td className="py-2.5 text-right">{fN(s.activeCreators)}</td>
                              <td className="py-2.5 text-right">{fN(s.videos)}</td>
                              <td className="py-2.5 text-right">{fN(s.live)}</td>
                              <td className={`py-2.5 text-right font-medium ${s.refundRate > 15 ? "text-red-600" : "text-green-600"}`}>{fP(s.refundRate)}</td>
                              <td className="py-2.5 text-right text-purple-600">{fRp(s.commission)}</td>
                              <td className="py-2.5 w-32">
                                <div className="bg-gray-100 rounded-full h-2.5 overflow-hidden">
                                  <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${(s.gmv / maxGMV) * 100}%` }} />
                                </div>
                                <p className="text-xs text-gray-500 mt-0.5">{fP(agg.totalGMV > 0 ? (s.gmv / agg.totalGMV) * 100 : 0)}</p>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}

              {/* ═══ FITUR 2: ACTION PLAN PANEL ═══ */}
              {actionItems.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                  <h3 className="font-semibold text-amber-800 mb-3 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-600" />
                    Action Plan — {actionItems.length} Kreator Perlu Perhatian
                  </h3>
                  <div className="space-y-2">
                    {actionItems.map((item, i) => (
                      <div key={i} className={`flex items-start gap-3 p-3 rounded-lg ${
                        item.severity === 'high' ? 'bg-red-50 border border-red-100' :
                        item.severity === 'medium' ? 'bg-amber-50 border border-amber-100' :
                        'bg-blue-50 border border-blue-100'
                      }`}>
                        <span className={`text-base ${
                          item.severity === 'high' ? '🔴' : item.severity === 'medium' ? '🟡' : '🔵'
                        }`}>{item.severity === 'high' ? '🔴' : item.severity === 'medium' ? '🟡' : '🔵'}</span>
                        <div>
                          <p className="font-semibold text-gray-800 text-sm">@{item.username}</p>
                          <p className="text-xs text-gray-600 mt-0.5">{item.reason}</p>
                        </div>
                        <button
                          onClick={() => { setView('creators'); setSearchCreator(item.username); }}
                          className="ml-auto text-xs px-2 py-1 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 shrink-0"
                        >
                          Lihat →
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ═══ EXPORT BUTTON ═══ */}
              <div className="flex justify-end gap-2">
                <button
                  onClick={exportToExcel}
                  className="text-sm font-medium px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export Excel (.xlsx)
                </button>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════ */}
          {/* CREATOR LIST VIEW                           */}
          {/* ═══════════════════════════════════════════ */}
          {view === "creators" && (
            <div className="space-y-4">
              {/* Filter & Search Bar */}
              <div className="bg-white rounded-xl border p-4 flex flex-wrap gap-3 items-center">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={searchCreator}
                    onChange={(e) => setSearchCreator(e.target.value)}
                    placeholder="Cari username kreator..."
                    className="border rounded-lg pl-9 pr-3 py-2 text-sm w-64 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {searchCreator && (
                    <button onClick={() => setSearchCreator("")} className="absolute right-2 top-1/2 -translate-y-1/2">
                      <X className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                  )}
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as StatusFilter)}
                  className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Semua Status</option>
                  <option value="top">Top Performer ({statusCounts.top})</option>
                  <option value="active">Aktif ({statusCounts.active})</option>
                  <option value="needs-push">Perlu Dorong ({statusCounts["needs-push"]})</option>
                  <option value="inactive">Tidak Aktif ({statusCounts.inactive})</option>
                  <option value="high-refund">Refund Tinggi ({statusCounts["high-refund"]})</option>
                </select>
                <select
                  value={filterTier}
                  onChange={(e) => setFilterTier(e.target.value)}
                  className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Semua Tier</option>
                  <option value="Mega">Mega</option>
                  <option value="Macro">Macro</option>
                  <option value="Mid">Mid</option>
                  <option value="Micro">Micro</option>
                  <option value="Nano">Nano</option>
                </select>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortKey)}
                  className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="gmv">Sort: GMV</option>
                  <option value="orders">Sort: Orders</option>
                  <option value="refund">Sort: Refund %</option>
                  <option value="videos">Sort: Videos</option>
                  <option value="commission">Sort: Komisi</option>
                  <option value="score">Sort: Score</option>
                </select>
                <button
                  onClick={() => setSortAsc(!sortAsc)}
                  className="border rounded-lg px-3 py-2 text-sm hover:bg-gray-50"
                  title={sortAsc ? "Ascending" : "Descending"}
                >
                  {sortAsc ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                <span className="text-sm text-gray-500 ml-auto font-medium">{fN(creatorList.length)} kreator</span>
              </div>

              {/* Creator Table — Header Export */}
              <div className="flex justify-end mb-2">
                <button onClick={exportToExcel} className="text-xs font-medium px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors flex items-center gap-1.5">
                  <Download className="w-3.5 h-3.5" /> Export Excel
                </button>
              </div>

              {/* Creator Table */}
              <div className="bg-white rounded-xl border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-3 py-3 text-left font-medium text-gray-600 w-10">#</th>
                        <th className="px-3 py-3 text-left font-medium text-gray-600">Kreator</th>
                        <th className="px-3 py-3 text-right font-medium text-gray-600">GMV Trend</th>
                        <th className="px-3 py-3 text-right font-medium text-gray-600">GMV</th>
                        <th className="px-3 py-3 text-right font-medium text-gray-600">Target GMV</th>
                        <th className="px-3 py-3 text-right font-medium text-gray-600">Net GMV</th>
                        <th className="px-3 py-3 text-right font-medium text-gray-600">Orders</th>
                        <th className="px-3 py-3 text-right font-medium text-gray-600">AOV</th>
                        <th className="px-3 py-3 text-right font-medium text-gray-600">Videos</th>
                        <th className="px-3 py-3 text-right font-medium text-gray-600">LIVE</th>
                        <th className="px-3 py-3 text-right font-medium text-gray-600">Produk</th>
                        <th className="px-3 py-3 text-right font-medium text-gray-600">Refund</th>
                        <th className="px-3 py-3 text-right font-medium text-gray-600">Ref%</th>
                        <th className="px-3 py-3 text-right font-medium text-gray-600">Komisi</th>
                        <th className="px-3 py-3 text-right font-medium text-gray-600">Score</th>
                        <th className="px-3 py-3 text-center font-medium text-gray-600">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {creatorList.slice(0, 200).map((c, i) => {
                        const isExpanded = expandedCreator === c.creatorUsername;
                        return (
                          <React.Fragment key={c.creatorUsername}>
                          <tr
                            className={`hover:bg-gray-50 transition-colors cursor-pointer ${isExpanded ? "bg-blue-50 border-b-0" : ""}`}
                            onClick={() => setExpandedCreator(isExpanded ? null : c.creatorUsername)}
                          >
                            <td className="px-3 py-2.5 text-gray-400 font-bold text-xs">{i + 1}</td>
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-2">
                                <div>
                                  <p className="font-medium text-gray-900">@{c.creatorUsername}</p>
                                  <div className="flex gap-1 mt-0.5 flex-wrap">
                                    <span className={`text-xs px-1.5 py-0 rounded ${TIER_COLORS[c.creatorTier]}`}>{c.creatorTier}</span>
                                    {c.affiliateFollowers > 0 && (
                                      <span className="text-xs text-gray-400">
                                        {fN(c.affiliateFollowers)} followers
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-blue-500 ml-auto flex-shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-300 ml-auto flex-shrink-0" />}
                              </div>
                            </td>
                            {/* Fitur 3: Sparkline */}
                            <td className="px-3 py-2.5">
                              {(() => {
                                const vals = sparklineData[c.creatorUsername];
                                if (!vals || vals.length < 2) return <span className="text-gray-200 text-xs">—</span>;
                                const max = Math.max(...vals, 1);
                                const W = 48, H = 18, bW = Math.max(3, Math.floor(W / vals.length) - 1);
                                const trend = vals[vals.length-1] > vals[0];
                                const color = trend ? '#10b981' : '#ef4444';
                                return (
                                  <svg width={W} height={H} className="inline-block align-middle">
                                    {vals.map((v, idx) => {
                                      const bH = Math.max(2, Math.round((v / max) * (H - 2)));
                                      return <rect key={idx} x={idx * (bW + 1)} y={H - bH} width={bW} height={bH} fill={color} rx="1" opacity="0.75" />;
                                    })}
                                  </svg>
                                );
                              })()}
                            </td>
                            <td className="px-3 py-2.5 text-right font-bold text-blue-600">{fRp(c.affiliateGMV)}</td>
                            {/* Fitur 5: Target per kreator */}
                            <td className="px-3 py-2.5 text-right">
                              {(() => {
                                const target = creatorTargets[c.creatorUsername] || 0;
                                const pct = target > 0 ? Math.min((c.affiliateGMV / target) * 100, 100) : 0;
                                return (
                                  <div className="min-w-[80px]">
                                    {target > 0 ? (
                                      <>
                                        <p className={`text-xs font-bold ${pct >= 100 ? 'text-green-600' : pct >= 60 ? 'text-amber-600' : 'text-red-500'}`}>{pct.toFixed(0)}%</p>
                                        <div className="h-1.5 bg-gray-100 rounded-full mt-0.5 overflow-hidden">
                                          <div className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-green-500' : pct >= 60 ? 'bg-amber-400' : 'bg-red-400'}`} style={{width: `${pct}%`}} />
                                        </div>
                                        <p className="text-[10px] text-gray-400 mt-0.5">{fRp(target)}</p>
                                      </>
                                    ) : (
                                      <input
                                        type="number"
                                        placeholder="Set target"
                                        className="w-20 text-xs border rounded px-1.5 py-1 text-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-400"
                                        onClick={(e) => e.stopPropagation()}
                                        onBlur={(e) => { const v = parseInt(e.target.value); if (v > 0) saveCreatorTarget(c.creatorUsername, v); }}
                                        onKeyDown={(e) => { if (e.key === 'Enter') { const v = parseInt((e.target as HTMLInputElement).value); if (v > 0) { saveCreatorTarget(c.creatorUsername, v); (e.target as HTMLInputElement).blur(); }}}}
                                      />
                                    )}
                                  </div>
                                );
                              })()}
                            </td>
                            <td className={`px-3 py-2.5 text-right font-medium ${(c.affiliateGMV - c.affiliateRefundedGMV) < c.affiliateGMV * 0.5 ? "text-red-600" : "text-green-600"}`}>{fRp(c.affiliateGMV - c.affiliateRefundedGMV)}</td>
                            <td className="px-3 py-2.5 text-right">{fN(c.affiliateOrders)}</td>
                            <td className="px-3 py-2.5 text-right text-gray-500">{fRp(c.avgOrderValue)}</td>
                            <td className="px-3 py-2.5 text-right">{fN(c.affiliateShoppableVideos)}</td>
                            <td className="px-3 py-2.5 text-right">{fN(c.affiliateLiveStreams)}</td>
                            <td className="px-3 py-2.5 text-right">{fN(c.itemsSold)}</td>
                            <td className={`px-3 py-2.5 text-right ${c.affiliateRefundedGMV > 0 ? "text-red-500" : ""}`}>
                              {fRp(c.affiliateRefundedGMV)}
                            </td>
                            <td className={`px-3 py-2.5 text-right font-medium ${c.refundRate > 20 ? "text-red-600" : c.refundRate > 10 ? "text-yellow-600" : "text-green-600"}`}>
                              {fP(c.refundRate)}
                            </td>
                            <td className="px-3 py-2.5 text-right text-purple-600">{fRp(c.estCommission)}</td>
                            {/* Fitur 2: Score bar */}
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-1.5 min-w-[56px]">
                                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full ${
                                    c.creatorScore >= 70 ? 'bg-green-500' :
                                    c.creatorScore >= 40 ? 'bg-amber-400' : 'bg-red-400'
                                  }`} style={{width: `${c.creatorScore}%`}} />
                                </div>
                                <span className={`text-xs font-bold w-6 text-right ${
                                  c.creatorScore >= 70 ? 'text-green-600' :
                                  c.creatorScore >= 40 ? 'text-amber-600' : 'text-red-500'
                                }`}>{c.creatorScore}</span>
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <StatusBadge status={creatorStatusSimple(c)} />
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr className="bg-blue-50/60">
                              <td colSpan={17} className="px-4 py-4">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                  {/* GMV Breakdown */}
                                  <div className="bg-white rounded-lg border p-3">
                                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-1"><DollarSign className="w-3 h-3" /> GMV Breakdown</p>
                                    <div className="space-y-1.5">
                                      <div className="flex justify-between text-sm"><span className="text-gray-600">Total GMV</span><span className="font-bold text-blue-600">{fRp(c.affiliateGMV)}</span></div>
                                      <div className="flex justify-between text-sm"><span className="text-gray-600">Video Shoppable</span><span className="font-medium">{fRp(c.affiliateShoppableVideoGMV)}</span></div>
                                      <div className="flex justify-between text-sm"><span className="text-gray-600">LIVE Stream</span><span className="font-medium">{fRp(c.affiliateLiveGMV)}</span></div>
                                      <div className="flex justify-between text-sm"><span className="text-gray-600">Product Card</span><span className="font-medium">{fRp(c.affiliateProductCardGMV)}</span></div>
                                    </div>
                                  </div>
                                  {/* Orders & Sales */}
                                  <div className="bg-white rounded-lg border p-3">
                                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-1"><ShoppingBag className="w-3 h-3" /> Orders & Sales</p>
                                    <div className="space-y-1.5">
                                      <div className="flex justify-between text-sm"><span className="text-gray-600">Orders</span><span className="font-bold">{fN(c.affiliateOrders)}</span></div>
                                      <div className="flex justify-between text-sm"><span className="text-gray-600">Items Sold</span><span className="font-medium">{fN(c.itemsSold)}</span></div>
                                      <div className="flex justify-between text-sm"><span className="text-gray-600">Avg Order Value</span><span className="font-medium">{fRp(c.avgOrderValue)}</span></div>
                                      <div className="flex justify-between text-sm"><span className="text-gray-600">GMV/Video</span><span className="font-medium">{fRp(c.gmvPerVideo)}</span></div>
                                    </div>
                                  </div>
                                  {/* Content */}
                                  <div className="bg-white rounded-lg border p-3">
                                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-1"><Video className="w-3 h-3" /> Content</p>
                                    <div className="space-y-1.5">
                                      <div className="flex justify-between text-sm"><span className="text-gray-600">Videos</span><span className="font-bold">{fN(c.affiliateShoppableVideos)}</span></div>
                                      <div className="flex justify-between text-sm"><span className="text-gray-600">LIVE Streams</span><span className="font-medium">{fN(c.affiliateLiveStreams)}</span></div>
                                      <div className="flex justify-between text-sm"><span className="text-gray-600">Product Showcase</span><span className="font-medium">{fN(c.affiliateProductShowcase || 0)}</span></div>
                                      {c.productImpressions > 0 && <div className="flex justify-between text-sm"><span className="text-gray-600">Impressions</span><span className="font-medium">{fN(c.productImpressions)}</span></div>}
                                      {c.ctr > 0 && <div className="flex justify-between text-sm"><span className="text-gray-600">CTR</span><span className="font-medium">{fP(c.ctr)}</span></div>}
                                    </div>
                                  </div>
                                  {/* Finance & Refund */}
                                  <div className="bg-white rounded-lg border p-3">
                                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Finance & Refund</p>
                                    <div className="space-y-1.5">
                                      <div className="flex justify-between text-sm"><span className="text-gray-600">Komisi</span><span className="font-bold text-purple-600">{fRp(c.estCommission)}</span></div>
                                      <div className="flex justify-between text-sm"><span className="text-gray-600">Commission Rate</span><span className="font-medium">{fP(c.commissionRate)}</span></div>
                                      {c.estFlatFee > 0 && <div className="flex justify-between text-sm"><span className="text-gray-600">Flat Fee</span><span className="font-medium">{fRp(c.estFlatFee)}</span></div>}
                                      <div className="flex justify-between text-sm"><span className="text-gray-600">Refund</span><span className={`font-medium ${c.affiliateRefundedGMV > 0 ? "text-red-500" : ""}`}>{fRp(c.affiliateRefundedGMV)}</span></div>
                                      <div className="flex justify-between text-sm"><span className="text-gray-600">Refund Rate</span><span className={`font-bold ${c.refundRate > 20 ? "text-red-600" : c.refundRate > 10 ? "text-yellow-600" : "text-green-600"}`}>{fP(c.refundRate)}</span></div>
                                      {c.affiliateItemsRefunded > 0 && <div className="flex justify-between text-sm"><span className="text-gray-600">Items Refunded</span><span className="font-medium text-red-500">{fN(c.affiliateItemsRefunded)}</span></div>}
                                    </div>
                                  </div>
                                </div>
                                {/* Collaboration & Profile */}
                                {(c.targetCollabGMV > 0 || c.openCollabGMV > 0 || (c.sampelTerkirim ?? 0) > 0) && (
                                  <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="bg-white rounded-lg border p-3">
                                      <p className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-1"><Star className="w-3 h-3" /> Collaboration</p>
                                      <div className="space-y-1.5">
                                        {c.targetCollabGMV > 0 && <div className="flex justify-between text-sm"><span className="text-gray-600">Target Collab GMV</span><span className="font-medium">{fRp(c.targetCollabGMV)}</span></div>}
                                        {c.targetCollabEstCommission > 0 && <div className="flex justify-between text-sm"><span className="text-gray-600">Target Collab Komisi</span><span className="font-medium">{fRp(c.targetCollabEstCommission)}</span></div>}
                                        {c.openCollabGMV > 0 && <div className="flex justify-between text-sm"><span className="text-gray-600">Open Collab GMV</span><span className="font-medium">{fRp(c.openCollabGMV)}</span></div>}
                                        {c.openCollabEstCommission > 0 && <div className="flex justify-between text-sm"><span className="text-gray-600">Open Collab Komisi</span><span className="font-medium">{fRp(c.openCollabEstCommission)}</span></div>}
                                        {(c.sampelTerkirim ?? 0) > 0 && <div className="flex justify-between text-sm"><span className="text-gray-600">Sampel Terkirim</span><span className="font-medium">{fN(c.sampelTerkirim ?? 0)}</span></div>}
                                      </div>
                                    </div>
                                  </div>
                                )}
                                {/* Profile summary bar */}
                                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                                  <span className={`px-2 py-1 rounded font-semibold ${TIER_COLORS[c.creatorTier]}`}>{c.creatorTier}</span>
                                  <StatusBadge status={creatorStatusSimple(c)} />
                                  {c.affiliateFollowers > 0 && <span className="text-gray-500"><Users className="w-3 h-3 inline mr-1" />{fN(c.affiliateFollowers)} followers</span>}
                                  <span className={`font-bold ${c.creatorScore >= 70 ? "text-green-600" : c.creatorScore >= 40 ? "text-yellow-600" : "text-red-600"}`}>Score: {c.creatorScore}</span>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setDrillDownCreator(c.creatorUsername); }}
                                    className="ml-auto px-2.5 py-1 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors flex items-center gap-1"
                                  >
                                    <Eye className="w-3 h-3" /> Lihat Riwayat Bulanan
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {creatorList.length > 200 && (
                  <div className="px-4 py-3 bg-gray-50 border-t text-sm text-gray-500 text-center">
                    Menampilkan 200 dari {fN(creatorList.length)} kreator. Gunakan filter untuk mempersempit.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════ */}
          {/* COMPARISON VIEW                             */}
          {/* ═══════════════════════════════════════════ */}
          {view === "comparison" && (
            <ComparisonView data={allMonths} />
          )}

          {/* ═══════════════════════════════════════════ */}
          {/* FITUR 4: RETENTION VIEW                     */}
          {/* ═══════════════════════════════════════════ */}
          {view === "retention" && (() => {
            const sorted = [...filteredData].sort((a, b) => a.periodRaw.localeCompare(b.periodRaw));
            const periods = sorted.map((d) => d.period || d.periodRaw.slice(0,7));
            // Build set of all creator usernames
            const allUsernames = Array.from(new Set(sorted.flatMap((d) => d.creators.map((c) => c.creatorUsername))));
            if (!allUsernames.length) {
              return (
                <div className="bg-white rounded-xl border p-8 text-center text-gray-400">
                  <Activity className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Data retensi tidak tersedia</p>
                  <p className="text-sm mt-1">Data kreator per periode diperlukan. Data tersedia saat baru upload (belum refresh halaman) atau saat ada data in-memory.</p>
                </div>
              );
            }
            // Activity map: username → Set of period indices they were active
            const activityMap: Record<string, Set<number>> = {};
            sorted.forEach((d, pi) => {
              d.creators.filter((c) => c.affiliateGMV > 0).forEach((c) => {
                if (!activityMap[c.creatorUsername]) activityMap[c.creatorUsername] = new Set();
                activityMap[c.creatorUsername].add(pi);
              });
            });
            // Churn & retention stats
            const monthStats = sorted.map((d, pi) => {
              if (pi === 0) return null;
              const prevActive = new Set(sorted[pi-1].creators.filter((c) => c.affiliateGMV > 0).map((c) => c.creatorUsername));
              const currActive = new Set(d.creators.filter((c) => c.affiliateGMV > 0).map((c) => c.creatorUsername));
              const retained = [...prevActive].filter((u) => currActive.has(u)).length;
              const churned = [...prevActive].filter((u) => !currActive.has(u)).length;
              const newOnes = [...currActive].filter((u) => !prevActive.has(u)).length;
              const retentionRate = prevActive.size > 0 ? (retained / prevActive.size) * 100 : 0;
              return { period: periods[pi], retained, churned, newOnes, retentionRate, total: currActive.size };
            }).filter(Boolean) as { period: string; retained: number; churned: number; newOnes: number; retentionRate: number; total: number }[];
            // Sort creators by total active months desc
            const sortedCreators = [...allUsernames].sort((a, b) => (activityMap[b]?.size || 0) - (activityMap[a]?.size || 0)).slice(0, 50);
            return (
              <div className="space-y-6">
                {/* Retention KPIs */}
                {monthStats.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl border p-4">
                      <p className="text-xs text-gray-500 font-medium uppercase">Avg Retention Rate</p>
                      <p className={`text-2xl font-bold mt-1 ${
                        (monthStats.reduce((a, m) => a + m.retentionRate, 0) / monthStats.length) >= 70 ? 'text-green-600' :
                        (monthStats.reduce((a, m) => a + m.retentionRate, 0) / monthStats.length) >= 50 ? 'text-amber-600' : 'text-red-500'
                      }`}>{(monthStats.reduce((a, m) => a + m.retentionRate, 0) / monthStats.length).toFixed(1)}%</p>
                      <p className="text-xs text-gray-400 mt-1">Rata-rata {monthStats.length} periode</p>
                    </div>
                    <div className="bg-white rounded-xl border p-4">
                      <p className="text-xs text-gray-500 font-medium uppercase">Total Kreator Unik</p>
                      <p className="text-2xl font-bold text-blue-600 mt-1">{allUsernames.length}</p>
                      <p className="text-xs text-gray-400 mt-1">Lintas semua periode</p>
                    </div>
                    <div className="bg-white rounded-xl border p-4">
                      <p className="text-xs text-gray-500 font-medium uppercase">Avg Churn per Bulan</p>
                      <p className="text-2xl font-bold text-red-500 mt-1">{Math.round(monthStats.reduce((a,m) => a+m.churned,0)/monthStats.length)}</p>
                      <p className="text-xs text-gray-400 mt-1">Kreator hilang rata-rata</p>
                    </div>
                    <div className="bg-white rounded-xl border p-4">
                      <p className="text-xs text-gray-500 font-medium uppercase">Avg Kreator Baru</p>
                      <p className="text-2xl font-bold text-green-600 mt-1">{Math.round(monthStats.reduce((a,m) => a+m.newOnes,0)/monthStats.length)}</p>
                      <p className="text-xs text-gray-400 mt-1">Kreator baru rata-rata</p>
                    </div>
                  </div>
                )}
                {/* Retention Rate Chart */}
                {monthStats.length > 0 && (
                  <div className="bg-white rounded-xl border p-5">
                    <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-indigo-600" />
                      Retention Rate & Churn per Bulan
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead><tr className="border-b text-left text-gray-500">
                          <th className="pb-2 font-medium">Periode</th>
                          <th className="pb-2 font-medium text-right">Aktif</th>
                          <th className="pb-2 font-medium text-right">Retained</th>
                          <th className="pb-2 font-medium text-right text-green-600">+Baru</th>
                          <th className="pb-2 font-medium text-right text-red-500">-Churn</th>
                          <th className="pb-2 font-medium text-right">Retention %</th>
                          <th className="pb-2 font-medium">Bar</th>
                        </tr></thead>
                        <tbody>
                          {monthStats.map((m) => (
                            <tr key={m.period} className="border-b hover:bg-gray-50">
                              <td className="py-2.5 font-medium">{m.period}</td>
                              <td className="py-2.5 text-right font-bold">{m.total}</td>
                              <td className="py-2.5 text-right text-blue-600">{m.retained}</td>
                              <td className="py-2.5 text-right text-green-600 font-medium">+{m.newOnes}</td>
                              <td className="py-2.5 text-right text-red-500 font-medium">-{m.churned}</td>
                              <td className={`py-2.5 text-right font-bold ${ m.retentionRate >= 70 ? 'text-green-600' : m.retentionRate >= 50 ? 'text-amber-600' : 'text-red-500'}`}>{m.retentionRate.toFixed(1)}%</td>
                              <td className="py-2.5 w-32">
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full ${ m.retentionRate >= 70 ? 'bg-green-500' : m.retentionRate >= 50 ? 'bg-amber-400' : 'bg-red-400'}`} style={{width:`${m.retentionRate}%`}} />
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                {/* Activity Heatmap */}
                <div className="bg-white rounded-xl border p-5">
                  <h3 className="font-semibold text-gray-800 mb-1 flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-purple-600" />
                    Heatmap Aktivitas Kreator
                  </h3>
                  <p className="text-xs text-gray-400 mb-4">Hijau = aktif (ada GMV), Abu = tidak aktif. Menampilkan top 50 kreator by total bulan aktif.</p>
                  <div className="overflow-x-auto">
                    <table className="text-xs w-full">
                      <thead><tr className="border-b">
                        <th className="pb-2 text-left font-medium text-gray-600 min-w-[140px] pr-3">Kreator</th>
                        <th className="pb-2 font-medium text-center text-gray-500">Total</th>
                        {periods.map((p) => <th key={p} className="pb-2 font-medium text-center text-gray-400 px-0.5 whitespace-nowrap">{p.replace(/\s.*/,'')}</th>)}
                      </tr></thead>
                      <tbody>
                        {sortedCreators.map((username) => {
                          const acts = activityMap[username] || new Set();
                          return (
                            <tr key={username} className="border-b hover:bg-gray-50">
                              <td className="py-1.5 pr-3 font-medium text-gray-800 truncate max-w-[140px]">@{username}</td>
                              <td className="py-1.5 text-center">
                                <span className={`px-1.5 py-0.5 rounded font-bold ${ acts.size === sorted.length ? 'bg-green-100 text-green-700' : acts.size >= sorted.length * 0.7 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{acts.size}/{sorted.length}</span>
                              </td>
                              {sorted.map((_, pi) => (
                                <td key={pi} className="py-1.5 px-0.5 text-center">
                                  <div className={`w-5 h-5 rounded mx-auto ${ acts.has(pi) ? 'bg-green-400' : 'bg-gray-100'}`} title={acts.has(pi) ? 'Aktif' : 'Tidak aktif'} />
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-green-400" /> Aktif (ada GMV)</span>
                    <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-gray-100 border" /> Tidak aktif</span>
                  </div>
                </div>
              </div>
            );
          })()}
        </>
      )}

      {/* Creator Drill-Down Modal */}
      {drillDownCreator && (
        <CreatorDrillDownModal
          username={drillDownCreator}
          allMonths={allMonths}
          supabaseCreators={supabaseCreators}
          onClose={() => setDrillDownCreator(null)}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// SUB COMPONENTS
// ═══════════════════════════════════════════════════════

function KPICard({ title, value, sub, color, icon, alert = false }: {
  title: string; value: string; sub: string; color: string; icon: React.ReactNode; alert?: boolean;
}) {
  const colorMap: Record<string, string> = {
    blue: "border-blue-200 bg-blue-50", green: "border-green-200 bg-green-50",
    purple: "border-purple-200 bg-purple-50", red: "border-red-200 bg-red-50",
    teal: "border-teal-200 bg-teal-50", orange: "border-orange-200 bg-orange-50",
    gray: "border-gray-200 bg-gray-50", indigo: "border-indigo-200 bg-indigo-50",
  };
  const valMap: Record<string, string> = {
    blue: "text-blue-700", green: "text-green-700", purple: "text-purple-700",
    red: "text-red-700", teal: "text-teal-700", orange: "text-orange-700",
    gray: "text-gray-700", indigo: "text-indigo-700",
  };
  const iconMap: Record<string, string> = {
    blue: "text-blue-500", green: "text-green-500", purple: "text-purple-500",
    red: "text-red-500", teal: "text-teal-500", orange: "text-orange-500",
    gray: "text-gray-500", indigo: "text-indigo-500",
  };
  return (
    <div className={`rounded-xl border p-4 ${colorMap[color] || colorMap.gray} ${alert ? "ring-2 ring-red-400 animate-pulse" : ""}`}>
      <div className="flex justify-between items-start">
        <p className="text-sm text-gray-600 font-medium">{title}</p>
        <span className={iconMap[color] || iconMap.gray}>{icon}</span>
      </div>
      <p className={`text-2xl font-bold mt-1.5 ${valMap[color] || valMap.gray}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-1">{sub}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: StatusFilter }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium whitespace-nowrap ${STATUS_CONFIG[status]?.cls || ""}`}>
      {STATUS_CONFIG[status]?.label || status}
    </span>
  );
}

function UploadButton({ onUpload, isUploading }: {
  onUpload: (e: React.ChangeEvent<HTMLInputElement>, period: string, platform: "tiktok" | "tokopedia") => void;
  isUploading: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [plt, setPlt] = useState<"tiktok" | "tokopedia">("tiktok");
  return (
    <div className="relative">
      <button
        onClick={() => setShowForm(!showForm)}
        disabled={isUploading}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
      >
        {isUploading ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Memproses...
          </>
        ) : (
          <>
            <Upload className="w-4 h-4" />
            Upload Data
          </>
        )}
      </button>
      {showForm && !isUploading && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowForm(false)} />
          <div className="absolute right-0 top-full mt-2 bg-white border rounded-xl shadow-xl p-4 z-50 w-80">
            <div className="flex justify-between items-center mb-3">
              <p className="font-semibold text-sm text-gray-700">Upload File Affiliate</p>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 font-medium">Periode</label>
                <input
                  type="month"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium">Platform</label>
                <div className="flex gap-2 mt-1">
                  {(["tiktok", "tokopedia"] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPlt(p)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        plt === p ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {p === "tiktok" ? "TikTok" : "Tokopedia"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">
                  Upload file (Core + Creator List sekaligus)
                </label>
                <input
                  type="file"
                  multiple
                  accept=".xlsx,.xls"
                  onChange={(e) => {
                    onUpload(e, period, plt);
                    setShowForm(false);
                  }}
                  className="w-full text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
              <div className="bg-gray-50 rounded-lg p-2.5 text-xs text-gray-500 space-y-1">
                <p className="font-medium text-gray-600">Format file yang didukung:</p>
                <p>TikTok: Transaction_Analysis_Core_Metrics_*.xlsx + Transaction_Analysis_Creator_List_*.xlsx</p>
                <p>Tokopedia: Core_Stats_*.xlsx + Creator_List_*.xlsx</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function EmptyAffiliate({ onUpload }: {
  onUpload: (e: React.ChangeEvent<HTMLInputElement>, period: string, platform: "tiktok" | "tokopedia") => void;
}) {
  return (
    <div className="bg-white border-2 border-dashed border-gray-200 rounded-xl p-12 text-center">
      <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-700">Belum ada data affiliate</h3>
      <p className="text-gray-400 text-sm mt-2 mb-6 max-w-md mx-auto">
        Upload file dari TikTok Shop Affiliate atau Tokopedia Affiliate Center.
        Bisa upload beberapa bulan sekaligus untuk melihat tren.
      </p>
      <UploadButton onUpload={onUpload} isUploading={false} />
    </div>
  );
}

function ComparisonView({ data }: { data: AffiliateMonthData[] }) {
  const sorted = [...data].sort((a, b) => a.periodRaw.localeCompare(b.periodRaw));

  // Build unique period+platform options
  const periodOptions = sorted.map((d, i) => ({
    key: `${d.platform || 'all'}-${d.periodRaw}`,
    label: `${d.period || d.periodRaw} ${d.platform ? `(${d.platform})` : ''}`,
    index: i,
  }));

  const [prevKey, setPrevKey] = useState<string>(
    periodOptions.length >= 2 ? periodOptions[periodOptions.length - 2].key : ''
  );
  const [latestKey, setLatestKey] = useState<string>(
    periodOptions.length >= 1 ? periodOptions[periodOptions.length - 1].key : ''
  );

  const prev = sorted.find((d) => `${d.platform || 'all'}-${d.periodRaw}` === prevKey) || sorted[sorted.length - 2];
  const latest = sorted.find((d) => `${d.platform || 'all'}-${d.periodRaw}` === latestKey) || sorted[sorted.length - 1];

  if (data.length < 2) {
    return (
      <div className="bg-white rounded-xl border p-8 text-center">
        <BarChart3 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 font-medium">Minimal 2 periode data untuk perbandingan</p>
        <p className="text-gray-400 text-sm mt-1">Upload data bulan tambahan untuk melihat perbandingan</p>
      </div>
    );
  }

  if (!prev || !latest || prev.periodRaw === latest.periodRaw) {
    return (
      <div className="bg-white rounded-xl border p-8 text-center">
        <BarChart3 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 font-medium">Pilih dua periode yang berbeda untuk dibandingkan</p>
      </div>
    );
  }

  const metrics = [
    { label: "Total GMV", curr: latest.summary.totalGMV, prev: prev.summary.totalGMV, fmt: fRp },
    { label: "Kreator Aktif", curr: latest.summary.activeCreators, prev: prev.summary.activeCreators, fmt: fN },
    { label: "Total Orders", curr: latest.summary.totalOrders, prev: prev.summary.totalOrders, fmt: fN },
    { label: "Total Video", curr: latest.summary.totalVideos, prev: prev.summary.totalVideos, fmt: fN },
    { label: "Total LIVE", curr: latest.summary.totalLive, prev: prev.summary.totalLive, fmt: fN },
    { label: "Total Komisi", curr: latest.summary.totalCommission, prev: prev.summary.totalCommission, fmt: fRp },
    { label: "Refund Rate", curr: latest.summary.refundRate, prev: prev.summary.refundRate, fmt: fP },
    { label: "Avg AOV", curr: latest.summary.avgAOV, prev: prev.summary.avgAOV, fmt: fRp },
    { label: "GMV Video", curr: latest.summary.videoGMV, prev: prev.summary.videoGMV, fmt: fRp },
    { label: "GMV LIVE", curr: latest.summary.liveGMV, prev: prev.summary.liveGMV, fmt: fRp },
    { label: "GMV Product Card", curr: latest.summary.productCardGMV, prev: prev.summary.productCardGMV, fmt: fRp },
    { label: "Top Kreator GMV", curr: latest.summary.topCreatorGMV, prev: prev.summary.topCreatorGMV, fmt: fRp },
  ];

  return (
    <div className="space-y-6">
      {/* Period Selector — Bug #5 fix */}
      <div className="bg-white rounded-xl border p-4">
        <div className="flex flex-wrap items-center gap-4">
          <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-600" /> Pilih Periode Perbandingan
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Periode Pembanding (Lama)</label>
              <select
                value={prevKey}
                onChange={(e) => setPrevKey(e.target.value)}
                className="text-sm border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500"
              >
                {periodOptions.map((opt) => (
                  <option key={opt.key} value={opt.key} disabled={opt.key === latestKey}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <span className="text-gray-400 font-medium mt-4">vs</span>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Periode Utama (Baru)</label>
              <select
                value={latestKey}
                onChange={(e) => setLatestKey(e.target.value)}
                className="text-sm border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500"
              >
                {periodOptions.map((opt) => (
                  <option key={opt.key} value={opt.key} disabled={opt.key === prevKey}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border p-5">
        <h3 className="font-semibold text-gray-800 mb-1">
          Perbandingan: {prev.period} vs {latest.period}
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          {prev.platform && `${prev.platform} → `}{latest.platform || ""}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {metrics.map((m) => {
            const isRefund = m.label.includes("Refund");
            const growth = m.prev > 0 ? ((m.curr - m.prev) / m.prev) * 100 : (m.curr > 0 ? 100 : 0);
            const isPositive = isRefund ? growth <= 0 : growth >= 0;
            return (
              <div key={m.label} className="border rounded-lg p-3">
                <p className="text-xs text-gray-500 font-medium">{m.label}</p>
                <div className="flex items-end justify-between mt-1">
                  <div>
                    <p className="text-lg font-bold text-gray-900">{m.fmt(m.curr)}</p>
                    <p className="text-xs text-gray-400">prev: {m.fmt(m.prev)}</p>
                  </div>
                  <div className={`flex items-center gap-0.5 text-sm font-semibold ${isPositive ? "text-green-600" : "text-red-600"}`}>
                    {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                    {Math.abs(growth).toFixed(1)}%
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* New / Lost Creators */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-semibold text-green-700 mb-3 flex items-center gap-2">
            <ArrowUpRight className="w-4 h-4" />
            Kreator Baru (ada di {latest.period}, tidak di {prev.period})
          </h3>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {(() => {
              const prevNames = new Set(prev.creators.map((c) => c.creatorUsername));
              const newCreators = latest.creators
                .filter((c) => !prevNames.has(c.creatorUsername) && c.affiliateGMV > 0)
                .sort((a, b) => b.affiliateGMV - a.affiliateGMV);
              if (!newCreators.length) return <p className="text-sm text-gray-400">Tidak ada kreator baru</p>;
              return newCreators.slice(0, 20).map((c) => (
                <div key={c.creatorUsername} className="flex justify-between text-sm py-1 border-b border-gray-50">
                  <span className="text-gray-700">@{c.creatorUsername}</span>
                  <span className="font-medium text-green-600">{fRp(c.affiliateGMV)}</span>
                </div>
              ));
            })()}
          </div>
        </div>
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-semibold text-red-700 mb-3 flex items-center gap-2">
            <ArrowDownRight className="w-4 h-4" />
            Kreator Hilang (ada di {prev.period}, tidak di {latest.period})
          </h3>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {(() => {
              const latestNames = new Set(latest.creators.map((c) => c.creatorUsername));
              const lostCreators = prev.creators
                .filter((c) => !latestNames.has(c.creatorUsername) && c.affiliateGMV > 0)
                .sort((a, b) => b.affiliateGMV - a.affiliateGMV);
              if (!lostCreators.length) return <p className="text-sm text-gray-400">Tidak ada kreator yang hilang</p>;
              return lostCreators.slice(0, 20).map((c) => (
                <div key={c.creatorUsername} className="flex justify-between text-sm py-1 border-b border-gray-50">
                  <span className="text-gray-700">@{c.creatorUsername}</span>
                  <span className="font-medium text-red-600">{fRp(c.affiliateGMV)}</span>
                </div>
              ));
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}

function TargetFormModal({ initial, onSave, onClose }: {
  initial: AffiliateTarget | null;
  onSave: (t: AffiliateTarget) => void;
  onClose: () => void;
}) {
  const [period, setPeriod] = useState(initial?.period || new Date().toISOString().slice(0, 7));
  const [targetGMV, setTargetGMV] = useState(initial?.targetGMV?.toString() || "");
  const [targetVideos, setTargetVideos] = useState(initial?.targetVideos?.toString() || "");
  const [targetLive, setTargetLive] = useState(initial?.targetLive?.toString() || "");
  const [targetOrders, setTargetOrders] = useState(initial?.targetOrders?.toString() || "");
  const [targetActiveCreators, setTargetActiveCreators] = useState(initial?.targetActiveCreators?.toString() || "");
  const [targetCommission, setTargetCommission] = useState(initial?.targetCommission?.toString() || "");
  const [notes, setNotes] = useState(initial?.notes || "");

  const handleSave = () => {
    onSave({
      id: initial?.id || nanoid(),
      period,
      targetGMV: Number(targetGMV) || 0,
      targetVideos: Number(targetVideos) || 0,
      targetLive: Number(targetLive) || 0,
      targetOrders: Number(targetOrders) || 0,
      targetActiveCreators: Number(targetActiveCreators) || 0,
      targetCommission: Number(targetCommission) || 0,
      notes,
    });
  };

  const fieldCls = "w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500";
  const labelCls = "text-xs text-gray-500 font-medium mb-1 block";

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center p-5 border-b">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <Target className="w-4 h-4 text-red-600" />
              {initial ? "Edit Target" : "Tambah Target Baru"}
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className={labelCls}>Periode</label>
              <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} className={fieldCls} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Target GMV (Rp)</label>
                <input type="number" value={targetGMV} onChange={(e) => setTargetGMV(e.target.value)} placeholder="cth: 50000000" className={fieldCls} />
              </div>
              <div>
                <label className={labelCls}>Target Video</label>
                <input type="number" value={targetVideos} onChange={(e) => setTargetVideos(e.target.value)} placeholder="cth: 100" className={fieldCls} />
              </div>
              <div>
                <label className={labelCls}>Target LIVE</label>
                <input type="number" value={targetLive} onChange={(e) => setTargetLive(e.target.value)} placeholder="cth: 30" className={fieldCls} />
              </div>
              <div>
                <label className={labelCls}>Target Orders</label>
                <input type="number" value={targetOrders} onChange={(e) => setTargetOrders(e.target.value)} placeholder="cth: 500" className={fieldCls} />
              </div>
              <div>
                <label className={labelCls}>Target Kreator Aktif</label>
                <input type="number" value={targetActiveCreators} onChange={(e) => setTargetActiveCreators(e.target.value)} placeholder="cth: 20" className={fieldCls} />
              </div>
              <div>
                <label className={labelCls}>Target Komisi (Rp)</label>
                <input type="number" value={targetCommission} onChange={(e) => setTargetCommission(e.target.value)} placeholder="cth: 5000000" className={fieldCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Catatan (opsional)</label>
              <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="cth: Target Q1 2025" className={fieldCls} />
            </div>
            <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700 space-y-1">
              <p className="font-medium">Tips:</p>
              <p>Isi target yang relevan saja — field yang kosong atau 0 tidak akan ditampilkan di tabel perbandingan.</p>
              <p>Periode akan dicocokkan dengan data affiliate yang sudah di-upload.</p>
            </div>
          </div>
          <div className="flex justify-end gap-2 p-5 border-t">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
              Batal
            </button>
            <button onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5">
              <Save className="w-4 h-4" />
              {initial ? "Simpan Perubahan" : "Simpan Target"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function CreatorDrillDownModal({ username, allMonths, supabaseCreators, onClose }: {
  username: string;
  allMonths: AffiliateMonthData[];
  supabaseCreators?: AffiliateCreatorItem[];
  onClose: () => void;
}) {
  const sorted = [...allMonths].sort((a, b) => a.periodRaw.localeCompare(b.periodRaw));

  // Bug #3 fix: When allMonths[i].creators is empty (stripped from localStorage after refresh),
  // fall back to supabaseCreators for that username, distributed per-period.
  // We create a lookup of the supabase data by username for quick access.
  const supabaseByUsername = useMemo(() => {
    const m: Record<string, AffiliateCreatorItem> = {};
    (supabaseCreators || []).forEach((c) => { m[c.creatorUsername] = c; });
    return m;
  }, [supabaseCreators]);

  const history = sorted.map((m) => {
    // Prefer per-period creators in allMonths; fall back to supabase aggregate
    let c = m.creators.find((cr) => cr.creatorUsername === username);
    // If no per-period data and this is the only/latest period, use supabase aggregate
    if (!c && supabaseByUsername[username]) {
      // Only show in the most recent period to avoid duplication across multiple periods
      const isLatest = sorted[sorted.length - 1].periodRaw === m.periodRaw;
      if (isLatest) c = supabaseByUsername[username];
    }
    return {
      period: m.period || m.periodRaw,
      platform: m.platform || m.source,
      store: (m as any)._storeName || "",
      gmv: c?.affiliateGMV || 0,
      netGMV: (c?.affiliateGMV || 0) - (c?.affiliateRefundedGMV || 0),
      orders: c?.affiliateOrders || 0,
      videos: c?.affiliateShoppableVideos || 0,
      live: c?.affiliateLiveStreams || 0,
      refund: c?.affiliateRefundedGMV || 0,
      refundRate: c && c.affiliateGMV > 0 ? (c.affiliateRefundedGMV / c.affiliateGMV) * 100 : 0,
      commission: c?.estCommission || 0,
      active: !!c && c.affiliateGMV > 0,
    };
  }).filter((h) => h.active || h.gmv > 0);

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center p-5 border-b">
            <div>
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <Eye className="w-4 h-4 text-blue-600" />
                Riwayat Kreator: @{username}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">{history.length} periode aktif</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
          </div>
          <div className="p-5">
            {history.length === 0 ? (
              <p className="text-center text-gray-400 py-8">Tidak ada data historis untuk kreator ini.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="pb-2 font-medium">Periode</th>
                      <th className="pb-2 font-medium text-right">GMV</th>
                      <th className="pb-2 font-medium text-right">Net GMV</th>
                      <th className="pb-2 font-medium text-right">Orders</th>
                      <th className="pb-2 font-medium text-right">Video</th>
                      <th className="pb-2 font-medium text-right">LIVE</th>
                      <th className="pb-2 font-medium text-right">Refund%</th>
                      <th className="pb-2 font-medium text-right">Komisi</th>
                      <th className="pb-2 font-medium text-right">Tren GMV</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h, i) => {
                      const prev = i > 0 ? history[i - 1] : null;
                      const growth = prev && prev.gmv > 0 ? ((h.gmv - prev.gmv) / prev.gmv) * 100 : null;
                      return (
                        <tr key={h.period + h.store} className="border-b hover:bg-gray-50">
                          <td className="py-2.5 font-medium">
                            {h.period}
                            {h.store && <span className="text-xs text-gray-400 ml-1">({h.store})</span>}
                          </td>
                          <td className="py-2.5 text-right font-bold text-blue-600">{fRp(h.gmv)}</td>
                          <td className={`py-2.5 text-right font-medium ${h.netGMV < h.gmv * 0.5 ? "text-red-600" : "text-green-600"}`}>{fRp(h.netGMV)}</td>
                          <td className="py-2.5 text-right">{fN(h.orders)}</td>
                          <td className="py-2.5 text-right">{fN(h.videos)}</td>
                          <td className="py-2.5 text-right">{fN(h.live)}</td>
                          <td className={`py-2.5 text-right font-medium ${h.refundRate > 20 ? "text-red-600" : "text-green-600"}`}>{fP(h.refundRate)}</td>
                          <td className="py-2.5 text-right text-purple-600">{fRp(h.commission)}</td>
                          <td className="py-2.5 text-right">
                            {growth !== null ? (
                              <span className={`text-xs font-bold ${growth >= 0 ? "text-green-600" : "text-red-600"}`}>
                                {growth >= 0 ? "↑" : "↓"}{Math.abs(growth).toFixed(0)}%
                              </span>
                            ) : <span className="text-gray-300">—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {/* Summary */}
                <div className="mt-4 bg-gray-50 rounded-lg p-4 grid grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Total GMV</p>
                    <p className="text-lg font-bold text-blue-600">{fRp(history.reduce((a, h) => a + h.gmv, 0))}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Total Net GMV</p>
                    <p className="text-lg font-bold text-green-600">{fRp(history.reduce((a, h) => a + h.netGMV, 0))}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Total Orders</p>
                    <p className="text-lg font-bold text-gray-900">{fN(history.reduce((a, h) => a + h.orders, 0))}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Avg Refund%</p>
                    <p className={`text-lg font-bold ${(history.reduce((a, h) => a + h.refundRate, 0) / history.length) > 15 ? "text-red-600" : "text-green-600"}`}>
                      {fP(history.reduce((a, h) => a + h.refundRate, 0) / history.length)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
