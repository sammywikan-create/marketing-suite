"use client";

import { useState, useEffect, useMemo } from "react";
import useSWR from "swr";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { RefreshCw, Loader2, ArrowUp, ArrowDown } from "lucide-react";

// ─── Types ──────────────────────────────────────────────
interface HarianRow {
  tanggal: string;
  closing: number;
  botol: number;
  nilai_per_txn: number;
  omzet: number;
  cac_ads: number;
  cac_total: number;
  upsell: number;
  omzet_total_brand: number;
  pct_kontribusi_fv: number;
}

interface Summary {
  bulan: string;
  total_omzet: number;
  total_botol: number;
  total_closing: number;
  rata_upsell: number;
  rata_cac: number;
  total_omzet_all: number;
  total_omzet_fv: number;
  pct_kontribusi_fv: number;
}

interface EvaluasiPerBrand {
  freshvision: number;
  nutriflakes: number;
  freshmag: number;
  etawaku: number;
  total: number;
}

interface ApiResponse {
  summary: Summary;
  harian: HarianRow[];
  evaluasi_per_brand: EvaluasiPerBrand;
}

// ─── Helpers ────────────────────────────────────────────
const fetcher = (url: string) => fetch(url).then((r) => r.json());

function fR(v: number) {
  if (v >= 1_000_000_000) return `Rp ${(v / 1_000_000_000).toFixed(1)} M`;
  if (v >= 1_000_000) return `Rp ${(v / 1_000_000).toFixed(1)} Jt`;
  if (v >= 1_000) return `Rp ${(v / 1_000).toFixed(1)} Rb`;
  return `Rp ${v.toLocaleString("id-ID")}`;
}
function fN(v: number) {
  return v.toLocaleString("id-ID");
}

// ══════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════
export default function LaporanHarianPage() {
  const { data, isLoading, mutate } = useSWR<ApiResponse>(
    "/api/laporan-harian",
    fetcher,
    { refreshInterval: 5 * 60 * 1000 }
  );

  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  useEffect(() => {
    if (data) setLastUpdate(new Date());
  }, [data]);

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-500">Memuat data dari Google Sheets...</p>
        </div>
      </div>
    );
  }

  const { summary, harian, evaluasi_per_brand } = data;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* ═══ HEADER ═══ */}
        <Header lastUpdate={lastUpdate} onRefresh={() => mutate()} />

        {/* ═══ KPI CARDS ═══ */}
        <KpiCards summary={summary} />

        {/* ═══ CHART 1: Omzet & Botol Harian ═══ */}
        <OmzetBotolChart harian={harian} />

        {/* ═══ CHART 2: Donut Brand ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BrandDonutChart evaluasi={evaluasi_per_brand} />
          {/* ═══ CHART 3: Upsell & CAC Trend ═══ */}
          <UpsellCacChart harian={harian} />
        </div>

        {/* ═══ TABEL HARIAN ═══ */}
        <HarianTable harian={harian} summary={summary} />
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// HEADER
// ══════════════════════════════════════════════════════════
function Header({ lastUpdate, onRefresh }: { lastUpdate: Date | null; onRefresh: () => void }) {
  return (
    <div className="bg-white rounded-2xl border p-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            📊 Laporan Harian FreshVision — April 2026
          </h1>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <p className="text-sm text-gray-400">
              Fresh Vision Official | Terakhir update:{" "}
              {lastUpdate ? lastUpdate.toLocaleString("id-ID") : "—"}
            </p>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 animate-pulse">
              🔴 Live dari Google Sheets
            </span>
          </div>
        </div>
        <button
          onClick={onRefresh}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition"
        >
          <RefreshCw size={16} /> Refresh Data
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// KPI CARDS (6 cards, 3x2 grid)
// ══════════════════════════════════════════════════════════
function KpiCards({ summary }: { summary: Summary }) {
  const TARGET_OMZET = 350_000_000;
  const pctTarget = Math.min((summary.total_omzet / TARGET_OMZET) * 100, 100);
  const harianCount = summary.total_closing > 0 ? Math.round(summary.total_botol / (summary.total_botol / summary.rata_upsell > 0 ? summary.total_closing : 1)) : 0;
  const avgBotolPerDay = summary.total_botol > 0 ? Math.round(summary.total_botol / 20) : 0; // ~20 hari kerja
  const nilaiPerTxn = summary.total_closing > 0 ? summary.total_omzet / summary.total_closing : 0;
  const avgClosingPerDay = summary.total_closing > 0 ? Math.round(summary.total_closing / 20) : 0;

  const upsellBadge =
    summary.rata_upsell >= 1.3
      ? { text: "🟢 Baik", color: "bg-green-100 text-green-700" }
      : summary.rata_upsell >= 1.1
      ? { text: "🟡 Cukup", color: "bg-yellow-100 text-yellow-700" }
      : { text: "🔴 Rendah", color: "bg-red-100 text-red-700" };

  const cacBadge =
    summary.rata_cac < 50
      ? { text: "🟢 Efisien", color: "bg-green-100 text-green-700" }
      : summary.rata_cac < 60
      ? { text: "🟢 Normal", color: "bg-green-100 text-green-700" }
      : { text: "🔴 Tinggi", color: "bg-red-100 text-red-700" };

  const targetBadge =
    pctTarget >= 90
      ? { text: "🟢 Hampir Target", color: "bg-green-100 text-green-700" }
      : pctTarget >= 60
      ? { text: "🟡 Menuju Target", color: "bg-yellow-100 text-yellow-700" }
      : { text: "🔴 Perlu Boost", color: "bg-red-100 text-red-700" };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* 1. Total Omzet */}
      <div className="bg-white rounded-2xl border p-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400 font-medium">💰 Total Omzet</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${targetBadge.color}`}>
            {targetBadge.text}
          </span>
        </div>
        <div className="text-2xl font-bold text-gray-900">{fR(summary.total_omzet)}</div>
        <div className="text-xs text-gray-400">Target bulan: {fR(TARGET_OMZET)}</div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div
            className="h-2 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all"
            style={{ width: `${pctTarget}%` }}
          />
        </div>
        <div className="text-[10px] text-gray-400 text-right">{pctTarget.toFixed(1)}%</div>
      </div>

      {/* 2. Total Botol */}
      <div className="bg-white rounded-2xl border p-5">
        <span className="text-xs text-gray-400 font-medium">📦 Total Botol Terjual</span>
        <div className="text-2xl font-bold text-gray-900 mt-2">{fN(summary.total_botol)} botol</div>
        <div className="text-xs text-gray-400 mt-1">Rata-rata/hari: ~{fN(avgBotolPerDay)} botol</div>
      </div>

      {/* 3. Total Closing */}
      <div className="bg-white rounded-2xl border p-5">
        <span className="text-xs text-gray-400 font-medium">🏷️ Total Closing</span>
        <div className="text-2xl font-bold text-gray-900 mt-2">{fN(summary.total_closing)} transaksi</div>
        <div className="text-xs text-gray-400 mt-1">
          Rata-rata/hari: ~{fN(avgClosingPerDay)} | Nilai/txn: {fR(nilaiPerTxn)}
        </div>
      </div>

      {/* 4. Rata-rata Upsell */}
      <div className="bg-white rounded-2xl border p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400 font-medium">📈 Rata-rata Upsell</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${upsellBadge.color}`}>
            {upsellBadge.text}
          </span>
        </div>
        <div className="text-2xl font-bold text-gray-900 mt-2">{summary.rata_upsell.toFixed(2)}x</div>
        <div className="text-xs text-gray-400 mt-1">1 closing = {summary.rata_upsell.toFixed(2)} botol</div>
      </div>

      {/* 5. CAC Total */}
      <div className="bg-white rounded-2xl border p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400 font-medium">💸 CAC Total Rata-rata</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cacBadge.color}`}>
            {cacBadge.text}
          </span>
        </div>
        <div className="text-2xl font-bold text-gray-900 mt-2">{summary.rata_cac.toFixed(1)}%</div>
        <div className="text-xs text-gray-400 mt-1">
          Per Rp 1 omzet = Rp {(summary.rata_cac / 100).toFixed(3)} biaya
        </div>
      </div>

      {/* 6. Kontribusi ke Brand */}
      <div className="bg-white rounded-2xl border p-5">
        <span className="text-xs text-gray-400 font-medium">🏆 Kontribusi ke Total Brand</span>
        <div className="text-2xl font-bold text-gray-900 mt-2">{summary.pct_kontribusi_fv}%</div>
        <div className="text-xs text-gray-400 mt-1">
          FV menyumbang {summary.pct_kontribusi_fv}% dari total omzet semua produk
        </div>
        {/* Mini donut */}
        <div className="flex justify-center mt-2">
          <svg width="60" height="60" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="14" fill="none" stroke="#e5e7eb" strokeWidth="4" />
            <circle
              cx="18"
              cy="18"
              r="14"
              fill="none"
              stroke="#3b82f6"
              strokeWidth="4"
              strokeDasharray={`${summary.pct_kontribusi_fv * 0.88} ${88 - summary.pct_kontribusi_fv * 0.88}`}
              strokeDashoffset="22"
              strokeLinecap="round"
            />
            <text x="18" y="20" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#1f2937">
              {summary.pct_kontribusi_fv}%
            </text>
          </svg>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// CHART 1: Omzet & Botol Harian
// ══════════════════════════════════════════════════════════
function OmzetBotolChart({ harian }: { harian: HarianRow[] }) {
  const chartData = useMemo(() => {
    const maxOmzet = Math.max(...harian.map((r) => r.omzet));
    return harian.map((r) => ({
      tgl: r.tanggal,
      omzet_jt: +(r.omzet / 1_000_000).toFixed(2),
      botol: r.botol,
      closing: r.closing,
      upsell: r.upsell,
      cac: r.cac_total,
      isBest: r.omzet === maxOmzet,
    }));
  }, [harian]);

  return (
    <div className="bg-white rounded-2xl border p-6">
      <h3 className="text-sm font-semibold mb-4">📊 Omzet & Botol Harian</h3>
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="tgl" tick={{ fontSize: 10 }} />
          <YAxis yAxisId="left" tick={{ fontSize: 10 }} unit=" Jt" />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} unit=" btl" />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0]?.payload;
              return (
                <div className="bg-white border rounded-xl shadow-lg p-3 text-xs space-y-1">
                  <div className="font-bold text-gray-900">Tgl {d.tgl}</div>
                  <div>💰 Omzet: <strong>Rp {d.omzet_jt} Jt</strong></div>
                  <div>📦 Botol: <strong>{d.botol}</strong></div>
                  <div>🏷️ Closing: <strong>{d.closing}</strong></div>
                  <div>📈 Upsell: <strong>{d.upsell?.toFixed(2)}x</strong></div>
                  <div>💸 CAC: <strong>{d.cac?.toFixed(1)}%</strong></div>
                  {d.isBest && <div className="text-yellow-600 font-bold">⭐ Hari Terbaik!</div>}
                </div>
              );
            }}
          />
          <Legend />
          <Bar yAxisId="left" dataKey="omzet_jt" name="Omzet (Jt)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          <Line yAxisId="right" type="monotone" dataKey="botol" name="Botol" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// CHART 2: Donut - Kontribusi Per Brand
// ══════════════════════════════════════════════════════════
const BRAND_COLORS: Record<string, string> = {
  FreshVision: "#3b82f6",
  Etawaku: "#10b981",
  Freshmag: "#f97316",
  Nutriflakes: "#8b5cf6",
};

function BrandDonutChart({ evaluasi }: { evaluasi: EvaluasiPerBrand }) {
  const pieData = useMemo(() => {
    const items = [
      { name: "FreshVision", value: evaluasi.freshvision },
      { name: "Etawaku", value: evaluasi.etawaku },
      { name: "Freshmag", value: evaluasi.freshmag },
      { name: "Nutriflakes", value: evaluasi.nutriflakes },
    ].filter((d) => d.value > 0);
    return items;
  }, [evaluasi]);

  return (
    <div className="bg-white rounded-2xl border p-6">
      <h3 className="text-sm font-semibold mb-4">🏆 Kontribusi Per Brand</h3>
      <div className="flex items-center justify-center">
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={110}
              paddingAngle={3}
              dataKey="value"
              label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(1)}%`}
            >
              {pieData.map((entry) => (
                <Cell key={entry.name} fill={BRAND_COLORS[entry.name] || "#94a3b8"} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => fR(Number(value))}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      {/* Center text overlay */}
      <div className="text-center -mt-4">
        <div className="text-xs text-gray-400">Total</div>
        <div className="text-lg font-bold text-gray-900">{fR(evaluasi.total)}</div>
      </div>
      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-4 mt-3">
        {pieData.map((d) => (
          <div key={d.name} className="flex items-center gap-1.5 text-xs">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: BRAND_COLORS[d.name] }} />
            <span className="text-gray-600">{d.name}</span>
            <span className="font-medium">{fR(d.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// CHART 3: Upsell & CAC Trend
// ══════════════════════════════════════════════════════════
function UpsellCacChart({ harian }: { harian: HarianRow[] }) {
  const chartData = useMemo(
    () =>
      harian.map((r) => ({
        tgl: r.tanggal,
        upsell: +r.upsell.toFixed(2),
        cac: +r.cac_total.toFixed(1),
      })),
    [harian]
  );

  return (
    <div className="bg-white rounded-2xl border p-6">
      <h3 className="text-sm font-semibold mb-4">📈 Tren Upsell & CAC</h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="tgl" tick={{ fontSize: 10 }} />
          <YAxis yAxisId="left" tick={{ fontSize: 10 }} domain={[0, "auto"]} unit="x" />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} unit="%" />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0]?.payload;
              return (
                <div className="bg-white border rounded-xl shadow-lg p-3 text-xs space-y-1">
                  <div className="font-bold">Tgl {d.tgl}</div>
                  <div>📈 Upsell: <strong>{d.upsell}x</strong></div>
                  <div>💸 CAC: <strong>{d.cac}%</strong></div>
                </div>
              );
            }}
          />
          <Legend />
          <ReferenceLine yAxisId="left" y={1.3} stroke="#10b981" strokeDasharray="6 3" label={{ value: "Upsell 1.3x", fontSize: 10, fill: "#10b981" }} />
          <ReferenceLine yAxisId="right" y={60} stroke="#ef4444" strokeDasharray="6 3" label={{ value: "CAC 60%", fontSize: 10, fill: "#ef4444" }} />
          <Line yAxisId="left" type="monotone" dataKey="upsell" name="Upsell" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
          <Line yAxisId="right" type="monotone" dataKey="cac" name="CAC %" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// TABEL HARIAN DETAIL
// ══════════════════════════════════════════════════════════
function HarianTable({ harian, summary }: { harian: HarianRow[]; summary: Summary }) {
  const sorted = useMemo(() => {
    const avgOmzet = harian.length > 0 ? harian.reduce((s, r) => s + r.omzet, 0) / harian.length : 0;
    const topOmzet = [...harian].sort((a, b) => b.omzet - a.omzet).slice(0, 3).map((r) => r.tanggal);

    return [...harian]
      .sort((a, b) => {
        // Sort by tanggal descending (newest first)
        const numA = parseInt(a.tanggal) || 0;
        const numB = parseInt(b.tanggal) || 0;
        return numB - numA;
      })
      .map((r) => ({
        ...r,
        status: topOmzet.includes(r.tanggal) ? "⭐" : r.omzet >= avgOmzet ? "✅" : "⚠️",
        statusLabel: topOmzet.includes(r.tanggal) ? "Terbaik" : r.omzet >= avgOmzet ? "Normal" : "Di bawah rata-rata",
      }));
  }, [harian]);

  function omzetColor(v: number) {
    if (v >= 15_000_000) return "text-green-700 font-bold";
    if (v >= 10_000_000) return "text-yellow-700 font-semibold";
    return "text-red-600";
  }
  function upsellColor(v: number) {
    if (v >= 1.3) return "text-green-700 font-bold";
    if (v >= 1.1) return "text-yellow-700";
    return "text-red-600";
  }
  function cacColor(v: number) {
    if (v < 50) return "text-green-700 font-bold";
    if (v <= 60) return "text-yellow-700";
    return "text-red-600";
  }

  return (
    <div className="bg-white rounded-2xl border p-6">
      <h3 className="text-sm font-semibold mb-4">📋 Tabel Harian Detail</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b bg-gray-50 text-left">
              <th className="p-2.5 font-semibold">Tgl</th>
              <th className="p-2.5 text-right font-semibold">Closing</th>
              <th className="p-2.5 text-right font-semibold">Botol</th>
              <th className="p-2.5 text-right font-semibold">Omzet</th>
              <th className="p-2.5 text-right font-semibold">Upsell</th>
              <th className="p-2.5 text-right font-semibold">CAC %</th>
              <th className="p-2.5 text-right font-semibold">Kontribusi %</th>
              <th className="p-2.5 text-center font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => (
              <tr key={i} className={`border-b hover:bg-gray-50 ${r.status === "⭐" ? "bg-yellow-50" : ""}`}>
                <td className="p-2.5 font-medium">{r.tanggal}</td>
                <td className="p-2.5 text-right">{fN(r.closing)}</td>
                <td className="p-2.5 text-right">{fN(r.botol)}</td>
                <td className={`p-2.5 text-right ${omzetColor(r.omzet)}`}>{fR(r.omzet)}</td>
                <td className={`p-2.5 text-right ${upsellColor(r.upsell)}`}>{r.upsell.toFixed(2)}x</td>
                <td className={`p-2.5 text-right ${cacColor(r.cac_total)}`}>{r.cac_total.toFixed(1)}%</td>
                <td className="p-2.5 text-right">{r.pct_kontribusi_fv.toFixed(1)}%</td>
                <td className="p-2.5 text-center" title={r.statusLabel}>
                  {r.status}
                </td>
              </tr>
            ))}
          </tbody>
          {/* Sticky footer TOTAL */}
          <tfoot className="sticky bottom-0">
            <tr className="bg-blue-50 border-t-2 border-blue-200 font-bold">
              <td className="p-2.5">TOTAL</td>
              <td className="p-2.5 text-right">{fN(summary.total_closing)}</td>
              <td className="p-2.5 text-right">{fN(summary.total_botol)}</td>
              <td className="p-2.5 text-right text-blue-700">{fR(summary.total_omzet)}</td>
              <td className="p-2.5 text-right">{summary.rata_upsell.toFixed(2)}x</td>
              <td className="p-2.5 text-right">{summary.rata_cac.toFixed(1)}%</td>
              <td className="p-2.5 text-right">{summary.pct_kontribusi_fv}%</td>
              <td className="p-2.5 text-center">—</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
