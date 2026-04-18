"use client";
import { useEffect, useState } from "react";
import { ContentItem } from "@/lib/types";
import { getItems, SEEDS, addItem, updateItem, deleteItem } from "@/lib/store";
import PageHeader from "@/components/PageHeader";
import Modal, { FormField, inputClass, selectClass, btnPrimary, btnSecondary } from "@/components/Modal";
import StatusBadge from "@/components/StatusBadge";
import { FileText, Eye, Pencil, Trash2 } from "lucide-react";

const STORE_KEY = "content";
const STATUSES: ContentItem["status"][] = ["Draft", "In Review", "Published", "Scheduled"];
const PLATFORMS = ["Instagram", "TikTok", "YouTube", "Facebook", "Twitter/X", "Website", "LinkedIn"];
const JENIS = ["Reels", "Video", "Artikel", "Ads Copy", "Story", "Carousel", "Infografis", "Podcast"];

export default function ContentTrackerScreen() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<"add" | "edit" | "view" | null>(null);
  const [selected, setSelected] = useState<ContentItem | null>(null);
  const [form, setForm] = useState<Partial<ContentItem>>({});

  useEffect(() => { setItems(getItems(STORE_KEY, SEEDS.content)); }, []);

  const filtered = items.filter(i =>
    i.judul.toLowerCase().includes(search.toLowerCase()) ||
    i.platform.toLowerCase().includes(search.toLowerCase()) ||
    i.pic.toLowerCase().includes(search.toLowerCase())
  );

  function openAdd() {
    setForm({ judul: "", platform: "Instagram", jenis: "Reels", status: "Draft", tanggal: new Date().toISOString().slice(0, 10), pic: "", catatan: "" });
    setModal("add");
  }
  function openEdit(item: ContentItem) { setForm({ ...item }); setSelected(item); setModal("edit"); }
  function openView(item: ContentItem) { setSelected(item); setModal("view"); }

  function handleSave() {
    if (!form.judul) return;
    if (modal === "add") {
      setItems(addItem(STORE_KEY, items, form as Omit<ContentItem, "id">));
    } else if (modal === "edit" && selected) {
      setItems(updateItem(STORE_KEY, items, { ...selected, ...form } as ContentItem));
    }
    setModal(null);
  }

  function handleDelete(id: string) {
    if (confirm("Hapus konten ini?")) setItems(deleteItem(STORE_KEY, items, id));
  }

  return (
    <div>
      <PageHeader title="Content Tracker" icon={<FileText size={20} />} count={items.length} onAdd={openAdd} addLabel="Tambah Konten" search={search} onSearch={setSearch} />

      <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-border">
                <th className="text-left px-4 py-3 font-semibold text-muted">Judul</th>
                <th className="text-left px-4 py-3 font-semibold text-muted">Platform</th>
                <th className="text-left px-4 py-3 font-semibold text-muted">Jenis</th>
                <th className="text-left px-4 py-3 font-semibold text-muted">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-muted">Tanggal</th>
                <th className="text-left px-4 py-3 font-semibold text-muted">PIC</th>
                <th className="text-right px-4 py-3 font-semibold text-muted">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id} className="border-b border-border hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium">{item.judul}</td>
                  <td className="px-4 py-3 text-muted">{item.platform}</td>
                  <td className="px-4 py-3 text-muted">{item.jenis}</td>
                  <td className="px-4 py-3"><StatusBadge value={item.status} /></td>
                  <td className="px-4 py-3 text-muted">{item.tanggal}</td>
                  <td className="px-4 py-3 text-muted">{item.pic}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openView(item)} className="p-1.5 rounded hover:bg-gray-100 text-muted"><Eye size={15} /></button>
                      <button onClick={() => openEdit(item)} className="p-1.5 rounded hover:bg-gray-100 text-muted"><Pencil size={15} /></button>
                      <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded hover:bg-red-50 text-danger"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted">Tidak ada data</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View */}
      <Modal open={modal === "view"} onClose={() => setModal(null)} title="Detail Konten">
        {selected && (
          <div className="space-y-3">
            <div><span className="text-xs text-muted">Judul</span><p className="font-medium">{selected.judul}</p></div>
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-xs text-muted">Platform</span><p>{selected.platform}</p></div>
              <div><span className="text-xs text-muted">Jenis</span><p>{selected.jenis}</p></div>
              <div><span className="text-xs text-muted">Status</span><p><StatusBadge value={selected.status} /></p></div>
              <div><span className="text-xs text-muted">Tanggal</span><p>{selected.tanggal}</p></div>
              <div><span className="text-xs text-muted">PIC</span><p>{selected.pic}</p></div>
            </div>
            <div><span className="text-xs text-muted">Catatan</span><p className="text-sm">{selected.catatan || "-"}</p></div>
          </div>
        )}
      </Modal>

      {/* Add/Edit */}
      <Modal open={modal === "add" || modal === "edit"} onClose={() => setModal(null)} title={modal === "add" ? "Tambah Konten" : "Edit Konten"}>
        <FormField label="Judul"><input className={inputClass} value={form.judul || ""} onChange={e => setForm({ ...form, judul: e.target.value })} /></FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Platform">
            <select className={selectClass} value={form.platform || ""} onChange={e => setForm({ ...form, platform: e.target.value })}>{PLATFORMS.map(o => <option key={o}>{o}</option>)}</select>
          </FormField>
          <FormField label="Jenis">
            <select className={selectClass} value={form.jenis || ""} onChange={e => setForm({ ...form, jenis: e.target.value })}>{JENIS.map(o => <option key={o}>{o}</option>)}</select>
          </FormField>
          <FormField label="Status">
            <select className={selectClass} value={form.status || ""} onChange={e => setForm({ ...form, status: e.target.value as ContentItem["status"] })}>{STATUSES.map(o => <option key={o}>{o}</option>)}</select>
          </FormField>
          <FormField label="Tanggal"><input type="date" className={inputClass} value={form.tanggal || ""} onChange={e => setForm({ ...form, tanggal: e.target.value })} /></FormField>
        </div>
        <FormField label="PIC"><input className={inputClass} value={form.pic || ""} onChange={e => setForm({ ...form, pic: e.target.value })} /></FormField>
        <FormField label="Catatan"><textarea className={inputClass + " h-20"} value={form.catatan || ""} onChange={e => setForm({ ...form, catatan: e.target.value })} /></FormField>
        <div className="flex gap-2 mt-4">
          <button onClick={handleSave} className={btnPrimary}>Simpan</button>
          <button onClick={() => setModal(null)} className={btnSecondary}>Batal</button>
        </div>
      </Modal>
    </div>
  );
}
