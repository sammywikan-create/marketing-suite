"use client";
import { useGMVStore } from "@/lib/gmvStore";
import { calculateKPIs, formatRupiah, formatNum, revenueByCreativeType, top10SKUByRevenue, fmtDec } from "@/utils/gmvAnalyzer";
import { PieChart, BarChart3, TrendingUp, ShoppingCart, DollarSign, MousePointer, Eye, AlertCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart as RPieChart, Pie, Cell, Legend, CartesianGrid } from "recharts";

const COLORS = ["#1A237E", "#3949AB", "#5C6BC0", "#7986CB", "#9FA8DA", "#C5CAE9", "#FF6F00", "#FFA726", "#FFB74D", "#FFE0B2"];

function KPICard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-border hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted mb-1">{label}</p>
          <p className="text-xl font-bold text-foreground">{value}</p>
          {sub && <p className="text-xs text-muted mt-1">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>{icon}</div>
      </div>
    </div>
  );
}

function EmptyState({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <AlertCircle size={48} className="text-muted mb-4" />
      <h2 className="text-lg font-semibold text-foreground mb-2">Belum Ada Data</h2>
      <p className="text-sm text-muted mb-4">Upload file Excel TikTok Ads terlebih dahulu untuk melihat dashboard.</p>
      <button onClick={() => onNavigate?.("gmv-upload")} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors">
        Upload Data
      </button>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fmtTooltipRp = (value: any) => formatRupiah(Number(value));

export default function GMVDashboardScreen({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const { data, fileName } = useGMVStore();

  if (data.length === 0) return <EmptyState onNavigate={onNavigate} />;

  const kpi = calculateKPIs(data);
  const byCreative = revenueByCreativeType(data);
  const topSKU = top10SKUByRevenue(data);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">GMV Dashboard</h1>
          {fileName && <p className="text-sm text-muted mt-1">📄 {fileName} · {data.length.toLocaleString("id-ID")} baris</p>}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
        <KPICard icon={<DollarSign size={20} className="text-green-600" />} label="Total Gross Revenue" value={formatRupiah(kpi.totalGrossRevenue)} color="bg-green-50" />
        <KPICard icon={<DollarSign size={20} className="text-red-600" />} label="Total Cost" value={formatRupiah(kpi.totalCost)} color="bg-red-50" />
        <KPICard icon={<TrendingUp size={20} className="text-blue-600" />} label="Overall ROI" value={fmtDec(kpi.overallROI, 2) + "x"} sub={kpi.overallROI >= 5 ? "✅ Sehat" : kpi.overallROI >= 3 ? "⚠️ Perlu optimasi" : "🔴 Rendah"} color="bg-blue-50" />
        <KPICard icon={<ShoppingCart size={20} className="text-purple-600" />} label="Total Orders" value={formatNum(kpi.totalOrders)} color="bg-purple-50" />
        <KPICard icon={<DollarSign size={20} className="text-orange-600" />} label="Avg Cost/Order" value={formatRupiah(kpi.avgCostPerOrder)} color="bg-orange-50" />
        <KPICard icon={<MousePointer size={20} className="text-cyan-600" />} label="Overall CTR" value={fmtDec(kpi.overallCTR, 2) + "%"} sub={`CVR: ${fmtDec(kpi.avgCVR, 2)}%`} color="bg-cyan-50" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Revenue vs Cost by Creative Type */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-border">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><BarChart3 size={18} className="text-primary" /> Revenue vs Cost by Creative Type</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={byCreative} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => v >= 1000000 ? fmtDec(v / 1000000, 0) + "Jt" : v >= 1000 ? fmtDec(v / 1000, 0) + "Rb" : v} />
              <Tooltip formatter={fmtTooltipRp} />
              <Bar dataKey="revenue" name="Revenue" fill="#1A237E" radius={[4, 4, 0, 0]} />
              <Bar dataKey="cost" name="Cost" fill="#FF6F00" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie: Revenue Contribution */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-border">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><PieChart size={18} className="text-primary" /> Revenue Contribution by Creative Type</h3>
          <ResponsiveContainer width="100%" height={280}>
            <RPieChart>
              <Pie data={byCreative} dataKey="revenue" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }: any) => `${name || ''} ${fmtDec((percent ?? 0) * 100, 0)}%`} labelLine={true}>
                {byCreative.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={fmtTooltipRp} />
              <Legend />
            </RPieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top 10 SKU */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-border">
        <h3 className="font-semibold mb-4 flex items-center gap-2"><BarChart3 size={18} className="text-primary" /> Top 10 SKU by Gross Revenue</h3>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={topSKU} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => v >= 1000000 ? fmtDec(v / 1000000, 0) + "Jt" : v >= 1000 ? fmtDec(v / 1000, 0) + "Rb" : v} />
            <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 10 }} />
            <Tooltip formatter={fmtTooltipRp} />
            <Bar dataKey="revenue" name="Revenue" fill="#1A237E" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
