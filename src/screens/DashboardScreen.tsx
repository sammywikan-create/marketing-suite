"use client";
import { useEffect, useState } from "react";
import { getItems, SEEDS } from "@/lib/store";
import { ContentItem, CampaignItem, KOLItem, BudgetROIItem, AIDAItem, TargetBulananItem } from "@/lib/types";
import {
  FileText, Megaphone, Users, DollarSign, TrendingUp, Eye, MousePointer, ShoppingCart,
  ArrowUpRight, ArrowDownRight
} from "lucide-react";
import StatusBadge from "@/components/StatusBadge";

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

export default function DashboardScreen() {
  const [content, setContent] = useState<ContentItem[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [kols, setKols] = useState<KOLItem[]>([]);
  const [budgets, setBudgets] = useState<BudgetROIItem[]>([]);
  const [aida, setAida] = useState<AIDAItem[]>([]);
  const [targets, setTargets] = useState<TargetBulananItem[]>([]);

  useEffect(() => {
    setContent(getItems("content", SEEDS.content));
    setCampaigns(getItems("campaign", SEEDS.campaign));
    setKols(getItems("kol", SEEDS.kol));
    setBudgets(getItems("budgetRoi", SEEDS.budgetRoi));
    setAida(getItems("aida", SEEDS.aida));
    setTargets(getItems("targetBulanan", SEEDS.targetBulanan));
  }, []);

  const totalBudget = budgets.reduce((s, b) => s + b.budgetAlokasi, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.budgetTerpakai, 0);
  const totalRevenue = budgets.reduce((s, b) => s + b.revenue, 0);
  const avgROI = budgets.length > 0 ? budgets.filter(b => b.roi > 0).reduce((s, b) => s + b.roi, 0) / budgets.filter(b => b.roi > 0).length : 0;
  const activeCampaigns = campaigns.filter(c => c.status === "Active").length;
  const activeKOL = kols.filter(k => k.status === "Active").length;

  const aidaGroups = ["Attention", "Interest", "Desire", "Action"] as const;
  const aidaIcons = [<Eye key="a" size={16}/>, <MousePointer key="i" size={16}/>, <TrendingUp key="d" size={16}/>, <ShoppingCart key="ac" size={16}/>];
  const aidaColors = ["bg-blue-500", "bg-cyan-500", "bg-purple-500", "bg-green-500"];

  const latestTarget = targets.filter(t => t.aktualRevenue > 0).slice(-1)[0];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted mt-1">Ringkasan performa marketing</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={<FileText size={20} className="text-blue-600"/>} label="Total Konten" value={content.length.toString()} sub={`${content.filter(c=>c.status==="Published").length} published`} color="bg-blue-50" />
        <StatCard icon={<Megaphone size={20} className="text-green-600"/>} label="Campaign Aktif" value={activeCampaigns.toString()} sub={`${campaigns.length} total`} color="bg-green-50" />
        <StatCard icon={<Users size={20} className="text-purple-600"/>} label="KOL Aktif" value={activeKOL.toString()} sub={`${kols.length} total`} color="bg-purple-50" />
        <StatCard icon={<DollarSign size={20} className="text-orange-600"/>} label="Avg ROI" value={Math.round(avgROI) + "%"} sub={`Revenue: ${fmtRp(totalRevenue)}`} color="bg-orange-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
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
        </div>

        {/* AIDA Funnel */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-border lg:col-span-1">
          <h3 className="font-semibold mb-4">AIDA Funnel</h3>
          {aidaGroups.map((stage, i) => {
            const items = aida.filter(a => a.tahap === stage);
            const totalTarget = items.reduce((s, a) => s + a.target, 0);
            const totalAktual = items.reduce((s, a) => s + a.aktual, 0);
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
