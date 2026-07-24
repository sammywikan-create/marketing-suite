"use client";
import { useMemo } from "react";
import { useOKRStore } from "@/store/useOKRStore";
import MetricHelpTooltip from "@/components/MetricHelpTooltip";
import type { OKRDepartment } from "@/lib/types";

interface OKRSnapshotCardProps {
  onNavigate: (tab: string) => void;
}

const DEPT_LABEL: Record<OKRDepartment, string> = {
  konseptor: "Konseptor",
  smo: "SMO",
  advertiser: "Advertiser",
  affiliate: "Affiliate",
  custom: "Custom",
};

const DEPT_COLOR: Record<OKRDepartment, string> = {
  konseptor: "bg-purple-100 text-purple-700",
  smo: "bg-cyan-100 text-cyan-700",
  advertiser: "bg-orange-100 text-orange-700",
  affiliate: "bg-blue-100 text-blue-700",
  custom: "bg-gray-100 text-gray-600",
};

/**
 * Widget snapshot progress OKR di Executive Summary.
 * Menghitung progress tertimbang (weighted) tiap objective aktif
 * dengan formula yang sama seperti di OKRScreen.
 */
export default function OKRSnapshotCard({ onNavigate }: OKRSnapshotCardProps) {
  const objectives = useOKRStore((s) => s.objectives);

  const snapshot = useMemo(() => {
    const active = objectives.filter((o) => o.status === "active");
    const rows = active.map((obj) => {
      const krs = obj.keyResults || [];
      const totalWeight = krs.reduce((a, kr) => a + (kr.weight || 0), 0);
      const progress =
        krs.length === 0
          ? 0
          : totalWeight > 0
          ? krs.reduce(
              (a, kr) =>
                a +
                Math.min((kr.currentValue / Math.max(kr.targetValue, 1)) * 100, 100) *
                  (kr.weight / totalWeight),
              0
            )
          : krs.reduce(
              (a, kr) => a + Math.min((kr.currentValue / Math.max(kr.targetValue, 1)) * 100, 100),
              0
            ) / krs.length;
      return { obj, progress, krCount: krs.length };
    });
    const avgProgress = rows.length > 0 ? rows.reduce((a, r) => a + r.progress, 0) / rows.length : 0;
    // Urutkan dari progress terendah (paling berisiko) agar eksekutif fokus ke yang tertinggal
    const sorted = [...rows].sort((a, b) => a.progress - b.progress);
    return { rows: sorted.slice(0, 4), totalActive: rows.length, avgProgress };
  }, [objectives]);

  const progressColor = (p: number) =>
    p >= 70 ? "bg-green-500" : p >= 40 ? "bg-amber-500" : "bg-red-400";
  const progressText = (p: number) =>
    p >= 70 ? "text-green-600" : p >= 40 ? "text-amber-600" : "text-red-500";

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 flex flex-col">
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
          🎯 Progress OKR Tim
          <MetricHelpTooltip
            title="OKR Snapshot"
            desc="Ringkasan pencapaian Objectives & Key Results tiap departemen. Progress dihitung tertimbang berdasarkan bobot tiap Key Result."
          />
        </h3>
        {snapshot.totalActive > 0 && (
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold border ${
              snapshot.avgProgress >= 70
                ? "bg-green-50 text-green-700 border-green-200"
                : snapshot.avgProgress >= 40
                ? "bg-amber-50 text-amber-700 border-amber-200"
                : "bg-red-50 text-red-700 border-red-200"
            }`}
          >
            Rata-rata {snapshot.avgProgress.toFixed(0)}%
          </span>
        )}
      </div>

      {snapshot.totalActive === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-6 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-600">
          <span className="text-2xl mb-2">🎯</span>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
            Belum ada Objective aktif.
          </p>
          <p className="text-[11px] text-gray-400 mt-1">
            Buat OKR per departemen agar target tim terpantau di sini.
          </p>
          <button
            onClick={() => onNavigate("okr")}
            className="mt-3 text-xs bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition"
          >
            Buat OKR Sekarang →
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-3 flex-1">
            {snapshot.rows.map(({ obj, progress, krCount }) => (
              <div key={obj.id} className="rounded-xl border border-gray-100 dark:border-gray-700 p-3">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${DEPT_COLOR[obj.department]}`}>
                      {DEPT_LABEL[obj.department]}
                    </span>
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">
                      {obj.title}
                    </span>
                  </div>
                  <span className={`text-xs font-bold flex-shrink-0 ${progressText(progress)}`}>
                    {progress.toFixed(0)}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${progressColor(progress)}`}
                      style={{ width: `${Math.min(100, progress)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-400 flex-shrink-0">{krCount} KR</span>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => onNavigate("okr")}
            className="mt-4 w-full text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/30 rounded-lg py-2 transition"
          >
            Kelola {snapshot.totalActive} Objective di OKR Framework →
          </button>
        </>
      )}
    </div>
  );
}
