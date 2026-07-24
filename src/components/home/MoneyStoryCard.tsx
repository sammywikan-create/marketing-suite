"use client";
import MetricHelpTooltip from "@/components/MetricHelpTooltip";

interface MoneyStoryCardProps {
  omzet: number;
  cost: number;
  profit: number;
  marginPct: number;
  hasCostData: boolean;
  // fallback ketika biaya belum tersedia (hanya data affiliate)
  totalGMV: number;
  refund: number;
  commission: number;
  sourceNote: string;
}

const fRp = (n: number) => "Rp " + Math.round(n).toLocaleString("id-ID");
const fRpShort = (n: number) =>
  Math.abs(n) >= 1e9 ? `Rp ${(n / 1e9).toFixed(2)}M` : Math.abs(n) >= 1e6 ? `Rp ${(n / 1e6).toFixed(1)}Jt` : fRp(n);
const fP = (n: number) => `${n.toFixed(1)}%`;

interface Step {
  icon: string;
  label: string;
  value: number;
  sub: string;
  tone: "in" | "out" | "result";
}

/**
 * Cerita Uang — alur Omzet → Biaya → Untung dalam bahasa yang
 * langsung dipahami manajer, plus analogi "dari setiap Rp100.000".
 */
export default function MoneyStoryCard({
  omzet,
  cost,
  profit,
  marginPct,
  hasCostData,
  totalGMV,
  refund,
  commission,
  sourceNote,
}: MoneyStoryCardProps) {
  const steps: Step[] = hasCostData
    ? [
        { icon: "💰", label: "Uang Masuk (Omzet)", value: omzet, sub: "penjualan kotor", tone: "in" },
        { icon: "💸", label: "Biaya Keluar", value: cost, sub: omzet > 0 ? `${fP((cost / omzet) * 100)} dari omzet` : "-", tone: "out" },
        { icon: profit >= 0 ? "✅" : "🩸", label: profit >= 0 ? "Untung Kotor" : "RUGI", value: profit, sub: `margin ${fP(marginPct)}`, tone: "result" },
      ]
    : [
        { icon: "💰", label: "GMV Affiliate", value: totalGMV, sub: "penjualan kotor kreator", tone: "in" },
        { icon: "↩️", label: "Refund + Komisi", value: refund + commission, sub: totalGMV > 0 ? `${fP(((refund + commission) / totalGMV) * 100)} dari GMV` : "-", tone: "out" },
        { icon: "✅", label: "Bersih Setelah Komisi", value: totalGMV - refund - commission, sub: "sebelum biaya iklan & operasional", tone: "result" },
      ];

  const per100k = hasCostData
    ? Math.round((marginPct / 100) * 100000)
    : totalGMV > 0
    ? Math.round(((totalGMV - refund - commission) / totalGMV) * 100000)
    : 0;

  const toneStyle = (t: Step["tone"], v: number) =>
    t === "in"
      ? "border-emerald-200 bg-emerald-50 dark:bg-emerald-900/15 dark:border-emerald-900/40"
      : t === "out"
      ? "border-orange-200 bg-orange-50 dark:bg-orange-900/15 dark:border-orange-900/40"
      : v >= 0
      ? "border-blue-200 bg-blue-50 dark:bg-blue-900/15 dark:border-blue-900/40"
      : "border-red-300 bg-red-50 dark:bg-red-900/15 dark:border-red-900/40";

  const toneText = (t: Step["tone"], v: number) =>
    t === "in" ? "text-emerald-700 dark:text-emerald-400" : t === "out" ? "text-orange-600 dark:text-orange-400" : v >= 0 ? "text-blue-700 dark:text-blue-400" : "text-red-600";

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 flex flex-col">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        💵 Cerita Uang Bulan Ini
        <MetricHelpTooltip
          title="Cerita Uang"
          desc="Alur uang bisnis dalam bahasa sederhana: berapa yang masuk, berapa yang keluar, dan berapa yang tersisa sebagai untung."
        />
      </h3>

      <div className="flex flex-col sm:flex-row items-stretch gap-2 flex-1">
        {steps.map((s, i) => (
          <div key={s.label} className="flex flex-1 items-center gap-2">
            <div className={`flex-1 rounded-xl border p-3.5 text-center ${toneStyle(s.tone, s.value)}`}>
              <div className="text-xl">{s.icon}</div>
              <div className={`mt-1 text-lg font-black leading-tight ${toneText(s.tone, s.value)}`}>
                {s.tone === "out" ? "−" : ""}{fRpShort(Math.abs(s.value))}
              </div>
              <div className="mt-0.5 text-[11px] font-semibold text-gray-700 dark:text-gray-300">{s.label}</div>
              <div className="text-[10px] text-gray-400">{s.sub}</div>
            </div>
            {i < steps.length - 1 && (
              <span className="hidden sm:block text-lg text-gray-300 dark:text-gray-600 flex-shrink-0">→</span>
            )}
          </div>
        ))}
      </div>

      <div className={`mt-4 rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${per100k >= 0 ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-800 dark:text-indigo-200" : "bg-red-50 text-red-700"}`}>
        💬 <b>Bahasa sederhana:</b>{" "}
        {per100k >= 0
          ? <>dari setiap <b>Rp100.000</b> penjualan, sekitar <b>{fRp(per100k)}</b> {hasCostData ? "menjadi untung kotor" : "tersisa setelah refund & komisi kreator"}.</>
          : <>bisnis sedang <b>rugi</b> — setiap Rp100.000 penjualan justru minus <b>{fRp(Math.abs(per100k))}</b>. Prioritaskan pangkas biaya terbesar.</>}
      </div>

      <p className="mt-2 text-[10px] text-gray-400">📌 Sumber: {sourceNote}</p>
    </div>
  );
}
