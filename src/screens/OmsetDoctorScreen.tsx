"use client";
import { useMemo } from "react";
import { useStoreManager } from "@/store/useStoreManager";
import { runOmsetDoctorDiagnosis } from "@/utils/revenueAnalyzer";
import {
  Stethoscope,
  Sparkles,
  Lightbulb,
  Database,
  Upload,
} from "lucide-react";

export default function OmsetDoctorScreen() {
  const { getActiveStore } = useStoreManager();
  const activeStore = getActiveStore();

  const overviewData = activeStore?.overviewData || [];
  const affiliateData = activeStore?.affiliateData || [];
  const videoData = activeStore?.videoData || [];

  const { hasData, healthScore, healthStatus, diagnoses } = useMemo(() => {
    return runOmsetDoctorDiagnosis(overviewData, affiliateData, videoData);
  }, [overviewData, affiliateData, videoData]);

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

  if (!hasData) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col items-center justify-center py-20 bg-card border border-border rounded-2xl text-center shadow-sm">
          <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
            <Database size={32} />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">
            Belum Ada Data Real Toko ({activeStore?.name || "Toko Aktif"})
          </h2>
          <p className="text-sm text-muted max-w-md mb-6 leading-relaxed">
            Omset Doctor memerlukan data transaksi real toko untuk melakukan diagnosis otomatis bagi direksi. Silakan unggah file Excel <strong>Overview Bisnis</strong> atau <strong>Laporan Harian</strong> toko Anda.
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
            <Sparkles size={16} /> Diagnosis Real Toko: {activeStore?.name}
          </div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Stethoscope className="text-primary" size={28} /> Omset Doctor (Diagnosis Otomatis Real)
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
            <div className="text-xs text-muted">Skor Kesehatan Real Toko</div>
            <div className={`text-sm font-extrabold px-2.5 py-0.5 rounded border inline-block mt-0.5 ${getStatusBadge(healthStatus)}`}>
              {healthStatus}
            </div>
          </div>
        </div>
      </div>

      {/* Diagnoses List */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-foreground">Hasil Analisis & Rekomendasi Perbaikan Real</h3>

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
                  <span className="text-xs font-semibold text-muted block">Diagnosis Real:</span>
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
