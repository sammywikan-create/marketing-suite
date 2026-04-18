"use client";
import { useEffect, useState } from "react";
import { KOLItem } from "@/lib/types";
import { getItems, SEEDS, addItem, updateItem, deleteItem } from "@/lib/store";
import PageHeader from "@/components/PageHeader";
import Modal, { FormField, inputClass, selectClass, btnPrimary, btnSecondary } from "@/components/Modal";
import StatusBadge from "@/components/StatusBadge";
import { Users, Eye, Pencil, Trash2 } from "lucide-react";

const STORE_KEY = "kol";
const STATUSES: KOLItem["status"][] = ["Active", "Pending", "Completed", "Rejected"];
const PLATFORMS = ["TikTok", "Instagram", "YouTube", "Twitter/X", "Facebook"];
const KATEGORI = ["Beauty", "Food", "Tech", "Lifestyle", "Fashion", "Health", "Education", "Entertainment"];

function fmtRp(n: number) { return "Rp " + n.toLocaleString("id-ID"); }

export default function KOLTrackerScreen() {
  const [items, setItems] = useState<KOLItem[]>([]);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<"add" | "edit" | "view" | null>(null);
  const [selected, setSelected] = useState<KOLItem | null>(null);
  const [form, setForm] = useState<Partial<KOLItem>>({});

  useEffect(() => { setItems(getItems(STORE_KEY, SEEDS.kol)); }, []);

  const filtered = items.filter(i =>
    i.nama.toLowerCase().includes(search.toLowerCase()) ||
    i.platform.toLowerCase().includes(search.toLowerCase()) ||
    i.kategori.toLowerCase().includes(search.toLowerCase())
  );

  function openAdd() {
    setForm({ nama: "", platform: "TikTok", followers: "", kategori: "Beauty", status: "Pending", biaya: 0, kontakPIC: "", catatan: "" });
    setModal("add");
  }
  function openEdit(item: KOLItem) { setForm({ ...item }); setSelected(item); setModal("edit"); }
  function openView(item: KOLItem) { setSelected(item); setModal("view"); }
  function handleSave() {
    if (!form.nama) return;
    if (modal === "add") setItems(addItem(STORE_KEY, items, form as Omit<KOLItem, "id">));
    else if (modal === "edit" && selected) setItems(updateItem(STORE_KEY, items, { ...selected, ...form } as KOLItem));
    setModal(null);
  }
  function handleDelete(id: string) { if (confirm("Hapus KOL ini?")) setItems(deleteItem(STORE_KEY, items, id)); }

  return (
    <div>
      <PageHeader title="KOL Tracker" icon={<Users size={20} />} count={items.length} onAdd={openAdd} addLabel="Tambah KOL" search={search} onSearch={setSearch} />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(item => (
          <div key={item.id} className="bg-white rounded-xl p-5 shadow-sm border border-border hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center text-primary font-bold text-lg">
                  {item.nama.charAt(0)}
                </div>
                <div>
                  <h3 className="font-semibold">{item.nama}</h3>
                  <p className="text-xs text-muted">{item.platform} · {item.followers}</p>
                </div>
              </div>
              <StatusBadge value={item.status} />
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm mb-3">
              <div><span className="text-xs text-muted">Kategori</span><p>{item.kategori}</p></div>
              <div><span className="text-xs text-muted">Biaya</span><p className="font-semibold">{fmtRp(item.biaya)}</p></div>
              <div><span className="text-xs text-muted">PIC</span><p>{item.kontakPIC}</p></div>
            </div>
            {item.catatan && <p className="text-xs text-muted bg-gray-50 rounded p-2">{item.catatan}</p>}
            <div className="flex justify-end gap-1 mt-3 pt-3 border-t border-border">
              <button onClick={() => openView(item)} className="p-1.5 rounded hover:bg-gray-100 text-muted"><Eye size={15} /></button>
              <button onClick={() => openEdit(item)} className="p-1.5 rounded hover:bg-gray-100 text-muted"><Pencil size={15} /></button>
              <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded hover:bg-red-50 text-danger"><Trash2 size={15} /></button>
            </div>
          </div>
        ))}
      </div>

      <Modal open={modal === "view"} onClose={() => setModal(null)} title="Detail KOL">
        {selected && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-primary-50 flex items-center justify-center text-primary font-bold text-xl">{selected.nama.charAt(0)}</div>
              <div><h3 className="font-bold text-lg">{selected.nama}</h3><p className="text-sm text-muted">{selected.platform} · {selected.followers} followers</p></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-xs text-muted">Kategori</span><p>{selected.kategori}</p></div>
              <div><span className="text-xs text-muted">Status</span><p><StatusBadge value={selected.status} /></p></div>
              <div><span className="text-xs text-muted">Biaya</span><p className="font-semibold">{fmtRp(selected.biaya)}</p></div>
              <div><span className="text-xs text-muted">PIC</span><p>{selected.kontakPIC}</p></div>
            </div>
            <div><span className="text-xs text-muted">Catatan</span><p className="text-sm">{selected.catatan || "-"}</p></div>
          </div>
        )}
      </Modal>

      <Modal open={modal === "add" || modal === "edit"} onClose={() => setModal(null)} title={modal === "add" ? "Tambah KOL" : "Edit KOL"}>
        <FormField label="Nama KOL"><input className={inputClass} value={form.nama || ""} onChange={e => setForm({ ...form, nama: e.target.value })} /></FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Platform"><select className={selectClass} value={form.platform || ""} onChange={e => setForm({ ...form, platform: e.target.value })}>{PLATFORMS.map(o => <option key={o}>{o}</option>)}</select></FormField>
          <FormField label="Followers"><input className={inputClass} value={form.followers || ""} onChange={e => setForm({ ...form, followers: e.target.value })} placeholder="e.g. 500K" /></FormField>
          <FormField label="Kategori"><select className={selectClass} value={form.kategori || ""} onChange={e => setForm({ ...form, kategori: e.target.value })}>{KATEGORI.map(o => <option key={o}>{o}</option>)}</select></FormField>
          <FormField label="Status"><select className={selectClass} value={form.status || ""} onChange={e => setForm({ ...form, status: e.target.value as KOLItem["status"] })}>{STATUSES.map(o => <option key={o}>{o}</option>)}</select></FormField>
          <FormField label="Biaya"><input type="number" className={inputClass} value={form.biaya || 0} onChange={e => setForm({ ...form, biaya: Number(e.target.value) })} /></FormField>
          <FormField label="Kontak PIC"><input className={inputClass} value={form.kontakPIC || ""} onChange={e => setForm({ ...form, kontakPIC: e.target.value })} /></FormField>
        </div>
        <FormField label="Catatan"><textarea className={inputClass + " h-20"} value={form.catatan || ""} onChange={e => setForm({ ...form, catatan: e.target.value })} /></FormField>
        <div className="flex gap-2 mt-4">
          <button onClick={handleSave} className={btnPrimary}>Simpan</button>
          <button onClick={() => setModal(null)} className={btnSecondary}>Batal</button>
        </div>
      </Modal>
    </div>
  );
}
