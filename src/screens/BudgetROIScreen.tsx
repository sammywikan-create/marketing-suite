"use client";
import { useEffect, useState } from "react";
import { BudgetROIItem } from "@/lib/types";
import { getItems, SEEDS, addItem, updateItem, deleteItem } from "@/lib/store";
import PageHeader from "@/components/PageHeader";
import Modal, { FormField, inputClass, selectClass, btnPrimary, btnSecondary } from "@/components/Modal";
import { DollarSign, Eye, Pencil, Trash2 } from "lucide-react";

const STORE_KEY = "budgetRoi";
const KATEGORI = ["Social Media Ads", "KOL Marketing", "Content Production", "Email Marketing", "SEO", "Events", "Tools & Software", "Team"];

function fmtRp(n: number) { return "Rp " + n.toLocaleString("id-ID"); }

export default function BudgetROIScreen() {
  const [items, setItems] = useState<BudgetROIItem[]>([]);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<"add" | "edit" | "view" | null>(null);
  const [selected, setSelected] = useState<BudgetROIItem | null>(null);
  const [form, setForm] = useState<Partial<BudgetROIItem>>({});

  useEffect(() => { setItems(getItems(STORE_KEY, SEEDS.budgetRoi)); }, []);

  const filtered = items.filter(i =>
    i.kategori.toLowerCase().includes(search.toLowerCase()) ||
    i.deskripsi.toLowerCase().includes(search.toLowerCase())
  );

  const totalAlokasi = items.reduce((s, b) => s + b.budgetAlokasi, 0);
  const totalTerpakai = items.reduce((s, b) => s + b.budgetTerpakai, 0);
  const totalRevenue = items.reduce((s, b) => s + b.revenue, 0);
  const overallROI = totalTerpakai > 0 ? ((totalRevenue - totalTerpakai) / totalTerpakai * 100) : 0;

  function openAdd() {
    setForm({ kategori: "Social Media Ads", deskripsi: "", budgetAlokasi: 0, budgetTerpakai: 0, revenue: 0, roi: 0, periode: "", catatan: "" });
    setModal("add");
  }
  function openEdit(item: BudgetROIItem) { setForm({ ...item }); setSelected(item); setModal("edit"); }
  function openView(item: BudgetROIItem) { setSelected(item); setModal("view"); }
  function handleSave() {
    if (!form.kategori) return;
    const roi = form.budgetTerpakai && form.budgetTerpakai > 0 && form.revenue ? ((form.revenue - form.budgetTerpakai) / form.budgetTerpakai * 100) : 0;
    const data = { ...form, roi: Math.round(roi) };
    if (modal === "add") setItems(addItem(STORE_KEY, items, data as Omit<BudgetROIItem, "id">));
    else if (modal === "edit" && selected) setItems(updateItem(STORE_KEY, items, { ...selected, ...data } as BudgetROIItem));
    setModal(null);
  }
  function handleDelete(id: string) { if (confirm("Hapus item ini?")) setItems(deleteItem(STORE_KEY, items, id)); }

  return (
    <div>
      <PageHeader title="Budget & ROI" icon={<DollarSign size={20} />} count={items.length} onAdd={openAdd} addLabel="Tambah Budget" search={search} onSearch={setSearch} />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-border">
          <p className="text-xs text-muted mb-1">Budget Alokasi</p>
          <p className="text-xl font-bold text-foreground">{fmtRp(totalAlokasi)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-border">
          <p className="text-xs text-muted mb-1">Budget Terpakai</p>
          <p className="text-xl font-bold text-foreground">{fmtRp(totalTerpakai)}</p>
          <div className="h-1.5 bg-gray-100 rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: `${totalAlokasi > 0 ? (totalTerpakai / totalAlokasi * 100) : 0}%` }} />
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-border">
          <p className="text-xs text-muted mb-1">Total Revenue</p>
          <p className="text-xl font-bold text-green-600">{fmtRp(totalRevenue)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-border">
          <p className="text-xs text-muted mb-1">Overall ROI</p>
          <p className={`text-xl font-bold ${overallROI > 0 ? "text-green-600" : "text-red-600"}`}>{Math.round(overallROI)}%</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b border-border">
              <th className="text-left px-4 py-3 font-semibold text-muted">Kategori</th>
              <th className="text-left px-4 py-3 font-semibold text-muted">Deskripsi</th>
              <th className="text-right px-4 py-3 font-semibold text-muted">Alokasi</th>
              <th className="text-right px-4 py-3 font-semibold text-muted">Terpakai</th>
              <th className="text-right px-4 py-3 font-semibold text-muted">Revenue</th>
              <th className="text-right px-4 py-3 font-semibold text-muted">ROI</th>
              <th className="text-left px-4 py-3 font-semibold text-muted">Periode</th>
              <th className="text-right px-4 py-3 font-semibold text-muted">Aksi</th>
            </tr></thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id} className="border-b border-border hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium">{item.kategori}</td>
                  <td className="px-4 py-3 text-muted">{item.deskripsi}</td>
                  <td className="px-4 py-3 text-right">{fmtRp(item.budgetAlokasi)}</td>
                  <td className="px-4 py-3 text-right">{fmtRp(item.budgetTerpakai)}</td>
                  <td className="px-4 py-3 text-right font-medium text-green-600">{fmtRp(item.revenue)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-semibold ${item.roi > 0 ? "text-green-600" : "text-muted"}`}>{item.roi}%</span>
                  </td>
                  <td className="px-4 py-3 text-muted">{item.periode}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openView(item)} className="p-1.5 rounded hover:bg-gray-100 text-muted"><Eye size={15} /></button>
                      <button onClick={() => openEdit(item)} className="p-1.5 rounded hover:bg-gray-100 text-muted"><Pencil size={15} /></button>
                      <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded hover:bg-red-50 text-danger"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-muted">Tidak ada data</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modal === "view"} onClose={() => setModal(null)} title="Detail Budget & ROI">
        {selected && (
          <div className="space-y-3">
            <div><span className="text-xs text-muted">Kategori</span><p className="font-medium">{selected.kategori}</p></div>
            <div><span className="text-xs text-muted">Deskripsi</span><p>{selected.deskripsi}</p></div>
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-xs text-muted">Budget Alokasi</span><p className="font-semibold">{fmtRp(selected.budgetAlokasi)}</p></div>
              <div><span className="text-xs text-muted">Budget Terpakai</span><p className="font-semibold">{fmtRp(selected.budgetTerpakai)}</p></div>
              <div><span className="text-xs text-muted">Revenue</span><p className="font-semibold text-green-600">{fmtRp(selected.revenue)}</p></div>
              <div><span className="text-xs text-muted">ROI</span><p className={`font-semibold ${selected.roi > 0 ? "text-green-600" : "text-muted"}`}>{selected.roi}%</p></div>
              <div><span className="text-xs text-muted">Periode</span><p>{selected.periode}</p></div>
            </div>
            <div><span className="text-xs text-muted">Catatan</span><p className="text-sm">{selected.catatan || "-"}</p></div>
          </div>
        )}
      </Modal>

      <Modal open={modal === "add" || modal === "edit"} onClose={() => setModal(null)} title={modal === "add" ? "Tambah Budget" : "Edit Budget"}>
        <FormField label="Kategori"><select className={selectClass} value={form.kategori || ""} onChange={e => setForm({ ...form, kategori: e.target.value })}>{KATEGORI.map(o => <option key={o}>{o}</option>)}</select></FormField>
        <FormField label="Deskripsi"><input className={inputClass} value={form.deskripsi || ""} onChange={e => setForm({ ...form, deskripsi: e.target.value })} /></FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Budget Alokasi"><input type="number" className={inputClass} value={form.budgetAlokasi || 0} onChange={e => setForm({ ...form, budgetAlokasi: Number(e.target.value) })} /></FormField>
          <FormField label="Budget Terpakai"><input type="number" className={inputClass} value={form.budgetTerpakai || 0} onChange={e => setForm({ ...form, budgetTerpakai: Number(e.target.value) })} /></FormField>
          <FormField label="Revenue"><input type="number" className={inputClass} value={form.revenue || 0} onChange={e => setForm({ ...form, revenue: Number(e.target.value) })} /></FormField>
          <FormField label="Periode"><input className={inputClass} value={form.periode || ""} onChange={e => setForm({ ...form, periode: e.target.value })} placeholder="e.g. Q1 2026" /></FormField>
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
