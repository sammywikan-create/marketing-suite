"use client";
import { useEffect, useState } from "react";
import { AIDAItem } from "@/lib/types";
import { getItems, SEEDS, addItem, updateItem, deleteItem } from "@/lib/store";
import PageHeader from "@/components/PageHeader";
import Modal, { FormField, inputClass, selectClass, btnPrimary, btnSecondary } from "@/components/Modal";
import StatusBadge from "@/components/StatusBadge";
import { Filter, Eye, Pencil, Trash2 } from "lucide-react";

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
    <div>
      <PageHeader title="AIDA Funnel" icon={<Filter size={20} />} count={items.length} onAdd={openAdd} addLabel="Tambah Metrik" search={search} onSearch={setSearch} />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {TAHAP.map(stage => {
          const stageItems = items.filter(i => i.tahap === stage);
          const totalTarget = stageItems.reduce((s, i) => s + i.target, 0);
          const totalAktual = stageItems.reduce((s, i) => s + i.aktual, 0);
          const pct = totalTarget > 0 ? (totalAktual / totalTarget * 100) : 0;
          return (
            <div key={stage} className="bg-white rounded-xl p-4 shadow-sm border border-border">
              <StatusBadge value={stage} />
              <p className="text-2xl font-bold mt-2">{fmt(totalAktual)}</p>
              <p className="text-xs text-muted">Target: {fmt(totalTarget)} ({Math.round(pct)}%)</p>
              <div className="h-1.5 bg-gray-100 rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
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
