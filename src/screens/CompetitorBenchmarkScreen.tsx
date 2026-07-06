"use client";
import { useState, useMemo, useCallback, useEffect } from "react";
import {
  Globe, TrendingUp, TrendingDown, Search, Plus, Trash2, Edit3,
  ArrowUpRight, ArrowDownRight, BarChart3, Target, Award, Eye,
  DollarSign, Zap, Shield, AlertCircle, CheckCircle2, Sparkles,
  Download, PieChart as PieChartIcon, Users, Star,
} from "lucide-react";
import {
  ResponsiveContainer, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line,
} from "recharts";

/* ─── HELPERS ───────────────────────────────────── */
const fRp = (n: number) => "Rp " + Math.round(n).toLocaleString("id-ID");
const fN = (n: number) => Math.round(n).toLocaleString("id-ID");
const fP = (n: number) => n.toFixed(1) + "%";

const LS_KEY = "competitor_benchmark_data";

interface Competitor {
  id: string;
  name: string;
  color: string;
  marketShare: number;
  avgPrice: number;
  productCount: number;
  socialFollowers: number;
  contentFrequency: number; // posts per week
  estimatedGMV: number;
  ctr: number;
  conversionRate: number;
  strengths: string[];
  weaknesses: string[];
}

interface IndustryBenchmark {
  metric: string;
  ours: number;
  industry: number;
  topPerformer: number;
  unit: string;
}

const DEFAULT_COMPETITORS: Competitor[] = [
  {
    id: "c1", name: "Kompetitor A", color: "#ef4444", marketShare: 25,
    avgPrice: 185000, productCount: 120, socialFollowers: 450000,
    contentFrequency: 14, estimatedGMV: 2500000000, ctr: 3.2,
    conversionRate: 2.8, strengths: ["Brand awareness tinggi", "Budget iklan besar"],
    weaknesses: ["Harga mahal", "Customer service lambat"],
  },
  {
    id: "c2", name: "Kompetitor B", color: "#f59e0b", marketShare: 18,
    avgPrice: 120000, productCount: 85, socialFollowers: 280000,
    contentFrequency: 10, estimatedGMV: 1800000000, ctr: 2.5,
    conversionRate: 3.1, strengths: ["Harga kompetitif", "Delivery cepat"],
    weaknesses: ["Variasi produk kurang", "Social media lemah"],
  },
  {
    id: "c3", name: "Kompetitor C", color: "#8b5cf6", marketShare: 12,
    avgPrice: 95000, productCount: 200, socialFollowers: 150000,
    contentFrequency: 20, estimatedGMV: 1200000000, ctr: 4.1,
    conversionRate: 1.9, strengths: ["Katalog produk luas", "Konten agresif"],
    weaknesses: ["Margin tipis", "Refund rate tinggi"],
  },
];

const DEFAULT_OUR_DATA: Competitor = {
  id: "ours", name: "Perusahaan Kita", color: "#1a237e", marketShare: 20,
  avgPrice: 150000, productCount: 95, socialFollowers: 320000,
  contentFrequency: 12, estimatedGMV: 2000000000, ctr: 3.8,
  conversionRate: 3.5, strengths: ["Data-driven", "Tim agile", "Product quality"],
  weaknesses: ["Brand awareness masih berkembang"],
};

const DEFAULT_BENCHMARKS: IndustryBenchmark[] = [
  { metric: "CTR", ours: 3.8, industry: 2.5, topPerformer: 5.2, unit: "%" },
  { metric: "Conversion Rate", ours: 3.5, industry: 2.0, topPerformer: 4.8, unit: "%" },
  { metric: "ROAS", ours: 4.2, industry: 3.0, topPerformer: 6.5, unit: "x" },
  { metric: "Refund Rate", ours: 2.1, industry: 4.5, topPerformer: 1.5, unit: "%" },
  { metric: "Repeat Purchase", ours: 22, industry: 15, topPerformer: 35, unit: "%" },
  { metric: "Customer Satisfaction", ours: 4.2, industry: 3.8, topPerformer: 4.7, unit: "/5" },
];

type TabView = "overview" | "market-share" | "pricing" | "benchmark" | "swot";

/* ═══════════════════════════════════════════════════
   COMPETITOR BENCHMARK SCREEN
   ═══════════════════════════════════════════════════ */
export default function CompetitorBenchmarkScreen() {
  const [tab, setTab] = useState<TabView>("overview");
  const [competitors, setCompetitors] = useState<Competitor[]>(DEFAULT_COMPETITORS);
  const [ourData, setOurData] = useState<Competitor>(DEFAULT_OUR_DATA);
  const [benchmarks, setBenchmarks] = useState<IndustryBenchmark[]>(DEFAULT_BENCHMARKS);
  const [editingCompetitor, setEditingCompetitor] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");

  // Load from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.competitors) setCompetitors(parsed.competitors);
        if (parsed.ourData) setOurData(parsed.ourData);
        if (parsed.benchmarks) setBenchmarks(parsed.benchmarks);
      }
    } catch { /* ignore */ }
  }, []);

  const saveData = useCallback(() => {
    localStorage.setItem(LS_KEY, JSON.stringify({ competitors, ourData, benchmarks }));
  }, [competitors, ourData, benchmarks]);

  // Auto-save on change
  useEffect(() => { saveData(); }, [saveData]);

  const allPlayers = useMemo(() => [ourData, ...competitors], [ourData, competitors]);
  const totalMarket = useMemo(() => allPlayers.reduce((a, c) => a + c.marketShare, 0), [allPlayers]);

  /* ─── RADAR DATA ──────────────────────────── */
  const radarData = useMemo(() => {
    const metrics = [
      { key: "marketShare", label: "Market Share", max: 30 },
      { key: "ctr", label: "CTR", max: 6 },
      { key: "conversionRate", label: "Conversion", max: 5 },
      { key: "contentFrequency", label: "Content/Week", max: 25 },
      { key: "socialFollowers", label: "Followers", max: 500000 },
    ];
    return metrics.map((m) => {
      const row: Record<string, string | number> = { metric: m.label };
      allPlayers.forEach((p) => {
        const val = (p as unknown as Record<string, number>)[m.key];
        row[p.name] = Math.round((val / m.max) * 100);
      });
      return row;
    });
  }, [allPlayers]);

  const addCompetitor = useCallback(() => {
    if (!newName.trim()) return;
    const colors = ["#ef4444", "#f59e0b", "#8b5cf6", "#06b6d4", "#ec4899", "#14b8a6"];
    setCompetitors((prev) => [...prev, {
      id: `c${Date.now()}`, name: newName.trim(),
      color: colors[prev.length % colors.length],
      marketShare: 10, avgPrice: 100000, productCount: 50,
      socialFollowers: 100000, contentFrequency: 5,
      estimatedGMV: 500000000, ctr: 2.0, conversionRate: 2.0,
      strengths: [], weaknesses: [],
    }]);
    setNewName("");
    setShowAddForm(false);
  }, [newName]);

  const removeCompetitor = useCallback((id: string) => {
    setCompetitors((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const TABS: { key: TabView; label: string; icon: React.ReactNode }[] = [
    { key: "overview", label: "Overview", icon: <Globe size={16} /> },
    { key: "market-share", label: "Market Share", icon: <PieChartIcon size={16} /> },
    { key: "pricing", label: "Pricing Intel", icon: <DollarSign size={16} /> },
    { key: "benchmark", label: "Industry Benchmark", icon: <BarChart3 size={16} /> },
    { key: "swot", label: "SWOT Analysis", icon: <Shield size={16} /> },
  ];

  return (
    <div className="space-y-6">
      {/* ─── HEADER ─────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground dark:text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white shadow-lg">
              <Globe size={22} />
            </div>
            Competitive Intelligence
          </h1>
          <p className="text-muted dark:text-gray-400 mt-1 text-sm">
            Analisis posisi pasar dan benchmark kompetitor
          </p>
        </div>
        <button onClick={() => setShowAddForm(true)} className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-xl text-sm font-medium hover:bg-orange-700 transition-colors shadow-sm">
          <Plus size={16} /> Tambah Kompetitor
        </button>
      </div>

      {/* Add Competitor Modal */}
      {showAddForm && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-border dark:border-gray-700 animate-fade-slide-up">
          <h3 className="font-semibold text-foreground dark:text-white mb-3">Tambah Kompetitor Baru</h3>
          <div className="flex gap-3">
            <input
              type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
              placeholder="Nama kompetitor..."
              className="flex-1 px-4 py-2 rounded-xl border border-border dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-foreground dark:text-white text-sm focus:ring-2 focus:ring-orange-500"
              onKeyDown={(e) => e.key === "Enter" && addCompetitor()}
            />
            <button onClick={addCompetitor} className="px-4 py-2 bg-orange-600 text-white rounded-xl text-sm font-medium hover:bg-orange-700">Tambah</button>
            <button onClick={() => setShowAddForm(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-foreground dark:text-gray-300 rounded-xl text-sm hover:bg-gray-300 dark:hover:bg-gray-600">Batal</button>
          </div>
        </div>
      )}

      {/* ─── TAB BAR ────────────────────────────── */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 overflow-x-auto">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              tab === t.key
                ? "bg-white dark:bg-gray-700 text-orange-600 dark:text-orange-400 shadow-sm"
                : "text-muted dark:text-gray-400 hover:text-foreground dark:hover:text-gray-200"
            }`}
          >{t.icon} {t.label}</button>
        ))}
      </div>

      {/* ─── OVERVIEW ──────────────────────────── */}
      {tab === "overview" && (
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 text-white shadow-lg animate-fade-slide-up">
              <div className="flex items-center gap-2 mb-2"><Target size={18} className="text-blue-200" /><span className="text-xs text-blue-200 font-medium">Market Share Kita</span></div>
              <p className="text-3xl font-bold">{fP(ourData.marketShare)}</p>
              <p className="text-xs text-blue-200 mt-1">dari total {totalMarket}% tracked</p>
            </div>
            <div className="bg-gradient-to-br from-green-600 to-emerald-700 rounded-2xl p-5 text-white shadow-lg animate-fade-slide-up" style={{ animationDelay: "100ms" }}>
              <div className="flex items-center gap-2 mb-2"><TrendingUp size={18} className="text-green-200" /><span className="text-xs text-green-200 font-medium">Posisi CTR</span></div>
              <p className="text-3xl font-bold">{fP(ourData.ctr)}</p>
              <p className="text-xs text-green-200 mt-1">#{allPlayers.sort((a, b) => b.ctr - a.ctr).findIndex(p => p.id === ourData.id) + 1} dari {allPlayers.length}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-600 to-violet-700 rounded-2xl p-5 text-white shadow-lg animate-fade-slide-up" style={{ animationDelay: "200ms" }}>
              <div className="flex items-center gap-2 mb-2"><Award size={18} className="text-purple-200" /><span className="text-xs text-purple-200 font-medium">Conversion Rate</span></div>
              <p className="text-3xl font-bold">{fP(ourData.conversionRate)}</p>
              <p className="text-xs text-purple-200 mt-1">#{allPlayers.sort((a, b) => b.conversionRate - a.conversionRate).findIndex(p => p.id === ourData.id) + 1} dari {allPlayers.length}</p>
            </div>
            <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-5 text-white shadow-lg animate-fade-slide-up" style={{ animationDelay: "300ms" }}>
              <div className="flex items-center gap-2 mb-2"><Users size={18} className="text-amber-200" /><span className="text-xs text-amber-200 font-medium">Kompetitor Tracked</span></div>
              <p className="text-3xl font-bold">{competitors.length}</p>
              <p className="text-xs text-amber-200 mt-1">dari target 5 kompetitor</p>
            </div>
          </div>

          {/* Radar Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-border dark:border-gray-700">
            <h3 className="text-sm font-semibold text-foreground dark:text-white mb-4">🎯 Competitive Radar</h3>
            <div className="h-[380px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                  {allPlayers.map((p) => (
                    <Radar key={p.id} name={p.name} dataKey={p.name}
                      stroke={p.color} fill={p.color} fillOpacity={p.id === "ours" ? 0.3 : 0.1}
                      strokeWidth={p.id === "ours" ? 2.5 : 1.5} />
                  ))}
                  <Legend />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Competitor Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {competitors.map((c) => (
              <div key={c.id} className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-border dark:border-gray-700 hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: c.color }}>
                      {c.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground dark:text-white text-sm">{c.name}</h4>
                      <p className="text-xs text-muted">{fP(c.marketShare)} market share</p>
                    </div>
                  </div>
                  <button onClick={() => removeCompetitor(c.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-xs text-muted">Est. GMV</p><p className="font-semibold">{fRp(c.estimatedGMV)}</p></div>
                  <div><p className="text-xs text-muted">Avg Price</p><p className="font-semibold">{fRp(c.avgPrice)}</p></div>
                  <div><p className="text-xs text-muted">CTR</p><p className="font-semibold">{fP(c.ctr)}</p></div>
                  <div><p className="text-xs text-muted">Conversion</p><p className="font-semibold">{fP(c.conversionRate)}</p></div>
                </div>
                {/* vs Ours */}
                <div className="mt-4 pt-3 border-t border-border dark:border-gray-700 flex items-center gap-2 text-xs">
                  <span className="text-muted">vs Kita:</span>
                  <span className={c.ctr > ourData.ctr ? "text-red-500" : "text-green-500"}>
                    CTR {c.ctr > ourData.ctr ? "↑" : "↓"}{Math.abs(c.ctr - ourData.ctr).toFixed(1)}%
                  </span>
                  <span className={c.conversionRate > ourData.conversionRate ? "text-red-500" : "text-green-500"}>
                    Conv {c.conversionRate > ourData.conversionRate ? "↑" : "↓"}{Math.abs(c.conversionRate - ourData.conversionRate).toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── MARKET SHARE ──────────────────────── */}
      {tab === "market-share" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-border dark:border-gray-700">
            <h3 className="text-sm font-semibold text-foreground dark:text-white mb-4">📊 Market Share Comparison</h3>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={allPlayers.map(p => ({ name: p.name, share: p.marketShare, gmv: p.estimatedGMV }))} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={120} />
                  <Tooltip formatter={(v: any, name: any) => name === "share" ? `${v}%` : fRp(Number(v))} />
                  <Bar dataKey="share" name="Market Share %" fill="#6366f1" radius={[0, 6, 6, 0]}>
                    {allPlayers.map((p, i) => (
                      <rect key={i} fill={p.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* GMV Comparison */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-border dark:border-gray-700">
            <h3 className="text-sm font-semibold text-foreground dark:text-white mb-4">💰 Estimated GMV Comparison</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={allPlayers.sort((a, b) => b.estimatedGMV - a.estimatedGMV).map(p => ({ name: p.name, gmv: p.estimatedGMV }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000000000).toFixed(1)}B`} />
                  <Tooltip formatter={(v: any) => fRp(Number(v))} />
                  <Bar dataKey="gmv" name="Estimated GMV" radius={[8, 8, 0, 0]}>
                    {allPlayers.sort((a, b) => b.estimatedGMV - a.estimatedGMV).map((p, i) => (
                      <rect key={i} fill={p.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ─── PRICING INTELLIGENCE ──────────────── */}
      {tab === "pricing" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-border dark:border-gray-700">
            <h3 className="text-sm font-semibold text-foreground dark:text-white mb-4">💲 Perbandingan Harga Rata-rata</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={allPlayers.sort((a, b) => a.avgPrice - b.avgPrice).map(p => ({ name: p.name, price: p.avgPrice, products: p.productCount }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={(v: any, name: any) => name === "Harga Rata-rata" ? fRp(Number(v)) : `${v} produk`} />
                  <Legend />
                  <Bar dataKey="price" name="Harga Rata-rata" radius={[8, 8, 0, 0]}>
                    {allPlayers.sort((a, b) => a.avgPrice - b.avgPrice).map((p, i) => (
                      <rect key={i} fill={p.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pricing Matrix */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-border dark:border-gray-700">
            <h3 className="text-sm font-semibold text-foreground dark:text-white mb-4">🎯 Pricing Competitiveness Matrix</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted border-b border-border dark:border-gray-700">
                    <th className="py-2 px-3">Player</th>
                    <th className="py-2 px-3">Avg Price</th>
                    <th className="py-2 px-3">vs Kita</th>
                    <th className="py-2 px-3">Products</th>
                    <th className="py-2 px-3">Content/Week</th>
                    <th className="py-2 px-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {allPlayers.map((p) => {
                    const diff = ((p.avgPrice - ourData.avgPrice) / ourData.avgPrice) * 100;
                    return (
                      <tr key={p.id} className={`border-b border-gray-50 dark:border-gray-700/50 ${p.id === "ours" ? "bg-indigo-50 dark:bg-indigo-900/10" : ""}`}>
                        <td className="py-3 px-3 font-medium flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                          {p.name} {p.id === "ours" && <span className="text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full">Kita</span>}
                        </td>
                        <td className="py-3 px-3">{fRp(p.avgPrice)}</td>
                        <td className="py-3 px-3">
                          {p.id === "ours" ? "—" : (
                            <span className={diff > 0 ? "text-green-600" : diff < 0 ? "text-red-600" : "text-gray-500"}>
                              {diff > 0 ? "+" : ""}{diff.toFixed(1)}%
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3">{fN(p.productCount)}</td>
                        <td className="py-3 px-3">{p.contentFrequency}x</td>
                        <td className="py-3 px-3">
                          {p.id === "ours" ? (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">Kita</span>
                          ) : Math.abs(diff) <= 10 ? (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs">Kompetitif</span>
                          ) : diff > 10 ? (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">Kita Lebih Murah</span>
                          ) : (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs">Kita Lebih Mahal</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── INDUSTRY BENCHMARK ─────────────────── */}
      {tab === "benchmark" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-border dark:border-gray-700">
            <h3 className="text-lg font-semibold text-foreground dark:text-white mb-5">📊 KPI vs Industry Benchmark</h3>
            <div className="space-y-4">
              {benchmarks.map((b, i) => {
                const isGood = b.metric === "Refund Rate" ? b.ours <= b.industry : b.ours >= b.industry;
                const isTop = b.metric === "Refund Rate" ? b.ours <= b.topPerformer : b.ours >= b.topPerformer;
                const pctIndustry = b.metric === "Refund Rate"
                  ? Math.max(0, ((b.industry - b.ours) / b.industry) * 100)
                  : ((b.ours / b.topPerformer) * 100);
                return (
                  <div key={i} className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground dark:text-white">{b.metric}</span>
                        {isTop && <Star size={14} className="text-amber-500 fill-amber-500" />}
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <span className="text-muted">Industry: {b.industry}{b.unit}</span>
                        <span className="text-muted">Top: {b.topPerformer}{b.unit}</span>
                      </div>
                    </div>
                    <div className="relative h-3 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full animate-progress-fill ${isTop ? "bg-gradient-to-r from-amber-400 to-amber-500" : isGood ? "bg-gradient-to-r from-green-400 to-emerald-500" : "bg-gradient-to-r from-red-400 to-rose-500"}`}
                        style={{ width: `${Math.min(pctIndustry, 100)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-lg font-bold text-foreground dark:text-white">{b.ours}{b.unit}</span>
                      <span className={`text-xs font-medium ${isTop ? "text-amber-600" : isGood ? "text-green-600" : "text-red-600"}`}>
                        {isTop ? "🏆 Top Performer" : isGood ? "✅ Above Average" : "⚠️ Below Average"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─── SWOT ANALYSIS ──────────────────────── */}
      {tab === "swot" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Strengths */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl p-6 border border-green-200 dark:border-green-800/30">
              <h3 className="text-lg font-bold text-green-700 dark:text-green-400 mb-4 flex items-center gap-2">
                💪 Strengths
              </h3>
              <ul className="space-y-2">
                {ourData.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-green-800 dark:text-green-300">
                    <CheckCircle2 size={16} className="text-green-500 mt-0.5 shrink-0" /> {s}
                  </li>
                ))}
                <li className="flex items-start gap-2 text-sm text-green-800 dark:text-green-300">
                  <CheckCircle2 size={16} className="text-green-500 mt-0.5 shrink-0" /> CTR {fP(ourData.ctr)} — di atas rata-rata industri
                </li>
                <li className="flex items-start gap-2 text-sm text-green-800 dark:text-green-300">
                  <CheckCircle2 size={16} className="text-green-500 mt-0.5 shrink-0" /> Conversion {fP(ourData.conversionRate)} — tertinggi di pasar
                </li>
              </ul>
            </div>

            {/* Weaknesses */}
            <div className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 rounded-2xl p-6 border border-red-200 dark:border-red-800/30">
              <h3 className="text-lg font-bold text-red-700 dark:text-red-400 mb-4 flex items-center gap-2">
                ⚠️ Weaknesses
              </h3>
              <ul className="space-y-2">
                {ourData.weaknesses.map((w, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-red-800 dark:text-red-300">
                    <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" /> {w}
                  </li>
                ))}
                <li className="flex items-start gap-2 text-sm text-red-800 dark:text-red-300">
                  <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" /> Market share {fP(ourData.marketShare)} — masih di bawah leader ({fP(competitors[0]?.marketShare || 0)})
                </li>
              </ul>
            </div>

            {/* Opportunities */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-6 border border-blue-200 dark:border-blue-800/30">
              <h3 className="text-lg font-bold text-blue-700 dark:text-blue-400 mb-4 flex items-center gap-2">
                🚀 Opportunities
              </h3>
              <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-300">
                <li className="flex items-start gap-2"><Sparkles size={16} className="text-blue-500 mt-0.5 shrink-0" /> Tingkatkan content frequency — kompetitor rata-rata {Math.round(competitors.reduce((a, c) => a + c.contentFrequency, 0) / competitors.length)}x/minggu</li>
                <li className="flex items-start gap-2"><Sparkles size={16} className="text-blue-500 mt-0.5 shrink-0" /> Gap followers vs leader: {fN(Math.max(...competitors.map(c => c.socialFollowers)) - ourData.socialFollowers)} — potensi growth</li>
                <li className="flex items-start gap-2"><Sparkles size={16} className="text-blue-500 mt-0.5 shrink-0" /> Conversion rate tertinggi — leverage untuk kampanye affiliate</li>
                <li className="flex items-start gap-2"><Sparkles size={16} className="text-blue-500 mt-0.5 shrink-0" /> Kompetitor C punya refund rate tinggi — kesempatan rebut market</li>
              </ul>
            </div>

            {/* Threats */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-2xl p-6 border border-amber-200 dark:border-amber-800/30">
              <h3 className="text-lg font-bold text-amber-700 dark:text-amber-400 mb-4 flex items-center gap-2">
                🔥 Threats
              </h3>
              <ul className="space-y-2 text-sm text-amber-800 dark:text-amber-300">
                <li className="flex items-start gap-2"><AlertCircle size={16} className="text-amber-500 mt-0.5 shrink-0" /> Kompetitor A budget iklan besar — bisa outbid kita</li>
                <li className="flex items-start gap-2"><AlertCircle size={16} className="text-amber-500 mt-0.5 shrink-0" /> Price war dari Kompetitor B/C — harga di bawah kita</li>
                <li className="flex items-start gap-2"><AlertCircle size={16} className="text-amber-500 mt-0.5 shrink-0" /> Kompetitor C agresif konten ({competitors.find(c => c.id === "c3")?.contentFrequency || 20}x/minggu)</li>
                <li className="flex items-start gap-2"><AlertCircle size={16} className="text-amber-500 mt-0.5 shrink-0" /> Perubahan algoritma platform bisa menurunkan reach</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
