"use client";
import { useState, useMemo } from "react";
import { useStoreManager } from "@/store/useStoreManager";
import { formatRupiah, formatNum, fmtDec, combineOverviewData, combineVideoData } from "@/utils/gmvAnalyzer";
import type { Store, BusinessOverviewData, VideoPerformanceData, CombinedStoreData, VideoPerformanceItem } from "@/lib/types";
import AddStoreModal from "@/components/AddStoreModal";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area,
} from "recharts";
import { GitCompareArrows, Plus, AlertTriangle } from "lucide-react";

// ═══════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════
type SubTab = "compare" | "combined" | "trend";

function abbr(v: number): string {
  if (v >= 1e9) return fmtDec(v / 1e9, 1) + "M";
  if (v >= 1e6) return fmtDec(v / 1e6, 1) + "Jt";
  if (v >= 1e3) return fmtDec(v / 1e3, 1) + "Rb";
  return formatNum(v);
}

function pct(a: number, b: number): string {
  if (b === 0) return a > 0 ? "+100%" : "0%";
  const d = ((a - b) / Math.abs(b)) * 100;
  return `${d >= 0 ? "+" : ""}${fmtDec(d, 1)}%`;
}

function norm(v: number, max: number) { return max > 0 ? Math.min((v / max) * 100, 100) : 0; }

function getOverlappingMonths(storeA: Store, storeB: Store): string[] {
  const aMonths = new Set(storeA.overviewData.map(d => d.period.month));
  const bMonths = new Set(storeB.overviewData.map(d => d.period.month));
  return [...aMonths].filter(m => bMonths.has(m)).sort();
}

function getOvForMonth(store: Store, month: string): BusinessOverviewData | undefined {
  return store.overviewData.find(d => d.period.month === month);
}
function getVidForMonth(store: Store, month: string): VideoPerformanceData | undefined {
  return store.videoData.find(d => d.periodRaw === month || d.period === month);
}

function storeInfo(s: Store) { return { id: s.id, name: s.name, color: s.color }; }

// ═══════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════
export default function CompareGabunganScreen() {
  const { stores } = useStoreManager();
  const [storeAId, setStoreAId] = useState(stores[0]?.id || "");
  const [storeBId, setStoreBId] = useState(stores[1]?.id || "");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [activeTab, setActiveTab] = useState<SubTab>("compare");
  const [showAddModal, setShowAddModal] = useState(false);

  const storeA = stores.find(s => s.id === storeAId) || null;
  const storeB = stores.find(s => s.id === storeBId) || null;

  const overlappingMonths = useMemo(() => {
    if (!storeA || !storeB) return [];
    return getOverlappingMonths(storeA, storeB);
  }, [storeA, storeB]);

  // Auto-select first overlapping month
  const month = overlappingMonths.includes(selectedMonth) ? selectedMonth : overlappingMonths[0] || "";

  const ovA = storeA && month ? getOvForMonth(storeA, month) : undefined;
  const ovB = storeB && month ? getOvForMonth(storeB, month) : undefined;
  const vidA = storeA && month ? getVidForMonth(storeA, month) : undefined;
  const vidB = storeB && month ? getVidForMonth(storeB, month) : undefined;

  const ready = !!(storeA && storeB && storeAId !== storeBId && month && (ovA || vidA) && (ovB || vidB));

  // ─── EMPTY STATES ───
  if (stores.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <GitCompareArrows size={48} className="text-gray-300 mb-4" />
        <h2 className="text-xl font-bold mb-2">Kamu baru punya {stores.length} toko</h2>
        <p className="text-gray-500 text-sm max-w-md mb-6">Tambahkan toko kedua untuk menggunakan fitur Compare &amp; Gabungan.</p>
        <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 transition-colors">
          <Plus size={16} /> Tambah Toko Kedua
        </button>
        {showAddModal && <AddStoreModal onClose={() => setShowAddModal(false)} />}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <GitCompareArrows size={24} className="text-purple-600" /> Compare &amp; Gabungan
      </h1>

      {/* ─── HEADER SELECTOR ─── */}
      <div className="bg-white rounded-xl border p-4 flex flex-wrap items-center gap-3">
        <select value={storeAId} onChange={e => { setStoreAId(e.target.value); setSelectedMonth(""); }} className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-[140px]">
          <option value="">Pilih Toko A</option>
          {stores.map(s => <option key={s.id} value={s.id}>{s.avatar} {s.name}</option>)}
        </select>
        <span className="font-bold text-gray-400 text-lg">⚖️ VS</span>
        <select value={storeBId} onChange={e => { setStoreBId(e.target.value); setSelectedMonth(""); }} className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-[140px]">
          <option value="">Pilih Toko B</option>
          {stores.map(s => <option key={s.id} value={s.id}>{s.avatar} {s.name}</option>)}
        </select>
        <select value={month} onChange={e => setSelectedMonth(e.target.value)} className="border rounded-lg px-3 py-2 text-sm min-w-[140px]" disabled={overlappingMonths.length === 0}>
          {overlappingMonths.length === 0 ? <option>Tidak ada bulan sama</option> : overlappingMonths.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {storeAId === storeBId && storeAId && (
        <p className="text-sm text-red-500 bg-red-50 rounded-lg p-3">⚠️ Pilih 2 toko yang berbeda.</p>
      )}

      {storeA && storeB && storeAId !== storeBId && overlappingMonths.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm">
          <div className="flex items-center gap-2 font-semibold text-yellow-800 mb-2"><AlertTriangle size={16} /> Tidak ada bulan yang sama di kedua toko</div>
          <p className="text-yellow-700">Upload data bulan yang sama untuk membandingkan.</p>
          <p className="text-yellow-600 mt-1">Toko A: {storeA.overviewData.map(d => d.period.month).join(", ") || "belum ada data"}</p>
          <p className="text-yellow-600">Toko B: {storeB.overviewData.map(d => d.period.month).join(", ") || "belum ada data"}</p>
        </div>
      )}

      {!ready && storeA && storeB && overlappingMonths.length > 0 && (
        <div className="flex flex-col items-center py-16 text-center text-gray-400">
          <p>Pilih 2 toko dan bulan di atas untuk mulai membandingkan.</p>
        </div>
      )}

      {/* ─── TAB NAV ─── */}
      {ready && (
        <>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {([["compare", "⚖️ Perbandingan"], ["combined", "🔗 Gabungan"], ["trend", "📅 Tren Bulanan"]] as [SubTab, string][]).map(([k, l]) => (
              <button key={k} onClick={() => setActiveTab(k)} className={`flex-1 py-2 px-3 rounded-md text-sm font-semibold transition-colors ${activeTab === k ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>{l}</button>
            ))}
          </div>

          {activeTab === "compare" && <TabCompare storeA={storeA!} storeB={storeB!} ovA={ovA} ovB={ovB} vidA={vidA} vidB={vidB} month={month} />}
          {activeTab === "combined" && <TabCombined storeA={storeA!} storeB={storeB!} ovA={ovA} ovB={ovB} vidA={vidA} vidB={vidB} month={month} />}
          {activeTab === "trend" && <TabTrend storeA={storeA!} storeB={storeB!} />}
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════
// TAB 1: PERBANDINGAN
// ═══════════════════════════════════════
interface TabProps { storeA: Store; storeB: Store; ovA?: BusinessOverviewData; ovB?: BusinessOverviewData; vidA?: VideoPerformanceData; vidB?: VideoPerformanceData; month: string; }

function TabCompare({ storeA, storeB, ovA, ovB, vidA, vidB, month }: TabProps) {
  const sA = ovA?.summary;
  const sB = ovB?.summary;
  const vA = vidA?.summary;
  const vB = vidB?.summary;

  type Row = { label: string; icon: string; a: number; b: number; fmt: (v: number) => string; invertWin?: boolean };
  const rows: Row[] = [];
  if (sA && sB) {
    rows.push(
      { label: "GMV Total", icon: "💰", a: sA.gmv, b: sB.gmv, fmt: v => formatRupiah(v) },
      { label: "Total Pesanan", icon: "📦", a: sA.orders, b: sB.orders, fmt: v => formatNum(v) },
      { label: "Pembeli Unik", icon: "👥", a: sA.uniqueBuyers, b: sB.uniqueBuyers, fmt: v => formatNum(v) },
      { label: "Tayangan", icon: "👁️", a: sA.pageViews, b: sB.pageViews, fmt: v => formatNum(v) },
      { label: "Kunjungan Toko", icon: "🏪", a: sA.shopVisits, b: sB.shopVisits, fmt: v => formatNum(v) },
      { label: "Konversi%", icon: "📈", a: sA.conversionRate, b: sB.conversionRate, fmt: v => fmtDec(v, 2) + "%" },
      { label: "Refund", icon: "💸", a: sA.refund, b: sB.refund, fmt: v => formatRupiah(v), invertWin: true },
    );
  }
  if (vA && vB) {
    rows.push(
      { label: "GMV Video", icon: "🎬", a: vA.totalGMV, b: vB.totalGMV, fmt: v => formatRupiah(v) },
      { label: "Total Video", icon: "📹", a: vA.totalVideos, b: vB.totalVideos, fmt: v => formatNum(v) },
      { label: "Total Views", icon: "👁️", a: vA.totalVV, b: vB.totalVV, fmt: v => formatNum(v) },
      { label: "Avg GPM", icon: "🎯", a: vA.avgGPM, b: vB.avgGPM, fmt: v => formatRupiah(Math.round(v)) },
      { label: "Avg CTR%", icon: "📊", a: vA.avgCTR, b: vB.avgCTR, fmt: v => fmtDec(v, 2) + "%" },
      { label: "Avg CTOR%", icon: "🛒", a: vA.avgCTOR, b: vB.avgCTOR, fmt: v => fmtDec(v, 2) + "%" },
      { label: "Avg Watch Rate%", icon: "⏱️", a: vA.avgWatchRate, b: vB.avgWatchRate, fmt: v => fmtDec(v, 2) + "%" },
    );
  }

  const winner = (r: Row) => {
    if (r.a === r.b) return "tie";
    return r.invertWin ? (r.a < r.b ? "A" : "B") : (r.a > r.b ? "A" : "B");
  };

  // Radar data
  const radarData = useMemo(() => {
    const m = (a: number | undefined, b: number | undefined, label: string) => {
      const va = a || 0, vb = b || 0;
      const mx = Math.max(va, vb, 1);
      return { metric: label, A: norm(va, mx), B: norm(vb, mx), rawA: va, rawB: vb };
    };
    return [
      m(sA?.gmv, sB?.gmv, "GMV"),
      m(sA?.conversionRate, sB?.conversionRate, "Konversi"),
      m(vA?.avgGPM, vB?.avgGPM, "GPM"),
      m(vA?.avgCTR, vB?.avgCTR, "CTR"),
      m(vA?.avgWatchRate, vB?.avgWatchRate, "Watch Rate"),
      m(sA?.orders, sB?.orders, "Pesanan"),
    ];
  }, [sA, sB, vA, vB]);

  // Bar chart data
  const barData = useMemo(() => {
    const d: { name: string; A: number; B: number }[] = [];
    if (sA && sB) {
      d.push({ name: "GMV(Jt)", A: sA.gmv / 1e6, B: sB.gmv / 1e6 });
      d.push({ name: "Pesanan", A: sA.orders, B: sB.orders });
      d.push({ name: "Konversi%", A: sA.conversionRate, B: sB.conversionRate });
    }
    if (vA && vB) {
      d.push({ name: "GPM(Rb)", A: vA.avgGPM / 1000, B: vB.avgGPM / 1000 });
      d.push({ name: "CTR%", A: vA.avgCTR, B: vB.avgCTR });
      d.push({ name: "CTOR%", A: vA.avgCTOR, B: vB.avgCTOR });
      d.push({ name: "Watch%", A: vA.avgWatchRate, B: vB.avgWatchRate });
    }
    return d;
  }, [sA, sB, vA, vB]);

  return (
    <div className="space-y-6">
      {/* SECTION A: KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {rows.map(r => {
          const w = winner(r);
          return (
            <div key={r.label} className="bg-white rounded-xl border-2 p-4 relative" style={{ borderColor: w === "A" ? storeA.color : w === "B" ? storeB.color : "#E5E7EB" }}>
              {w !== "tie" && <span className="absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: w === "A" ? storeA.color : storeB.color }}>MENANG</span>}
              <p className="text-[10px] text-gray-400 font-semibold text-center mb-2">{r.icon} {r.label}</p>
              <div className="flex justify-between items-end gap-2">
                <div className="text-center flex-1">
                  <p className="text-xs font-bold" style={{ color: storeA.color }}>{r.fmt(r.a)}</p>
                  <p className="text-[9px] text-gray-400">{storeA.avatar}</p>
                </div>
                <div className="text-center flex-1">
                  <p className="text-xs font-bold" style={{ color: storeB.color }}>{r.fmt(r.b)}</p>
                  <p className="text-[9px] text-gray-400">{storeB.avatar}</p>
                </div>
              </div>
              <p className="text-[9px] text-gray-400 text-center mt-1">
                {w === "tie" ? "Sama" : `${w === "A" ? storeA.name : storeB.name} lebih tinggi ${pct(w === "A" ? r.a : r.b, w === "A" ? r.b : r.a)}`}
              </p>
            </div>
          );
        })}
      </div>

      {/* SECTION B: Radar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border p-6">
          <h3 className="font-semibold text-sm mb-4">Radar Perbandingan</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
              <Radar name={storeA.name} dataKey="A" stroke={storeA.color} fill={storeA.color} fillOpacity={0.4} strokeWidth={2} />
              <Radar name={storeB.name} dataKey="B" stroke={storeB.color} fill={storeB.color} fillOpacity={0.4} strokeWidth={2} />
              <Legend />
              <Tooltip formatter={((v: number, _n: string, p: any) => { const raw = p.payload[`raw${p.dataKey}`]; return raw !== undefined ? formatNum(Math.round(raw)) : fmtDec(v, 1); }) as any} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* SECTION C: Grouped Bar */}
        <div className="bg-white rounded-xl border p-6">
          <h3 className="font-semibold text-sm mb-4">Metrik Utama</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="A" name={storeA.name} fill={storeA.color} radius={[4, 4, 0, 0]} label={{ position: "top", fontSize: 9, formatter: ((v: number) => abbr(v)) as any }} />
              <Bar dataKey="B" name={storeB.name} fill={storeB.color} radius={[4, 4, 0, 0]} label={{ position: "top", fontSize: 9, formatter: ((v: number) => abbr(v)) as any }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* SECTION D: Full Table */}
      <div className="bg-white rounded-xl border p-6">
        <h3 className="font-semibold text-sm mb-4">Tabel Perbandingan Lengkap — {month}</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-3">Metrik</th>
                <th className="text-right p-3" style={{ color: storeA.color }}>{storeA.avatar} {storeA.name}</th>
                <th className="text-right p-3" style={{ color: storeB.color }}>{storeB.avatar} {storeB.name}</th>
                <th className="text-right p-3">Selisih</th>
                <th className="text-center p-3">Menang</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => { const w = winner(r); return (
                <tr key={r.label} className={`border-b ${i % 2 ? "bg-gray-50/50" : ""}`}>
                  <td className="p-3 font-medium">{r.icon} {r.label}</td>
                  <td className={`p-3 text-right ${w === "A" ? "font-bold" : ""}`} style={w === "A" ? { color: storeA.color } : {}}>{r.fmt(r.a)}</td>
                  <td className={`p-3 text-right ${w === "B" ? "font-bold" : ""}`} style={w === "B" ? { color: storeB.color } : {}}>{r.fmt(r.b)}</td>
                  <td className="p-3 text-right text-gray-500">{pct(r.a, r.b)}</td>
                  <td className="p-3 text-center">{w === "tie" ? "🤝" : <span style={{ color: w === "A" ? storeA.color : storeB.color }}>{w === "A" ? storeA.avatar + " " + storeA.name : storeB.avatar + " " + storeB.name}</span>}</td>
                </tr>
              ); })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// TAB 2: GABUNGAN 2 TOKO
// ═══════════════════════════════════════
function TabCombined({ storeA, storeB, ovA, ovB, vidA, vidB, month }: TabProps) {
  const combined = useMemo<CombinedStoreData | null>(() => {
    if (!ovA || !ovB) return null;
    let c = combineOverviewData(ovA, ovB, storeInfo(storeA), storeInfo(storeB));
    if (vidA && vidB) c = { ...c, ...combineVideoData(vidA, vidB) };
    return c;
  }, [ovA, ovB, vidA, vidB, storeA, storeB]);

  const sA = ovA?.summary;
  const sB = ovB?.summary;
  const vA = vidA?.summary;
  const vB = vidB?.summary;

  if (!combined || !sA || !sB) return <p className="text-gray-400 text-center py-12">Data overview tidak tersedia untuk bulan ini.</p>;

  type KPI = { label: string; icon: string; total: number; aVal: number; bVal: number; fmt: (v: number) => string };
  const kpis: KPI[] = [
    { label: "Total GMV Gabungan", icon: "💰", total: combined.combinedGMV, aVal: sA.gmv, bVal: sB.gmv, fmt: v => formatRupiah(v) },
    { label: "Total Pesanan", icon: "📦", total: combined.combinedOrders, aVal: sA.orders, bVal: sB.orders, fmt: v => formatNum(v) },
    { label: "Pembeli Unik", icon: "👥", total: combined.combinedUniqueBuyers, aVal: sA.uniqueBuyers, bVal: sB.uniqueBuyers, fmt: v => formatNum(v) },
    { label: "Konversi Gabungan", icon: "📈", total: combined.combinedConversionRate, aVal: sA.conversionRate, bVal: sB.conversionRate, fmt: v => fmtDec(v, 2) + "%" },
  ];
  if (vA && vB) {
    kpis.push(
      { label: "GMV Video Gabungan", icon: "🎬", total: combined.combinedVideoGMV, aVal: vA.totalGMV, bVal: vB.totalGMV, fmt: v => formatRupiah(v) },
      { label: "Avg GPM Gabungan", icon: "🎯", total: combined.combinedAvgGPM, aVal: vA.avgGPM, bVal: vB.avgGPM, fmt: v => formatRupiah(Math.round(v)) },
      { label: "Total Views", icon: "👁️", total: combined.combinedTotalVV, aVal: vA.totalVV, bVal: vB.totalVV, fmt: v => formatNum(v) },
      { label: "Total Video", icon: "📹", total: combined.combinedTotalVideos, aVal: vA.totalVideos, bVal: vB.totalVideos, fmt: v => formatNum(v) },
    );
  }

  const contribPct = (a: number, b: number) => {
    const t = a + b;
    return t > 0 ? { aPct: (a / t) * 100, bPct: (b / t) * 100 } : { aPct: 50, bPct: 50 };
  };

  // Pie data
  const gmvPie = [{ name: storeA.name, value: sA.gmv }, { name: storeB.name, value: sB.gmv }];
  const orderPie = [{ name: storeA.name, value: sA.orders }, { name: storeB.name, value: sB.orders }];

  // Stacked bar
  const stackedData = useMemo(() => {
    const d: { name: string; A: number; B: number }[] = [
      { name: "GMV(Jt)", A: sA.gmv / 1e6, B: sB.gmv / 1e6 },
      { name: "Pesanan", A: sA.orders, B: sB.orders },
      { name: "Pembeli", A: sA.uniqueBuyers, B: sB.uniqueBuyers },
      { name: "Tayangan(Rb)", A: sA.pageViews / 1e3, B: sB.pageViews / 1e3 },
    ];
    if (vA && vB) {
      d.push({ name: "VidGMV(Jt)", A: vA.totalGMV / 1e6, B: vB.totalGMV / 1e6 });
      d.push({ name: "Views(Rb)", A: vA.totalVV / 1e3, B: vB.totalVV / 1e3 });
    }
    return d;
  }, [sA, sB, vA, vB]);

  // Top 5 videos combined
  const topVideos = useMemo(() => {
    const all: (VideoPerformanceItem & { storeName: string; storeColor: string })[] = [];
    if (vidA) vidA.videos.forEach(v => all.push({ ...v, storeName: storeA.name, storeColor: storeA.color }));
    if (vidB) vidB.videos.forEach(v => all.push({ ...v, storeName: storeB.name, storeColor: storeB.color }));
    return all.sort((a, b) => b.gmv - a.gmv).slice(0, 5);
  }, [vidA, vidB, storeA, storeB]);

  return (
    <div className="space-y-6">
      <div className="text-sm text-gray-600 flex items-center gap-2 bg-gray-50 rounded-lg p-3">
        <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: storeA.color }} />
        <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: storeB.color }} />
        Gabungan <strong>{storeA.name}</strong> + <strong>{storeB.name}</strong> — {month}
      </div>

      {/* BAGIAN 1: KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map(k => {
          const { aPct, bPct } = k.label.includes("Konversi") || k.label.includes("GPM")
            ? { aPct: 50, bPct: 50 }
            : contribPct(k.aVal, k.bVal);
          return (
            <div key={k.label} className="bg-white rounded-xl border p-4">
              <p className="text-[10px] text-gray-400 font-semibold mb-1">{k.icon} {k.label}</p>
              <p className="text-lg font-bold text-gray-900">{k.fmt(k.total)}</p>
              <div className="mt-2 h-2 rounded-full overflow-hidden flex">
                <div style={{ width: `${aPct}%`, backgroundColor: storeA.color }} />
                <div style={{ width: `${bPct}%`, backgroundColor: storeB.color }} />
              </div>
              <div className="flex justify-between text-[9px] text-gray-500 mt-1">
                <span>{storeA.avatar} {fmtDec(aPct, 0)}% ({k.fmt(k.aVal)})</span>
                <span>{fmtDec(bPct, 0)}% ({k.fmt(k.bVal)}) {storeB.avatar}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* BAGIAN 2: Pie Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[{ title: "Kontribusi GMV", data: gmvPie }, { title: "Kontribusi Pesanan", data: orderPie }].map(p => (
          <div key={p.title} className="bg-white rounded-xl border p-6">
            <h3 className="font-semibold text-sm mb-4">{p.title}</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={p.data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ percent }) => `${((percent || 0) * 100).toFixed(1)}%`} labelLine={false}>
                  <Cell fill={storeA.color} />
                  <Cell fill={storeB.color} />
                </Pie>
                <Tooltip formatter={((v: number) => formatNum(v)) as any} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ))}
      </div>

      {/* BAGIAN 3: Stacked Bar */}
      <div className="bg-white rounded-xl border p-6">
        <h3 className="font-semibold text-sm mb-4">Kontribusi per Metrik (Stacked)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={stackedData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="A" name={storeA.name} stackId="s" fill={storeA.color} />
            <Bar dataKey="B" name={storeB.name} stackId="s" fill={storeB.color} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* BAGIAN 4: Top 5 Videos */}
      {topVideos.length > 0 && (
        <div className="bg-white rounded-xl border p-6">
          <h3 className="font-semibold text-sm mb-4">🏆 Top 5 Video Gabungan (by GMV)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="border-b bg-gray-50">
                <th className="p-2 text-left">#</th><th className="p-2 text-left">Caption</th><th className="p-2 text-left">Toko</th>
                <th className="p-2 text-right">GMV</th><th className="p-2 text-right">GPM</th><th className="p-2 text-right">CTR</th><th className="p-2 text-right">CTOR</th><th className="p-2 text-center">Status</th>
              </tr></thead>
              <tbody>
                {topVideos.map((v, i) => (
                  <tr key={i} className="border-b hover:bg-gray-50">
                    <td className="p-2 font-bold">{i + 1}</td>
                    <td className="p-2 max-w-[200px] truncate">{v.videoInfo?.substring(0, 50) || "-"}</td>
                    <td className="p-2"><span className="px-2 py-0.5 rounded-full text-white text-[10px] font-semibold" style={{ backgroundColor: v.storeColor }}>{v.storeName}</span></td>
                    <td className="p-2 text-right font-semibold">{formatRupiah(v.gmv)}</td>
                    <td className="p-2 text-right">{formatRupiah(Math.round(v.gpm))}</td>
                    <td className="p-2 text-right">{fmtDec(v.ctr, 2)}%</td>
                    <td className="p-2 text-right">{fmtDec(v.ctor, 2)}%</td>
                    <td className="p-2 text-center text-[10px]">{v.videoStatus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════
// TAB 3: TREN BULANAN GABUNGAN
// ═══════════════════════════════════════
function TabTrend({ storeA, storeB }: { storeA: Store; storeB: Store }) {
  const overlapping = useMemo(() => getOverlappingMonths(storeA, storeB), [storeA, storeB]);

  if (overlapping.length < 2) {
    return (
      <div className="flex flex-col items-center py-16 text-center text-gray-400">
        <p className="font-semibold mb-2">Data belum cukup untuk tren</p>
        <p className="text-sm">Upload minimal 2 bulan data yang sama di kedua toko untuk melihat tren.</p>
        <p className="text-xs mt-2">Bulan overlap saat ini: {overlapping.length === 0 ? "tidak ada" : overlapping.join(", ")}</p>
      </div>
    );
  }

  const trendData = useMemo(() => {
    return overlapping.map((m, i) => {
      const ovA = getOvForMonth(storeA, m);
      const ovB = getOvForMonth(storeB, m);
      const gmvA = ovA?.summary.gmv || 0;
      const gmvB = ovB?.summary.gmv || 0;
      const ordA = ovA?.summary.orders || 0;
      const ordB = ovB?.summary.orders || 0;
      const gmvTotal = gmvA + gmvB;
      const ordTotal = ordA + ordB;

      const vidA = getVidForMonth(storeA, m);
      const vidB = getVidForMonth(storeB, m);
      const gpmA = vidA?.summary.avgGPM || 0;
      const gpmB = vidB?.summary.avgGPM || 0;
      const vidCountA = vidA?.summary.totalVideos || 0;
      const vidCountB = vidB?.summary.totalVideos || 0;

      return { month: m, gmvA, gmvB, gmvTotal, ordA, ordB, ordTotal, gpmA, gpmB, gpmGab: (gpmA + gpmB) / 2, vidCountA, vidCountB, idx: i };
    });
  }, [overlapping, storeA, storeB]);

  // Compute growth
  const tableRows = trendData.map((d, i) => {
    const prev = i > 0 ? trendData[i - 1] : null;
    const growth = prev && prev.gmvTotal > 0 ? ((d.gmvTotal - prev.gmvTotal) / prev.gmvTotal) * 100 : null;
    const total = d.gmvA + d.gmvB;
    const contribA = total > 0 ? (d.gmvA / total) * 100 : 50;
    const contribB = total > 0 ? (d.gmvB / total) * 100 : 50;
    return { ...d, growth, contribA, contribB };
  });

  const bestMonth = tableRows.reduce((a, b) => b.gmvTotal > a.gmvTotal ? b : a, tableRows[0]);

  return (
    <div className="space-y-6">
      {/* BAGIAN 1: GMV Line Chart */}
      <div className="bg-white rounded-xl border p-6">
        <h3 className="font-semibold text-sm mb-4">Tren GMV Bulanan</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={v => abbr(v)} />
            <Tooltip formatter={((v: number) => formatRupiah(v)) as any} />
            <Legend />
            <Line type="monotone" dataKey="gmvA" name={storeA.name} stroke={storeA.color} strokeWidth={2} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="gmvB" name={storeB.name} stroke={storeB.color} strokeWidth={2} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="gmvTotal" name="Gabungan" stroke="#374151" strokeWidth={3} strokeDasharray="6 3" dot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* BAGIAN 2: Orders Line Chart */}
      <div className="bg-white rounded-xl border p-6">
        <h3 className="font-semibold text-sm mb-4">Tren Pesanan Bulanan</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="ordA" name={storeA.name} stroke={storeA.color} strokeWidth={2} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="ordB" name={storeB.name} stroke={storeB.color} strokeWidth={2} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="ordTotal" name="Gabungan" stroke="#374151" strokeWidth={3} strokeDasharray="6 3" dot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* BAGIAN 3: Stacked Area GMV */}
      <div className="bg-white rounded-xl border p-6">
        <h3 className="font-semibold text-sm mb-4">GMV Stacked Area</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={v => abbr(v)} />
            <Tooltip formatter={((v: number) => formatRupiah(v)) as any} />
            <Legend />
            <Area type="monotone" dataKey="gmvA" name={storeA.name} stackId="1" stroke={storeA.color} fill={storeA.color} fillOpacity={0.6} />
            <Area type="monotone" dataKey="gmvB" name={storeB.name} stackId="1" stroke={storeB.color} fill={storeB.color} fillOpacity={0.6} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* BAGIAN 4: Trend Table */}
      <div className="bg-white rounded-xl border p-6">
        <h3 className="font-semibold text-sm mb-4">Tabel Tren Bulanan Gabungan</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="border-b bg-gray-50">
              <th className="p-2 text-left">Bulan</th>
              <th className="p-2 text-right" style={{ color: storeA.color }}>GMV {storeA.avatar}</th>
              <th className="p-2 text-right" style={{ color: storeB.color }}>GMV {storeB.avatar}</th>
              <th className="p-2 text-right">GMV Gabungan</th>
              <th className="p-2 text-right">Growth</th>
              <th className="p-2 text-right">Kontribusi A</th>
              <th className="p-2 text-right">Kontribusi B</th>
            </tr></thead>
            <tbody>
              {tableRows.map(r => (
                <tr key={r.month} className={`border-b ${r.month === bestMonth.month ? "bg-green-50" : ""}`}>
                  <td className="p-2 font-medium">{r.month} {r.month === bestMonth.month && "⭐"}</td>
                  <td className="p-2 text-right">{formatRupiah(r.gmvA)}</td>
                  <td className="p-2 text-right">{formatRupiah(r.gmvB)}</td>
                  <td className="p-2 text-right font-bold">{formatRupiah(r.gmvTotal)}</td>
                  <td className="p-2 text-right">{r.growth !== null ? <span className={r.growth >= 0 ? "text-green-600" : "text-red-500"}>{r.growth >= 0 ? "↑" : "↓"} {fmtDec(Math.abs(r.growth), 1)}%</span> : "-"}</td>
                  <td className="p-2 text-right">{fmtDec(r.contribA, 1)}%</td>
                  <td className="p-2 text-right">{fmtDec(r.contribB, 1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* BAGIAN 5: Video Trend */}
      {trendData.some(d => d.gpmA > 0 || d.gpmB > 0) && (
        <>
          <div className="bg-white rounded-xl border p-6">
            <h3 className="font-semibold text-sm mb-4">Tren Avg GPM Bulanan</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => abbr(v)} />
                <Tooltip formatter={((v: number) => formatRupiah(Math.round(v))) as any} />
                <Legend />
                <Line type="monotone" dataKey="gpmA" name={storeA.name} stroke={storeA.color} strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="gpmB" name={storeB.name} stroke={storeB.color} strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="gpmGab" name="Gabungan" stroke="#374151" strokeWidth={2} strokeDasharray="6 3" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white rounded-xl border p-6">
            <h3 className="font-semibold text-sm mb-4">Total Video per Bulan</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="vidCountA" name={storeA.name} fill={storeA.color} radius={[4, 4, 0, 0]} />
                <Bar dataKey="vidCountB" name={storeB.name} fill={storeB.color} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
