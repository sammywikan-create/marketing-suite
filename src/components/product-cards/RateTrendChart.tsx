"use client";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ReferenceLine,
} from "recharts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function RateTrendChart({ data }: { data: any[] }) {
  const chartData = data.map((d) => ({
    date: (d.date || "").slice(5),
    ctr: +(d.rate_tayangan_to_klik * 100).toFixed(2),
    klikToCart: +(d.rate_klik_to_cart * 100).toFixed(2),
    cvr: +(d.rate_klik_to_pembayaran * 100).toFixed(2),
    cartToPay: +(d.rate_cart_to_pembayaran * 100).toFixed(2),
  }));

  const n = chartData.length || 1;
  const avgCTR = chartData.reduce((a, d) => a + d.ctr, 0) / n;
  const avgCVR = chartData.reduce((a, d) => a + d.cvr, 0) / n;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <h3 className="text-sm font-semibold mb-4">📊 Tren Rate Konversi</h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
          <YAxis unit="%" tick={{ fontSize: 10 }} />
          <Tooltip formatter={(v: unknown) => Number(v).toFixed(2) + "%"} />
          <Legend />
          <ReferenceLine y={avgCTR} stroke="#3b82f6" strokeDasharray="5 5" label={{ value: `Avg CTR ${avgCTR.toFixed(1)}%`, fontSize: 9, fill: "#3b82f6" }} />
          <ReferenceLine y={avgCVR} stroke="#10b981" strokeDasharray="5 5" label={{ value: `Avg CVR ${avgCVR.toFixed(1)}%`, fontSize: 9, fill: "#10b981" }} />
          <Line type="monotone" dataKey="ctr" name="CTR" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2 }} />
          <Line type="monotone" dataKey="klikToCart" name="Klik→Krj" stroke="#f97316" strokeWidth={2} dot={{ r: 2 }} />
          <Line type="monotone" dataKey="cvr" name="CVR" stroke="#10b981" strokeWidth={2} dot={{ r: 2 }} />
          <Line type="monotone" dataKey="cartToPay" name="Krj→Bayar" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 2 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
