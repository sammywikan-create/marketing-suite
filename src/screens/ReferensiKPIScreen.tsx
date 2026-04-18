"use client";
import { useEffect, useState } from "react";
import { KPIItem } from "@/lib/types";
import { getItems, SEEDS, addItem, updateItem, deleteItem } from "@/lib/store";
import PageHeader from "@/components/PageHeader";
import Modal, { FormField, inputClass, selectClass, btnPrimary, btnSecondary } from "@/components/Modal";
import { Target, Eye, Pencil, Trash2 } from "lucide-react";

const STORE_KEY = "kpi";
const KATEGORI = ["Revenue", "Acquisition", "Social Media", "Retention", "Advertising", "Content", "Email", "Conversion"];

export default function ReferensiKPIScreen() {
  const [items, setItems] = useState<KPIItem[]>([]);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<"add" | "edit" | "view" | null>(null);
  const [selected, setSelected] = useState<KPIItem | null>(null);
  const [form, setForm] = useState<Partial<KPIItem>>({});

  useEffect(() => { setItems(getItems(STORE_KEY, SEEDS.kpi)); }, []);

  const filtered = items.filter(i =>
    i.namaKPI.toLowerCase().includes(search.toLowerCase()) ||
    i.kategori.toLowerCase().includes(search.toLowerCase())
  );

  function openAdd() {
    setForm({ namaKPI: "", kategori: "Revenue", target: "", aktual: "", satuan: "", periode: "", catatan: "" });
    setModal("add");
  }
  function openEdit(item: KPIItem) { setForm({ ...item }); setSelected(item); setModal("edit"); }
  function openView(item: KPIItem) { setSelected(item); setModal("view"); }
  function handleSave() {
    if (!form.namaKPI) return;
    if (modal === "add") setItems(addItem(STORE_KEY, items, form as Omit<KPIItem, "id">));
    else if (modal === "edit" && selected) setItems(updateItem(STORE_KEY, items, { ...selected, ...form } as KPIItem));
    setModal(null);
  }
  function handleDelete(id: string) { if (confirm("Hapus KPI ini?")) setItems(deleteItem(STORE_KEY, items, id)); }

  function getProgress(target: string, aktual: string): number {
    const t = parseFloat(target.replace(/[^0-9.]/g, ""));
    const a = parseFloat(aktual.replace(/[^0-9.]/g, ""));
    if (isNaN(t) || isNaN(a) || t === 0) return 0;
    return Math.min((a / t) * 100, 100);
  }

  return (
    <div>
      <PageHeader title="Referensi KPI" icon={<Target size={20} />} count={items.length} onAdd={openAdd} addLabel="Tambah KPI" search={search} onSearch={setSearch} />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(item => {
          const pct = getProgress(item.target, item.aktual);
          const color = pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-yellow-500" : "bg-red-500";
          return (
            <div key={item.id} className="bg-white rounded-xl p-5 shadow-sm border border-border hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className="text-xs text-muted px-2 py-0.5 bg-gray-100 rounded-full">{item.kategori}</span>
                  <h3 className="font-semibold mt-2">{item.namaKPI}</h3>
                </div>
                <span className={`text-lg font-bold ${pct >= 80 ? "text-green-600" : pct >= 50 ? "text-yellow-600" : "text-red-600"}`}>{Math.round(pct)}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
                <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                <div><span className="text-xs text-muted">Target</span><p className="font-medium">{item.target} {item.satuan}</p></div>
                <div><span className="text-xs text-muted">Aktual</span><p className="font-medium">{item.aktual} {item.satuan}</p></div>
              </div>
              <p className="text-xs text-muted">{item.periode}</p>
              {item.catatan && <p className="text-xs text-muted bg-gray-50 rounded p-2 mt-2">{item.catatan}</p>}
              <div className="flex justify-end gap-1 mt-3 pt-3 border-t border-border">
                <button onClick={() => openView(item)} className="p-1.5 rounded hover:bg-gray-100 text-muted"><Eye size={15} /></button>
                <button onClick={() => openEdit(item)} className="p-1.5 rounded hover:bg-gray-100 text-muted"><Pencil size={15} /></button>
                <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded hover:bg-red-50 text-danger"><Trash2 size={15} /></button>
              </div>
            </div>
          );
        })}
      </div>

      <Modal open={modal === "view"} onClose={() => setModal(null)} title="Detail KPI">
        {selected && (
          <div className="space-y-3">
            <div><span className="text-xs text-muted">Nama KPI</span><p className="font-medium">{selected.namaKPI}</p></div>
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-xs text-muted">Kategori</span><p>{selected.kategori}</p></div>
              <div><span className="text-xs text-muted">Periode</span><p>{selected.periode}</p></div>
              <div><span className="text-xs text-muted">Target</span><p className="font-semibold">{selected.target} {selected.satuan}</p></div>
              <div><span className="text-xs text-muted">Aktual</span><p className="font-semibold">{selected.aktual} {selected.satuan}</p></div>
            </div>
            <div><span className="text-xs text-muted">Catatan</span><p className="text-sm">{selected.catatan || "-"}</p></div>
          </div>
        )}
      </Modal>

      <Modal open={modal === "add" || modal === "edit"} onClose={() => setModal(null)} title={modal === "add" ? "Tambah KPI" : "Edit KPI"}>
        <FormField label="Nama KPI"><input className={inputClass} value={form.namaKPI || ""} onChange={e => setForm({ ...form, namaKPI: e.target.value })} /></FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Kategori"><select className={selectClass} value={form.kategori || ""} onChange={e => setForm({ ...form, kategori: e.target.value })}>{KATEGORI.map(o => <option key={o}>{o}</option>)}</select></FormField>
          <FormField label="Satuan"><input className={inputClass} value={form.satuan || ""} onChange={e => setForm({ ...form, satuan: e.target.value })} placeholder="Rupiah, %, Leads..." /></FormField>
          <FormField label="Target"><input className={inputClass} value={form.target || ""} onChange={e => setForm({ ...form, target: e.target.value })} /></FormField>
          <FormField label="Aktual"><input className={inputClass} value={form.aktual || ""} onChange={e => setForm({ ...form, aktual: e.target.value })} /></FormField>
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
