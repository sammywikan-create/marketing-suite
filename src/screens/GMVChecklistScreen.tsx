"use client";
import { useEffect, useState } from "react";
import { ClipboardCheck, RotateCcw } from "lucide-react";

type CheckStatus = "BAIK" | "PERHATIAN" | "HARUS_FIX" | "BELUM";

interface CheckItem {
  id: string;
  label: string;
  status: CheckStatus;
}

const weeklyDefaults: Omit<CheckItem, "status">[] = [
  { id: "w1", label: "Review performa campaign harian (CTR, CVR, CPA)" },
  { id: "w2", label: "Cek budget vs spending harian" },
  { id: "w3", label: "Rotasi creative (minimal 3 variasi aktif)" },
  { id: "w4", label: "Monitor ROI per SKU — pause yang BOROS" },
  { id: "w5", label: "Optimasi bid strategy (auto vs manual)" },
  { id: "w6", label: "Review 2-second view rate (target >= 30%)" },
  { id: "w7", label: "Cek dan update targeting audience" },
  { id: "w8", label: "Test hook video baru (minimal 2 variasi)" },
  { id: "w9", label: "Analisis kompetitor (konten & offer)" },
  { id: "w10", label: "Update negative keywords / exclusion" },
  { id: "w11", label: "Review landing page / product page conversion" },
  { id: "w12", label: "Scale winning creative (naikkan budget 20-30%)" },
  { id: "w13", label: "Backup data performa ke spreadsheet" },
  { id: "w14", label: "Weekly report ke tim / management" },
];

const monthlyDefaults: Omit<CheckItem, "status">[] = [
  { id: "m1", label: "Review overall ROI bulan ini vs target" },
  { id: "m2", label: "Analisis TOFU-MOFU-BOFU funnel performance" },
  { id: "m3", label: "Evaluasi KOL / affiliate performance" },
  { id: "m4", label: "Budget reallocation berdasarkan channel performance" },
  { id: "m5", label: "Refresh content calendar bulan depan" },
  { id: "m6", label: "Update benchmark metrics (ROI, CTR, CVR)" },
  { id: "m7", label: "Review customer feedback & sentiment" },
  { id: "m8", label: "Audit semua active campaigns — pause underperformers" },
  { id: "m9", label: "Plan A/B test baru untuk bulan depan" },
  { id: "m10", label: "Monthly report & insights presentation" },
  { id: "m11", label: "Set target KPI bulan depan" },
];

const STORAGE_KEY = "ms_gmv_checklist";

const statusOptions: { value: CheckStatus; label: string; color: string; bg: string }[] = [
  { value: "BELUM", label: "⬜ Belum diisi", color: "text-gray-500", bg: "bg-gray-50" },
  { value: "BAIK", label: "✅ BAIK", color: "text-green-700", bg: "bg-green-50" },
  { value: "PERHATIAN", label: "⚠️ PERHATIAN", color: "text-orange-700", bg: "bg-orange-50" },
  { value: "HARUS_FIX", label: "🔴 HARUS FIX", color: "text-red-700", bg: "bg-red-50" },
];

function getStatusStyle(status: CheckStatus) {
  return statusOptions.find(s => s.value === status) || statusOptions[0];
}

export default function GMVChecklistScreen() {
  const [weekly, setWeekly] = useState<CheckItem[]>([]);
  const [monthly, setMonthly] = useState<CheckItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChecklist();
  }, []);

  async function loadChecklist() {
    try {
      const res = await fetch('/api/gmv-checklist');
      const data = await res.json();
      if (data.weekly && data.weekly.length > 0) {
        setWeekly(data.weekly.map((item: any) => ({
          id: item.item_id,
          label: item.item_text,
          status: item.completed ? "BAIK" as CheckStatus : "BELUM" as CheckStatus,
        })));
      } else {
        setWeekly(weeklyDefaults.map(d => ({ ...d, status: "BELUM" as CheckStatus })));
      }
      if (data.monthly && data.monthly.length > 0) {
        setMonthly(data.monthly.map((item: any) => ({
          id: item.item_id,
          label: item.item_text,
          status: item.completed ? "BAIK" as CheckStatus : "BELUM" as CheckStatus,
        })));
      } else {
        setMonthly(monthlyDefaults.map(d => ({ ...d, status: "BELUM" as CheckStatus })));
      }
    } catch {
      setWeekly(weeklyDefaults.map(d => ({ ...d, status: "BELUM" as CheckStatus })));
      setMonthly(monthlyDefaults.map(d => ({ ...d, status: "BELUM" as CheckStatus })));
    } finally {
      setLoading(false);
    }
  }

  async function save(w: CheckItem[], m: CheckItem[]) {
    try {
      await fetch('/api/gmv-checklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weekly: w.map(item => ({
            item_id: item.id,
            item_text: item.label,
            completed: item.status === "BAIK",
          })),
          monthly: m.map(item => ({
            item_id: item.id,
            item_text: item.label,
            completed: item.status === "BAIK",
          })),
        }),
      });
    } catch {
      console.error('Failed to save checklist to Supabase');
    }
  }

  function updateWeekly(id: string, status: CheckStatus) {
    const updated = weekly.map(i => i.id === id ? { ...i, status } : i);
    setWeekly(updated);
    save(updated, monthly);
  }

  function updateMonthly(id: string, status: CheckStatus) {
    const updated = monthly.map(i => i.id === id ? { ...i, status } : i);
    setMonthly(updated);
    save(weekly, updated);
  }

  function resetAll() {
    if (!confirm("Reset semua checklist? Status akan kembali ke 'Belum diisi'.")) return;
    const w = weeklyDefaults.map(d => ({ ...d, status: "BELUM" as CheckStatus }));
    const m = monthlyDefaults.map(d => ({ ...d, status: "BELUM" as CheckStatus }));
    setWeekly(w);
    setMonthly(m);
    save(w, m);
  }

  const allItems = [...weekly, ...monthly];
  const filled = allItems.filter(i => i.status !== "BELUM").length;
  const total = allItems.length;
  const pct = total > 0 ? (filled / total) * 100 : 0;

  const baikCount = allItems.filter(i => i.status === "BAIK").length;
  const perhatianCount = allItems.filter(i => i.status === "PERHATIAN").length;
  const fixCount = allItems.filter(i => i.status === "HARUS_FIX").length;

  function ChecklistTable({ items, onChange }: { items: CheckItem[]; onChange: (id: string, status: CheckStatus) => void }) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 border-b border-border">
            <th className="text-left px-4 py-3 font-semibold text-muted w-8">#</th>
            <th className="text-left px-4 py-3 font-semibold text-muted">Item</th>
            <th className="text-left px-4 py-3 font-semibold text-muted w-48">Status</th>
          </tr></thead>
          <tbody>
            {items.map((item, i) => {
              const style = getStatusStyle(item.status);
              return (
                <tr key={item.id} className={`border-b border-border ${style.bg} transition-colors`}>
                  <td className="px-4 py-3 text-muted">{i + 1}</td>
                  <td className="px-4 py-3">{item.label}</td>
                  <td className="px-4 py-3">
                    <select
                      value={item.status}
                      onChange={e => onChange(item.id, e.target.value as CheckStatus)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border-0 ${style.color} ${style.bg} cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20`}
                    >
                      {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary"><ClipboardCheck size={20} /></div>
          <div>
            <h1 className="text-xl font-bold">Checklist Evaluasi</h1>
            <p className="text-sm text-muted">{filled}/{total} item sudah diisi</p>
          </div>
        </div>
        <button onClick={resetAll} className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-muted rounded-lg text-sm hover:bg-gray-200 transition-colors">
          <RotateCcw size={14} /> Reset Checklist
        </button>
      </div>

      {/* Progress */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-border mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Progress Checklist</span>
          <span className="text-sm font-bold">{Math.round(pct)}%</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-3">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="grid grid-cols-4 gap-3 text-center text-xs">
          <div className="bg-green-50 rounded-lg p-2"><p className="font-bold text-green-700">{baikCount}</p><p className="text-muted">✅ Baik</p></div>
          <div className="bg-orange-50 rounded-lg p-2"><p className="font-bold text-orange-700">{perhatianCount}</p><p className="text-muted">⚠️ Perhatian</p></div>
          <div className="bg-red-50 rounded-lg p-2"><p className="font-bold text-red-700">{fixCount}</p><p className="text-muted">🔴 Harus Fix</p></div>
          <div className="bg-gray-50 rounded-lg p-2"><p className="font-bold text-gray-500">{total - filled}</p><p className="text-muted">⬜ Belum</p></div>
        </div>
      </div>

      {/* Weekly */}
      <h2 className="text-lg font-bold mb-3">📅 Checklist Mingguan ({weekly.length} item)</h2>
      <div className="mb-8">
        <ChecklistTable items={weekly} onChange={updateWeekly} />
      </div>

      {/* Monthly */}
      <h2 className="text-lg font-bold mb-3">📆 Checklist Bulanan ({monthly.length} item)</h2>
      <ChecklistTable items={monthly} onChange={updateMonthly} />
    </div>
  );
}
