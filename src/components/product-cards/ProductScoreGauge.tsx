"use client";
import type { ScoreBreakdown } from "@/lib/product-card/scoring";

export default function ProductScoreGauge({ score }: { score: ScoreBreakdown }) {
  const pct = score.total;
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (pct / 100) * circumference;
  const color = pct >= 80 ? "#10b981" : pct >= 60 ? "#3b82f6" : pct >= 40 ? "#f59e0b" : "#ef4444";

  const dims = [
    { label: "CTR", value: score.ctr, weight: "20%" },
    { label: "CVR", value: score.cvr, weight: "30%" },
    { label: "Klik→Krj", value: score.klikToCart, weight: "20%" },
    { label: "Volume", value: score.volume, weight: "20%" },
    { label: "Konten", value: score.content, weight: "10%" },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <h3 className="text-sm font-semibold mb-4">🎯 Skor Produk</h3>
      <div className="flex items-center gap-8">
        {/* Gauge */}
        <div className="relative w-32 h-32 flex-shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r="45" fill="none" stroke="#f3f4f6" strokeWidth="8" />
            <circle cx="50" cy="50" r="45" fill="none" stroke={color} strokeWidth="8"
              strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold" style={{ color }}>{pct}</span>
            <span className="text-xs text-gray-400">{score.emoji} {score.label}</span>
          </div>
        </div>
        {/* Breakdown */}
        <div className="flex-1 space-y-2">
          {dims.map((d) => (
            <div key={d.label} className="flex items-center gap-2 text-xs">
              <span className="w-16 text-gray-500">{d.label}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-2">
                <div className="h-2 rounded-full transition-all" style={{
                  width: `${d.value}%`,
                  backgroundColor: d.value >= 80 ? "#10b981" : d.value >= 60 ? "#3b82f6" : d.value >= 40 ? "#f59e0b" : "#ef4444",
                }} />
              </div>
              <span className="w-8 text-right font-bold">{d.value}</span>
              <span className="w-8 text-gray-300 text-[10px]">({d.weight})</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
