"use client";
import { useEffect, useState } from "react";
import { AnalisisTMBItem } from "@/lib/types";
import { getItems, SEEDS, addItem, updateItem, deleteItem } from "@/lib/store";
import PageHeader from "@/components/PageHeader";
import Modal, { FormField, inputClass, selectClass, btnPrimary, btnSecondary } from "@/components/Modal";
import StatusBadge from "@/components/StatusBadge";
import { BarChart3, Eye, Pencil, Trash2 } from "lucide-react";

const STORE_KEY = "analisisTmb";
const STAGES: AnalisisTMBItem["stage"][] = ["TOFU", "MOFU", "BOFU"];
const CHANNELS = ["TikTok Ads", "Instagram", "Facebook", "YouTube", "Google Ads", "Email", "Retargeting", "SEO"];

function fmtRp(n: number) { return "Rp " + n.toLocaleString("id-ID"); }
function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 }) + "M";
  if (n >= 1_000) return (n / 1_000).toLocaleString("id-ID", { maximumFractionDigits: 1 }) + "K";
  return n.toLocaleString("id-ID");
}

export default function AnalisisTMBScreen() {
  const [items, setItems] = useState<AnalisisTMBItem[]>([]);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<"add" | "edit" | "view" | null>(null);
  const [selected, setSelected] = useState<AnalisisTMBItem | null>(null);
  const [form, setForm] = useState<Partial<AnalisisTMBItem>>({});

  useEffect(() => { setItems(getItems(STORE_KEY, SEEDS.analisisTmb)); }, []);

  const filtered = items.filter(i =>
    i.channel.toLowerCase().includes(search.toLowerCase()) ||
    i.periode.toLowerCase().includes(search.toLowerCase())
  );

  // Aggregate per stage
  const stageAgg = STAGES.map(stage => {
    const stageItems = items.filter(i => i.stage === stage);
    return {
      stage,
      impressions: stageItems.reduce((s, i) => s + i.impressions, 0),
      clicks: stageItems.reduce((s, i) => s + i.clicks, 0),
      leads: stageItems.reduce((s, i) => s + i.leads, 0),
      konversi: stageItems.reduce((s, i) => s + i.konversi, 0),
      revenue: stageItems.reduce((s, i) => s + i.revenue, 0),
      avgCPA: stageItems.length > 0 ? stageItems.reduce((s, i) => s + i.cpa, 0) / stageItems.length : 0,
      avgROAS: stageItems.length > 0 ? stageItems.reduce((s, i) => s + i.roas, 0) / stageItems.length : 0,
    };
  });

  function openAdd() {
    setForm({ periode: "", stage: "TOFU", channel: "TikTok Ads", impressions: 0, clicks: 0, leads: 0, konversi: 0, revenue: 0, cpa: 0, roas: 0, catatan: "" });
    setModal("add");
  }
  function openEdit(item: AnalisisTMBItem) { setForm({ ...item }); setSelected(item); setModal("edit"); }
  function openView(item: AnalisisTMBItem) { setSelected(item); setModal("view"); }
  function handleSave() {
    if (!form.channel) return;
    if (modal === "add") setItems(addItem(STORE_KEY, items, form as Omit<AnalisisTMBItem, "id">));
    else if (modal === "edit" && selected) setItems(updateItem(STORE_KEY, items, { ...selected, ...form } as AnalisisTMBItem));
    setModal(null);
  }
  function handleDelete(id: string) { if (confirm("Hapus data ini?")) setItems(deleteItem(STORE_KEY, items, id)); }

  return (
    <div>
      <PageHeader title="Analisis TMB" icon={<BarChart3 size={20} />} count={items.length} onAdd={openAdd} addLabel="Tambah Analisis" search={search} onSearch={setSearch} />

      {/* Stage Summary Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {stageAgg.map(agg => (
          <div key={agg.stage} className="bg-white rounded-xl p-5 shadow-sm border border-border">
            <div className="flex items-center justify-between mb-3">
              <StatusBadge value={agg.stage} />
              <span className="text-lg font-bold text-green-600">{fmtRp(agg.revenue)}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div>
                <p className="text-xs text-muted">Impressions</p>
                <p className="font-semibold">{fmt(agg.impressions)}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Clicks</p>
                <p className="font-semibold">{fmt(agg.clicks)}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Leads</p>
                <p className="font-semibold">{fmt(agg.leads)}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Konversi</p>
                <p className="font-semibold">{fmt(agg.konversi)}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Avg CPA</p>
                <p className="font-semibold">{fmtRp(Math.round(agg.avgCPA))}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Avg ROAS</p>
                <p className="font-semibold text-primary">{agg.avgROAS.toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}x</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Detail Table */}
      <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b border-border">
              <th className="text-left px-4 py-3 font-semibold text-muted">Periode</th>
              <th className="text-left px-4 py-3 font-semibold text-muted">Stage</th>
              <th className="text-left px-4 py-3 font-semibold text-muted">Channel</th>
              <th className="text-right px-4 py-3 font-semibold text-muted">Impr.</th>
              <th className="text-right px-4 py-3 font-semibold text-muted">Clicks</th>
              <th className="text-right px-4 py-3 font-semibold text-muted">Leads</th>
              <th className="text-right px-4 py-3 font-semibold text-muted">Conv.</th>
              <th className="text-right px-4 py-3 font-semibold text-muted">Revenue</th>
              <th className="text-right px-4 py-3 font-semibold text-muted">CPA</th>
              <th className="text-right px-4 py-3 font-semibold text-muted">ROAS</th>
              <th className="text-right px-4 py-3 font-semibold text-muted">Aksi</th>
            </tr></thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id} className="border-b border-border hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-muted">{item.periode}</td>
                  <td className="px-4 py-3"><StatusBadge value={item.stage} /></td>
                  <td className="px-4 py-3 font-medium">{item.channel}</td>
                  <td className="px-4 py-3 text-right text-muted">{fmt(item.impressions)}</td>
                  <td className="px-4 py-3 text-right text-muted">{fmt(item.clicks)}</td>
                  <td className="px-4 py-3 text-right text-muted">{fmt(item.leads)}</td>
                  <td className="px-4 py-3 text-right font-medium">{fmt(item.konversi)}</td>
                  <td className="px-4 py-3 text-right font-medium text-green-600">{fmtRp(item.revenue)}</td>
                  <td className="px-4 py-3 text-right">{fmtRp(item.cpa)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-primary">{item.roas}x</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openView(item)} className="p-1.5 rounded hover:bg-gray-100 text-muted"><Eye size={15} /></button>
                      <button onClick={() => openEdit(item)} className="p-1.5 rounded hover:bg-gray-100 text-muted"><Pencil size={15} /></button>
                      <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded hover:bg-red-50 text-danger"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={11} className="px-4 py-8 text-center text-muted">Tidak ada data</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modal === "view"} onClose={() => setModal(null)} title="Detail Analisis TMB" wide>
        {selected && (
          <div className="space-y-3">
            <div className="flex gap-2 mb-3"><StatusBadge value={selected.stage} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><span className="text-xs text-muted">Periode</span><p className="font-medium">{selected.periode}</p></div>
              <div><span className="text-xs text-muted">Channel</span><p className="font-medium">{selected.channel}</p></div>
              <div><span className="text-xs text-muted">Revenue</span><p className="font-semibold text-green-600">{fmtRp(selected.revenue)}</p></div>
              <div><span className="text-xs text-muted">Impressions</span><p>{fmt(selected.impressions)}</p></div>
              <div><span className="text-xs text-muted">Clicks</span><p>{fmt(selected.clicks)}</p></div>
              <div><span className="text-xs text-muted">Leads</span><p>{fmt(selected.leads)}</p></div>
              <div><span className="text-xs text-muted">Konversi</span><p className="font-semibold">{fmt(selected.konversi)}</p></div>
              <div><span className="text-xs text-muted">CPA</span><p>{fmtRp(selected.cpa)}</p></div>
              <div><span className="text-xs text-muted">ROAS</span><p className="font-semibold text-primary">{selected.roas}x</p></div>
            </div>
            <div><span className="text-xs text-muted">Catatan</span><p className="text-sm">{selected.catatan || "-"}</p></div>
          </div>
        )}
      </Modal>

      <Modal open={modal === "add" || modal === "edit"} onClose={() => setModal(null)} title={modal === "add" ? "Tambah Analisis" : "Edit Analisis"} wide>
        <div className="grid grid-cols-3 gap-3">
          <FormField label="Periode"><input className={inputClass} value={form.periode || ""} onChange={e => setForm({ ...form, periode: e.target.value })} placeholder="e.g. Q1 2026" /></FormField>
          <FormField label="Stage"><select className={selectClass} value={form.stage || ""} onChange={e => setForm({ ...form, stage: e.target.value as AnalisisTMBItem["stage"] })}>{STAGES.map(o => <option key={o}>{o}</option>)}</select></FormField>
          <FormField label="Channel"><select className={selectClass} value={form.channel || ""} onChange={e => setForm({ ...form, channel: e.target.value })}>{CHANNELS.map(o => <option key={o}>{o}</option>)}</select></FormField>
          <FormField label="Impressions"><input type="number" className={inputClass} value={form.impressions || 0} onChange={e => setForm({ ...form, impressions: Number(e.target.value) })} /></FormField>
          <FormField label="Clicks"><input type="number" className={inputClass} value={form.clicks || 0} onChange={e => setForm({ ...form, clicks: Number(e.target.value) })} /></FormField>
          <FormField label="Leads"><input type="number" className={inputClass} value={form.leads || 0} onChange={e => setForm({ ...form, leads: Number(e.target.value) })} /></FormField>
          <FormField label="Konversi"><input type="number" className={inputClass} value={form.konversi || 0} onChange={e => setForm({ ...form, konversi: Number(e.target.value) })} /></FormField>
          <FormField label="Revenue"><input type="number" className={inputClass} value={form.revenue || 0} onChange={e => setForm({ ...form, revenue: Number(e.target.value) })} /></FormField>
          <FormField label="CPA"><input type="number" className={inputClass} value={form.cpa || 0} onChange={e => setForm({ ...form, cpa: Number(e.target.value) })} /></FormField>
          <FormField label="ROAS"><input type="number" step="0.1" className={inputClass} value={form.roas || 0} onChange={e => setForm({ ...form, roas: Number(e.target.value) })} /></FormField>
        </div>
        <FormField label="Catatan"><textarea className={inputClass + " h-16"} value={form.catatan || ""} onChange={e => setForm({ ...form, catatan: e.target.value })} /></FormField>
        <div className="flex gap-2 mt-4">
          <button onClick={handleSave} className={btnPrimary}>Simpan</button>
          <button onClick={() => setModal(null)} className={btnSecondary}>Batal</button>
        </div>
      </Modal>
    </div>
  );
}
