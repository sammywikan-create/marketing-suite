"use client";
import { useEffect, useState, useMemo } from "react";
import { FunnelTMBItem } from "@/lib/types";
import { getItems, SEEDS, addItem, updateItem, deleteItem } from "@/lib/store";
import PageHeader from "@/components/PageHeader";
import Modal, { FormField, inputClass, selectClass, btnPrimary, btnSecondary } from "@/components/Modal";
import StatusBadge from "@/components/StatusBadge";
import { Layers, Eye, Pencil, Trash2, ChevronDown } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell,
} from "recharts";

const STORE_KEY = "funnelTmb";
const STAGES: FunnelTMBItem["stage"][] = ["TOFU", "MOFU", "BOFU"];
const CHANNELS = ["TikTok Ads", "Instagram Reels", "Facebook Ads", "YouTube", "Google Ads", "Website Blog", "Email Nurture", "Retargeting Ads", "SEO"];

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 }) + "M";
  if (n >= 1_000) return (n / 1_000).toLocaleString("id-ID", { maximumFractionDigits: 1 }) + "K";
  return n.toLocaleString("id-ID");
}

const stageInfo: Record<string, { color: string; bgColor: string; desc: string; hex: string; bg: string }> = {
  TOFU: { color: "text-blue-700", bgColor: "bg-blue-50 border-blue-200", desc: "Top of Funnel — Awareness & Reach", hex: "#3b82f6", bg: "bg-blue-500" },
  MOFU: { color: "text-purple-700", bgColor: "bg-purple-50 border-purple-200", desc: "Middle of Funnel — Consideration & Engagement", hex: "#8b5cf6", bg: "bg-purple-500" },
  BOFU: { color: "text-orange-700", bgColor: "bg-orange-50 border-orange-200", desc: "Bottom of Funnel — Conversion & Purchase", hex: "#f97316", bg: "bg-orange-500" },
};

export default function TOFUMOFUBOFUScreen() {
  const [items, setItems] = useState<FunnelTMBItem[]>([]);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<"add" | "edit" | "view" | null>(null);
  const [selected, setSelected] = useState<FunnelTMBItem | null>(null);
  const [form, setForm] = useState<Partial<FunnelTMBItem>>({});

  useEffect(() => { setItems(getItems(STORE_KEY, SEEDS.funnelTmb)); }, []);

  const filtered = items.filter(i =>
    i.channel.toLowerCase().includes(search.toLowerCase()) ||
    i.metrik.toLowerCase().includes(search.toLowerCase())
  );

  const funnelAgg = useMemo(() => {
    return STAGES.map(stage => {
      const si = items.filter(i => i.stage === stage);
      return {
        stage,
        target: si.reduce((s, i) => s + i.target, 0),
        aktual: si.reduce((s, i) => s + i.aktual, 0),
        avgConv: si.length > 0 ? si.reduce((s, i) => s + i.conversionRate, 0) / si.length : 0,
        count: si.length,
      };
    });
  }, [items]);

  const chartData = useMemo(() => funnelAgg.map(d => ({
    name: d.stage, Target: d.target, Aktual: d.aktual, fill: stageInfo[d.stage].hex,
  })), [funnelAgg]);

  function openAdd() {
    setForm({ stage: "TOFU", channel: "TikTok Ads", metrik: "", target: 0, aktual: 0, conversionRate: 0, periode: "", catatan: "" });
    setModal("add");
  }
  function openEdit(item: FunnelTMBItem) { setForm({ ...item }); setSelected(item); setModal("edit"); }
  function openView(item: FunnelTMBItem) { setSelected(item); setModal("view"); }
  function handleSave() {
    if (!form.metrik) return;
    if (modal === "add") setItems(addItem(STORE_KEY, items, form as Omit<FunnelTMBItem, "id">));
    else if (modal === "edit" && selected) setItems(updateItem(STORE_KEY, items, { ...selected, ...form } as FunnelTMBItem));
    setModal(null);
  }
  function handleDelete(id: string) { if (confirm("Hapus item ini?")) setItems(deleteItem(STORE_KEY, items, id)); }

  return (
    <div className="space-y-5">
      <PageHeader title="TOFU · MOFU · BOFU" icon={<Layers size={20} />} count={items.length} onAdd={openAdd} addLabel="Tambah Data" search={search} onSearch={setSearch} />

      {/* Visual Funnel */}
      <div className="bg-white rounded-xl border p-5">
        <h3 className="text-sm font-semibold mb-4">Visualisasi Funnel</h3>
        <div className="max-w-lg mx-auto space-y-1">
          {funnelAgg.map((d, i) => {
            const maxVal = Math.max(...funnelAgg.map(f => f.aktual), 1);
            const widthPct = Math.max(25, (d.aktual / maxVal) * 100);
            const pct = d.target > 0 ? (d.aktual / d.target * 100) : 0;
            const prevAktual = i > 0 ? funnelAgg[i - 1].aktual : 0;
            const convRate = prevAktual > 0 ? (d.aktual / prevAktual * 100) : 0;
            return (
              <div key={d.stage}>
                {i > 0 && (
                  <div className="flex items-center justify-center gap-1 py-0.5 text-[10px] text-gray-400">
                    <ChevronDown size={12} /> {convRate.toFixed(1)}% drop-off
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <div className="w-14 text-right text-xs font-bold" style={{ color: stageInfo[d.stage].hex }}>{d.stage}</div>
                  <div className="flex-1">
                    <div className={`${stageInfo[d.stage].bg} rounded-lg py-2.5 px-3 text-white text-xs font-bold flex justify-between transition-all`} style={{ width: `${widthPct}%` }}>
                      <span>{fmt(d.aktual)}</span>
                      <span className="opacity-75">{Math.round(pct)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Target vs Actual Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border p-5">
          <h3 className="text-sm font-semibold mb-3">Target vs Aktual Per Stage</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => fmt(v)} />
              <Tooltip formatter={(v) => fmt(Number(v))} />
              <Legend />
              <Bar dataKey="Target" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Aktual" radius={[4, 4, 0, 0]}>
                {chartData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border p-5">
          <h3 className="text-sm font-semibold mb-3">Summary Per Stage</h3>
          <div className="space-y-3">
            {funnelAgg.map(d => {
              const pct = d.target > 0 ? (d.aktual / d.target * 100) : 0;
              return (
                <div key={d.stage} className="rounded-lg p-3 border" style={{ borderLeftWidth: 4, borderLeftColor: stageInfo[d.stage].hex }}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-bold" style={{ color: stageInfo[d.stage].hex }}>{d.stage}</span>
                    <span className="text-xs text-gray-400">{d.count} metrik · avg conv {d.avgConv.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500">Aktual: {fmt(d.aktual)}</span>
                    <span className="text-gray-500">Target: {fmt(d.target)}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: stageInfo[d.stage].hex }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {STAGES.map(stage => {
        const stageItems = filtered.filter(i => i.stage === stage);
        const info = stageInfo[stage];
        return (
          <div key={stage} className="mb-6">
            <div className={`rounded-xl p-4 mb-3 border ${info.bgColor}`}>
              <div className="flex items-center gap-2">
                <StatusBadge value={stage} />
                <span className={`text-sm font-medium ${info.color}`}>{info.desc}</span>
              </div>
            </div>
            {stageItems.length > 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-50 border-b border-border">
                    <th className="text-left px-4 py-3 font-semibold text-muted">Channel</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted">Metrik</th>
                    <th className="text-right px-4 py-3 font-semibold text-muted">Target</th>
                    <th className="text-right px-4 py-3 font-semibold text-muted">Aktual</th>
                    <th className="text-right px-4 py-3 font-semibold text-muted">Conv. Rate</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted">Periode</th>
                    <th className="text-right px-4 py-3 font-semibold text-muted">Aksi</th>
                  </tr></thead>
                  <tbody>
                    {stageItems.map(item => {
                      const pct = item.target > 0 ? (item.aktual / item.target * 100) : 0;
                      return (
                        <tr key={item.id} className="border-b border-border hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 font-medium">{item.channel}</td>
                          <td className="px-4 py-3 text-muted">{item.metrik}</td>
                          <td className="px-4 py-3 text-right">{fmt(item.target)}</td>
                          <td className="px-4 py-3 text-right">
                            <span className={pct >= 80 ? "text-green-600 font-medium" : pct >= 50 ? "text-yellow-600" : "text-red-600"}>{fmt(item.aktual)}</span>
                          </td>
                          <td className="px-4 py-3 text-right font-medium">{item.conversionRate}%</td>
                          <td className="px-4 py-3 text-muted">{item.periode}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-1">
                              <button onClick={() => openView(item)} className="p-1.5 rounded hover:bg-gray-100 text-muted"><Eye size={15} /></button>
                              <button onClick={() => openEdit(item)} className="p-1.5 rounded hover:bg-gray-100 text-muted"><Pencil size={15} /></button>
                              <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded hover:bg-red-50 text-danger"><Trash2 size={15} /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted text-center py-4">Tidak ada data untuk stage ini</p>
            )}
          </div>
        );
      })}

      <Modal open={modal === "view"} onClose={() => setModal(null)} title="Detail Funnel">
        {selected && (
          <div className="space-y-3">
            <div className="flex gap-2"><StatusBadge value={selected.stage} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-xs text-muted">Channel</span><p className="font-medium">{selected.channel}</p></div>
              <div><span className="text-xs text-muted">Metrik</span><p>{selected.metrik}</p></div>
              <div><span className="text-xs text-muted">Target</span><p className="font-semibold">{fmt(selected.target)}</p></div>
              <div><span className="text-xs text-muted">Aktual</span><p className="font-semibold">{fmt(selected.aktual)}</p></div>
              <div><span className="text-xs text-muted">Conversion Rate</span><p className="font-semibold">{selected.conversionRate}%</p></div>
              <div><span className="text-xs text-muted">Periode</span><p>{selected.periode}</p></div>
            </div>
            <div><span className="text-xs text-muted">Catatan</span><p className="text-sm">{selected.catatan || "-"}</p></div>
          </div>
        )}
      </Modal>

      <Modal open={modal === "add" || modal === "edit"} onClose={() => setModal(null)} title={modal === "add" ? "Tambah Data Funnel" : "Edit Data Funnel"}>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Stage"><select className={selectClass} value={form.stage || ""} onChange={e => setForm({ ...form, stage: e.target.value as FunnelTMBItem["stage"] })}>{STAGES.map(o => <option key={o}>{o}</option>)}</select></FormField>
          <FormField label="Channel"><select className={selectClass} value={form.channel || ""} onChange={e => setForm({ ...form, channel: e.target.value })}>{CHANNELS.map(o => <option key={o}>{o}</option>)}</select></FormField>
        </div>
        <FormField label="Metrik"><input className={inputClass} value={form.metrik || ""} onChange={e => setForm({ ...form, metrik: e.target.value })} placeholder="e.g. Impressions, Page Views" /></FormField>
        <div className="grid grid-cols-3 gap-3">
          <FormField label="Target"><input type="number" className={inputClass} value={form.target || 0} onChange={e => setForm({ ...form, target: Number(e.target.value) })} /></FormField>
          <FormField label="Aktual"><input type="number" className={inputClass} value={form.aktual || 0} onChange={e => setForm({ ...form, aktual: Number(e.target.value) })} /></FormField>
          <FormField label="Conv. Rate %"><input type="number" step="0.1" className={inputClass} value={form.conversionRate || 0} onChange={e => setForm({ ...form, conversionRate: Number(e.target.value) })} /></FormField>
        </div>
        <FormField label="Periode"><input className={inputClass} value={form.periode || ""} onChange={e => setForm({ ...form, periode: e.target.value })} placeholder="e.g. April 2026" /></FormField>
        <FormField label="Catatan"><textarea className={inputClass + " h-16"} value={form.catatan || ""} onChange={e => setForm({ ...form, catatan: e.target.value })} /></FormField>
        <div className="flex gap-2 mt-4">
          <button onClick={handleSave} className={btnPrimary}>Simpan</button>
          <button onClick={() => setModal(null)} className={btnSecondary}>Batal</button>
        </div>
      </Modal>
    </div>
  );
}
