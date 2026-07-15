"use client";
import React, { useState, useMemo, useEffect } from "react";
import type { AffiliateMonthData, AffiliateCreatorItem } from "@/lib/types";
import { loadAffiliateCreators } from "@/lib/db";
import {
  Activity, Search, TrendingUp, ChevronDown, ChevronUp,
  DollarSign, PieChart, ArrowDownRight, Star, X, UserMinus,
  Award, RefreshCw, Heart, ShieldAlert, Lightbulb, BarChart3, Loader2
} from "lucide-react";

// ═══════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════
type AffiliateMonthDataWithStore = AffiliateMonthData & { _storeName: string };
type RetentionSeverity = 'kritis' | 'peringatan' | 'perhatian' | 'monitor' | 'naik' | 'baru' | 'stabil';

interface RetentionItem {
  username: string;
  tier: string;
  followers: number;
  prevGMV: number;
  currGMV: number;
  change: number;
  changePct: number;
  severity: RetentionSeverity;
  consecutiveDecline: boolean;
  recommendation: string;
  sparklineGMVs: number[];
}

// ═══════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════
function fRp(v: number): string { return `Rp ${Math.round(v).toLocaleString("id-ID")}`; }
function fN(v: number): string { return v.toLocaleString("id-ID"); }
function fP(v: number): string { return `${v.toFixed(1)}%`; }

const TIER_COLORS: Record<string, string> = {
  Mega: "bg-purple-100 text-purple-700",
  Macro: "bg-yellow-100 text-yellow-700",
  Mid: "bg-blue-100 text-blue-700",
  Micro: "bg-green-100 text-green-700",
  Nano: "bg-gray-100 text-gray-600",
  Unknown: "bg-gray-50 text-gray-400",
};

const SEV_CONFIG: Record<RetentionSeverity, { label: string; icon: string; badge: string; cardBorder: string }> = {
  kritis:     { label: 'HILANG',         icon: '🔴', badge: 'bg-red-100 text-red-700 border-red-200',       cardBorder: 'border-l-red-500' },
  peringatan: { label: 'TURUN DRASTIS',  icon: '🟠', badge: 'bg-orange-100 text-orange-700 border-orange-200', cardBorder: 'border-l-orange-500' },
  perhatian:  { label: 'TURUN',          icon: '🟡', badge: 'bg-yellow-100 text-yellow-700 border-yellow-200', cardBorder: 'border-l-yellow-500' },
  monitor:    { label: 'TURUN BERTURUT', icon: '🔵', badge: 'bg-blue-100 text-blue-700 border-blue-200',     cardBorder: 'border-l-blue-500' },
  naik:       { label: 'NAIK',           icon: '🟢', badge: 'bg-green-100 text-green-700 border-green-200',   cardBorder: 'border-l-green-500' },
  baru:       { label: 'BARU',           icon: '✨', badge: 'bg-purple-100 text-purple-700 border-purple-200', cardBorder: 'border-l-purple-500' },
  stabil:     { label: 'STABIL',         icon: '➖', badge: 'bg-gray-100 text-gray-600 border-gray-200',     cardBorder: 'border-l-gray-400' },
};

// ═══════════════════════════════════════════════════════
// MINI SPARKLINE
// ═══════════════════════════════════════════════════════
function MiniSparkline({ values, width = 50, height = 16, highlightLast = false }: {
  values: number[]; width?: number; height?: number; highlightLast?: boolean;
}) {
  if (values.length < 2) return <span className="text-gray-200 text-xs">—</span>;
  const max = Math.max(...values, 1);
  const bW = Math.max(2, Math.floor(width / values.length) - 1);
  return (
    <svg width={width} height={height} className="inline-block align-middle">
      {values.map((v, idx) => {
        const bH = Math.max(1, Math.round((v / max) * (height - 2)));
        const isLast = idx === values.length - 1;
        const fill = highlightLast && isLast
          ? (v > 0 ? '#10b981' : '#ef4444')
          : (v > 0 ? '#3b82f6' : '#e5e7eb');
        return <rect key={idx} x={idx * (bW + 1)} y={height - bH} width={bW} height={bH} fill={fill} rx="1" opacity="0.8" />;
      })}
    </svg>
  );
}

// ═══════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════
export default function RetentionViewEnhanced({
  filteredData,
  supabaseCreators,
  allMonths,
  onDrillDown,
}: {
  filteredData: AffiliateMonthDataWithStore[];
  supabaseCreators?: AffiliateCreatorItem[];
  allMonths?: AffiliateMonthDataWithStore[];
  onDrillDown: (username: string) => void;
}) {
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [showAllFollowUp, setShowAllFollowUp] = useState(false);
  const [compSort, setCompSort] = useState<'change' | 'changePct' | 'currGMV' | 'prevGMV'>('change');
  const [compSortAsc, setCompSortAsc] = useState(false);
  const [perPeriodCreators, setPerPeriodCreators] = useState<Record<string, AffiliateCreatorItem[]>>({});
  const [loadingCreators, setLoadingCreators] = useState(false);

  // ── ENRICH: Load creators from Supabase per period when local data is empty ──
  useEffect(() => {
    // Check if ANY period has creators locally
    const hasLocalCreators = filteredData.some(d => d.creators && d.creators.length > 0);
    if (hasLocalCreators || filteredData.length < 2) return;

    // Need to load from Supabase per period
    let cancelled = false;
    async function loadPerPeriod() {
      setLoadingCreators(true);
      try {
        const monthsToLoad = allMonths && allMonths.length > 0 ? allMonths : filteredData;
        const periodMap: Record<string, { storeId: string; platform?: string }[]> = {};
        monthsToLoad.forEach(d => {
          const key = d.periodRaw.split(" ~ ")[0]?.slice(0, 7) || d.periodRaw;
          if (!periodMap[key]) periodMap[key] = [];
          if (d.storeId) {
            periodMap[key].push({ storeId: d.storeId, platform: d.platform });
          }
        });

        const result: Record<string, AffiliateCreatorItem[]> = {};
        await Promise.all(
          Object.entries(periodMap).map(async ([period, stores]) => {
            const uniqueStores = stores.filter((s, i, arr) =>
              arr.findIndex(x => x.storeId === s.storeId && x.platform === s.platform) === i
            );
            const allCreators = await Promise.all(
              uniqueStores.map(async ({ storeId, platform }) => {
                try {
                  return await loadAffiliateCreators(storeId, period, platform);
                } catch {
                  return [];
                }
              })
            );
            result[period] = allCreators.flat();
          })
        );
        if (!cancelled) setPerPeriodCreators(result);
      } catch (err) {
        console.error("RetentionView: Failed to load creators per period:", err);
      } finally {
        if (!cancelled) setLoadingCreators(false);
      }
    }
    loadPerPeriod();
    return () => { cancelled = true; };
  }, [filteredData, allMonths]);

  // ── BUILD ENRICHED DATA: merge local + supabase per-period creators ──
  const enrichedData = useMemo(() => {
    return filteredData.map(d => {
      // If local creators exist, use them
      if (d.creators && d.creators.length > 0) return d;

      // Try to get from per-period Supabase load
      const periodKey = d.periodRaw.split(" ~ ")[0]?.slice(0, 7) || d.periodRaw;
      const supaCreators = perPeriodCreators[periodKey];
      if (supaCreators && supaCreators.length > 0) {
        return { ...d, creators: supaCreators };
      }

      return d;
    });
  }, [filteredData, perPeriodCreators]);

  // ── MAIN ANALYSIS ───────────────────────────────────
  const analysis = useMemo(() => {
    const sorted = [...enrichedData].sort((a, b) => a.periodRaw.localeCompare(b.periodRaw));
    if (sorted.length < 2) return null;

    const periods = sorted.map(d => d.period || d.periodRaw.slice(0, 7));
    const latest = sorted[sorted.length - 1];
    const prev = sorted[sorted.length - 2];
    const prevPrev = sorted.length >= 3 ? sorted[sorted.length - 3] : null;

    // GMV maps per period
    const latestMap = new Map<string, AffiliateCreatorItem>();
    latest.creators.forEach(c => latestMap.set(c.creatorUsername, c));
    const prevMap = new Map<string, AffiliateCreatorItem>();
    prev.creators.forEach(c => prevMap.set(c.creatorUsername, c));
    const prevPrevMap = new Map<string, AffiliateCreatorItem>();
    if (prevPrev) prevPrev.creators.forEach(c => prevPrevMap.set(c.creatorUsername, c));

    // All usernames that were EVER active (GMV > 0) in prev or latest
    const relevantUsernames = new Set<string>();
    prevMap.forEach((c, u) => { if (c.affiliateGMV > 0) relevantUsernames.add(u); });
    latestMap.forEach((c, u) => { if (c.affiliateGMV > 0) relevantUsernames.add(u); });

    // Build sparkline for each creator across ALL sorted periods
    const sparklines: Record<string, number[]> = {};
    sorted.forEach(d => {
      const gmvLookup = new Map(d.creators.map(c => [c.creatorUsername, c.affiliateGMV]));
      relevantUsernames.forEach(u => {
        if (!sparklines[u]) sparklines[u] = [];
        sparklines[u].push(gmvLookup.get(u) || 0);
      });
    });

    // Build retention items
    const items: RetentionItem[] = [];

    relevantUsernames.forEach(username => {
      const curr = latestMap.get(username);
      const prevC = prevMap.get(username);
      const ppC = prevPrevMap.get(username);

      const currGMV = curr?.affiliateGMV || 0;
      const pGMV = prevC?.affiliateGMV || 0;
      const ppGMV = ppC?.affiliateGMV || 0;

      const change = currGMV - pGMV;
      const changePct = pGMV > 0 ? (change / pGMV) * 100 : (currGMV > 0 ? 100 : 0);
      const consecutiveDecline = ppGMV > 0 && pGMV > 0 && ppGMV > pGMV && pGMV > currGMV;

      let severity: RetentionSeverity;
      let recommendation = '';

      if (pGMV > 0 && currGMV === 0) {
        severity = 'kritis';
        recommendation = `Kreator hilang total — omset sebelumnya ${fRp(pGMV)}. Segera hubungi, tawarkan sampel baru atau diskusi kendala.`;
      } else if (pGMV > 0 && changePct < -50) {
        severity = 'peringatan';
        recommendation = `Omset turun drastis ${Math.abs(changePct).toFixed(0)}% (${fRp(pGMV)} → ${fRp(currGMV)}). Evaluasi produk dan ajak diskusi strategi konten.`;
      } else if (pGMV > 0 && changePct < -20) {
        severity = 'perhatian';
        recommendation = `Omset menurun ${Math.abs(changePct).toFixed(0)}%. Berikan motivasi, insentif tambahan, atau sampel produk baru.`;
      } else if (pGMV > 0 && changePct < 0 && consecutiveDecline) {
        severity = 'monitor';
        recommendation = `Penurunan 2 bulan berturut-turut (${fRp(ppGMV)} → ${fRp(pGMV)} → ${fRp(currGMV)}). Segera perhatikan sebelum semakin turun.`;
      } else if (pGMV === 0 && currGMV > 0) {
        severity = 'baru';
        recommendation = '';
      } else if (changePct > 0) {
        severity = 'naik';
        recommendation = '';
      } else {
        severity = 'stabil';
        recommendation = '';
      }

      items.push({
        username,
        tier: (curr || prevC)?.creatorTier || 'Unknown',
        followers: (curr || prevC)?.affiliateFollowers || 0,
        prevGMV: pGMV,
        currGMV,
        change,
        changePct,
        severity,
        consecutiveDecline,
        recommendation,
        sparklineGMVs: sparklines[username] || [],
      });
    });

    // Sort by severity priority then by absolute GMV change
    const severityOrder: Record<string, number> = { kritis: 0, peringatan: 1, perhatian: 2, monitor: 3, stabil: 4, baru: 5, naik: 6 };
    items.sort((a, b) => {
      const d = (severityOrder[a.severity] ?? 9) - (severityOrder[b.severity] ?? 9);
      return d !== 0 ? d : Math.abs(b.change) - Math.abs(a.change);
    });

    // Aggregates
    const needFollowUp = items.filter(i => ['kritis', 'peringatan', 'perhatian', 'monitor'].includes(i.severity));
    const lostGMV = needFollowUp.reduce((a, i) => a + Math.abs(i.change), 0);
    const criticalCount = items.filter(i => i.severity === 'kritis').length;
    const warningCount = items.filter(i => i.severity === 'peringatan').length;
    const attentionCount = items.filter(i => i.severity === 'perhatian').length;
    const monitorCount = items.filter(i => i.severity === 'monitor').length;
    const risingCount = items.filter(i => i.severity === 'naik').length;
    const newCount = items.filter(i => i.severity === 'baru').length;

    // Comeback (was active 2 ago, inactive last, active now)
    const comebackCreators = items.filter(i => {
      const sp = i.sparklineGMVs;
      return sp.length >= 3 && sp[sp.length - 3] > 0 && sp[sp.length - 2] === 0 && sp[sp.length - 1] > 0;
    });

    // Top growers
    const topGrowers = items.filter(i => i.severity === 'naik' && i.prevGMV > 0)
      .sort((a, b) => b.changePct - a.changePct).slice(0, 5);

    // Consistent (active in ALL periods)
    const consistentCount = items.filter(i => i.sparklineGMVs.length > 0 && i.sparklineGMVs.every(v => v > 0)).length;

    // Recovery rate
    let recoveryRate = 0;
    if (prevPrev) {
      let declined = 0, recovered = 0;
      prevPrevMap.forEach((c, u) => {
        const inPrev = prevMap.get(u);
        if (c.affiliateGMV > 0 && (!inPrev || inPrev.affiliateGMV < c.affiliateGMV)) {
          declined++;
          const inLatest = latestMap.get(u);
          if (inLatest && inPrev && inLatest.affiliateGMV > inPrev.affiliateGMV) recovered++;
        }
      });
      recoveryRate = declined > 0 ? (recovered / declined) * 100 : 0;
    }

    // Churn/retention stats for each period
    const monthStats = sorted.map((d, pi) => {
      if (pi === 0) return null;
      const prevActive = new Set(sorted[pi - 1].creators.filter(c => c.affiliateGMV > 0).map(c => c.creatorUsername));
      const currActive = new Set(d.creators.filter(c => c.affiliateGMV > 0).map(c => c.creatorUsername));
      const retained = [...prevActive].filter(u => currActive.has(u)).length;
      const churned = [...prevActive].filter(u => !currActive.has(u)).length;
      const newOnes = [...currActive].filter(u => !prevActive.has(u)).length;
      const retentionRate = prevActive.size > 0 ? (retained / prevActive.size) * 100 : 0;
      return { period: periods[pi], retained, churned, newOnes, retentionRate, total: currActive.size };
    }).filter(Boolean) as { period: string; retained: number; churned: number; newOnes: number; retentionRate: number; total: number }[];

    // Heatmap data
    const allHeatmapUsernames = Array.from(new Set(sorted.flatMap(d => d.creators.map(c => c.creatorUsername))));
    const activityMap: Record<string, Record<number, number>> = {};
    sorted.forEach((d, pi) => {
      d.creators.forEach(c => {
        if (!activityMap[c.creatorUsername]) activityMap[c.creatorUsername] = {};
        if (c.affiliateGMV > 0) activityMap[c.creatorUsername][pi] = c.affiliateGMV;
      });
    });
    const heatmapCreators = allHeatmapUsernames
      .map(u => ({
        username: u,
        totalActive: Object.keys(activityMap[u] || {}).length,
        totalGMV: Object.values(activityMap[u] || {}).reduce((a, v) => a + v, 0),
      }))
      .sort((a, b) => b.totalActive - a.totalActive || b.totalGMV - a.totalGMV)
      .slice(0, 50);
    const maxGMVInHeatmap = Math.max(...Object.values(activityMap).flatMap(m => Object.values(m)), 1);

    return {
      items, needFollowUp, lostGMV,
      criticalCount, warningCount, attentionCount, monitorCount, risingCount, newCount,
      comebackCreators, topGrowers, consistentCount, recoveryRate,
      latestPeriod: latest.period || latest.periodRaw,
      prevPeriod: prev.period || prev.periodRaw,
      periods, sorted, monthStats,
      heatmapCreators, activityMap, maxGMVInHeatmap,
    };
  }, [enrichedData]);

  // ── FILTERED FOLLOW-UP LIST ─────────────────────────
  const filteredItems = useMemo(() => {
    if (!analysis) return [];
    let list = filter === 'all' ? analysis.needFollowUp : analysis.items.filter(i => i.severity === filter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(i => i.username.toLowerCase().includes(q));
    }
    return list;
  }, [analysis, filter, search]);

  // ── COMPARISON SORTED LIST ──────────────────────────
  const comparisonItems = useMemo(() => {
    if (!analysis) return [];
    return [...analysis.items].sort((a, b) => {
      let diff = 0;
      if (compSort === 'change') diff = Math.abs(b.change) - Math.abs(a.change);
      else if (compSort === 'changePct') diff = Math.abs(b.changePct) - Math.abs(a.changePct);
      else if (compSort === 'currGMV') diff = b.currGMV - a.currGMV;
      else if (compSort === 'prevGMV') diff = b.prevGMV - a.prevGMV;
      return compSortAsc ? -diff : diff;
    });
  }, [analysis, compSort, compSortAsc]);

  // ── LOADING STATE ────────────────────────────────────
  if (loadingCreators) {
    return (
      <div className="bg-white rounded-xl border p-8 text-center text-gray-400">
        <Loader2 className="w-10 h-10 mx-auto mb-3 animate-spin text-blue-500" />
        <p className="font-medium text-gray-600">Memuat data kreator per periode...</p>
        <p className="text-sm mt-1">Mengambil data dari database untuk analisis retensi.</p>
      </div>
    );
  }

  // ── EMPTY STATE ─────────────────────────────────────
  if (!analysis) {
    const sorted = [...enrichedData].sort((a, b) => a.periodRaw.localeCompare(b.periodRaw));
    const allUsernames = Array.from(new Set(sorted.flatMap(d => d.creators.map(c => c.creatorUsername))));
    if (enrichedData.length >= 2 && allUsernames.length === 0) {
      return (
        <div className="bg-white rounded-xl border p-8 text-center text-gray-400">
          <Activity className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Data kreator per periode tidak tersedia</p>
          <p className="text-sm mt-1">Pastikan data kreator sudah tersimpan di database. Coba upload ulang file kreator.</p>
        </div>
      );
    }
    return (
      <div className="bg-white rounded-xl border p-8 text-center text-gray-400">
        <Activity className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="font-medium">Minimal 2 periode data untuk analisis retensi</p>
        <p className="text-sm mt-1">Upload data bulan tambahan untuk melihat tren dan analisis retensi kreator.</p>
      </div>
    );
  }

  const ra = analysis;

  // ═══════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════
  return (
    <div className="space-y-6">
      {/* ═══ 1. ENHANCED RETENTION KPIs ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { icon: <UserMinus className="w-5 h-5" />, label: "Perlu Follow-Up", value: fN(ra.needFollowUp.length), sub: `${fN(ra.criticalCount)} kritis`, color: "red", highlight: ra.needFollowUp.length > 0 },
          { icon: <DollarSign className="w-5 h-5" />, label: "Potensi Omset Hilang", value: fRp(ra.lostGMV), sub: `dari ${fN(ra.needFollowUp.length)} kreator`, color: "orange", highlight: ra.lostGMV > 0 },
          { icon: <TrendingUp className="w-5 h-5" />, label: "Kreator Naik", value: fN(ra.risingCount), sub: `${fN(ra.newCount)} baru masuk`, color: "green", highlight: false },
          { icon: <Heart className="w-5 h-5" />, label: "Konsisten", value: fN(ra.consistentCount), sub: `aktif semua periode`, color: "blue", highlight: false },
          { icon: <RefreshCw className="w-5 h-5" />, label: "Recovery Rate", value: fP(ra.recoveryRate), sub: `kreator bangkit kembali`, color: "purple", highlight: false },
          {
            icon: <Activity className="w-5 h-5" />, label: "Avg Retention",
            value: fP(ra.monthStats.length > 0 ? ra.monthStats.reduce((a, m) => a + m.retentionRate, 0) / ra.monthStats.length : 0),
            sub: `${fN(ra.monthStats.length)} periode`,
            color: ra.monthStats.length > 0 && (ra.monthStats.reduce((a, m) => a + m.retentionRate, 0) / ra.monthStats.length) >= 70 ? "green" : "red",
            highlight: false,
          },
        ].map((kpi) => {
          const colorMap: Record<string, string> = {
            red: "border-red-200 bg-gradient-to-br from-red-50 to-rose-50",
            orange: "border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50",
            green: "border-green-200 bg-gradient-to-br from-green-50 to-emerald-50",
            blue: "border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50",
            purple: "border-purple-200 bg-gradient-to-br from-purple-50 to-violet-50",
          };
          const valMap: Record<string, string> = {
            red: "text-red-700", orange: "text-orange-700", green: "text-green-700",
            blue: "text-blue-700", purple: "text-purple-700",
          };
          const iconBg: Record<string, string> = {
            red: "bg-red-100 text-red-600", orange: "bg-orange-100 text-orange-600",
            green: "bg-green-100 text-green-600", blue: "bg-blue-100 text-blue-600",
            purple: "bg-purple-100 text-purple-600",
          };
          return (
            <div key={kpi.label} className={`rounded-xl border p-3 ${colorMap[kpi.color] || colorMap.blue} ${kpi.highlight ? 'ring-2 ring-red-300 shadow-sm' : ''} hover:shadow-md transition-shadow duration-200`}>
              <div className="flex justify-between items-start">
                <p className="text-[11px] text-gray-500 font-medium leading-tight">{kpi.label}</p>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${iconBg[kpi.color] || iconBg.blue}`}>{kpi.icon}</div>
              </div>
              <p className={`text-xl font-bold mt-1 ${valMap[kpi.color] || valMap.blue}`}>{kpi.value}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{kpi.sub}</p>
            </div>
          );
        })}
      </div>

      {/* ═══ 2. FOLLOW-UP PRIORITY PANEL ═══ */}
      {ra.needFollowUp.length > 0 && (
        <div className="bg-gradient-to-br from-red-50 via-orange-50 to-amber-50 rounded-xl border border-red-200/60 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h3 className="font-bold text-gray-800 flex items-center gap-2 text-base">
              <ShieldAlert className="w-5 h-5 text-red-600" />
              🚨 Daftar Follow-Up Retensi — {fN(ra.needFollowUp.length)} Kreator
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari kreator..."
                  className="border rounded-lg pl-8 pr-3 py-1.5 text-xs w-44 focus:ring-2 focus:ring-red-300 focus:border-red-300 bg-white/80"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                    <X className="w-3 h-3 text-gray-400" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Severity filter badges */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {[
              { key: 'all', label: `Semua (${ra.needFollowUp.length})`, cls: 'bg-gray-100 text-gray-700 border-gray-200' },
              { key: 'kritis', label: `🔴 Hilang (${ra.criticalCount})`, cls: SEV_CONFIG.kritis.badge },
              { key: 'peringatan', label: `🟠 Turun >50% (${ra.warningCount})`, cls: SEV_CONFIG.peringatan.badge },
              { key: 'perhatian', label: `🟡 Turun 20-50% (${ra.attentionCount})`, cls: SEV_CONFIG.perhatian.badge },
              { key: 'monitor', label: `🔵 Turun Berturut (${ra.monitorCount})`, cls: SEV_CONFIG.monitor.badge },
            ].map(btn => (
              <button
                key={btn.key}
                onClick={() => setFilter(btn.key)}
                className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-all ${
                  filter === btn.key ? `${btn.cls} ring-2 ring-offset-1 ring-gray-300 shadow-sm` : `${btn.cls} opacity-60 hover:opacity-100`
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {/* Follow-up items */}
          <div className="space-y-2">
            {(showAllFollowUp ? filteredItems : filteredItems.slice(0, 10)).map((item) => {
              const sev = SEV_CONFIG[item.severity];
              return (
                <div key={item.username} className={`bg-white rounded-lg border ${sev.cardBorder} border-l-4 p-3 hover:shadow-md transition-all`}>
                  <div className="flex items-start gap-3">
                    <span className="text-lg mt-0.5 shrink-0">{sev.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900 text-sm">@{item.username}</span>
                        <span className={`text-[10px] px-1.5 py-0 rounded ${TIER_COLORS[item.tier]}`}>{item.tier}</span>
                        {item.followers > 0 && <span className="text-[10px] text-gray-400">{fN(item.followers)} followers</span>}
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${sev.badge}`}>{sev.label}</span>
                        {item.consecutiveDecline && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200 font-medium">📉 Turun berturut</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <div className="flex items-center gap-1.5 text-sm">
                          <span className="text-gray-500">{fRp(item.prevGMV)}</span>
                          <ArrowDownRight className="w-3.5 h-3.5 text-red-500 shrink-0" />
                          <span className={`font-bold ${item.currGMV === 0 ? 'text-red-600' : 'text-gray-900'}`}>
                            {item.currGMV === 0 ? 'Rp 0' : fRp(item.currGMV)}
                          </span>
                        </div>
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                          item.changePct <= -50 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                        }`}>
                          {item.changePct > 0 ? '+' : ''}{item.changePct.toFixed(0)}%
                        </span>
                        <MiniSparkline values={item.sparklineGMVs} highlightLast />
                        <span className="text-[10px] text-gray-400">selisih {fRp(Math.abs(item.change))}</span>
                      </div>
                      {item.recommendation && (
                        <p className="text-xs text-gray-600 mt-1.5 bg-gray-50 rounded px-2 py-1.5 border border-gray-100">
                          💡 {item.recommendation}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => onDrillDown(item.username)}
                      className="text-xs px-2.5 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors shrink-0 font-medium"
                    >
                      Detail →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredItems.length > 10 && (
            <button
              onClick={() => setShowAllFollowUp(!showAllFollowUp)}
              className="mt-3 text-sm text-red-600 hover:text-red-700 font-medium flex items-center gap-1"
            >
              {showAllFollowUp
                ? <><ChevronUp className="w-4 h-4" /> Tampilkan lebih sedikit</>
                : <><ChevronDown className="w-4 h-4" /> Tampilkan semua {fN(filteredItems.length)} kreator</>
              }
            </button>
          )}
          {filteredItems.length === 0 && search && (
            <p className="text-sm text-gray-400 text-center py-4">Tidak ditemukan kreator dengan username &quot;{search}&quot;</p>
          )}
        </div>
      )}

      {/* ═══ 3. MONTH-OVER-MONTH COMPARISON TABLE ═══ */}
      <div className="bg-white rounded-xl border p-5">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-600" />
            Perbandingan Omset per Kreator: {ra.prevPeriod} → {ra.latestPeriod}
          </h3>
          <span className="text-xs text-gray-400">{fN(comparisonItems.length)} kreator</span>
        </div>
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white z-10">
              <tr className="border-b text-left text-gray-500">
                <th className="pb-2 pr-3 font-medium">#</th>
                <th className="pb-2 pr-3 font-medium">Kreator</th>
                <th className="pb-2 font-medium text-center">Trend</th>
                <th
                  className="pb-2 font-medium text-right cursor-pointer hover:text-blue-600 select-none"
                  onClick={() => { setCompSort('prevGMV'); setCompSortAsc(compSort === 'prevGMV' ? !compSortAsc : false); }}
                >
                  {ra.prevPeriod} {compSort === 'prevGMV' && (compSortAsc ? '↑' : '↓')}
                </th>
                <th
                  className="pb-2 font-medium text-right cursor-pointer hover:text-blue-600 select-none"
                  onClick={() => { setCompSort('currGMV'); setCompSortAsc(compSort === 'currGMV' ? !compSortAsc : false); }}
                >
                  {ra.latestPeriod} {compSort === 'currGMV' && (compSortAsc ? '↑' : '↓')}
                </th>
                <th
                  className="pb-2 font-medium text-right cursor-pointer hover:text-blue-600 select-none"
                  onClick={() => { setCompSort('change'); setCompSortAsc(compSort === 'change' ? !compSortAsc : false); }}
                >
                  Selisih {compSort === 'change' && (compSortAsc ? '↑' : '↓')}
                </th>
                <th
                  className="pb-2 font-medium text-right cursor-pointer hover:text-blue-600 select-none"
                  onClick={() => { setCompSort('changePct'); setCompSortAsc(compSort === 'changePct' ? !compSortAsc : false); }}
                >
                  % {compSort === 'changePct' && (compSortAsc ? '↑' : '↓')}
                </th>
                <th className="pb-2 font-medium text-center">Status</th>
                <th className="pb-2 font-medium text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {comparisonItems.slice(0, 100).map((item, i) => {
                const sev = SEV_CONFIG[item.severity];
                return (
                  <tr key={item.username} className="hover:bg-gray-50 transition-colors">
                    <td className="py-2 pr-3 text-xs text-gray-400 font-bold">{i + 1}</td>
                    <td className="py-2 pr-3">
                      <span className="font-medium text-gray-900">@{item.username}</span>
                      <span className={`ml-1.5 text-[10px] px-1.5 py-0 rounded ${TIER_COLORS[item.tier]}`}>{item.tier}</span>
                    </td>
                    <td className="py-2 text-center">
                      <MiniSparkline values={item.sparklineGMVs} width={40} height={14} />
                    </td>
                    <td className="py-2 text-right text-gray-600">
                      {item.prevGMV > 0 ? fRp(item.prevGMV) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className={`py-2 text-right font-medium ${item.currGMV > 0 ? 'text-blue-600' : 'text-gray-300'}`}>
                      {item.currGMV > 0 ? fRp(item.currGMV) : '—'}
                    </td>
                    <td className={`py-2 text-right font-medium ${item.change > 0 ? 'text-green-600' : item.change < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                      {item.change > 0 ? '+' : ''}{item.change !== 0 ? fRp(item.change) : '—'}
                    </td>
                    <td className={`py-2 text-right font-bold text-xs ${
                      item.changePct > 0 ? 'text-green-600' : item.changePct < -50 ? 'text-red-600' : item.changePct < 0 ? 'text-orange-600' : 'text-gray-400'
                    }`}>
                      {item.prevGMV > 0 || item.currGMV > 0 ? `${item.changePct > 0 ? '+' : ''}${item.changePct.toFixed(0)}%` : '—'}
                    </td>
                    <td className="py-2 text-center">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium whitespace-nowrap ${sev.badge}`}>
                        {sev.icon} {sev.label}
                      </span>
                    </td>
                    <td className="py-2 text-center">
                      <button
                        onClick={() => onDrillDown(item.username)}
                        className="text-[10px] px-2 py-1 rounded bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-700 transition-colors"
                      >
                        Detail
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {comparisonItems.length > 100 && (
          <p className="text-xs text-gray-400 text-center mt-2">Menampilkan 100 dari {fN(comparisonItems.length)} kreator.</p>
        )}
      </div>

      {/* ═══ 4. COMEBACK & TOP GROWERS ═══ */}
      {(ra.comebackCreators.length > 0 || ra.topGrowers.length > 0 || ra.consistentCount > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Top Growers */}
          {ra.topGrowers.length > 0 && (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200/60 p-4">
              <h4 className="font-semibold text-green-800 mb-3 flex items-center gap-2 text-sm">
                <TrendingUp className="w-4 h-4" /> Pertumbuhan Tertinggi 🚀
              </h4>
              <div className="space-y-2">
                {ra.topGrowers.map((c, i) => (
                  <div key={c.username} className="flex items-center justify-between text-xs bg-white/80 rounded-lg px-2.5 py-2 border border-green-100">
                    <div className="flex items-center gap-2">
                      <span className="text-green-600 font-bold w-4">{i + 1}.</span>
                      <button onClick={() => onDrillDown(c.username)} className="text-gray-800 font-medium hover:text-blue-600 hover:underline">
                        @{c.username}
                      </button>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-green-600">+{c.changePct.toFixed(0)}%</span>
                      <p className="text-[10px] text-gray-400 mt-0.5">{fRp(c.prevGMV)} → {fRp(c.currGMV)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comeback */}
          {ra.comebackCreators.length > 0 && (
            <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl border border-purple-200/60 p-4">
              <h4 className="font-semibold text-purple-800 mb-3 flex items-center gap-2 text-sm">
                <Award className="w-4 h-4" /> Comeback! 🎉
              </h4>
              <p className="text-xs text-purple-600 mb-2">Kreator yang kembali aktif setelah tidak aktif bulan lalu:</p>
              <div className="space-y-2">
                {ra.comebackCreators.slice(0, 5).map(c => (
                  <div key={c.username} className="flex items-center justify-between text-xs bg-white/80 rounded-lg px-2.5 py-2 border border-purple-100">
                    <button onClick={() => onDrillDown(c.username)} className="text-gray-800 font-medium hover:text-blue-600 hover:underline">
                      @{c.username}
                    </button>
                    <span className="font-bold text-purple-600">{fRp(c.currGMV)}</span>
                  </div>
                ))}
                {ra.comebackCreators.length > 5 && (
                  <p className="text-[10px] text-purple-500 text-center">+{ra.comebackCreators.length - 5} kreator lainnya</p>
                )}
              </div>
            </div>
          )}

          {/* Consistent */}
          {ra.consistentCount > 0 && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200/60 p-4">
              <h4 className="font-semibold text-blue-800 mb-3 flex items-center gap-2 text-sm">
                <Star className="w-4 h-4" /> Kreator Loyal 💎
              </h4>
              <div className="text-center py-3">
                <p className="text-3xl font-bold text-blue-700">{fN(ra.consistentCount)}</p>
                <p className="text-xs text-blue-600 mt-1">kreator aktif di SEMUA periode data</p>
                <p className="text-[10px] text-blue-400 mt-0.5">({fN(ra.periods.length)} periode)</p>
              </div>
              <p className="text-xs text-blue-600 bg-blue-100/60 rounded-lg p-2 mt-2 text-center">
                Pertahankan hubungan baik dengan kreator loyal ini! 🏆
              </p>
            </div>
          )}
        </div>
      )}

      {/* ═══ 5. AUTO RECOMMENDATIONS ═══ */}
      {ra.needFollowUp.length > 0 && (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200/60 p-5">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-600" /> Rekomendasi Aksi Retensi
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {(() => {
              const recs: { icon: string; text: string; type: 'danger' | 'warning' | 'info' }[] = [];

              if (ra.criticalCount > 0) {
                const totalLostGMV = ra.items.filter(i => i.severity === 'kritis').reduce((a, i) => a + i.prevGMV, 0);
                recs.push({
                  icon: '🔴',
                  text: `${fN(ra.criticalCount)} kreator HILANG total dengan potensi omset ${fRp(totalLostGMV)}. Prioritas utama untuk follow-up segera.`,
                  type: 'danger',
                });
              }
              if (ra.warningCount > 0) {
                recs.push({
                  icon: '🟠',
                  text: `${fN(ra.warningCount)} kreator omset turun >50%. Jadwalkan diskusi personal untuk evaluasi kendala dan strategi.`,
                  type: 'warning',
                });
              }
              const consecutiveList = ra.needFollowUp.filter(i => i.consecutiveDecline);
              if (consecutiveList.length > 0) {
                recs.push({
                  icon: '📉',
                  text: `${fN(consecutiveList.length)} kreator turun 2 bulan berturut-turut: ${consecutiveList.slice(0, 3).map(c => '@' + c.username).join(', ')}${consecutiveList.length > 3 ? ` +${consecutiveList.length - 3} lainnya` : ''}. Kirim sampel produk baru.`,
                  type: 'warning',
                });
              }
              if (ra.comebackCreators.length > 0) {
                recs.push({
                  icon: '🎉',
                  text: `${fN(ra.comebackCreators.length)} kreator comeback bulan ini! Apresiasi mereka untuk mempertahankan momentum.`,
                  type: 'info',
                });
              }
              if (ra.consistentCount > 0 && ra.consistentCount <= 5) {
                recs.push({
                  icon: '💎',
                  text: `Hanya ${fN(ra.consistentCount)} kreator konsisten di semua periode. Pertimbangkan program loyalitas/bonus khusus.`,
                  type: 'info',
                });
              }
              const avgRetention = ra.monthStats.length > 0 ? ra.monthStats.reduce((a, m) => a + m.retentionRate, 0) / ra.monthStats.length : 0;
              if (avgRetention < 50) {
                recs.push({
                  icon: '⚠️',
                  text: `Retention rate rata-rata ${fP(avgRetention)} — sangat rendah. Perlu evaluasi menyeluruh program affiliate dan insentif kreator.`,
                  type: 'danger',
                });
              } else if (avgRetention < 70) {
                recs.push({
                  icon: '🟡',
                  text: `Retention rate ${fP(avgRetention)} — masih di bawah target 70%. Fokus pada engagement dan follow-up rutin.`,
                  type: 'warning',
                });
              }

              const bgMap = { danger: 'bg-red-50 border-red-200', warning: 'bg-yellow-50 border-yellow-200', info: 'bg-blue-50 border-blue-200' };
              return recs.map((r, i) => (
                <div key={i} className={`rounded-lg border p-3 ${bgMap[r.type]}`}>
                  <p className="text-sm text-gray-700"><span className="mr-1.5">{r.icon}</span>{r.text}</p>
                </div>
              ));
            })()}
          </div>
        </div>
      )}

      {/* ═══ 6. RETENTION RATE & CHURN TABLE ═══ */}
      {ra.monthStats.length > 0 && (
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-600" />
            Retention Rate & Churn per Bulan
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-2 font-medium">Periode</th>
                  <th className="pb-2 font-medium text-right">Aktif</th>
                  <th className="pb-2 font-medium text-right">Retained</th>
                  <th className="pb-2 font-medium text-right text-green-600">+Baru</th>
                  <th className="pb-2 font-medium text-right text-red-500">-Churn</th>
                  <th className="pb-2 font-medium text-right">Retention %</th>
                  <th className="pb-2 font-medium">Bar</th>
                </tr>
              </thead>
              <tbody>
                {ra.monthStats.map(m => (
                  <tr key={m.period} className="border-b hover:bg-gray-50">
                    <td className="py-2.5 font-medium">{m.period}</td>
                    <td className="py-2.5 text-right font-bold">{m.total}</td>
                    <td className="py-2.5 text-right text-blue-600">{m.retained}</td>
                    <td className="py-2.5 text-right text-green-600 font-medium">+{m.newOnes}</td>
                    <td className="py-2.5 text-right text-red-500 font-medium">-{m.churned}</td>
                    <td className={`py-2.5 text-right font-bold ${m.retentionRate >= 70 ? 'text-green-600' : m.retentionRate >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                      {m.retentionRate.toFixed(1)}%
                    </td>
                    <td className="py-2.5 w-32">
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${m.retentionRate >= 70 ? 'bg-green-500' : m.retentionRate >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                          style={{ width: `${m.retentionRate}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══ 7. ENHANCED HEATMAP ═══ */}
      {ra.heatmapCreators.length > 0 && (
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-semibold text-gray-800 mb-1 flex items-center gap-2">
            <PieChart className="w-4 h-4 text-purple-600" />
            Heatmap Aktivitas Kreator
          </h3>
          <p className="text-xs text-gray-400 mb-4">
            Intensitas warna = besaran GMV. Semakin gelap hijau = omset semakin besar. Abu = tidak aktif. Hover untuk lihat nominal. Top 50 kreator.
          </p>
          <div className="overflow-x-auto">
            <table className="text-xs w-full">
              <thead>
                <tr className="border-b">
                  <th className="pb-2 text-left font-medium text-gray-600 min-w-[140px] pr-3">Kreator</th>
                  <th className="pb-2 font-medium text-center text-gray-500">Total</th>
                  {ra.periods.map(p => (
                    <th key={p} className="pb-2 font-medium text-center text-gray-400 px-0.5 whitespace-nowrap">{p.replace(/\s.*/, '')}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ra.heatmapCreators.map(({ username, totalActive }) => {
                  const acts = ra.activityMap[username] || {};
                  return (
                    <tr key={username} className="border-b hover:bg-gray-50">
                      <td className="py-1.5 pr-3 font-medium text-gray-800 truncate max-w-[140px]">
                        <button onClick={() => onDrillDown(username)} className="hover:text-blue-600 hover:underline transition-colors text-left">
                          @{username}
                        </button>
                      </td>
                      <td className="py-1.5 text-center">
                        <span className={`px-1.5 py-0.5 rounded font-bold ${
                          totalActive === ra.sorted.length ? 'bg-green-100 text-green-700'
                          : totalActive >= ra.sorted.length * 0.7 ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-600'
                        }`}>
                          {totalActive}/{ra.sorted.length}
                        </span>
                      </td>
                      {ra.sorted.map((_, pi) => {
                        const gmv = acts[pi] || 0;
                        const intensity = gmv > 0 ? Math.max(0.15, Math.min(1, gmv / ra.maxGMVInHeatmap)) : 0;
                        const bgColor = gmv > 0 ? `rgba(34, 197, 94, ${intensity})` : '#f3f4f6';
                        return (
                          <td key={pi} className="py-1.5 px-0.5 text-center">
                            <div
                              className="w-5 h-5 rounded mx-auto cursor-default"
                              style={{ backgroundColor: bgColor }}
                              title={gmv > 0 ? fRp(gmv) : 'Tidak aktif'}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-6 mt-3 text-xs text-gray-500">
            <span className="flex items-center gap-1"><div className="w-3 h-3 rounded" style={{ backgroundColor: 'rgba(34, 197, 94, 1)' }} /> GMV Tinggi</span>
            <span className="flex items-center gap-1"><div className="w-3 h-3 rounded" style={{ backgroundColor: 'rgba(34, 197, 94, 0.3)' }} /> GMV Rendah</span>
            <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-gray-100 border" /> Tidak aktif</span>
          </div>
        </div>
      )}
    </div>
  );
}
