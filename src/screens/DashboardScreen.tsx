"use client";
import { useEffect, useState, useMemo } from "react";
import { getItems, SEEDS } from "@/lib/store";
import { ContentItem, CampaignItem, KOLItem, BudgetROIItem, AIDAItem, TargetBulananItem, HipotesisItem, BudgetHarianItem } from "@/lib/types";
import {
  FileText, Megaphone, Users, DollarSign, TrendingUp, Eye, MousePointer, ShoppingCart,
  ArrowUpRight, ArrowDownRight
} from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import {
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";

function StatCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-border hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted mb-1">{label}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          {sub && <p className="text-xs text-muted mt-1">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>{icon}</div>
      </div>
    </div>
  );
}

function MiniBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted">{label}</span>
        <span className="font-semibold">{Math.round(pct)}%</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function fmt(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 }) + "B";
  if (n >= 1_000_000) return (n / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 }) + "M";
  if (n >= 1_000) return (n / 1_000).toLocaleString("id-ID", { maximumFractionDigits: 1 }) + "K";
  return n.toLocaleString("id-ID");
}

function fmtRp(n: number): string {
  return "Rp " + n.toLocaleString("id-ID");
}

const CAT_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316", "#ec4899"];

export default function DashboardScreen() {
  const [content, setContent] = useState<ContentItem[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [kols, setKols] = useState<KOLItem[]>([]);
  const [budgets, setBudgets] = useState<BudgetROIItem[]>([]);
  const [aida, setAida] = useState<AIDAItem[]>([]);
  const [targets, setTargets] = useState<TargetBulananItem[]>([]);
  const [hipotesis, setHipotesis] = useState<HipotesisItem[]>([]);
  const [budgetHarian, setBudgetHarian] = useState<BudgetHarianItem[]>([]);

  useEffect(() => {
    setContent(getItems("content", SEEDS.content));
    setCampaigns(getItems("campaign", SEEDS.campaign));
    setKols(getItems("kol", SEEDS.kol));
    setBudgets(getItems("budgetRoi", SEEDS.budgetRoi));
    setAida(getItems("aida", SEEDS.aida));
    setTargets(getItems("targetBulanan", SEEDS.targetBulanan));
    setHipotesis(getItems("hipotesis", SEEDS.hipotesis));
    setBudgetHarian(getItems("budgetHarian", SEEDS.budgetHarian));
  }, []);

  const totalBudget = budgets.reduce((s, b) => s + b.budgetAlokasi, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.budgetTerpakai, 0);
  const totalRevenue = budgets.reduce((s, b) => s + b.revenue, 0);
  const avgROI = budgets.length > 0 ? budgets.filter(b => b.roi > 0).reduce((s, b) => s + b.roi, 0) / budgets.filter(b => b.roi > 0).length : 0;
  const activeCampaigns = campaigns.filter(c => c.status === "Active").length;
  const activeKOL = kols.filter(k => k.status === "Active").length;
  const kolSpend = kols.reduce((s, k) => s + k.biaya, 0);
  const dailySpent = budgetHarian.reduce((s, i) => s + i.spent, 0);

  const aidaGroups = ["Attention", "Interest", "Desire", "Action"] as const;
  const aidaIcons = [<Eye key="a" size={16}/>, <MousePointer key="i" size={16}/>, <TrendingUp key="d" size={16}/>, <ShoppingCart key="ac" size={16}/>];
  const aidaColors = ["bg-blue-500", "bg-cyan-500", "bg-purple-500", "bg-green-500"];

  const latestTarget = targets.filter(t => t.aktualRevenue > 0).slice(-1)[0];

  const charts = useMemo(() => {
    // Budget allocation pie
    const catMap = new Map<string, number>();
    budgets.forEach(b => catMap.set(b.kategori, (catMap.get(b.kategori) || 0) + b.budgetAlokasi));
    const pieData = Array.from(catMap.entries()).map(([name, value], i) => ({ name: name.length > 14 ? name.slice(0, 14) + "…" : name, value, color: CAT_COLORS[i % CAT_COLORS.length] })).filter(d => d.value > 0);

    // Monthly revenue trend from targets
    const trendData = targets.map(t => ({
      bulan: t.bulan.length > 6 ? t.bulan.slice(0, 6) : t.bulan,
      Target: t.targetRevenue, Aktual: t.aktualRevenue,
    }));

    // Hypothesis stats
    const hValidated = hipotesis.filter(h => h.status === "Validated").length;
    const hInvalidated = hipotesis.filter(h => h.status === "Invalidated").length;
    const hTesting = hipotesis.filter(h => h.status === "Testing").length;
    const hBacklog = hipotesis.filter(h => h.status === "Backlog").length;

    return { pieData, trendData, hValidated, hInvalidated, hTesting, hBacklog };
  }, [budgets, targets, hipotesis]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted mt-1">Ringkasan performa marketing</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard icon={<FileText size={20} className="text-blue-600"/>} label="Total Konten" value={content.length.toString()} sub={`${content.filter(c=>c.status==="Published").length} published`} color="bg-blue-50" />
        <StatCard icon={<Megaphone size={20} className="text-green-600"/>} label="Campaign Aktif" value={activeCampaigns.toString()} sub={`${campaigns.length} total`} color="bg-green-50" />
        <StatCard icon={<Users size={20} className="text-purple-600"/>} label="KOL Aktif" value={activeKOL.toString()} sub={`Spend: ${fmtRp(kolSpend)}`} color="bg-purple-50" />
        <StatCard icon={<DollarSign size={20} className="text-orange-600"/>} label="Avg ROI" value={Math.round(avgROI) + "%"} sub={`Revenue: ${fmtRp(totalRevenue)}`} color="bg-orange-50" />
        <StatCard icon={<TrendingUp size={20} className="text-cyan-600"/>} label="Budget Spent" value={fmtRp(totalSpent)} sub={`of ${fmtRp(totalBudget)}`} color="bg-cyan-50" />
        <StatCard icon={<ShoppingCart size={20} className="text-pink-600"/>} label="Daily Ad Spend" value={fmtRp(dailySpent)} sub={`${budgetHarian.length} entries`} color="bg-pink-50" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Budget Allocation Pie */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-border">
          <h3 className="font-semibold mb-3 text-sm">Alokasi Budget</h3>
          {charts.pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart><Pie data={charts.pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} innerRadius={40} label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false} fontSize={8}>
                {charts.pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie><Tooltip formatter={(v) => fmtRp(Number(v))} /></PieChart>
            </ResponsiveContainer>
          ) : <div className="text-xs text-gray-400 text-center py-10">Belum ada data</div>}
        </div>

        {/* Monthly Revenue Trend */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-border lg:col-span-2">
          <h3 className="font-semibold mb-3 text-sm">Target vs Aktual Revenue (Bulanan)</h3>
          {charts.trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={charts.trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="bulan" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 9 }} tickFormatter={(v) => fmtRp(v)} />
                <Tooltip formatter={(v) => fmtRp(Number(v))} />
                <Legend />
                <Line type="monotone" dataKey="Target" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
                <Line type="monotone" dataKey="Aktual" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <div className="text-xs text-gray-400 text-center py-10">Belum ada data</div>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Budget Overview */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-border lg:col-span-1">
          <h3 className="font-semibold mb-4">Budget Overview</h3>
          <div className="space-y-1">
            <MiniBar label="Budget Terpakai" value={totalSpent} max={totalBudget} color="bg-primary" />
            <div className="flex justify-between text-xs text-muted pt-1">
              <span>Alokasi: {fmtRp(totalBudget)}</span>
              <span>Terpakai: {fmtRp(totalSpent)}</span>
            </div>
          </div>
          {latestTarget && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs text-muted mb-1">{latestTarget.bulan}</p>
              <MiniBar label="Target Revenue" value={latestTarget.aktualRevenue} max={latestTarget.targetRevenue} color="bg-green-500" />
              <div className="flex justify-between text-xs text-muted pt-1">
                <span>Target: {fmtRp(latestTarget.targetRevenue)}</span>
                <span>Aktual: {fmtRp(latestTarget.aktualRevenue)}</span>
              </div>
            </div>
          )}
          {/* Hypothesis Mini Summary */}
          {hipotesis.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs font-semibold text-gray-600 mb-2">Hipotesis</p>
              <div className="grid grid-cols-4 gap-1 text-center text-[10px]">
                <div className="bg-gray-50 rounded p-1.5"><div className="font-bold text-gray-500">{charts.hBacklog}</div>Backlog</div>
                <div className="bg-yellow-50 rounded p-1.5"><div className="font-bold text-yellow-600">{charts.hTesting}</div>Testing</div>
                <div className="bg-green-50 rounded p-1.5"><div className="font-bold text-green-600">{charts.hValidated}</div>Valid</div>
                <div className="bg-red-50 rounded p-1.5"><div className="font-bold text-red-500">{charts.hInvalidated}</div>Invalid</div>
              </div>
            </div>
          )}
        </div>

        {/* AIDA Funnel */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-border lg:col-span-1">
          <h3 className="font-semibold mb-4">AIDA Funnel</h3>
          {aidaGroups.map((stage, i) => {
            const stageItems = aida.filter(a => a.tahap === stage);
            const totalTarget = stageItems.reduce((s, a) => s + a.target, 0);
            const totalAktual = stageItems.reduce((s, a) => s + a.aktual, 0);
            return (
              <div key={stage} className="flex items-center gap-3 mb-3 last:mb-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${aidaColors[i]}`}>
                  {aidaIcons[i]}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{stage}</span>
                    <span className="text-muted">{fmt(totalAktual)} / {fmt(totalTarget)}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                    <div className={`h-full rounded-full ${aidaColors[i]}`} style={{ width: `${totalTarget > 0 ? (totalAktual / totalTarget * 100) : 0}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-border lg:col-span-1">
          <h3 className="font-semibold mb-4">Konten Terbaru</h3>
          <div className="space-y-3">
            {content.slice(0, 5).map(c => (
              <div key={c.id} className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{c.judul}</p>
                  <p className="text-xs text-muted">{c.platform} · {c.tanggal}</p>
                </div>
                <StatusBadge value={c.status} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Campaign & KOL Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-border">
          <h3 className="font-semibold mb-4">Campaign Terbaru</h3>
          <div className="space-y-3">
            {campaigns.slice(0, 4).map(c => (
              <div key={c.id} className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{c.nama}</p>
                  <p className="text-xs text-muted">{c.platform} · {fmtRp(c.budget)}</p>
                </div>
                <StatusBadge value={c.status} />
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-border">
          <h3 className="font-semibold mb-4">KOL Aktif</h3>
          <div className="space-y-3">
            {kols.filter(k => k.status === "Active").slice(0, 4).map(k => (
              <div key={k.id} className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{k.nama}</p>
                  <p className="text-xs text-muted">{k.platform} · {k.followers} followers</p>
                </div>
                <span className="text-sm font-semibold text-primary">{fmtRp(k.biaya)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
