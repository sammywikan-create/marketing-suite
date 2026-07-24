"use client";
import type { OmsetDiagnosisItem } from "@/lib/types";
import MetricHelpTooltip from "@/components/MetricHelpTooltip";

interface DoctorDiagnosisCardProps {
  hasData: boolean;
  healthScore: number;
  healthStatus: "SANGAT SEHAT" | "PERLU PERHATIAN" | "KRITIS";
  diagnoses: OmsetDiagnosisItem[];
  onNavigate: (tab: string) => void;
}

const SEVERITY_BADGE: Record<OmsetDiagnosisItem["severity"], string> = {
  CRITICAL: "bg-red-500 text-white",
  WARNING: "bg-amber-500 text-white",
  HEALTHY: "bg-green-500 text-white",
};

const STATUS_STYLE: Record<DoctorDiagnosisCardProps["healthStatus"], string> = {
  "SANGAT SEHAT": "bg-green-50 text-green-700 border-green-200",
  "PERLU PERHATIAN": "bg-amber-50 text-amber-700 border-amber-200",
  KRITIS: "bg-red-50 text-red-700 border-red-200",
};

/**
 * Kartu Diagnosis Omset Doctor di Executive Summary.
 * Memakai engine resmi runOmsetDoctorDiagnosis (revenueAnalyzer.ts):
 * skor kesehatan, akar masalah, dan rekomendasi solusi teratas.
 */
export default function DoctorDiagnosisCard({
  hasData,
  healthScore,
  healthStatus,
  diagnoses,
  onNavigate,
}: DoctorDiagnosisCardProps) {
  const topDiagnoses = [...diagnoses]
    .sort((a, b) => b.impactScore - a.impactScore)
    .slice(0, 3);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 flex flex-col">
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
          🩺 Diagnosis Omset Doctor
          <MetricHelpTooltip
            title="Omset Doctor"
            desc="Engine diagnostik otomatis yang membaca trafik, CTR, CTOR, dan GPM LIVE untuk menemukan akar masalah omset beserta solusi praktisnya."
          />
        </h3>
        {hasData && (
          <span className={`rounded-full border px-3 py-1 text-xs font-bold ${STATUS_STYLE[healthStatus]}`}>
            {healthScore}/100 — {healthStatus}
          </span>
        )}
      </div>

      {!hasData ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-6 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-600">
          <span className="text-2xl mb-2">🩺</span>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
            Belum ada data harian untuk didiagnosis.
          </p>
          <p className="text-[11px] text-gray-400 mt-1">
            Upload data Business Overview / Data Compass agar dokter bisa bekerja.
          </p>
          <button
            onClick={() => onNavigate("gmv-upload")}
            className="mt-3 text-xs bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition"
          >
            Upload Data →
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-3 flex-1">
            {topDiagnoses.map((d) => (
              <div
                key={d.id}
                className={`rounded-xl border p-3 ${
                  d.severity === "CRITICAL"
                    ? "bg-red-50/60 border-red-100 dark:bg-red-900/10 dark:border-red-900/30"
                    : d.severity === "WARNING"
                    ? "bg-amber-50/60 border-amber-100 dark:bg-amber-900/10 dark:border-amber-900/30"
                    : "bg-green-50/60 border-green-100 dark:bg-green-900/10 dark:border-green-900/30"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-bold text-gray-900 dark:text-white leading-snug">
                    {d.title}
                  </span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${SEVERITY_BADGE[d.severity]}`}>
                    {d.severity}
                  </span>
                </div>
                <p className="text-[11px] text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">
                  {d.diagnosis}
                </p>
                <div className="mt-2 space-y-1">
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                    <span className="font-semibold">🧩 Akar masalah:</span> {d.rootCause}
                  </p>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400 leading-relaxed">
                    <span className="font-semibold">✅ Solusi:</span> {d.recommendation}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => onNavigate("omset-doctor")}
            className="mt-4 w-full text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/30 rounded-lg py-2 transition"
          >
            Buka Diagnosis Lengkap di Omset Doctor →
          </button>
        </>
      )}
    </div>
  );
}
