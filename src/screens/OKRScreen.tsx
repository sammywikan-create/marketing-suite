"use client";
import { useState, useMemo, useCallback } from "react";
import { useOKRStore } from "@/store/useOKRStore";
import { useStoreManager } from "@/store/useStoreManager";
import { DEFAULT_OKR_ROWS, DEPARTMENT_CONFIG, generateMonthOptions, AUTO_SYNC_KEYS } from "@/lib/okrTemplates";
import type { OKRDepartment, OKRTableRow, MonthlyOKRReport, Objective, KeyResult, KRMetricSource } from "@/lib/types";
import { nanoid } from "nanoid";
import * as XLSX from "xlsx";
import {
  Target, Plus, Trash2, Download, Printer, RefreshCw, ChevronDown,
  CheckCircle2, AlertCircle, Clock, FileText, Sparkles, X
} from "lucide-react";

type OKRTab = "active" | "progress" | "laporan" | "history" | "ai-gen";

const TABS: { key: OKRTab; label: string }[] = [
  { key: "active", label: "🎯 OKR Aktif" },
  { key: "progress", label: "📊 Progress" },
  { key: "laporan", label: "📋 Laporan Bulanan" },
  { key: "history", label: "📅 Riwayat" },
  { key: "ai-gen", label: "🤖 AI Generator" },
];

// ═══════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════
function fmtRp(v: number): string {
  if (v >= 1e9) return `Rp ${(v / 1e9).toFixed(1)}M`;
  if (v >= 1e6) return `Rp ${(v / 1e6).toFixed(1)}Jt`;
  if (v >= 1e3) return `Rp ${(v / 1e3).toFixed(1)}Rb`;
  return `Rp ${v.toLocaleString("id-ID")}`;
}

function fmtVal(v: number | null, satuan: string): string {
  if (v === null) return "-";
  if (satuan === "Rp") return fmtRp(v);
  return v.toLocaleString("id-ID");
}

function achievePct(achieve: number | null, target: number): number | null {
  if (achieve === null || target === 0) return null;
  return (achieve / target) * 100;
}

function statusEmoji(pct: number | null): string {
  if (pct === null) return "⬜";
  if (pct >= 100) return "✅";
  if (pct >= 70) return "🟡";
  return "🔴";
}

function statusLabel(pct: number | null): string {
  if (pct === null) return "Belum diisi";
  if (pct >= 100) return "Tercapai";
  if (pct >= 70) return "On Track";
  return "Below Target";
}

function pctColor(pct: number | null): string {
  if (pct === null) return "text-gray-400";
  if (pct >= 100) return "text-green-600 font-bold";
  if (pct >= 70) return "text-yellow-600";
  return "text-red-500";
}

function rowBg(pct: number | null): string {
  if (pct === null) return "";
  if (pct >= 100) return "bg-green-50/60";
  if (pct < 70) return "bg-red-50/40";
  return "";
}

// ═══════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════
export default function OKRScreen() {
  const [activeTab, setActiveTab] = useState<OKRTab>("active");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Target size={24} className="text-blue-600" /> OKR Framework
      </h1>

      {/* Tab Nav */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-semibold transition-colors whitespace-nowrap ${
              activeTab === t.key ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "active" && <TabActive />}
      {activeTab === "progress" && <TabProgress />}
      {activeTab === "laporan" && <TabLaporan />}
      {activeTab === "history" && <TabHistory />}
      {activeTab === "ai-gen" && <TabAIGen />}
    </div>
  );
}

// ═══════════════════════════════════════
// TAB 1: OKR AKTIF
// ═══════════════════════════════════════
function TabActive() {
  const { objectives, addObjective, updateObjective, deleteObjective } = useOKRStore();
  const [deptFilter, setDeptFilter] = useState<OKRDepartment | "all">("all");
  const [showAdd, setShowAdd] = useState(false);

  const filtered = useMemo(() => {
    if (deptFilter === "all") return objectives.filter((o) => o.status === "active");
    return objectives.filter((o) => o.status === "active" && o.department === deptFilter);
  }, [objectives, deptFilter]);

  const deptKeys: (OKRDepartment | "all")[] = ["all", "konseptor", "smo", "advertiser", "affiliate", "custom"];

  return (
    <div className="space-y-4">
      {/* Dept filter chips */}
      <div className="flex flex-wrap gap-2">
        {deptKeys.map((d) => {
          const cfg = d === "all" ? { icon: "🏷️", label: "Semua", color: "#6B7280", bg: "#F3F4F6" } : DEPARTMENT_CONFIG[d];
          return (
            <button
              key={d}
              onClick={() => setDeptFilter(d)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                deptFilter === d ? "ring-2 ring-offset-1" : "opacity-70 hover:opacity-100"
              }`}
              style={{
                backgroundColor: deptFilter === d ? cfg.bg : "white",
                borderColor: cfg.color,
                color: cfg.color,
                ...(deptFilter === d ? { ringColor: cfg.color } : {}),
              }}
            >
              {cfg.icon} {cfg.label}
            </button>
          );
        })}
      </div>

      {/* Add button */}
      <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700">
        <Plus size={16} /> Tambah Objective
      </button>

      {/* Cards */}
      {filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Target size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-semibold">Belum ada Objective aktif</p>
          <p className="text-sm">Klik &quot;Tambah Objective&quot; untuk mulai</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map((obj) => {
          const cfg = DEPARTMENT_CONFIG[obj.department];
          const totalWeight = obj.keyResults.reduce((a, kr) => a + kr.weight, 0);
          const weightedProgress = totalWeight > 0
            ? obj.keyResults.reduce((a, kr) => {
                const p = kr.targetValue > 0 ? Math.min((kr.currentValue / kr.targetValue) * 100, 100) : 0;
                return a + p * (kr.weight / totalWeight);
              }, 0)
            : 0;

          return (
            <div key={obj.id} className="bg-white rounded-xl border p-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                    {cfg.icon} {cfg.label}
                  </span>
                  <h3 className="font-bold mt-2">{obj.title}</h3>
                  {obj.description && <p className="text-sm text-gray-500 mt-1">{obj.description}</p>}
                </div>
                <button onClick={() => deleteObjective(obj.id)} className="text-gray-300 hover:text-red-500 p-1"><Trash2 size={14} /></button>
              </div>

              {/* Progress bar */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${weightedProgress}%`, backgroundColor: cfg.color }} />
                </div>
                <span className="text-sm font-bold" style={{ color: cfg.color }}>{weightedProgress.toFixed(0)}%</span>
              </div>

              {/* Key Results — editable currentValue */}
              {obj.keyResults.map((kr) => {
                const p = kr.targetValue > 0 ? (kr.currentValue / kr.targetValue) * 100 : 0;
                return (
                  <div key={kr.id} className="text-xs flex items-center gap-2">
                    <span>{statusEmoji(p)}</span>
                    <span className="flex-1 text-gray-700">{kr.title}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <input
                        type="number"
                        value={kr.currentValue || ""}
                        onChange={(e) => {
                          const newVal = Number(e.target.value) || 0;
                          const updatedKRs = obj.keyResults.map((k) =>
                            k.id === kr.id ? { ...k, currentValue: newVal } : k
                          );
                          updateObjective(obj.id, { keyResults: updatedKRs });
                        }}
                        className="w-16 text-right border border-gray-200 rounded px-1.5 py-0.5 text-xs font-semibold focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none"
                        placeholder="0"
                      />
                      <span className="text-gray-400">/ {kr.targetValue} {kr.unit}</span>
                    </div>
                    <span className={`${pctColor(p)} text-[10px] w-10 text-right`}>{p.toFixed(0)}%</span>
                  </div>
                );
              })}

              <div className="flex gap-2 pt-1">
                <button onClick={() => updateObjective(obj.id, { status: "completed" })} className="text-[10px] px-2 py-1 bg-green-50 text-green-700 rounded font-semibold hover:bg-green-100">✅ Selesai</button>
                <button onClick={() => updateObjective(obj.id, { status: "cancelled" })} className="text-[10px] px-2 py-1 bg-gray-50 text-gray-500 rounded font-semibold hover:bg-gray-100">Batalkan</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add modal */}
      {showAdd && <AddObjectiveModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}

function AddObjectiveModal({ onClose }: { onClose: () => void }) {
  const { addObjective } = useOKRStore();
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [dept, setDept] = useState<OKRDepartment>("konseptor");
  const [krs, setKrs] = useState<Omit<KeyResult, "id">[]>([{ title: "", metricSource: "manual", targetValue: 0, currentValue: 0, unit: "", weight: 1 }]);

  const handleSubmit = () => {
    if (!title.trim()) return;
    addObjective({
      title: title.trim(),
      description: desc.trim(),
      department: dept,
      keyResults: krs.map((kr) => ({ ...kr, id: nanoid() })),
      status: "active",
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg">Tambah Objective</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Judul Objective" className="w-full border rounded-lg px-3 py-2 text-sm" />
        <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Deskripsi (opsional)" className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} />
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Departemen</label>
          <select value={dept} onChange={(e) => setDept(e.target.value as OKRDepartment)} className="w-full border rounded-lg px-3 py-2 text-sm">
            {(Object.keys(DEPARTMENT_CONFIG) as OKRDepartment[]).map((d) => (
              <option key={d} value={d}>{DEPARTMENT_CONFIG[d].icon} {DEPARTMENT_CONFIG[d].label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-2 block">Key Results</label>
          {krs.map((kr, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <input value={kr.title} onChange={(e) => { const n = [...krs]; n[i] = { ...n[i], title: e.target.value }; setKrs(n); }} placeholder="Key Result" className="flex-1 border rounded px-2 py-1 text-xs" />
              <input type="number" value={kr.targetValue || ""} onChange={(e) => { const n = [...krs]; n[i] = { ...n[i], targetValue: Number(e.target.value) }; setKrs(n); }} placeholder="Target" className="w-20 border rounded px-2 py-1 text-xs" />
              <input value={kr.unit} onChange={(e) => { const n = [...krs]; n[i] = { ...n[i], unit: e.target.value }; setKrs(n); }} placeholder="Unit" className="w-16 border rounded px-2 py-1 text-xs" />
              {krs.length > 1 && <button onClick={() => setKrs(krs.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>}
            </div>
          ))}
          <button onClick={() => setKrs([...krs, { title: "", metricSource: "manual", targetValue: 0, currentValue: 0, unit: "", weight: 1 }])} className="text-xs text-blue-600 hover:underline">+ Tambah KR</button>
        </div>
        <button onClick={handleSubmit} disabled={!title.trim()} className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-blue-700 disabled:opacity-40">Buat Objective</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// TAB 2: PROGRESS
// ═══════════════════════════════════════
function TabProgress() {
  const { objectives } = useOKRStore();
  const active = objectives.filter((o) => o.status === "active");

  if (active.length === 0) return <div className="text-center py-16 text-gray-400"><p>Belum ada Objective aktif. Buat objective di tab OKR Aktif.</p></div>;

  const byDept = useMemo(() => {
    const map: Record<string, Objective[]> = {};
    active.forEach((o) => { (map[o.department] ||= []).push(o); });
    return map;
  }, [active]);

  return (
    <div className="space-y-6">
      {Object.entries(byDept).map(([dept, objs]) => {
        const cfg = DEPARTMENT_CONFIG[dept as OKRDepartment];
        return (
          <div key={dept} className="bg-white rounded-xl border p-5">
            <h3 className="font-bold text-sm mb-3" style={{ color: cfg.color }}>{cfg.icon} {cfg.label}</h3>
            <div className="space-y-3">
              {objs.map((obj) => {
                const totalWeight = obj.keyResults.reduce((a, kr) => a + kr.weight, 0);
                const pct = totalWeight > 0
                  ? obj.keyResults.reduce((a, kr) => a + Math.min((kr.currentValue / Math.max(kr.targetValue, 1)) * 100, 100) * (kr.weight / totalWeight), 0)
                  : 0;
                return (
                  <div key={obj.id} className="flex items-center gap-3">
                    <span className="text-sm">{statusEmoji(pct)}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{obj.title}</p>
                      <div className="h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: cfg.color }} />
                      </div>
                    </div>
                    <span className="text-xs font-bold" style={{ color: cfg.color }}>{pct.toFixed(0)}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════
// TAB 3: LAPORAN BULANAN
// ═══════════════════════════════════════
function TabLaporan() {
  const { stores, getActiveStore } = useStoreManager();
  const { monthlyReports, addMonthlyReport, updateOKRRow, deleteMonthlyReport, getReportsByStore } = useOKRStore();
  const activeStore = getActiveStore();

  const [selectedStoreId, setSelectedStoreId] = useState(activeStore?.id || stores[0]?.id || "");
  const [selectedReportId, setSelectedReportId] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  const storeReports = useMemo(() => getReportsByStore(selectedStoreId), [monthlyReports, selectedStoreId]);
  const currentReport = storeReports.find((r) => r.id === selectedReportId) || storeReports[0] || null;

  // Auto-select first report if none selected
  const reportId = currentReport?.id || "";

  // Auto-sync availability
  const store = stores.find((s) => s.id === selectedStoreId);
  const syncAvailable = useMemo(() => {
    if (!store || !currentReport) return [] as string[];
    const avail: string[] = [];
    const bulan = currentReport.bulanIni;
    const vidMatch = store.videoData.find((v) => v.period === bulan || v.periodRaw === bulan);
    const ovMatch = store.overviewData.find((o) => o.period.month === bulan);
    if (vidMatch) avail.push("advertiser.gmvVideo", "affiliate.kreatorAktif", "affiliate.videoJualanKreator");
    if (ovMatch) avail.push("advertiser.totalGMV");
    return avail;
  }, [store, currentReport]);

  const handleSync = useCallback((metricKey: KRMetricSource) => {
    if (!store || !currentReport) return;
    const bulan = currentReport.bulanIni;
    const vidMatch = store.videoData.find((v) => v.period === bulan || v.periodRaw === bulan);
    const ovMatch = store.overviewData.find((o) => o.period.month === bulan);

    let val: number | null = null;
    if (metricKey === "advertiser.gmvVideo" && vidMatch) val = vidMatch.summary.totalGMV;
    if (metricKey === "advertiser.totalGMV" && ovMatch) val = ovMatch.summary.gmv;
    if (metricKey === "affiliate.kreatorAktif" && vidMatch) val = new Set(vidMatch.videos.map((v) => v.creatorName)).size;
    if (metricKey === "affiliate.videoJualanKreator" && vidMatch) val = vidMatch.summary.totalVideos;

    if (val !== null) updateOKRRow(reportId, metricKey, { achieveBulanIni: val });
  }, [store, currentReport, reportId, updateOKRRow]);

  const handleSyncAll = () => {
    syncAvailable.forEach((key) => handleSync(key as KRMetricSource));
  };

  // Export to Excel
  const handleExport = useCallback(() => {
    if (!currentReport || !store) return;
    const wb = XLSX.utils.book_new();
    const header = [`Laporan OKR ${currentReport.bulanIni} — ${store.name}`];
    const rows: (string | number | null)[][] = [
      header,
      [],
      ["Parameter", "Metrik", "Satuan", `Target ${currentReport.bulanLalu}`, `Achieve ${currentReport.bulanLalu}`, `Target ${currentReport.bulanIni}`, `Achieve ${currentReport.bulanIni}`, "% Achieve", "Status"],
    ];
    currentReport.rows.forEach((r) => {
      const pct = achievePct(r.achieveBulanIni, r.targetBulanIni);
      rows.push([
        DEPARTMENT_CONFIG[r.parameter].label,
        r.metric,
        r.satuan,
        r.targetBulanLalu,
        r.achieveBulanLalu,
        r.targetBulanIni,
        r.achieveBulanIni,
        pct !== null ? `${pct.toFixed(1)}%` : "-",
        statusLabel(pct),
      ]);
    });
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [{ wch: 16 }, { wch: 28 }, { wch: 12 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 12 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ws, "OKR");
    XLSX.writeFile(wb, `OKR_${store.name.replace(/\s+/g, "_")}_${currentReport.bulanIni.replace(/\s+/g, "_")}.xlsx`);
  }, [currentReport, store]);

  // Print
  const handlePrint = () => window.print();

  if (stores.length === 0) {
    return <div className="text-center py-16 text-gray-400"><p>Buat toko terlebih dahulu di Kelola Toko.</p></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <h2 className="font-bold text-lg">📋 Laporan OKR Bulanan</h2>
        <div className="flex gap-2">
          <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700">
            <Plus size={14} /> Buat Laporan Baru
          </button>
          {currentReport && (
            <>
              <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700">
                <Download size={14} /> Export Excel
              </button>
              <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-2 bg-gray-600 text-white rounded-lg text-xs font-semibold hover:bg-gray-700">
                <Printer size={14} /> Print/PDF
              </button>
            </>
          )}
        </div>
      </div>

      {/* Selectors */}
      <div className="flex flex-wrap gap-3 print:hidden">
        <select value={selectedStoreId} onChange={(e) => { setSelectedStoreId(e.target.value); setSelectedReportId(""); }} className="border rounded-lg px-3 py-2 text-sm">
          {stores.map((s) => <option key={s.id} value={s.id}>{s.avatar} {s.name}</option>)}
        </select>
        {storeReports.length > 0 && (
          <select value={reportId} onChange={(e) => setSelectedReportId(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
            {storeReports.map((r) => <option key={r.id} value={r.id}>{r.bulanIni}</option>)}
          </select>
        )}
      </div>

      {/* Sync banner */}
      {currentReport && syncAvailable.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between text-sm print:hidden">
          <span className="text-blue-700">💡 Data {syncAvailable.length} metrik tersedia dari upload. Klik Sync untuk mengisi otomatis.</span>
          <button onClick={handleSyncAll} className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700">
            <RefreshCw size={12} /> Sync Semua
          </button>
        </div>
      )}

      {/* Empty state or Table */}
      {!currentReport ? (
        <div className="text-center py-16 text-gray-400">
          <FileText size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-semibold mb-2">Belum ada laporan untuk toko ini</p>
          <button onClick={() => setShowCreateModal(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700">
            Buat Laporan Pertama
          </button>
        </div>
      ) : (
        <LaporanTable report={currentReport} syncAvailable={syncAvailable} onSync={handleSync} onUpdateRow={updateOKRRow} onDelete={() => { deleteMonthlyReport(reportId); setSelectedReportId(""); }} storeName={store?.name || ""} />
      )}

      {showCreateModal && (
        <CreateReportModal
          storeId={selectedStoreId}
          existingReports={storeReports}
          onClose={() => setShowCreateModal(false)}
          onCreate={(report) => { addMonthlyReport(report); setShowCreateModal(false); }}
        />
      )}
    </div>
  );
}

// ─── Laporan Table Component ───
interface LaporanTableProps {
  report: MonthlyOKRReport;
  syncAvailable: string[];
  onSync: (key: KRMetricSource) => void;
  onUpdateRow: (reportId: string, metricKey: KRMetricSource, updates: Partial<OKRTableRow>) => void;
  onDelete: () => void;
  storeName: string;
}

function LaporanTable({ report, syncAvailable, onSync, onUpdateRow, onDelete, storeName }: LaporanTableProps) {
  // Group rows by department
  const grouped = useMemo(() => {
    const map: Record<string, OKRTableRow[]> = {};
    report.rows.forEach((r) => { (map[r.parameter] ||= []).push(r); });
    return map;
  }, [report.rows]);

  const deptOrder: OKRDepartment[] = ["konseptor", "smo", "advertiser", "affiliate"];

  // Summary stats
  const stats = useMemo(() => {
    let tercapai = 0, onTrack = 0, below = 0, belum = 0;
    report.rows.forEach((r) => {
      const p = achievePct(r.achieveBulanIni, r.targetBulanIni);
      if (p === null) belum++;
      else if (p >= 100) tercapai++;
      else if (p >= 70) onTrack++;
      else below++;
    });
    return { tercapai, onTrack, below, belum, total: report.rows.length };
  }, [report.rows]);

  // Dept summary
  const deptSummary = useMemo(() => {
    return deptOrder.map((dept) => {
      const rows = grouped[dept] || [];
      const total = rows.length;
      const achieved = rows.filter((r) => {
        const p = achievePct(r.achieveBulanIni, r.targetBulanIni);
        return p !== null && p >= 100;
      }).length;
      return { dept, total, achieved };
    });
  }, [grouped]);

  return (
    <div className="space-y-6">
      {/* Print header */}
      <div className="hidden print:block text-center mb-4">
        <h1 className="text-xl font-bold">Laporan OKR {report.bulanIni} — {storeName}</h1>
        <p className="text-sm text-gray-500">Tanggal cetak: {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
      </div>

      {/* Main table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs" id="okr-table">
            <thead>
              <tr className="bg-gray-100 border-b">
                <th className="p-2.5 text-left font-bold w-[120px]">Parameter</th>
                <th className="p-2.5 text-left font-bold">Metrik</th>
                <th className="p-2.5 text-center font-bold w-[60px]">Satuan</th>
                <th className="p-2.5 text-right font-bold w-[100px]">Target {report.bulanLalu}</th>
                <th className="p-2.5 text-right font-bold w-[100px]">Achieve {report.bulanLalu}</th>
                <th className="p-2.5 text-right font-bold w-[100px]">Target {report.bulanIni}</th>
                <th className="p-2.5 text-right font-bold w-[120px]">Achieve {report.bulanIni}</th>
                <th className="p-2.5 text-right font-bold w-[70px]">% Achieve</th>
                <th className="p-2.5 text-center font-bold w-[80px]">Status</th>
              </tr>
            </thead>
            <tbody>
              {deptOrder.map((dept) => {
                const rows = grouped[dept] || [];
                if (rows.length === 0) return null;
                const cfg = DEPARTMENT_CONFIG[dept];
                return rows.map((r, i) => {
                  const pct = achievePct(r.achieveBulanIni, r.targetBulanIni);
                  const isTotalGMV = r.metricKey === "advertiser.totalGMV";
                  const canSync = syncAvailable.includes(r.metricKey);
                  return (
                    <tr key={r.metricKey} className={`border-b ${rowBg(pct)} ${isTotalGMV ? "font-semibold bg-gray-50/80" : ""}`}>
                      {i === 0 && (
                        <td rowSpan={rows.length} className="p-2.5 align-top border-r" style={{ backgroundColor: cfg.bg }}>
                          <span className="font-bold text-[11px]" style={{ color: cfg.color }}>{cfg.icon} {cfg.label}</span>
                        </td>
                      )}
                      <td className="p-2.5">{r.metric}</td>
                      <td className="p-2.5 text-center text-gray-500">{r.satuan}</td>
                      <td className="p-2.5 text-right">{fmtVal(r.targetBulanLalu, r.satuan)}</td>
                      <td className="p-2.5 text-right">{fmtVal(r.achieveBulanLalu, r.satuan)}</td>
                      <td className="p-2.5 text-right">
                        <input
                          type="number"
                          value={r.targetBulanIni || ""}
                          onChange={(e) => onUpdateRow(report.id, r.metricKey, { targetBulanIni: Number(e.target.value) })}
                          className="w-full text-right bg-transparent border-b border-dashed border-gray-300 focus:border-blue-500 outline-none py-0.5 print:border-none"
                        />
                      </td>
                      <td className="p-2.5 text-right">
                        <div className="flex items-center gap-1 justify-end">
                          <input
                            type="number"
                            value={r.achieveBulanIni ?? ""}
                            onChange={(e) => onUpdateRow(report.id, r.metricKey, { achieveBulanIni: e.target.value === "" ? null : Number(e.target.value) })}
                            className="w-full text-right bg-transparent border-b border-dashed border-gray-300 focus:border-blue-500 outline-none py-0.5 print:border-none"
                            placeholder="-"
                          />
                          {canSync && (
                            <button onClick={() => onSync(r.metricKey)} title="Sync dari data upload" className="text-blue-500 hover:text-blue-700 print:hidden">
                              <RefreshCw size={11} />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className={`p-2.5 text-right ${pctColor(pct)}`}>
                        {pct !== null ? `${pct.toFixed(0)}%` : "-"}
                      </td>
                      <td className="p-2.5 text-center text-[10px]">
                        {statusEmoji(pct)} {statusLabel(pct)}
                      </td>
                    </tr>
                  );
                });
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 print:grid-cols-4">
        <div className="bg-white rounded-xl border p-4 text-center">
          <p className="text-3xl font-bold text-green-600">{stats.tercapai}</p>
          <p className="text-xs text-gray-500 mt-1">🎯 Tercapai / {stats.total} ({stats.total > 0 ? ((stats.tercapai / stats.total) * 100).toFixed(0) : 0}%)</p>
        </div>
        <div className="bg-white rounded-xl border p-4 text-center">
          <p className="text-3xl font-bold text-yellow-600">{stats.onTrack}</p>
          <p className="text-xs text-gray-500 mt-1">✅ On Track</p>
        </div>
        <div className="bg-white rounded-xl border p-4 text-center">
          <p className="text-3xl font-bold text-red-500">{stats.below}</p>
          <p className="text-xs text-gray-500 mt-1">🔴 Below Target</p>
        </div>
        <div className="bg-white rounded-xl border p-4 text-center">
          <p className="text-3xl font-bold text-gray-400">{stats.belum}</p>
          <p className="text-xs text-gray-500 mt-1">⬜ Belum Diisi</p>
        </div>
      </div>

      {/* Department Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 print:grid-cols-4">
        {deptSummary.map((d) => {
          const cfg = DEPARTMENT_CONFIG[d.dept];
          const pct = d.total > 0 ? (d.achieved / d.total) * 100 : 0;
          return (
            <div key={d.dept} className="bg-white rounded-xl border p-4">
              <div className="flex items-center gap-2 mb-2">
                <span>{cfg.icon}</span>
                <span className="text-xs font-bold" style={{ color: cfg.color }}>{cfg.label}</span>
              </div>
              <p className="text-sm font-semibold">{d.achieved}/{d.total} tercapai</p>
              <div className="h-2 bg-gray-100 rounded-full mt-2 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: cfg.color }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Delete report */}
      <div className="flex justify-end print:hidden">
        <button onClick={onDelete} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1">
          <Trash2 size={12} /> Hapus laporan ini
        </button>
      </div>
    </div>
  );
}

// ─── Create Report Modal ───
function CreateReportModal({ storeId, existingReports, onClose, onCreate }: {
  storeId: string;
  existingReports: MonthlyOKRReport[];
  onClose: () => void;
  onCreate: (report: Omit<MonthlyOKRReport, "id" | "createdAt" | "lastUpdated">) => void;
}) {
  const months = generateMonthOptions();
  const [bulanLalu, setBulanLalu] = useState(months[5] || "");
  const [bulanIni, setBulanIni] = useState(months[6] || "");
  const [copyFromPrev, setCopyFromPrev] = useState(false);

  const prevReport = existingReports[0] || null;

  const handleCreate = () => {
    const rows: OKRTableRow[] = DEFAULT_OKR_ROWS.map((tmpl) => {
      let targetBulanLalu: number | null = null;
      let achieveBulanLalu: number | null = null;

      if (copyFromPrev && prevReport) {
        const prevRow = prevReport.rows.find((r) => r.metricKey === tmpl.metricKey);
        if (prevRow) {
          targetBulanLalu = prevRow.targetBulanIni;
          achieveBulanLalu = prevRow.achieveBulanIni;
        }
      }

      return {
        ...tmpl,
        targetBulanLalu,
        achieveBulanLalu,
        targetBulanIni: 0,
        achieveBulanIni: null,
      };
    });

    onCreate({ storeId, bulanLalu, bulanIni, rows });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-md space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg">Buat Laporan Baru</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Bulan Lalu (Referensi)</label>
          <select value={bulanLalu} onChange={(e) => setBulanLalu(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
            {months.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Bulan Ini (Periode Aktif)</label>
          <select value={bulanIni} onChange={(e) => setBulanIni(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
            {months.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        {prevReport && (
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={copyFromPrev} onChange={(e) => setCopyFromPrev(e.target.checked)} className="rounded" />
            <span>Salin achieve dari laporan bulan lalu ({prevReport.bulanIni})</span>
          </label>
        )}
        <button onClick={handleCreate} className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-blue-700">
          Buat Laporan
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// TAB 4: RIWAYAT
// ═══════════════════════════════════════
function TabHistory() {
  const { objectives } = useOKRStore();
  const completed = objectives.filter((o) => o.status === "completed");
  const cancelled = objectives.filter((o) => o.status === "cancelled");

  if (completed.length === 0 && cancelled.length === 0) {
    return <div className="text-center py-16 text-gray-400"><Clock size={40} className="mx-auto mb-3 opacity-30" /><p>Belum ada riwayat OKR.</p></div>;
  }

  return (
    <div className="space-y-4">
      {completed.length > 0 && (
        <div>
          <h3 className="font-bold text-sm mb-3 text-green-700">✅ Completed ({completed.length})</h3>
          <div className="space-y-2">
            {completed.map((obj) => {
              const cfg = DEPARTMENT_CONFIG[obj.department];
              return (
                <div key={obj.id} className="bg-white rounded-xl border p-4 flex items-center gap-3">
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                    {cfg.icon} {cfg.label}
                  </span>
                  <span className="font-medium text-sm flex-1">{obj.title}</span>
                  <span className="text-xs text-gray-400">{new Date(obj.updatedAt).toLocaleDateString("id-ID")}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {cancelled.length > 0 && (
        <div>
          <h3 className="font-bold text-sm mb-3 text-gray-500">❌ Cancelled ({cancelled.length})</h3>
          <div className="space-y-2">
            {cancelled.map((obj) => (
              <div key={obj.id} className="bg-white rounded-xl border p-4 flex items-center gap-3 opacity-60">
                <span className="font-medium text-sm flex-1 line-through">{obj.title}</span>
                <span className="text-xs text-gray-400">{new Date(obj.updatedAt).toLocaleDateString("id-ID")}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════
// TAB 5: AI GENERATOR
// ═══════════════════════════════════════
function TabAIGen() {
  const { monthlyReports, getLatestReport } = useOKRStore();
  const { stores, getActiveStore } = useStoreManager();
  const activeStore = getActiveStore();
  const latestReport = activeStore ? getLatestReport(activeStore.id) : null;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border p-6">
        <h3 className="font-bold text-lg mb-2 flex items-center gap-2"><Sparkles size={20} className="text-purple-600" /> AI OKR Generator</h3>
        <p className="text-sm text-gray-500 mb-4">Gunakan AI untuk menganalisis performa dan generate target OKR yang realistis.</p>

        <div className="space-y-3">
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
            <h4 className="font-semibold text-sm text-purple-800 mb-2">📋 Generate dari Template Laporan</h4>
            {latestReport ? (
              <div className="text-sm text-purple-700 space-y-2">
                <p>Laporan terakhir: <strong>{latestReport.bulanIni}</strong></p>
                <p className="text-xs text-purple-600">
                  AI akan menganalisis achieve bulan lalu dan merekomendasikan target bulan ini yang naik 10-30% untuk metrik tercapai, dan setara/sedikit di atas untuk yang tidak tercapai.
                </p>
                <div className="bg-white rounded-lg p-3 text-xs font-mono text-gray-700 max-h-48 overflow-y-auto">
                  <p className="font-bold mb-1">ACHIEVE BULAN LALU ({latestReport.bulanIni}):</p>
                  {(["konseptor", "smo", "advertiser", "affiliate"] as OKRDepartment[]).map((dept) => {
                    const cfg = DEPARTMENT_CONFIG[dept];
                    const rows = latestReport.rows.filter((r) => r.parameter === dept);
                    return (
                      <div key={dept} className="mb-1">
                        <span style={{ color: cfg.color }}>{cfg.icon} {cfg.label.toUpperCase()}:</span>{" "}
                        {rows.map((r) => `${r.metric}=${fmtVal(r.achieveBulanIni, r.satuan)}`).join(", ")}
                      </div>
                    );
                  })}
                </div>
                <p className="text-[10px] text-purple-500 mt-2">💡 Copy context di atas ke AI Assistant (panel kanan) untuk generate target bulan depan.</p>
              </div>
            ) : (
              <p className="text-sm text-purple-600">Belum ada laporan bulanan. Buat laporan di tab &quot;📋 Laporan Bulanan&quot; terlebih dahulu.</p>
            )}
          </div>

          <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
            <h4 className="font-semibold text-sm text-blue-800 mb-2">🎯 Tips Penggunaan AI</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Gunakan quick action di AI Assistant untuk analisis performa per departemen</li>
              <li>• Tanyakan &quot;Target bulan depan yang realistis&quot; untuk rekomendasi AI</li>
              <li>• Minta AI membandingkan performa antar departemen</li>
              <li>• Gunakan AI untuk identifikasi metrik yang konsisten terlampaui</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
