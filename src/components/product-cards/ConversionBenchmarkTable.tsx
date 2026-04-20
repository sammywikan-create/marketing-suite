"use client";
import { getBenchmarkEmoji, getBenchmarkBgClass } from "@/lib/product-card/benchmarks";
import type { BenchmarkLevel } from "@/lib/product-card/benchmarks";

interface BenchRow {
  label: string;
  value: number;
  benchmarkText: string;
  benchmark: BenchmarkLevel;
}

export default function ConversionBenchmarkTable({ rows }: { rows: BenchRow[] }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <h3 className="text-sm font-semibold mb-4">📏 Konversi vs Benchmark</h3>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b bg-gray-50">
            <th className="p-2.5 text-left">Metrik</th>
            <th className="p-2.5 text-right">Nilai</th>
            <th className="p-2.5 text-center">Benchmark</th>
            <th className="p-2.5 text-center">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const color = getBenchmarkBgClass(r.value, r.benchmark);
            const emoji = getBenchmarkEmoji(r.value, r.benchmark);
            const label = r.value >= r.benchmark.green ? "Baik" : r.value >= r.benchmark.yellow ? "Cukup" : "Rendah";
            const veryGood = r.value >= r.benchmark.green * 1.5;
            return (
              <tr key={i} className="border-b">
                <td className="p-2.5 font-medium">{r.label}</td>
                <td className="p-2.5 text-right font-bold">{(r.value * 100).toFixed(2)}%</td>
                <td className="p-2.5 text-center text-gray-400">{r.benchmarkText}</td>
                <td className="p-2.5 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${color}`}>
                    {emoji} {veryGood ? "Sangat Baik" : label}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
