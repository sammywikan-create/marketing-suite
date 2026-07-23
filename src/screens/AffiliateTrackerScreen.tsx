"use client";
import { useMemo } from "react";
import { useStoreManager } from "@/store/useStoreManager";
import {
  computeAffiliateTracker,
  formatRupiah,
  formatRupiahShort,
} from "@/utils/revenueAnalyzer";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  AlertTriangle,
  Sparkles,
  Database,
  Upload,
} from "lucide-react";

export default function AffiliateTrackerScreen() {
  const { getActiveStore } = useStoreManager();
  const activeStore = getActiveStore();

  const affiliateDataList = activeStore?.affiliateData || [];

  const {
    hasData,
    history,
    totalGMV,
    affiliateShare,
    activeCreators,
    avgPerCreator,
    gmvDropPct,
    creatorDropCount,
    isAlert,
  } = useMemo(() => computeAffiliateTracker(affiliateDataList), [affiliateDataList]);

  if (!hasData || affiliateDataList.length === 0) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col items-center justify-center py-20 bg-card border border-border rounded-2xl text-center shadow-sm">
          <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
            <Database size={32} />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">
            Belum Ada Data Afiliasi Real ({activeStore?.name || "Toko Aktif"})
          </h2>
          <p className="text-sm text-muted max-w-md mb-6 leading-relaxed">
            Untuk menyajikan pemantauan performa kreator afiliasi real kepada direksi, silakan unggah file Excel laporan <strong>Affiliate Manager</strong> toko Anda.
          </p>
          <a
            href="#affiliate"
            className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold text-sm shadow-lg hover:opacity-90 transition-opacity"
          >
            <Upload size={18} /> Upload Data Afiliasi Real
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
              Peringatan Keaktifan Saluran Afiliasi
            </div>
            <p className="text-muted">
              Terdapat <strong>{creatorDropCount} kreator afiliasi</strong> yang tidak aktif mempromosikan produk pada periode ini.
            </p>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Affiliate Share */}
        <div className="bg-card border border-border p-5 rounded-xl shadow-sm">
          <div className="text-xs font-semibold text-muted mb-1">Porsi GMV Afiliasi Real</div>
          <div className="text-2xl font-black text-primary mb-1">{affiliateShare.toFixed(1)}%</div>
          <div className="text-xs text-muted mt-2">
            Persentase kontribusi omset dari saluran kreator afiliasi
          </div>
        </div>

        {/* Active Creators Count */}
        <div className="bg-card border border-border p-5 rounded-xl shadow-sm">
          <div className="text-xs font-semibold text-muted mb-1">Kreator Aktif Posting Real</div>
          <div className="text-2xl font-black text-purple-600 mb-1">{activeCreators} Kreator</div>
          <div className="text-xs text-muted mt-2">Kreator yang terverifikasi menghasilkan penjualan</div>
        </div>

        {/* Avg GMV per Creator */}
        <div className="bg-card border border-border p-5 rounded-xl shadow-sm">
          <div className="text-xs font-semibold text-muted mb-1">Rata-rata Kontribusi / Kreator</div>
          <div className="text-2xl font-black text-foreground mb-1">{formatRupiahShort(avgPerCreator)}</div>
          <div className="text-xs text-muted mt-2">Rata-rata GMV per kreator aktif real</div>
        </div>

        {/* Total Affiliate GMV */}
        <div className="bg-card border border-border p-5 rounded-xl shadow-sm">
          <div className="text-xs font-semibold text-muted mb-1">Total GMV Afiliasi Real</div>
          <div className="text-2xl font-black text-green-600 mb-1">{formatRupiahShort(totalGMV)}</div>
          <div className="text-xs text-muted mt-2">Dihitung dari file laporan terunggah</div>
        </div>
      </div>

      {/* Area Chart: Affiliate vs Own Brand GMV */}
      {history.length > 0 && (
        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-foreground">
                Tren GMV Afiliasi vs GMV Toko Sendiri (Data Real)
              </h3>
              <p className="text-xs text-muted">Perbandingan historis omset jaringan afiliasi toko {activeStore?.name}</p>
            </div>
          </div>
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
      )}
    </div>
  );
}
