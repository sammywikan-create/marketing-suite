"use client";
import { useState, useMemo, useRef } from "react";
import * as XLSX from "xlsx";
import type { GmaxEvaluasiData, SKUGmaxItem } from "@/lib/types";
import { parseGmaxEvaluasiFile } from "@/lib/gmaxEvaluasiParser";
import PageHeader from "@/components/PageHeader";
import toast from "react-hot-toast";
import { FileSpreadsheet, BarChart3, Target, Video, ClipboardList, ChevronDown, ChevronUp } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  LineChart, Line, ReferenceLine, PieChart, Pie, Cell, Legend,
} from "recharts";

// --- Helpers ---
function fmtRp(n: number): string { return "Rp " + n.toLocaleString("id-ID"); }
function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 }) + "M";
  if (n >= 1_000) return (n / 1_000).toLocaleString("id-ID", { maximumFractionDigits: 1 }) + "K";
  return n.toLocaleString("id-ID");
}

const KLAS_CONFIG: Record<string, { color: string; bg: string; border: string; icon: string; label: string }> = {
  "SUPER HERO SKU": { color: "#f59e0b", bg: "bg-yellow-50", border: "border-yellow-400", icon: "👑", label: "Super Hero" },
  "HERO SKU": { color: "#3b82f6", bg: "bg-blue-50", border: "border-blue-400", icon: "🦸", label: "Hero" },
  "GROWING STAR": { color: "#10b981", bg: "bg-green-50", border: "border-green-400", icon: "🌱", label: "Growing Star" },
  "STAR SKU": { color: "#8b5cf6", bg: "bg-purple-50", border: "border-purple-400", icon: "⭐", label: "Star" },
};
const KLAS_KEYS = ["SUPER HERO SKU", "HERO SKU", "GROWING STAR", "STAR SKU"] as const;
const FUNNEL_COLORS: Record<string, string> = { UPPER: "#3b82f6", MIDDLE: "#8b5cf6", LOWER: "#f97316" };
const PAGE_SIZE = 10;

type SubTab = "sku" | "campaign" | "eval" | "funnel";

export default function GmaxEvaluasiScreen() {
  const [data, setData] = useState<GmaxEvaluasiData | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<SubTab>("sku");
  const [parsing, setParsing] = useState(false);
  const [filterKlasifikasi, setFilterKlasifikasi] = useState("all");
  const [evalTab, setEvalTab] = useState<"upper" | "lower">("upper");
  const [skuPage, setSkuPage] = useState(1);
  const [campEtalaseOpen, setCampEtalaseOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // --- Upload handler ---
  async function handleFile(files: FileList | null) {
    if (!files || files.length === 0) return;
    setParsing(true);
    try {
      const file = files[0];
      const ab = await file.arrayBuffer();
      const wb = XLSX.read(ab, { type: "array" });
      const parsed = parseGmaxEvaluasiFile(wb, file.name);
      if (parsed.skuList.length === 0 && parsed.campaignOverview.length === 0 && parsed.evalUpper.length === 0 && parsed.evalLower.length === 0) {
        toast.error("File tidak mengandung data GMAX Evaluasi yang valid");
        return;
      }
      setData(parsed);
      toast.success(`Berhasil memuat ${parsed.skuList.length} SKU, ${parsed.campaignOverview.length} campaign, ${parsed.evalUpper.length + parsed.evalLower.length} video`);
    } catch (err) {
      console.error(err);
      toast.error("Gagal membaca file Excel");
    } finally {
      setParsing(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  // --- Computed ---
  const filteredSku = useMemo(() => {
    if (!data) return [];
    if (filterKlasifikasi === "all") return data.skuList;
    return data.skuList.filter(s => s.klasifikasiStatus === filterKlasifikasi);
  }, [data, filterKlasifikasi]);

  const skuPaginated = useMemo(() => filteredSku.slice((skuPage - 1) * PAGE_SIZE, skuPage * PAGE_SIZE), [filteredSku, skuPage]);
  const skuTotalPages = Math.ceil(filteredSku.length / PAGE_SIZE);

  const klasCounts = useMemo(() => {
    if (!data) return {};
    const map: Record<string, { count: number; gmv: number }> = {};
    for (const k of KLAS_KEYS) map[k] = { count: 0, gmv: 0 };
    data.skuList.forEach(s => {
      if (s.klasifikasiStatus && map[s.klasifikasiStatus]) {
        map[s.klasifikasiStatus].count++;
        map[s.klasifikasiStatus].gmv += s.gmv;
      }
    });
    return map;
  }, [data]);

  const top10Sku = useMemo(() => {
    if (!data) return [];
    return [...data.skuList].sort((a, b) => b.gmv - a.gmv).slice(0, 10).reverse();
  }, [data]);

  const campaignSummary = useMemo(() => {
    if (!data) return { totalAnggaran: 0, totalGmv: 0, avgRoi: 0 };
    const totalAnggaran = data.campaignOverview.reduce((s, c) => s + c.totalAnggaran, 0);
    const totalGmv = data.campaignOverview.reduce((s, c) => s + c.totalGmv, 0);
    const avgRoi = data.campaignOverview.length > 0
      ? data.campaignOverview.reduce((s, c) => s + c.roi, 0) / data.campaignOverview.length
      : 0;
    return { totalAnggaran, totalGmv, avgRoi };
  }, [data]);

  const tabs: { key: SubTab; label: string; icon: string }[] = [
    { key: "sku", label: "Tracking SKU", icon: "📊" },
    { key: "campaign", label: "Overview Campaign", icon: "🎯" },
    { key: "eval", label: "Eval Konten", icon: "📹" },
    { key: "funnel", label: "Funneling", icon: "📋" },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="GMAX Evaluasi" icon={<ClipboardList size={20} />} />
      <input ref={fileRef} type="file" accept=".xlsx" className="hidden" onChange={e => handleFile(e.target.files)} />

      {/* SECTION A — Upload Area */}
      {!data ? (
        <div
          onClick={() => !parsing && fileRef.current?.click()}
          className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-12 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition"
        >
          {parsing ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
              <p className="text-sm text-gray-500">Memproses file...</p>
            </div>
          ) : (
            <>
              <FileSpreadsheet size={40} className="mx-auto text-gray-400 mb-3" />
              <p className="text-sm font-semibold text-gray-700">Upload File GMAX Evaluasi</p>
              <p className="text-xs text-gray-400 mt-1">Upload file Excel GMAX Evaluasi Konseptor (.xlsx) — semua sheet akan dibaca otomatis</p>
            </>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <span>📅</span>
            <span className="font-medium">Periode: {data.periode || "-"}</span>
            <span className="text-gray-400">|</span>
            <span>📄</span>
            <span className="text-gray-500">{data.namaFile}</span>
          </div>
          <button onClick={() => fileRef.current?.click()} disabled={parsing} className="text-sm px-3 py-1.5 rounded-lg border text-gray-600 hover:bg-gray-50 transition">
            {parsing ? "Memproses..." : "Ganti File"}
          </button>
        </div>
      )}

      {/* SECTION B — Summary Cards */}
      {data && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border p-4">
            <div className="text-xs text-gray-400 mb-1">Total SKU</div>
            <div className="text-xl font-bold">{data.skuList.length}</div>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <div className="text-xs text-gray-400 mb-1">Total GMV (3 Bulan)</div>
            <div className="text-xl font-bold text-green-600">{fmtRp(data.skuList.reduce((s, i) => s + i.gmv, 0))}</div>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <div className="text-xs text-gray-400 mb-1">Jumlah Campaign</div>
            <div className="text-xl font-bold">{data.campaignOverview.length}</div>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <div className="text-xs text-gray-400 mb-1">Video Dievaluasi</div>
            <div className="text-xl font-bold">{data.evalUpper.length + data.evalLower.length}</div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      {data && (
        <div className="flex gap-1 bg-white rounded-xl border p-1">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => { setActiveSubTab(t.key); setSkuPage(1); }}
              className={`flex-1 text-sm font-medium py-2 px-3 rounded-lg transition ${activeSubTab === t.key ? "bg-blue-600 text-white shadow" : "text-gray-500 hover:bg-gray-50"}`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      )}

      {/* SECTION C — Tab Content */}
      {data && activeSubTab === "sku" && <TabSKU data={data} filteredSku={filteredSku} paginated={skuPaginated} page={skuPage} totalPages={skuTotalPages} setPage={setSkuPage} filterKlasifikasi={filterKlasifikasi} setFilterKlasifikasi={setFilterKlasifikasi} klasCounts={klasCounts} top10Sku={top10Sku} campEtalaseOpen={campEtalaseOpen} setCampEtalaseOpen={setCampEtalaseOpen} />}
      {data && activeSubTab === "campaign" && <TabCampaign data={data} summary={campaignSummary} />}
      {data && activeSubTab === "eval" && <TabEval data={data} evalTab={evalTab} setEvalTab={setEvalTab} />}
      {data && activeSubTab === "funnel" && <TabFunnel data={data} />}
    </div>
  );
}

// ================================================================
// TAB 1: TRACKING SKU
// ================================================================
function TabSKU({ data, filteredSku, paginated, page, totalPages, setPage, filterKlasifikasi, setFilterKlasifikasi, klasCounts, top10Sku, campEtalaseOpen, setCampEtalaseOpen }: {
  data: GmaxEvaluasiData;
  filteredSku: SKUGmaxItem[];
  paginated: SKUGmaxItem[];
  page: number;
  totalPages: number;
  setPage: (p: number) => void;
  filterKlasifikasi: string;
  setFilterKlasifikasi: (v: string) => void;
  klasCounts: Record<string, { count: number; gmv: number }>;
  top10Sku: SKUGmaxItem[];
  campEtalaseOpen: boolean;
  setCampEtalaseOpen: (v: boolean) => void;
}) {
  return (
    <div className="space-y-5">
      {/* Filter */}
      <div className="bg-white rounded-xl border p-4 flex flex-wrap items-center gap-3">
        <select value={filterKlasifikasi} onChange={e => setFilterKlasifikasi(e.target.value)} className="text-sm border rounded-lg px-3 py-1.5 bg-white">
          <option value="all">Semua Klasifikasi</option>
          {KLAS_KEYS.map(k => <option key={k} value={k}>{k}</option>)}
        </select>
        <span className="text-xs text-gray-400 ml-auto">Menampilkan {filteredSku.length} dari {data.skuList.length} SKU</span>
      </div>

      {/* Klasifikasi Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {KLAS_KEYS.map(k => {
          const cfg = KLAS_CONFIG[k];
          const c = klasCounts[k] || { count: 0, gmv: 0 };
          return (
            <div key={k} className={`rounded-xl border-2 p-4 ${cfg.bg} ${cfg.border}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{cfg.icon}</span>
                <span className="text-xs font-bold" style={{ color: cfg.color }}>{cfg.label}</span>
              </div>
              <div className="text-lg font-bold">{c.count} SKU</div>
              <div className="text-xs text-gray-500">{fmtRp(c.gmv)}</div>
            </div>
          );
        })}
      </div>

      {/* SKU Table */}
      <div className="bg-white rounded-xl border shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-xs text-gray-500 uppercase">
              <th className="px-3 py-3 text-left w-10">No</th>
              <th className="px-3 py-3 text-center">Klasifikasi</th>
              <th className="px-3 py-3 text-left">Nama Produk</th>
              <th className="px-3 py-3 text-left">SKU ID</th>
              <th className="px-3 py-3 text-right">GMV</th>
              <th className="px-3 py-3 text-right">Terjual</th>
              <th className="px-3 py-3 text-right">Pesanan</th>
              <th className="px-3 py-3 text-right">GMV/Hari</th>
              <th className="px-3 py-3 text-right">Terjual/Hari</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((item, idx) => {
              const cfg = KLAS_CONFIG[item.klasifikasiStatus] || null;
              return (
                <tr key={item.skuId + idx} className="border-b hover:bg-gray-50 transition">
                  <td className="px-3 py-2.5 text-xs text-gray-400">{item.no || (page - 1) * PAGE_SIZE + idx + 1}</td>
                  <td className="px-3 py-2.5 text-center">
                    {cfg ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap" style={{ backgroundColor: cfg.color + "20", color: cfg.color }}>{cfg.icon} {cfg.label}</span>
                    ) : <span className="text-xs text-gray-300">-</span>}
                  </td>
                  <td className="px-3 py-2.5"><span className="text-sm font-medium line-clamp-2">{item.namaProduk}</span></td>
                  <td className="px-3 py-2.5 font-mono text-xs text-gray-400 truncate max-w-[120px]">{item.skuId}</td>
                  <td className="px-3 py-2.5 text-right font-semibold">{fmtRp(item.gmv)}</td>
                  <td className="px-3 py-2.5 text-right">{fmt(item.produkTerjual)}</td>
                  <td className="px-3 py-2.5 text-right">{fmt(item.pesanan)}</td>
                  <td className="px-3 py-2.5 text-right text-xs text-gray-600">{fmtRp(Math.round(item.gmvPerHari))}</td>
                  <td className="px-3 py-2.5 text-right text-xs text-gray-600">{item.terjualPerHari.toFixed(1)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="text-sm px-3 py-1.5 rounded-lg border disabled:opacity-40 hover:bg-gray-50 transition">Prev</button>
          <span className="text-sm text-gray-500">Halaman {page} dari {totalPages}</span>
          <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="text-sm px-3 py-1.5 rounded-lg border disabled:opacity-40 hover:bg-gray-50 transition">Next</button>
        </div>
      )}

      {/* Top 10 SKU Chart */}
      {top10Sku.length > 0 && (
        <div className="bg-white rounded-xl border p-5 shadow-sm">
          <h3 className="text-sm font-semibold mb-3">Top 10 SKU by GMV</h3>
          <ResponsiveContainer width="100%" height={Math.max(240, top10Sku.length * 36)}>
            <BarChart data={top10Sku} layout="vertical" margin={{ left: 10, right: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tickFormatter={v => fmtRp(v)} tick={{ fontSize: 9 }} />
              <YAxis dataKey="namaProduk" type="category" width={160} tick={{ fontSize: 9 }} />
              <Tooltip formatter={(v) => fmtRp(Number(v))} />
              <Bar dataKey="gmv" name="GMV" radius={[0, 4, 4, 0]}>
                {top10Sku.map((s, i) => <Cell key={i} fill={KLAS_CONFIG[s.klasifikasiStatus]?.color || "#94a3b8"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Campaign Etalase Accordion */}
      {data.campaignEtalase.length > 0 && (
        <div className="bg-white rounded-xl border shadow-sm">
          <button onClick={() => setCampEtalaseOpen(!campEtalaseOpen)} className="w-full flex items-center justify-between px-5 py-4 text-sm font-semibold hover:bg-gray-50 transition">
            <span>Campaign Etalase ({data.campaignEtalase.length})</span>
            {campEtalaseOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {campEtalaseOpen && (
            <div className="overflow-x-auto border-t">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-gray-50 text-xs text-gray-500 uppercase">
                  <th className="px-3 py-2 text-left w-10">No</th>
                  <th className="px-3 py-2 text-left">Campaign</th>
                  <th className="px-3 py-2 text-left">Etalase</th>
                  <th className="px-3 py-2 text-left">SKU ID</th>
                  <th className="px-3 py-2 text-left">Nama Produk</th>
                </tr></thead>
                <tbody>
                  {data.campaignEtalase.map((c, i) => (
                    <tr key={i} className="border-b hover:bg-gray-50"><td className="px-3 py-2 text-xs text-gray-400">{c.no}</td><td className="px-3 py-2">{c.namaCampaign}</td><td className="px-3 py-2">{c.etalase}</td><td className="px-3 py-2 font-mono text-xs text-gray-400">{c.skuId}</td><td className="px-3 py-2 line-clamp-1">{c.namaProduk}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ================================================================
// TAB 2: OVERVIEW CAMPAIGN
// ================================================================
function TabCampaign({ data, summary }: { data: GmaxEvaluasiData; summary: { totalAnggaran: number; totalGmv: number; avgRoi: number } }) {
  const campaigns = data.campaignOverview;
  const top10 = [...campaigns].sort((a, b) => b.totalAnggaran - a.totalAnggaran).slice(0, 10);

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border p-4">
          <div className="text-xs text-gray-400 mb-1">Total Anggaran</div>
          <div className="text-xl font-bold">{fmtRp(summary.totalAnggaran)}</div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="text-xs text-gray-400 mb-1">Total GMV</div>
          <div className="text-xl font-bold text-green-600">{fmtRp(summary.totalGmv)}</div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="text-xs text-gray-400 mb-1">Rata-rata ROI</div>
          <div className="text-xl font-bold">{summary.avgRoi.toFixed(2)}</div>
        </div>
      </div>

      {/* Campaign Table */}
      <div className="bg-white rounded-xl border shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-gray-50 text-xs text-gray-500 uppercase">
            <th className="px-3 py-3 text-left">Kampanye</th>
            <th className="px-3 py-3 text-right">Set Anggaran</th>
            <th className="px-3 py-3 text-right">Set ROI</th>
            <th className="px-3 py-3 text-right">Total Anggaran</th>
            <th className="px-3 py-3 text-right">Total GMV</th>
            <th className="px-3 py-3 text-right">ROI Aktual</th>
            <th className="px-3 py-3 text-right">CAC</th>
            <th className="px-3 py-3 text-center">Absorb</th>
            <th className="px-3 py-3 text-center">Achieve ROI</th>
          </tr></thead>
          <tbody>
            {campaigns.map((c, i) => (
              <tr key={i} className="border-b hover:bg-gray-50 transition">
                <td className="px-3 py-2.5 font-medium max-w-[200px] truncate">{c.namaCampaign}</td>
                <td className="px-3 py-2.5 text-right">{fmtRp(c.setAnggaran)}</td>
                <td className="px-3 py-2.5 text-right">{c.setROI.toFixed(2)}</td>
                <td className="px-3 py-2.5 text-right">{fmtRp(c.totalAnggaran)}</td>
                <td className="px-3 py-2.5 text-right font-semibold">{fmtRp(c.totalGmv)}</td>
                <td className={`px-3 py-2.5 text-right font-bold ${c.roi >= c.setROI ? "text-green-600" : "text-red-500"}`}>{c.roi.toFixed(2)}</td>
                <td className="px-3 py-2.5 text-right">{fmtRp(c.cac)}</td>
                <td className="px-3 py-2.5 text-center text-xs">{c.absorbAnggaran || "-"}</td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, Math.max(0, parseFloat(c.achieveROI) || 0))}%` }} />
                    </div>
                    <span className="text-xs text-gray-500 w-10 text-right">{c.achieveROI || "-"}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ROI Line Chart */}
      {campaigns.length > 0 && (
        <div className="bg-white rounded-xl border p-5 shadow-sm">
          <h3 className="text-sm font-semibold mb-3">ROI per Campaign</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={campaigns.map(c => ({ name: c.namaCampaign.slice(0, 20), roi: c.roi, target: c.setROI }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 8 }} angle={-20} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 9 }} />
              <Tooltip />
              <Line type="monotone" dataKey="roi" name="ROI Aktual" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
              <ReferenceLine y={campaigns[0]?.setROI || 0} stroke="#ef4444" strokeDasharray="5 5" label={{ value: "Target ROI", position: "right", fontSize: 10, fill: "#ef4444" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Anggaran vs GMV Bar Chart */}
      {top10.length > 0 && (
        <div className="bg-white rounded-xl border p-5 shadow-sm">
          <h3 className="text-sm font-semibold mb-3">Anggaran vs GMV (Top 10)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={top10.map(c => ({ name: c.namaCampaign.slice(0, 15), anggaran: c.totalAnggaran, gmv: c.totalGmv }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 8 }} angle={-20} textAnchor="end" height={60} />
              <YAxis tickFormatter={v => fmtRp(v)} tick={{ fontSize: 9 }} />
              <Tooltip formatter={(v) => fmtRp(Number(v))} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="anggaran" name="Anggaran" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              <Bar dataKey="gmv" name="GMV" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ================================================================
// TAB 3: EVAL KONTEN
// ================================================================
function TabEval({ data, evalTab, setEvalTab }: { data: GmaxEvaluasiData; evalTab: "upper" | "lower"; setEvalTab: (v: "upper" | "lower") => void }) {
  const items = evalTab === "upper" ? data.evalUpper : data.evalLower;
  const RETENTION_COLORS = ["#3b82f6", "#2563eb", "#7c3aed", "#a855f7", "#f59e0b", "#f97316", "#ef4444"];

  return (
    <div className="space-y-5">
      {/* Sub-tab */}
      <div className="flex gap-2">
        {(["upper", "lower"] as const).map(t => (
          <button
            key={t}
            onClick={() => setEvalTab(t)}
            className={`text-sm font-medium px-4 py-2 rounded-lg border transition ${evalTab === t ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-500 hover:bg-gray-50"}`}
          >
            {t === "upper" ? "Upper" : "Lower"} ({t === "upper" ? data.evalUpper.length : data.evalLower.length})
          </button>
        ))}
      </div>

      {items.length === 0 && <div className="bg-white rounded-xl border p-8 text-center text-gray-400 text-sm">Tidak ada data evaluasi {evalTab}</div>}

      {items.map((vid, idx) => {
        const ctrNum = parseFloat(vid.ctr) || 0;
        const ctrColor = ctrNum > 0.5 ? "bg-green-100 text-green-700" : ctrNum < 0.3 ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700";
        return (
          <div key={idx} className="bg-white rounded-xl border p-5 shadow-sm space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-semibold truncate">{vid.namaIklan}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${vid.status.toLowerCase().includes("aktif") || vid.status.toLowerCase().includes("active") ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {vid.status || "Dijeda"}
                  </span>
                  <span className="text-xs text-gray-400">Biaya: <span className="font-medium text-gray-700">{fmtRp(vid.biaya)}</span></span>
                </div>
              </div>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${ctrColor}`}>CTR: {vid.ctr || "0%"}</span>
            </div>

            {/* Grid: Penempatan + Funnel */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Penilaian Penempatan */}
              <div>
                <h5 className="text-xs font-semibold text-gray-500 mb-2">Penilaian Penempatan</h5>
                <table className="w-full text-sm border rounded-lg overflow-hidden">
                  <thead><tr className="bg-gray-50 text-xs text-gray-500">
                    <th className="px-3 py-1.5 text-left">Metrik</th>
                    <th className="px-3 py-1.5 text-right">Hasil</th>
                    <th className="px-3 py-1.5 text-right">Standar</th>
                    <th className="px-3 py-1.5 text-center">Status</th>
                  </tr></thead>
                  <tbody>
                    <tr className="border-t"><td className="px-3 py-1.5">Jangkauan</td><td className="px-3 py-1.5 text-right">{fmt(vid.penilaianPenempatan.jangkauan)}</td><td className="px-3 py-1.5 text-right text-gray-400">-</td><td className="px-3 py-1.5 text-center">-</td></tr>
                    <tr className="border-t"><td className="px-3 py-1.5">CPM</td><td className="px-3 py-1.5 text-right">{fmtRp(vid.penilaianPenempatan.cpm)}</td><td className="px-3 py-1.5 text-right text-gray-400">≤ Rp 2.500</td><td className="px-3 py-1.5 text-center">{vid.penilaianPenempatan.statusCpm}</td></tr>
                    <tr className="border-t"><td className="px-3 py-1.5">Impresi</td><td className="px-3 py-1.5 text-right">{fmt(vid.penilaianPenempatan.impresi)}</td><td className="px-3 py-1.5 text-right text-gray-400">-</td><td className="px-3 py-1.5 text-center">-</td></tr>
                    <tr className="border-t"><td className="px-3 py-1.5">Frekuensi</td><td className="px-3 py-1.5 text-right">{vid.penilaianPenempatan.frekuensi.toFixed(2)}</td><td className="px-3 py-1.5 text-right text-gray-400">≤ 1.5</td><td className="px-3 py-1.5 text-center">{vid.penilaianPenempatan.statusFrekuensi}</td></tr>
                  </tbody>
                </table>
              </div>

              {/* View Retention Funnel */}
              <div>
                <h5 className="text-xs font-semibold text-gray-500 mb-2">View Retention Funnel</h5>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={vid.viewFunnel}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 9 }} tickFormatter={v => fmt(v)} />
                    <Tooltip formatter={(v) => fmt(Number(v))} />
                    <Bar dataKey="jumlah" name="Views" radius={[4, 4, 0, 0]}>
                      {vid.viewFunnel.map((_, i) => <Cell key={i} fill={RETENTION_COLORS[i] || "#888"} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-1 mt-1">
                  {vid.viewFunnel.slice(1).map((stage, i) => {
                    const color = stage.penurunan > 50 ? "text-red-500" : stage.penurunan > 30 ? "text-yellow-500" : "text-green-500";
                    return <span key={i} className={`text-[9px] font-bold ${color}`}>-{stage.penurunan.toFixed(0)}%</span>;
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ================================================================
// TAB 4: FUNNELING KONTEN
// ================================================================
function TabFunnel({ data }: { data: GmaxEvaluasiData }) {
  const funnelDist = useMemo(() => {
    const map: Record<string, number> = { UPPER: 0, MIDDLE: 0, LOWER: 0 };
    data.funnelKonten.forEach(f => { map[f.funnel] = (map[f.funnel] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [data]);

  const konseptor1 = data.konseptorPembagian[0]?.konseptor1 || "Konseptor 1";
  const konseptor2 = data.konseptorPembagian[0]?.konseptor2 || "Konseptor 2";
  const totalK1 = data.konseptorPembagian.reduce((s, k) => s + k.jumlah1, 0);
  const totalK2 = data.konseptorPembagian.reduce((s, k) => s + k.jumlah2, 0);

  return (
    <div className="space-y-5">
      {/* Funnel Table */}
      <div className="bg-white rounded-xl border shadow-sm overflow-x-auto">
        <div className="px-5 py-4 border-b"><h3 className="text-sm font-semibold">Funneling Konten</h3></div>
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-gray-50 text-xs text-gray-500 uppercase">
            <th className="px-3 py-3 text-left">Funnel</th>
            <th className="px-3 py-3 text-left">Sub Konten</th>
            <th className="px-3 py-3 text-left">Jenis Konten</th>
          </tr></thead>
          <tbody>
            {(["UPPER", "MIDDLE", "LOWER"] as const).map(funnel => {
              const items = data.funnelKonten.filter(f => f.funnel === funnel);
              if (items.length === 0) return null;
              return items.map((item, idx) => (
                <tr key={`${funnel}-${idx}`} className="border-b hover:bg-gray-50">
                  {idx === 0 && (
                    <td className="px-3 py-2.5" rowSpan={items.length}>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: FUNNEL_COLORS[funnel] + "20", color: FUNNEL_COLORS[funnel] }}>{funnel}</span>
                    </td>
                  )}
                  <td className="px-3 py-2.5">{item.subKonten}</td>
                  <td className="px-3 py-2.5 text-gray-500">{item.jenisKonten}</td>
                </tr>
              ));
            })}
          </tbody>
        </table>
      </div>

      {/* Konseptor Table */}
      {data.konseptorPembagian.length > 0 && (
        <div className="bg-white rounded-xl border shadow-sm overflow-x-auto">
          <div className="px-5 py-4 border-b"><h3 className="text-sm font-semibold">Pembagian Konseptor</h3></div>
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-gray-50 text-xs text-gray-500 uppercase">
              <th className="px-3 py-3 text-left w-10">No</th>
              <th className="px-3 py-3 text-left">Content Pillar</th>
              <th className="px-3 py-3 text-center">{konseptor1}</th>
              <th className="px-3 py-3 text-center">{konseptor2}</th>
            </tr></thead>
            <tbody>
              {data.konseptorPembagian.map((k, i) => (
                <tr key={i} className="border-b hover:bg-gray-50">
                  <td className="px-3 py-2.5 text-xs text-gray-400">{k.no}</td>
                  <td className="px-3 py-2.5 font-medium">{k.contentPillar}</td>
                  <td className="px-3 py-2.5 text-center">{k.jumlah1}</td>
                  <td className="px-3 py-2.5 text-center">{k.jumlah2}</td>
                </tr>
              ))}
              <tr className="border-t-2 bg-gray-50 font-bold">
                <td className="px-3 py-2.5" colSpan={2}>Total</td>
                <td className="px-3 py-2.5 text-center">{totalK1}</td>
                <td className="px-3 py-2.5 text-center">{totalK2}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Beban Kerja Stacked Bar */}
        {data.konseptorPembagian.length > 0 && (
          <div className="bg-white rounded-xl border p-5 shadow-sm">
            <h3 className="text-sm font-semibold mb-3">Beban Kerja per Konseptor</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.konseptorPembagian.map(k => ({ pillar: k.contentPillar.slice(0, 20), [konseptor1]: k.jumlah1, [konseptor2]: k.jumlah2 }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="pillar" tick={{ fontSize: 8 }} angle={-15} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 9 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey={konseptor1} stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                <Bar dataKey={konseptor2} stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Donut Chart: Funnel Distribution */}
        <div className="bg-white rounded-xl border p-5 shadow-sm">
          <h3 className="text-sm font-semibold mb-3">Distribusi Konten per Funnel</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={funnelDist.filter(d => d.value > 0)}
                dataKey="value" nameKey="name" cx="50%" cy="50%"
                outerRadius={80} innerRadius={40}
                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                labelLine={false} fontSize={10}
              >
                {funnelDist.filter(d => d.value > 0).map((d, i) => (
                  <Cell key={i} fill={FUNNEL_COLORS[d.name] || "#888"} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
