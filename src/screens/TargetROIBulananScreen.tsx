"use client";
import { useEffect, useState } from "react";
import { TargetBulananItem } from "@/lib/types";
import { getItems, SEEDS, addItem, updateItem, deleteItem } from "@/lib/store";
import PageHeader from "@/components/PageHeader";
import Modal, { FormField, inputClass, btnPrimary, btnSecondary } from "@/components/Modal";
import { CalendarCheck, Eye, Pencil, Trash2, TrendingUp, TrendingDown } from "lucide-react";

const STORE_KEY = "targetBulanan";

function fmtRp(n: number) { return "Rp " + n.toLocaleString("id-ID"); }

export default function TargetROIBulananScreen() {
  const [items, setItems] = useState<TargetBulananItem[]>([]);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<"add" | "edit" | "view" | null>(null);
  const [selected, setSelected] = useState<TargetBulananItem | null>(null);
  const [form, setForm] = useState<Partial<TargetBulananItem>>({});

  useEffect(() => { setItems(getItems(STORE_KEY, SEEDS.targetBulanan)); }, []);

  const filtered = items.filter(i => i.bulan.toLowerCase().includes(search.toLowerCase()));

  function openAdd() {
    setForm({ bulan: "", targetRevenue: 0, aktualRevenue: 0, budgetBulan: 0, roi: 0, leads: 0, konversi: 0, catatan: "" });
    setModal("add");
  }
  function openEdit(item: TargetBulananItem) { setForm({ ...item }); setSelected(item); setModal("edit"); }
  function openView(item: TargetBulananItem) { setSelected(item); setModal("view"); }
  function handleSave() {
    if (!form.bulan) return;
    const roi = form.budgetBulan && form.budgetBulan > 0 && form.aktualRevenue ? Math.round((form.aktualRevenue - form.budgetBulan) / form.budgetBulan * 100) : 0;
    const data = { ...form, roi };
    if (modal === "add") setItems(addItem(STORE_KEY, items, data as Omit<TargetBulananItem, "id">));
    else if (modal === "edit" && selected) setItems(updateItem(STORE_KEY, items, { ...selected, ...data } as TargetBulananItem));
    setModal(null);
  }
  function handleDelete(id: string) { if (confirm("Hapus data ini?")) setItems(deleteItem(STORE_KEY, items, id)); }

  return (
    <div>
      <PageHeader title="Target & ROI Bulanan" icon={<CalendarCheck size={20} />} count={items.length} onAdd={openAdd} addLabel="Tambah Bulan" search={search} onSearch={setSearch} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map(item => {
          const pctRevenue = item.targetRevenue > 0 ? (item.aktualRevenue / item.targetRevenue * 100) : 0;
          const isOnTrack = pctRevenue >= 80;
          return (
            <div key={item.id} className="bg-white rounded-xl p-5 shadow-sm border border-border hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-bold text-lg">{item.bulan}</h3>
                  <div className="flex items-center gap-1 mt-1">
                    {isOnTrack ? <TrendingUp size={14} className="text-green-600" /> : <TrendingDown size={14} className="text-red-600" />}
                    <span className={`text-sm font-medium ${isOnTrack ? "text-green-600" : "text-red-600"}`}>
                      {Math.round(pctRevenue)}% dari target
                    </span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openView(item)} className="p-1.5 rounded hover:bg-gray-100 text-muted"><Eye size={15} /></button>
                  <button onClick={() => openEdit(item)} className="p-1.5 rounded hover:bg-gray-100 text-muted"><Pencil size={15} /></button>
                  <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded hover:bg-red-50 text-danger"><Trash2 size={15} /></button>
                </div>
              </div>

              <div className="mb-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted">Revenue Progress</span>
                  <span className="font-semibold">{fmtRp(item.aktualRevenue)} / {fmtRp(item.targetRevenue)}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${isOnTrack ? "bg-green-500" : "bg-red-400"}`} style={{ width: `${Math.min(pctRevenue, 100)}%` }} />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-xs text-muted">Budget</p>
                  <p className="text-sm font-semibold">{fmtRp(item.budgetBulan)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-xs text-muted">ROI</p>
                  <p className={`text-sm font-semibold ${item.roi > 0 ? "text-green-600" : "text-muted"}`}>{item.roi}%</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-xs text-muted">Leads</p>
                  <p className="text-sm font-semibold">{item.leads.toLocaleString()}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-xs text-muted">Konversi</p>
                  <p className="text-sm font-semibold">{item.konversi.toLocaleString()}</p>
                </div>
              </div>
              {item.catatan && <p className="text-xs text-muted mt-3 bg-gray-50 rounded p-2">{item.catatan}</p>}
            </div>
          );
        })}
      </div>

      <Modal open={modal === "view"} onClose={() => setModal(null)} title="Detail Target Bulanan">
        {selected && (
          <div className="space-y-3">
            <div><span className="text-xs text-muted">Bulan</span><p className="font-bold text-lg">{selected.bulan}</p></div>
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-xs text-muted">Target Revenue</span><p className="font-semibold">{fmtRp(selected.targetRevenue)}</p></div>
              <div><span className="text-xs text-muted">Aktual Revenue</span><p className="font-semibold">{fmtRp(selected.aktualRevenue)}</p></div>
              <div><span className="text-xs text-muted">Budget Bulan</span><p className="font-semibold">{fmtRp(selected.budgetBulan)}</p></div>
              <div><span className="text-xs text-muted">ROI</span><p className={`font-semibold ${selected.roi > 0 ? "text-green-600" : "text-muted"}`}>{selected.roi}%</p></div>
              <div><span className="text-xs text-muted">Leads</span><p>{selected.leads.toLocaleString()}</p></div>
              <div><span className="text-xs text-muted">Konversi</span><p>{selected.konversi.toLocaleString()}</p></div>
            </div>
            <div><span className="text-xs text-muted">Catatan</span><p className="text-sm">{selected.catatan || "-"}</p></div>
          </div>
        )}
      </Modal>

      <Modal open={modal === "add" || modal === "edit"} onClose={() => setModal(null)} title={modal === "add" ? "Tambah Data Bulanan" : "Edit Data Bulanan"}>
        <FormField label="Bulan"><input className={inputClass} value={form.bulan || ""} onChange={e => setForm({ ...form, bulan: e.target.value })} placeholder="e.g. April 2026" /></FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Target Revenue"><input type="number" className={inputClass} value={form.targetRevenue || 0} onChange={e => setForm({ ...form, targetRevenue: Number(e.target.value) })} /></FormField>
          <FormField label="Aktual Revenue"><input type="number" className={inputClass} value={form.aktualRevenue || 0} onChange={e => setForm({ ...form, aktualRevenue: Number(e.target.value) })} /></FormField>
          <FormField label="Budget Bulan"><input type="number" className={inputClass} value={form.budgetBulan || 0} onChange={e => setForm({ ...form, budgetBulan: Number(e.target.value) })} /></FormField>
          <FormField label="Leads"><input type="number" className={inputClass} value={form.leads || 0} onChange={e => setForm({ ...form, leads: Number(e.target.value) })} /></FormField>
          <FormField label="Konversi"><input type="number" className={inputClass} value={form.konversi || 0} onChange={e => setForm({ ...form, konversi: Number(e.target.value) })} /></FormField>
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
