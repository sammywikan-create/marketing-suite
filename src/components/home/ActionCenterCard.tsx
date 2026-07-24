"use client";
import MetricHelpTooltip from "@/components/MetricHelpTooltip";

export interface ActionItem {
  priority: 1 | 2 | 3;
  icon: string;
  title: string;
  why: string;
  action?: { label: string; tab: string };
}

interface ActionCenterCardProps {
  items: ActionItem[];
  onNavigate: (tab: string) => void;
}

const PRIORITY_STYLE: Record<number, { badge: string; label: string; border: string }> = {
  1: { badge: "bg-red-500 text-white", label: "P1 · MENDESAK", border: "border-l-red-500" },
  2: { badge: "bg-amber-500 text-white", label: "P2 · PENTING", border: "border-l-amber-500" },
  3: { badge: "bg-blue-500 text-white", label: "P3 · INFO", border: "border-l-blue-400" },
};

/**
 * Pusat Aksi — daftar prioritas yang harus dikerjakan tim,
 * digabung otomatis dari Alert lintas modul + rekomendasi Omset Doctor.
 * Manajer tidak perlu menafsirkan angka: langsung tahu apa yang harus dilakukan.
 */
export default function ActionCenterCard({ items, onNavigate }: ActionCenterCardProps) {
  const p1Count = items.filter((i) => i.priority === 1).length;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
      <div className="flex items-center justify-between gap-2 flex-wrap mb-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          🚀 Prioritas Aksi Minggu Ini
          <MetricHelpTooltip
            title="Pusat Aksi"
            desc="Rekomendasi tindakan yang dirangkum otomatis dari seluruh alert (ROAS, refund, pace target, drop channel) dan diagnosis Omset Doctor — diurutkan dari yang paling mendesak."
          />
        </h3>
        {items.length > 0 && (
          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${p1Count > 0 ? "bg-red-50 text-red-700 border border-red-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
            {p1Count > 0 ? `${p1Count} mendesak` : `${items.length} item`}
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <div className="text-center py-8 bg-green-50/60 dark:bg-green-900/10 rounded-xl border border-green-100 dark:border-green-900/30">
          <span className="text-3xl block mb-2">🎉</span>
          <p className="text-sm font-bold text-green-700 dark:text-green-400">Tidak ada aksi mendesak</p>
          <p className="text-xs text-gray-400 mt-1">Semua indikator dalam batas aman. Pertahankan momentum!</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {items.map((item, i) => {
            const ps = PRIORITY_STYLE[item.priority];
            return (
              <div
                key={i}
                className={`flex items-start gap-3 rounded-xl border border-gray-100 dark:border-gray-700 border-l-4 ${ps.border} bg-gray-50/60 dark:bg-gray-700/30 p-3.5`}
              >
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-xs font-black text-gray-600 dark:text-gray-300">
                  {i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${ps.badge}`}>{ps.label}</span>
                    <span className="text-xs font-bold text-gray-900 dark:text-white">{item.icon} {item.title}</span>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-gray-500 dark:text-gray-400">{item.why}</p>
                </div>
                {item.action && (
                  <button
                    onClick={() => onNavigate(item.action!.tab)}
                    className="flex-shrink-0 self-center text-[11px] font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40 px-3 py-1.5 rounded-lg transition whitespace-nowrap"
                  >
                    {item.action.label} →
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
