"use client";
import { useMemo } from "react";
import { runOmsetDoctorDiagnosis } from "@/utils/revenueAnalyzer";
import {
  Stethoscope,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  ArrowRight,
  Sparkles,
  Lightbulb,
  ShieldAlert,
} from "lucide-react";

export default function OmsetDoctorScreen() {
  const { healthScore, healthStatus, diagnoses } = useMemo(() => runOmsetDoctorDiagnosis(), []);

  const getStatusBadge = (status: typeof healthStatus) => {
    switch (status) {
      case "SANGAT SEHAT":
        return "bg-green-500/10 text-green-600 border-green-500/30";
      case "PERLU PERHATIAN":
        return "bg-amber-500/10 text-amber-600 border-amber-500/30";
      case "KRITIS":
        return "bg-red-500/10 text-red-600 border-red-500/30";
    }
  };

  const getSeverityBadge = (severity: "CRITICAL" | "WARNING" | "HEALTHY") => {
    switch (severity) {
      case "CRITICAL":
        return "bg-red-500 text-white";
      case "WARNING":
        return "bg-amber-500 text-white";
      case "HEALTHY":
        return "bg-green-500 text-white";
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-card border border-border p-6 rounded-2xl shadow-sm gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary mb-1">
            <Sparkles size={16} /> Fitur 5: Killer Feature (AI / Rule-based Diagnosis)
          </div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Stethoscope className="text-primary" size={28} /> Omset Doctor (Diagnosis Otomatis)
          </h1>
          <p className="text-sm text-muted">
            Menjawab pertanyaan: <span className="font-medium text-foreground">&quot;Penyebab utama omset turun apa & bagaimana cara memperbaikinya?&quot;</span>
          </p>
        </div>

        {/* Health Score Box */}
        <div className="flex items-center gap-4 bg-muted/20 border border-border p-4 rounded-xl">
          <div className="relative size-16 flex items-center justify-center">
            <svg className="size-full -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-muted/30"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className={healthScore >= 80 ? "text-green-500" : healthScore >= 60 ? "text-amber-500" : "text-red-500"}
                strokeDasharray={`${healthScore}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="absolute text-base font-black text-foreground">{healthScore}</span>
          </div>

          <div>
            <div className="text-xs text-muted">Skor Kesehatan Bisnis</div>
            <div className={`text-sm font-extrabold px-2.5 py-0.5 rounded border inline-block mt-0.5 ${getStatusBadge(healthStatus)}`}>
              {healthStatus}
            </div>
          </div>
        </div>
      </div>

      {/* Diagnoses List */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-foreground">Hasil Analisis & Rekomendasi Perbaikan</h3>

        {diagnoses.map((diag) => (
          <div
            key={diag.id}
            className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-4 hover:border-primary/50 transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-1 rounded text-xs font-bold ${getSeverityBadge(diag.severity)}`}>
                  {diag.severity}
                </span>
                <h4 className="text-base font-bold text-foreground">{diag.title}</h4>
              </div>
              <div className="text-xs text-muted font-medium">Skor Dampak: {diag.impactScore}/100</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border/50 text-sm">
              <div className="space-y-2">
                <div>
                  <span className="text-xs font-semibold text-muted block">Diagnosis:</span>
                  <p className="text-foreground font-medium">{diag.diagnosis}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-muted block">Akar Masalah (Root Cause):</span>
                  <p className="text-muted">{diag.rootCause}</p>
                </div>
              </div>

              <div className="bg-primary/5 border border-primary/20 p-4 rounded-xl space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold text-primary">
                  <Lightbulb size={16} /> Rekomendasi Solusi Praktis:
                </div>
                <p className="text-foreground text-sm leading-relaxed">{diag.recommendation}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
