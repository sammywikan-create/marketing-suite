"use client";
import { useMemo } from "react";
import { useStoreManager } from "@/store/useStoreManager";
import {
  computeFunnelAnalyzer,
  extractRealStoreData,
  formatNumber,
  formatPct,
} from "@/utils/revenueAnalyzer";
import {
  AlertCircle,
  TrendingDown,
  Sparkles,
  Database,
  Upload,
} from "lucide-react";

export default function FunnelAnalyzerScreen() {
  const { getActiveStore } = useStoreManager();
  const activeStore = getActiveStore();

  const realRecords = useMemo(() => {
    if (!activeStore) return [];
    return extractRealStoreData(
      activeStore.overviewData,
      activeStore.affiliateData,
      activeStore.videoData
    );
  }, [activeStore]);

  const {
    hasData,
    totals,
    ctr,
    atcRate,
    ctor,
    bottleneck,
    bottleneckDesc,
    comparisonStages,
  } = useMemo(() => computeFunnelAnalyzer(realRecords), [realRecords]);

  if (!hasData || realRecords.length === 0) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col items-center justify-center py-20 bg-card border border-border rounded-2xl text-center shadow-sm">
          <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
            <Database size={32} />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">
            Belum Ada Data Funnel Real Toko ({activeStore?.name || "Toko Aktif"})
          </h2>
          <p className="text-sm text-muted max-w-md mb-6 leading-relaxed">
            Untuk menyajikan analisis funnel konversi real kepada direksi, silakan unggah file Excel <strong>Overview Bisnis</strong> toko Anda.
          </p>
          <a
            href="#gmv-overview"
            className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold text-sm shadow-lg hover:opacity-90 transition-opacity"
          >
            <Upload size={18} /> Upload Data Toko Real
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
          <h1 className="text-2xl font-bold text-foreground">Funnel Conversion Analyzer</h1>
          <p className="text-sm text-muted">
            Menjawab pertanyaan: <span className="font-medium text-foreground">&quot;Masalahnya di traffic (CTR) atau di closing (CTOR)?&quot;</span>
          </p>
        </div>
      </div>

      {/* Bottleneck Diagnostic Card */}
      <div className="bg-amber-500/10 border border-amber-500/30 p-6 rounded-2xl flex items-start gap-4">
        <AlertCircle className="size-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
            Hasil Diagnosis Bottleneck Funnel Real:
          </div>
          <div className="text-lg font-extrabold text-foreground">{bottleneck}</div>
          <p className="text-sm text-muted leading-relaxed">{bottleneckDesc}</p>
        </div>
      </div>

      {/* 4-Step Funnel Flow Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Step 1: Impresi */}
        <div className="bg-card border border-border p-5 rounded-xl shadow-sm relative">
          <div className="text-xs font-semibold text-muted mb-1">Tahap 1: Jangkauan Real</div>
          <div className="text-lg font-bold text-foreground mb-2">Impresi Konten</div>
          <div className="text-2xl font-black text-primary">{formatNumber(totals.impressions)}</div>
          <div className="text-xs text-muted mt-2">Total tayangan halaman/toko</div>
        </div>

        {/* Step 2: Clicks / CTR */}
        <div className="bg-card border border-border p-5 rounded-xl shadow-sm relative">
          <div className="text-xs font-semibold text-muted mb-1">Tahap 2: Minat (CTR)</div>
          <div className="text-lg font-bold text-foreground mb-2">Klik Halaman</div>
          <div className="text-2xl font-black text-blue-600">{formatNumber(totals.clicks)}</div>
          <div className="flex items-center gap-1.5 text-xs text-muted mt-2">
            <span>CTR Real:</span>
            <span className={`font-bold ${ctr >= 4.0 ? "text-green-600" : "text-amber-500"}`}>
              {formatPct(ctr)}
            </span>
          </div>
        </div>

        {/* Step 3: ATC */}
        <div className="bg-card border border-border p-5 rounded-xl shadow-sm relative">
          <div className="text-xs font-semibold text-muted mb-1">Tahap 3: Niat (ATC)</div>
          <div className="text-lg font-bold text-foreground mb-2">Tambah Keranjang</div>
          <div className="text-2xl font-black text-purple-600">{formatNumber(totals.atc)}</div>
          <div className="flex items-center gap-1.5 text-xs text-muted mt-2">
            <span>Rasio ATC:</span>
            <span className="font-bold text-foreground">{formatPct(atcRate)}</span>
          </div>
        </div>

        {/* Step 4: Orders / CTOR */}
        <div className="bg-card border border-border p-5 rounded-xl shadow-sm relative">
          <div className="text-xs font-semibold text-muted mb-1">Tahap 4: Closing (CTOR)</div>
          <div className="text-lg font-bold text-foreground mb-2">Total Pesanan</div>
          <div className="text-2xl font-black text-green-600">{formatNumber(totals.orders)}</div>
          <div className="flex items-center gap-1.5 text-xs text-muted mt-2">
            <span>CTOR Real:</span>
            <span className={`font-bold ${ctor >= 10.0 ? "text-green-600" : "text-red-500"}`}>
              {formatPct(ctor)}
            </span>
          </div>
        </div>
      </div>

      {/* High Revenue vs Low Revenue Funnel Comparison */}
      {comparisonStages.length > 0 && (
        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
          <h3 className="text-base font-bold text-foreground mb-1">
            Komparasi Funnel Real (Hari Omset Tinggi vs Omset Rendah)
          </h3>
          <p className="text-xs text-muted mb-6">
            Dihitung dari 50% hari dengan omset tertinggi vs 50% hari dengan omset terendah pada toko Anda
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/30 text-muted uppercase text-xs">
                <tr>
                  <th className="p-3 rounded-l-lg">Tahap Funnel</th>
                  <th className="p-3">Hari Omset Tinggi (Rata2)</th>
                  <th className="p-3">Hari Omset Rendah (Rata2)</th>
                  <th className="p-3 text-right rounded-r-lg">Selisih Penurunan (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {comparisonStages.map((stage, idx) => (
                  <tr key={idx} className="hover:bg-muted/10">
                    <td className="p-3 font-semibold text-foreground">{stage.stage}</td>
                    <td className="p-3 font-medium text-foreground">{formatNumber(stage.highPeriodValue)}</td>
                    <td className="p-3 text-muted">{formatNumber(stage.lowPeriodValue)}</td>
                    <td className="p-3 text-right">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-600">
                        <TrendingDown size={12} /> -{stage.dropPct.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
