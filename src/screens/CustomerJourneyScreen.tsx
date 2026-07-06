"use client";
import { useState, useMemo, useCallback, useEffect } from "react";
import {
  Users, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  Heart, ShoppingCart, Repeat, UserCheck, UserMinus, Target,
  DollarSign, BarChart3, Award, AlertCircle, Clock,
  Eye, Star, Sparkles, Filter, Calendar,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line, PieChart, Pie, Cell,
  FunnelChart, Funnel, LabelList,
} from "recharts";

/* ─── HELPERS ───────────────────────────────────── */
const fRp = (n: number) => "Rp " + Math.round(n).toLocaleString("id-ID");
const fN = (n: number) => Math.round(n).toLocaleString("id-ID");
const fP = (n: number) => n.toFixed(1) + "%";

const LS_KEY = "customer_journey_data";

interface CohortData {
  month: string;
  acquired: number;
  retained1: number;
  retained2: number;
  retained3: number;
  retained6: number;
}

interface SegmentData {
  name: string;
  count: number;
  avgSpend: number;
  color: string;
  description: string;
}

interface JourneyStep {
  stage: string;
  count: number;
  rate: number;
  color: string;
}

const DEFAULT_COHORTS: CohortData[] = [
  { month: "Jan", acquired: 1200, retained1: 480, retained2: 312, retained3: 240, retained6: 132 },
  { month: "Feb", acquired: 1450, retained1: 595, retained2: 393, retained3: 305, retained6: 160 },
  { month: "Mar", acquired: 1680, retained1: 723, retained2: 487, retained3: 378, retained6: 201 },
  { month: "Apr", acquired: 1920, retained1: 864, retained2: 595, retained3: 461, retained6: 0 },
  { month: "Mei", acquired: 2150, retained1: 1010, retained2: 710, retained3: 0, retained6: 0 },
  { month: "Jun", acquired: 2400, retained1: 1200, retained2: 0, retained3: 0, retained6: 0 },
];

const DEFAULT_SEGMENTS: SegmentData[] = [
  { name: "Champions", count: 420, avgSpend: 850000, color: "#6366f1", description: "Beli sering, banyak, baru-baru ini" },
  { name: "Loyal", count: 680, avgSpend: 520000, color: "#10b981", description: "Beli rutin tapi tidak sering" },
  { name: "Potential Loyal", count: 950, avgSpend: 380000, color: "#f59e0b", description: "Pembeli baru yang berpotensi loyal" },
  { name: "At Risk", count: 380, avgSpend: 290000, color: "#ef4444", description: "Dulu aktif, sekarang mulai jarang" },
  { name: "Hibernating", count: 570, avgSpend: 150000, color: "#94a3b8", description: "Sudah lama tidak beli" },
];

const DEFAULT_JOURNEY: JourneyStep[] = [
  { stage: "First Visit", count: 50000, rate: 100, color: "#6366f1" },
  { stage: "Product View", count: 35000, rate: 70, color: "#8b5cf6" },
  { stage: "Add to Cart", count: 12000, rate: 24, color: "#a78bfa" },
  { stage: "Checkout", count: 6500, rate: 13, color: "#c4b5fd" },
  { stage: "Purchase", count: 4200, rate: 8.4, color: "#10b981" },
  { stage: "Repeat Purchase", count: 1260, rate: 2.5, color: "#059669" },
];

const PIE_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#94a3b8"];

type TabView = "overview" | "cohort" | "segments" | "journey" | "clv";

/* ═══════════════════════════════════════════════════
   CUSTOMER JOURNEY SCREEN
   ═══════════════════════════════════════════════════ */
export default function CustomerJourneyScreen() {
  const [tab, setTab] = useState<TabView>("overview");
  const [cohorts, setCohorts] = useState<CohortData[]>(DEFAULT_COHORTS);
  const [segments, setSegments] = useState<SegmentData[]>(DEFAULT_SEGMENTS);
  const [journey, setJourney] = useState<JourneyStep[]>(DEFAULT_JOURNEY);

  // Load from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.cohorts) setCohorts(parsed.cohorts);
        if (parsed.segments) setSegments(parsed.segments);
        if (parsed.journey) setJourney(parsed.journey);
      }
    } catch { /* ignore */ }
  }, []);

  /* ─── METRICS ──────────────────────────────── */
  const totalCustomers = useMemo(() => segments.reduce((a, s) => a + s.count, 0), [segments]);
  const avgCLV = useMemo(() => {
    const total = segments.reduce((a, s) => a + (s.avgSpend * s.count), 0);
    return totalCustomers > 0 ? total / totalCustomers : 0;
  }, [segments, totalCustomers]);
  const repeatRate = useMemo(() => {
    const repeat = journey.find(j => j.stage === "Repeat Purchase");
    const purchase = journey.find(j => j.stage === "Purchase");
    return purchase && repeat ? (repeat.count / purchase.count) * 100 : 0;
  }, [journey]);
  const churnRate = useMemo(() => {
    const atRisk = segments.find(s => s.name === "At Risk");
    const hibernating = segments.find(s => s.name === "Hibernating");
    return totalCustomers > 0 ? (((atRisk?.count || 0) + (hibernating?.count || 0)) / totalCustomers) * 100 : 0;
  }, [segments, totalCustomers]);
  const avgRetention = useMemo(() => {
    const latest = cohorts.filter(c => c.retained1 > 0);
    if (latest.length === 0) return 0;
    return latest.reduce((a, c) => a + (c.retained1 / c.acquired) * 100, 0) / latest.length;
  }, [cohorts]);

  const TABS: { key: TabView; label: string; icon: React.ReactNode }[] = [
    { key: "overview", label: "Overview", icon: <Eye size={16} /> },
    { key: "cohort", label: "Cohort Analysis", icon: <Calendar size={16} /> },
    { key: "segments", label: "Segmentasi", icon: <Users size={16} /> },
    { key: "journey", label: "Journey Map", icon: <TrendingUp size={16} /> },
    { key: "clv", label: "CLV Analysis", icon: <DollarSign size={16} /> },
  ];

  return (
    <div className="space-y-6">
      {/* ─── HEADER ─────────────────────────────── */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground dark:text-white flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg">
            <Heart size={22} />
          </div>
          Customer Journey & Retention
        </h1>
        <p className="text-muted dark:text-gray-400 mt-1 text-sm">
          Analisis perjalanan customer, retention, dan lifetime value
        </p>
      </div>

      {/* ─── TAB BAR ────────────────────────────── */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 overflow-x-auto">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              tab === t.key
                ? "bg-white dark:bg-gray-700 text-cyan-600 dark:text-cyan-400 shadow-sm"
                : "text-muted dark:text-gray-400 hover:text-foreground dark:hover:text-gray-200"
            }`}
          >{t.icon} {t.label}</button>
        ))}
      </div>

      {/* ─── OVERVIEW ──────────────────────────── */}
      {tab === "overview" && (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: "Total Customers", value: fN(totalCustomers), icon: <Users size={20} />, gradient: "linear-gradient(135deg, #6366f1, #4f46e5)", sub: "All segments" },
              { label: "Avg CLV", value: fRp(avgCLV), icon: <DollarSign size={20} />, gradient: "linear-gradient(135deg, #10b981, #059669)", sub: "Per customer" },
              { label: "Repeat Purchase", value: fP(repeatRate), icon: <Repeat size={20} />, gradient: "linear-gradient(135deg, #f59e0b, #d97706)", sub: "Rate" },
              { label: "Retention Rate", value: fP(avgRetention), icon: <UserCheck size={20} />, gradient: "linear-gradient(135deg, #06b6d4, #0891b2)", sub: "1-month avg" },
              { label: "Churn Rate", value: fP(churnRate), icon: <UserMinus size={20} />, gradient: "linear-gradient(135deg, #ef4444, #dc2626)", sub: "At risk + hibernating" },
            ].map((item, i) => (
              <div key={i} className="relative overflow-hidden rounded-2xl p-5 text-white shadow-lg hover:shadow-xl transition-all animate-fade-slide-up"
                style={{ background: item.gradient, animationDelay: `${i * 80}ms` }}>
                <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-white/10 -mr-6 -mt-6" />
                <div className="relative z-10">
                  <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center mb-3">{item.icon}</div>
                  <p className="text-white/70 text-xs font-medium mb-1">{item.label}</p>
                  <p className="text-2xl font-bold">{item.value}</p>
                  <p className="text-white/60 text-[11px] mt-1">{item.sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Customer Journey Funnel */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-border dark:border-gray-700">
            <h3 className="text-sm font-semibold text-foreground dark:text-white mb-4">🔄 Customer Journey Funnel</h3>
            <div className="space-y-3">
              {journey.map((step, i) => {
                const width = (step.count / journey[0].count) * 100;
                const drop = i > 0 ? ((journey[i-1].count - step.count) / journey[i-1].count * 100) : 0;
                return (
                  <div key={step.stage} className="animate-fade-slide-up" style={{ animationDelay: `${i * 100}ms` }}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium text-foreground dark:text-white">{step.stage}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-muted text-xs">{fN(step.count)} users</span>
                        {i > 0 && <span className="text-red-500 text-xs">-{drop.toFixed(1)}%</span>}
                      </div>
                    </div>
                    <div className="relative h-8 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                      <div className="h-full rounded-lg flex items-center px-3 transition-all duration-1000 animate-progress-fill"
                        style={{ width: `${width}%`, backgroundColor: step.color }}>
                        <span className="text-white text-xs font-semibold">{fP(step.rate)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Segment Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-border dark:border-gray-700">
              <h3 className="text-sm font-semibold text-foreground dark:text-white mb-4">👥 Distribusi Segmen</h3>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={segments.map(s => ({ name: s.name, value: s.count }))} cx="50%" cy="50%"
                      innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value"
                      label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}>
                      {segments.map((s, i) => (<Cell key={i} fill={s.color} />))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-border dark:border-gray-700">
              <h3 className="text-sm font-semibold text-foreground dark:text-white mb-4">💰 Avg Spend per Segment</h3>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={segments.map(s => ({ name: s.name, spend: s.avgSpend }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}K`} />
                    <Tooltip formatter={(v: any) => fRp(Number(v))} />
                    <Bar dataKey="spend" name="Avg Spend" radius={[8, 8, 0, 0]}>
                      {segments.map((s, i) => (<Cell key={i} fill={s.color} />))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── COHORT ANALYSIS ───────────────────── */}
      {tab === "cohort" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-border dark:border-gray-700">
            <h3 className="text-lg font-semibold text-foreground dark:text-white mb-5">📊 Cohort Retention Analysis</h3>
            <p className="text-sm text-muted dark:text-gray-400 mb-4">
              Persentase customer yang masih aktif setelah N bulan dari akuisisi pertama
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted border-b border-border dark:border-gray-700">
                    <th className="py-3 px-3">Cohort</th>
                    <th className="py-3 px-3 text-center">Acquired</th>
                    <th className="py-3 px-3 text-center">Month 1</th>
                    <th className="py-3 px-3 text-center">Month 2</th>
                    <th className="py-3 px-3 text-center">Month 3</th>
                    <th className="py-3 px-3 text-center">Month 6</th>
                  </tr>
                </thead>
                <tbody>
                  {cohorts.map((c) => {
                    const r1 = c.acquired > 0 ? (c.retained1 / c.acquired) * 100 : 0;
                    const r2 = c.acquired > 0 ? (c.retained2 / c.acquired) * 100 : 0;
                    const r3 = c.acquired > 0 ? (c.retained3 / c.acquired) * 100 : 0;
                    const r6 = c.acquired > 0 ? (c.retained6 / c.acquired) * 100 : 0;
                    const cellBg = (val: number) => {
                      if (val === 0) return "bg-gray-50 dark:bg-gray-700/20 text-gray-400";
                      if (val >= 40) return "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400";
                      if (val >= 25) return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400";
                      return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400";
                    };
                    return (
                      <tr key={c.month} className="border-b border-gray-50 dark:border-gray-700/50">
                        <td className="py-3 px-3 font-semibold">{c.month}</td>
                        <td className="py-3 px-3 text-center font-medium">{fN(c.acquired)}</td>
                        <td className={`py-3 px-3 text-center font-semibold rounded ${cellBg(r1)}`}>
                          {r1 > 0 ? fP(r1) : "—"}
                        </td>
                        <td className={`py-3 px-3 text-center font-semibold rounded ${cellBg(r2)}`}>
                          {r2 > 0 ? fP(r2) : "—"}
                        </td>
                        <td className={`py-3 px-3 text-center font-semibold rounded ${cellBg(r3)}`}>
                          {r3 > 0 ? fP(r3) : "—"}
                        </td>
                        <td className={`py-3 px-3 text-center font-semibold rounded ${cellBg(r6)}`}>
                          {r6 > 0 ? fP(r6) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Retention Trend */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-border dark:border-gray-700">
            <h3 className="text-sm font-semibold text-foreground dark:text-white mb-4">📈 Retention Trend (Month 1)</h3>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={cohorts.map(c => ({ month: c.month, acquired: c.acquired, retention: c.acquired > 0 ? (c.retained1 / c.acquired * 100) : 0 }))}>
                  <defs>
                    <linearGradient id="retGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                  <Tooltip formatter={(v: any) => `${Number(v).toFixed(1)}%`} />
                  <Line type="monotone" dataKey="retention" name="Retention %" stroke="#06b6d4" strokeWidth={3} dot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ─── SEGMENTS ──────────────────────────── */}
      {tab === "segments" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {segments.map((seg, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-border dark:border-gray-700 hover:shadow-md transition-all animate-fade-slide-up"
                style={{ animationDelay: `${i * 80}ms` }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg" style={{ backgroundColor: seg.color }}>
                    {seg.name === "Champions" ? "🏆" : seg.name === "Loyal" ? "💎" : seg.name === "Potential Loyal" ? "⭐" : seg.name === "At Risk" ? "⚠️" : "💤"}
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground dark:text-white text-sm">{seg.name}</h4>
                    <p className="text-xs text-muted dark:text-gray-400">{seg.description}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted">Customers</p>
                    <p className="text-xl font-bold text-foreground dark:text-white">{fN(seg.count)}</p>
                    <p className="text-xs text-muted">{fP((seg.count / totalCustomers) * 100)} dari total</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Avg Spend</p>
                    <p className="text-xl font-bold text-foreground dark:text-white">{fRp(seg.avgSpend)}</p>
                    <p className="text-xs text-muted">per transaksi</p>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-border dark:border-gray-700">
                  <p className="text-xs text-muted mb-1">Total Revenue Contribution</p>
                  <p className="text-sm font-semibold" style={{ color: seg.color }}>{fRp(seg.avgSpend * seg.count)}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Recommendations */}
          <div className="bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 rounded-2xl p-6 border border-cyan-200 dark:border-cyan-800/30">
            <h3 className="text-lg font-bold text-cyan-700 dark:text-cyan-400 mb-4 flex items-center gap-2">
              <Sparkles size={20} /> AI Recommendations
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="bg-white/70 dark:bg-gray-800/50 rounded-xl p-4 backdrop-blur-sm">
                <h4 className="font-semibold text-cyan-700 dark:text-cyan-400 mb-2">🏆 Champions → Advocates</h4>
                <p className="text-cyan-800 dark:text-cyan-300">Buat program referral khusus untuk {segments.find(s => s.name === "Champions")?.count || 0} Champions. Potensi mendatangkan {((segments.find(s => s.name === "Champions")?.count || 0) * 2).toLocaleString()} customer baru.</p>
              </div>
              <div className="bg-white/70 dark:bg-gray-800/50 rounded-xl p-4 backdrop-blur-sm">
                <h4 className="font-semibold text-amber-700 dark:text-amber-400 mb-2">⚠️ At Risk → Recovery</h4>
                <p className="text-amber-800 dark:text-amber-300">Kirim re-engagement campaign ke {segments.find(s => s.name === "At Risk")?.count || 0} customer at risk. Win-back rate estimasi 15-25%.</p>
              </div>
              <div className="bg-white/70 dark:bg-gray-800/50 rounded-xl p-4 backdrop-blur-sm">
                <h4 className="font-semibold text-green-700 dark:text-green-400 mb-2">⭐ Potential → Loyal</h4>
                <p className="text-green-800 dark:text-green-300">Nurture {segments.find(s => s.name === "Potential Loyal")?.count || 0} potential customers dengan personal offers & exclusive content.</p>
              </div>
              <div className="bg-white/70 dark:bg-gray-800/50 rounded-xl p-4 backdrop-blur-sm">
                <h4 className="font-semibold text-red-700 dark:text-red-400 mb-2">💤 Hibernating → Wake Up</h4>
                <p className="text-red-800 dark:text-red-300">Flash sale khusus untuk {segments.find(s => s.name === "Hibernating")?.count || 0} dormant customers. Minimal recover 10% = {fN((segments.find(s => s.name === "Hibernating")?.count || 0) * 0.1)} customers.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── JOURNEY MAP ───────────────────────── */}
      {tab === "journey" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-border dark:border-gray-700">
            <h3 className="text-lg font-semibold text-foreground dark:text-white mb-5">🗺️ Customer Journey Map</h3>
            <div className="relative">
              {journey.map((step, i) => {
                const width = (step.count / journey[0].count) * 100;
                const drop = i > 0 ? ((journey[i-1].count - step.count) / journey[i-1].count * 100) : 0;
                return (
                  <div key={step.stage} className="mb-6 animate-fade-slide-up" style={{ animationDelay: `${i * 120}ms` }}>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg font-bold shrink-0 shadow-lg"
                        style={{ backgroundColor: step.color }}>
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-foreground dark:text-white">{step.stage}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-foreground dark:text-white">{fN(step.count)}</span>
                            {i > 0 && (
                              <span className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <ArrowDownRight size={12} /> {drop.toFixed(1)}% drop
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="h-6 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                          <div className="h-full rounded-lg animate-progress-fill transition-all"
                            style={{ width: `${width}%`, backgroundColor: step.color, opacity: 0.7 }} />
                        </div>
                      </div>
                    </div>
                    {i < journey.length - 1 && (
                      <div className="ml-6 flex items-center py-1">
                        <div className="w-0.5 h-4 bg-gray-200 dark:bg-gray-600" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Drop-off Analysis */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-border dark:border-gray-700">
            <h3 className="text-sm font-semibold text-foreground dark:text-white mb-4">📉 Drop-off Analysis</h3>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={journey.slice(1).map((step, i) => ({
                  stage: `${journey[i].stage} → ${step.stage}`,
                  dropoff: journey[i].count - step.count,
                  rate: ((journey[i].count - step.count) / journey[i].count * 100),
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="stage" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: any, name: any) => name === "Drop Rate" ? `${v.toFixed(1)}%` : fN(v)} />
                  <Legend />
                  <Bar dataKey="dropoff" name="Users Lost" fill="#ef4444" radius={[6, 6, 0, 0]} opacity={0.8} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ─── CLV ANALYSIS ──────────────────────── */}
      {tab === "clv" && (
        <div className="space-y-6">
          {/* CLV by Segment */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-border dark:border-gray-700">
            <h3 className="text-lg font-semibold text-foreground dark:text-white mb-5">💎 Customer Lifetime Value by Segment</h3>
            <div className="space-y-4">
              {segments.sort((a, b) => b.avgSpend - a.avgSpend).map((seg, i) => {
                const clv = seg.avgSpend * (seg.name === "Champions" ? 12 : seg.name === "Loyal" ? 8 : seg.name === "Potential Loyal" ? 4 : seg.name === "At Risk" ? 2 : 1);
                const maxCLV = segments.reduce((max, s) => Math.max(max, s.avgSpend * 12), 0);
                return (
                  <div key={i} className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4 animate-fade-slide-up" style={{ animationDelay: `${i * 80}ms` }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: seg.color }} />
                        <span className="font-semibold text-sm text-foreground dark:text-white">{seg.name}</span>
                        <span className="text-xs text-muted">({fN(seg.count)} customers)</span>
                      </div>
                      <span className="text-lg font-bold" style={{ color: seg.color }}>{fRp(clv)}</span>
                    </div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                      <div className="h-full rounded-full animate-progress-fill" style={{ width: `${(clv / maxCLV) * 100}%`, backgroundColor: seg.color }} />
                    </div>
                    <p className="text-xs text-muted mt-1">Est. {seg.name === "Champions" ? "12" : seg.name === "Loyal" ? "8" : seg.name === "Potential Loyal" ? "4" : seg.name === "At Risk" ? "2" : "1"} transactions × {fRp(seg.avgSpend)} avg</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Revenue Potential */}
          <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/5 -mr-10 -mt-10" />
            <div className="relative z-10">
              <p className="text-white/70 text-sm mb-2 flex items-center gap-2"><Sparkles size={16} /> TOTAL REVENUE POTENTIAL</p>
              <p className="text-4xl font-extrabold mb-4">
                {fRp(segments.reduce((a, s) => {
                  const mult = s.name === "Champions" ? 12 : s.name === "Loyal" ? 8 : s.name === "Potential Loyal" ? 4 : s.name === "At Risk" ? 2 : 1;
                  return a + (s.avgSpend * s.count * mult);
                }, 0))}
              </p>
              <p className="text-white/70 text-sm">Jika semua segment dioptimalkan (CLV × customer count)</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-6">
                <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                  <p className="text-white/60 text-xs">Quick Win: At Risk Recovery</p>
                  <p className="font-bold">{fRp((segments.find(s => s.name === "At Risk")?.count || 0) * 0.2 * (segments.find(s => s.name === "At Risk")?.avgSpend || 0) * 3)}</p>
                </div>
                <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                  <p className="text-white/60 text-xs">Upsell: Potential → Loyal</p>
                  <p className="font-bold">{fRp((segments.find(s => s.name === "Potential Loyal")?.count || 0) * 0.3 * 140000 * 4)}</p>
                </div>
                <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                  <p className="text-white/60 text-xs">Referral: Champions</p>
                  <p className="font-bold">{fRp((segments.find(s => s.name === "Champions")?.count || 0) * 2 * 200000)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
