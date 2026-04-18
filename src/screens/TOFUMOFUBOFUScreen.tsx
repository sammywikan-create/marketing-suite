"use client";
import { useEffect, useState } from "react";
import { FunnelTMBItem } from "@/lib/types";
import { getItems, SEEDS, addItem, updateItem, deleteItem } from "@/lib/store";
import PageHeader from "@/components/PageHeader";
import Modal, { FormField, inputClass, selectClass, btnPrimary, btnSecondary } from "@/components/Modal";
import StatusBadge from "@/components/StatusBadge";
import { Layers, Eye, Pencil, Trash2 } from "lucide-react";

const STORE_KEY = "funnelTmb";
const STAGES: FunnelTMBItem["stage"][] = ["TOFU", "MOFU", "BOFU"];
const CHANNELS = ["TikTok Ads", "Instagram Reels", "Facebook Ads", "YouTube", "Google Ads", "Website Blog", "Email Nurture", "Retargeting Ads", "SEO"];

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 }) + "M";
  if (n >= 1_000) return (n / 1_000).toLocaleString("id-ID", { maximumFractionDigits: 1 }) + "K";
  return n.toLocaleString("id-ID");
}

const stageInfo: Record<string, { color: string; bgColor: string; desc: string }> = {
  TOFU: { color: "text-blue-700", bgColor: "bg-blue-50 border-blue-200", desc: "Top of Funnel — Awareness & Reach" },
  MOFU: { color: "text-purple-700", bgColor: "bg-purple-50 border-purple-200", desc: "Middle of Funnel — Consideration & Engagement" },
  BOFU: { color: "text-orange-700", bgColor: "bg-orange-50 border-orange-200", desc: "Bottom of Funnel — Conversion & Purchase" },
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
    <div>
      <PageHeader title="TOFU · MOFU · BOFU" icon={<Layers size={20} />} count={items.length} onAdd={openAdd} addLabel="Tambah Data" search={search} onSearch={setSearch} />

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
