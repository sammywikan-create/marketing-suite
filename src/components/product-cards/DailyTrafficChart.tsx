"use client";
import { useState } from "react";
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from "recharts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function DailyTrafficChart({ data }: { data: any[] }) {
  const [showTayangan, setShowTayangan] = useState(true);
  const [showKlik, setShowKlik] = useState(true);
  const [showGMV, setShowGMV] = useState(true);

  const chartData = data.map((d) => ({
    date: (d.date || "").slice(5),
    tayangan: d.tayangan || 0,
    klik: d.klik || 0,
    gmvJt: ((d.gmv || 0) / 1_000_000),
  }));

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">📈 Tren Harian</h3>
        <div className="flex gap-3 text-xs">
          <label className="flex items-center gap-1 cursor-pointer">
            <input type="checkbox" checked={showTayangan} onChange={() => setShowTayangan(!showTayangan)} className="rounded" />
            <span className="text-blue-600">Tayangan</span>
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <input type="checkbox" checked={showKlik} onChange={() => setShowKlik(!showKlik)} className="rounded" />
            <span className="text-orange-500">Klik</span>
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <input type="checkbox" checked={showGMV} onChange={() => setShowGMV(!showGMV)} className="rounded" />
            <span className="text-green-600">GMV</span>
          </label>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
          <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} unit=" Jt" />
          <Tooltip />
          <Legend />
          {showTayangan && <Bar yAxisId="left" dataKey="tayangan" name="Tayangan" fill="#3b82f6" radius={[4, 4, 0, 0]} opacity={0.7} />}
          {showKlik && <Line yAxisId="left" type="monotone" dataKey="klik" name="Klik" stroke="#f97316" strokeWidth={2} dot={{ r: 2 }} />}
          {showGMV && <Line yAxisId="right" type="monotone" dataKey="gmvJt" name="GMV (Jt)" stroke="#10b981" strokeWidth={2} dot={{ r: 2 }} />}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
