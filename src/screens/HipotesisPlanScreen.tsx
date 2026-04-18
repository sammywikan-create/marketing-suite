"use client";
import { useEffect, useState } from "react";
import { HipotesisItem } from "@/lib/types";
import { getItems, SEEDS, addItem, updateItem, deleteItem } from "@/lib/store";
import PageHeader from "@/components/PageHeader";
import Modal, { FormField, inputClass, selectClass, btnPrimary, btnSecondary } from "@/components/Modal";
import StatusBadge from "@/components/StatusBadge";
import { Lightbulb, Eye, Pencil, Trash2 } from "lucide-react";

const STORE_KEY = "hipotesis";
const STATUSES: HipotesisItem["status"][] = ["Backlog", "Testing", "Validated", "Invalidated"];
const PRIORITIES: HipotesisItem["prioritas"][] = ["High", "Medium", "Low"];
const KATEGORI = ["Content", "Email", "Promo", "Ads", "SEO", "Social Media", "Product"];

export default function HipotesisPlanScreen() {
  const [items, setItems] = useState<HipotesisItem[]>([]);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<"add" | "edit" | "view" | null>(null);
  const [selected, setSelected] = useState<HipotesisItem | null>(null);
  const [form, setForm] = useState<Partial<HipotesisItem>>({});

  useEffect(() => { setItems(getItems(STORE_KEY, SEEDS.hipotesis)); }, []);

  const filtered = items.filter(i =>
    i.hipotesis.toLowerCase().includes(search.toLowerCase()) ||
    i.kategori.toLowerCase().includes(search.toLowerCase())
  );

  function openAdd() {
    setForm({ hipotesis: "", kategori: "Content", prioritas: "Medium", status: "Backlog", rpiAction: "", hasil: "", tanggal: new Date().toISOString().slice(0, 10) });
    setModal("add");
  }
  function openEdit(item: HipotesisItem) { setForm({ ...item }); setSelected(item); setModal("edit"); }
  function openView(item: HipotesisItem) { setSelected(item); setModal("view"); }
  function handleSave() {
    if (!form.hipotesis) return;
    if (modal === "add") setItems(addItem(STORE_KEY, items, form as Omit<HipotesisItem, "id">));
    else if (modal === "edit" && selected) setItems(updateItem(STORE_KEY, items, { ...selected, ...form } as HipotesisItem));
    setModal(null);
  }
  function handleDelete(id: string) { if (confirm("Hapus hipotesis ini?")) setItems(deleteItem(STORE_KEY, items, id)); }

  return (
    <div>
      <PageHeader title="Hipotesis & Plan" icon={<Lightbulb size={20} />} count={items.length} onAdd={openAdd} addLabel="Tambah Hipotesis" search={search} onSearch={setSearch} />

      <div className="space-y-3">
        {filtered.map(item => (
          <div key={item.id} className="bg-white rounded-xl p-5 shadow-sm border border-border hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <StatusBadge value={item.prioritas} />
                  <StatusBadge value={item.status} />
                  <span className="text-xs text-muted px-2 py-0.5 bg-gray-100 rounded-full">{item.kategori}</span>
                </div>
                <h3 className="font-semibold mb-1">{item.hipotesis}</h3>
                <p className="text-sm text-muted mb-1"><strong>Aksi:</strong> {item.rpiAction || "-"}</p>
                <p className="text-sm text-muted"><strong>Hasil:</strong> {item.hasil || "-"}</p>
                <p className="text-xs text-muted mt-2">{item.tanggal}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => openView(item)} className="p-1.5 rounded hover:bg-gray-100 text-muted"><Eye size={15} /></button>
                <button onClick={() => openEdit(item)} className="p-1.5 rounded hover:bg-gray-100 text-muted"><Pencil size={15} /></button>
                <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded hover:bg-red-50 text-danger"><Trash2 size={15} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal open={modal === "view"} onClose={() => setModal(null)} title="Detail Hipotesis">
        {selected && (
          <div className="space-y-3">
            <div className="flex gap-2 mb-3"><StatusBadge value={selected.prioritas} /><StatusBadge value={selected.status} /></div>
            <div><span className="text-xs text-muted">Hipotesis</span><p className="font-medium">{selected.hipotesis}</p></div>
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-xs text-muted">Kategori</span><p>{selected.kategori}</p></div>
              <div><span className="text-xs text-muted">Tanggal</span><p>{selected.tanggal}</p></div>
            </div>
            <div><span className="text-xs text-muted">Rencana Aksi</span><p className="text-sm">{selected.rpiAction || "-"}</p></div>
            <div><span className="text-xs text-muted">Hasil</span><p className="text-sm">{selected.hasil || "-"}</p></div>
          </div>
        )}
      </Modal>

      <Modal open={modal === "add" || modal === "edit"} onClose={() => setModal(null)} title={modal === "add" ? "Tambah Hipotesis" : "Edit Hipotesis"}>
        <FormField label="Hipotesis"><textarea className={inputClass + " h-20"} value={form.hipotesis || ""} onChange={e => setForm({ ...form, hipotesis: e.target.value })} /></FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Kategori"><select className={selectClass} value={form.kategori || ""} onChange={e => setForm({ ...form, kategori: e.target.value })}>{KATEGORI.map(o => <option key={o}>{o}</option>)}</select></FormField>
          <FormField label="Prioritas"><select className={selectClass} value={form.prioritas || ""} onChange={e => setForm({ ...form, prioritas: e.target.value as HipotesisItem["prioritas"] })}>{PRIORITIES.map(o => <option key={o}>{o}</option>)}</select></FormField>
          <FormField label="Status"><select className={selectClass} value={form.status || ""} onChange={e => setForm({ ...form, status: e.target.value as HipotesisItem["status"] })}>{STATUSES.map(o => <option key={o}>{o}</option>)}</select></FormField>
          <FormField label="Tanggal"><input type="date" className={inputClass} value={form.tanggal || ""} onChange={e => setForm({ ...form, tanggal: e.target.value })} /></FormField>
        </div>
        <FormField label="Rencana Aksi"><textarea className={inputClass + " h-16"} value={form.rpiAction || ""} onChange={e => setForm({ ...form, rpiAction: e.target.value })} /></FormField>
        <FormField label="Hasil"><textarea className={inputClass + " h-16"} value={form.hasil || ""} onChange={e => setForm({ ...form, hasil: e.target.value })} /></FormField>
        <div className="flex gap-2 mt-4">
          <button onClick={handleSave} className={btnPrimary}>Simpan</button>
          <button onClick={() => setModal(null)} className={btnSecondary}>Batal</button>
        </div>
      </Modal>
    </div>
  );
}
