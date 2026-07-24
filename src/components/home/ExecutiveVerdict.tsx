"use client";
import MetricHelpTooltip from "@/components/MetricHelpTooltip";

export interface VerdictPillar {
  key: string;
  label: string;
  icon: string;
  score: number | null; // null = data belum tersedia
  note: string;
}

export interface CoverageItem {
  label: string;
  ok: boolean;
  detail: string;
}

interface ExecutiveVerdictProps {
  grade: string; // "A".."E"
  gradeLabel: string;
  score: number; // 0-100
  pillars: VerdictPillar[];
  narrative: string[];
  coverage: CoverageItem[];
  periodLabel: string;
}

const GRADE_COLORS: Record<string, { ring: string; text: string; glow: string }> = {
  A: { ring: "#34d399", text: "text-emerald-300", glow: "shadow-emerald-500/40" },
  B: { ring: "#60a5fa", text: "text-blue-300", glow: "shadow-blue-500/40" },
  C: { ring: "#fbbf24", text: "text-amber-300", glow: "shadow-amber-500/40" },
  D: { ring: "#fb923c", text: "text-orange-300", glow: "shadow-orange-500/40" },
  E: { ring: "#f87171", text: "text-red-300", glow: "shadow-red-500/40" },
};

function pillarColor(score: number): string {
  if (score >= 80) return "#34d399";
  if (score >= 60) return "#60a5fa";
  if (score >= 40) return "#fbbf24";
  return "#f87171";
}

/**
 * Panel Verdict Eksekutif — kesimpulan bisnis dalam 30 detik.
 * Grade A–E dihitung dari 5 pilar; narasi dibuat otomatis dalam
 * bahasa Indonesia sederhana; kelengkapan sumber data ditampilkan
 * transparan agar manajer tahu seberapa valid angka yang dibaca.
 */
export default function ExecutiveVerdict({
  grade,
  gradeLabel,
  score,
  pillars,
  narrative,
  coverage,
  periodLabel,
}: ExecutiveVerdictProps) {
  const gc = GRADE_COLORS[grade] || GRADE_COLORS.C;
  const okCount = coverage.filter((c) => c.ok).length;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0f1647] via-[#1a237e] to-[#312e81] p-5 sm:p-6 text-white shadow-xl">
      {/* dekorasi */}
      <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-16 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl" />

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center">
        {/* Grade ring */}
        <div className="flex items-center gap-5 lg:flex-col lg:gap-2 flex-shrink-0">
          <div className={`relative h-28 w-28 sm:h-32 sm:w-32 rounded-full shadow-2xl ${gc.glow}`}>
            <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="52" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.15)" strokeWidth="10" />
              <circle
                cx="60" cy="60" r="52" fill="none"
                stroke={gc.ring} strokeWidth="10" strokeLinecap="round"
                strokeDasharray={`${(score / 100) * 326.7} 326.7`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-5xl font-black leading-none ${gc.text}`}>{grade}</span>
              <span className="mt-1 text-[10px] font-bold tracking-widest text-white/60">{score}/100</span>
            </div>
          </div>
          <div className="lg:text-center">
            <div className={`text-sm font-black tracking-wide ${gc.text}`}>{gradeLabel}</div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-white/50">Nilai Bisnis · {periodLabel}</div>
          </div>
        </div>

        {/* Narasi verdict */}
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-1.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-300">Kesimpulan Eksekutif</p>
            <MetricHelpTooltip
              title="Verdict Eksekutif"
              desc="Kesimpulan otomatis dari seluruh data terunggah: nilai bisnis A–E dihitung dari 5 pilar (Penjualan, Profitabilitas, Efisiensi Iklan, Kreator, Kualitas)."
              dark
            />
          </div>
          {narrative.map((line, i) => (
            <p
              key={i}
              className={
                i === 0
                  ? "text-lg sm:text-xl font-extrabold leading-snug text-white"
                  : "mt-1.5 text-[13px] leading-relaxed text-indigo-100/90"
              }
            >
              {line}
            </p>
          ))}
        </div>

        {/* 5 pilar */}
        <div className="w-full flex-shrink-0 lg:w-64">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-300">5 Pilar Penilaian</p>
          <div className="space-y-2">
            {pillars.map((p) => (
              <div key={p.key} title={p.note}>
                <div className="mb-0.5 flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-white/85">{p.icon} {p.label}</span>
                  <span className="font-bold text-white/70">
                    {p.score === null ? "—" : Math.round(p.score)}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                  {p.score !== null && (
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${Math.max(4, p.score)}%`, backgroundColor: pillarColor(p.score) }}
                    />
                  )}
                </div>
                <div className="mt-0.5 truncate text-[9.5px] text-white/45">{p.note}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Kelengkapan sumber data */}
      <div className="relative mt-5 flex flex-wrap items-center gap-1.5 border-t border-white/10 pt-3.5">
        <span className="mr-1 text-[10px] font-bold uppercase tracking-widest text-white/50">
          Validitas data ({okCount}/{coverage.length} sumber aktif):
        </span>
        {coverage.map((c) => (
          <span
            key={c.label}
            className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${
              c.ok
                ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                : "border-white/15 bg-white/5 text-white/40"
            }`}
            title={c.detail}
          >
            {c.ok ? "✓" : "○"} {c.label} · {c.detail}
          </span>
        ))}
      </div>
    </div>
  );
}
