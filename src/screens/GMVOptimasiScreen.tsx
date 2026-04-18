"use client";
import { useState } from "react";
import { Wrench } from "lucide-react";

interface DiagnosisRow {
  gejala: string;
  metrikBermasalah: string;
  nilaiBuruk: string;
  penyebab: string;
  solusi1: string;
  solusi2: string;
  timeline: string;
}

const diagnosisData: DiagnosisRow[] = [
  { gejala: "CTR rendah (< 2%)", metrikBermasalah: "CTR", nilaiBuruk: "< 2%", penyebab: "Hook video lemah, thumbnail tidak menarik", solusi1: "Buat hook 3 detik yang provokatif / mengejutkan", solusi2: "Test 3-5 variasi thumbnail/opening", timeline: "1-3 hari" },
  { gejala: "2-sec view rate rendah", metrikBermasalah: "2s VR", nilaiBuruk: "< 20%", penyebab: "Opening video tidak eye-catching", solusi1: "Gunakan pattern interrupt (suara/visual unik)", solusi2: "Mulai dengan pertanyaan atau fakta mengejutkan", timeline: "1-2 hari" },
  { gejala: "CVR rendah (< 5%)", metrikBermasalah: "CVR", nilaiBuruk: "< 5%", penyebab: "Product page kurang meyakinkan, CTA lemah", solusi1: "Optimasi product page (review, foto, deskripsi)", solusi2: "Tambah urgency/scarcity di CTA", timeline: "3-5 hari" },
  { gejala: "CPA terlalu tinggi", metrikBermasalah: "CPA", nilaiBuruk: "> Rp 50.000", penyebab: "Targeting terlalu luas, bid terlalu tinggi", solusi1: "Narrowkan audience, gunakan lookalike buyer", solusi2: "Turunkan bid 10-20%, monitor 3 hari", timeline: "3-7 hari" },
  { gejala: "ROI di bawah 3x", metrikBermasalah: "ROI", nilaiBuruk: "< 3x", penyebab: "Cost terlalu tinggi vs revenue", solusi1: "Pause SKU dengan ROI < 2x", solusi2: "Scale hanya SKU dengan ROI > 5x", timeline: "1-3 hari" },
  { gejala: "Drop di 6-sec view rate", metrikBermasalah: "6s VR", nilaiBuruk: "< 15%", penyebab: "Value proposition tidak jelas di 3-6 detik", solusi1: "Sampaikan benefit utama di detik 3-6", solusi2: "Gunakan text overlay untuk poin penting", timeline: "1-2 hari" },
  { gejala: "Impressi tinggi tapi klik rendah", metrikBermasalah: "CTR", nilaiBuruk: "< 1%", penyebab: "Creative tidak relevan dengan audience", solusi1: "Review audience targeting vs content", solusi2: "A/B test creative dengan angle berbeda", timeline: "3-5 hari" },
  { gejala: "Banyak klik tapi sedikit order", metrikBermasalah: "CVR", nilaiBuruk: "< 3%", penyebab: "Mismatch antara ads promise vs product", solusi1: "Selaraskan messaging ads dengan product page", solusi2: "Tambah social proof (review, rating, testimoni)", timeline: "3-5 hari" },
  { gejala: "Cost naik tanpa kenaikan order", metrikBermasalah: "CPO", nilaiBuruk: "Naik >30%", penyebab: "Ad fatigue, audience jenuh", solusi1: "Rotasi creative baru (minimal 3 variasi)", solusi2: "Refresh audience, expand ke interest baru", timeline: "2-4 hari" },
  { gejala: "Revenue stagnan/turun", metrikBermasalah: "Revenue", nilaiBuruk: "Flat/turun", penyebab: "Pasar jenuh, kompetitor agresif", solusi1: "Buat offer baru (bundle, diskon, gift)", solusi2: "Ekspansi ke channel/platform baru", timeline: "1-2 minggu" },
];

interface ScoreComponent {
  id: string;
  label: string;
  maxScore: number;
  score: number;
}

const defaultScoring: ScoreComponent[] = [
  { id: "hook", label: "Hook / Opening (0-3 detik)", maxScore: 20, score: 0 },
  { id: "value", label: "Value Proposition (3-6 detik)", maxScore: 15, score: 0 },
  { id: "demo", label: "Product Demo / Showcase", maxScore: 15, score: 0 },
  { id: "proof", label: "Social Proof (review/testimoni)", maxScore: 15, score: 0 },
  { id: "cta", label: "Call-to-Action", maxScore: 10, score: 0 },
  { id: "audio", label: "Audio / Sound (musik, voiceover)", maxScore: 10, score: 0 },
  { id: "visual", label: "Visual Quality (lighting, editing)", maxScore: 10, score: 0 },
  { id: "relevance", label: "Relevansi dengan Target Audience", maxScore: 5, score: 0 },
];

function getInterpretation(score: number): { label: string; color: string; emoji: string } {
  if (score >= 80) return { label: "WINNER", color: "text-green-700", emoji: "🏆" };
  if (score >= 60) return { label: "SEHAT", color: "text-blue-700", emoji: "✅" };
  if (score >= 40) return { label: "PERLU OPTIMASI", color: "text-orange-700", emoji: "🔧" };
  return { label: "STOP / REMAKE", color: "text-red-700", emoji: "⛔" };
}

export default function GMVOptimasiScreen() {
  const [scoring, setScoring] = useState<ScoreComponent[]>(defaultScoring);

  const totalScore = scoring.reduce((s, c) => s + c.score, 0);
  const maxTotal = scoring.reduce((s, c) => s + c.maxScore, 0);
  const interp = getInterpretation(totalScore);

  function updateScore(id: string, val: number) {
    setScoring(prev => prev.map(c => c.id === id ? { ...c, score: Math.min(Math.max(0, val), c.maxScore) } : c));
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary"><Wrench size={20} /></div>
        <div>
          <h1 className="text-xl font-bold">Optimasi Kreatif</h1>
          <p className="text-sm text-muted">Diagnosis masalah creative & rubrik penilaian manual</p>
        </div>
      </div>

      {/* Diagnosis Table */}
      <h2 className="text-lg font-bold mb-3">🔍 Tabel Diagnosis Creative</h2>
      <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden mb-8">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b border-border">
              <th className="text-left px-3 py-3 font-semibold text-muted">Gejala</th>
              <th className="text-left px-3 py-3 font-semibold text-muted">Metrik</th>
              <th className="text-left px-3 py-3 font-semibold text-muted">Nilai Buruk</th>
              <th className="text-left px-3 py-3 font-semibold text-muted">Penyebab</th>
              <th className="text-left px-3 py-3 font-semibold text-muted">Solusi 1</th>
              <th className="text-left px-3 py-3 font-semibold text-muted">Solusi 2</th>
              <th className="text-left px-3 py-3 font-semibold text-muted">Timeline</th>
            </tr></thead>
            <tbody>
              {diagnosisData.map((row, i) => (
                <tr key={i} className="border-b border-border hover:bg-gray-50">
                  <td className="px-3 py-2.5 font-medium">{row.gejala}</td>
                  <td className="px-3 py-2.5"><span className="px-2 py-0.5 bg-primary-50 text-primary text-xs font-semibold rounded">{row.metrikBermasalah}</span></td>
                  <td className="px-3 py-2.5 text-red-600 font-medium">{row.nilaiBuruk}</td>
                  <td className="px-3 py-2.5 text-muted text-xs">{row.penyebab}</td>
                  <td className="px-3 py-2.5 text-xs">{row.solusi1}</td>
                  <td className="px-3 py-2.5 text-xs">{row.solusi2}</td>
                  <td className="px-3 py-2.5 text-xs text-muted">{row.timeline}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rubrik Penilaian */}
      <h2 className="text-lg font-bold mb-3">📝 Rubrik Penilaian Creative</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b border-border">
              <th className="text-left px-4 py-3 font-semibold text-muted">Komponen</th>
              <th className="text-center px-4 py-3 font-semibold text-muted w-24">Max</th>
              <th className="text-center px-4 py-3 font-semibold text-muted w-32">Score</th>
              <th className="text-center px-4 py-3 font-semibold text-muted w-24">%</th>
            </tr></thead>
            <tbody>
              {scoring.map(comp => {
                const pct = comp.maxScore > 0 ? (comp.score / comp.maxScore) * 100 : 0;
                const color = pct >= 70 ? "text-green-600" : pct >= 40 ? "text-orange-600" : "text-red-600";
                return (
                  <tr key={comp.id} className="border-b border-border">
                    <td className="px-4 py-3 font-medium">{comp.label}</td>
                    <td className="px-4 py-3 text-center text-muted">{comp.maxScore}</td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="number"
                        min={0}
                        max={comp.maxScore}
                        value={comp.score}
                        onChange={e => updateScore(comp.id, Number(e.target.value))}
                        className="w-16 px-2 py-1 border border-border rounded text-center text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </td>
                    <td className={`px-4 py-3 text-center font-semibold ${color}`}>{Math.round(pct)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Score Summary */}
        <div className="bg-white rounded-xl shadow-sm border border-border p-5">
          <h3 className="font-semibold mb-4">Total Score</h3>
          <div className="text-center mb-4">
            <div className="w-24 h-24 rounded-full border-4 border-primary flex items-center justify-center mx-auto mb-3">
              <span className="text-3xl font-bold">{totalScore}</span>
            </div>
            <p className="text-sm text-muted">dari {maxTotal} poin</p>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-4">
            <div className={`h-full rounded-full transition-all ${totalScore >= 80 ? "bg-green-500" : totalScore >= 60 ? "bg-blue-500" : totalScore >= 40 ? "bg-orange-500" : "bg-red-500"}`} style={{ width: `${(totalScore / maxTotal) * 100}%` }} />
          </div>
          <div className={`text-center p-3 rounded-lg ${totalScore >= 80 ? "bg-green-50" : totalScore >= 60 ? "bg-blue-50" : totalScore >= 40 ? "bg-orange-50" : "bg-red-50"}`}>
            <span className="text-2xl">{interp.emoji}</span>
            <p className={`text-lg font-bold mt-1 ${interp.color}`}>{interp.label}</p>
          </div>

          <div className="mt-4 pt-4 border-t border-border space-y-2 text-xs">
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-green-500" /> <span>80-100: 🏆 WINNER — Scale!</span></div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-500" /> <span>60-79: ✅ SEHAT — Pertahankan</span></div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-orange-500" /> <span>40-59: 🔧 OPTIMASI — Perbaiki</span></div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500" /> <span>0-39: ⛔ STOP — Remake</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
