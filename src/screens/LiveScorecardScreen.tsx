"use client";
import { useMemo } from "react";
import { useStoreManager } from "@/store/useStoreManager";
import {
  computeLiveScorecard,
  formatRupiahShort,
  formatNumber,
} from "@/utils/revenueAnalyzer";
import {
  Radio,
  Sparkles,
  Zap,
  Database,
  Upload,
} from "lucide-react";

export default function LiveScorecardScreen() {
  const { getActiveStore } = useStoreManager();
  const activeStore = getActiveStore();

  const videoData = activeStore?.videoData || [];

  const {
    hasData,
    totalGMV,
    totalImpressions,
    overallGPM,
    isGpmGood,
    productiveCount,
    totalSessions,
    productivePct,
    avgWatchTime,
    bestHoursRecommendation,
  } = useMemo(() => computeLiveScorecard(videoData), [videoData]);

  if (!hasData || totalSessions === 0) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col items-center justify-center py-20 bg-card border border-border rounded-2xl text-center shadow-sm">
          <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
            <Database size={32} />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">
            Belum Ada Data Sesi LIVE Real ({activeStore?.name || "Toko Aktif"})
          </h2>
          <p className="text-sm text-muted max-w-md mb-6 leading-relaxed">
            Untuk menyajikan kartu skor performa siaran LIVE real kepada direksi, silakan unggah file Excel laporan <strong>Live Analytics / Video Performance</strong> toko Anda.
          </p>
          <a
            href="#video-performance"
            className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold text-sm shadow-lg hover:opacity-90 transition-opacity"
          >
            <Upload size={18} /> Upload Data LIVE Real
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-card border border-border p-6 rounded-2xl shadow-sm gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary mb-1">
            <Sparkles size={16} /> Data Real Toko: {activeStore?.name}
          </div>
          <h1 className="text-2xl font-bold text-foreground">Live Performance Scorecard</h1>
          <p className="text-sm text-muted">
            Menjawab pertanyaan: <span className="font-medium text-foreground">&quot;Sesi LIVE kamu efektif atau tidak?&quot;</span>
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* GPM Indicator */}
        <div className="bg-card border border-border p-5 rounded-xl shadow-sm">
          <div className="text-xs font-semibold text-muted mb-1">Overall GPM Real (GMV / 1K View)</div>
          <div className="text-2xl font-black text-foreground mb-1">{formatRupiahShort(overallGPM)}</div>
          <div className="flex items-center gap-1.5 text-xs font-bold mt-2">
            <span className={isGpmGood ? "text-green-600" : "text-amber-500"}>
              {isGpmGood ? "✅ DI ATAS BENCHMARK (>Rp15.000)" : "⚠️ DI BAWAH TARGET (<Rp15.000)"}
            </span>
          </div>
        </div>

        {/* Productive Sessions Ratio */}
        <div className="bg-card border border-border p-5 rounded-xl shadow-sm">
          <div className="text-xs font-semibold text-muted mb-1">Rasio LIVE Generates Sales</div>
          <div className="text-2xl font-black text-primary mb-1">
            {productiveCount} / {totalSessions} Konten
          </div>
          <div className="text-xs text-muted mt-2">
            Rasio Keberhasilan Real: <strong className="text-foreground">{productivePct.toFixed(0)}%</strong>
          </div>
        </div>

        {/* Avg Watch Duration */}
        <div className="bg-card border border-border p-5 rounded-xl shadow-sm">
          <div className="text-xs font-semibold text-muted mb-1">Rata-rata Retensi Penonton</div>
          <div className="text-2xl font-black text-purple-600 mb-1">{avgWatchTime}% Watch Rate</div>
          <div className="text-xs text-muted mt-2">Target optimal: &gt; 35% watch rate</div>
        </div>

        {/* Total LIVE GMV */}
        <div className="bg-card border border-border p-5 rounded-xl shadow-sm">
          <div className="text-xs font-semibold text-muted mb-1">Total Omset Real LIVE</div>
          <div className="text-2xl font-black text-green-600 mb-1">{formatRupiahShort(totalGMV)}</div>
          <div className="text-xs text-muted mt-2">Dari {formatNumber(totalImpressions)} tayangan</div>
        </div>
      </div>

      {/* Best Hours Recommendation Card */}
      <div className="bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/20 p-6 rounded-2xl flex items-start gap-4 shadow-sm">
        <Zap className="size-6 text-primary shrink-0 mt-0.5" />
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-primary mb-1">
            Rekomendasi Jam & Strategi LIVE (Berdasarkan Historis Data Real)
          </h3>
          <div className="text-base font-extrabold text-foreground mb-1">{bestHoursRecommendation}</div>
          <p className="text-xs text-muted">
            Dihitung secara dinamis dari catatan sesi LIVE terunggah pada toko {activeStore?.name}.
          </p>
        </div>
      </div>
    </div>
  );
}
