"use client";
import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Rocket, TrendingUp, Calendar, Target, DollarSign, BarChart3,
  ArrowUpRight, ArrowDownRight, Brain, Sparkles, Clock, CheckCircle2,
  AlertCircle, ChevronRight, ChevronLeft, Plus, Trash2,
  Milestone, Flag, Zap, Eye,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line, ReferenceLine,
} from "recharts";

/* ─── HELPERS ───────────────────────────────────── */
const fRp = (n: number) => "Rp " + Math.round(n).toLocaleString("id-ID");
const fN = (n: number) => Math.round(n).toLocaleString("id-ID");
const fP = (n: number) => n.toFixed(1) + "%";

const LS_KEY = "strategic_planning_data";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

interface ForecastData {
  month: string;
  actual: number;
  forecast: number | null;
  target: number;
}

interface MilestoneItem {
  id: string;
  title: string;
  deadline: string;
  status: "pending" | "in-progress" | "done";
  progress: number;
  owner: string;
}

interface ScenarioItem {
  id: string;
  name: string;
  budgetChange: number; // percentage change
  estimatedGMV: number;
  estimatedROAS: number;
  risk: "low" | "medium" | "high";
}

interface CampaignPlan {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  budget: number;
  channel: string;
  status: "planned" | "active" | "completed";
  color: string;
}

const DEFAULT_FORECAST: ForecastData[] = [
  { month: "Jan", actual: 1800000000, forecast: null, target: 2000000000 },
  { month: "Feb", actual: 2100000000, forecast: null, target: 2200000000 },
  { month: "Mar", actual: 2350000000, forecast: null, target: 2400000000 },
  { month: "Apr", actual: 2500000000, forecast: null, target: 2600000000 },
  { month: "Mei", actual: 2700000000, forecast: null, target: 2800000000 },
  { month: "Jun", actual: 2950000000, forecast: null, target: 3000000000 },
  { month: "Jul", actual: 0, forecast: 3100000000, target: 3200000000 },
  { month: "Agu", actual: 0, forecast: 3300000000, target: 3400000000 },
  { month: "Sep", actual: 0, forecast: 3500000000, target: 3600000000 },
  { month: "Okt", actual: 0, forecast: 3700000000, target: 3800000000 },
  { month: "Nov", actual: 0, forecast: 4100000000, target: 4000000000 },
  { month: "Des", actual: 0, forecast: 4500000000, target: 4200000000 },
];

const DEFAULT_MILESTONES: MilestoneItem[] = [
  { id: "m1", title: "Launch TikTok Shop campaign Q3", deadline: "2026-07-15", status: "in-progress", progress: 65, owner: "Sarah" },
  { id: "m2", title: "Onboard 50 new affiliates", deadline: "2026-08-01", status: "in-progress", progress: 40, owner: "Dimas" },
  { id: "m3", title: "Achieve 3B GMV milestone", deadline: "2026-06-30", status: "done", progress: 100, owner: "Tim" },
  { id: "m4", title: "Launch loyalty program", deadline: "2026-09-01", status: "pending", progress: 10, owner: "Citra" },
  { id: "m5", title: "Reduce CAC by 20%", deadline: "2026-08-31", status: "in-progress", progress: 55, owner: "Budi" },
  { id: "m6", title: "Hit 5K organic followers/month", deadline: "2026-10-01", status: "pending", progress: 0, owner: "Eka" },
];

const DEFAULT_SCENARIOS: ScenarioItem[] = [
  { id: "s1", name: "Conservative (Budget tetap)", budgetChange: 0, estimatedGMV: 3100000000, estimatedROAS: 4.2, risk: "low" },
  { id: "s2", name: "Moderate (+20% Budget)", budgetChange: 20, estimatedGMV: 3800000000, estimatedROAS: 3.8, risk: "medium" },
  { id: "s3", name: "Aggressive (+50% Budget)", budgetChange: 50, estimatedGMV: 4500000000, estimatedROAS: 3.2, risk: "high" },
];

const DEFAULT_CAMPAIGNS: CampaignPlan[] = [
  { id: "cp1", name: "Harbolnas 7.7", startDate: "2026-07-01", endDate: "2026-07-07", budget: 50000000, channel: "TikTok", status: "planned", color: "#6366f1" },
  { id: "cp2", name: "Back to School", startDate: "2026-07-10", endDate: "2026-07-25", budget: 30000000, channel: "Shopee", status: "planned", color: "#10b981" },
  { id: "cp3", name: "Harbolnas 8.8", startDate: "2026-08-01", endDate: "2026-08-08", budget: 75000000, channel: "All", status: "planned", color: "#f59e0b" },
  { id: "cp4", name: "Independence Day Sale", startDate: "2026-08-14", endDate: "2026-08-18", budget: 45000000, channel: "TikTok + Shopee", status: "planned", color: "#ef4444" },
  { id: "cp5", name: "Harbolnas 9.9", startDate: "2026-09-05", endDate: "2026-09-09", budget: 80000000, channel: "All", status: "planned", color: "#8b5cf6" },
];

type TabView = "forecast" | "scenarios" | "calendar" | "milestones" | "goals";

/* ═══════════════════════════════════════════════════
   STRATEGIC PLANNING SCREEN
   ═══════════════════════════════════════════════════ */
export default function StrategicPlanningScreen() {
  const [tab, setTab] = useState<TabView>("forecast");
  const [forecast, setForecast] = useState<ForecastData[]>(DEFAULT_FORECAST);
  const [milestones, setMilestones] = useState<MilestoneItem[]>(DEFAULT_MILESTONES);
  const [scenarios, setScenarios] = useState<ScenarioItem[]>(DEFAULT_SCENARIOS);
  const [campaigns, setCampaigns] = useState<CampaignPlan[]>(DEFAULT_CAMPAIGNS);
  const [calendarMonth, setCalendarMonth] = useState(6); // July (0-indexed)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.forecast) setForecast(parsed.forecast);
        if (parsed.milestones) setMilestones(parsed.milestones);
        if (parsed.scenarios) setScenarios(parsed.scenarios);
        if (parsed.campaigns) setCampaigns(parsed.campaigns);
      }
    } catch { /* ignore */ }
  }, []);

  const saveData = useCallback(() => {
    localStorage.setItem(LS_KEY, JSON.stringify({ forecast, milestones, scenarios, campaigns }));
  }, [forecast, milestones, scenarios, campaigns]);
  useEffect(() => { saveData(); }, [saveData]);

  /* ─── METRICS ──────────────────────────────── */
  const ytdActual = useMemo(() => forecast.filter(f => f.actual > 0).reduce((a, f) => a + f.actual, 0), [forecast]);
  const yearTarget = useMemo(() => forecast.reduce((a, f) => a + f.target, 0), [forecast]);
  const yearForecast = useMemo(() => {
    return forecast.reduce((a, f) => a + (f.actual || f.forecast || 0), 0);
  }, [forecast]);
  const ytdProgress = yearTarget > 0 ? (ytdActual / yearTarget) * 100 : 0;
  const forecastAccuracy = useMemo(() => {
    const withBoth = forecast.filter(f => f.actual > 0 && f.forecast !== null);
    if (withBoth.length === 0) return 85; // default
    const avgError = withBoth.reduce((a, f) => a + Math.abs((f.actual - (f.forecast || 0)) / f.actual), 0) / withBoth.length;
    return Math.max(0, (1 - avgError) * 100);
  }, [forecast]);
  const milestoneDone = milestones.filter(m => m.status === "done").length;
  const milestoneTotal = milestones.length;
  const totalCampaignBudget = campaigns.reduce((a, c) => a + c.budget, 0);

  const TABS: { key: TabView; label: string; icon: React.ReactNode }[] = [
    { key: "forecast", label: "Forecast", icon: <TrendingUp size={16} /> },
    { key: "scenarios", label: "What-If", icon: <Brain size={16} /> },
    { key: "calendar", label: "Campaign Calendar", icon: <Calendar size={16} /> },
    { key: "milestones", label: "Milestones", icon: <Flag size={16} /> },
    { key: "goals", label: "Goal Cascade", icon: <Target size={16} /> },
  ];

  return (
    <div className="space-y-6">
      {/* ─── HEADER ─────────────────────────────── */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground dark:text-white flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
            <Rocket size={22} />
          </div>
          Strategic Planning & Forecasting
        </h1>
        <p className="text-muted dark:text-gray-400 mt-1 text-sm">
          Perencanaan strategis, forecasting, dan scenario planning
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "YTD Actual", value: fRp(ytdActual), icon: <DollarSign size={18} />, gradient: "linear-gradient(135deg, #6366f1, #4f46e5)" },
          { label: "Year Target", value: fRp(yearTarget), icon: <Target size={18} />, gradient: "linear-gradient(135deg, #f59e0b, #d97706)" },
          { label: "YTD Progress", value: fP(ytdProgress), icon: <BarChart3 size={18} />, gradient: "linear-gradient(135deg, #10b981, #059669)" },
          { label: "Forecast Accuracy", value: fP(forecastAccuracy), icon: <Brain size={18} />, gradient: "linear-gradient(135deg, #8b5cf6, #7c3aed)" },
          { label: "Milestones", value: `${milestoneDone}/${milestoneTotal}`, icon: <Flag size={18} />, gradient: "linear-gradient(135deg, #ec4899, #be185d)" },
        ].map((s, i) => (
          <div key={i} className="relative overflow-hidden rounded-2xl p-4 text-white shadow-lg animate-fade-slide-up"
            style={{ background: s.gradient, animationDelay: `${i * 60}ms` }}>
            <div className="absolute top-0 right-0 w-16 h-16 rounded-full bg-white/10 -mr-4 -mt-4" />
            <div className="relative z-10">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center mb-2">{s.icon}</div>
              <p className="text-white/70 text-[11px] font-medium">{s.label}</p>
              <p className="text-xl font-bold mt-0.5">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ─── TAB BAR ────────────────────────────── */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 overflow-x-auto">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              tab === t.key
                ? "bg-white dark:bg-gray-700 text-violet-600 dark:text-violet-400 shadow-sm"
                : "text-muted dark:text-gray-400 hover:text-foreground dark:hover:text-gray-200"
            }`}
          >{t.icon} {t.label}</button>
        ))}
      </div>

      {/* ─── FORECAST TAB ──────────────────────── */}
      {tab === "forecast" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-border dark:border-gray-700">
            <h3 className="text-sm font-semibold text-foreground dark:text-white mb-4">📈 Revenue Forecast 2026</h3>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={forecast}>
                  <defs>
                    <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000000000).toFixed(1)}B`} />
                  <Tooltip formatter={(v: any) => fRp(Number(v))} />
                  <Legend />
                  <Area type="monotone" dataKey="target" name="Target" stroke="#f59e0b" fill="none" strokeWidth={2} strokeDasharray="5 5" />
                  <Area type="monotone" dataKey="actual" name="Actual" stroke="#6366f1" fill="url(#actualGrad)" strokeWidth={2.5} connectNulls={false} />
                  <Area type="monotone" dataKey="forecast" name="Forecast" stroke="#8b5cf6" fill="url(#forecastGrad)" strokeWidth={2} strokeDasharray="8 4" connectNulls={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Year-end projection */}
          <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/5 -mr-8 -mt-8" />
            <div className="relative z-10">
              <p className="text-white/70 text-sm mb-1 flex items-center gap-2"><Sparkles size={16} /> YEAR-END PROJECTION</p>
              <p className="text-4xl font-extrabold mb-2">{fRp(yearForecast)}</p>
              <div className="flex items-center gap-4">
                <span className={`text-sm ${yearForecast >= yearTarget ? "text-green-300" : "text-amber-300"}`}>
                  {yearForecast >= yearTarget ? "✅" : "⚠️"} {yearForecast >= yearTarget ? "On track untuk capai target!" : `Gap ${fRp(yearTarget - yearForecast)} dari target`}
                </span>
              </div>
              <div className="mt-4 h-3 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-white/50 animate-progress-fill" style={{ width: `${Math.min(ytdProgress, 100)}%` }} />
              </div>
              <p className="text-white/60 text-xs mt-1">{fP(ytdProgress)} dari target tahunan</p>
            </div>
          </div>
        </div>
      )}

      {/* ─── WHAT-IF SCENARIOS ─────────────────── */}
      {tab === "scenarios" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-border dark:border-gray-700">
            <h3 className="text-lg font-semibold text-foreground dark:text-white mb-5 flex items-center gap-2">
              <Brain size={20} className="text-violet-500" /> Budget Scenario Planning
            </h3>
            <p className="text-sm text-muted dark:text-gray-400 mb-6">
              &quot;What-if&quot; analysis — bagaimana perubahan budget mempengaruhi GMV dan ROAS
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {scenarios.map((s, i) => (
                <div key={s.id} className={`rounded-2xl p-5 border-2 transition-all hover:shadow-lg animate-fade-slide-up ${
                  s.risk === "low" ? "border-green-200 dark:border-green-700/30 bg-green-50/50 dark:bg-green-900/10" :
                  s.risk === "medium" ? "border-amber-200 dark:border-amber-700/30 bg-amber-50/50 dark:bg-amber-900/10" :
                  "border-red-200 dark:border-red-700/30 bg-red-50/50 dark:bg-red-900/10"
                }`} style={{ animationDelay: `${i * 100}ms` }}>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-foreground dark:text-white text-sm">{s.name}</h4>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      s.risk === "low" ? "bg-green-100 text-green-700" :
                      s.risk === "medium" ? "bg-amber-100 text-amber-700" :
                      "bg-red-100 text-red-700"
                    }`}>{s.risk === "low" ? "Low Risk" : s.risk === "medium" ? "Medium Risk" : "High Risk"}</span>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-muted">Budget Change</p>
                      <p className={`text-lg font-bold ${s.budgetChange === 0 ? "text-gray-600" : s.budgetChange > 0 ? "text-amber-600" : "text-green-600"}`}>
                        {s.budgetChange > 0 ? "+" : ""}{s.budgetChange}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted">Estimated GMV</p>
                      <p className="text-lg font-bold text-foreground dark:text-white">{fRp(s.estimatedGMV)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted">Expected ROAS</p>
                      <p className="text-lg font-bold text-foreground dark:text-white">{s.estimatedROAS.toFixed(1)}x</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Scenario Comparison Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-border dark:border-gray-700">
            <h3 className="text-sm font-semibold text-foreground dark:text-white mb-4">📊 Scenario Comparison</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scenarios.map(s => ({ name: s.name.split(" ")[0], gmv: s.estimatedGMV, roas: s.estimatedROAS }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000000000).toFixed(1)}B`} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}x`} />
                  <Tooltip formatter={(v: any, name: any) => name === "ROAS" ? `${v}x` : fRp(v)} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="gmv" name="Est. GMV" fill="#6366f1" radius={[8, 8, 0, 0]} />
                  <Bar yAxisId="right" dataKey="roas" name="ROAS" fill="#10b981" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ─── CAMPAIGN CALENDAR ─────────────────── */}
      {tab === "calendar" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-border dark:border-gray-700">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-foreground dark:text-white flex items-center gap-2">
                <Calendar size={20} className="text-violet-500" /> Campaign Calendar
              </h3>
              <div className="flex items-center gap-2">
                <button onClick={() => setCalendarMonth(Math.max(0, calendarMonth - 1))} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><ChevronLeft size={18} /></button>
                <span className="font-semibold text-sm text-foreground dark:text-white min-w-[80px] text-center">{MONTHS[calendarMonth]} 2026</span>
                <button onClick={() => setCalendarMonth(Math.min(11, calendarMonth + 1))} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><ChevronRight size={18} /></button>
              </div>
            </div>
            <div className="space-y-3">
              {campaigns.filter(c => {
                const start = new Date(c.startDate);
                const end = new Date(c.endDate);
                return start.getMonth() === calendarMonth || end.getMonth() === calendarMonth;
              }).length === 0 ? (
                <div className="text-center py-12 text-muted">
                  <Calendar size={40} className="mx-auto mb-3 opacity-30" />
                  <p>Belum ada campaign di bulan ini</p>
                </div>
              ) : (
                campaigns.filter(c => {
                  const start = new Date(c.startDate);
                  const end = new Date(c.endDate);
                  return start.getMonth() === calendarMonth || end.getMonth() === calendarMonth;
                }).map((c, i) => {
                  const start = new Date(c.startDate);
                  const end = new Date(c.endDate);
                  const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                  return (
                    <div key={c.id} className="flex items-center gap-4 px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-700/30 hover:shadow-sm transition-all animate-fade-slide-up"
                      style={{ animationDelay: `${i * 80}ms`, borderLeft: `4px solid ${c.color}` }}>
                      <div className="w-12 text-center">
                        <p className="text-lg font-bold text-foreground dark:text-white">{start.getDate()}</p>
                        <p className="text-[10px] text-muted">{MONTHS[start.getMonth()]}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-foreground dark:text-white truncate">{c.name}</p>
                        <p className="text-xs text-muted">{c.channel} · {days} hari · {fRp(c.budget)}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        c.status === "active" ? "bg-green-100 text-green-700" :
                        c.status === "completed" ? "bg-gray-100 text-gray-600" :
                        "bg-blue-100 text-blue-700"
                      }`}>{c.status === "active" ? "🟢 Active" : c.status === "completed" ? "✅ Done" : "📋 Planned"}</span>
                    </div>
                  );
                })
              )}
            </div>
            <div className="mt-4 pt-4 border-t border-border dark:border-gray-700 flex items-center justify-between text-sm">
              <span className="text-muted">{campaigns.filter(c => new Date(c.startDate).getMonth() === calendarMonth).length} campaigns di bulan ini</span>
              <span className="font-semibold text-foreground dark:text-white">
                Total Budget: {fRp(campaigns.filter(c => new Date(c.startDate).getMonth() === calendarMonth).reduce((a, c) => a + c.budget, 0))}
              </span>
            </div>
          </div>

          {/* Budget by month */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-border dark:border-gray-700">
            <h3 className="text-sm font-semibold text-foreground dark:text-white mb-4">💰 Campaign Budget by Month</h3>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={MONTHS.map((m, i) => ({
                  month: m,
                  budget: campaigns.filter(c => new Date(c.startDate).getMonth() === i).reduce((a, c) => a + c.budget, 0),
                  count: campaigns.filter(c => new Date(c.startDate).getMonth() === i).length,
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}jt`} />
                  <Tooltip formatter={(v: any, name: any) => name === "Campaigns" ? `${v}` : fRp(v)} />
                  <Legend />
                  <Bar dataKey="budget" name="Budget" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ─── MILESTONES ────────────────────────── */}
      {tab === "milestones" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-border dark:border-gray-700">
            <h3 className="text-lg font-semibold text-foreground dark:text-white mb-5 flex items-center gap-2">
              <Flag size={20} className="text-violet-500" /> Strategic Milestones
            </h3>
            <div className="space-y-3">
              {milestones.map((m, i) => (
                <div key={m.id} className={`flex items-center gap-4 px-4 py-4 rounded-xl border transition-all animate-fade-slide-up ${
                  m.status === "done" ? "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-700/30" :
                  m.status === "in-progress" ? "bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-700/30" :
                  "bg-gray-50 dark:bg-gray-700/20 border-gray-200 dark:border-gray-600/30"
                }`} style={{ animationDelay: `${i * 60}ms` }}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    m.status === "done" ? "bg-green-500 text-white" :
                    m.status === "in-progress" ? "bg-blue-500 text-white" :
                    "bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400"
                  }`}>
                    {m.status === "done" ? <CheckCircle2 size={20} /> : m.status === "in-progress" ? <Clock size={20} /> : <Target size={20} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-sm ${m.status === "done" ? "line-through text-green-700 dark:text-green-400" : "text-foreground dark:text-white"}`}>{m.title}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-muted">👤 {m.owner}</span>
                      <span className="text-xs text-muted">📅 {m.deadline}</span>
                    </div>
                    {m.status !== "done" && (
                      <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full animate-progress-fill ${m.status === "in-progress" ? "bg-blue-500" : "bg-gray-400"}`}
                          style={{ width: `${m.progress}%` }} />
                      </div>
                    )}
                  </div>
                  <span className="text-sm font-bold" style={{ color: m.status === "done" ? "#10b981" : m.progress >= 50 ? "#6366f1" : "#ef4444" }}>
                    {m.progress}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── GOAL CASCADE ──────────────────────── */}
      {tab === "goals" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-border dark:border-gray-700">
            <h3 className="text-lg font-semibold text-foreground dark:text-white mb-5 flex items-center gap-2">
              <Target size={20} className="text-violet-500" /> Goal Cascade: Perusahaan → Departemen → Individu
            </h3>

            {/* Company Level */}
            <div className="bg-gradient-to-r from-violet-600 to-purple-700 rounded-2xl p-5 text-white mb-4">
              <p className="text-xs text-white/60 font-medium mb-1">🏢 COMPANY GOAL</p>
              <p className="text-xl font-bold">Achieve {fRp(yearTarget)} GMV in 2026</p>
              <div className="mt-3 h-3 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-white/50 rounded-full animate-progress-fill" style={{ width: `${Math.min(ytdProgress, 100)}%` }} />
              </div>
              <p className="text-white/60 text-xs mt-1">{fP(ytdProgress)} achieved — {fRp(ytdActual)} of {fRp(yearTarget)}</p>
            </div>

            {/* Department Level */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6 mb-4">
              {[
                { dept: "Marketing", target: "Drive 60% of GMV via digital channels", progress: 72, color: "#6366f1" },
                { dept: "Sales (Affiliate)", target: "Onboard 100 active affiliates", progress: 55, color: "#10b981" },
                { dept: "Content", target: "Produce 500+ quality content/month", progress: 68, color: "#f59e0b" },
                { dept: "Ads", target: "Maintain ROAS > 4.0x", progress: 85, color: "#ef4444" },
              ].map((d, i) => (
                <div key={i} className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4 border-l-4 animate-fade-slide-up"
                  style={{ borderLeftColor: d.color, animationDelay: `${i * 80}ms` }}>
                  <p className="text-xs text-muted mb-1 font-medium">📊 {d.dept}</p>
                  <p className="font-semibold text-sm text-foreground dark:text-white mb-2">{d.target}</p>
                  <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                    <div className="h-full rounded-full animate-progress-fill" style={{ width: `${d.progress}%`, backgroundColor: d.color }} />
                  </div>
                  <p className="text-xs text-muted mt-1">{d.progress}% achieved</p>
                </div>
              ))}
            </div>

            {/* Individual Level */}
            <div className="ml-12 grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { name: "Sarah", target: "120 content/bulan", progress: 92, emoji: "👩‍💼" },
                { name: "Budi", target: "ROAS 4.5x", progress: 78, emoji: "👨‍💻" },
                { name: "Citra", target: "200 upload/bulan", progress: 95, emoji: "👩‍🎨" },
                { name: "Dimas", target: "50 affiliates aktif", progress: 60, emoji: "👨‍🔧" },
                { name: "Eka", target: "150 creative assets", progress: 88, emoji: "👩‍🎨" },
                { name: "Fajar", target: "80 live sessions", progress: 72, emoji: "🎙️" },
              ].map((p, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white dark:bg-gray-800 border border-border dark:border-gray-600/30 text-sm animate-fade-slide-up"
                  style={{ animationDelay: `${(i + 4) * 60}ms` }}>
                  <span className="text-xl">{p.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-xs text-foreground dark:text-white truncate">{p.name}: {p.target}</p>
                    <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mt-1">
                      <div className={`h-full rounded-full animate-progress-fill ${p.progress >= 80 ? "bg-green-500" : p.progress >= 60 ? "bg-amber-500" : "bg-red-500"}`}
                        style={{ width: `${p.progress}%` }} />
                    </div>
                  </div>
                  <span className={`text-xs font-bold ${p.progress >= 80 ? "text-green-600" : p.progress >= 60 ? "text-amber-600" : "text-red-600"}`}>{p.progress}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
