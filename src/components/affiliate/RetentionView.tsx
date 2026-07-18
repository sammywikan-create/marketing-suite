"use client";
import React, { useState, useMemo, useEffect, useCallback } from "react";
import type { AffiliateMonthData, AffiliateCreatorItem } from "@/lib/types";
import { loadAffiliateCreators } from "@/lib/db";
import {
  Activity, Search, TrendingUp, ChevronDown, ChevronUp,
  DollarSign, PieChart, ArrowDownRight, ArrowUpRight, Star, X, UserMinus,
  Award, RefreshCw, Heart, ShieldAlert, Lightbulb, BarChart3, Loader2,
  Eye, Phone, Gift, MessageSquare, AlertTriangle, CheckCircle, Copy,
  Users, Flame, Crown, TrendingDown, Percent, Calendar, Download,
  Target, Zap, Clock, Layers, RotateCcw, Sprout, Skull,
  Mail, FileDown, ArrowRight, Shield, CircleDot, Gauge
} from "lucide-react";

// ═══════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════
type AffiliateMonthDataWithStore = AffiliateMonthData & { _storeName: string };
type RetentionSeverity = 'kritis' | 'peringatan' | 'perhatian' | 'monitor' | 'naik' | 'baru' | 'stabil';
type SubTab = 'overview' | 'followup' | 'comparison' | 'heatmap' | 'cohort' | 'lifecycle' | 'winback';
type LifecycleStage = 'onboarding' | 'growth' | 'mature' | 'at_risk' | 'dormant' | 'churned';
type WinBackStatus = 'pending' | 'contacted' | 'success' | 'failed';

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
  totalHistoricGMV: number;
  activeMonths: number;
  lifecycleStage: LifecycleStage;
  priorityScore: number;
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
  churnRate: number;
  netMovement: number;
}

interface CohortRow {
  cohortPeriod: string;
  startCount: number;
  retention: number[]; // percentage retained at each subsequent period
  counts: number[]; // absolute counts retained
}

interface LifecycleGroup {
  stage: LifecycleStage;
  items: RetentionItem[];
  totalGMV: number;
  avgGMV: number;
  avgOrders: number;
  avgVideos: number;
}

interface WinBackItem extends RetentionItem {
  winBackScore: number;
  winBackStatus: WinBackStatus;
  suggestedAction: string;
  suggestedMessage: string;
  estimatedRecoveryGMV: number;
  monthsSinceActive: number;
  peakGMV: number;
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

const LIFECYCLE_CONFIG: Record<LifecycleStage, { label: string; icon: React.ReactNode; color: string; bg: string; border: string; emoji: string; description: string; strategy: string }> = {
  onboarding: {
    label: 'Onboarding', icon: <Sprout className="w-4 h-4" />, color: 'text-emerald-700', bg: 'bg-emerald-50',
    border: 'border-emerald-200', emoji: '🌱', description: 'Kreator baru yang baru bergabung 1 bulan',
    strategy: 'Kirim welcome kit, produk sampel, dan panduan konten. Berikan perhatian ekstra di bulan pertama untuk membangun kebiasaan.'
  },
  growth: {
    label: 'Growth', icon: <TrendingUp className="w-4 h-4" />, color: 'text-blue-700', bg: 'bg-blue-50',
    border: 'border-blue-200', emoji: '📈', description: 'Kreator yang GMV-nya naik konsisten',
    strategy: 'Berikan exclusive deal, tingkatkan komisi, dan ajak kolaborasi konten premium untuk akselerasi pertumbuhan.'
  },
  mature: {
    label: 'Mature', icon: <Star className="w-4 h-4" />, color: 'text-amber-700', bg: 'bg-amber-50',
    border: 'border-amber-200', emoji: '⭐', description: 'Kreator konsisten aktif ≥3 bulan',
    strategy: 'Jaga hubungan baik, berikan reward loyalty, akses produk baru lebih awal, dan libatkan dalam campaign khusus.'
  },
  at_risk: {
    label: 'At Risk', icon: <ShieldAlert className="w-4 h-4" />, color: 'text-orange-700', bg: 'bg-orange-50',
    border: 'border-orange-200', emoji: '⚠️', description: 'Kreator mature yang mulai menurun',
    strategy: 'Segera hubungi, cari tahu kendala, tawarkan insentif khusus, dan evaluasi apakah perlu ganti strategi produk.'
  },
  dormant: {
    label: 'Dormant', icon: <Clock className="w-4 h-4" />, color: 'text-gray-600', bg: 'bg-gray-50',
    border: 'border-gray-300', emoji: '😴', description: 'Tidak aktif bulan terakhir tapi pernah aktif',
    strategy: 'Kirim re-engagement message, tawarkan comeback bonus atau produk baru yang relevan dengan niche mereka.'
  },
  churned: {
    label: 'Churned', icon: <Skull className="w-4 h-4" />, color: 'text-red-700', bg: 'bg-red-50',
    border: 'border-red-200', emoji: '💀', description: '2+ bulan tidak aktif',
    strategy: 'Evaluasi apakah masih worth pursuing. Jika ya, kirim win-back offer agresif. Jika tidak, fokus ke kreator baru.'
  },
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
// RETENTION TREND LINE CHART (SVG)
// ═══════════════════════════════════════════════════════
function RetentionTrendChart({ monthStats }: { monthStats: MonthStat[] }) {
  if (monthStats.length < 2) return null;
  const W = 400, H = 120, PX = 40, PY = 20;
  const cW = W - PX * 2, cH = H - PY * 2;
  const maxRate = 100;
  const points = monthStats.map((m, i) => ({
    x: PX + (i / (monthStats.length - 1)) * cW,
    y: PY + cH - (m.retentionRate / maxRate) * cH,
    rate: m.retentionRate,
    period: m.period,
  }));
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD = `${pathD} L ${points[points.length - 1].x} ${PY + cH} L ${points[0].x} ${PY + cH} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
      {/* Grid */}
      {[0, 25, 50, 75, 100].map(v => {
        const y = PY + cH - (v / maxRate) * cH;
        return (
          <g key={v}>
            <line x1={PX} y1={y} x2={W - PX} y2={y} stroke="#e5e7eb" strokeWidth="0.5" strokeDasharray={v === 0 ? '' : '3,3'} />
            <text x={PX - 5} y={y + 3} textAnchor="end" className="fill-gray-400" fontSize="8">{v}%</text>
          </g>
        );
      })}
      {/* Area */}
      <path d={areaD} fill="url(#retGrad)" opacity="0.3" />
      <defs>
        <linearGradient id="retGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Line */}
      <path d={pathD} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinejoin="round" />
      {/* Dots + Labels */}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="3.5" fill="white" stroke="#3b82f6" strokeWidth="2" />
          <text x={p.x} y={p.y - 8} textAnchor="middle" className="fill-blue-600 font-bold" fontSize="8">{p.rate.toFixed(0)}%</text>
          <text x={p.x} y={PY + cH + 12} textAnchor="middle" className="fill-gray-400" fontSize="7">{p.period.replace(/\s.*/, '').slice(5)}</text>
        </g>
      ))}
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
// CONCENTRATION RISK GAUGE
// ═══════════════════════════════════════════════════════
function ConcentrationGauge({ topNPct, n }: { topNPct: number; n: number }) {
  const risk = topNPct >= 80 ? 'SANGAT TINGGI' : topNPct >= 60 ? 'TINGGI' : topNPct >= 40 ? 'SEDANG' : 'RENDAH';
  const riskColor = topNPct >= 80 ? 'text-red-600' : topNPct >= 60 ? 'text-orange-600' : topNPct >= 40 ? 'text-yellow-600' : 'text-green-600';
  const barColor = topNPct >= 80 ? 'bg-red-500' : topNPct >= 60 ? 'bg-orange-500' : topNPct >= 40 ? 'bg-yellow-500' : 'bg-green-500';
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500">Top {n} kreator</span>
        <span className={`font-bold ${riskColor}`}>{topNPct.toFixed(1)}%</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${topNPct}%` }} />
      </div>
      <span className={`text-[9px] font-bold ${riskColor}`}>{risk}</span>
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
  const [lifecycleExpanded, setLifecycleExpanded] = useState<LifecycleStage | null>(null);
  const [winBackStatuses, setWinBackStatuses] = useState<Record<string, WinBackStatus>>({});
  const [winBackFilter, setWinBackFilter] = useState<'all' | WinBackStatus>('all');
  const [copiedMessage, setCopiedMessage] = useState<string | null>(null);

  // ── ENRICH: Load creators from Supabase per period ──
  // Always load from Supabase to ensure complete creator data per period.
  // Local embedded creators may be truncated or incomplete (Supabase default 1000 row limit).
  useEffect(() => {
    // Use allMonths (unfiltered) so we always have ALL periods for retention analysis
    const sourceData = allMonths && allMonths.length > 0 ? allMonths : filteredData;
    if (sourceData.length < 2) return;

    let cancelled = false;
    async function loadPerPeriod() {
      setLoadingCreators(true);
      try {
        const periodMap: Record<string, { storeId: string; platform?: string }[]> = {};
        sourceData.forEach(d => {
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
            // Deduplicate creators by username within the same period
            const flat = allCreators.flat();
            const deduped = new Map<string, AffiliateCreatorItem>();
            flat.forEach(c => {
              const existing = deduped.get(c.creatorUsername);
              if (!existing || c.affiliateGMV > existing.affiliateGMV) {
                deduped.set(c.creatorUsername, c);
              }
            });
            result[period] = Array.from(deduped.values());
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
  // Use allMonths (unfiltered, all periods) as primary source for retention analysis.
  // Merge in Supabase-loaded creators which may have more complete data than embedded ones.
  const enrichedData = useMemo(() => {
    // Use allMonths if available (contains all periods regardless of selectedPeriod filter)
    const sourceData = allMonths && allMonths.length > 0 ? allMonths : filteredData;

    // Deduplicate periods: in combined mode, allMonths may have multiple entries per period (one per store).
    // We need to merge them into one entry per period with combined creators.
    const periodMap = new Map<string, AffiliateMonthDataWithStore>();
    sourceData.forEach(d => {
      const key = `${d.periodRaw}__${d.platform || 'tiktok'}`;
      if (!periodMap.has(key)) {
        periodMap.set(key, { ...d, creators: [...d.creators] });
      } else {
        const existing = periodMap.get(key)!;
        existing.creators = [...existing.creators, ...d.creators];
      }
    });

    return Array.from(periodMap.values()).map(d => {
      const periodKey = d.periodRaw.split(" ~ ")[0]?.slice(0, 7) || d.periodRaw;
      const supaCreators = perPeriodCreators[periodKey];

      // Prefer Supabase data when available (it's paginated now and complete).
      // Otherwise fallback to embedded local creators.
      let creators = d.creators;
      if (supaCreators && supaCreators.length > 0) {
        // Merge: start with Supabase, add any local-only creators
        const supaMap = new Map(supaCreators.map(c => [c.creatorUsername, c]));
        const localOnly = creators.filter(c => !supaMap.has(c.creatorUsername));
        creators = [...supaCreators, ...localOnly];
      }

      // Deduplicate by username (keep highest GMV)
      const deduped = new Map<string, AffiliateCreatorItem>();
      creators.forEach(c => {
        const existing = deduped.get(c.creatorUsername);
        if (!existing || c.affiliateGMV > existing.affiliateGMV) {
          deduped.set(c.creatorUsername, c);
        }
      });

      return { ...d, creators: Array.from(deduped.values()) };
    });
  }, [filteredData, allMonths, perPeriodCreators]);

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

    // Sparklines & historic GMV + active months per creator
    const sparklines: Record<string, number[]> = {};
    const historicGMV: Record<string, number> = {};
    const activeMonthsMap: Record<string, number> = {};
    const firstActiveMonth: Record<string, number> = {};
    sorted.forEach((d, pi) => {
      const gmvLookup = new Map(d.creators.map(c => [c.creatorUsername, c.affiliateGMV]));
      relevantUsernames.forEach(u => {
        if (!sparklines[u]) sparklines[u] = [];
        const gmv = gmvLookup.get(u) || 0;
        sparklines[u].push(gmv);
        historicGMV[u] = (historicGMV[u] || 0) + gmv;
        if (gmv > 0) {
          activeMonthsMap[u] = (activeMonthsMap[u] || 0) + 1;
          if (firstActiveMonth[u] === undefined) firstActiveMonth[u] = pi;
        }
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

      // Lifecycle stage
      const aMths = activeMonthsMap[username] || 0;
      const isActiveLatest = currGMV > 0;
      const isActivePrev = pGMV > 0;
      let lifecycleStage: LifecycleStage;
      if (!isActiveLatest && daysSinceLastActive >= 60) {
        lifecycleStage = 'churned';
      } else if (!isActiveLatest && isActivePrev) {
        lifecycleStage = 'dormant';
      } else if (isActiveLatest && aMths === 1) {
        lifecycleStage = 'onboarding';
      } else if (isActiveLatest && aMths >= 2 && changePct > 0 && pGMV > 0) {
        lifecycleStage = 'growth';
      } else if (isActiveLatest && aMths >= 3 && changePct >= -10) {
        lifecycleStage = 'mature';
      } else if (isActiveLatest && aMths >= 2 && changePct < -10) {
        lifecycleStage = 'at_risk';
      } else if (isActiveLatest) {
        lifecycleStage = aMths >= 3 ? 'mature' : 'onboarding';
      } else {
        lifecycleStage = 'dormant';
      }

      // Enhanced priority score (0-100): considers historic GMV, tier, active months, trend
      const tierWeight: Record<string, number> = { Mega: 25, Macro: 20, Mid: 15, Micro: 10, Nano: 5, Unknown: 3 };
      const historicW = Math.min(30, (historicGMV[username] || 0) / 500000);
      const activeW = Math.min(20, aMths * 5);
      const tierW = tierWeight[(curr || prevC)?.creatorTier || 'Unknown'] || 3;
      const trendW = changePct < -50 ? 25 : changePct < -20 ? 15 : changePct < 0 ? 8 : 0;
      const priorityScore = Math.min(100, Math.round(historicW + activeW + tierW + trendW));

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
        totalHistoricGMV: historicGMV[username] || 0,
        activeMonths: aMths,
        lifecycleStage,
        priorityScore,
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

    // Month stats (enhanced with churnRate and netMovement)
    const monthStats: MonthStat[] = sorted.map((d, pi) => {
      if (pi === 0) return null;
      const prevActive = new Set(sorted[pi - 1].creators.filter(c => c.affiliateGMV > 0).map(c => c.creatorUsername));
      const currActive = new Set(d.creators.filter(c => c.affiliateGMV > 0).map(c => c.creatorUsername));
      const retained = [...prevActive].filter(u => currActive.has(u)).length;
      const churned = [...prevActive].filter(u => !currActive.has(u)).length;
      const newOnes = [...currActive].filter(u => !prevActive.has(u)).length;
      const retentionRate = prevActive.size > 0 ? (retained / prevActive.size) * 100 : 0;
      const churnRate = prevActive.size > 0 ? (churned / prevActive.size) * 100 : 0;
      const netMovement = newOnes - churned;
      const totalGMV = d.creators.filter(c => c.affiliateGMV > 0).reduce((a, c) => a + c.affiliateGMV, 0);
      const avgGMVPerCreator = currActive.size > 0 ? totalGMV / currActive.size : 0;
      return { period: periods[pi], retained, churned, newOnes, retentionRate, total: currActive.size, totalGMV, avgGMVPerCreator, churnRate, netMovement };
    }).filter(Boolean) as MonthStat[];

    // Churn velocity (trend of churn rates)
    const churnRates = monthStats.map(m => m.churnRate);
    let churnVelocity: 'accelerating' | 'decelerating' | 'stable' | 'na' = 'na';
    if (churnRates.length >= 2) {
      const lastChurn = churnRates[churnRates.length - 1];
      const prevChurn = churnRates[churnRates.length - 2];
      if (lastChurn > prevChurn + 5) churnVelocity = 'accelerating';
      else if (lastChurn < prevChurn - 5) churnVelocity = 'decelerating';
      else churnVelocity = 'stable';
    }

    // GMV Concentration Risk
    const activeItems = items.filter(i => i.currGMV > 0).sort((a, b) => b.currGMV - a.currGMV);
    const totalActiveGMV = activeItems.reduce((a, i) => a + i.currGMV, 0);
    const top5GMV = activeItems.slice(0, 5).reduce((a, i) => a + i.currGMV, 0);
    const top10GMV = activeItems.slice(0, 10).reduce((a, i) => a + i.currGMV, 0);
    const top20GMV = activeItems.slice(0, 20).reduce((a, i) => a + i.currGMV, 0);
    const top5Pct = totalActiveGMV > 0 ? (top5GMV / totalActiveGMV) * 100 : 0;
    const top10Pct = totalActiveGMV > 0 ? (top10GMV / totalActiveGMV) * 100 : 0;
    const top20Pct = totalActiveGMV > 0 ? (top20GMV / totalActiveGMV) * 100 : 0;

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

    // ── COHORT ANALYSIS ──
    const cohortRows: CohortRow[] = [];
    // For each period, identify creators who appeared for the first time
    const allCreatorFirstPeriod: Record<string, number> = {};
    sorted.forEach((d, pi) => {
      d.creators.forEach(c => {
        if (c.affiliateGMV > 0 && allCreatorFirstPeriod[c.creatorUsername] === undefined) {
          allCreatorFirstPeriod[c.creatorUsername] = pi;
        }
      });
    });
    // Build cohort for each period except the last (need at least 1 subsequent period)
    for (let cohortIdx = 0; cohortIdx < sorted.length - 1; cohortIdx++) {
      const cohortMembers = Object.entries(allCreatorFirstPeriod)
        .filter(([, pi]) => pi === cohortIdx)
        .map(([u]) => u);
      if (cohortMembers.length === 0) continue;

      const retention: number[] = [];
      const counts: number[] = [];
      for (let nextIdx = cohortIdx + 1; nextIdx < sorted.length; nextIdx++) {
        const activeInPeriod = new Set(
          sorted[nextIdx].creators.filter(c => c.affiliateGMV > 0).map(c => c.creatorUsername)
        );
        const retainedCount = cohortMembers.filter(u => activeInPeriod.has(u)).length;
        const retPct = (retainedCount / cohortMembers.length) * 100;
        retention.push(retPct);
        counts.push(retainedCount);
      }
      cohortRows.push({
        cohortPeriod: periods[cohortIdx],
        startCount: cohortMembers.length,
        retention,
        counts,
      });
    }

    // ── LIFECYCLE GROUPS ──
    const lifecycleGroups: Record<LifecycleStage, LifecycleGroup> = {
      onboarding: { stage: 'onboarding', items: [], totalGMV: 0, avgGMV: 0, avgOrders: 0, avgVideos: 0 },
      growth: { stage: 'growth', items: [], totalGMV: 0, avgGMV: 0, avgOrders: 0, avgVideos: 0 },
      mature: { stage: 'mature', items: [], totalGMV: 0, avgGMV: 0, avgOrders: 0, avgVideos: 0 },
      at_risk: { stage: 'at_risk', items: [], totalGMV: 0, avgGMV: 0, avgOrders: 0, avgVideos: 0 },
      dormant: { stage: 'dormant', items: [], totalGMV: 0, avgGMV: 0, avgOrders: 0, avgVideos: 0 },
      churned: { stage: 'churned', items: [], totalGMV: 0, avgGMV: 0, avgOrders: 0, avgVideos: 0 },
    };
    items.forEach(item => {
      const g = lifecycleGroups[item.lifecycleStage];
      g.items.push(item);
      g.totalGMV += item.currGMV || item.prevGMV;
    });
    (Object.values(lifecycleGroups) as LifecycleGroup[]).forEach(g => {
      if (g.items.length > 0) {
        g.avgGMV = g.totalGMV / g.items.length;
        g.avgOrders = g.items.reduce((a, i) => a + (i.currOrders || i.prevOrders), 0) / g.items.length;
        g.avgVideos = g.items.reduce((a, i) => a + (i.currVideos || i.prevVideos), 0) / g.items.length;
      }
    });

    // ── WIN-BACK ITEMS ──
    const winBackCandidates: WinBackItem[] = items
      .filter(i => i.lifecycleStage === 'dormant' || i.lifecycleStage === 'churned' || i.severity === 'kritis')
      .map(item => {
        const peakGMV = Math.max(...item.sparklineGMVs, 0);
        const monthsSinceActive = Math.ceil(item.daysSinceLastActive / 30);
        // Win-back score: higher = more worth pursuing
        const recencyScore = Math.max(0, 30 - monthsSinceActive * 10);
        const valueScore = Math.min(35, (item.totalHistoricGMV / 1000000) * 10);
        const loyaltyScore = Math.min(20, item.activeMonths * 5);
        const tierBonus: Record<string, number> = { Mega: 15, Macro: 12, Mid: 8, Micro: 5, Nano: 2, Unknown: 1 };
        const tBonus = tierBonus[item.tier] || 1;
        const winBackScore = Math.min(100, Math.round(recencyScore + valueScore + loyaltyScore + tBonus));

        const estimatedRecoveryGMV = peakGMV * 0.5; // conservative: 50% of peak

        let suggestedAction = '';
        let suggestedMessage = '';
        if (peakGMV > 10000000) {
          suggestedAction = '🔥 Hubungi langsung + Exclusive deal';
          suggestedMessage = `Hai kak @${item.username}! 👋 Kami kangen sama konten-konten kece dari kakak nih. Ada produk baru yang cocok banget sama audience kakak. Yuk kita diskusi kolaborasi spesial? Kami siapkan bonus komisi khusus! 🎁`;
        } else if (peakGMV > 3000000) {
          suggestedAction = '📦 Kirim sampel baru + Bonus komisi';
          suggestedMessage = `Hai kak @${item.username}! 🌟 Ada update produk baru yang wajib dicoba! Kami mau kirim sample gratis + bonus komisi 5% untuk kakak. Tertarik? Reply ya kak! 💕`;
        } else if (item.activeMonths >= 3) {
          suggestedAction = '💌 Re-engagement message + Incentive';
          suggestedMessage = `Hai kak @${item.username}! Lama ga ketemu nih 😊 Mau ngasih tau ada promo eksklusif untuk kreator loyal. Komisi up to 15% + bonus produk! Yuk aktif lagi kak! 🚀`;
        } else {
          suggestedAction = '📱 DM singkat + Info produk baru';
          suggestedMessage = `Hai kak @${item.username}! 👋 Ada produk-produk baru keren yang bisa banget kakak review. Cek yuk! Link: [produk] 😊`;
        }

        return {
          ...item,
          winBackScore,
          winBackStatus: 'pending' as WinBackStatus,
          suggestedAction,
          suggestedMessage,
          estimatedRecoveryGMV,
          monthsSinceActive: monthsSinceActive,
          peakGMV,
        };
      })
      .sort((a, b) => b.winBackScore - a.winBackScore);

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
      churnVelocity, top5Pct, top10Pct, top20Pct,
      cohortRows, lifecycleGroups, winBackCandidates,
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

  // ── EXPORT CSV ──
  const handleExportCSV = useCallback(() => {
    if (!analysis) return;
    const headers = ['No', 'Username', 'Tier', 'Status', 'Priority Score', 'Risk Score', 'GMV Sebelumnya', 'GMV Sekarang', 'Selisih', 'Perubahan %', 'Orders Sebelumnya', 'Orders Sekarang', 'Videos Sebelumnya', 'Videos Sekarang', 'Bulan Aktif', 'Lifecycle', 'Rekomendasi'];
    const rows = analysis.needFollowUp.map((item, i) => [
      i + 1, `@${item.username}`, item.tier, SEV_CONFIG[item.severity].label,
      item.priorityScore, item.riskScore,
      Math.round(item.prevGMV), Math.round(item.currGMV),
      Math.round(item.change), `${item.changePct.toFixed(1)}%`,
      item.prevOrders, item.currOrders, item.prevVideos, item.currVideos,
      item.activeMonths, LIFECYCLE_CONFIG[item.lifecycleStage].label,
      `"${item.recommendation.replace(/"/g, '""')}"`,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `follow-up-retensi-${analysis.latestPeriod.replace(/\s/g, '_')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [analysis]);

  // ── COPY WIN-BACK MESSAGE ──
  const handleCopyMessage = useCallback((msg: string, username: string) => {
    navigator.clipboard.writeText(msg).then(() => {
      setCopiedMessage(username);
      setTimeout(() => setCopiedMessage(null), 2000);
    });
  }, []);

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
      <div className="flex items-center gap-1.5 bg-white rounded-xl border p-1.5 flex-wrap">
        {([
          { key: 'overview' as SubTab, icon: <BarChart3 className="w-4 h-4" />, label: 'Ringkasan', count: null },
          { key: 'followup' as SubTab, icon: <ShieldAlert className="w-4 h-4" />, label: 'Follow-Up', count: ra.needFollowUp.length },
          { key: 'cohort' as SubTab, icon: <Layers className="w-4 h-4" />, label: 'Kohort', count: null },
          { key: 'lifecycle' as SubTab, icon: <Zap className="w-4 h-4" />, label: 'Lifecycle', count: null },
          { key: 'winback' as SubTab, icon: <RotateCcw className="w-4 h-4" />, label: 'Win-Back', count: ra.winBackCandidates.length },
          { key: 'comparison' as SubTab, icon: <Users className="w-4 h-4" />, label: 'Semua Kreator', count: ra.items.length },
          { key: 'heatmap' as SubTab, icon: <Flame className="w-4 h-4" />, label: 'Heatmap', count: null },
        ]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setSubTab(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
              subTab === tab.key
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
            {tab.count !== null && tab.count > 0 && (
              <span className={`text-[10px] px-1.5 py-0 rounded-full font-bold ${
                subTab === tab.key ? 'bg-white/20 text-white' : tab.key === 'followup' ? 'bg-red-100 text-red-700' : tab.key === 'winback' ? 'bg-orange-100 text-orange-700' : 'bg-gray-200 text-gray-600'
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

          {/* ── NEW: Retention Trend Chart ── */}
          {ra.monthStats.length >= 2 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 bg-white rounded-xl border p-5">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" /> Tren Retention Rate
                </h3>
                <RetentionTrendChart monthStats={ra.monthStats} />
              </div>

              {/* Churn Velocity + Net Movement + Concentration */}
              <div className="space-y-4">
                {/* Churn Velocity */}
                <div className={`rounded-xl border p-4 ${
                  ra.churnVelocity === 'accelerating' ? 'bg-red-50 border-red-200' :
                  ra.churnVelocity === 'decelerating' ? 'bg-green-50 border-green-200' :
                  'bg-gray-50 border-gray-200'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Gauge className="w-4 h-4 text-gray-600" />
                    <span className="text-xs font-semibold text-gray-700">Kecepatan Churn</span>
                  </div>
                  <p className={`text-lg font-bold ${
                    ra.churnVelocity === 'accelerating' ? 'text-red-600' :
                    ra.churnVelocity === 'decelerating' ? 'text-green-600' :
                    'text-gray-600'
                  }`}>
                    {ra.churnVelocity === 'accelerating' ? '⚡ Meningkat' :
                     ra.churnVelocity === 'decelerating' ? '✅ Melambat' :
                     ra.churnVelocity === 'stable' ? '➖ Stabil' : '—'}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-1">
                    {ra.churnVelocity === 'accelerating'
                      ? 'Churn rate naik — perlu tindakan segera!'
                      : ra.churnVelocity === 'decelerating'
                      ? 'Churn rate turun — strategi retention bekerja!'
                      : 'Churn rate relatif stabil'}
                  </p>
                </div>

                {/* Net Creator Movement */}
                {ra.monthStats.length > 0 && (() => {
                  const latestStat = ra.monthStats[ra.monthStats.length - 1];
                  return (
                    <div className={`rounded-xl border p-4 ${latestStat.netMovement >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="w-4 h-4 text-gray-600" />
                        <span className="text-xs font-semibold text-gray-700">Net Pergerakan Kreator</span>
                      </div>
                      <p className={`text-2xl font-bold ${latestStat.netMovement >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {latestStat.netMovement >= 0 ? '+' : ''}{latestStat.netMovement}
                      </p>
                      <div className="flex gap-3 mt-1 text-xs">
                        <span className="text-green-600">+{latestStat.newOnes} baru</span>
                        <span className="text-red-500">-{latestStat.churned} churn</span>
                      </div>
                    </div>
                  );
                })()}

                {/* GMV Concentration Risk */}
                <div className="bg-white rounded-xl border p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Target className="w-4 h-4 text-gray-600" />
                    <span className="text-xs font-semibold text-gray-700">Risiko Konsentrasi GMV</span>
                  </div>
                  <div className="space-y-2.5">
                    <ConcentrationGauge topNPct={ra.top5Pct} n={5} />
                    <ConcentrationGauge topNPct={ra.top10Pct} n={10} />
                    <ConcentrationGauge topNPct={ra.top20Pct} n={20} />
                  </div>
                </div>
              </div>
            </div>
          )}

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
                      <th className="pb-2 font-medium text-right">Churn %</th>
                      <th className="pb-2 font-medium text-right">Net</th>
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
                        <td className={`py-2.5 text-right text-xs font-medium ${m.churnRate <= 30 ? 'text-green-600' : m.churnRate <= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                          {m.churnRate.toFixed(1)}%
                        </td>
                        <td className={`py-2.5 text-right font-bold text-xs ${m.netMovement >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {m.netMovement >= 0 ? '+' : ''}{m.netMovement}
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
                  if (ra.top5Pct > 70) recs.push({ icon: '🎯', text: `Konsentrasi GMV tinggi: top 5 kreator = ${ra.top5Pct.toFixed(0)}% GMV. Diversifikasi kreator!`, type: 'warning' });
                  if (ra.churnVelocity === 'accelerating') recs.push({ icon: '⚡', text: `Churn meningkat! Evaluasi strategi retention dan percepat follow-up.`, type: 'danger' });
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
                  onClick={handleExportCSV}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border bg-white border-gray-200 text-gray-600 hover:bg-green-50 hover:text-green-700 hover:border-green-200 transition-all"
                >
                  <FileDown className="w-3.5 h-3.5" /> Export CSV
                </button>
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

            {/* Priority summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
              {[
                { label: 'Prioritas Tinggi', count: filteredItems.filter(i => i.priorityScore >= 70).length, color: 'bg-red-100 text-red-700 border-red-200' },
                { label: 'Prioritas Sedang', count: filteredItems.filter(i => i.priorityScore >= 40 && i.priorityScore < 70).length, color: 'bg-orange-100 text-orange-700 border-orange-200' },
                { label: 'Prioritas Rendah', count: filteredItems.filter(i => i.priorityScore < 40).length, color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
                { label: 'Total Potensi Hilang', count: null, value: fRp(filteredItems.reduce((a, i) => a + Math.abs(i.change), 0)), color: 'bg-gray-100 text-gray-700 border-gray-200' },
              ].map(s => (
                <div key={s.label} className={`rounded-lg border p-2.5 ${s.color}`}>
                  <p className="text-[10px] font-medium opacity-70">{s.label}</p>
                  <p className="text-lg font-bold">{s.count !== null ? s.count : s.value}</p>
                </div>
              ))}
            </div>

            {/* Follow-up items */}
            <div className="space-y-2">
              {(showAllFollowUp ? filteredItems : filteredItems.slice(0, 15)).map((item, idx) => {
                const sev = SEV_CONFIG[item.severity];
                const action = ACTION_CONFIG[item.actionType];
                const lcConfig = LIFECYCLE_CONFIG[item.lifecycleStage];
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
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${lcConfig.bg} ${lcConfig.color} border ${lcConfig.border}`}>
                            {lcConfig.emoji} {lcConfig.label}
                          </span>
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
                          <span className="text-[10px] text-gray-400">📊 Prioritas: <b className={item.priorityScore >= 70 ? 'text-red-600' : item.priorityScore >= 40 ? 'text-orange-600' : 'text-gray-600'}>{item.priorityScore}</b></span>
                          <span className="text-[10px] text-gray-400">🗓 {item.activeMonths} bln aktif</span>
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

      {/* ═══ TAB: COHORT ANALYSIS ═══ */}
      {subTab === 'cohort' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border p-5">
            <h3 className="font-semibold text-gray-800 mb-1 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" /> Analisis Kohort Kreator
            </h3>
            <p className="text-xs text-gray-400 mb-4">
              Setiap baris menunjukkan kreator yang pertama kali aktif di bulan tersebut. Kolom menunjukkan persentase yang masih aktif di bulan-bulan berikutnya.
            </p>
            {ra.cohortRows.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="text-xs w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="pb-2 text-left font-semibold text-gray-700 min-w-[120px] pr-3">Kohort</th>
                      <th className="pb-2 text-center font-semibold text-gray-700 w-14">Total</th>
                      {ra.periods.slice(1).map((p, i) => (
                        <th key={i} className="pb-2 font-medium text-center text-gray-400 px-1 whitespace-nowrap min-w-[56px]">
                          Bln +{i + 1}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ra.cohortRows.map((row) => (
                      <tr key={row.cohortPeriod} className="border-b hover:bg-gray-50">
                        <td className="py-2 pr-3 font-medium text-gray-800">{row.cohortPeriod.replace(/\s.*/, '')}</td>
                        <td className="py-2 text-center">
                          <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-bold">{row.startCount}</span>
                        </td>
                        {/* Fill retention cells with proper alignment to the periods */}
                        {ra.periods.slice(1).map((_, pi) => {
                          const ret = row.retention[pi];
                          const count = row.counts[pi];
                          if (ret === undefined) {
                            return <td key={pi} className="py-2 px-1 text-center"><span className="text-gray-200">—</span></td>;
                          }
                          const intensity = ret / 100;
                          const bgColor = ret >= 70 ? `rgba(34, 197, 94, ${Math.max(0.1, intensity)})` :
                                         ret >= 40 ? `rgba(245, 158, 11, ${Math.max(0.1, intensity)})` :
                                         `rgba(239, 68, 68, ${Math.max(0.1, intensity * 0.8 + 0.2)})`;
                          return (
                            <td key={pi} className="py-2 px-1 text-center">
                              <div
                                className="rounded px-1.5 py-1 cursor-default"
                                style={{ backgroundColor: bgColor }}
                                title={`${count}/${row.startCount} kreator masih aktif (${ret.toFixed(1)}%)`}
                              >
                                <span className={`font-bold text-[11px] ${ret >= 50 ? 'text-gray-800' : 'text-gray-700'}`}>{ret.toFixed(0)}%</span>
                                <br />
                                <span className="text-[9px] text-gray-500">{count}</span>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-6">Data belum cukup untuk analisis kohort.</p>
            )}
          </div>

          {/* Cohort Insights */}
          {ra.cohortRows.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Best Cohort */}
              {(() => {
                const withFirst = ra.cohortRows.filter(r => r.retention.length > 0);
                if (withFirst.length === 0) return null;
                const best = withFirst.reduce((a, b) => (a.retention[0] > b.retention[0] ? a : b));
                return (
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200/60 p-4">
                    <h4 className="font-semibold text-green-800 text-sm mb-2 flex items-center gap-2">
                      <Award className="w-4 h-4" /> Kohort Terbaik 🏆
                    </h4>
                    <p className="text-2xl font-bold text-green-700">{best.cohortPeriod.replace(/\s.*/, '')}</p>
                    <p className="text-xs text-green-600 mt-1">Retention Bln +1: {best.retention[0].toFixed(1)}% ({best.counts[0]}/{best.startCount})</p>
                  </div>
                );
              })()}
              {/* Worst Cohort */}
              {(() => {
                const withFirst = ra.cohortRows.filter(r => r.retention.length > 0);
                if (withFirst.length === 0) return null;
                const worst = withFirst.reduce((a, b) => (a.retention[0] < b.retention[0] ? a : b));
                return (
                  <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-xl border border-red-200/60 p-4">
                    <h4 className="font-semibold text-red-800 text-sm mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" /> Kohort Terlemah ⚠️
                    </h4>
                    <p className="text-2xl font-bold text-red-700">{worst.cohortPeriod.replace(/\s.*/, '')}</p>
                    <p className="text-xs text-red-600 mt-1">Retention Bln +1: {worst.retention[0].toFixed(1)}% ({worst.counts[0]}/{worst.startCount})</p>
                  </div>
                );
              })()}
              {/* Avg Month 1 Retention */}
              {(() => {
                const withFirst = ra.cohortRows.filter(r => r.retention.length > 0);
                if (withFirst.length === 0) return null;
                const avg = withFirst.reduce((a, r) => a + r.retention[0], 0) / withFirst.length;
                return (
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200/60 p-4">
                    <h4 className="font-semibold text-blue-800 text-sm mb-2 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" /> Rata-rata Bln +1 📊
                    </h4>
                    <p className="text-2xl font-bold text-blue-700">{avg.toFixed(1)}%</p>
                    <p className="text-xs text-blue-600 mt-1">Dari {withFirst.length} kohort</p>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Color Legend */}
          <div className="flex items-center gap-6 text-xs text-gray-500 bg-white rounded-lg border p-3">
            <span className="font-medium text-gray-600">Legenda:</span>
            <span className="flex items-center gap-1"><div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgba(34, 197, 94, 0.7)' }} /> ≥70% (Baik)</span>
            <span className="flex items-center gap-1"><div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgba(245, 158, 11, 0.5)' }} /> 40-69% (Sedang)</span>
            <span className="flex items-center gap-1"><div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgba(239, 68, 68, 0.5)' }} /> &lt;40% (Rendah)</span>
          </div>
        </div>
      )}

      {/* ═══ TAB: LIFECYCLE ═══ */}
      {subTab === 'lifecycle' && (
        <div className="space-y-4">
          {/* Funnel Visualization */}
          <div className="bg-white rounded-xl border p-5">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-purple-600" /> Siklus Hidup Kreator
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {(['onboarding', 'growth', 'mature', 'at_risk', 'dormant', 'churned'] as LifecycleStage[]).map((stage) => {
                const group = ra.lifecycleGroups[stage];
                const config = LIFECYCLE_CONFIG[stage];
                const pct = ra.items.length > 0 ? (group.items.length / ra.items.length * 100) : 0;
                const isExpanded = lifecycleExpanded === stage;
                return (
                  <button
                    key={stage}
                    onClick={() => setLifecycleExpanded(isExpanded ? null : stage)}
                    className={`rounded-xl border-2 p-4 text-left transition-all hover:shadow-lg ${
                      isExpanded ? `${config.bg} ${config.border} shadow-md ring-2 ring-offset-1 ring-blue-300` : `${config.bg} ${config.border} hover:${config.border}`
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{config.emoji}</span>
                      <span className={`text-xs font-bold ${config.color}`}>{config.label}</span>
                    </div>
                    <p className="text-2xl font-black text-gray-900">{group.items.length}</p>
                    <p className="text-[10px] text-gray-500">{pct.toFixed(1)}% dari total</p>
                    <div className="mt-2 space-y-1">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-gray-500">Avg GMV</span>
                        <span className="font-medium text-gray-700">{fRp(group.avgGMV)}</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-gray-500">Avg Orders</span>
                        <span className="font-medium text-gray-700">{group.avgOrders.toFixed(1)}</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-gray-500">Avg Videos</span>
                        <span className="font-medium text-gray-700">{group.avgVideos.toFixed(1)}</span>
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-gray-200 rounded-full mt-2 overflow-hidden">
                      <div className={`h-full rounded-full`}
                        style={{ width: `${pct}%`, backgroundColor: stage === 'onboarding' ? '#10b981' : stage === 'growth' ? '#3b82f6' : stage === 'mature' ? '#f59e0b' : stage === 'at_risk' ? '#f97316' : stage === 'dormant' ? '#6b7280' : '#ef4444' }} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Lifecycle Flow Arrow */}
          <div className="bg-gradient-to-r from-emerald-50 via-blue-50 via-amber-50 to-red-50 rounded-xl border p-4">
            <div className="flex items-center justify-center gap-1 flex-wrap">
              {(['onboarding', 'growth', 'mature', 'at_risk', 'dormant', 'churned'] as LifecycleStage[]).map((stage, i) => {
                const config = LIFECYCLE_CONFIG[stage];
                const group = ra.lifecycleGroups[stage];
                return (
                  <React.Fragment key={stage}>
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${config.bg} border ${config.border}`}>
                      <span className="text-sm">{config.emoji}</span>
                      <span className={`text-xs font-bold ${config.color}`}>{group.items.length}</span>
                    </div>
                    {i < 5 && <ArrowRight className="w-4 h-4 text-gray-300 shrink-0" />}
                  </React.Fragment>
                );
              })}
            </div>
            <p className="text-[10px] text-gray-400 text-center mt-2">
              Alur ideal: Onboarding → Growth → Mature | Risiko: Mature → At Risk → Dormant → Churned
            </p>
          </div>

          {/* Expanded Stage Detail */}
          {lifecycleExpanded && (
            <div className={`rounded-xl border-2 p-5 ${LIFECYCLE_CONFIG[lifecycleExpanded].bg} ${LIFECYCLE_CONFIG[lifecycleExpanded].border}`}>
              <div className="flex items-center justify-between mb-3">
                <h4 className={`font-bold ${LIFECYCLE_CONFIG[lifecycleExpanded].color} flex items-center gap-2`}>
                  <span className="text-xl">{LIFECYCLE_CONFIG[lifecycleExpanded].emoji}</span>
                  {LIFECYCLE_CONFIG[lifecycleExpanded].label} — {ra.lifecycleGroups[lifecycleExpanded].items.length} Kreator
                </h4>
                <button onClick={() => setLifecycleExpanded(null)} className="p-1 rounded hover:bg-white/50"><X className="w-4 h-4" /></button>
              </div>

              {/* Strategy */}
              <div className="bg-white/80 rounded-lg border p-3 mb-3">
                <div className="flex items-start gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-gray-700 mb-0.5">Strategi Rekomendasi</p>
                    <p className="text-xs text-gray-600">{LIFECYCLE_CONFIG[lifecycleExpanded].strategy}</p>
                  </div>
                </div>
              </div>

              {/* Creator List */}
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-white/90">
                    <tr className="border-b">
                      <th className="pb-2 text-left font-medium">#</th>
                      <th className="pb-2 text-left font-medium">Kreator</th>
                      <th className="pb-2 text-center font-medium">Tier</th>
                      <th className="pb-2 text-right font-medium">GMV</th>
                      <th className="pb-2 text-right font-medium">Orders</th>
                      <th className="pb-2 text-right font-medium">Videos</th>
                      <th className="pb-2 text-center font-medium">Bln Aktif</th>
                      <th className="pb-2 text-center font-medium">Trend</th>
                      <th className="pb-2 text-center font-medium"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {ra.lifecycleGroups[lifecycleExpanded].items
                      .sort((a, b) => (b.currGMV || b.prevGMV) - (a.currGMV || a.prevGMV))
                      .slice(0, 50)
                      .map((item, i) => (
                      <tr key={item.username} className="hover:bg-white/60">
                        <td className="py-2 text-gray-400 font-bold">{i + 1}</td>
                        <td className="py-2">
                          <button onClick={() => onDrillDown(item.username)} className="font-medium text-gray-900 hover:text-blue-600 hover:underline">@{item.username}</button>
                        </td>
                        <td className="py-2 text-center">
                          <span className={`text-[10px] px-1.5 py-0 rounded ${TIER_COLORS[item.tier]}`}>{item.tier}</span>
                        </td>
                        <td className="py-2 text-right font-medium text-gray-700">{item.currGMV > 0 ? fRp(item.currGMV) : item.prevGMV > 0 ? <span className="text-gray-400">{fRp(item.prevGMV)}</span> : '—'}</td>
                        <td className="py-2 text-right text-gray-600">{item.currOrders || item.prevOrders || '—'}</td>
                        <td className="py-2 text-right text-gray-600">{item.currVideos || item.prevVideos || '—'}</td>
                        <td className="py-2 text-center"><span className="px-1.5 py-0.5 rounded bg-gray-100 font-bold">{item.activeMonths}</span></td>
                        <td className="py-2 text-center"><MiniSparkline values={item.sparklineGMVs} width={45} height={16} /></td>
                        <td className="py-2 text-center">
                          <button onClick={() => onDrillDown(item.username)} className="text-[10px] px-2 py-1 rounded bg-gray-100 hover:bg-blue-100 hover:text-blue-700">Detail</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ TAB: WIN-BACK ═══ */}
      {subTab === 'winback' && (
        <div className="space-y-4">
          {/* Win-Back Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-orange-600 to-red-700 rounded-xl p-5 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-28 h-28 bg-white/5 rounded-full -translate-y-6 translate-x-6" />
              <p className="text-orange-200 text-xs font-medium uppercase tracking-wide">Kandidat Win-Back</p>
              <p className="text-4xl font-black mt-1">{ra.winBackCandidates.length}</p>
              <p className="text-orange-200 text-xs mt-1">kreator dormant & churned</p>
            </div>
            <div className="bg-white rounded-xl border p-5">
              <p className="text-xs text-gray-500 font-medium">Estimasi Revenue Recovery</p>
              <p className="text-2xl font-bold text-green-700 mt-1">{fRp(ra.winBackCandidates.reduce((a, i) => a + i.estimatedRecoveryGMV, 0))}</p>
              <p className="text-[10px] text-gray-400 mt-1">Jika 50% peak GMV tercapai</p>
            </div>
            <div className="bg-white rounded-xl border p-5">
              <p className="text-xs text-gray-500 font-medium">Sudah Dihubungi</p>
              <p className="text-2xl font-bold text-blue-700 mt-1">{Object.values(winBackStatuses).filter(s => s !== 'pending').length}</p>
              <p className="text-[10px] text-gray-400 mt-1">dari {ra.winBackCandidates.length} kandidat</p>
            </div>
            <div className="bg-white rounded-xl border p-5">
              <p className="text-xs text-gray-500 font-medium">Success Rate</p>
              {(() => {
                const contacted = Object.values(winBackStatuses).filter(s => s === 'success' || s === 'failed');
                const success = Object.values(winBackStatuses).filter(s => s === 'success');
                const rate = contacted.length > 0 ? (success.length / contacted.length) * 100 : 0;
                return (
                  <>
                    <p className="text-2xl font-bold text-purple-700 mt-1">{rate > 0 ? fP(rate) : '—'}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{success.length} berhasil / {contacted.length} selesai</p>
                  </>
                );
              })()}
            </div>
          </div>

          {/* Win-Back Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {([
              { key: 'all' as const, label: `Semua (${ra.winBackCandidates.length})` },
              { key: 'pending' as const, label: `⏳ Belum (${ra.winBackCandidates.filter(i => (winBackStatuses[i.username] || 'pending') === 'pending').length})` },
              { key: 'contacted' as const, label: `📞 Dihubungi (${Object.values(winBackStatuses).filter(s => s === 'contacted').length})` },
              { key: 'success' as const, label: `✅ Berhasil (${Object.values(winBackStatuses).filter(s => s === 'success').length})` },
              { key: 'failed' as const, label: `❌ Gagal (${Object.values(winBackStatuses).filter(s => s === 'failed').length})` },
            ]).map(f => (
              <button key={f.key} onClick={() => setWinBackFilter(f.key)}
                className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
                  winBackFilter === f.key ? 'bg-orange-100 text-orange-700 border-orange-300 ring-2 ring-offset-1 ring-orange-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}>{f.label}</button>
            ))}
          </div>

          {/* Win-Back Priority List */}
          <div className="space-y-3">
            {ra.winBackCandidates
              .filter(item => {
                const status = winBackStatuses[item.username] || 'pending';
                return winBackFilter === 'all' || status === winBackFilter;
              })
              .slice(0, 30)
              .map((item, idx) => {
                const status = winBackStatuses[item.username] || 'pending';
                const statusConfig: Record<WinBackStatus, { label: string; color: string; icon: string }> = {
                  pending: { label: 'Belum', color: 'bg-gray-100 text-gray-600', icon: '⏳' },
                  contacted: { label: 'Dihubungi', color: 'bg-blue-100 text-blue-700', icon: '📞' },
                  success: { label: 'Berhasil', color: 'bg-green-100 text-green-700', icon: '✅' },
                  failed: { label: 'Gagal', color: 'bg-red-100 text-red-700', icon: '❌' },
                };
                const sc = statusConfig[status];
                return (
                  <div key={`wb-${item.username}`} className={`bg-white rounded-xl border p-4 hover:shadow-md transition-all ${status === 'success' ? 'border-green-200 bg-green-50/30' : status === 'failed' ? 'opacity-60' : ''}`}>
                    <div className="flex items-start gap-4">
                      {/* Score */}
                      <div className="flex flex-col items-center shrink-0">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-black text-lg ${
                          item.winBackScore >= 70 ? 'bg-gradient-to-br from-red-500 to-orange-500' :
                          item.winBackScore >= 40 ? 'bg-gradient-to-br from-orange-400 to-yellow-500' :
                          'bg-gradient-to-br from-gray-400 to-gray-500'
                        }`}>
                          {item.winBackScore}
                        </div>
                        <span className="text-[9px] text-gray-400 mt-0.5">Score</span>
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Header */}
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-gray-400 text-xs font-bold">#{idx + 1}</span>
                          <button onClick={() => onDrillDown(item.username)} className="font-bold text-gray-900 hover:text-blue-600 hover:underline">@{item.username}</button>
                          <span className={`text-[10px] px-1.5 py-0 rounded ${TIER_COLORS[item.tier]}`}>{item.tier}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${sc.color}`}>{sc.icon} {sc.label}</span>
                          {item.lifecycleStage === 'churned' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-600 border border-red-200">💀 Churned</span>}
                          {item.lifecycleStage === 'dormant' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200">😴 Dormant</span>}
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-4 text-xs text-gray-500 mb-2 flex-wrap">
                          <span>🏆 Peak: <b className="text-gray-700">{fRp(item.peakGMV)}</b></span>
                          <span>📊 Total Histori: <b className="text-gray-700">{fRp(item.totalHistoricGMV)}</b></span>
                          <span>🗓 {item.activeMonths} bln aktif</span>
                          <span>⏱ {item.monthsSinceActive} bln tidak aktif</span>
                          <span>💰 Est. Recovery: <b className="text-green-600">{fRp(item.estimatedRecoveryGMV)}</b></span>
                        </div>

                        {/* Suggested Action */}
                        <div className="bg-amber-50 rounded-lg border border-amber-200 p-3 mb-2">
                          <p className="text-xs font-semibold text-amber-800 mb-1">{item.suggestedAction}</p>
                          <div className="bg-white rounded border border-amber-100 p-2.5 relative group">
                            <p className="text-xs text-gray-700 pr-8">{item.suggestedMessage}</p>
                            <button
                              onClick={() => handleCopyMessage(item.suggestedMessage, item.username)}
                              className={`absolute top-2 right-2 p-1.5 rounded transition-all ${
                                copiedMessage === item.username ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400 hover:bg-blue-100 hover:text-blue-600'
                              }`}
                              title="Copy pesan"
                            >
                              {copiedMessage === item.username ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>

                        {/* Status Buttons */}
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-400 mr-1">Update status:</span>
                          {(['pending', 'contacted', 'success', 'failed'] as WinBackStatus[]).map(s => {
                            const sConfig = statusConfig[s];
                            return (
                              <button
                                key={s}
                                onClick={() => setWinBackStatuses(prev => ({ ...prev, [item.username]: s }))}
                                className={`text-[10px] px-2 py-1 rounded-full border font-medium transition-all ${
                                  status === s ? `${sConfig.color} ring-1 ring-offset-1` : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50'
                                }`}
                              >
                                {sConfig.icon} {sConfig.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Sparkline */}
                      <div className="shrink-0 text-center">
                        <MiniSparkline values={item.sparklineGMVs} width={60} height={24} highlightLast />
                        <p className="text-[9px] text-gray-400 mt-0.5">Trend GMV</p>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>

          {ra.winBackCandidates.length === 0 && (
            <div className="bg-green-50 rounded-xl border border-green-200 p-8 text-center">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
              <p className="font-semibold text-green-800">Tidak ada kreator yang perlu di-win-back! 🎉</p>
              <p className="text-sm text-green-600 mt-1">Semua kreator masih aktif.</p>
            </div>
          )}
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
