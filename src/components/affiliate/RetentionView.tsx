"use client";
import React, { useState, useMemo, useEffect, useCallback } from "react";
import type { AffiliateMonthData, AffiliateCreatorItem } from "@/lib/types";
import { loadAffiliateCreators } from "@/lib/db";
import {
  Activity, Search, TrendingUp, ChevronDown, ChevronUp,
  DollarSign, PieChart, ArrowDownRight, ArrowUpRight, Star, X, UserMinus,
  Award, RefreshCw, Heart, ShieldAlert, Lightbulb, BarChart3, Loader2,
  Eye, Phone, Gift, MessageSquare, AlertTriangle, CheckCircle, Copy,
  Users, Flame, Crown, TrendingDown, Percent, Calendar, Download
} from "lucide-react";

// ═══════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════
type AffiliateMonthDataWithStore = AffiliateMonthData & { _storeName: string };
type RetentionSeverity = 'kritis' | 'peringatan' | 'perhatian' | 'monitor' | 'naik' | 'baru' | 'stabil';
type SubTab = 'overview' | 'followup' | 'comparison' | 'heatmap';

interface RetentionItem {
  username: string;
  tier: string;
  followers: number;
  prevGMV: number;
  currGMV: number;
  prevOrders: number;
  currOrders: number;
  prevVideos: number;
  currVideos: number;
  change: number;
  changePct: number;
  severity: RetentionSeverity;
  consecutiveDecline: boolean;
  recommendation: string;
  actionType: 'call' | 'sample' | 'incentive' | 'appreciate' | 'monitor' | 'none';
  sparklineGMVs: number[];
  riskScore: number;
  daysSinceLastActive: number;
}

interface MonthStat {
  period: string;
  retained: number;
  churned: number;
  newOnes: number;
  retentionRate: number;
  total: number;
  totalGMV: number;
  avgGMVPerCreator: number;
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

const SEV_CONFIG: Record<RetentionSeverity, { label: string; icon: string; badge: string; cardBorder: string; bg: string }> = {
  kritis:     { label: 'HILANG',         icon: '🔴', badge: 'bg-red-100 text-red-700 border-red-200',       cardBorder: 'border-l-red-500', bg: 'bg-red-50' },
  peringatan: { label: 'TURUN DRASTIS',  icon: '🟠', badge: 'bg-orange-100 text-orange-700 border-orange-200', cardBorder: 'border-l-orange-500', bg: 'bg-orange-50' },
  perhatian:  { label: 'TURUN',          icon: '🟡', badge: 'bg-yellow-100 text-yellow-700 border-yellow-200', cardBorder: 'border-l-yellow-500', bg: 'bg-yellow-50' },
  monitor:    { label: 'TURUN BERTURUT', icon: '🔵', badge: 'bg-blue-100 text-blue-700 border-blue-200',     cardBorder: 'border-l-blue-500', bg: 'bg-blue-50' },
  naik:       { label: 'NAIK',           icon: '🟢', badge: 'bg-green-100 text-green-700 border-green-200',   cardBorder: 'border-l-green-500', bg: 'bg-green-50' },
  baru:       { label: 'BARU',           icon: '✨', badge: 'bg-purple-100 text-purple-700 border-purple-200', cardBorder: 'border-l-purple-500', bg: 'bg-purple-50' },
  stabil:     { label: 'STABIL',         icon: '➖', badge: 'bg-gray-100 text-gray-600 border-gray-200',     cardBorder: 'border-l-gray-400', bg: 'bg-gray-50' },
};

const ACTION_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  call:       { icon: <Phone className="w-3 h-3" />, label: 'Hubungi', color: 'bg-red-100 text-red-700' },
  sample:     { icon: <Gift className="w-3 h-3" />, label: 'Kirim Sampel', color: 'bg-orange-100 text-orange-700' },
  incentive:  { icon: <DollarSign className="w-3 h-3" />, label: 'Beri Insentif', color: 'bg-yellow-100 text-yellow-700' },
  appreciate: { icon: <Heart className="w-3 h-3" />, label: 'Apresiasi', color: 'bg-green-100 text-green-700' },
  monitor:    { icon: <Eye className="w-3 h-3" />, label: 'Pantau', color: 'bg-blue-100 text-blue-700' },
  none:       { icon: <CheckCircle className="w-3 h-3" />, label: 'OK', color: 'bg-gray-100 text-gray-600' },
};

// ═══════════════════════════════════════════════════════
// MINI SPARKLINE
// ═══════════════════════════════════════════════════════
function MiniSparkline({ values, width = 60, height = 20, highlightLast = false }: {
  values: number[]; width?: number; height?: number; highlightLast?: boolean;
}) {
  if (values.length < 2) return <span className="text-gray-300 text-xs">—</span>;
  const max = Math.max(...values, 1);
  const bW = Math.max(3, Math.floor(width / values.length) - 1);
  return (
    <svg width={width} height={height} className="inline-block align-middle">
      {values.map((v, idx) => {
        const bH = Math.max(1, Math.round((v / max) * (height - 2)));
        const isLast = idx === values.length - 1;
        const fill = highlightLast && isLast
          ? (v > (values[idx - 1] || 0) ? '#10b981' : v === 0 ? '#ef4444' : '#f59e0b')
          : (v > 0 ? '#3b82f6' : '#e5e7eb');
        return <rect key={idx} x={idx * (bW + 1)} y={height - bH} width={bW} height={bH} fill={fill} rx="1" />;
      })}
    </svg>
  );
}

// ═══════════════════════════════════════════════════════
// RISK SCORE BADGE
// ═══════════════════════════════════════════════════════
function RiskBadge({ score }: { score: number }) {
  const level = score >= 80 ? 'KRITIS' : score >= 60 ? 'TINGGI' : score >= 40 ? 'SEDANG' : 'RENDAH';
  const color = score >= 80 ? 'bg-red-600' : score >= 60 ? 'bg-orange-500' : score >= 40 ? 'bg-yellow-500' : 'bg-green-500';
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-8 h-2 rounded-full bg-gray-200 overflow-hidden`}>
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-[9px] font-bold ${score >= 80 ? 'text-red-600' : score >= 60 ? 'text-orange-600' : score >= 40 ? 'text-yellow-600' : 'text-green-600'}`}>
        {level}
      </span>
    </div>
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
  const [subTab, setSubTab] = useState<SubTab>('overview');
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [showAllFollowUp, setShowAllFollowUp] = useState(false);
  const [compSort, setCompSort] = useState<'change' | 'changePct' | 'currGMV' | 'prevGMV' | 'riskScore'>('riskScore');
  const [compSortAsc, setCompSortAsc] = useState(false);
  const [perPeriodCreators, setPerPeriodCreators] = useState<Record<string, AffiliateCreatorItem[]>>({});
  const [loadingCreators, setLoadingCreators] = useState(false);
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [copied, setCopied] = useState(false);

  // ── ENRICH: Load creators from Supabase per period when local data is empty ──
  useEffect(() => {
    const hasLocalCreators = filteredData.some(d => d.creators && d.creators.length > 0);
    if (hasLocalCreators || filteredData.length < 2) return;

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

  // ── BUILD ENRICHED DATA ──
  const enrichedData = useMemo(() => {
    return filteredData.map(d => {
      if (d.creators && d.creators.length > 0) return d;
      const periodKey = d.periodRaw.split(" ~ ")[0]?.slice(0, 7) || d.periodRaw;
      const supaCreators = perPeriodCreators[periodKey];
      if (supaCreators && supaCreators.length > 0) {
        return { ...d, creators: supaCreators };
      }
      return d;
    });
  }, [filteredData, perPeriodCreators]);

  // ═══════════════════════════════════════════════════════
  // MAIN ANALYSIS
  // ═══════════════════════════════════════════════════════
  const analysis = useMemo(() => {
    const sorted = [...enrichedData].sort((a, b) => a.periodRaw.localeCompare(b.periodRaw));
    if (sorted.length < 2) return null;

    const periods = sorted.map(d => d.period || d.periodRaw.slice(0, 7));
    const latest = sorted[sorted.length - 1];
    const prev = sorted[sorted.length - 2];
    const prevPrev = sorted.length >= 3 ? sorted[sorted.length - 3] : null;

    // Creator maps per period
    const latestMap = new Map<string, AffiliateCreatorItem>();
    latest.creators.forEach(c => latestMap.set(c.creatorUsername, c));
    const prevMap = new Map<string, AffiliateCreatorItem>();
    prev.creators.forEach(c => prevMap.set(c.creatorUsername, c));
    const prevPrevMap = new Map<string, AffiliateCreatorItem>();
    if (prevPrev) prevPrev.creators.forEach(c => prevPrevMap.set(c.creatorUsername, c));

    // All relevant usernames
    const relevantUsernames = new Set<string>();
    sorted.forEach(d => d.creators.forEach(c => {
      if (c.affiliateGMV > 0) relevantUsernames.add(c.creatorUsername);
    }));

    // Sparklines
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

      const currOrders = curr?.affiliateOrders || 0;
      const prevOrders = prevC?.affiliateOrders || 0;
      const currVideos = curr?.affiliateShoppableVideos || 0;
      const prevVideos = prevC?.affiliateShoppableVideos || 0;

      const change = currGMV - pGMV;
      const changePct = pGMV > 0 ? (change / pGMV) * 100 : (currGMV > 0 ? 100 : 0);
      const consecutiveDecline = ppGMV > 0 && pGMV > 0 && ppGMV > pGMV && pGMV > currGMV;

      // Risk score (0-100): higher = more at risk
      let riskScore = 0;
      if (pGMV > 0 && currGMV === 0) riskScore = 100;
      else if (pGMV > 0 && changePct < -50) riskScore = 80 + Math.min(20, Math.abs(changePct) / 5);
      else if (pGMV > 0 && changePct < -20) riskScore = 50 + Math.abs(changePct);
      else if (pGMV > 0 && changePct < 0) riskScore = 20 + Math.abs(changePct);
      if (consecutiveDecline) riskScore = Math.min(100, riskScore + 15);
      riskScore = Math.min(100, Math.round(riskScore));

      // Days since last active (estimate based on sparkline)
      const sp = sparklines[username] || [];
      let daysSinceLastActive = 0;
      if (sp.length > 0 && sp[sp.length - 1] === 0) {
        let consecutiveZeros = 0;
        for (let i = sp.length - 1; i >= 0; i--) {
          if (sp[i] === 0) consecutiveZeros++;
          else break;
        }
        daysSinceLastActive = consecutiveZeros * 30;
      }

      let severity: RetentionSeverity;
      let recommendation = '';
      let actionType: RetentionItem['actionType'] = 'none';

      if (pGMV > 0 && currGMV === 0) {
        severity = 'kritis';
        recommendation = `Kreator hilang total — omset sebelumnya ${fRp(pGMV)}. Segera hubungi, tawarkan sampel baru atau diskusi kendala.`;
        actionType = 'call';
      } else if (pGMV > 0 && changePct < -50) {
        severity = 'peringatan';
        recommendation = `Omset turun drastis ${Math.abs(changePct).toFixed(0)}% (${fRp(pGMV)} → ${fRp(currGMV)}). Evaluasi produk dan ajak diskusi strategi konten.`;
        actionType = pGMV > 5000000 ? 'call' : 'sample';
      } else if (pGMV > 0 && changePct < -20) {
        severity = 'perhatian';
        recommendation = `Omset menurun ${Math.abs(changePct).toFixed(0)}%. Berikan motivasi, insentif tambahan, atau sampel produk baru.`;
        actionType = 'incentive';
      } else if (pGMV > 0 && changePct < 0 && consecutiveDecline) {
        severity = 'monitor';
        recommendation = `Penurunan 2 bulan berturut (${fRp(ppGMV)} → ${fRp(pGMV)} → ${fRp(currGMV)}). Perhatikan sebelum semakin turun.`;
        actionType = 'monitor';
      } else if (pGMV === 0 && currGMV > 0) {
        severity = 'baru';
        recommendation = `Kreator baru aktif dengan omset ${fRp(currGMV)}. Apresiasi dan bimbing untuk konsistensi.`;
        actionType = 'appreciate';
      } else if (changePct > 20) {
        severity = 'naik';
        recommendation = `Pertumbuhan ${changePct.toFixed(0)}%! Apresiasi dan berikan support untuk mempertahankan momentum.`;
        actionType = 'appreciate';
      } else if (changePct > 0) {
        severity = 'naik';
        recommendation = '';
        actionType = 'none';
      } else {
        severity = 'stabil';
        recommendation = '';
        actionType = 'none';
      }

      items.push({
        username,
        tier: (curr || prevC)?.creatorTier || 'Unknown',
        followers: (curr || prevC)?.affiliateFollowers || 0,
        prevGMV: pGMV, currGMV,
        prevOrders, currOrders,
        prevVideos, currVideos,
        change, changePct,
        severity, consecutiveDecline,
        recommendation, actionType,
        sparklineGMVs: sparklines[username] || [],
        riskScore, daysSinceLastActive,
      });
    });

    // Sort by severity then by GMV impact
    const severityOrder: Record<string, number> = { kritis: 0, peringatan: 1, perhatian: 2, monitor: 3, stabil: 4, baru: 5, naik: 6 };
    items.sort((a, b) => {
      const d = (severityOrder[a.severity] ?? 9) - (severityOrder[b.severity] ?? 9);
      return d !== 0 ? d : b.riskScore - a.riskScore || Math.abs(b.change) - Math.abs(a.change);
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
    const stableCount = items.filter(i => i.severity === 'stabil').length;

    // Comeback
    const comebackCreators = items.filter(i => {
      const sp = i.sparklineGMVs;
      return sp.length >= 3 && sp[sp.length - 3] > 0 && sp[sp.length - 2] === 0 && sp[sp.length - 1] > 0;
    });

    // Top growers
    const topGrowers = items.filter(i => i.severity === 'naik' && i.prevGMV > 0)
      .sort((a, b) => b.changePct - a.changePct).slice(0, 8);

    // Top decliners (absolute GMV lost)
    const topDecliners = items.filter(i => i.change < 0 && i.prevGMV > 0)
      .sort((a, b) => a.change - b.change).slice(0, 8);

    // Consistent
    const consistentCreators = items.filter(i => i.sparklineGMVs.length > 0 && i.sparklineGMVs.every(v => v > 0));
    const consistentCount = consistentCreators.length;

    // Tier distribution
    const tierDistribution: Record<string, { total: number; declining: number; rising: number; lost: number }> = {};
    items.forEach(i => {
      if (!tierDistribution[i.tier]) tierDistribution[i.tier] = { total: 0, declining: 0, rising: 0, lost: 0 };
      tierDistribution[i.tier].total++;
      if (i.severity === 'kritis') tierDistribution[i.tier].lost++;
      else if (['peringatan', 'perhatian', 'monitor'].includes(i.severity)) tierDistribution[i.tier].declining++;
      else if (i.severity === 'naik') tierDistribution[i.tier].rising++;
    });

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

    // Month stats
    const monthStats: MonthStat[] = sorted.map((d, pi) => {
      if (pi === 0) return null;
      const prevActive = new Set(sorted[pi - 1].creators.filter(c => c.affiliateGMV > 0).map(c => c.creatorUsername));
      const currActive = new Set(d.creators.filter(c => c.affiliateGMV > 0).map(c => c.creatorUsername));
      const retained = [...prevActive].filter(u => currActive.has(u)).length;
      const churned = [...prevActive].filter(u => !currActive.has(u)).length;
      const newOnes = [...currActive].filter(u => !prevActive.has(u)).length;
      const retentionRate = prevActive.size > 0 ? (retained / prevActive.size) * 100 : 0;
      const totalGMV = d.creators.filter(c => c.affiliateGMV > 0).reduce((a, c) => a + c.affiliateGMV, 0);
      const avgGMVPerCreator = currActive.size > 0 ? totalGMV / currActive.size : 0;
      return { period: periods[pi], retained, churned, newOnes, retentionRate, total: currActive.size, totalGMV, avgGMVPerCreator };
    }).filter(Boolean) as MonthStat[];

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
        tier: items.find(i => i.username === u)?.tier || 'Unknown',
        totalActive: Object.keys(activityMap[u] || {}).length,
        totalGMV: Object.values(activityMap[u] || {}).reduce((a, v) => a + v, 0),
      }))
      .sort((a, b) => b.totalActive - a.totalActive || b.totalGMV - a.totalGMV)
      .slice(0, 80);
    const maxGMVInHeatmap = Math.max(...Object.values(activityMap).flatMap(m => Object.values(m)), 1);

    // Overall health score
    const healthScore = Math.round(
      (consistentCount / Math.max(items.length, 1)) * 30 +
      (risingCount / Math.max(items.length, 1)) * 25 +
      (1 - criticalCount / Math.max(items.length, 1)) * 25 +
      (recoveryRate / 100) * 20
    );

    // Total GMV comparison
    const latestTotalGMV = latest.creators.reduce((a, c) => a + c.affiliateGMV, 0);
    const prevTotalGMV = prev.creators.reduce((a, c) => a + c.affiliateGMV, 0);
    const gmvChange = latestTotalGMV - prevTotalGMV;
    const gmvChangePct = prevTotalGMV > 0 ? (gmvChange / prevTotalGMV) * 100 : 0;

    return {
      items, needFollowUp, lostGMV,
      criticalCount, warningCount, attentionCount, monitorCount, risingCount, newCount, stableCount,
      comebackCreators, topGrowers, topDecliners, consistentCreators, consistentCount,
      tierDistribution, recoveryRate, healthScore,
      latestTotalGMV, prevTotalGMV, gmvChange, gmvChangePct,
      latestPeriod: latest.period || latest.periodRaw,
      prevPeriod: prev.period || prev.periodRaw,
      periods, sorted, monthStats,
      heatmapCreators, activityMap, maxGMVInHeatmap,
    };
  }, [enrichedData]);

  // ── FILTERED LIST ──
  const filteredItems = useMemo(() => {
    if (!analysis) return [];
    let list = filter === 'all' ? analysis.needFollowUp : analysis.items.filter(i => i.severity === filter);
    if (tierFilter !== 'all') list = list.filter(i => i.tier === tierFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(i => i.username.toLowerCase().includes(q));
    }
    return list;
  }, [analysis, filter, search, tierFilter]);

  // ── COMPARISON SORTED ──
  const comparisonItems = useMemo(() => {
    if (!analysis) return [];
    let list = [...analysis.items];
    if (tierFilter !== 'all') list = list.filter(i => i.tier === tierFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(i => i.username.toLowerCase().includes(q));
    }
    return list.sort((a, b) => {
      let diff = 0;
      if (compSort === 'riskScore') diff = b.riskScore - a.riskScore;
      else if (compSort === 'change') diff = Math.abs(b.change) - Math.abs(a.change);
      else if (compSort === 'changePct') diff = Math.abs(b.changePct) - Math.abs(a.changePct);
      else if (compSort === 'currGMV') diff = b.currGMV - a.currGMV;
      else if (compSort === 'prevGMV') diff = b.prevGMV - a.prevGMV;
      return compSortAsc ? -diff : diff;
    });
  }, [analysis, compSort, compSortAsc, tierFilter, search]);

  // ── COPY FOLLOW-UP LIST ──
  const handleCopyFollowUp = useCallback(() => {
    if (!analysis) return;
    const lines = analysis.needFollowUp.map((i, idx) => {
      const sev = SEV_CONFIG[i.severity];
      return `${idx + 1}. @${i.username} [${i.tier}] ${sev.icon} ${sev.label} — ${fRp(i.prevGMV)} → ${fRp(i.currGMV)} (${i.changePct > 0 ? '+' : ''}${i.changePct.toFixed(0)}%)\n   💡 ${i.recommendation}`;
    });
    const text = `📋 DAFTAR FOLLOW-UP RETENSI KREATOR\n${analysis.prevPeriod} → ${analysis.latestPeriod}\n${'═'.repeat(40)}\n\n${lines.join('\n\n')}\n\n${'═'.repeat(40)}\nTotal: ${analysis.needFollowUp.length} kreator perlu follow-up\nPotensi omset hilang: ${fRp(analysis.lostGMV)}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [analysis]);

  // ── LOADING STATE ──
  if (loadingCreators) {
    return (
      <div className="bg-white rounded-xl border p-12 text-center">
        <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-blue-500" />
        <p className="font-semibold text-gray-700 text-lg">Memuat data kreator per periode...</p>
        <p className="text-sm text-gray-400 mt-2">Mengambil data dari database untuk analisis retensi.</p>
      </div>
    );
  }

  // ── EMPTY STATE ──
  if (!analysis) {
    const sorted = [...enrichedData].sort((a, b) => a.periodRaw.localeCompare(b.periodRaw));
    const allUsernames = Array.from(new Set(sorted.flatMap(d => d.creators.map(c => c.creatorUsername))));
    if (enrichedData.length >= 2 && allUsernames.length === 0) {
      return (
        <div className="bg-white rounded-xl border p-12 text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-orange-400" />
          <p className="font-semibold text-gray-700 text-lg">Data kreator per periode tidak tersedia</p>
          <p className="text-sm text-gray-400 mt-2">Pastikan data kreator sudah tersimpan di database. Coba upload ulang file kreator.</p>
        </div>
      );
    }
    return (
      <div className="bg-white rounded-xl border p-12 text-center">
        <Activity className="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <p className="font-semibold text-gray-700 text-lg">Minimal 2 periode data untuk analisis retensi</p>
        <p className="text-sm text-gray-400 mt-2">Upload data bulan tambahan untuk melihat tren dan analisis retensi kreator.</p>
      </div>
    );
  }

  const ra = analysis;
  const uniqueTiers = Array.from(new Set(ra.items.map(i => i.tier))).sort();

  // ═══════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════
  return (
    <div className="space-y-4">
      {/* ═══ NAVIGATION TABS ═══ */}
      <div className="flex items-center gap-2 bg-white rounded-xl border p-1.5">
        {([
          { key: 'overview' as SubTab, icon: <BarChart3 className="w-4 h-4" />, label: 'Ringkasan', count: null },
          { key: 'followup' as SubTab, icon: <ShieldAlert className="w-4 h-4" />, label: 'Follow-Up', count: ra.needFollowUp.length },
          { key: 'comparison' as SubTab, icon: <Users className="w-4 h-4" />, label: 'Semua Kreator', count: ra.items.length },
          { key: 'heatmap' as SubTab, icon: <Flame className="w-4 h-4" />, label: 'Heatmap', count: null },
        ]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setSubTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              subTab === tab.key
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.count !== null && tab.count > 0 && (
              <span className={`text-xs px-1.5 py-0 rounded-full font-bold ${
                subTab === tab.key ? 'bg-white/20 text-white' : tab.key === 'followup' ? 'bg-red-100 text-red-700' : 'bg-gray-200 text-gray-600'
              }`}>{tab.count}</span>
            )}
          </button>
        ))}
        <div className="flex-1" />
        <span className="text-xs text-gray-400 pr-2">
          <Calendar className="w-3 h-3 inline mr-1" />
          {ra.prevPeriod} → {ra.latestPeriod}
        </span>
      </div>

      {/* ═══ TAB: OVERVIEW ═══ */}
      {subTab === 'overview' && (
        <div className="space-y-4">
          {/* Health Score + Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Health Score */}
            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl p-5 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-8 translate-x-8" />
              <p className="text-indigo-200 text-xs font-medium uppercase tracking-wide">Skor Kesehatan Affiliator</p>
              <div className="flex items-end gap-3 mt-2">
                <span className="text-5xl font-black">{ra.healthScore}</span>
                <span className="text-indigo-200 text-lg mb-1">/100</span>
              </div>
              <div className="w-full h-2 bg-white/20 rounded-full mt-3 overflow-hidden">
                <div className={`h-full rounded-full transition-all ${
                  ra.healthScore >= 70 ? 'bg-green-400' : ra.healthScore >= 40 ? 'bg-yellow-400' : 'bg-red-400'
                }`} style={{ width: `${ra.healthScore}%` }} />
              </div>
              <p className="text-indigo-200 text-xs mt-2">
                {ra.healthScore >= 70 ? '✅ Sehat — Pertahankan!' : ra.healthScore >= 40 ? '⚠️ Perlu perhatian' : '🚨 Kritis — Segera tindak!'}
              </p>
            </div>

            {/* GMV Comparison */}
            <div className="bg-white rounded-xl border p-5">
              <p className="text-xs text-gray-500 font-medium">Total Omset Affiliator</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{fRp(ra.latestTotalGMV)}</p>
              <div className="flex items-center gap-2 mt-1">
                {ra.gmvChange >= 0 ? (
                  <span className="flex items-center gap-0.5 text-green-600 text-sm font-bold">
                    <ArrowUpRight className="w-4 h-4" />+{fP(ra.gmvChangePct)}
                  </span>
                ) : (
                  <span className="flex items-center gap-0.5 text-red-600 text-sm font-bold">
                    <ArrowDownRight className="w-4 h-4" />{fP(ra.gmvChangePct)}
                  </span>
                )}
                <span className="text-xs text-gray-400">vs {ra.prevPeriod}</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">Sebelumnya: {fRp(ra.prevTotalGMV)}</p>
            </div>

            {/* Alerts Summary */}
            <div className={`rounded-xl border p-5 ${ra.needFollowUp.length > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
              <p className="text-xs text-gray-500 font-medium">Kreator Perlu Follow-Up</p>
              <p className={`text-3xl font-bold mt-1 ${ra.needFollowUp.length > 0 ? 'text-red-700' : 'text-green-700'}`}>
                {fN(ra.needFollowUp.length)}
              </p>
              {ra.needFollowUp.length > 0 && (
                <div className="flex gap-2 mt-2 flex-wrap">
                  {ra.criticalCount > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-bold">🔴 {ra.criticalCount} hilang</span>}
                  {ra.warningCount > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 font-bold">🟠 {ra.warningCount} turun drastis</span>}
                  {ra.attentionCount > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700 font-bold">🟡 {ra.attentionCount} turun</span>}
                </div>
              )}
              <p className="text-xs text-gray-400 mt-1">Potensi hilang: {fRp(ra.lostGMV)}</p>
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-xl border p-5">
              <p className="text-xs text-gray-500 font-medium mb-3">Distribusi Kreator</p>
              <div className="space-y-1.5">
                {[
                  { label: '🟢 Naik', count: ra.risingCount, color: 'bg-green-500' },
                  { label: '➖ Stabil', count: ra.stableCount, color: 'bg-gray-400' },
                  { label: '🟡 Turun', count: ra.attentionCount + ra.monitorCount, color: 'bg-yellow-500' },
                  { label: '🔴 Hilang/Drastis', count: ra.criticalCount + ra.warningCount, color: 'bg-red-500' },
                  { label: '✨ Baru', count: ra.newCount, color: 'bg-purple-500' },
                ].map(s => (
                  <div key={s.label} className="flex items-center gap-2 text-xs">
                    <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${s.color}`} style={{ width: `${(s.count / Math.max(ra.items.length, 1)) * 100}%` }} />
                    </div>
                    <span className="text-gray-600 flex-1">{s.label}</span>
                    <span className="font-bold text-gray-800">{s.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* KPI Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {[
              { icon: <Heart className="w-4 h-4" />, label: "Konsisten", value: fN(ra.consistentCount), sub: `aktif semua ${ra.periods.length} periode`, color: "blue" },
              { icon: <RefreshCw className="w-4 h-4" />, label: "Recovery Rate", value: fP(ra.recoveryRate), sub: "kreator bangkit kembali", color: "purple" },
              { icon: <Award className="w-4 h-4" />, label: "Comeback", value: fN(ra.comebackCreators.length), sub: "kembali aktif bulan ini", color: "green" },
              { icon: <TrendingUp className="w-4 h-4" />, label: "Top Growers", value: fN(ra.topGrowers.length), sub: "pertumbuhan signifikan", color: "emerald" },
              { icon: <Activity className="w-4 h-4" />, label: "Avg Retention",
                value: fP(ra.monthStats.length > 0 ? ra.monthStats.reduce((a, m) => a + m.retentionRate, 0) / ra.monthStats.length : 0),
                sub: `${ra.monthStats.length} periode`, color: "indigo" },
              { icon: <Crown className="w-4 h-4" />, label: "Total Kreator", value: fN(ra.items.length), sub: `${fN(ra.risingCount)} naik, ${fN(ra.newCount)} baru`, color: "gray" },
            ].map((kpi) => {
              const cls: Record<string, string> = {
                blue: "border-blue-200 bg-blue-50", purple: "border-purple-200 bg-purple-50",
                green: "border-green-200 bg-green-50", emerald: "border-emerald-200 bg-emerald-50",
                indigo: "border-indigo-200 bg-indigo-50", gray: "border-gray-200 bg-gray-50",
              };
              return (
                <div key={kpi.label} className={`rounded-xl border p-3 ${cls[kpi.color] || cls.gray} hover:shadow-md transition-shadow`}>
                  <div className="flex items-center gap-1.5 text-gray-500 mb-1">
                    {kpi.icon}
                    <span className="text-[10px] font-medium">{kpi.label}</span>
                  </div>
                  <p className="text-xl font-bold text-gray-900">{kpi.value}</p>
                  <p className="text-[10px] text-gray-400">{kpi.sub}</p>
                </div>
              );
            })}
          </div>

          {/* Tier Health Matrix */}
          {Object.keys(ra.tierDistribution).length > 0 && (
            <div className="bg-white rounded-xl border p-5">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-indigo-600" /> Kesehatan per Tier
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {['Mega', 'Macro', 'Mid', 'Micro', 'Nano'].filter(t => ra.tierDistribution[t]).map(tier => {
                  const d = ra.tierDistribution[tier];
                  const healthPct = d.total > 0 ? ((d.total - d.declining - d.lost) / d.total) * 100 : 0;
                  return (
                    <div key={tier} className={`rounded-lg border p-3 ${TIER_COLORS[tier]} bg-opacity-30`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${TIER_COLORS[tier]}`}>{tier}</span>
                        <span className="text-lg font-bold text-gray-800">{d.total}</span>
                      </div>
                      <div className="flex gap-1 mt-2 text-[10px]">
                        {d.rising > 0 && <span className="px-1 py-0 rounded bg-green-100 text-green-700">↑{d.rising}</span>}
                        {d.declining > 0 && <span className="px-1 py-0 rounded bg-yellow-100 text-yellow-700">↓{d.declining}</span>}
                        {d.lost > 0 && <span className="px-1 py-0 rounded bg-red-100 text-red-700">✕{d.lost}</span>}
                      </div>
                      <div className="w-full h-1.5 bg-gray-200 rounded-full mt-2 overflow-hidden">
                        <div className={`h-full rounded-full ${healthPct >= 70 ? 'bg-green-500' : healthPct >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                          style={{ width: `${healthPct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Top Growers + Top Decliners + Comebacks side by side */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {ra.topGrowers.length > 0 && (
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200/60 p-4">
                <h4 className="font-semibold text-green-800 mb-3 flex items-center gap-2 text-sm">
                  <TrendingUp className="w-4 h-4" /> Top Pertumbuhan 🚀
                </h4>
                <div className="space-y-1.5">
                  {ra.topGrowers.slice(0, 5).map((c, i) => (
                    <div key={`grow-${c.username}`} className="flex items-center justify-between text-xs bg-white/80 rounded-lg px-2.5 py-2 border border-green-100">
                      <div className="flex items-center gap-2">
                        <span className="text-green-600 font-bold w-4">{i + 1}.</span>
                        <button onClick={() => onDrillDown(c.username)} className="text-gray-800 font-medium hover:text-blue-600 hover:underline">@{c.username}</button>
                        <span className={`text-[9px] px-1 rounded ${TIER_COLORS[c.tier]}`}>{c.tier}</span>
                      </div>
                      <span className="font-bold text-green-600">+{c.changePct.toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {ra.topDecliners.length > 0 && (
              <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-xl border border-red-200/60 p-4">
                <h4 className="font-semibold text-red-800 mb-3 flex items-center gap-2 text-sm">
                  <TrendingDown className="w-4 h-4" /> Penurunan Terbesar 📉
                </h4>
                <div className="space-y-1.5">
                  {ra.topDecliners.slice(0, 5).map((c, i) => (
                    <div key={`dec-${c.username}`} className="flex items-center justify-between text-xs bg-white/80 rounded-lg px-2.5 py-2 border border-red-100">
                      <div className="flex items-center gap-2">
                        <span className="text-red-600 font-bold w-4">{i + 1}.</span>
                        <button onClick={() => onDrillDown(c.username)} className="text-gray-800 font-medium hover:text-blue-600 hover:underline">@{c.username}</button>
                      </div>
                      <span className="font-bold text-red-600">{fRp(c.change)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {ra.comebackCreators.length > 0 ? (
              <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl border border-purple-200/60 p-4">
                <h4 className="font-semibold text-purple-800 mb-3 flex items-center gap-2 text-sm">
                  <Award className="w-4 h-4" /> Comeback! 🎉
                </h4>
                <div className="space-y-1.5">
                  {ra.comebackCreators.slice(0, 5).map(c => (
                    <div key={`cb-${c.username}`} className="flex items-center justify-between text-xs bg-white/80 rounded-lg px-2.5 py-2 border border-purple-100">
                      <button onClick={() => onDrillDown(c.username)} className="text-gray-800 font-medium hover:text-blue-600 hover:underline">@{c.username}</button>
                      <span className="font-bold text-purple-600">{fRp(c.currGMV)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200/60 p-4">
                <h4 className="font-semibold text-blue-800 mb-3 flex items-center gap-2 text-sm">
                  <Star className="w-4 h-4" /> Kreator Loyal 💎
                </h4>
                <div className="text-center py-3">
                  <p className="text-3xl font-bold text-blue-700">{fN(ra.consistentCount)}</p>
                  <p className="text-xs text-blue-600 mt-1">aktif di SEMUA {ra.periods.length} periode</p>
                </div>
              </div>
            )}
          </div>

          {/* Retention Rate Table */}
          {ra.monthStats.length > 0 && (
            <div className="bg-white rounded-xl border p-5">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-600" /> Retention Rate & Churn per Bulan
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
                      <th className="pb-2 font-medium text-right">Total GMV</th>
                      <th className="pb-2 font-medium text-right">Avg/Kreator</th>
                      <th className="pb-2 font-medium w-32">Bar</th>
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
                        <td className="py-2.5 text-right text-gray-700">{fRp(m.totalGMV)}</td>
                        <td className="py-2.5 text-right text-gray-500 text-xs">{fRp(m.avgGMVPerCreator)}</td>
                        <td className="py-2.5">
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${m.retentionRate >= 70 ? 'bg-green-500' : m.retentionRate >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                              style={{ width: `${m.retentionRate}%` }} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Recommendations */}
          {ra.needFollowUp.length > 0 && (
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200/60 p-5">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-600" /> Rekomendasi Aksi
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {(() => {
                  const recs: { icon: string; text: string; type: 'danger' | 'warning' | 'info' }[] = [];
                  if (ra.criticalCount > 0) {
                    const totalLostGMV = ra.items.filter(i => i.severity === 'kritis').reduce((a, i) => a + i.prevGMV, 0);
                    recs.push({ icon: '🔴', text: `${fN(ra.criticalCount)} kreator HILANG (potensi ${fRp(totalLostGMV)}). Prioritas utama follow-up!`, type: 'danger' });
                  }
                  if (ra.warningCount > 0) recs.push({ icon: '🟠', text: `${fN(ra.warningCount)} kreator turun >50%. Jadwalkan diskusi personal.`, type: 'warning' });
                  const consecutiveList = ra.needFollowUp.filter(i => i.consecutiveDecline);
                  if (consecutiveList.length > 0) recs.push({ icon: '📉', text: `${fN(consecutiveList.length)} turun 2 bulan berturut: ${consecutiveList.slice(0, 3).map(c => '@' + c.username).join(', ')}. Kirim sampel baru!`, type: 'warning' });
                  if (ra.comebackCreators.length > 0) recs.push({ icon: '🎉', text: `${fN(ra.comebackCreators.length)} kreator comeback! Apresiasi mereka.`, type: 'info' });
                  const avgRet = ra.monthStats.length > 0 ? ra.monthStats.reduce((a, m) => a + m.retentionRate, 0) / ra.monthStats.length : 0;
                  if (avgRet < 50) recs.push({ icon: '⚠️', text: `Retention ${fP(avgRet)} — sangat rendah! Evaluasi menyeluruh diperlukan.`, type: 'danger' });
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
        </div>
      )}

      {/* ═══ TAB: FOLLOW-UP ═══ */}
      {subTab === 'followup' && (
        <div className="space-y-4">
          {/* Header + Actions */}
          <div className="bg-gradient-to-br from-red-50 via-orange-50 to-amber-50 rounded-xl border border-red-200/60 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <h3 className="font-bold text-gray-800 flex items-center gap-2 text-base">
                <ShieldAlert className="w-5 h-5 text-red-600" />
                🚨 Daftar Follow-Up — {fN(filteredItems.length)} Kreator
              </h3>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleCopyFollowUp}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    copied ? 'bg-green-100 border-green-300 text-green-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-blue-50 hover:text-blue-700'
                  }`}
                >
                  {copied ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Tercopy!' : 'Copy Semua'}
                </button>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Cari kreator..." className="border rounded-lg pl-8 pr-3 py-1.5 text-xs w-44 focus:ring-2 focus:ring-red-300 bg-white/80" />
                  {search && <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2"><X className="w-3 h-3 text-gray-400" /></button>}
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              {[
                { key: 'all', label: `Semua (${ra.needFollowUp.length})`, cls: 'bg-gray-100 text-gray-700 border-gray-200' },
                { key: 'kritis', label: `🔴 Hilang (${ra.criticalCount})`, cls: SEV_CONFIG.kritis.badge },
                { key: 'peringatan', label: `🟠 Drastis (${ra.warningCount})`, cls: SEV_CONFIG.peringatan.badge },
                { key: 'perhatian', label: `🟡 Turun (${ra.attentionCount})`, cls: SEV_CONFIG.perhatian.badge },
                { key: 'monitor', label: `🔵 Berturut (${ra.monitorCount})`, cls: SEV_CONFIG.monitor.badge },
              ].map(btn => (
                <button key={btn.key} onClick={() => setFilter(btn.key)}
                  className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-all ${
                    filter === btn.key ? `${btn.cls} ring-2 ring-offset-1 ring-gray-300 shadow-sm` : `${btn.cls} opacity-60 hover:opacity-100`
                  }`}>{btn.label}</button>
              ))}
              <span className="border-l mx-1" />
              <select value={tierFilter} onChange={e => setTierFilter(e.target.value)}
                className="text-xs px-2 py-1 rounded-full border bg-white text-gray-600">
                <option value="all">Semua Tier</option>
                {uniqueTiers.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* Follow-up items */}
            <div className="space-y-2">
              {(showAllFollowUp ? filteredItems : filteredItems.slice(0, 15)).map((item, idx) => {
                const sev = SEV_CONFIG[item.severity];
                const action = ACTION_CONFIG[item.actionType];
                return (
                  <div key={`fu-${item.username}-${idx}`} className={`bg-white rounded-lg border ${sev.cardBorder} border-l-4 p-3 hover:shadow-md transition-all group`}>
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                        <span className="text-lg">{sev.icon}</span>
                        <RiskBadge score={item.riskScore} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button onClick={() => onDrillDown(item.username)} className="font-semibold text-gray-900 text-sm hover:text-blue-600 hover:underline">@{item.username}</button>
                          <span className={`text-[10px] px-1.5 py-0 rounded ${TIER_COLORS[item.tier]}`}>{item.tier}</span>
                          {item.followers > 0 && <span className="text-[10px] text-gray-400">{fN(item.followers)} followers</span>}
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${sev.badge}`}>{sev.label}</span>
                          {item.consecutiveDecline && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">📉 Berturut</span>}
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
                          }`}>{item.changePct.toFixed(0)}%</span>
                          <MiniSparkline values={item.sparklineGMVs} highlightLast />

                          {/* Order & Video changes */}
                          {(item.prevOrders > 0 || item.currOrders > 0) && (
                            <span className="text-[10px] text-gray-400">
                              📦 {item.prevOrders}→{item.currOrders}
                            </span>
                          )}
                          {(item.prevVideos > 0 || item.currVideos > 0) && (
                            <span className="text-[10px] text-gray-400">
                              🎬 {item.prevVideos}→{item.currVideos}
                            </span>
                          )}
                        </div>

                        {item.recommendation && (
                          <div className="flex items-start gap-2 mt-1.5 bg-gray-50 rounded px-2 py-1.5 border border-gray-100">
                            <span className={`shrink-0 flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-medium ${action.color}`}>
                              {action.icon} {action.label}
                            </span>
                            <p className="text-xs text-gray-600">{item.recommendation}</p>
                          </div>
                        )}
                      </div>
                      <button onClick={() => onDrillDown(item.username)}
                        className="text-xs px-2.5 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors shrink-0 font-medium opacity-0 group-hover:opacity-100">
                        Detail →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredItems.length > 15 && (
              <button onClick={() => setShowAllFollowUp(!showAllFollowUp)}
                className="mt-3 text-sm text-red-600 hover:text-red-700 font-medium flex items-center gap-1">
                {showAllFollowUp ? <><ChevronUp className="w-4 h-4" /> Tampilkan lebih sedikit</> : <><ChevronDown className="w-4 h-4" /> Tampilkan semua {fN(filteredItems.length)} kreator</>}
              </button>
            )}
            {filteredItems.length === 0 && <p className="text-sm text-gray-400 text-center py-6">Tidak ada kreator yang memenuhi filter saat ini.</p>}
          </div>
        </div>
      )}

      {/* ═══ TAB: COMPARISON (ALL CREATORS) ═══ */}
      {subTab === 'comparison' && (
        <div className="bg-white rounded-xl border p-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              Semua Kreator: {ra.prevPeriod} → {ra.latestPeriod}
            </h3>
            <div className="flex items-center gap-2">
              <select value={tierFilter} onChange={e => setTierFilter(e.target.value)}
                className="text-xs px-2 py-1 rounded-lg border bg-white text-gray-600">
                <option value="all">Semua Tier</option>
                {uniqueTiers.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Cari..." className="border rounded-lg pl-8 pr-3 py-1.5 text-xs w-36 focus:ring-2 focus:ring-blue-300" />
              </div>
              <span className="text-xs text-gray-400">{fN(comparisonItems.length)} kreator</span>
            </div>
          </div>
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white z-10">
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-2 pr-2 font-medium w-8">#</th>
                  <th className="pb-2 pr-3 font-medium">Kreator</th>
                  <th className="pb-2 font-medium text-center w-16">Risk</th>
                  <th className="pb-2 font-medium text-center w-14">Trend</th>
                  {[
                    { key: 'prevGMV' as const, label: ra.prevPeriod },
                    { key: 'currGMV' as const, label: ra.latestPeriod },
                    { key: 'change' as const, label: 'Selisih' },
                    { key: 'changePct' as const, label: '%' },
                  ].map(col => (
                    <th key={col.key}
                      className="pb-2 font-medium text-right cursor-pointer hover:text-blue-600 select-none"
                      onClick={() => { setCompSort(col.key); setCompSortAsc(compSort === col.key ? !compSortAsc : false); }}>
                      {col.label} {compSort === col.key && (compSortAsc ? '↑' : '↓')}
                    </th>
                  ))}
                  <th className="pb-2 font-medium text-center">Status</th>
                  <th className="pb-2 font-medium text-center">Aksi</th>
                  <th className="pb-2 font-medium text-center w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {comparisonItems.slice(0, 150).map((item, i) => {
                  const sev = SEV_CONFIG[item.severity];
                  const action = ACTION_CONFIG[item.actionType];
                  return (
                    <tr key={`comp-${item.username}-${i}`} className={`hover:bg-gray-50 transition-colors ${item.riskScore >= 80 ? 'bg-red-50/30' : ''}`}>
                      <td className="py-2 pr-2 text-xs text-gray-400 font-bold">{i + 1}</td>
                      <td className="py-2 pr-3">
                        <button onClick={() => onDrillDown(item.username)} className="font-medium text-gray-900 hover:text-blue-600 hover:underline">@{item.username}</button>
                        <span className={`ml-1.5 text-[10px] px-1.5 py-0 rounded ${TIER_COLORS[item.tier]}`}>{item.tier}</span>
                      </td>
                      <td className="py-2 text-center"><RiskBadge score={item.riskScore} /></td>
                      <td className="py-2 text-center"><MiniSparkline values={item.sparklineGMVs} width={45} height={16} /></td>
                      <td className="py-2 text-right text-gray-600">{item.prevGMV > 0 ? fRp(item.prevGMV) : <span className="text-gray-300">—</span>}</td>
                      <td className={`py-2 text-right font-medium ${item.currGMV > 0 ? 'text-blue-600' : 'text-gray-300'}`}>
                        {item.currGMV > 0 ? fRp(item.currGMV) : '—'}
                      </td>
                      <td className={`py-2 text-right font-medium ${item.change > 0 ? 'text-green-600' : item.change < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                        {item.change !== 0 ? `${item.change > 0 ? '+' : ''}${fRp(item.change)}` : '—'}
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
                        <span className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded font-medium ${action.color}`}>
                          {action.icon}
                        </span>
                      </td>
                      <td className="py-2 text-center">
                        <button onClick={() => onDrillDown(item.username)} className="text-[10px] px-2 py-1 rounded bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-700">Detail</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {comparisonItems.length > 150 && <p className="text-xs text-gray-400 text-center mt-2">Menampilkan 150 dari {fN(comparisonItems.length)} kreator.</p>}
        </div>
      )}

      {/* ═══ TAB: HEATMAP ═══ */}
      {subTab === 'heatmap' && ra.heatmapCreators.length > 0 && (
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-semibold text-gray-800 mb-1 flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-600" /> Heatmap Aktivitas Kreator
          </h3>
          <p className="text-xs text-gray-400 mb-4">
            Warna = GMV. Semakin gelap hijau = omset semakin besar. Abu = tidak aktif. Hover untuk nominal. Top {ra.heatmapCreators.length} kreator.
          </p>
          <div className="overflow-x-auto">
            <table className="text-xs w-full">
              <thead>
                <tr className="border-b">
                  <th className="pb-2 text-left font-medium text-gray-600 min-w-[140px] pr-3">Kreator</th>
                  <th className="pb-2 font-medium text-center text-gray-500 w-10">Tier</th>
                  <th className="pb-2 font-medium text-center text-gray-500 w-12">Aktif</th>
                  {ra.periods.map(p => (
                    <th key={p} className="pb-2 font-medium text-center text-gray-400 px-0.5 whitespace-nowrap">{p.replace(/\s.*/, '')}</th>
                  ))}
                  <th className="pb-2 font-medium text-right text-gray-500 pl-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {ra.heatmapCreators.map(({ username, tier, totalActive, totalGMV }) => {
                  const acts = ra.activityMap[username] || {};
                  return (
                    <tr key={`hm-${username}`} className="border-b hover:bg-gray-50">
                      <td className="py-1.5 pr-3 font-medium text-gray-800 truncate max-w-[140px]">
                        <button onClick={() => onDrillDown(username)} className="hover:text-blue-600 hover:underline text-left">@{username}</button>
                      </td>
                      <td className="py-1.5 text-center">
                        <span className={`text-[9px] px-1 rounded ${TIER_COLORS[tier]}`}>{tier}</span>
                      </td>
                      <td className="py-1.5 text-center">
                        <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                          totalActive === ra.sorted.length ? 'bg-green-100 text-green-700'
                          : totalActive >= ra.sorted.length * 0.7 ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-600'
                        }`}>{totalActive}/{ra.sorted.length}</span>
                      </td>
                      {ra.sorted.map((_, pi) => {
                        const gmv = acts[pi] || 0;
                        const intensity = gmv > 0 ? Math.max(0.15, Math.min(1, gmv / ra.maxGMVInHeatmap)) : 0;
                        const bgColor = gmv > 0 ? `rgba(34, 197, 94, ${intensity})` : '#f3f4f6';
                        return (
                          <td key={pi} className="py-1.5 px-0.5 text-center">
                            <div className="w-5 h-5 rounded mx-auto cursor-default" style={{ backgroundColor: bgColor }}
                              title={gmv > 0 ? `${fRp(gmv)}` : 'Tidak aktif'} />
                          </td>
                        );
                      })}
                      <td className="py-1.5 text-right pl-2 font-medium text-gray-700 text-[10px]">{fRp(totalGMV)}</td>
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
