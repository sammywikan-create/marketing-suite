"use client";
import MetricHelpTooltip from "@/components/MetricHelpTooltip";

interface TargetPaceInfo {
  daysElapsed: number;
  totalDaysInMonth: number;
  daysRemaining: number;
  actualDailyGMV: number;
  requiredDailyGMV: number;
  status: string; // ACHIEVED | AHEAD | ON_TRACK | BEHIND
}

interface TargetRaceCardProps {
  targetGMV: number;
  currentGMV: number;
  progressPct: number;
  pace: TargetPaceInfo | null;
  projectedEOM: number;
  aov: number;
  periodLabel: string;
  onSetTarget: () => void;
}

const fRp = (n: number) => "Rp " + Math.round(n).toLocaleString("id-ID");
const fRpShort = (n: number) =>
  Math.abs(n) >= 1e9 ? `Rp ${(n / 1e9).toFixed(2)}M` : Math.abs(n) >= 1e6 ? `Rp ${(n / 1e6).toFixed(1)}Jt` : fRp(n);

const STATUS_INFO: Record<string, { label: string; chip: string; bar: string }> = {
  ACHIEVED: { label: "🎉 Target Tercapai!", chip: "bg-green-100 text-green-700", bar: "from-green-400 to-emerald-500" },
  AHEAD: { label: "🚀 Lebih Cepat dari Jadwal", chip: "bg-emerald-100 text-emerald-700", bar: "from-emerald-400 to-teal-500" },
  ON_TRACK: { label: "✅ Sesuai Jalur", chip: "bg-blue-100 text-blue-700", bar: "from-blue-400 to-indigo-500" },
  BEHIND: { label: "⚠️ Tertinggal dari Jadwal", chip: "bg-red-100 text-red-700", bar: "from-orange-400 to-red-500" },
};

/**
 * Balapan Target — visual lomba lari menuju target bulan ini.
 * Menjawab tiga pertanyaan manajer: sudah sampai mana, cukup cepat atau tidak,
 * dan akan finis di angka berapa.
 */
export default function TargetRaceCard({
  targetGMV,
  currentGMV,
  progressPct,
  pace,
  projectedEOM,
  aov,
  periodLabel,
  onSetTarget,
}: TargetRaceCardProps) {
  if (targetGMV <= 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-dashed border-indigo-200 dark:border-indigo-900/50 p-5 flex flex-col items-center justify-center text-center">
        <span className="text-3xl mb-2">🎯</span>
        <p className="text-sm font-bold text-gray-800 dark:text-gray-200">Target {periodLabel} belum ditetapkan</p>
        <p className="text-xs text-gray-400 mt-1 max-w-xs leading-relaxed">
          Tanpa target, sistem tidak bisa menghitung pace harian dan memberi tahu apakah bisnis sedang di jalur yang benar.
        </p>
        <button
          onClick={onSetTarget}
          className="mt-3 text-xs bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition"
        >
          Tetapkan Target Sekarang →
        </button>
      </div>
    );
  }

  const st = STATUS_INFO[pace?.status || "ON_TRACK"] || STATUS_INFO.ON_TRACK;
  const pct = Math.min(100, progressPct);
  const projPct = Math.min(100, targetGMV > 0 ? (projectedEOM / targetGMV) * 100 : 0);
  const gap = targetGMV - projectedEOM;
  const ordersNeeded = aov > 0 ? Math.ceil(Math.max(0, targetGMV - currentGMV) / aov) : 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 flex flex-col">
      <div className="flex items-center justify-between gap-2 flex-wrap mb-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          🏁 Balapan Target — {periodLabel}
          <MetricHelpTooltip
            title="Balapan Target"
            desc="Posisi omzet saat ini menuju target bulan ini. Bendera = garis finis, 🚩 proyeksi = perkiraan posisi akhir bulan jika kecepatan sekarang dipertahankan."
          />
        </h3>
        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${st.chip}`}>{st.label}</span>
      </div>

      {/* Lintasan */}
      <div className="relative mt-3 mb-1">
        <div className="h-5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${st.bar} transition-all duration-700 flex items-center justify-end`}
            style={{ width: `${Math.max(4, pct)}%` }}
          >
            <span className="pr-1 text-xs">🏃</span>
          </div>
        </div>
        {/* Marker proyeksi */}
        {projPct > 0 && (
          <div
            className="absolute -top-4 -translate-x-1/2 text-center"
            style={{ left: `${Math.max(3, Math.min(97, projPct))}%` }}
            title={`Proyeksi akhir bulan: ${fRp(projectedEOM)}`}
          >
            <span className="text-xs">🚩</span>
          </div>
        )}
        {/* Garis finis */}
        <div className="absolute right-0 -top-1.5 text-sm" title={`Target: ${fRp(targetGMV)}`}>🏁</div>
      </div>
      <div className="flex justify-between text-[10px] text-gray-400 mb-4">
        <span>{fRpShort(currentGMV)} tercapai ({pct.toFixed(0)}%)</span>
        <span>🚩 proyeksi {fRpShort(projectedEOM)}</span>
        <span>🏁 {fRpShort(targetGMV)}</span>
      </div>

      {/* Statistik pace */}
      <div className="grid grid-cols-2 gap-2 text-xs mt-auto">
        <div className="rounded-xl bg-gray-50 dark:bg-gray-700/60 p-3">
          <div className="text-[10px] text-gray-400">Sisa yang harus dikejar</div>
          <div className="text-sm font-black text-gray-900 dark:text-white mt-0.5">{fRpShort(Math.max(0, targetGMV - currentGMV))}</div>
          {ordersNeeded > 0 && <div className="text-[10px] text-gray-400 mt-0.5">≈ {ordersNeeded.toLocaleString("id-ID")} pesanan lagi</div>}
        </div>
        <div className="rounded-xl bg-gray-50 dark:bg-gray-700/60 p-3">
          <div className="text-[10px] text-gray-400">Sisa waktu</div>
          <div className="text-sm font-black text-gray-900 dark:text-white mt-0.5">{pace ? `${pace.daysRemaining} hari` : "—"}</div>
          {pace && <div className="text-[10px] text-gray-400 mt-0.5">hari ke-{pace.daysElapsed} dari {pace.totalDaysInMonth}</div>}
        </div>
        <div className="rounded-xl bg-gray-50 dark:bg-gray-700/60 p-3">
          <div className="text-[10px] text-gray-400">Kecepatan sekarang</div>
          <div className="text-sm font-black text-gray-900 dark:text-white mt-0.5">{pace ? `${fRpShort(pace.actualDailyGMV)}/hari` : "—"}</div>
        </div>
        <div className="rounded-xl bg-gray-50 dark:bg-gray-700/60 p-3">
          <div className="text-[10px] text-gray-400">Kecepatan wajib</div>
          <div className={`text-sm font-black mt-0.5 ${pace && pace.actualDailyGMV >= pace.requiredDailyGMV ? "text-green-600" : "text-red-500"}`}>
            {pace ? `${fRpShort(pace.requiredDailyGMV)}/hari` : "—"}
          </div>
        </div>
      </div>

      {/* Kesimpulan satu kalimat */}
      <div className={`mt-3 rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${gap <= 0 ? "bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300" : "bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300"}`}>
        {gap <= 0
          ? <>💬 Jika kecepatan dipertahankan, target akan <b>terlampaui {fRpShort(Math.abs(gap))}</b> di akhir bulan.</>
          : <>💬 Dengan kecepatan sekarang, akhir bulan diperkirakan <b>kurang {fRpShort(gap)}</b> dari target — perlu tambahan {pace ? <b>{fRpShort(Math.max(0, pace.requiredDailyGMV - pace.actualDailyGMV))}/hari</b> : "dorongan"}.</>}
      </div>
    </div>
  );
}
