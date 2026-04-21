"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import useSWR from "swr";
import {
  ResponsiveContainer, ComposedChart, Bar, Line, LineChart, BarChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine,
  PieChart, Pie, Cell, AreaChart, Area,
} from "recharts";
import {
  RefreshCw, Loader2, TrendingUp, TrendingDown, Settings, X, Save,
  ShoppingBag, Video, Radio, Store, Users, AlertTriangle, CheckCircle2,
  Target, DollarSign, Zap, BarChart3, ArrowUpRight, ArrowDownRight,
} from "lucide-react";

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════
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
  total_botol: number; rata_upsell: number; rata_cac: number;
  rata_omzet_harian: number; wow_omzet: number; wow_closing: number;
}
interface Summary {
  total_omzet: number; total_botol: number; total_closing: number;
  rata_upsell: number; rata_cac: number; rata_cac_ads: number;
  total_biaya_iklan: number; total_komisi_aff: number; total_cost: number;
  roas: number; cost_per_closing: number; cost_per_botol: number;
  margin_after_cost: number;
  total_omzet_all: number; total_omzet_fv: number; pct_kontribusi_fv: number;
  hari: number; avg_omzet_harian: number; avg_closing_harian: number;
  avg_botol_harian: number; nilai_per_txn: number;
}
interface Highlights {
  best_day: { tanggal: string; omzet: number } | null;
  worst_day: { tanggal: string; omzet: number } | null;
  anomalies: { tanggal: string; omzet: number; type: "spike" | "drop"; deviation: number }[];
}
interface EvaluasiPerBrand { freshvision: number; nutriflakes: number; freshmag: number; etawaku: number; total: number; }
interface ApiResponse {
  summary: Summary; harian: HarianRow[]; weekly: WeeklyRow[];
  channels: Record<string, ChannelSummary>;
  channel_data: { video: ChannelRow[]; live: ChannelRow[]; shop_tab: ChannelRow[]; affiliate: ChannelRow[] };
  evaluasi_per_brand: EvaluasiPerBrand; highlights: Highlights;
}

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════
const fetcher = (url: string) => fetch(url).then((r) => r.json());
function fR(v: number) {
  if (v >= 1_000_000_000) return `Rp${(v / 1_000_000_000).toFixed(1)}M`;
  if (v >= 1_000_000) return `Rp${(v / 1_000_000).toFixed(1)}Jt`;
  if (v >= 1_000) return `Rp${(v / 1_000).toFixed(0)}Rb`;
  return `Rp${v.toLocaleString("id-ID")}`;
}
function fN(v: number) { return v.toLocaleString("id-ID"); }

function useTarget() {
  const [target, setTargetState] = useState(350_000_000);
  useEffect(() => {
    const saved = localStorage.getItem("fv_target_omzet");
    if (saved) setTargetState(parseInt(saved));
  }, []);
  const setTarget = useCallback((v: number) => {
    setTargetState(v);
    localStorage.setItem("fv_target_omzet", String(v));
  }, []);
  return { target, setTarget };
}

function healthScore(s: Summary, target: number): { score: number; label: string; color: string } {
  let score = 0;
  // Omzet vs target (40 pts)
  const pctTarget = Math.min(s.total_omzet / target, 1);
  score += pctTarget * 40;
  // Upsell (20 pts) — 1.3x = 20, 1.0x = 0
  score += Math.min(((s.rata_upsell - 1) / 0.3) * 20, 20);
  // CAC (20 pts) — <50% = 20, >70% = 0
  score += Math.max(0, Math.min(((70 - s.rata_cac) / 20) * 20, 20));
  // ROAS (20 pts) — >4 = 20, <2 = 0
  score += Math.min(Math.max(0, (s.roas - 2) / 2) * 20, 20);

  score = Math.round(Math.max(0, Math.min(100, score)));
  if (score >= 80) return { score, label: "Excellent", color: "text-green-600" };
  if (score >= 60) return { score, label: "Good", color: "text-blue-600" };
  if (score >= 40) return { score, label: "Needs Improvement", color: "text-yellow-600" };
  return { score, label: "Critical", color: "text-red-600" };
}

// ═══════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════
export default function LaporanHarianScreen() {
  const { data, error, isLoading, mutate } = useSWR<ApiResponse>("/api/laporan-harian", fetcher, { refreshInterval: 5 * 60 * 1000 });
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [showSettings, setShowSettings] = useState(false);
  const { target, setTarget } = useTarget();

  useEffect(() => { if (data?.summary) setLastUpdate(new Date()); }, [data]);

  if (isLoading) return <LoadingState />;
  if (error || !data?.summary) return <ErrorState error={error} data={data} onRetry={() => mutate()} />;

  const { summary: s, harian, weekly, channels, channel_data, evaluasi_per_brand, highlights } = data;
  const health = healthScore(s, target);
  const tabs = [
    { key: "overview", label: "Overview", icon: <BarChart3 size={14} /> },
    { key: "cost", label: "Cost Analysis", icon: <DollarSign size={14} /> },
    { key: "channels", label: "Per Channel", icon: <Zap size={14} /> },
    { key: "weekly", label: "Evaluasi Mingguan", icon: <Target size={14} /> },
  ];

  return (
    <div className="space-y-5 pb-10">
      {/* ═══ HEADER ═══ */}
      <div className="bg-white rounded-2xl border p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Laporan Harian FreshVision</h1>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                <span>Update: {lastUpdate ? lastUpdate.toLocaleString("id-ID") : "—"}</span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 animate-pulse">● Live</span>
              </div>
            </div>
            {/* Health Score Badge */}
            <div className="hidden sm:flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
              <div className={`text-2xl font-black ${health.color}`}>{health.score}</div>
              <div className="text-[10px] leading-tight">
                <div className="font-bold text-gray-600">Health Score</div>
                <div className={`font-semibold ${health.color}`}>{health.label}</div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowSettings(true)} className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50 text-sm transition">
              <Settings size={14} /> Target & Setting
            </button>
            <button onClick={() => mutate()} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition">
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* ═══ SETTINGS MODAL ═══ */}
      {showSettings && <SettingsModal target={target} onSave={setTarget} onClose={() => setShowSettings(false)} />}

      {/* ═══ EXECUTIVE SUMMARY ═══ */}
      <ExecutiveSummary s={s} target={target} health={health} highlights={highlights} />

      {/* ═══ TAB BAR ═══ */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${activeTab === t.key ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ═══ TAB CONTENT ═══ */}
      {activeTab === "overview" && <OverviewTab s={s} target={target} harian={harian} evaluasi={evaluasi_per_brand} />}
      {activeTab === "cost" && <CostTab s={s} harian={harian} />}
      {activeTab === "channels" && <ChannelsTab channels={channels} channelData={channel_data} />}
      {activeTab === "weekly" && <WeeklyTab weekly={weekly} s={s} target={target} harian={harian} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// LOADING & ERROR STATES
// ═══════════════════════════════════════════════════════════
function LoadingState() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="text-center"><Loader2 size={36} className="animate-spin text-blue-500 mx-auto mb-3" /><p className="text-sm text-gray-400">Memuat data Google Sheets…</p></div>
    </div>
  );
}
function ErrorState({ error, data, onRetry }: { error: unknown; data: unknown; onRetry: () => void }) {
  const msg = (error as Error)?.message || (data as { error?: string })?.error || "Gagal memuat data";
  return (
    <div className="flex items-center justify-center py-24">
      <div className="text-center max-w-sm space-y-3">
        <AlertTriangle size={36} className="text-red-400 mx-auto" />
        <h2 className="font-bold text-gray-900">Gagal Memuat Data</h2>
        <p className="text-sm text-gray-500">{msg}</p>
        <button onClick={onRetry} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-1.5"><RefreshCw size={14} /> Coba Lagi</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SETTINGS MODAL
// ═══════════════════════════════════════════════════════════
function SettingsModal({ target, onSave, onClose }: { target: number; onSave: (v: number) => void; onClose: () => void }) {
  const [val, setVal] = useState(String(target));
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-gray-900">⚙️ Pengaturan Dashboard</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Target Omzet Bulanan</label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Rp</span>
            <input type="number" value={val} onChange={(e) => setVal(e.target.value)}
              className="flex-1 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
          </div>
          <div className="flex gap-2 mt-2 flex-wrap">
            {[200_000_000, 300_000_000, 350_000_000, 400_000_000, 500_000_000].map((v) => (
              <button key={v} onClick={() => setVal(String(v))} className={`text-xs px-2.5 py-1 rounded-full border transition ${parseInt(val) === v ? "bg-blue-50 border-blue-300 text-blue-700" : "hover:bg-gray-50 text-gray-500"}`}>
                {fR(v)}
              </button>
            ))}
          </div>
        </div>
        <button onClick={() => { onSave(parseInt(val) || 350_000_000); onClose(); }}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 transition">
          <Save size={14} /> Simpan
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// EXECUTIVE SUMMARY
// ═══════════════════════════════════════════════════════════
function ExecutiveSummary({ s, target, health, highlights }: { s: Summary; target: number; health: { score: number; label: string; color: string }; highlights: Highlights }) {
  const pctTarget = (s.total_omzet / target) * 100;
  const sisaTarget = Math.max(0, target - s.total_omzet);
  const sisaHari = Math.max(1, 30 - s.hari);
  const needPerDay = sisaTarget / sisaHari;
  const onTrack = s.avg_omzet_harian >= (target / 30);

  const alerts: { type: "success" | "warning" | "danger"; text: string }[] = [];
  if (pctTarget >= 100) alerts.push({ type: "success", text: "🎉 Target bulanan sudah tercapai!" });
  else if (onTrack) alerts.push({ type: "success", text: `✅ On track — pace saat ini ${fR(s.avg_omzet_harian)}/hari sudah cukup` });
  else alerts.push({ type: "warning", text: `⚠️ Butuh ${fR(Math.round(needPerDay))}/hari di ${sisaHari} hari tersisa untuk capai target` });

  if (s.rata_cac > 60) alerts.push({ type: "danger", text: `🔴 CAC ${s.rata_cac.toFixed(1)}% terlalu tinggi — evaluasi spending iklan` });
  if (s.rata_upsell < 1.1) alerts.push({ type: "danger", text: `🔴 Upsell ${s.rata_upsell.toFixed(2)}x sangat rendah — push bundling/promo` });
  if (s.roas < 2.5) alerts.push({ type: "warning", text: `⚠️ ROAS ${s.roas.toFixed(1)}x rendah — iklan kurang efisien` });

  if (highlights.anomalies.length > 0) {
    highlights.anomalies.forEach((a) => {
      if (a.type === "drop") alerts.push({ type: "warning", text: `📉 Anomali: ${a.tanggal} omzet turun ${Math.abs(a.deviation)}% dari rata-rata` });
    });
  }

  const alertColors = { success: "bg-green-50 border-green-200 text-green-800", warning: "bg-yellow-50 border-yellow-200 text-yellow-800", danger: "bg-red-50 border-red-200 text-red-800" };

  return (
    <div className="bg-white rounded-2xl border p-5 space-y-4">
      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between text-sm mb-1.5">
          <span className="font-medium text-gray-700">Progress Target: <strong>{fR(s.total_omzet)}</strong> / {fR(target)}</span>
          <span className={`font-bold ${pctTarget >= 100 ? "text-green-600" : pctTarget >= 70 ? "text-blue-600" : "text-orange-600"}`}>{pctTarget.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
          <div className={`h-3 rounded-full transition-all duration-700 ${pctTarget >= 100 ? "bg-green-500" : pctTarget >= 70 ? "bg-blue-500" : "bg-orange-500"}`}
            style={{ width: `${Math.min(pctTarget, 100)}%` }} />
        </div>
      </div>
      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <MiniKpi label="Omzet" value={fR(s.total_omzet)} sub={`${s.hari} hari`} />
        <MiniKpi label="Avg/Hari" value={fR(s.avg_omzet_harian)} sub={`${fN(s.avg_closing_harian)} closing`} />
        <MiniKpi label="Botol" value={fN(s.total_botol)} sub={`~${fN(s.avg_botol_harian)}/hari`} />
        <MiniKpi label="Nilai/Txn" value={fR(s.nilai_per_txn)} sub={`${fN(s.total_closing)} txn`} />
        <MiniKpi label="Upsell" value={`${s.rata_upsell.toFixed(2)}x`} sub={s.rata_upsell >= 1.3 ? "🟢 Baik" : s.rata_upsell >= 1.1 ? "🟡 Cukup" : "🔴 Rendah"} />
        <MiniKpi label="CAC" value={`${s.rata_cac.toFixed(1)}%`} sub={s.rata_cac <= 50 ? "🟢 Efisien" : s.rata_cac <= 60 ? "🟡 Normal" : "🔴 Tinggi"} />
        <MiniKpi label="ROAS" value={`${s.roas.toFixed(1)}x`} sub={s.roas >= 4 ? "🟢 Excellent" : s.roas >= 3 ? "🟡 OK" : "🔴 Low"} />
      </div>
      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-1.5">
          {alerts.map((a, i) => (
            <div key={i} className={`text-xs px-3 py-2 rounded-lg border ${alertColors[a.type]}`}>{a.text}</div>
          ))}
        </div>
      )}
      {/* Best / Worst */}
      {highlights.best_day && highlights.worst_day && (
        <div className="flex flex-wrap gap-3 text-xs">
          <span className="bg-green-50 text-green-700 px-2.5 py-1 rounded-full">⭐ Best: {highlights.best_day.tanggal} ({fR(highlights.best_day.omzet)})</span>
          <span className="bg-red-50 text-red-700 px-2.5 py-1 rounded-full">📉 Lowest: {highlights.worst_day.tanggal} ({fR(highlights.worst_day.omzet)})</span>
          <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full">🏆 Kontribusi FV: {s.pct_kontribusi_fv}%</span>
        </div>
      )}
    </div>
  );
}
function MiniKpi({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="text-center">
      <div className="text-[10px] text-gray-400 font-medium">{label}</div>
      <div className="text-sm font-bold text-gray-900 mt-0.5">{value}</div>
      <div className="text-[10px] text-gray-400">{sub}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// OVERVIEW TAB
// ═══════════════════════════════════════════════════════════
function OverviewTab({ s, target, harian, evaluasi }: { s: Summary; target: number; harian: HarianRow[]; evaluasi: EvaluasiPerBrand }) {
  return (
    <div className="space-y-5">
      {/* Omzet & Botol Chart */}
      <OmzetBotolChart harian={harian} avgTarget={target / 30} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <BrandDonutChart evaluasi={evaluasi} />
        <UpsellCacChart harian={harian} />
      </div>
      <HarianTable harian={harian} s={s} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// COST ANALYSIS TAB
// ═══════════════════════════════════════════════════════════
function CostTab({ s, harian }: { s: Summary; harian: HarianRow[] }) {
  const costData = useMemo(() => harian.map((r) => ({
    tgl: r.tanggal,
    iklan_jt: +(r.biaya_iklan / 1_000_000).toFixed(2),
    aff_jt: +(r.komisi_affiliate / 1_000_000).toFixed(2),
    omzet_jt: +(r.omzet / 1_000_000).toFixed(2),
    cac: r.cac_total,
  })), [harian]);

  return (
    <div className="space-y-5">
      {/* Cost KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <CostKpiCard label="Total Biaya Iklan" value={fR(s.total_biaya_iklan)} icon="📣" />
        <CostKpiCard label="Total Komisi Affiliate" value={fR(s.total_komisi_aff)} icon="🤝" />
        <CostKpiCard label="Total Cost" value={fR(s.total_cost)} icon="💸" />
        <CostKpiCard label="ROAS" value={`${s.roas.toFixed(1)}x`} icon="📈" highlight={s.roas >= 3} />
        <CostKpiCard label="Cost/Closing" value={fR(s.cost_per_closing)} icon="🏷️" />
        <CostKpiCard label="Margin Setelah Biaya" value={`${s.margin_after_cost}%`} icon="💰" highlight={s.margin_after_cost > 50} />
      </div>

      {/* Cost vs Omzet Chart */}
      <div className="bg-white rounded-2xl border p-5">
        <h3 className="text-sm font-semibold mb-3">📊 Biaya vs Omzet Harian</h3>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={costData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="tgl" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} unit=" Jt" />
            <Tooltip content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0]?.payload;
              return (
                <div className="bg-white border rounded-xl shadow-lg p-3 text-xs space-y-1">
                  <div className="font-bold">{d.tgl}</div>
                  <div>💰 Omzet: <strong>Rp{d.omzet_jt}Jt</strong></div>
                  <div>📣 Iklan: <strong>Rp{d.iklan_jt}Jt</strong></div>
                  <div>🤝 Affiliate: <strong>Rp{d.aff_jt}Jt</strong></div>
                  <div>💸 CAC: <strong>{d.cac.toFixed(1)}%</strong></div>
                </div>
              );
            }} />
            <Legend />
            <Bar dataKey="iklan_jt" name="Biaya Iklan" fill="#f97316" radius={[3, 3, 0, 0]} stackId="cost" />
            <Bar dataKey="aff_jt" name="Komisi Affiliate" fill="#8b5cf6" radius={[3, 3, 0, 0]} stackId="cost" />
            <Line type="monotone" dataKey="omzet_jt" name="Omzet" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* ROAS Trend */}
      <div className="bg-white rounded-2xl border p-5">
        <h3 className="text-sm font-semibold mb-3">📈 Tren ROAS Harian</h3>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={harian.map((r) => ({
            tgl: r.tanggal,
            roas: r.biaya_iklan > 0 ? +(r.omzet / r.biaya_iklan).toFixed(2) : 0,
          }))}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="tgl" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} unit="x" />
            <Tooltip formatter={(v) => `${v}x`} />
            <ReferenceLine y={3} stroke="#10b981" strokeDasharray="6 3" label={{ value: "Target 3x", fontSize: 10, fill: "#10b981" }} />
            <Area type="monotone" dataKey="roas" name="ROAS" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
function CostKpiCard({ label, value, icon, highlight }: { label: string; value: string; icon: string; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${highlight ? "bg-green-50 border-green-200" : "bg-white"}`}>
      <div className="text-lg">{icon}</div>
      <div className="text-xs text-gray-400 mt-1">{label}</div>
      <div className="text-base font-bold text-gray-900 mt-0.5">{value}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// CHANNELS TAB
// ═══════════════════════════════════════════════════════════
const CH_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  shop: { label: "Shop", icon: <ShoppingBag size={16} />, color: "#3b82f6" },
  video: { label: "Video", icon: <Video size={16} />, color: "#8b5cf6" },
  live: { label: "Live", icon: <Radio size={16} />, color: "#ef4444" },
  shop_tab: { label: "Shop Tab", icon: <Store size={16} />, color: "#10b981" },
  affiliate: { label: "Affiliate", icon: <Users size={16} />, color: "#f97316" },
};

function ChannelsTab({ channels, channelData }: { channels: Record<string, ChannelSummary>; channelData: { video: ChannelRow[]; live: ChannelRow[]; shop_tab: ChannelRow[]; affiliate: ChannelRow[] } }) {
  const totalAll = Object.values(channels).reduce((s, c) => s + c.total_omzet, 0);
  const barData = Object.entries(channels).map(([k, c]) => ({
    channel: CH_META[k]?.label || k,
    omzet_jt: +(c.total_omzet / 1_000_000).toFixed(2),
    closing: c.total_closing,
    fill: CH_META[k]?.color || "#94a3b8",
  }));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {Object.entries(channels).map(([k, c]) => {
          const meta = CH_META[k];
          const pct = totalAll > 0 ? ((c.total_omzet / totalAll) * 100).toFixed(1) : "0";
          return (
            <div key={k} className="bg-white rounded-2xl border p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg" style={{ backgroundColor: meta.color + "15", color: meta.color }}>{meta.icon}</div>
                <span className="text-sm font-semibold text-gray-700">{meta.label}</span>
              </div>
              <div className="text-lg font-bold text-gray-900">{fR(c.total_omzet)}</div>
              <div className="text-[10px] text-gray-400 mb-2">{pct}% · {c.hari} hari</div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                <div><span className="text-gray-400">Closing</span> <strong>{fN(c.total_closing)}</strong></div>
                <div><span className="text-gray-400">Botol</span> <strong>{fN(c.total_botol)}</strong></div>
                <div><span className="text-gray-400">Upsell</span> <strong>{c.rata_upsell.toFixed(2)}x</strong></div>
                <div><span className="text-gray-400">CAC</span> <strong>{c.rata_cac.toFixed(1)}%</strong></div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl border p-5">
        <h3 className="text-sm font-semibold mb-3">Perbandingan Omzet Per Channel</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={barData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="channel" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 10 }} unit=" Jt" />
            <Tooltip formatter={(v) => `Rp${v}Jt`} />
            <Bar dataKey="omzet_jt" name="Omzet" radius={[6, 6, 0, 0]}>
              {barData.map((d, i) => <Cell key={i} fill={d.fill} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {(["video", "live", "shop_tab", "affiliate"] as const).map((k) => {
        const rows = channelData[k];
        if (!rows?.length) return null;
        const meta = CH_META[k];
        return (
          <div key={k} className="bg-white rounded-2xl border p-5">
            <h3 className="text-sm font-semibold mb-2" style={{ color: meta.color }}>{meta.label} — Harian</h3>
            <div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="border-b bg-gray-50 text-left">
              <th className="p-2">Tgl</th><th className="p-2 text-right">Omzet</th><th className="p-2 text-right">Closing</th><th className="p-2 text-right">Botol</th><th className="p-2 text-right">Upsell</th><th className="p-2 text-right">CAC</th>
            </tr></thead><tbody>
              {[...rows].reverse().map((r, i) => (
                <tr key={i} className="border-b hover:bg-gray-50">
                  <td className="p-2 font-medium">{r.tanggal}</td><td className="p-2 text-right">{fR(r.omzet)}</td><td className="p-2 text-right">{fN(r.closing)}</td>
                  <td className="p-2 text-right">{fN(r.botol)}</td><td className="p-2 text-right">{r.upsell.toFixed(2)}x</td><td className="p-2 text-right">{r.cac_total.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody></table></div>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// WEEKLY TAB
// ═══════════════════════════════════════════════════════════
function WeeklyTab({ weekly, s, target, harian }: { weekly: WeeklyRow[]; s: Summary; target: number; harian: HarianRow[] }) {
  const weeklyTarget = target / 4;
  const sisaHari = Math.max(1, 30 - s.hari);
  const sisaTarget = Math.max(0, target - s.total_omzet);
  const projected = s.avg_omzet_harian * 30;

  function evaluate(w: WeeklyRow): { notes: string[]; grade: string } {
    const notes: string[] = [];
    const pctT = (w.total_omzet / weeklyTarget) * 100;
    if (pctT >= 100) { notes.push(`✅ Target tercapai (${pctT.toFixed(0)}%)`); }
    else if (pctT >= 80) { notes.push(`🟡 Hampir target (${pctT.toFixed(0)}%)`); }
    else { notes.push(`🔴 Di bawah target (${pctT.toFixed(0)}%)`); }

    if (w.rata_upsell >= 1.3) notes.push("✅ Upsell bagus");
    else if (w.rata_upsell >= 1.1) notes.push("🟡 Upsell perlu ditingkatkan");
    else notes.push("🔴 Upsell kritis — push bundling");

    if (w.rata_cac <= 50) notes.push("✅ CAC efisien");
    else if (w.rata_cac <= 60) notes.push("🟡 CAC normal");
    else notes.push("🔴 CAC tinggi — kurangi spending");

    if (w.wow_omzet > 10) notes.push(`📈 Omzet naik ${w.wow_omzet}% vs minggu lalu`);
    else if (w.wow_omzet < -10) notes.push(`📉 Omzet turun ${Math.abs(w.wow_omzet)}% vs minggu lalu`);

    const grade = pctT >= 100 && w.rata_upsell >= 1.3 && w.rata_cac <= 50 ? "A"
      : pctT >= 80 && w.rata_upsell >= 1.1 && w.rata_cac <= 60 ? "B"
      : pctT >= 60 ? "C" : "D";
    return { notes, grade };
  }
  const gradeColors: Record<string, string> = { A: "bg-green-100 text-green-700", B: "bg-blue-100 text-blue-700", C: "bg-yellow-100 text-yellow-700", D: "bg-red-100 text-red-700" };

  return (
    <div className="space-y-5">
      {/* Proyeksi */}
      <div className="bg-white rounded-2xl border p-5">
        <h3 className="text-sm font-semibold mb-3">🎯 Proyeksi & Target Bulanan</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-blue-50 rounded-xl p-4 text-center">
            <div className="text-xs text-gray-500">Target Bulan</div>
            <div className="text-xl font-bold text-blue-700">{fR(target)}</div>
          </div>
          <div className="bg-green-50 rounded-xl p-4 text-center">
            <div className="text-xs text-gray-500">Tercapai ({s.hari} hari)</div>
            <div className="text-xl font-bold text-green-700">{fR(s.total_omzet)}</div>
            <div className="text-xs text-gray-400">{((s.total_omzet / target) * 100).toFixed(1)}%</div>
          </div>
          <div className="bg-orange-50 rounded-xl p-4 text-center">
            <div className="text-xs text-gray-500">Sisa Target</div>
            <div className="text-xl font-bold text-orange-700">{fR(sisaTarget)}</div>
            <div className="text-xs text-gray-400">~{fR(Math.round(sisaTarget / sisaHari))}/hari × {sisaHari} hari</div>
          </div>
          <div className={`rounded-xl p-4 text-center ${projected >= target ? "bg-green-50" : "bg-red-50"}`}>
            <div className="text-xs text-gray-500">Proyeksi Akhir Bulan</div>
            <div className={`text-xl font-bold ${projected >= target ? "text-green-700" : "text-red-700"}`}>{fR(Math.round(projected))}</div>
            <div className="text-xs text-gray-400">{projected >= target ? "✅ On Track" : "⚠️ Below Target"}</div>
          </div>
        </div>
      </div>

      {/* Weekly Chart */}
      <div className="bg-white rounded-2xl border p-5">
        <h3 className="text-sm font-semibold mb-3">Omzet Per Minggu</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={weekly.map((w) => ({ ...w, omzet_jt: +(w.total_omzet / 1e6).toFixed(2), target_jt: +(weeklyTarget / 1e6).toFixed(2) }))}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 10 }} unit=" Jt" />
            <Tooltip formatter={(v) => `Rp${v}Jt`} />
            <ReferenceLine y={+(weeklyTarget / 1e6).toFixed(0)} stroke="#ef4444" strokeDasharray="6 3" label={{ value: "Target", fontSize: 10, fill: "#ef4444" }} />
            <Bar dataKey="omzet_jt" name="Omzet" fill="#3b82f6" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Weekly Cards */}
      {weekly.map((w, i) => {
        const { notes, grade } = evaluate(w);
        return (
          <div key={i} className="bg-white rounded-2xl border p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-gray-900">{w.label}</h3>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${gradeColors[grade]}`}>Grade {grade}</span>
                {w.wow_omzet !== 0 && (
                  <span className={`text-xs flex items-center gap-0.5 ${w.wow_omzet > 0 ? "text-green-600" : "text-red-600"}`}>
                    {w.wow_omzet > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    {w.wow_omzet > 0 ? "+" : ""}{w.wow_omzet}% WoW
                  </span>
                )}
              </div>
              <span className="text-xs text-gray-400">{w.hari} hari</span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 text-center text-xs mb-3">
              <div><div className="text-gray-400">Omzet</div><div className="font-bold text-blue-700">{fR(w.total_omzet)}</div></div>
              <div><div className="text-gray-400">Closing</div><div className="font-bold">{fN(w.total_closing)}</div></div>
              <div><div className="text-gray-400">Botol</div><div className="font-bold">{fN(w.total_botol)}</div></div>
              <div><div className="text-gray-400">Avg/Hari</div><div className="font-bold">{fR(w.rata_omzet_harian)}</div></div>
              <div><div className="text-gray-400">Upsell</div><div className="font-bold">{w.rata_upsell.toFixed(2)}x</div></div>
              <div><div className="text-gray-400">CAC</div><div className="font-bold">{w.rata_cac.toFixed(1)}%</div></div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 space-y-1">
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Evaluasi Otomatis</div>
              {notes.map((n, ni) => <div key={ni} className="text-xs">{n}</div>)}
            </div>
          </div>
        );
      })}

      {/* Daily Evaluation Table */}
      <DailyEvalTable harian={harian} avgTarget={target / 30} />
    </div>
  );
}

function DailyEvalTable({ harian, avgTarget }: { harian: HarianRow[]; avgTarget: number }) {
  const rows = useMemo(() => [...harian].reverse().map((r) => {
    let score = 0;
    if (r.omzet >= avgTarget) score += 40; else score += (r.omzet / avgTarget) * 40;
    if (r.upsell >= 1.3) score += 25; else if (r.upsell >= 1.1) score += 15; else score += 5;
    if (r.cac_total <= 50) score += 20; else if (r.cac_total <= 60) score += 10; else score += 0;
    score += Math.min(15, (r.closing / 100) * 15);
    score = Math.round(Math.min(100, score));
    const grade = score >= 80 ? "A" : score >= 60 ? "B" : score >= 40 ? "C" : "D";
    return { ...r, score, grade };
  }), [harian, avgTarget]);

  const gradeStyle: Record<string, string> = { A: "bg-green-100 text-green-700", B: "bg-blue-100 text-blue-700", C: "bg-yellow-100 text-yellow-700", D: "bg-red-100 text-red-700" };
  const omzCol = (v: number) => v >= avgTarget ? "text-green-700 font-bold" : v >= avgTarget * 0.7 ? "text-yellow-700" : "text-red-600";

  return (
    <div className="bg-white rounded-2xl border p-5">
      <h3 className="text-sm font-semibold mb-3">📋 Evaluasi Harian Detail</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead><tr className="border-b bg-gray-50 text-left">
            <th className="p-2">Tgl</th><th className="p-2 text-right">Omzet</th><th className="p-2 text-right">Closing</th><th className="p-2 text-right">Botol</th>
            <th className="p-2 text-right">Upsell</th><th className="p-2 text-right">CAC</th><th className="p-2 text-center">Score</th><th className="p-2 text-center">Grade</th>
          </tr></thead>
          <tbody>{rows.map((r, i) => (
            <tr key={i} className={`border-b hover:bg-gray-50 ${r.grade === "A" ? "bg-green-50/50" : r.grade === "D" ? "bg-red-50/30" : ""}`}>
              <td className="p-2 font-medium">{r.tanggal}</td>
              <td className={`p-2 text-right ${omzCol(r.omzet)}`}>{fR(r.omzet)}</td>
              <td className="p-2 text-right">{fN(r.closing)}</td>
              <td className="p-2 text-right">{fN(r.botol)}</td>
              <td className={`p-2 text-right ${r.upsell >= 1.3 ? "text-green-700 font-bold" : r.upsell >= 1.1 ? "text-yellow-700" : "text-red-600"}`}>{r.upsell.toFixed(2)}x</td>
              <td className={`p-2 text-right ${r.cac_total <= 50 ? "text-green-700 font-bold" : r.cac_total <= 60 ? "text-yellow-700" : "text-red-600"}`}>{r.cac_total.toFixed(1)}%</td>
              <td className="p-2 text-center font-bold">{r.score}</td>
              <td className="p-2 text-center"><span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${gradeStyle[r.grade]}`}>{r.grade}</span></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// CHARTS (shared)
// ═══════════════════════════════════════════════════════════
function OmzetBotolChart({ harian, avgTarget }: { harian: HarianRow[]; avgTarget: number }) {
  const chartData = useMemo(() => {
    const maxOmzet = Math.max(...harian.map((r) => r.omzet));
    return harian.map((r) => ({
      tgl: r.tanggal, omzet_jt: +(r.omzet / 1e6).toFixed(2), botol: r.botol,
      closing: r.closing, upsell: r.upsell, cac: r.cac_total, isBest: r.omzet === maxOmzet,
    }));
  }, [harian]);

  return (
    <div className="bg-white rounded-2xl border p-5">
      <h3 className="text-sm font-semibold mb-3">Omzet & Botol Harian</h3>
      <ResponsiveContainer width="100%" height={300}>
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
                <div className="font-bold">{d.tgl}</div>
                <div>💰 Rp{d.omzet_jt}Jt {d.isBest ? "⭐" : ""}</div>
                <div>📦 {d.botol} botol · 🏷️ {d.closing} closing</div>
                <div>📈 {d.upsell?.toFixed(2)}x · 💸 {d.cac?.toFixed(1)}%</div>
              </div>
            );
          }} />
          <Legend />
          <ReferenceLine yAxisId="left" y={+(avgTarget / 1e6).toFixed(1)} stroke="#10b981" strokeDasharray="6 3" label={{ value: "Target/hari", fontSize: 9, fill: "#10b981" }} />
          <Bar yAxisId="left" dataKey="omzet_jt" name="Omzet (Jt)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          <Line yAxisId="right" type="monotone" dataKey="botol" name="Botol" stroke="#10b981" strokeWidth={2} dot={{ r: 2.5 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

const BRAND_COLORS: Record<string, string> = { FreshVision: "#3b82f6", Etawaku: "#10b981", Freshmag: "#f97316", Nutriflakes: "#8b5cf6" };
function BrandDonutChart({ evaluasi }: { evaluasi: EvaluasiPerBrand }) {
  const pieData = useMemo(() => [
    { name: "FreshVision", value: evaluasi.freshvision },
    { name: "Etawaku", value: evaluasi.etawaku },
    { name: "Freshmag", value: evaluasi.freshmag },
    { name: "Nutriflakes", value: evaluasi.nutriflakes },
  ].filter((d) => d.value > 0), [evaluasi]);

  return (
    <div className="bg-white rounded-2xl border p-5">
      <h3 className="text-sm font-semibold mb-3">Kontribusi Per Brand</h3>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie data={pieData} cx="50%" cy="50%" innerRadius={65} outerRadius={100} paddingAngle={3} dataKey="value"
            label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(1)}%`}>
            {pieData.map((e) => <Cell key={e.name} fill={BRAND_COLORS[e.name] || "#94a3b8"} />)}
          </Pie>
          <Tooltip formatter={(v) => fR(Number(v))} />
        </PieChart>
      </ResponsiveContainer>
      <div className="text-center -mt-3 mb-2">
        <div className="text-[10px] text-gray-400">Total</div>
        <div className="text-base font-bold">{fR(evaluasi.total)}</div>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        {pieData.map((d) => (
          <div key={d.name} className="flex items-center gap-1 text-xs">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: BRAND_COLORS[d.name] }} />
            <span className="text-gray-500">{d.name}</span> <strong>{fR(d.value)}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function UpsellCacChart({ harian }: { harian: HarianRow[] }) {
  const data = useMemo(() => harian.map((r) => ({ tgl: r.tanggal, upsell: +r.upsell.toFixed(2), cac: +r.cac_total.toFixed(1) })), [harian]);
  return (
    <div className="bg-white rounded-2xl border p-5">
      <h3 className="text-sm font-semibold mb-3">Tren Upsell & CAC</h3>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="tgl" tick={{ fontSize: 10 }} />
          <YAxis yAxisId="left" tick={{ fontSize: 10 }} domain={[0, "auto"]} unit="x" />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} unit="%" />
          <Tooltip content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0]?.payload;
            return <div className="bg-white border rounded-xl shadow-lg p-3 text-xs space-y-1"><div className="font-bold">{d.tgl}</div><div>📈 {d.upsell}x · 💸 {d.cac}%</div></div>;
          }} />
          <Legend />
          <ReferenceLine yAxisId="left" y={1.3} stroke="#10b981" strokeDasharray="6 3" label={{ value: "1.3x", fontSize: 9, fill: "#10b981" }} />
          <ReferenceLine yAxisId="right" y={60} stroke="#ef4444" strokeDasharray="6 3" label={{ value: "60%", fontSize: 9, fill: "#ef4444" }} />
          <Line yAxisId="left" type="monotone" dataKey="upsell" name="Upsell" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2.5 }} />
          <Line yAxisId="right" type="monotone" dataKey="cac" name="CAC" stroke="#ef4444" strokeWidth={2} dot={{ r: 2.5 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function HarianTable({ harian, s }: { harian: HarianRow[]; s: Summary }) {
  const sorted = useMemo(() => {
    const avgO = s.avg_omzet_harian;
    const top3 = [...harian].sort((a, b) => b.omzet - a.omzet).slice(0, 3).map((r) => r.tanggal);
    return [...harian].reverse().map((r) => ({
      ...r,
      status: top3.includes(r.tanggal) ? "⭐" : r.omzet >= avgO ? "✅" : "⚠️",
    }));
  }, [harian, s]);

  return (
    <div className="bg-white rounded-2xl border p-5">
      <h3 className="text-sm font-semibold mb-3">Tabel Harian (Shop)</h3>
      <div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="border-b bg-gray-50 text-left">
        <th className="p-2">Tgl</th><th className="p-2 text-right">Closing</th><th className="p-2 text-right">Botol</th>
        <th className="p-2 text-right">Omzet</th><th className="p-2 text-right">Upsell</th><th className="p-2 text-right">CAC</th>
        <th className="p-2 text-right">Kontribusi</th><th className="p-2 text-center">Status</th>
      </tr></thead><tbody>
        {sorted.map((r, i) => (
          <tr key={i} className={`border-b hover:bg-gray-50 ${r.status === "⭐" ? "bg-yellow-50/60" : ""}`}>
            <td className="p-2 font-medium">{r.tanggal}</td>
            <td className="p-2 text-right">{fN(r.closing)}</td>
            <td className="p-2 text-right">{fN(r.botol)}</td>
            <td className={`p-2 text-right ${r.omzet >= 15e6 ? "text-green-700 font-bold" : r.omzet >= 10e6 ? "text-yellow-700" : "text-red-600"}`}>{fR(r.omzet)}</td>
            <td className={`p-2 text-right ${r.upsell >= 1.3 ? "text-green-700 font-bold" : r.upsell >= 1.1 ? "text-yellow-700" : "text-red-600"}`}>{r.upsell.toFixed(2)}x</td>
            <td className={`p-2 text-right ${r.cac_total <= 50 ? "text-green-700 font-bold" : r.cac_total <= 60 ? "text-yellow-700" : "text-red-600"}`}>{r.cac_total.toFixed(1)}%</td>
            <td className="p-2 text-right">{r.pct_kontribusi_fv.toFixed(1)}%</td>
            <td className="p-2 text-center">{r.status}</td>
          </tr>
        ))}
      </tbody>
      <tfoot className="sticky bottom-0"><tr className="bg-blue-50 border-t-2 border-blue-200 font-bold">
        <td className="p-2">TOTAL</td><td className="p-2 text-right">{fN(s.total_closing)}</td><td className="p-2 text-right">{fN(s.total_botol)}</td>
        <td className="p-2 text-right text-blue-700">{fR(s.total_omzet)}</td><td className="p-2 text-right">{s.rata_upsell.toFixed(2)}x</td>
        <td className="p-2 text-right">{s.rata_cac.toFixed(1)}%</td><td className="p-2 text-right">{s.pct_kontribusi_fv}%</td><td className="p-2 text-center">—</td>
      </tr></tfoot></table></div>
    </div>
  );
}
