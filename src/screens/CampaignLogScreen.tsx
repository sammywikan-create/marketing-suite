"use client";
import { useEffect, useState } from "react";
import { CampaignItem } from "@/lib/types";
import { getItems, SEEDS, addItem, updateItem, deleteItem } from "@/lib/store";
import PageHeader from "@/components/PageHeader";
import Modal, { FormField, inputClass, selectClass, btnPrimary, btnSecondary } from "@/components/Modal";
import StatusBadge from "@/components/StatusBadge";
import { Megaphone, Eye, Pencil, Trash2 } from "lucide-react";

const STORE_KEY = "campaign";
const STATUSES: CampaignItem["status"][] = ["Planning", "Active", "Completed", "Paused"];
const PLATFORMS = ["Multi-channel", "TikTok", "Instagram", "Facebook", "YouTube", "Google Ads", "Email", "Website"];
const TIPE = ["Seasonal", "Product Launch", "Awareness", "Retention", "Performance", "Branding"];

function fmtRp(n: number) { return "Rp " + n.toLocaleString("id-ID"); }

export default function CampaignLogScreen() {
  const [items, setItems] = useState<CampaignItem[]>([]);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<"add" | "edit" | "view" | null>(null);
  const [selected, setSelected] = useState<CampaignItem | null>(null);
  const [form, setForm] = useState<Partial<CampaignItem>>({});

  useEffect(() => { setItems(getItems(STORE_KEY, SEEDS.campaign)); }, []);

  const filtered = items.filter(i =>
    i.nama.toLowerCase().includes(search.toLowerCase()) ||
    i.platform.toLowerCase().includes(search.toLowerCase())
  );

  function openAdd() {
    setForm({ nama: "", platform: "Multi-channel", tipe: "Awareness", status: "Planning", mulai: new Date().toISOString().slice(0, 10), selesai: "", budget: 0, hasil: "", pic: "" });
    setModal("add");
  }
  function openEdit(item: CampaignItem) { setForm({ ...item }); setSelected(item); setModal("edit"); }
  function openView(item: CampaignItem) { setSelected(item); setModal("view"); }
  function handleSave() {
    if (!form.nama) return;
    if (modal === "add") setItems(addItem(STORE_KEY, items, form as Omit<CampaignItem, "id">));
    else if (modal === "edit" && selected) setItems(updateItem(STORE_KEY, items, { ...selected, ...form } as CampaignItem));
    setModal(null);
  }
  function handleDelete(id: string) { if (confirm("Hapus campaign ini?")) setItems(deleteItem(STORE_KEY, items, id)); }

  return (
    <div>
      <PageHeader title="Campaign Log" icon={<Megaphone size={20} />} count={items.length} onAdd={openAdd} addLabel="Tambah Campaign" search={search} onSearch={setSearch} />
      <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b border-border">
              <th className="text-left px-4 py-3 font-semibold text-muted">Nama Campaign</th>
              <th className="text-left px-4 py-3 font-semibold text-muted">Platform</th>
              <th className="text-left px-4 py-3 font-semibold text-muted">Tipe</th>
              <th className="text-left px-4 py-3 font-semibold text-muted">Status</th>
              <th className="text-left px-4 py-3 font-semibold text-muted">Periode</th>
              <th className="text-right px-4 py-3 font-semibold text-muted">Budget</th>
              <th className="text-right px-4 py-3 font-semibold text-muted">Aksi</th>
            </tr></thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id} className="border-b border-border hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium">{item.nama}</td>
                  <td className="px-4 py-3 text-muted">{item.platform}</td>
                  <td className="px-4 py-3 text-muted">{item.tipe}</td>
                  <td className="px-4 py-3"><StatusBadge value={item.status} /></td>
                  <td className="px-4 py-3 text-muted text-xs">{item.mulai} — {item.selesai}</td>
                  <td className="px-4 py-3 text-right font-medium">{fmtRp(item.budget)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openView(item)} className="p-1.5 rounded hover:bg-gray-100 text-muted"><Eye size={15} /></button>
                      <button onClick={() => openEdit(item)} className="p-1.5 rounded hover:bg-gray-100 text-muted"><Pencil size={15} /></button>
                      <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded hover:bg-red-50 text-danger"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-muted">Tidak ada data</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modal === "view"} onClose={() => setModal(null)} title="Detail Campaign">
        {selected && (
          <div className="space-y-3">
            <div><span className="text-xs text-muted">Nama</span><p className="font-medium">{selected.nama}</p></div>
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-xs text-muted">Platform</span><p>{selected.platform}</p></div>
              <div><span className="text-xs text-muted">Tipe</span><p>{selected.tipe}</p></div>
              <div><span className="text-xs text-muted">Status</span><p><StatusBadge value={selected.status} /></p></div>
              <div><span className="text-xs text-muted">Budget</span><p className="font-semibold">{fmtRp(selected.budget)}</p></div>
              <div><span className="text-xs text-muted">Mulai</span><p>{selected.mulai}</p></div>
              <div><span className="text-xs text-muted">Selesai</span><p>{selected.selesai}</p></div>
              <div><span className="text-xs text-muted">PIC</span><p>{selected.pic}</p></div>
            </div>
            <div><span className="text-xs text-muted">Hasil</span><p className="text-sm">{selected.hasil || "-"}</p></div>
          </div>
        )}
      </Modal>

      <Modal open={modal === "add" || modal === "edit"} onClose={() => setModal(null)} title={modal === "add" ? "Tambah Campaign" : "Edit Campaign"}>
        <FormField label="Nama Campaign"><input className={inputClass} value={form.nama || ""} onChange={e => setForm({ ...form, nama: e.target.value })} /></FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Platform"><select className={selectClass} value={form.platform || ""} onChange={e => setForm({ ...form, platform: e.target.value })}>{PLATFORMS.map(o => <option key={o}>{o}</option>)}</select></FormField>
          <FormField label="Tipe"><select className={selectClass} value={form.tipe || ""} onChange={e => setForm({ ...form, tipe: e.target.value })}>{TIPE.map(o => <option key={o}>{o}</option>)}</select></FormField>
          <FormField label="Status"><select className={selectClass} value={form.status || ""} onChange={e => setForm({ ...form, status: e.target.value as CampaignItem["status"] })}>{STATUSES.map(o => <option key={o}>{o}</option>)}</select></FormField>
          <FormField label="Budget"><input type="number" className={inputClass} value={form.budget || 0} onChange={e => setForm({ ...form, budget: Number(e.target.value) })} /></FormField>
          <FormField label="Mulai"><input type="date" className={inputClass} value={form.mulai || ""} onChange={e => setForm({ ...form, mulai: e.target.value })} /></FormField>
          <FormField label="Selesai"><input type="date" className={inputClass} value={form.selesai || ""} onChange={e => setForm({ ...form, selesai: e.target.value })} /></FormField>
        </div>
        <FormField label="PIC"><input className={inputClass} value={form.pic || ""} onChange={e => setForm({ ...form, pic: e.target.value })} /></FormField>
        <FormField label="Hasil"><textarea className={inputClass + " h-20"} value={form.hasil || ""} onChange={e => setForm({ ...form, hasil: e.target.value })} /></FormField>
        <div className="flex gap-2 mt-4">
          <button onClick={handleSave} className={btnPrimary}>Simpan</button>
          <button onClick={() => setModal(null)} className={btnSecondary}>Batal</button>
        </div>
      </Modal>
    </div>
  );
}
