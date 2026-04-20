"use client";
import { getBenchmarkColor } from "@/lib/product-card/benchmarks";
import type { BenchmarkLevel } from "@/lib/product-card/benchmarks";

interface FunnelStep {
  icon: string;
  label: string;
  value: number;
  formatted: string;
}

interface FunnelArrow {
  rate: number;
  benchmark: BenchmarkLevel;
}

function fmtPct(v: number) {
  return (v * 100).toFixed(2) + "%";
}

export default function ConversionFunnel({
  steps,
  arrows,
}: {
  steps: FunnelStep[];
  arrows: FunnelArrow[];
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <h3 className="text-sm font-semibold mb-4">🔄 Funnel Konversi</h3>
      <div className="flex items-center justify-between gap-1 overflow-x-auto">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-1 min-w-0">
            {/* Step box */}
            <div className="bg-gray-50 rounded-xl p-3 text-center min-w-[100px]">
              <div className="text-lg">{step.icon}</div>
              <div className="text-[10px] text-gray-400 font-medium">{step.label}</div>
              <div className="text-sm font-bold text-gray-900">{step.formatted}</div>
            </div>
            {/* Arrow */}
            {i < arrows.length && (
              <div className="flex flex-col items-center px-1 min-w-[60px]">
                <span className={`text-[10px] font-bold ${
                  getBenchmarkColor(arrows[i].rate, arrows[i].benchmark) === "green"
                    ? "text-green-600"
                    : getBenchmarkColor(arrows[i].rate, arrows[i].benchmark) === "yellow"
                    ? "text-yellow-600"
                    : "text-red-500"
                }`}>
                  {fmtPct(arrows[i].rate)}
                </span>
                <div className={`w-full h-0.5 ${
                  getBenchmarkColor(arrows[i].rate, arrows[i].benchmark) === "green"
                    ? "bg-green-400"
                    : getBenchmarkColor(arrows[i].rate, arrows[i].benchmark) === "yellow"
                    ? "bg-yellow-400"
                    : "bg-red-400"
                }`} />
                <span className="text-[8px] text-gray-300">▶</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
