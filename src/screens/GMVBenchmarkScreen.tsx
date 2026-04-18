"use client";
import { useState } from "react";
import { useGMVStore } from "@/lib/gmvStore";
import { compareBenchmark } from "@/utils/gmvAnalyzer";
import { Award, AlertCircle, ChevronDown, ChevronUp, CheckCircle, XCircle } from "lucide-react";

const secrets = [
  { title: "1. Video Hook 3 Detik Pertama", content: "Seller top selalu membuat 3 detik pertama video sangat menarik. Gunakan pertanyaan provokatif, fakta mengejutkan, atau visual yang eye-catching. Target: 2-second view rate >= 30%." },
  { title: "2. Rotasi Kreatif Setiap 3-5 Hari", content: "Jangan biarkan satu creative jalan terlalu lama. Seller top merotasi 3-5 variasi creative setiap minggu untuk menghindari ad fatigue dan menjaga CTR tetap tinggi." },
  { title: "3. Targeting Lookalike dari Buyer", content: "Seller top menggunakan data buyer existing untuk membuat lookalike audience. Ini menghasilkan conversion rate 2-3x lebih tinggi dibanding interest-based targeting." },
  { title: "4. Bundling & Cross-sell Strategy", content: "Alih-alih jual produk satuan, seller top membuat bundling 2-3 produk. Ini meningkatkan AOV (Average Order Value) 40-60% dan menurunkan cost per order secara signifikan." },
  { title: "5. Dayparting: Iklan di Jam Premium", content: "Seller top hanya menjalankan iklan di jam 19:00-23:00 (prime time TikTok). Ini menghasilkan CTR 2x lebih tinggi dan CPO 30% lebih rendah dibanding iklan 24 jam." },
  { title: "6. A/B Test Thumbnail & CTA", content: "Setiap creative selalu di-A/B test: variasi thumbnail, hook, dan CTA. Seller top menjalankan minimal 3-5 variasi per campaign dan hanya scale yang winning." },
  { title: "7. Retargeting Funnel Berlapis", content: "Seller top membangun retargeting funnel: Video Viewer → Profile Visitor → Add to Cart → Purchase. Setiap layer mendapat creative berbeda yang relevan dengan intent-nya." },
];

export default function GMVBenchmarkScreen({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const { data } = useGMVStore();
  const [openSecret, setOpenSecret] = useState<number | null>(null);

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle size={48} className="text-muted mb-4" />
        <h2 className="text-lg font-semibold mb-2">Belum Ada Data</h2>
        <p className="text-sm text-muted mb-4">Upload file Excel terlebih dahulu.</p>
        <button onClick={() => onNavigate?.("gmv-upload")} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark">Upload Data</button>
      </div>
    );
  }

  const benchmark = compareBenchmark(data);
  const goodCount = benchmark.filter(b => b.isGood).length;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary"><Award size={20} /></div>
        <div>
          <h1 className="text-xl font-bold">Top Seller Metrics</h1>
          <p className="text-sm text-muted">Bandingkan performa Anda dengan benchmark seller top TikTok</p>
        </div>
      </div>

      {/* Score Summary */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-border mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted">Benchmark Score</p>
            <p className="text-3xl font-bold text-foreground">{goodCount} / {benchmark.length}</p>
            <p className="text-sm text-muted mt-1">metrik sudah memenuhi standar seller top</p>
          </div>
          <div className="w-20 h-20 rounded-full border-4 border-primary flex items-center justify-center">
            <span className={`text-xl font-bold ${goodCount >= 5 ? "text-green-600" : goodCount >= 3 ? "text-orange-600" : "text-red-600"}`}>
              {Math.round((goodCount / benchmark.length) * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* Benchmark Table */}
      <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden mb-8">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b border-border">
              <th className="text-left px-4 py-3 font-semibold text-muted">Metrik</th>
              <th className="text-center px-4 py-3 font-semibold text-muted">Seller Biasa</th>
              <th className="text-center px-4 py-3 font-semibold text-muted">Seller TOP 🏆</th>
              <th className="text-center px-4 py-3 font-semibold text-muted">Data Kamu</th>
              <th className="text-center px-4 py-3 font-semibold text-muted">Status</th>
            </tr></thead>
            <tbody>
              {benchmark.map((b, i) => (
                <tr key={i} className={`border-b border-border ${b.isGood ? "bg-green-50/50" : "bg-red-50/50"}`}>
                  <td className="px-4 py-3 font-medium">{b.metrik}</td>
                  <td className="px-4 py-3 text-center text-muted">{b.sellerBiasa}</td>
                  <td className="px-4 py-3 text-center font-semibold text-primary">{b.sellerTop}</td>
                  <td className={`px-4 py-3 text-center font-bold ${b.isGood ? "text-green-700" : "text-red-700"}`}>{b.dataKamu}</td>
                  <td className="px-4 py-3 text-center">
                    {b.isGood ? (
                      <span className="inline-flex items-center gap-1 text-green-700"><CheckCircle size={16} /> Baik</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-red-700"><XCircle size={16} /> Perlu Perbaikan</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 7 Secrets */}
      <div>
        <h2 className="text-lg font-bold mb-4">🔑 7 Rahasia Seller Top TikTok</h2>
        <div className="space-y-2">
          {secrets.map((s, i) => (
            <div key={i} className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
              <button
                onClick={() => setOpenSecret(openSecret === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
              >
                <span className="font-semibold text-sm">{s.title}</span>
                {openSecret === i ? <ChevronUp size={18} className="text-muted" /> : <ChevronDown size={18} className="text-muted" />}
              </button>
              {openSecret === i && (
                <div className="px-5 pb-4 pt-0">
                  <p className="text-sm text-muted leading-relaxed">{s.content}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
