"use client";
import { useState, useMemo } from "react";
import {
  computeAffiliateTracker,
  formatRupiah,
  formatRupiahShort,
  formatNumber,
} from "@/utils/revenueAnalyzer";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import {
  Users,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Sparkles,
  Award,
} from "lucide-react";

export default function AffiliateTrackerScreen() {
  const {
    history,
    current,
    previous,
    totalGMV,
    affiliateShare,
    avgPerCreator,
    gmvDropPct,
    creatorDropCount,
    isAlert,
  } = useMemo(() => computeAffiliateTracker(), []);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-card border border-border p-6 rounded-2xl shadow-sm gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary mb-1">
            <Sparkles size={16} /> Fitur 4: Penting
          </div>
          <h1 className="text-2xl font-bold text-foreground">Affiliate Performance Tracker</h1>
          <p className="text-sm text-muted">
            Menjawab pertanyaan: <span className="font-medium text-foreground">&quot;Kreator afiliasi kamu masih aktif & efektif?&quot;</span>
          </p>
        </div>
      </div>

      {/* Warning Alert if Affiliate GMV drops */}
      {isAlert && (
        <div className="bg-red-500/10 border border-red-500/30 p-5 rounded-2xl flex items-start gap-4 shadow-sm">
          <AlertTriangle className="size-6 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-1 text-sm">
            <div className="font-bold text-red-700 dark:text-red-300">
              Peringatan Drop Saluran Afiliasi (-{gmvDropPct.toFixed(1)}%)
            </div>
            <p className="text-muted">
              GMV Afiliasi mengalami penurunan dibanding minggu sebelumnya. Terdapat{" "}
              <strong>{creatorDropCount} kreator</strong> yang berhenti mengunggah video promo/siaran LIVE minggu ini.
            </p>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Affiliate Share */}
        <div className="bg-card border border-border p-5 rounded-xl shadow-sm">
          <div className="text-xs font-semibold text-muted mb-1">Porsi GMV Afiliasi</div>
          <div className="text-2xl font-black text-primary mb-1">{affiliateShare.toFixed(1)}%</div>
          <div className="text-xs text-muted mt-2">
            Porsi terbesar omset toko berasal dari saluran afiliasi
          </div>
        </div>

        {/* Active Creators Count */}
        <div className="bg-card border border-border p-5 rounded-xl shadow-sm">
          <div className="text-xs font-semibold text-muted mb-1">Kreator Aktif Posting</div>
          <div className="text-2xl font-black text-purple-600 mb-1">{current.activeCreators} Kreator</div>
          <div className="flex items-center gap-1 text-xs text-muted mt-2">
            <span>Minggu lalu: {previous.activeCreators}</span>
            {creatorDropCount > 0 && <span className="text-red-500 font-bold">(-{creatorDropCount})</span>}
          </div>
        </div>

        {/* Avg GMV per Creator */}
        <div className="bg-card border border-border p-5 rounded-xl shadow-sm">
          <div className="text-xs font-semibold text-muted mb-1">Rata-rata Kontribusi / Kreator</div>
          <div className="text-2xl font-black text-foreground mb-1">{formatRupiahShort(avgPerCreator)}</div>
          <div className="text-xs text-muted mt-2">Rata-rata GMV per kreator aktif</div>
        </div>

        {/* Total Affiliate GMV */}
        <div className="bg-card border border-border p-5 rounded-xl shadow-sm">
          <div className="text-xs font-semibold text-muted mb-1">Total GMV Afiliasi</div>
          <div className="text-2xl font-black text-green-600 mb-1">{formatRupiahShort(current.gmvAffiliate)}</div>
          <div className="text-xs text-muted mt-2">Periode minggu ini</div>
        </div>
      </div>

      {/* Area Chart: Affiliate vs Own Brand GMV */}
      <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
        <h3 className="text-base font-bold text-foreground mb-1">
          Tren GMV Afiliasi vs GMV Penjual Sendiri (Own Brand)
        </h3>
        <p className="text-xs text-muted mb-6">Perbandingan kontribusi omset dari jaringan kreator vs promosi internal toko</p>

        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}Jt`} />
              <Tooltip formatter={(val: any) => formatRupiah(Number(val))} />
              <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
              <Area type="monotone" dataKey="gmvAffiliate" name="GMV Afiliasi Kreator" stroke="#8884d8" fill="#8884d8" fillOpacity={0.4} />
              <Area type="monotone" dataKey="gmvOwn" name="GMV Toko Sendiri" stroke="#00C49F" fill="#00C49F" fillOpacity={0.4} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
