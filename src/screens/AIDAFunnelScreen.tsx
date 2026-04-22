"use client";
import { useEffect, useState, useMemo } from "react";
import { AIDAItem } from "@/lib/types";
import { getItems, SEEDS, addItem, updateItem, deleteItem } from "@/lib/store";
import PageHeader from "@/components/PageHeader";
import Modal, { FormField, inputClass, selectClass, btnPrimary, btnSecondary } from "@/components/Modal";
import StatusBadge from "@/components/StatusBadge";
import { Filter, Eye, Pencil, Trash2, ChevronDown } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell,
} from "recharts";

const STORE_KEY = "aida";
const TAHAP: AIDAItem["tahap"][] = ["Attention", "Interest", "Desire", "Action"];
const CHANNELS = ["TikTok Ads", "Instagram", "Facebook", "YouTube", "Google Ads", "Email", "Website", "E-commerce", "Multi-channel", "All"];

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 }) + "M";
  if (n >= 1_000) return (n / 1_000).toLocaleString("id-ID", { maximumFractionDigits: 1 }) + "K";
  return n.toLocaleString("id-ID");
}

const stageColors: Record<string, string> = {
  Attention: "border-l-blue-500 bg-blue-50/30",
  Interest: "border-l-cyan-500 bg-cyan-50/30",
  Desire: "border-l-purple-500 bg-purple-50/30",
  Action: "border-l-green-500 bg-green-50/30",
};

const STAGE_HEX: Record<string, string> = { Attention: "#3b82f6", Interest: "#06b6d4", Desire: "#8b5cf6", Action: "#10b981" };
const STAGE_BG: Record<string, string> = { Attention: "bg-blue-500", Interest: "bg-cyan-500", Desire: "bg-purple-500", Action: "bg-green-500" };

export default function AIDAFunnelScreen() {
  const [items, setItems] = useState<AIDAItem[]>([]);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<"add" | "edit" | "view" | null>(null);
  const [selected, setSelected] = useState<AIDAItem | null>(null);
  const [form, setForm] = useState<Partial<AIDAItem>>({});

  useEffect(() => { setItems(getItems(STORE_KEY, SEEDS.aida)); }, []);

  const filtered = items.filter(i =>
    i.metrik.toLowerCase().includes(search.toLowerCase()) ||
    i.channel.toLowerCase().includes(search.toLowerCase())
  );

  const funnelData = useMemo(() => {
    return TAHAP.map(stage => {
      const si = items.filter(i => i.tahap === stage);
      return { stage, target: si.reduce((s, i) => s + i.target, 0), aktual: si.reduce((s, i) => s + i.aktual, 0), count: si.length };
    });
  }, [items]);

  const chartData = useMemo(() => funnelData.map(d => ({
    name: d.stage, Target: d.target, Aktual: d.aktual, fill: STAGE_HEX[d.stage],
  })), [funnelData]);

  function openAdd() {
    setForm({ tahap: "Attention", metrik: "", target: 0, aktual: 0, satuan: "", channel: "TikTok Ads", periode: "" });
    setModal("add");
  }
  function openEdit(item: AIDAItem) { setForm({ ...item }); setSelected(item); setModal("edit"); }
  function openView(item: AIDAItem) { setSelected(item); setModal("view"); }
  function handleSave() {
    if (!form.metrik) return;
    if (modal === "add") setItems(addItem(STORE_KEY, items, form as Omit<AIDAItem, "id">));
    else if (modal === "edit" && selected) setItems(updateItem(STORE_KEY, items, { ...selected, ...form } as AIDAItem));
    setModal(null);
  }
  function handleDelete(id: string) { if (confirm("Hapus item ini?")) setItems(deleteItem(STORE_KEY, items, id)); }

  return (
    <div className="space-y-5">
      <PageHeader title="AIDA Funnel" icon={<Filter size={20} />} count={items.length} onAdd={openAdd} addLabel="Tambah Metrik" search={search} onSearch={setSearch} />

      {/* Visual Funnel */}
      <div className="bg-white rounded-xl border p-5">
        <h3 className="text-sm font-semibold mb-4">Visualisasi Funnel AIDA</h3>
        <div className="max-w-lg mx-auto space-y-1">
          {funnelData.map((d, i) => {
            const maxVal = Math.max(...funnelData.map(f => f.aktual), 1);
            const widthPct = Math.max(20, (d.aktual / maxVal) * 100);
            const pct = d.target > 0 ? (d.aktual / d.target * 100) : 0;
            const prevAktual = i > 0 ? funnelData[i - 1].aktual : 0;
            const convRate = prevAktual > 0 ? (d.aktual / prevAktual * 100) : 0;
            return (
              <div key={d.stage}>
                {i > 0 && (
                  <div className="flex items-center justify-center gap-1 py-0.5 text-[10px] text-gray-400">
                    <ChevronDown size={12} /> {convRate.toFixed(1)}% conversion
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <div className="w-20 text-right text-xs font-semibold" style={{ color: STAGE_HEX[d.stage] }}>{d.stage}</div>
                  <div className="flex-1">
                    <div className={`${STAGE_BG[d.stage]} rounded-lg py-2.5 px-3 text-white text-xs font-bold flex justify-between transition-all`} style={{ width: `${widthPct}%` }}>
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
      <div className="bg-white rounded-xl border p-5">
        <h3 className="text-sm font-semibold mb-3">Target vs Aktual Per Stage</h3>
        <ResponsiveContainer width="100%" height={260}>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {funnelData.map(d => {
          const pct = d.target > 0 ? (d.aktual / d.target * 100) : 0;
          return (
            <div key={d.stage} className="bg-white rounded-xl p-4 shadow-sm border border-border">
              <StatusBadge value={d.stage} />
              <p className="text-2xl font-bold mt-2">{fmt(d.aktual)}</p>
              <p className="text-xs text-muted">Target: {fmt(d.target)} ({Math.round(pct)}%)</p>
              <div className="h-1.5 bg-gray-100 rounded-full mt-2 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: STAGE_HEX[d.stage] }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail List */}
      {TAHAP.map(stage => {
        const stageItems = filtered.filter(i => i.tahap === stage);
        if (stageItems.length === 0) return null;
        return (
          <div key={stage} className="mb-4">
            <h3 className="font-semibold mb-2 flex items-center gap-2"><StatusBadge value={stage} /> <span className="text-sm text-muted">{stageItems.length} metrik</span></h3>
            <div className="space-y-2">
              {stageItems.map(item => {
                const pct = item.target > 0 ? (item.aktual / item.target * 100) : 0;
                return (
                  <div key={item.id} className={`bg-white rounded-lg p-4 shadow-sm border border-border border-l-4 ${stageColors[item.tahap]}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <h4 className="font-medium">{item.metrik}</h4>
                          <span className="text-xs text-muted bg-gray-100 px-2 py-0.5 rounded-full">{item.channel}</span>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm">
                          <span className="text-muted">Target: <strong>{fmt(item.target)} {item.satuan}</strong></span>
                          <span className="text-muted">Aktual: <strong>{fmt(item.aktual)} {item.satuan}</strong></span>
                          <span className={`font-semibold ${pct >= 80 ? "text-green-600" : pct >= 50 ? "text-yellow-600" : "text-red-600"}`}>{Math.round(pct)}%</span>
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => openView(item)} className="p-1.5 rounded hover:bg-gray-100 text-muted"><Eye size={15} /></button>
                        <button onClick={() => openEdit(item)} className="p-1.5 rounded hover:bg-gray-100 text-muted"><Pencil size={15} /></button>
                        <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded hover:bg-red-50 text-danger"><Trash2 size={15} /></button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <Modal open={modal === "view"} onClose={() => setModal(null)} title="Detail Metrik AIDA">
        {selected && (
          <div className="space-y-3">
            <div className="flex gap-2"><StatusBadge value={selected.tahap} /></div>
            <div><span className="text-xs text-muted">Metrik</span><p className="font-medium">{selected.metrik}</p></div>
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-xs text-muted">Target</span><p className="font-semibold">{fmt(selected.target)} {selected.satuan}</p></div>
              <div><span className="text-xs text-muted">Aktual</span><p className="font-semibold">{fmt(selected.aktual)} {selected.satuan}</p></div>
              <div><span className="text-xs text-muted">Channel</span><p>{selected.channel}</p></div>
              <div><span className="text-xs text-muted">Periode</span><p>{selected.periode}</p></div>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={modal === "add" || modal === "edit"} onClose={() => setModal(null)} title={modal === "add" ? "Tambah Metrik" : "Edit Metrik"}>
        <FormField label="Tahap AIDA"><select className={selectClass} value={form.tahap || ""} onChange={e => setForm({ ...form, tahap: e.target.value as AIDAItem["tahap"] })}>{TAHAP.map(o => <option key={o}>{o}</option>)}</select></FormField>
        <FormField label="Metrik"><input className={inputClass} value={form.metrik || ""} onChange={e => setForm({ ...form, metrik: e.target.value })} placeholder="e.g. Impressions, CTR, Conversions" /></FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Target"><input type="number" className={inputClass} value={form.target || 0} onChange={e => setForm({ ...form, target: Number(e.target.value) })} /></FormField>
          <FormField label="Aktual"><input type="number" className={inputClass} value={form.aktual || 0} onChange={e => setForm({ ...form, aktual: Number(e.target.value) })} /></FormField>
          <FormField label="Satuan"><input className={inputClass} value={form.satuan || ""} onChange={e => setForm({ ...form, satuan: e.target.value })} placeholder="Views, %, Orders..." /></FormField>
          <FormField label="Channel"><select className={selectClass} value={form.channel || ""} onChange={e => setForm({ ...form, channel: e.target.value })}>{CHANNELS.map(o => <option key={o}>{o}</option>)}</select></FormField>
        </div>
        <FormField label="Periode"><input className={inputClass} value={form.periode || ""} onChange={e => setForm({ ...form, periode: e.target.value })} placeholder="e.g. April 2026" /></FormField>
        <div className="flex gap-2 mt-4">
          <button onClick={handleSave} className={btnPrimary}>Simpan</button>
          <button onClick={() => setModal(null)} className={btnSecondary}>Batal</button>
        </div>
      </Modal>
    </div>
  );
}
