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
  BarChart,
} from "recharts";
import { RefreshCw, Loader2, TrendingUp, TrendingDown, ShoppingBag, Video, Radio, Store, Users } from "lucide-react";

// ─── Types ──────────────────────────────────────────────
interface HarianRow {
  tanggal: string; closing: number; botol: number; nilai_per_txn: number;
  omzet: number; cac_ads: number; cac_total: number; upsell: number;
  biaya_iklan: number; komisi_affiliate: number;
  omzet_total_brand: number; pct_kontribusi_fv: number;
}
interface ChannelRow {
  tanggal: string; omzet: number; closing: number; botol: number;
  upsell: number; cac_ads: number; cac_total: number;
}
interface ChannelSummary {
  total_omzet: number; total_closing: number; total_botol: number;
  rata_upsell: number; rata_cac: number; hari: number;
}
interface WeeklyRow {
  label: string; hari: number; total_omzet: number; total_closing: number;
  total_botol: number; rata_upsell: number; rata_cac: number; rata_omzet_harian: number;
}
interface Summary {
  bulan: string; target_omzet: number;
  total_omzet: number; total_botol: number; total_closing: number;
  rata_upsell: number; rata_cac: number;
  total_biaya_iklan: number; total_komisi_aff: number;
  total_omzet_all: number; total_omzet_fv: number; pct_kontribusi_fv: number;
}
interface EvaluasiPerBrand {
  freshvision: number; nutriflakes: number; freshmag: number; etawaku: number; total: number;
}
interface ApiResponse {
  summary: Summary;
  harian: HarianRow[];
  weekly: WeeklyRow[];
  channels: Record<string, ChannelSummary>;
  channel_data: { video: ChannelRow[]; live: ChannelRow[]; shop_tab: ChannelRow[]; affiliate: ChannelRow[] };
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
function fN(v: number) { return v.toLocaleString("id-ID"); }

// ══════════════════════════════════════════════════════════
// MAIN SCREEN
// ══════════════════════════════════════════════════════════
export default function LaporanHarianScreen() {
  const { data, error, isLoading, mutate } = useSWR<ApiResponse>(
    "/api/laporan-harian",
    fetcher,
    { refreshInterval: 5 * 60 * 1000 }
  );

  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "channels" | "weekly">("overview");

  useEffect(() => {
    if (data?.summary) setLastUpdate(new Date());
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-500">Memuat data dari Google Sheets...</p>
        </div>
      </div>
    );
  }

  if (error || !data?.summary) {
    const errMsg = error?.message || (data as unknown as { error?: string })?.error || "Gagal memuat data dari Google Sheets";
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center max-w-md space-y-4">
          <div className="text-4xl">⚠️</div>
          <h2 className="text-lg font-bold text-gray-900">Gagal Memuat Data</h2>
          <p className="text-sm text-gray-500">{errMsg}</p>
          <p className="text-xs text-gray-400">
            Pastikan environment variables Google Sheets sudah dikonfigurasi di Vercel:
            <br />
            <code className="bg-gray-100 px-1 rounded">GOOGLE_SHEETS_ID</code>,{" "}
            <code className="bg-gray-100 px-1 rounded">GOOGLE_SERVICE_ACCOUNT_EMAIL</code>,{" "}
            <code className="bg-gray-100 px-1 rounded">GOOGLE_PRIVATE_KEY</code>
          </p>
          <button onClick={() => mutate()} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition inline-flex items-center gap-2">
            <RefreshCw size={14} /> Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  const { summary, harian, weekly, channels, channel_data, evaluasi_per_brand } = data;

  return (
    <div className="space-y-6">
      {/* ═══ HEADER ═══ */}
      <Header lastUpdate={lastUpdate} onRefresh={() => mutate()} />

      {/* ═══ TABS ═══ */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {[
          { key: "overview" as const, label: "📊 Overview" },
          { key: "channels" as const, label: "📡 Per Channel" },
          { key: "weekly" as const, label: "📅 Evaluasi Mingguan" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === t.key ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <>
          <KpiCards summary={summary} />
          <OmzetBotolChart harian={harian} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <BrandDonutChart evaluasi={evaluasi_per_brand} />
            <UpsellCacChart harian={harian} />
          </div>
          <HarianTable harian={harian} summary={summary} />
        </>
      )}

      {activeTab === "channels" && (
        <ChannelsTab channels={channels} channelData={channel_data} />
      )}

      {activeTab === "weekly" && (
        <WeeklyTab weekly={weekly} summary={summary} />
      )}
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
          <h1 className="text-2xl font-bold text-gray-900">📊 Laporan Harian FreshVision</h1>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <p className="text-sm text-gray-400">
              Fresh Vision Official | Terakhir update: {lastUpdate ? lastUpdate.toLocaleString("id-ID") : "—"}
            </p>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 animate-pulse">
              🔴 Live dari Google Sheets
            </span>
          </div>
        </div>
        <button onClick={onRefresh} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition">
          <RefreshCw size={16} /> Refresh Data
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// KPI CARDS
// ══════════════════════════════════════════════════════════
function KpiCards({ summary }: { summary: Summary }) {
  const pctTarget = Math.min((summary.total_omzet / summary.target_omzet) * 100, 100);
  const avgBotolPerDay = summary.total_botol > 0 ? Math.round(summary.total_botol / Math.max(1, Math.ceil(summary.total_closing / (summary.total_closing / (summary.total_botol / summary.rata_upsell > 0 ? 1 : 1))))) : 0;
  const nilaiPerTxn = summary.total_closing > 0 ? summary.total_omzet / summary.total_closing : 0;
  const hari = summary.total_closing > 0 ? Math.round(summary.total_omzet / (summary.total_omzet / 20)) : 20;

  const badge = (cond: boolean, good: string, bad: string, goodColor = "bg-green-100 text-green-700", badColor = "bg-red-100 text-red-700") =>
    cond ? { text: good, color: goodColor } : { text: bad, color: badColor };

  const targetBadge = pctTarget >= 90
    ? { text: "🟢 Hampir Target", color: "bg-green-100 text-green-700" }
    : pctTarget >= 60
    ? { text: "🟡 Menuju Target", color: "bg-yellow-100 text-yellow-700" }
    : { text: "🔴 Perlu Boost", color: "bg-red-100 text-red-700" };

  const upsellBadge = summary.rata_upsell >= 1.3
    ? { text: "🟢 Baik", color: "bg-green-100 text-green-700" }
    : summary.rata_upsell >= 1.1
    ? { text: "🟡 Cukup", color: "bg-yellow-100 text-yellow-700" }
    : { text: "🔴 Rendah", color: "bg-red-100 text-red-700" };

  const cacBadge = summary.rata_cac < 50
    ? { text: "🟢 Efisien", color: "bg-green-100 text-green-700" }
    : summary.rata_cac <= 60
    ? { text: "🟡 Normal", color: "bg-yellow-100 text-yellow-700" }
    : { text: "🔴 Tinggi", color: "bg-red-100 text-red-700" };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* 1. Total Omzet + Target */}
      <div className="bg-white rounded-2xl border p-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400 font-medium">💰 Total Omzet (Shop)</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${targetBadge.color}`}>{targetBadge.text}</span>
        </div>
        <div className="text-2xl font-bold text-gray-900">{fR(summary.total_omzet)}</div>
        <div className="text-xs text-gray-400">Target bulan: {fR(summary.target_omzet)}</div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div className="h-2 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all" style={{ width: `${pctTarget}%` }} />
        </div>
        <div className="text-[10px] text-gray-400 text-right">{pctTarget.toFixed(1)}%</div>
      </div>

      {/* 2. Total Botol */}
      <div className="bg-white rounded-2xl border p-5">
        <span className="text-xs text-gray-400 font-medium">📦 Total Botol Terjual</span>
        <div className="text-2xl font-bold text-gray-900 mt-2">{fN(summary.total_botol)} botol</div>
        <div className="text-xs text-gray-400 mt-1">Rata-rata/hari: ~{fN(Math.round(summary.total_botol / 20))} botol</div>
      </div>

      {/* 3. Total Closing */}
      <div className="bg-white rounded-2xl border p-5">
        <span className="text-xs text-gray-400 font-medium">🏷️ Total Closing</span>
        <div className="text-2xl font-bold text-gray-900 mt-2">{fN(summary.total_closing)} transaksi</div>
        <div className="text-xs text-gray-400 mt-1">
          Rata-rata/hari: ~{fN(Math.round(summary.total_closing / 20))} | Nilai/txn: {fR(nilaiPerTxn)}
        </div>
      </div>

      {/* 4. Upsell */}
      <div className="bg-white rounded-2xl border p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400 font-medium">📈 Rata-rata Upsell</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${upsellBadge.color}`}>{upsellBadge.text}</span>
        </div>
        <div className="text-2xl font-bold text-gray-900 mt-2">{summary.rata_upsell.toFixed(2)}x</div>
        <div className="text-xs text-gray-400 mt-1">1 closing = {summary.rata_upsell.toFixed(2)} botol</div>
      </div>

      {/* 5. CAC */}
      <div className="bg-white rounded-2xl border p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400 font-medium">💸 CAC Total</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cacBadge.color}`}>{cacBadge.text}</span>
        </div>
        <div className="text-2xl font-bold text-gray-900 mt-2">{summary.rata_cac.toFixed(1)}%</div>
        <div className="text-xs text-gray-400 mt-1">
          Biaya iklan: {fR(summary.total_biaya_iklan)} | Komisi aff: {fR(summary.total_komisi_aff)}
        </div>
      </div>

      {/* 6. Kontribusi Brand */}
      <div className="bg-white rounded-2xl border p-5">
        <span className="text-xs text-gray-400 font-medium">🏆 Kontribusi ke Total Brand</span>
        <div className="text-2xl font-bold text-gray-900 mt-2">{summary.pct_kontribusi_fv}%</div>
        <div className="text-xs text-gray-400 mt-1">
          FV: {fR(summary.total_omzet_fv)} dari total {fR(summary.total_omzet_all)}
        </div>
        <div className="flex justify-center mt-2">
          <svg width="60" height="60" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="14" fill="none" stroke="#e5e7eb" strokeWidth="4" />
            <circle cx="18" cy="18" r="14" fill="none" stroke="#3b82f6" strokeWidth="4"
              strokeDasharray={`${summary.pct_kontribusi_fv * 0.88} ${88 - summary.pct_kontribusi_fv * 0.88}`}
              strokeDashoffset="22" strokeLinecap="round" />
            <text x="18" y="20" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#1f2937">{summary.pct_kontribusi_fv}%</text>
          </svg>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// CHANNELS TAB
// ══════════════════════════════════════════════════════════
const CHANNEL_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  shop:      { label: "🛒 Shop", icon: <ShoppingBag size={18} />, color: "blue" },
  video:     { label: "📹 Video", icon: <Video size={18} />, color: "purple" },
  live:      { label: "🔴 Live", icon: <Radio size={18} />, color: "red" },
  shop_tab:  { label: "🏪 Shop Tab", icon: <Store size={18} />, color: "emerald" },
  affiliate: { label: "🤝 Affiliate", icon: <Users size={18} />, color: "orange" },
};

function ChannelsTab({ channels, channelData }: {
  channels: Record<string, ChannelSummary>;
  channelData: { video: ChannelRow[]; live: ChannelRow[]; shop_tab: ChannelRow[]; affiliate: ChannelRow[] };
}) {
  const totalAllChannels = Object.values(channels).reduce((s, c) => s + c.total_omzet, 0);

  return (
    <div className="space-y-6">
      {/* Channel Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {Object.entries(channels).map(([key, ch]) => {
          const meta = CHANNEL_META[key];
          const pct = totalAllChannels > 0 ? ((ch.total_omzet / totalAllChannels) * 100).toFixed(1) : "0";
          return (
            <div key={key} className="bg-white rounded-2xl border p-5 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">{meta.label}</span>
              </div>
              <div className="text-xl font-bold text-gray-900">{fR(ch.total_omzet)}</div>
              <div className="text-xs text-gray-400">{pct}% dari total channel</div>
              <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                <div><span className="text-gray-400">Closing:</span> <strong>{fN(ch.total_closing)}</strong></div>
                <div><span className="text-gray-400">Botol:</span> <strong>{fN(ch.total_botol)}</strong></div>
                <div><span className="text-gray-400">Upsell:</span> <strong>{ch.rata_upsell.toFixed(2)}x</strong></div>
                <div><span className="text-gray-400">CAC:</span> <strong>{ch.rata_cac.toFixed(1)}%</strong></div>
              </div>
              <div className="text-[10px] text-gray-300">{ch.hari} hari data</div>
            </div>
          );
        })}
      </div>

      {/* Channel Omzet Comparison Bar Chart */}
      <div className="bg-white rounded-2xl border p-6">
        <h3 className="text-sm font-semibold mb-4">📊 Perbandingan Omzet Per Channel</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={Object.entries(channels).map(([key, ch]) => ({
            channel: CHANNEL_META[key]?.label || key,
            omzet_jt: +(ch.total_omzet / 1_000_000).toFixed(2),
            closing: ch.total_closing,
          }))}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="channel" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 10 }} unit=" Jt" />
            <Tooltip formatter={(value) => `Rp ${value} Jt`} />
            <Bar dataKey="omzet_jt" name="Omzet (Jt)" fill="#3b82f6" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Daily breakdown per channel */}
      {(["video", "live", "shop_tab", "affiliate"] as const).map((chKey) => {
        const rows = channelData[chKey];
        if (!rows || rows.length === 0) return null;
        const meta = CHANNEL_META[chKey];
        return (
          <div key={chKey} className="bg-white rounded-2xl border p-6">
            <h3 className="text-sm font-semibold mb-3">{meta.label} — Detail Harian</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-gray-50 text-left">
                    <th className="p-2 font-semibold">Tgl</th>
                    <th className="p-2 text-right font-semibold">Omzet</th>
                    <th className="p-2 text-right font-semibold">Closing</th>
                    <th className="p-2 text-right font-semibold">Botol</th>
                    <th className="p-2 text-right font-semibold">Upsell</th>
                    <th className="p-2 text-right font-semibold">CAC %</th>
                  </tr>
                </thead>
                <tbody>
                  {[...rows].reverse().map((r, i) => (
                    <tr key={i} className="border-b hover:bg-gray-50">
                      <td className="p-2 font-medium">{r.tanggal}</td>
                      <td className="p-2 text-right">{fR(r.omzet)}</td>
                      <td className="p-2 text-right">{fN(r.closing)}</td>
                      <td className="p-2 text-right">{fN(r.botol)}</td>
                      <td className="p-2 text-right">{r.upsell.toFixed(2)}x</td>
                      <td className="p-2 text-right">{r.cac_total.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// WEEKLY TAB
// ══════════════════════════════════════════════════════════
function WeeklyTab({ weekly, summary }: { weekly: WeeklyRow[]; summary: Summary }) {
  // Auto evaluation
  function evaluate(w: WeeklyRow) {
    const notes: string[] = [];
    const avgTarget = summary.target_omzet / 4; // monthly target / 4 weeks
    const pctTarget = (w.total_omzet / avgTarget) * 100;

    if (pctTarget >= 100) notes.push("✅ Omzet di atas target mingguan");
    else if (pctTarget >= 80) notes.push("🟡 Omzet mendekati target mingguan (" + pctTarget.toFixed(0) + "%)");
    else notes.push("🔴 Omzet di bawah target mingguan (" + pctTarget.toFixed(0) + "%)");

    if (w.rata_upsell >= 1.3) notes.push("✅ Upsell bagus (" + w.rata_upsell.toFixed(2) + "x)");
    else if (w.rata_upsell >= 1.1) notes.push("🟡 Upsell perlu ditingkatkan (" + w.rata_upsell.toFixed(2) + "x)");
    else notes.push("🔴 Upsell rendah (" + w.rata_upsell.toFixed(2) + "x)");

    if (w.rata_cac <= 50) notes.push("✅ CAC efisien (" + w.rata_cac.toFixed(1) + "%)");
    else if (w.rata_cac <= 60) notes.push("🟡 CAC normal (" + w.rata_cac.toFixed(1) + "%)");
    else notes.push("🔴 CAC tinggi — perlu evaluasi iklan (" + w.rata_cac.toFixed(1) + "%)");

    return notes;
  }

  return (
    <div className="space-y-6">
      {/* Target Progress */}
      <div className="bg-white rounded-2xl border p-6">
        <h3 className="text-sm font-semibold mb-4">🎯 Proyeksi Target Bulan Ini</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-xl">
            <div className="text-xs text-gray-400">Target</div>
            <div className="text-xl font-bold text-blue-700">{fR(summary.target_omzet)}</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-xl">
            <div className="text-xs text-gray-400">Tercapai</div>
            <div className="text-xl font-bold text-green-700">{fR(summary.total_omzet)}</div>
            <div className="text-xs text-gray-400">{((summary.total_omzet / summary.target_omzet) * 100).toFixed(1)}%</div>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-xl">
            <div className="text-xs text-gray-400">Sisa Target</div>
            <div className="text-xl font-bold text-orange-700">{fR(Math.max(0, summary.target_omzet - summary.total_omzet))}</div>
            <div className="text-xs text-gray-400">
              ~{fR(Math.max(0, summary.target_omzet - summary.total_omzet) / Math.max(1, 30 - 20))}/hari
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Omzet Chart */}
      <div className="bg-white rounded-2xl border p-6">
        <h3 className="text-sm font-semibold mb-4">📊 Omzet Per Minggu</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={weekly.map((w) => ({
            ...w,
            omzet_jt: +(w.total_omzet / 1_000_000).toFixed(2),
            target_jt: +(summary.target_omzet / 4 / 1_000_000).toFixed(2),
          }))}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 10 }} unit=" Jt" />
            <Tooltip formatter={(value) => `Rp ${value} Jt`} />
            <ReferenceLine y={+(summary.target_omzet / 4 / 1_000_000).toFixed(0)} stroke="#ef4444" strokeDasharray="6 3" label={{ value: "Target/minggu", fontSize: 10, fill: "#ef4444" }} />
            <Bar dataKey="omzet_jt" name="Omzet" fill="#3b82f6" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Weekly Evaluation Cards */}
      <div className="space-y-4">
        {weekly.map((w, i) => {
          const notes = evaluate(w);
          return (
            <div key={i} className="bg-white rounded-2xl border p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-base font-bold text-gray-900">{w.label}</h3>
                  <span className="text-xs text-gray-400">{w.hari} hari</span>
                </div>
                <div className="flex gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-xs text-gray-400">Omzet</div>
                    <div className="font-bold text-blue-700">{fR(w.total_omzet)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-400">Closing</div>
                    <div className="font-bold">{fN(w.total_closing)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-400">Botol</div>
                    <div className="font-bold">{fN(w.total_botol)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-400">Avg/hari</div>
                    <div className="font-bold">{fR(w.rata_omzet_harian)}</div>
                  </div>
                </div>
              </div>
              {/* Auto Evaluasi */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-1">
                <div className="text-xs font-semibold text-gray-500 mb-2">🤖 Evaluasi Otomatis</div>
                {notes.map((n, ni) => (
                  <div key={ni} className="text-sm">{n}</div>
                ))}
              </div>
            </div>
          );
        })}
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
      <h3 className="text-sm font-semibold mb-4">📊 Omzet & Botol Harian (Shop)</h3>
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="tgl" tick={{ fontSize: 10 }} />
          <YAxis yAxisId="left" tick={{ fontSize: 10 }} unit=" Jt" />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} unit=" btl" />
          <Tooltip content={({ active, payload }) => {
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
          }} />
          <Legend />
          <Bar yAxisId="left" dataKey="omzet_jt" name="Omzet (Jt)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          <Line yAxisId="right" type="monotone" dataKey="botol" name="Botol" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// CHART 2: Donut Brand
// ══════════════════════════════════════════════════════════
const BRAND_COLORS: Record<string, string> = {
  FreshVision: "#3b82f6", Etawaku: "#10b981", Freshmag: "#f97316", Nutriflakes: "#8b5cf6",
};

function BrandDonutChart({ evaluasi }: { evaluasi: EvaluasiPerBrand }) {
  const pieData = useMemo(() => [
    { name: "FreshVision", value: evaluasi.freshvision },
    { name: "Etawaku", value: evaluasi.etawaku },
    { name: "Freshmag", value: evaluasi.freshmag },
    { name: "Nutriflakes", value: evaluasi.nutriflakes },
  ].filter((d) => d.value > 0), [evaluasi]);

  return (
    <div className="bg-white rounded-2xl border p-6">
      <h3 className="text-sm font-semibold mb-4">🏆 Kontribusi Per Brand</h3>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie data={pieData} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={3} dataKey="value"
            label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(1)}%`}>
            {pieData.map((entry) => (
              <Cell key={entry.name} fill={BRAND_COLORS[entry.name] || "#94a3b8"} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => fR(Number(value))} />
        </PieChart>
      </ResponsiveContainer>
      <div className="text-center -mt-4">
        <div className="text-xs text-gray-400">Total Semua Brand</div>
        <div className="text-lg font-bold text-gray-900">{fR(evaluasi.total)}</div>
      </div>
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
  const chartData = useMemo(() => harian.map((r) => ({
    tgl: r.tanggal, upsell: +r.upsell.toFixed(2), cac: +r.cac_total.toFixed(1),
  })), [harian]);

  return (
    <div className="bg-white rounded-2xl border p-6">
      <h3 className="text-sm font-semibold mb-4">📈 Tren Upsell & CAC</h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="tgl" tick={{ fontSize: 10 }} />
          <YAxis yAxisId="left" tick={{ fontSize: 10 }} domain={[0, "auto"]} unit="x" />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} unit="%" />
          <Tooltip content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0]?.payload;
            return (
              <div className="bg-white border rounded-xl shadow-lg p-3 text-xs space-y-1">
                <div className="font-bold">Tgl {d.tgl}</div>
                <div>📈 Upsell: <strong>{d.upsell}x</strong></div>
                <div>💸 CAC: <strong>{d.cac}%</strong></div>
              </div>
            );
          }} />
          <Legend />
          <ReferenceLine yAxisId="left" y={1.3} stroke="#10b981" strokeDasharray="6 3" label={{ value: "1.3x", fontSize: 10, fill: "#10b981" }} />
          <ReferenceLine yAxisId="right" y={60} stroke="#ef4444" strokeDasharray="6 3" label={{ value: "60%", fontSize: 10, fill: "#ef4444" }} />
          <Line yAxisId="left" type="monotone" dataKey="upsell" name="Upsell" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
          <Line yAxisId="right" type="monotone" dataKey="cac" name="CAC %" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// TABEL HARIAN
// ══════════════════════════════════════════════════════════
function HarianTable({ harian, summary }: { harian: HarianRow[]; summary: Summary }) {
  const sorted = useMemo(() => {
    const avgOmzet = harian.length > 0 ? harian.reduce((s, r) => s + r.omzet, 0) / harian.length : 0;
    const top3 = [...harian].sort((a, b) => b.omzet - a.omzet).slice(0, 3).map((r) => r.tanggal);
    return [...harian].reverse().map((r) => ({
      ...r,
      status: top3.includes(r.tanggal) ? "⭐" : r.omzet >= avgOmzet ? "✅" : "⚠️",
      statusLabel: top3.includes(r.tanggal) ? "Top 3" : r.omzet >= avgOmzet ? "Normal" : "Di bawah rata-rata",
    }));
  }, [harian]);

  function omzetColor(v: number) { return v >= 15_000_000 ? "text-green-700 font-bold" : v >= 10_000_000 ? "text-yellow-700 font-semibold" : "text-red-600"; }
  function upsellColor(v: number) { return v >= 1.3 ? "text-green-700 font-bold" : v >= 1.1 ? "text-yellow-700" : "text-red-600"; }
  function cacColor(v: number) { return v < 50 ? "text-green-700 font-bold" : v <= 60 ? "text-yellow-700" : "text-red-600"; }

  return (
    <div className="bg-white rounded-2xl border p-6">
      <h3 className="text-sm font-semibold mb-4">📋 Tabel Harian Detail (Shop)</h3>
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
                <td className="p-2.5 text-center" title={r.statusLabel}>{r.status}</td>
              </tr>
            ))}
          </tbody>
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
