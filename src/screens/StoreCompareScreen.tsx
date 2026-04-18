"use client";
import { useState, useMemo } from "react";
import { useStoreManager } from "@/store/useStoreManager";
import { GitCompareArrows, Trophy } from "lucide-react";
import { formatRupiah, formatNum, fmtDec } from "@/utils/gmvAnalyzer";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

function norm(val: number, max: number) {
  return max > 0 ? Math.min((val / max) * 100, 100) : 0;
}

export default function StoreCompareScreen() {
  const { stores } = useStoreManager();
  const [storeAId, setStoreAId] = useState(stores[0]?.id || "");
  const [storeBId, setStoreBId] = useState(stores[1]?.id || "");

  const storeA = stores.find((s) => s.id === storeAId) || null;
  const storeB = stores.find((s) => s.id === storeBId) || null;

  const metricsA = useMemo(() => {
    if (!storeA) return null;
    const ov = storeA.overviewData;
    const vid = storeA.videoData;
    const gmv = ov.reduce((a, d) => a + d.summary.gmv, 0);
    const orders = ov.reduce((a, d) => a + d.summary.orders, 0);
    const conversion = ov.length ? ov.reduce((a, d) => a + d.summary.conversionRate, 0) / ov.length : 0;
    const pageViews = ov.reduce((a, d) => a + d.summary.pageViews, 0);
    const videoGMV = vid.reduce((a, d) => a + d.summary.totalGMV, 0);
    const videoVV = vid.reduce((a, d) => a + d.summary.totalVV, 0);
    const avgGPM = vid.length ? vid.reduce((a, d) => a + d.summary.avgGPM, 0) / vid.length : 0;
    const avgCTR = vid.length ? vid.reduce((a, d) => a + d.summary.avgCTR, 0) / vid.length : 0;
    const avgWatchRate = vid.length ? vid.reduce((a, d) => a + d.summary.avgWatchRate, 0) / vid.length : 0;
    const totalVideos = vid.reduce((a, d) => a + d.summary.totalVideos, 0);
    return { gmv, orders, conversion, pageViews, videoGMV, videoVV, avgGPM, avgCTR, avgWatchRate, totalVideos };
  }, [storeA]);

  const metricsB = useMemo(() => {
    if (!storeB) return null;
    const ov = storeB.overviewData;
    const vid = storeB.videoData;
    const gmv = ov.reduce((a, d) => a + d.summary.gmv, 0);
    const orders = ov.reduce((a, d) => a + d.summary.orders, 0);
    const conversion = ov.length ? ov.reduce((a, d) => a + d.summary.conversionRate, 0) / ov.length : 0;
    const pageViews = ov.reduce((a, d) => a + d.summary.pageViews, 0);
    const videoGMV = vid.reduce((a, d) => a + d.summary.totalGMV, 0);
    const videoVV = vid.reduce((a, d) => a + d.summary.totalVV, 0);
    const avgGPM = vid.length ? vid.reduce((a, d) => a + d.summary.avgGPM, 0) / vid.length : 0;
    const avgCTR = vid.length ? vid.reduce((a, d) => a + d.summary.avgCTR, 0) / vid.length : 0;
    const avgWatchRate = vid.length ? vid.reduce((a, d) => a + d.summary.avgWatchRate, 0) / vid.length : 0;
    const totalVideos = vid.reduce((a, d) => a + d.summary.totalVideos, 0);
    return { gmv, orders, conversion, pageViews, videoGMV, videoVV, avgGPM, avgCTR, avgWatchRate, totalVideos };
  }, [storeB]);

  const ready = storeA && storeB && metricsA && metricsB && storeAId !== storeBId;

  const radarData = useMemo(() => {
    if (!ready || !metricsA || !metricsB) return [];
    const maxGMV = Math.max(metricsA.gmv, metricsB.gmv, 1);
    const maxOrders = Math.max(metricsA.orders, metricsB.orders, 1);
    const maxGPM = Math.max(metricsA.avgGPM, metricsB.avgGPM, 1);
    const maxCTR = Math.max(metricsA.avgCTR, metricsB.avgCTR, 1);
    const maxWatch = Math.max(metricsA.avgWatchRate, metricsB.avgWatchRate, 1);
    const maxConv = Math.max(metricsA.conversion, metricsB.conversion, 1);
    return [
      { metric: "GMV", A: norm(metricsA.gmv, maxGMV), B: norm(metricsB.gmv, maxGMV) },
      { metric: "Pesanan", A: norm(metricsA.orders, maxOrders), B: norm(metricsB.orders, maxOrders) },
      { metric: "Konversi", A: norm(metricsA.conversion, maxConv), B: norm(metricsB.conversion, maxConv) },
      { metric: "GPM", A: norm(metricsA.avgGPM, maxGPM), B: norm(metricsB.avgGPM, maxGPM) },
      { metric: "CTR", A: norm(metricsA.avgCTR, maxCTR), B: norm(metricsB.avgCTR, maxCTR) },
      { metric: "Watch Rate", A: norm(metricsA.avgWatchRate, maxWatch), B: norm(metricsB.avgWatchRate, maxWatch) },
    ];
  }, [ready, metricsA, metricsB]);

  const comparisonRows = useMemo(() => {
    if (!metricsA || !metricsB) return [];
    const rows: { metrik: string; a: string; b: string; diff: string; winner: "A" | "B" | "tie" }[] = [];
    const add = (m: string, va: number, vb: number, fmt: (v: number) => string, higherWins = true) => {
      const diff = vb !== 0 ? ((va - vb) / Math.abs(vb)) * 100 : va > 0 ? 100 : 0;
      const winner = va === vb ? "tie" as const : higherWins ? (va > vb ? "A" as const : "B" as const) : (va < vb ? "A" as const : "B" as const);
      rows.push({ metrik: m, a: fmt(va), b: fmt(vb), diff: `${diff >= 0 ? "+" : ""}${fmtDec(diff, 1)}%`, winner });
    };
    add("Total GMV (Overview)", metricsA.gmv, metricsB.gmv, (v) => formatRupiah(v));
    add("Total Pesanan", metricsA.orders, metricsB.orders, (v) => formatNum(v));
    add("Avg Konversi %", metricsA.conversion, metricsB.conversion, (v) => fmtDec(v, 2) + "%");
    add("Total Tayangan", metricsA.pageViews, metricsB.pageViews, (v) => formatNum(v));
    add("Total GMV Video", metricsA.videoGMV, metricsB.videoGMV, (v) => formatRupiah(v));
    add("Total Video Views", metricsA.videoVV, metricsB.videoVV, (v) => formatNum(v));
    add("Avg GPM", metricsA.avgGPM, metricsB.avgGPM, (v) => formatRupiah(Math.round(v)));
    add("Avg CTR Video", metricsA.avgCTR, metricsB.avgCTR, (v) => fmtDec(v, 2) + "%");
    add("Avg Watch Rate", metricsA.avgWatchRate, metricsB.avgWatchRate, (v) => fmtDec(v, 2) + "%");
    add("Total Video", metricsA.totalVideos, metricsB.totalVideos, (v) => formatNum(v));
    return rows;
  }, [metricsA, metricsB]);

  const barData = useMemo(() => {
    if (!metricsA || !metricsB) return [];
    return [
      { name: "GMV (Jt)", A: metricsA.gmv / 1e6, B: metricsB.gmv / 1e6 },
      { name: "Pesanan", A: metricsA.orders, B: metricsB.orders },
      { name: "Video GMV (Jt)", A: metricsA.videoGMV / 1e6, B: metricsB.videoGMV / 1e6 },
      { name: "GPM (Rb)", A: metricsA.avgGPM / 1000, B: metricsB.avgGPM / 1000 },
    ];
  }, [metricsA, metricsB]);

  if (stores.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <GitCompareArrows size={48} className="text-gray-300 mb-4" />
        <h2 className="text-xl font-bold mb-2">Perlu Minimal 2 Toko</h2>
        <p className="text-gray-500 text-sm max-w-md">
          Tambahkan minimal 2 toko di menu &quot;Kelola Toko&quot; untuk bisa membandingkan performa antar toko.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <GitCompareArrows size={24} className="text-purple-600" /> Perbandingan 2 Toko
      </h1>

      {/* Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <label className="text-xs font-semibold text-gray-500 uppercase block mb-2">Toko A</label>
          <select value={storeAId} onChange={(e) => setStoreAId(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
            <option value="">Pilih Toko A</option>
            {stores.map((s) => <option key={s.id} value={s.id}>{s.avatar} {s.name}</option>)}
          </select>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <label className="text-xs font-semibold text-gray-500 uppercase block mb-2">Toko B</label>
          <select value={storeBId} onChange={(e) => setStoreBId(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
            <option value="">Pilih Toko B</option>
            {stores.map((s) => <option key={s.id} value={s.id}>{s.avatar} {s.name}</option>)}
          </select>
        </div>
      </div>

      {storeAId === storeBId && storeAId && (
        <p className="text-sm text-red-500 bg-red-50 rounded-lg p-3">⚠️ Pilih 2 toko yang berbeda untuk membandingkan.</p>
      )}

      {ready && (
        <>
          {/* KPI Comparison */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {comparisonRows.slice(0, 5).map((r) => (
              <div key={r.metrik} className="bg-white rounded-xl border p-4">
                <p className="text-[10px] font-semibold text-gray-400 uppercase mb-2">{r.metrik}</p>
                <div className="flex items-center justify-between gap-2">
                  <div className={`text-sm font-bold ${r.winner === "A" ? "text-green-600" : "text-gray-600"}`}>
                    {r.a}
                    {r.winner === "A" && <Trophy size={10} className="inline ml-1 text-green-500" />}
                  </div>
                  <span className="text-gray-300 text-xs">vs</span>
                  <div className={`text-sm font-bold ${r.winner === "B" ? "text-green-600" : "text-gray-600"}`}>
                    {r.b}
                    {r.winner === "B" && <Trophy size={10} className="inline ml-1 text-green-500" />}
                  </div>
                </div>
                <div className="flex justify-between text-[10px] mt-1">
                  <span style={{ color: storeA!.color }}>{storeA!.avatar} {storeA!.name.substring(0, 10)}</span>
                  <span style={{ color: storeB!.color }}>{storeB!.avatar} {storeB!.name.substring(0, 10)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Radar + Bar */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border p-6">
              <h3 className="font-semibold mb-4 text-sm">Radar Perbandingan</h3>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
                  <Radar name={storeA!.name} dataKey="A" stroke={storeA!.color} fill={storeA!.color} fillOpacity={0.2} strokeWidth={2} />
                  <Radar name={storeB!.name} dataKey="B" stroke={storeB!.color} fill={storeB!.color} fillOpacity={0.2} strokeWidth={2} />
                  <Legend />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl border p-6">
              <h3 className="font-semibold mb-4 text-sm">Metrik Utama</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="A" name={storeA!.name} fill={storeA!.color} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="B" name={storeB!.name} fill={storeB!.color} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Full Table */}
          <div className="bg-white rounded-xl border p-6">
            <h3 className="font-semibold mb-4 text-sm">Tabel Perbandingan Lengkap</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-3">Metrik</th>
                    <th className="text-right p-3" style={{ color: storeA!.color }}>{storeA!.avatar} {storeA!.name}</th>
                    <th className="text-right p-3" style={{ color: storeB!.color }}>{storeB!.avatar} {storeB!.name}</th>
                    <th className="text-right p-3">Selisih</th>
                    <th className="text-center p-3">Menang</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((r) => (
                    <tr key={r.metrik} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium">{r.metrik}</td>
                      <td className={`p-3 text-right ${r.winner === "A" ? "font-bold text-green-600" : ""}`}>{r.a}</td>
                      <td className={`p-3 text-right ${r.winner === "B" ? "font-bold text-green-600" : ""}`}>{r.b}</td>
                      <td className="p-3 text-right text-gray-500">{r.diff}</td>
                      <td className="p-3 text-center">
                        {r.winner === "tie" ? "🤝" : r.winner === "A" ? (
                          <span style={{ color: storeA!.color }}>{storeA!.avatar}</span>
                        ) : (
                          <span style={{ color: storeB!.color }}>{storeB!.avatar}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
