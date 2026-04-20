"use client";
import { useState, useMemo } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

function fR(v: number) {
  if (v >= 1_000_000_000) return `Rp ${(v / 1_000_000_000).toFixed(1)}M`;
  if (v >= 1_000_000) return `Rp ${(v / 1_000_000).toFixed(1)}Jt`;
  if (v >= 1_000) return `Rp ${(v / 1_000).toFixed(1)}Rb`;
  return `Rp ${v.toLocaleString("id-ID")}`;
}
function fN(v: number) { return v.toLocaleString("id-ID"); }
function fP(v: number) { return (v * 100).toFixed(2) + "%"; }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function ChannelComparisonSection({ kpData, stData }: { kpData: any[]; stData: any[] }) {
  const [metric, setMetric] = useState<"gmv" | "rate_tayangan_to_klik" | "rate_klik_to_pembayaran" | "pembeli">("gmv");

  // Build product map
  const comparison = useMemo(() => {
    const map = new Map<string, { id: string; name: string; kp: Record<string, number>; st: Record<string, number> }>();

    kpData.forEach((d) => {
      if (!map.has(d.product_id)) map.set(d.product_id, { id: d.product_id, name: d.product_name, kp: {}, st: {} });
      const entry = map.get(d.product_id)!;
      entry.kp = { tayangan: d.tayangan || 0, klik: d.klik || 0, pembeli: d.pembeli || 0, gmv: d.gmv || 0, ctr: d.rate_tayangan_to_klik || 0, cvr: d.rate_klik_to_pembayaran || 0 };
    });

    stData.forEach((d) => {
      if (!map.has(d.product_id)) map.set(d.product_id, { id: d.product_id, name: d.product_name, kp: {}, st: {} });
      const entry = map.get(d.product_id)!;
      entry.st = { tayangan: d.tayangan || 0, klik: d.klik_unik || 0, pembeli: d.pembeli || 0, gmv: d.gmv || 0, ctr: d.rate_tayangan_to_klik || 0, cvr: d.rate_klik_to_pembayaran || 0 };
    });

    return Array.from(map.values()).sort((a, b) => ((b.kp.gmv || 0) + (b.st.gmv || 0)) - ((a.kp.gmv || 0) + (a.st.gmv || 0)));
  }, [kpData, stData]);

  const chartData = useMemo(() => {
    return comparison.slice(0, 10).map((c) => {
      const shortName = c.name.length > 20 ? c.name.slice(0, 20) + "…" : c.name;
      const kpVal = metric === "gmv" ? (c.kp.gmv || 0) : metric === "pembeli" ? (c.kp.pembeli || 0) : (c.kp[metric === "rate_tayangan_to_klik" ? "ctr" : "cvr"] || 0) * 100;
      const stVal = metric === "gmv" ? (c.st.gmv || 0) : metric === "pembeli" ? (c.st.pembeli || 0) : (c.st[metric === "rate_tayangan_to_klik" ? "ctr" : "cvr"] || 0) * 100;
      return { name: shortName, "Kartu Produk": kpVal, "Shop Tab": stVal };
    });
  }, [comparison, metric]);

  // Insights
  const insights = useMemo(() => {
    const tips: string[] = [];
    comparison.forEach((c) => {
      const kpCtr = c.kp.ctr || 0;
      const stCtr = c.st.ctr || 0;
      const kpCvr = c.kp.cvr || 0;
      const stCvr = c.st.cvr || 0;
      const kpGmv = c.kp.gmv || 0;
      const stGmv = c.st.gmv || 0;
      const shortName = c.name.length > 40 ? c.name.slice(0, 40) + "…" : c.name;

      if (kpCtr > 0 && stCtr > 0 && kpCtr > stCtr * 1.3) {
        tips.push(`📈 ${shortName} CTR lebih tinggi di Kartu Produk (${fP(kpCtr)} vs ${fP(stCtr)})`);
      }
      if (stCvr > 0 && kpCvr > 0 && stCvr > kpCvr * 1.3) {
        tips.push(`🏪 ${shortName} konversi lebih baik di Shop Tab (${fP(stCvr)} vs ${fP(kpCvr)})`);
      }
      if (kpGmv > 0 && stGmv === 0) {
        tips.push(`📭 ${shortName} belum ada data Shop Tab`);
      }
      if (stGmv > 0 && kpGmv === 0) {
        tips.push(`📭 ${shortName} belum ada data Kartu Produk`);
      }
    });
    return tips.slice(0, 8);
  }, [comparison]);

  const metricLabel = { gmv: "GMV", rate_tayangan_to_klik: "CTR", rate_klik_to_pembayaran: "CVR", pembeli: "Pembeli" };

  return (
    <div className="space-y-6">
      {/* Chart */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">📊 Perbandingan Kartu Produk vs Shop Tab</h3>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
            {(["gmv", "rate_tayangan_to_klik", "rate_klik_to_pembayaran", "pembeli"] as const).map((m) => (
              <button key={m} onClick={() => setMetric(m)}
                className={`px-3 py-1 text-xs rounded-md ${metric === m ? "bg-white shadow-sm font-medium" : "text-gray-500"}`}>
                {metricLabel[m]}
              </button>
            ))}
          </div>
        </div>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => metric === "gmv" ? fR(v) : metric === "pembeli" ? fN(v) : v.toFixed(1) + "%"} />
              <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: unknown) => metric === "gmv" ? fR(Number(v)) : metric === "pembeli" ? fN(Number(v)) : Number(v).toFixed(2) + "%"} />
              <Legend />
              <Bar dataKey="Kartu Produk" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              <Bar dataKey="Shop Tab" fill="#f97316" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-center text-gray-400 py-12 text-sm">Upload data kedua channel untuk melihat perbandingan</p>
        )}
      </div>

      {/* Table */}
      {comparison.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-sm font-semibold mb-4">📋 Tabel Komparasi</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="p-2 text-left">Produk</th>
                  <th className="p-2 text-right">KP: Tayangan</th>
                  <th className="p-2 text-right">KP: CTR</th>
                  <th className="p-2 text-right">KP: GMV</th>
                  <th className="p-2 text-right">ST: Tayangan</th>
                  <th className="p-2 text-right">ST: CTR</th>
                  <th className="p-2 text-right">ST: GMV</th>
                  <th className="p-2 text-center">🏆 Terbaik</th>
                </tr>
              </thead>
              <tbody>
                {comparison.map((c) => {
                  const best = (c.kp.gmv || 0) >= (c.st.gmv || 0) ? "KP" : "ST";
                  return (
                    <tr key={c.id} className="border-b hover:bg-gray-50">
                      <td className="p-2 max-w-[200px] truncate font-medium">{c.name}</td>
                      <td className="p-2 text-right">{fN(c.kp.tayangan || 0)}</td>
                      <td className="p-2 text-right">{fP(c.kp.ctr || 0)}</td>
                      <td className="p-2 text-right font-bold text-green-700">{fR(c.kp.gmv || 0)}</td>
                      <td className="p-2 text-right">{fN(c.st.tayangan || 0)}</td>
                      <td className="p-2 text-right">{fP(c.st.ctr || 0)}</td>
                      <td className="p-2 text-right font-bold text-orange-600">{fR(c.st.gmv || 0)}</td>
                      <td className="p-2 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${best === "KP" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"}`}>
                          {best === "KP" ? "🃏 Kartu Produk" : "🏪 Shop Tab"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Insights */}
      {insights.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
          <h3 className="text-sm font-semibold mb-3">💡 Insight Komparasi</h3>
          <ul className="space-y-1.5">
            {insights.map((t, i) => (
              <li key={i} className="text-sm text-gray-700">{t}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
