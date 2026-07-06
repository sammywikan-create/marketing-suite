"use client";
import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Users, Trophy, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  Award, Star, Target, BarChart3, Clock, CheckCircle2, AlertCircle,
  Zap, Flame, Crown, Medal, Brain, Sparkles, Calendar, DollarSign,
  UserCheck, ClipboardCheck, Activity,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, LineChart, Line, PieChart, Pie, Cell,
} from "recharts";

/* ─── HELPERS ───────────────────────────────────── */
const fRp = (n: number) => "Rp " + Math.round(n).toLocaleString("id-ID");
const fN = (n: number) => Math.round(n).toLocaleString("id-ID");
const fP = (n: number) => n.toFixed(1) + "%";

const LS_KEY = "team_performance_data";

interface TeamMember {
  id: string;
  name: string;
  role: string;
  avatar: string;
  department: string;
  tasksCompleted: number;
  tasksTotal: number;
  tasksOnTime: number;
  gmvContribution: number;
  contentCreated: number;
  campaignsManaged: number;
  okrScore: number;
  responseTime: number; // hours avg
  monthlyScores: number[]; // last 6 months
}

const DEFAULT_TEAM: TeamMember[] = [
  {
    id: "t1", name: "Sarah Ahmad", role: "Content Lead", avatar: "👩‍💼",
    department: "Konseptor", tasksCompleted: 45, tasksTotal: 50, tasksOnTime: 42,
    gmvContribution: 450000000, contentCreated: 120, campaignsManaged: 8,
    okrScore: 92, responseTime: 1.5, monthlyScores: [78, 82, 85, 88, 90, 92],
  },
  {
    id: "t2", name: "Budi Santoso", role: "Ads Specialist", avatar: "👨‍💻",
    department: "Advertiser", tasksCompleted: 38, tasksTotal: 42, tasksOnTime: 35,
    gmvContribution: 680000000, contentCreated: 45, campaignsManaged: 15,
    okrScore: 88, responseTime: 2.0, monthlyScores: [72, 78, 82, 85, 86, 88],
  },
  {
    id: "t3", name: "Citra Dewi", role: "SMO Manager", avatar: "👩‍🎨",
    department: "SMO", tasksCompleted: 52, tasksTotal: 55, tasksOnTime: 50,
    gmvContribution: 320000000, contentCreated: 200, campaignsManaged: 12,
    okrScore: 95, responseTime: 1.0, monthlyScores: [80, 85, 88, 90, 93, 95],
  },
  {
    id: "t4", name: "Dimas Prakoso", role: "Affiliate Manager", avatar: "👨‍🔧",
    department: "Affiliate", tasksCompleted: 30, tasksTotal: 40, tasksOnTime: 25,
    gmvContribution: 550000000, contentCreated: 30, campaignsManaged: 6,
    okrScore: 72, responseTime: 4.0, monthlyScores: [60, 65, 68, 70, 71, 72],
  },
  {
    id: "t5", name: "Eka Putri", role: "Creative Designer", avatar: "👩‍🎨",
    department: "Konseptor", tasksCompleted: 60, tasksTotal: 65, tasksOnTime: 58,
    gmvContribution: 280000000, contentCreated: 180, campaignsManaged: 5,
    okrScore: 90, responseTime: 1.2, monthlyScores: [75, 80, 84, 87, 89, 90],
  },
  {
    id: "t6", name: "Fajar Rahman", role: "Live Streamer", avatar: "🎙️",
    department: "SMO", tasksCompleted: 42, tasksTotal: 48, tasksOnTime: 38,
    gmvContribution: 420000000, contentCreated: 90, campaignsManaged: 10,
    okrScore: 85, responseTime: 1.8, monthlyScores: [70, 75, 78, 80, 83, 85],
  },
];

type TabView = "leaderboard" | "scorecard" | "workload" | "growth" | "coaching";

const RANK_COLORS = ["#fbbf24", "#94a3b8", "#cd7f32", "#6366f1", "#10b981", "#f59e0b"];
const PIE_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899"];

/* ═══════════════════════════════════════════════════
   TEAM PERFORMANCE SCREEN
   ═══════════════════════════════════════════════════ */
export default function TeamPerformanceScreen() {
  const [tab, setTab] = useState<TabView>("leaderboard");
  const [team, setTeam] = useState<TeamMember[]>(DEFAULT_TEAM);
  const [selectedMonth, setSelectedMonth] = useState(5); // index of last month

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.team) setTeam(parsed.team);
      }
    } catch { /* ignore */ }
  }, []);

  /* ─── COMPUTED ─────────────────────────────── */
  const sorted = useMemo(() => [...team].sort((a, b) => b.okrScore - a.okrScore), [team]);
  const avgScore = useMemo(() => team.reduce((a, t) => a + t.okrScore, 0) / team.length, [team]);
  const totalGMV = useMemo(() => team.reduce((a, t) => a + t.gmvContribution, 0), [team]);
  const avgTaskCompletion = useMemo(() => {
    const sum = team.reduce((a, t) => a + (t.tasksTotal > 0 ? (t.tasksCompleted / t.tasksTotal) * 100 : 0), 0);
    return sum / team.length;
  }, [team]);
  const avgOnTimeRate = useMemo(() => {
    const sum = team.reduce((a, t) => a + (t.tasksCompleted > 0 ? (t.tasksOnTime / t.tasksCompleted) * 100 : 0), 0);
    return sum / team.length;
  }, [team]);

  /* ─── RADAR DATA ──────────────────────────── */
  const radarData = useMemo(() => {
    const metrics = ["OKR Score", "Task Rate", "On-Time", "Content", "GMV Contrib"];
    const maxGMV = Math.max(...team.map(t => t.gmvContribution));
    const maxContent = Math.max(...team.map(t => t.contentCreated));
    return metrics.map((m, i) => {
      const row: Record<string, string | number> = { metric: m };
      team.forEach((t) => {
        if (i === 0) row[t.name] = t.okrScore;
        else if (i === 1) row[t.name] = t.tasksTotal > 0 ? Math.round((t.tasksCompleted / t.tasksTotal) * 100) : 0;
        else if (i === 2) row[t.name] = t.tasksCompleted > 0 ? Math.round((t.tasksOnTime / t.tasksCompleted) * 100) : 0;
        else if (i === 3) row[t.name] = maxContent > 0 ? Math.round((t.contentCreated / maxContent) * 100) : 0;
        else row[t.name] = maxGMV > 0 ? Math.round((t.gmvContribution / maxGMV) * 100) : 0;
      });
      return row;
    });
  }, [team]);

  const TABS: { key: TabView; label: string; icon: React.ReactNode }[] = [
    { key: "leaderboard", label: "Leaderboard", icon: <Trophy size={16} /> },
    { key: "scorecard", label: "Scorecard", icon: <ClipboardCheck size={16} /> },
    { key: "workload", label: "Workload", icon: <Activity size={16} /> },
    { key: "growth", label: "Growth Trend", icon: <TrendingUp size={16} /> },
    { key: "coaching", label: "Coaching", icon: <Brain size={16} /> },
  ];

  return (
    <div className="space-y-6">
      {/* ─── HEADER ─────────────────────────────── */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground dark:text-white flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg">
            <Users size={22} />
          </div>
          Team Performance Dashboard
        </h1>
        <p className="text-muted dark:text-gray-400 mt-1 text-sm">
          Monitor performa, accountability, dan pengembangan tim
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Avg OKR Score", value: fP(avgScore), icon: <Target size={20} />, gradient: "linear-gradient(135deg, #6366f1, #4f46e5)" },
          { label: "Total GMV Contribution", value: fRp(totalGMV), icon: <DollarSign size={20} />, gradient: "linear-gradient(135deg, #10b981, #059669)" },
          { label: "Task Completion", value: fP(avgTaskCompletion), icon: <CheckCircle2 size={20} />, gradient: "linear-gradient(135deg, #f59e0b, #d97706)" },
          { label: "On-Time Rate", value: fP(avgOnTimeRate), icon: <Clock size={20} />, gradient: "linear-gradient(135deg, #06b6d4, #0891b2)" },
        ].map((s, i) => (
          <div key={i} className="relative overflow-hidden rounded-2xl p-5 text-white shadow-lg animate-fade-slide-up"
            style={{ background: s.gradient, animationDelay: `${i * 80}ms` }}>
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-white/10 -mr-6 -mt-6" />
            <div className="relative z-10">
              <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center mb-3">{s.icon}</div>
              <p className="text-white/70 text-xs font-medium">{s.label}</p>
              <p className="text-2xl font-bold mt-1">{s.value}</p>
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
                ? "bg-white dark:bg-gray-700 text-amber-600 dark:text-amber-400 shadow-sm"
                : "text-muted dark:text-gray-400 hover:text-foreground dark:hover:text-gray-200"
            }`}
          >{t.icon} {t.label}</button>
        ))}
      </div>

      {/* ─── LEADERBOARD ───────────────────────── */}
      {tab === "leaderboard" && (
        <div className="space-y-6">
          {/* Top 3 Podium */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {sorted.slice(0, 3).map((m, i) => (
              <div key={m.id} className={`relative overflow-hidden rounded-2xl p-6 text-center shadow-lg animate-fade-slide-up ${
                i === 0 ? "bg-gradient-to-br from-amber-400 to-yellow-500 text-amber-900 md:order-2 md:-mt-4" :
                i === 1 ? "bg-gradient-to-br from-gray-300 to-gray-400 text-gray-800 md:order-1" :
                "bg-gradient-to-br from-amber-700 to-amber-800 text-amber-100 md:order-3"
              }`} style={{ animationDelay: `${i * 100}ms` }}>
                <div className="absolute top-2 right-3 text-4xl opacity-20">{i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}</div>
                <div className="text-4xl mb-2">{m.avatar}</div>
                <div className="text-3xl mb-1">{i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}</div>
                <h3 className="font-bold text-lg">{m.name}</h3>
                <p className="text-sm opacity-80">{m.role}</p>
                <div className="mt-3 text-3xl font-extrabold">{m.okrScore}</div>
                <p className="text-xs opacity-70">OKR Score</p>
              </div>
            ))}
          </div>

          {/* Full Ranking */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-border dark:border-gray-700">
            <h3 className="text-sm font-semibold text-foreground dark:text-white mb-4">🏅 Full Ranking</h3>
            <div className="space-y-2">
              {sorted.map((m, i) => {
                const taskRate = m.tasksTotal > 0 ? (m.tasksCompleted / m.tasksTotal) * 100 : 0;
                return (
                  <div key={m.id} className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all hover:shadow-sm animate-fade-slide-up ${
                    i < 3 ? "bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-700/20" : "bg-gray-50 dark:bg-gray-700/30"
                  }`} style={{ animationDelay: `${i * 60}ms` }}>
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      i === 0 ? "bg-amber-400 text-amber-900" : i === 1 ? "bg-gray-300 text-gray-700" : i === 2 ? "bg-amber-700 text-amber-100" : "bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-400"
                    }`}>{i + 1}</span>
                    <span className="text-2xl">{m.avatar}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground dark:text-white truncate">{m.name}</p>
                      <p className="text-xs text-muted">{m.role} · {m.department}</p>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="hidden md:block text-center">
                        <p className="text-xs text-muted">Task</p>
                        <p className="font-semibold">{fP(taskRate)}</p>
                      </div>
                      <div className="hidden md:block text-center">
                        <p className="text-xs text-muted">GMV</p>
                        <p className="font-semibold">{fRp(m.gmvContribution)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted">Score</p>
                        <p className={`text-xl font-bold ${m.okrScore >= 90 ? "text-green-600" : m.okrScore >= 70 ? "text-amber-600" : "text-red-600"}`}>{m.okrScore}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─── SCORECARD ─────────────────────────── */}
      {tab === "scorecard" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-border dark:border-gray-700">
            <h3 className="text-sm font-semibold text-foreground dark:text-white mb-4">🎯 Team Radar Comparison</h3>
            <div className="h-[380px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                  {team.slice(0, 4).map((m, i) => (
                    <Radar key={m.id} name={m.name} dataKey={m.name}
                      stroke={PIE_COLORS[i]} fill={PIE_COLORS[i]} fillOpacity={0.15} strokeWidth={2} />
                  ))}
                  <Legend />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Individual Scorecards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {team.map((m, i) => {
              const taskRate = m.tasksTotal > 0 ? (m.tasksCompleted / m.tasksTotal) * 100 : 0;
              const onTime = m.tasksCompleted > 0 ? (m.tasksOnTime / m.tasksCompleted) * 100 : 0;
              return (
                <div key={m.id} className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-border dark:border-gray-700 animate-fade-slide-up" style={{ animationDelay: `${i * 60}ms` }}>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-3xl">{m.avatar}</span>
                    <div>
                      <h4 className="font-semibold text-foreground dark:text-white text-sm">{m.name}</h4>
                      <p className="text-xs text-muted">{m.role}</p>
                    </div>
                    <div className={`ml-auto text-2xl font-extrabold animate-score-reveal ${m.okrScore >= 90 ? "text-green-600" : m.okrScore >= 70 ? "text-amber-600" : "text-red-600"}`}>
                      {m.okrScore}
                    </div>
                  </div>
                  {[
                    { label: "Task Completion", value: taskRate, color: "#6366f1" },
                    { label: "On-Time Rate", value: onTime, color: "#10b981" },
                    { label: "OKR Achievement", value: m.okrScore, color: "#f59e0b" },
                  ].map((bar) => (
                    <div key={bar.label} className="mb-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted">{bar.label}</span>
                        <span className="font-semibold">{fP(bar.value)}</span>
                      </div>
                      <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full rounded-full animate-progress-fill" style={{ width: `${bar.value}%`, backgroundColor: bar.color }} />
                      </div>
                    </div>
                  ))}
                  <div className="mt-3 pt-3 border-t border-border dark:border-gray-700 grid grid-cols-3 gap-2 text-center text-xs">
                    <div><p className="text-muted">Content</p><p className="font-bold">{m.contentCreated}</p></div>
                    <div><p className="text-muted">Campaigns</p><p className="font-bold">{m.campaignsManaged}</p></div>
                    <div><p className="text-muted">Resp. Time</p><p className="font-bold">{m.responseTime}h</p></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── WORKLOAD ──────────────────────────── */}
      {tab === "workload" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-border dark:border-gray-700">
            <h3 className="text-sm font-semibold text-foreground dark:text-white mb-4">📊 Workload Distribution</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={team.map(m => ({ name: m.name.split(" ")[0], completed: m.tasksCompleted, remaining: m.tasksTotal - m.tasksCompleted, campaigns: m.campaignsManaged }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="completed" name="Selesai" fill="#10b981" stackId="tasks" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="remaining" name="Sisa" fill="#ef4444" stackId="tasks" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* GMV Contribution */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-border dark:border-gray-700">
            <h3 className="text-sm font-semibold text-foreground dark:text-white mb-4">💰 GMV Contribution per Person</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[...team].sort((a, b) => b.gmvContribution - a.gmvContribution).map(m => ({ name: m.name.split(" ")[0], gmv: m.gmvContribution }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}jt`} />
                  <Tooltip formatter={(v: any) => fRp(Number(v))} />
                  <Bar dataKey="gmv" name="GMV" radius={[8, 8, 0, 0]}>
                    {[...team].sort((a, b) => b.gmvContribution - a.gmvContribution).map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ─── GROWTH TREND ──────────────────────── */}
      {tab === "growth" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-border dark:border-gray-700">
            <h3 className="text-sm font-semibold text-foreground dark:text-white mb-4">📈 OKR Score Growth (6 Months)</h3>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={["Jan", "Feb", "Mar", "Apr", "Mei", "Jun"].map((month, mi) => {
                  const row: Record<string, string | number> = { month };
                  team.forEach(m => { row[m.name.split(" ")[0]] = m.monthlyScores[mi] || 0; });
                  return row;
                })}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} domain={[50, 100]} />
                  <Tooltip />
                  <Legend />
                  {team.map((m, i) => (
                    <Line key={m.id} type="monotone" dataKey={m.name.split(" ")[0]}
                      stroke={PIE_COLORS[i % PIE_COLORS.length]} strokeWidth={2} dot={{ r: 4 }} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ─── COACHING ──────────────────────────── */}
      {tab === "coaching" && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-2xl p-6 border border-amber-200 dark:border-amber-800/30">
            <h3 className="text-lg font-bold text-amber-700 dark:text-amber-400 mb-4 flex items-center gap-2">
              <Brain size={20} /> AI Coaching Recommendations
            </h3>
            <div className="space-y-4">
              {sorted.map((m) => {
                const taskRate = m.tasksTotal > 0 ? (m.tasksCompleted / m.tasksTotal) * 100 : 0;
                const onTime = m.tasksCompleted > 0 ? (m.tasksOnTime / m.tasksCompleted) * 100 : 0;
                const growth = m.monthlyScores.length >= 2 ? m.monthlyScores[m.monthlyScores.length - 1] - m.monthlyScores[0] : 0;
                const isTopPerformer = m.okrScore >= 90;
                const needsCoaching = m.okrScore < 75 || onTime < 70;
                return (
                  <div key={m.id} className={`bg-white dark:bg-gray-800 rounded-xl p-4 border ${needsCoaching ? "border-red-200 dark:border-red-700/30" : isTopPerformer ? "border-green-200 dark:border-green-700/30" : "border-gray-200 dark:border-gray-600/30"}`}>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{m.avatar}</span>
                      <div className="flex-1">
                        <p className="font-semibold text-sm text-foreground dark:text-white">{m.name}</p>
                        <p className="text-xs text-muted">{m.role} · Score: {m.okrScore}</p>
                      </div>
                      {isTopPerformer && <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs flex items-center gap-1"><Star size={12} /> Top Performer</span>}
                      {needsCoaching && <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs flex items-center gap-1"><AlertCircle size={12} /> Needs Coaching</span>}
                      {!isTopPerformer && !needsCoaching && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs flex items-center gap-1"><TrendingUp size={12} /> Growing</span>}
                    </div>
                    <div className="text-sm text-foreground dark:text-gray-300">
                      {isTopPerformer && (
                        <p>✅ <strong>Reward & Retain:</strong> Pertahankan momentum. Consider sebagai mentor untuk tim lain. Growth {growth > 0 ? `+${growth}` : growth} points dalam 6 bulan.</p>
                      )}
                      {needsCoaching && (
                        <div>
                          <p>🔍 <strong>Area Improvement:</strong></p>
                          <ul className="list-disc list-inside ml-2 text-xs mt-1 space-y-1">
                            {taskRate < 80 && <li>Task completion {fP(taskRate)} — target minimal 85%</li>}
                            {onTime < 70 && <li>On-time rate {fP(onTime)} — perlu time management training</li>}
                            {m.responseTime > 3 && <li>Response time {m.responseTime}h — terlalu lambat, target &lt;2h</li>}
                            <li>Jadwalkan 1-on-1 coaching mingguan selama 1 bulan</li>
                          </ul>
                        </div>
                      )}
                      {!isTopPerformer && !needsCoaching && (
                        <p>📈 <strong>Keep Growing:</strong> Growth +{growth} points. {m.contentCreated > 100 ? "Produktivitas konten sangat baik." : "Tingkatkan produktivitas konten."} {m.campaignsManaged > 10 ? "Campaign management kuat." : "Berikan lebih banyak campaign ownership."}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
