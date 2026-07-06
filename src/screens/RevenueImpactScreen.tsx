"use client";
import { useState, useMemo, useEffect, useCallback } from "react";
import {
  TrendingUp, Clock, DollarSign, Target, Zap, Award, ArrowUpRight,
  ArrowDownRight, BarChart3, PieChart, Activity, CheckCircle2, Brain,
  Calculator, Sparkles, Download, RefreshCw, Calendar, Shield,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart as RPie,
  Pie, Cell, RadialBarChart, RadialBar,
} from "recharts";

/* ─── HELPERS ───────────────────────────────────── */
const fRp = (n: number) => "Rp " + Math.round(n).toLocaleString("id-ID");
const fN = (n: number) => Math.round(n).toLocaleString("id-ID");
const fP = (n: number) => n.toFixed(1) + "%";

const LS_KEY = "revenue_impact_data";

interface PlatformROI {
  monthlyTimeSavedHours: number;
  monthlyBudgetSaved: number;
  decisionsImproved: number;
  campaignsSavedEarly: number;
  avgCampaignSavingPerDetection: number;
  reportTimeBefore: number; // minutes
  reportTimeAfter: number;  // minutes
  manualProcessHours: number;
  automatedProcessHours: number;
}

interface MonthlyImpact {
  month: string;
  timeSaved: number;
  budgetSaved: number;
  gmvGrowth: number;
  decisionsDataDriven: number;
  totalDecisions: number;
}

const DEFAULT_ROI: PlatformROI = {
  monthlyTimeSavedHours: 47,
  monthlyBudgetSaved: 15000000,
  decisionsImproved: 40,
  campaignsSavedEarly: 3,
  avgCampaignSavingPerDetection: 5000000,
  reportTimeBefore: 240,
  reportTimeAfter: 15,
  manualProcessHours: 120,
  automatedProcessHours: 25,
};

const DEFAULT_MONTHLY: MonthlyImpact[] = [
  { month: "Jan", timeSaved: 38, budgetSaved: 8000000, gmvGrowth: 5, decisionsDataDriven: 12, totalDecisions: 20 },
  { month: "Feb", timeSaved: 42, budgetSaved: 10000000, gmvGrowth: 8, decisionsDataDriven: 15, totalDecisions: 22 },
  { month: "Mar", timeSaved: 45, budgetSaved: 12000000, gmvGrowth: 12, decisionsDataDriven: 18, totalDecisions: 23 },
  { month: "Apr", timeSaved: 47, budgetSaved: 14000000, gmvGrowth: 15, decisionsDataDriven: 20, totalDecisions: 25 },
  { month: "Mei", timeSaved: 50, budgetSaved: 15000000, gmvGrowth: 18, decisionsDataDriven: 22, totalDecisions: 25 },
  { month: "Jun", timeSaved: 52, budgetSaved: 17000000, gmvGrowth: 22, decisionsDataDriven: 24, totalDecisions: 26 },
];

const GRADIENT_COLORS = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd"];
const PIE_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#06b6d4"];

type TabView = "overview" | "time-analysis" | "budget-impact" | "decisions" | "settings";

/* ─── STAT CARD ─────────────────────────────────── */
function StatCard({ icon, label, value, sub, gradient, trend, delay }: {
  icon: React.ReactNode; label: string; value: string; sub?: string;
  gradient: string; trend?: { value: number; positive: boolean }; delay?: number;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-5 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 animate-fade-slide-up"
      style={{ background: gradient, animationDelay: `${delay || 0}ms` }}
    >
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-white/10 -mr-8 -mt-8" />
      <div className="absolute bottom-0 left-0 w-16 h-16 rounded-full bg-white/5 -ml-4 -mb-4" />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
            {icon}
          </div>
          {trend && (
            <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${trend.positive ? "bg-green-400/30 text-green-100" : "bg-red-400/30 text-red-100"}`}>
              {trend.positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {trend.value}%
            </span>
          )}
        </div>
        <p className="text-white/70 text-xs font-medium mb-1">{label}</p>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        {sub && <p className="text-white/60 text-[11px] mt-1">{sub}</p>}
      </div>
    </div>
  );
}

/* ─── GAUGE CHART ───────────────────────────────── */
function GaugeCard({ label, value, max, unit, color }: {
  label: string; value: number; max: number; unit: string; color: string;
}) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-border dark:border-gray-700 hover:shadow-md transition-all">
      <p className="text-sm text-muted dark:text-gray-400 font-medium mb-3">{label}</p>
      <div className="relative w-full h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
        <div className="h-full rounded-full animate-progress-fill transition-all duration-1000" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="flex justify-between items-end">
        <span className="text-xl font-bold text-foreground dark:text-white">{fN(value)} <span className="text-sm font-normal text-muted">{unit}</span></span>
        <span className="text-xs text-muted">{fP(pct)} dari {fN(max)}</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   REVENUE IMPACT SCREEN
   ═══════════════════════════════════════════════════ */
export default function RevenueImpactScreen() {
  const [tab, setTab] = useState<TabView>("overview");
  const [roi, setRoi] = useState<PlatformROI>(DEFAULT_ROI);
  const [monthly, setMonthly] = useState<MonthlyImpact[]>(DEFAULT_MONTHLY);
  const [editMode, setEditMode] = useState(false);

  // Load from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.roi) setRoi(parsed.roi);
        if (parsed.monthly) setMonthly(parsed.monthly);
      }
    } catch { /* ignore */ }
  }, []);

  // Save
  const saveData = useCallback(() => {
    localStorage.setItem(LS_KEY, JSON.stringify({ roi, monthly }));
    setEditMode(false);
  }, [roi, monthly]);

  /* ─── CALCULATED METRICS ────────────────────── */
  const totalTimeSaved = useMemo(() => monthly.reduce((a, m) => a + m.timeSaved, 0), [monthly]);
  const totalBudgetSaved = useMemo(() => monthly.reduce((a, m) => a + m.budgetSaved, 0), [monthly]);
  const avgGrowth = useMemo(() => {
    const sum = monthly.reduce((a, m) => a + m.gmvGrowth, 0);
    return monthly.length > 0 ? sum / monthly.length : 0;
  }, [monthly]);
  const decisionQuality = useMemo(() => {
    const dd = monthly.reduce((a, m) => a + m.decisionsDataDriven, 0);
    const td = monthly.reduce((a, m) => a + m.totalDecisions, 0);
    return td > 0 ? (dd / td) * 100 : 0;
  }, [monthly]);
  const costAvoidance = roi.campaignsSavedEarly * roi.avgCampaignSavingPerDetection;
  const reportEfficiency = roi.reportTimeBefore > 0 ? ((roi.reportTimeBefore - roi.reportTimeAfter) / roi.reportTimeBefore) * 100 : 0;
  const processEfficiency = roi.manualProcessHours > 0 ? ((roi.manualProcessHours - roi.automatedProcessHours) / roi.manualProcessHours) * 100 : 0;

  /* ─── PIE DATA ─────────────────────────────── */
  const savingsBreakdown = useMemo(() => [
    { name: "Time Savings", value: totalTimeSaved * 150000 }, // Rp 150K/hour labor cost
    { name: "Budget Optimization", value: totalBudgetSaved },
    { name: "Campaign Rescue", value: costAvoidance },
    { name: "Report Automation", value: (roi.reportTimeBefore - roi.reportTimeAfter) * 6 * 50000 }, // 6 months x Rp50K/hour
  ], [totalTimeSaved, totalBudgetSaved, costAvoidance, roi]);

  const totalSavings = savingsBreakdown.reduce((a, s) => a + s.value, 0);

  const TABS: { key: TabView; label: string; icon: React.ReactNode }[] = [
    { key: "overview", label: "Overview", icon: <BarChart3 size={16} /> },
    { key: "time-analysis", label: "Time Analysis", icon: <Clock size={16} /> },
    { key: "budget-impact", label: "Budget Impact", icon: <DollarSign size={16} /> },
    { key: "decisions", label: "Decision Quality", icon: <Brain size={16} /> },
    { key: "settings", label: "Konfigurasi", icon: <Calculator size={16} /> },
  ];

  return (
    <div className="space-y-6">
      {/* ─── HEADER ─────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground dark:text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
              <TrendingUp size={22} />
            </div>
            Revenue Impact Dashboard
          </h1>
          <p className="text-muted dark:text-gray-400 mt-1 text-sm">
            Bukti nyata ROI Marketing Suite terhadap bisnis perusahaan
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={saveData} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm">
            <Download size={16} /> Simpan Data
          </button>
        </div>
      </div>

      {/* ─── TAB BAR ────────────────────────────── */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              tab === t.key
                ? "bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-muted dark:text-gray-400 hover:text-foreground dark:hover:text-gray-200"
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ─── OVERVIEW TAB ──────────────────────── */}
      {tab === "overview" && (
        <div className="space-y-6">
          {/* Hero Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={<Clock size={20} />} label="Total Waktu Dihemat"
              value={`${fN(totalTimeSaved)} jam`}
              sub={`≈ ${(totalTimeSaved / 8).toFixed(0)} hari kerja`}
              gradient="linear-gradient(135deg, #6366f1, #8b5cf6)"
              trend={{ value: 12, positive: true }} delay={0}
            />
            <StatCard
              icon={<DollarSign size={20} />} label="Total Budget Dihemat"
              value={fRp(totalBudgetSaved)}
              sub="Dari optimasi campaign berbasis data"
              gradient="linear-gradient(135deg, #10b981, #059669)"
              trend={{ value: 18, positive: true }} delay={100}
            />
            <StatCard
              icon={<Shield size={20} />} label="Cost Avoidance"
              value={fRp(costAvoidance)}
              sub={`${roi.campaignsSavedEarly} campaign diselamatkan`}
              gradient="linear-gradient(135deg, #f59e0b, #d97706)"
              trend={{ value: 25, positive: true }} delay={200}
            />
            <StatCard
              icon={<Brain size={20} />} label="Decision Quality"
              value={fP(decisionQuality)}
              sub="Keputusan berbasis data vs intuisi"
              gradient="linear-gradient(135deg, #ec4899, #be185d)"
              trend={{ value: 8, positive: true }} delay={300}
            />
          </div>

          {/* Total ROI Card */}
          <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl p-6 md:p-8 text-white shadow-xl animate-gradient-shift relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/50 via-purple-600/50 to-pink-600/50" style={{ backgroundSize: "200% 200%" }} />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <p className="text-white/70 text-sm font-medium mb-1 flex items-center gap-2">
                  <Sparkles size={16} /> TOTAL PLATFORM ROI (6 Bulan)
                </p>
                <p className="text-4xl md:text-5xl font-extrabold tracking-tight">{fRp(totalSavings)}</p>
                <p className="text-white/70 text-sm mt-2">
                  Penghematan + Cost Avoidance dari penggunaan Marketing Suite
                </p>
              </div>
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl backdrop-blur-sm">
                  <CheckCircle2 size={16} className="text-green-300" />
                  <span>Report {reportEfficiency.toFixed(0)}% lebih cepat</span>
                </div>
                <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl backdrop-blur-sm">
                  <CheckCircle2 size={16} className="text-green-300" />
                  <span>Proses {processEfficiency.toFixed(0)}% lebih efisien</span>
                </div>
                <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl backdrop-blur-sm">
                  <CheckCircle2 size={16} className="text-green-300" />
                  <span>GMV growth rata-rata +{avgGrowth.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Impact Trend */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-border dark:border-gray-700">
              <h3 className="text-sm font-semibold text-foreground dark:text-white mb-4">📈 Tren Penghematan Bulanan</h3>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthly}>
                    <defs>
                      <linearGradient id="budgetGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}jt`} />
                    <Tooltip formatter={(v: any) => fRp(Number(v))} />
                    <Area type="monotone" dataKey="budgetSaved" name="Budget Dihemat" stroke="#6366f1" fill="url(#budgetGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Savings Breakdown */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-border dark:border-gray-700">
              <h3 className="text-sm font-semibold text-foreground dark:text-white mb-4">🎯 Breakdown Penghematan</h3>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RPie>
                    <Pie
                      data={savingsBreakdown}
                      cx="50%" cy="50%" innerRadius={60} outerRadius={100}
                      paddingAngle={4} dataKey="value"
                      label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                    >
                      {savingsBreakdown.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: any) => fRp(Number(v))} />
                  </RPie>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TIME ANALYSIS TAB ─────────────────── */}
      {tab === "time-analysis" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <GaugeCard label="Waktu Report (Sebelum → Sesudah)" value={roi.reportTimeAfter} max={roi.reportTimeBefore} unit="menit" color="#6366f1" />
            <GaugeCard label="Proses Manual → Otomatis" value={roi.automatedProcessHours} max={roi.manualProcessHours} unit="jam/bulan" color="#10b981" />
            <GaugeCard label="Total Jam Terhemat (6 Bulan)" value={totalTimeSaved} max={720} unit="jam" color="#f59e0b" />
          </div>

          {/* Before vs After Comparison */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-border dark:border-gray-700">
            <h3 className="text-lg font-semibold text-foreground dark:text-white mb-6 flex items-center gap-2">
              <Activity size={20} className="text-indigo-500" /> Before vs After Comparison
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Before */}
              <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-5 border border-red-200 dark:border-red-800/30">
                <h4 className="font-semibold text-red-700 dark:text-red-400 mb-4 flex items-center gap-2">❌ Sebelum Marketing Suite</h4>
                <ul className="space-y-3 text-sm text-red-800 dark:text-red-300">
                  <li className="flex items-start gap-2"><span>⏱️</span> Report harian = <strong>{roi.reportTimeBefore} menit</strong> (manual copy-paste)</li>
                  <li className="flex items-start gap-2"><span>📊</span> Analisis data = <strong>spreadsheet manual</strong>, rawan error</li>
                  <li className="flex items-start gap-2"><span>🚨</span> Campaign underperform terdeteksi <strong>2-3 hari terlambat</strong></li>
                  <li className="flex items-start gap-2"><span>💸</span> Keputusan budget = <strong>gut feeling</strong>, bukan data</li>
                  <li className="flex items-start gap-2"><span>🔍</span> Perbandingan antar toko = <strong>tidak ada</strong></li>
                  <li className="flex items-start gap-2"><span>📋</span> Report ke management = <strong>2+ hari persiapan</strong></li>
                </ul>
              </div>
              {/* After */}
              <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-5 border border-green-200 dark:border-green-800/30">
                <h4 className="font-semibold text-green-700 dark:text-green-400 mb-4 flex items-center gap-2">✅ Setelah Marketing Suite</h4>
                <ul className="space-y-3 text-sm text-green-800 dark:text-green-300">
                  <li className="flex items-start gap-2"><span>⚡</span> Report harian = <strong>{roi.reportTimeAfter} menit</strong> (otomatis)</li>
                  <li className="flex items-start gap-2"><span>🤖</span> AI Analyst = analisis <strong>real-time + rekomendasi</strong></li>
                  <li className="flex items-start gap-2"><span>🔔</span> Smart Alert = deteksi masalah <strong>dalam jam</strong></li>
                  <li className="flex items-start gap-2"><span>📈</span> Keputusan budget = <strong>data-driven + benchmark</strong></li>
                  <li className="flex items-start gap-2"><span>⚖️</span> Compare toko = <strong>1 klik, visualisasi lengkap</strong></li>
                  <li className="flex items-start gap-2"><span>🚀</span> Report ke management = <strong>30 menit</strong> (auto-generate)</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Time Saved Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-border dark:border-gray-700">
            <h3 className="text-sm font-semibold text-foreground dark:text-white mb-4">⏱️ Jam Terhemat per Bulan</h3>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: any) => `${v} jam`} />
                  <Bar dataKey="timeSaved" name="Jam Terhemat" fill="#6366f1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ─── BUDGET IMPACT TAB ─────────────────── */}
      {tab === "budget-impact" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={<DollarSign size={20} />} label="Budget Saved (Total)"
              value={fRp(totalBudgetSaved)} sub="6 bulan terakhir"
              gradient="linear-gradient(135deg, #10b981, #059669)" delay={0}
            />
            <StatCard
              icon={<Shield size={20} />} label="Cost Avoidance"
              value={fRp(costAvoidance)} sub={`${roi.campaignsSavedEarly} campaign rescue`}
              gradient="linear-gradient(135deg, #f59e0b, #d97706)" delay={100}
            />
            <StatCard
              icon={<TrendingUp size={20} />} label="Avg GMV Growth"
              value={`+${avgGrowth.toFixed(1)}%`} sub="Dibanding sebelum platform"
              gradient="linear-gradient(135deg, #6366f1, #4f46e5)" delay={200}
            />
            <StatCard
              icon={<Award size={20} />} label="Total ROI Platform"
              value={fRp(totalSavings)} sub="Saving + Avoidance"
              gradient="linear-gradient(135deg, #ec4899, #be185d)" delay={300}
            />
          </div>

          {/* Monthly budget impact chart */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-border dark:border-gray-700">
            <h3 className="text-sm font-semibold text-foreground dark:text-white mb-4">💰 Budget Optimization per Bulan</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthly}>
                  <defs>
                    <linearGradient id="budgetG2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="growthG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}jt`} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                  <Tooltip formatter={(v: any, name: any) => name === "GMV Growth" ? `${v}%` : fRp(Number(v))} />
                  <Legend />
                  <Area yAxisId="left" type="monotone" dataKey="budgetSaved" name="Budget Dihemat" stroke="#10b981" fill="url(#budgetG2)" strokeWidth={2} />
                  <Area yAxisId="right" type="monotone" dataKey="gmvGrowth" name="GMV Growth" stroke="#6366f1" fill="url(#growthG)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Campaign Rescue Log */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-border dark:border-gray-700">
            <h3 className="text-sm font-semibold text-foreground dark:text-white mb-4">🚨 Campaign Rescue Log</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted border-b border-border dark:border-gray-700">
                    <th className="py-2 px-3">Campaign</th>
                    <th className="py-2 px-3">Deteksi</th>
                    <th className="py-2 px-3">Masalah</th>
                    <th className="py-2 px-3">Aksi</th>
                    <th className="py-2 px-3">Saving</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-50 dark:border-gray-700/50">
                    <td className="py-3 px-3 font-medium">Summer Sale TikTok</td>
                    <td className="py-3 px-3">Hari ke-3</td>
                    <td className="py-3 px-3"><span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs">ROAS &lt; 1</span></td>
                    <td className="py-3 px-3 text-green-600">Redirect budget → Video</td>
                    <td className="py-3 px-3 font-semibold text-green-600">{fRp(5000000)}</td>
                  </tr>
                  <tr className="border-b border-gray-50 dark:border-gray-700/50">
                    <td className="py-3 px-3 font-medium">Flash Sale Shopee</td>
                    <td className="py-3 px-3">Hari ke-2</td>
                    <td className="py-3 px-3"><span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs">CTR Drop 50%</span></td>
                    <td className="py-3 px-3 text-green-600">Update creative</td>
                    <td className="py-3 px-3 font-semibold text-green-600">{fRp(3500000)}</td>
                  </tr>
                  <tr className="border-b border-gray-50 dark:border-gray-700/50">
                    <td className="py-3 px-3 font-medium">KOL Endorse Batch 3</td>
                    <td className="py-3 px-3">Hari ke-5</td>
                    <td className="py-3 px-3"><span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs">Zero Conversion</span></td>
                    <td className="py-3 px-3 text-green-600">Stop & reallocate</td>
                    <td className="py-3 px-3 font-semibold text-green-600">{fRp(6500000)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── DECISION QUALITY TAB ──────────────── */}
      {tab === "decisions" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <GaugeCard label="Data-Driven Decisions" value={decisionQuality} max={100} unit="%" color="#6366f1" />
            <GaugeCard label="Report Automation Level" value={reportEfficiency} max={100} unit="%" color="#10b981" />
            <GaugeCard label="Process Efficiency" value={processEfficiency} max={100} unit="%" color="#f59e0b" />
          </div>

          {/* Decision Trend */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-border dark:border-gray-700">
            <h3 className="text-sm font-semibold text-foreground dark:text-white mb-4">🧠 Decision Quality Trend</h3>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="decisionsDataDriven" name="Data-Driven" fill="#6366f1" radius={[6, 6, 0, 0]} stackId="a" />
                  <Bar dataKey="totalDecisions" name="Total Decisions" fill="#e2e8f0" radius={[6, 6, 0, 0]} stackId="b" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Maturity Level */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-border dark:border-gray-700">
            <h3 className="text-lg font-semibold text-foreground dark:text-white mb-5">🏆 Marketing Maturity Level</h3>
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="flex-1 space-y-4 w-full">
                {[
                  { level: 1, label: "Ad-hoc", desc: "Manual, spreadsheet-based", done: true },
                  { level: 2, label: "Managed", desc: "Centralized data, basic dashboard", done: true },
                  { level: 3, label: "Defined", desc: "Standardized KPI, automated reports", done: true },
                  { level: 4, label: "Measured", desc: "Data-driven decisions, AI insights", done: decisionQuality > 60 },
                  { level: 5, label: "Optimized", desc: "Predictive analytics, fully automated", done: false },
                ].map((item) => (
                  <div key={item.level} className={`flex items-center gap-4 px-4 py-3 rounded-xl border ${
                    item.done
                      ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-700/30"
                      : "bg-gray-50 dark:bg-gray-700/30 border-gray-200 dark:border-gray-600/30"
                  }`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      item.done ? "bg-indigo-600 text-white" : "bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400"
                    }`}>{item.level}</div>
                    <div className="flex-1">
                      <span className={`font-semibold text-sm ${item.done ? "text-indigo-700 dark:text-indigo-300" : "text-gray-500 dark:text-gray-400"}`}>{item.label}</span>
                      <p className="text-xs text-muted dark:text-gray-500">{item.desc}</p>
                    </div>
                    {item.done && <CheckCircle2 size={20} className="text-indigo-500" />}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── SETTINGS TAB ──────────────────────── */}
      {tab === "settings" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-border dark:border-gray-700">
            <h3 className="text-lg font-semibold text-foreground dark:text-white mb-5 flex items-center gap-2">
              <Calculator size={20} className="text-indigo-500" /> Konfigurasi Data ROI
            </h3>
            <p className="text-sm text-muted dark:text-gray-400 mb-6">
              Input angka-angka real dari perusahaan untuk kalkulasi ROI yang akurat.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { key: "reportTimeBefore" as const, label: "Waktu Report Sebelum (menit)", icon: "⏱️" },
                { key: "reportTimeAfter" as const, label: "Waktu Report Sesudah (menit)", icon: "⚡" },
                { key: "manualProcessHours" as const, label: "Proses Manual (jam/bulan)", icon: "📋" },
                { key: "automatedProcessHours" as const, label: "Proses Otomatis (jam/bulan)", icon: "🤖" },
                { key: "campaignsSavedEarly" as const, label: "Campaign Diselamatkan", icon: "🚨" },
                { key: "avgCampaignSavingPerDetection" as const, label: "Avg Saving per Deteksi (Rp)", icon: "💰" },
                { key: "monthlyTimeSavedHours" as const, label: "Jam Terhemat/Bulan", icon: "🕐" },
                { key: "monthlyBudgetSaved" as const, label: "Budget Dihemat/Bulan (Rp)", icon: "💎" },
              ].map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-foreground dark:text-gray-300 mb-1">
                    {field.icon} {field.label}
                  </label>
                  <input
                    type="number"
                    value={roi[field.key]}
                    onChange={(e) => setRoi((prev) => ({ ...prev, [field.key]: Number(e.target.value) || 0 }))}
                    className="w-full px-4 py-2 rounded-xl border border-border dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-foreground dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              ))}
            </div>
            <button onClick={saveData} className="mt-6 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors">
              💾 Simpan Konfigurasi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
