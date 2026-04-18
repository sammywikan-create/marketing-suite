"use client";
import { useEffect, useState } from "react";
import { PanduanItem } from "@/lib/types";
import { getItems, SEEDS, addItem, updateItem, deleteItem } from "@/lib/store";
import PageHeader from "@/components/PageHeader";
import Modal, { FormField, inputClass, selectClass, btnPrimary, btnDanger, btnSecondary } from "@/components/Modal";
import { BookOpen, Eye, Pencil, Trash2 } from "lucide-react";

const STORE_KEY = "panduan";

export default function PanduanScreen() {
  const [items, setItems] = useState<PanduanItem[]>([]);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<"add" | "edit" | "view" | null>(null);
  const [selected, setSelected] = useState<PanduanItem | null>(null);
  const [form, setForm] = useState<Partial<PanduanItem>>({});

  useEffect(() => { setItems(getItems(STORE_KEY, SEEDS.panduan)); }, []);

  const filtered = items.filter(i =>
    i.judul.toLowerCase().includes(search.toLowerCase()) ||
    i.kategori.toLowerCase().includes(search.toLowerCase())
  );

  function openAdd() { setForm({ judul: "", kategori: "Content", isi: "", updatedAt: new Date().toISOString().slice(0, 10) }); setModal("add"); }
  function openEdit(item: PanduanItem) { setForm({ ...item }); setSelected(item); setModal("edit"); }
  function openView(item: PanduanItem) { setSelected(item); setModal("view"); }

  function handleSave() {
    if (!form.judul) return;
    if (modal === "add") {
      const updated = addItem(STORE_KEY, items, form as Omit<PanduanItem, "id">);
      setItems(updated);
    } else if (modal === "edit" && selected) {
      const updated = updateItem(STORE_KEY, items, { ...selected, ...form } as PanduanItem);
      setItems(updated);
    }
    setModal(null);
  }

  function handleDelete(id: string) {
    if (confirm("Hapus panduan ini?")) {
      setItems(deleteItem(STORE_KEY, items, id));
    }
  }

  return (
    <div>
      <PageHeader title="Panduan" icon={<BookOpen size={20} />} count={items.length} onAdd={openAdd} addLabel="Tambah Panduan" search={search} onSearch={setSearch} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map(item => (
          <div key={item.id} className="bg-white rounded-xl p-5 shadow-sm border border-border hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-2">
              <div>
                <span className="inline-block px-2 py-0.5 bg-primary-50 text-primary text-xs font-semibold rounded-full mb-2">{item.kategori}</span>
                <h3 className="font-semibold text-foreground">{item.judul}</h3>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openView(item)} className="p-1.5 rounded hover:bg-gray-100 text-muted"><Eye size={16} /></button>
                <button onClick={() => openEdit(item)} className="p-1.5 rounded hover:bg-gray-100 text-muted"><Pencil size={16} /></button>
                <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded hover:bg-red-50 text-danger"><Trash2 size={16} /></button>
              </div>
            </div>
            <p className="text-sm text-muted line-clamp-3 whitespace-pre-line">{item.isi.replace(/\\n/g, "\n")}</p>
            <p className="text-xs text-muted mt-3">Update: {item.updatedAt}</p>
          </div>
        ))}
      </div>

      {/* View Modal */}
      <Modal open={modal === "view"} onClose={() => setModal(null)} title={selected?.judul || ""} wide>
        {selected && (
          <div>
            <span className="inline-block px-2 py-0.5 bg-primary-50 text-primary text-xs font-semibold rounded-full mb-3">{selected.kategori}</span>
            <div className="whitespace-pre-line text-sm leading-relaxed text-foreground">{selected.isi.replace(/\\n/g, "\n")}</div>
            <p className="text-xs text-muted mt-4 pt-3 border-t border-border">Terakhir diupdate: {selected.updatedAt}</p>
          </div>
        )}
      </Modal>

      {/* Add/Edit Modal */}
      <Modal open={modal === "add" || modal === "edit"} onClose={() => setModal(null)} title={modal === "add" ? "Tambah Panduan" : "Edit Panduan"} wide>
        <FormField label="Judul"><input className={inputClass} value={form.judul || ""} onChange={e => setForm({ ...form, judul: e.target.value })} /></FormField>
        <FormField label="Kategori">
          <select className={selectClass} value={form.kategori || ""} onChange={e => setForm({ ...form, kategori: e.target.value })}>
            {["Content", "Campaign", "KOL", "Strategy", "Analytics", "General"].map(o => <option key={o}>{o}</option>)}
          </select>
        </FormField>
        <FormField label="Isi / Panduan">
          <textarea className={inputClass + " h-48"} value={(form.isi || "").replace(/\\n/g, "\n")} onChange={e => setForm({ ...form, isi: e.target.value })} />
        </FormField>
        <div className="flex gap-2 mt-4">
          <button onClick={handleSave} className={btnPrimary}>Simpan</button>
          <button onClick={() => setModal(null)} className={btnSecondary}>Batal</button>
        </div>
      </Modal>
    </div>
  );
}
