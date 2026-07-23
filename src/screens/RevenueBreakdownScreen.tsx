"use client";
import { useState, useMemo } from "react";
import {
  computeRevenueBreakdown,
  getDemoDailyData,
  formatRupiah,
  formatRupiahShort,
  formatPct,
} from "@/utils/revenueAnalyzer";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Info,
  DollarSign,
  PieChart as PieIcon,
  Layers,
  Sparkles,
} from "lucide-react";

export default function RevenueBreakdownScreen() {
  const [data] = useState(() => getDemoDailyData());

  const { grandTotal, channels, alerts, chartData } = useMemo(() => {
    return computeRevenueBreakdown(data);
  }, [data]);

  const PIE_COLORS = ["#8884d8", "#ff7300", "#0088FE", "#00C49F"];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-card border border-border p-6 rounded-2xl shadow-sm gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary mb-1">
            <Sparkles size={16} /> Fitur 1: Prioritas Utama
          </div>
          <h1 className="text-2xl font-bold text-foreground">Revenue Breakdown & Trend Dashboard</h1>
          <p className="text-sm text-muted">
            Menjawab pertanyaan: <span className="font-medium text-foreground">&quot;Omset turun dari channel mana?&quot;</span>
          </p>
        </div>
        <div className="bg-primary/10 border border-primary/20 p-4 rounded-xl text-right">
          <div className="text-xs text-muted">Total GMV (Periode Aktif)</div>
          <div className="text-2xl font-extrabold text-primary">{formatRupiah(grandTotal)}</div>
        </div>
      </div>

      {/* Alert Banner if channel drop > 20% */}
      {alerts.length > 0 && (
        <div className="space-y-3">
          {alerts.map((alert, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-xl border flex items-start gap-3 shadow-sm ${
                alert.severity === "critical"
                  ? "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300"
                  : "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300"
              }`}
            >
              <AlertTriangle className="size-5 shrink-0 mt-0.5" />
              <div className="flex-1 text-sm">
                <div className="font-bold flex items-center gap-2">
                  <span>Peringatan Drop Channel: {alert.channel}</span>
                  <span className="px-2 py-0.5 rounded text-xs bg-red-500 text-white font-semibold">
                    -{alert.dropPct.toFixed(1)}%
                  </span>
                </div>
                <div className="mt-1 opacity-90">
                  Omset harian channel <strong className="underline">{alert.channel}</strong> tanggal {alert.date} mencatatkan{" "}
                  <strong>{formatRupiah(alert.currentValue)}</strong>, turun di atas 20% dari rata-rata 7 hari sebelumnya (
                  {formatRupiah(alert.avg7Days)}).
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary KPI Cards per Channel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {channels.map((ch, i) => (
          <div key={i} className="bg-card border border-border p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-muted">{ch.label}</span>
              <span
                className="size-3 rounded-full"
                style={{ backgroundColor: ch.color }}
              />
            </div>
            <div className="text-xl font-bold text-foreground mb-1">
              {formatRupiahShort(ch.totalGMV)}
            </div>
            <div className="flex items-center justify-between text-xs mt-3 pt-3 border-t border-border">
              <span className="text-muted">Kontribusi:</span>
              <span className="font-bold text-foreground">{ch.sharePct.toFixed(1)}%</span>
            </div>
            <div className="flex items-center justify-between text-xs mt-1">
              <span className="text-muted">Tren 7-Hari:</span>
              <span className={`font-semibold flex items-center gap-1 ${ch.trend7dPct >= 0 ? "text-green-600" : "text-red-500"}`}>
                {ch.trend7dPct >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {ch.trend7dPct >= 0 ? "+" : ""}{ch.trend7dPct.toFixed(1)}%
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Multi-Channel Line Chart */}
        <div className="lg:col-span-2 bg-card border border-border p-6 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <TrendingUp size={18} className="text-primary" /> Tren GMV Harian Multi-Channel
              </h3>
              <p className="text-xs text-muted">Mendeteksi fluktuasi harian dan tanggal titik balik penurunan channel</p>
            </div>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}Jt`} />
                <Tooltip
                  formatter={(val: any, name: any) => [formatRupiah(Number(val)), name]}
                  labelFormatter={(lbl) => `Tanggal: ${lbl}`}
                  contentStyle={{ backgroundColor: "#1e1e2d", borderRadius: "10px", color: "#fff" }}
                />
                <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
                <Line type="monotone" dataKey="gmvAffiliate" name="Afiliasi" stroke="#8884d8" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="gmvLive" name="LIVE Penjual" stroke="#ff7300" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="gmvVideo" name="Video Penjual" stroke="#0088FE" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="gmvProductCard" name="Kartu Produk" stroke="#00C49F" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Share % Pie Chart */}
        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-foreground flex items-center gap-2 mb-1">
              <PieIcon size={18} className="text-primary" /> Share Kontribusi Channel
            </h3>
            <p className="text-xs text-muted mb-4">Persentase kontribusi setiap saluran ke total omset</p>
          </div>

          <div className="h-56 w-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={channels}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="sharePct"
                >
                  {channels.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(val: any) => [`${Number(val).toFixed(1)}%`, "Share"]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xs text-muted">Total</span>
              <span className="text-sm font-bold text-foreground">100%</span>
            </div>
          </div>

          <div className="space-y-2 mt-2 pt-4 border-t border-border">
            {channels.map((c, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                  <span className="text-foreground font-medium">{c.label}</span>
                </div>
                <span className="font-bold text-foreground">{c.sharePct.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
