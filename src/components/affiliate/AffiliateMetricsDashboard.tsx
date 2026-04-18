"use client";
import type { AffiliateMonthData } from "@/lib/types";

type BadgeType = "Performance" | "Kreator" | "Gabungan";

const BADGE_STYLES: Record<BadgeType, string> = {
  Performance: "bg-blue-100 text-blue-700",
  Kreator: "bg-green-100 text-green-700",
  Gabungan: "bg-purple-100 text-purple-700",
};

type ValueColor = "rp" | "count" | "pct";
const VALUE_COLORS: Record<ValueColor, string> = {
  rp: "text-blue-700",
  count: "text-gray-800",
  pct: "text-green-700",
};

function fmtRp(v: number): string {
  if (v >= 1e9) return `Rp ${(v / 1e9).toFixed(1)}M`;
  if (v >= 1e6) return `Rp ${(v / 1e6).toFixed(1)}Jt`;
  if (v >= 1e3) return `Rp ${(v / 1e3).toFixed(0)}Rb`;
  return `Rp ${v.toLocaleString("id-ID")}`;
}
function fmtNum(v: number): string {
  return v.toLocaleString("id-ID");
}

interface MetricCard {
  icon: string;
  label: string;
  value: string;
  badge: BadgeType;
  sub: string;
  valueColor: ValueColor;
  alertColor?: string;
}

function buildMetrics(data: AffiliateMonthData): MetricCard[] {
  const s = data.summary;
  const cs = data.coreSummary;
  const st = data.coreStats;
  const creators = data.creators;
  const activeN = Math.max(s.activeCreators, 1);

  const activeRateColor =
    s.activeRate < 10 ? "text-red-500" : s.activeRate < 30 ? "text-yellow-600" : "text-green-600";

  return [
    {
      icon: "💰",
      label: "GMV Affiliate",
      value: fmtRp(cs?.gmvFromCreator ?? st?.affiliateGMV ?? s.totalGMV),
      badge: "Gabungan",
      sub: "GMV bersih dari semua kreator",
      valueColor: "rp",
    },
    {
      icon: "📊",
      label: "GMV Total",
      value: fmtRp(st?.affiliateGMV ?? s.totalGMV),
      badge: "Kreator",
      sub: "Total GMV sebelum refund",
      valueColor: "rp",
    },
    {
      icon: "🤝",
      label: "Creator Berkolaborasi",
      value: fmtNum(st?.affiliateCollaborations ?? s.totalCreators),
      badge: "Kreator",
      sub: "Total kreator yang punya kolaborasi aktif",
      valueColor: "count",
    },
    {
      icon: "👥",
      label: "Creator Aktif",
      value: fmtNum(s.activeCreators),
      badge: "Gabungan",
      sub: `${s.activeRate.toFixed(1)}% dari total ${s.totalCreators} kreator`,
      valueColor: "count",
      alertColor: activeRateColor,
    },
    {
      icon: "🎬",
      label: "Video Jualan Kreator",
      value: fmtNum(st?.affiliateShoppableVideos ?? cs?.videoCount ?? s.totalVideos),
      badge: "Kreator",
      sub: `avg ${(s.totalVideos / activeN).toFixed(1)} video/kreator aktif`,
      valueColor: "count",
    },
    {
      icon: "💸",
      label: "Perkiraan Komisi",
      value: fmtRp(s.totalCommission),
      badge: "Gabungan",
      sub: `Rate komisi: ${s.totalGMV > 0 ? (s.totalCommission / s.totalGMV * 100).toFixed(1) : "0"}% dari GMV`,
      valueColor: "rp",
    },
    {
      icon: "📡",
      label: "Siaran LIVE",
      value: fmtNum(st?.affiliateLiveStreams ?? cs?.liveStreamCount ?? s.totalLive),
      badge: "Kreator",
      sub: `avg ${(s.totalLive / activeN).toFixed(1)} live/kreator aktif`,
      valueColor: "count",
    },
    {
      icon: "📦",
      label: "Sample Terkirim",
      value: fmtNum(cs?.samplesSent ?? creators.reduce((a, c) => a + (c.sampelTerkirim || 0), 0)),
      badge: "Performance",
      sub: "Total sample produk dikirim ke kreator",
      valueColor: "count",
    },
    {
      icon: "🎥",
      label: "GMV Video Shoppable",
      value: fmtRp(st?.affiliateShoppableVideoGMV ?? s.videoGMV),
      badge: "Kreator",
      sub: `${s.totalGMV > 0 ? (s.videoGMV / s.totalGMV * 100).toFixed(1) : "0"}% dari total GMV`,
      valueColor: "rp",
    },
    {
      icon: "🔴",
      label: "GMV LIVE",
      value: fmtRp(s.liveGMV),
      badge: "Kreator",
      sub: `${s.totalGMV > 0 ? (s.liveGMV / s.totalGMV * 100).toFixed(1) : "0"}% dari total GMV`,
      valueColor: "rp",
    },
    {
      icon: "📹",
      label: "GMV Video",
      value: fmtRp(s.videoGMV),
      badge: "Kreator",
      sub: `${s.totalGMV > 0 ? (s.videoGMV / s.totalGMV * 100).toFixed(1) : "0"}% dari total GMV`,
      valueColor: "rp",
    },
    {
      icon: "👁️",
      label: "Impresi Produk",
      value: fmtNum(creators.reduce((a, c) => a + (c.productImpressions || 0), 0)),
      badge: "Kreator",
      sub: "Total tayangan produk dari semua kreator",
      valueColor: "count",
    },
    {
      icon: "🎯",
      label: "GMV Program Bertarget",
      value: fmtRp(creators.reduce((a, c) => a + (c.targetCollabGMV || 0), 0)),
      badge: "Kreator",
      sub: "Target Collaboration GMV",
      valueColor: "rp",
    },
    {
      icon: "🔓",
      label: "GMV Program Terbuka",
      value: fmtRp(creators.reduce((a, c) => a + (c.openCollabGMV || 0), 0)),
      badge: "Kreator",
      sub: "Open Collaboration GMV",
      valueColor: "rp",
    },
    {
      icon: "🃏",
      label: "GMV Kartu Produk",
      value: fmtRp(st?.affiliateProductCardGMV ?? s.productCardGMV),
      badge: "Kreator",
      sub: `${s.totalGMV > 0 ? (s.productCardGMV / s.totalGMV * 100).toFixed(1) : "0"}% dari total GMV`,
      valueColor: "rp",
    },
  ];
}

export function AffiliateMetricsDashboard({ data }: { data: AffiliateMonthData }) {
  const metrics = buildMetrics(data);

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h3 className="text-lg font-bold text-gray-800">📋 Ringkasan Metrik Lengkap</h3>
          <p className="text-sm text-gray-400">
            Data dari{" "}
            {data.source === "combined"
              ? "semua file (lengkap)"
              : data.source === "analitik"
              ? "Analitik Kreator"
              : "Performance Analitik"}
            {" — "}
            {data.period}
          </p>
        </div>
        <div className="flex gap-2">
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">Performance</span>
          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Kreator</span>
          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">Gabungan</span>
        </div>
      </div>

      {/* Warning banner if data incomplete */}
      {data.source !== "combined" && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-4 flex items-start gap-2">
          <span>⚠️</span>
          <div>
            <p className="text-sm font-semibold text-yellow-800">Data belum lengkap</p>
            <p className="text-xs text-yellow-600">
              {data.source === "analitik"
                ? "Upload juga file Transaction_Analysis_Core_Metrics untuk data lebih lengkap (Sample, AOV harian, dll)"
                : "Upload juga file Core_Stats dan Creator_List dari menu Analitik → Kreator untuk data channel GMV"}
            </p>
          </div>
        </div>
      )}

      {/* 15 metric cards grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {metrics.map((m, i) => (
          <div
            key={i}
            className="bg-white border border-gray-100 rounded-xl p-4 hover:shadow-md transition-shadow"
          >
            {/* Icon + badge row */}
            <div className="flex items-start justify-between mb-2">
              <span className="text-2xl">{m.icon}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${BADGE_STYLES[m.badge]}`}>
                {m.badge}
              </span>
            </div>
            {/* Value */}
            <p className={`text-xl font-bold ${m.alertColor || VALUE_COLORS[m.valueColor]}`}>
              {m.value}
            </p>
            {/* Label */}
            <p className="text-sm text-gray-500 mt-1">{m.label}</p>
            {/* Sub */}
            <p className="text-xs text-gray-400 mt-1">{m.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
