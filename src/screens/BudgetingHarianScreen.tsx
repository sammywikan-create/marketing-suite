"use client";
import { useEffect, useState } from "react";
import { BudgetHarianItem } from "@/lib/types";
import { getItems, SEEDS, addItem, updateItem, deleteItem } from "@/lib/store";
import PageHeader from "@/components/PageHeader";
import Modal, { FormField, inputClass, selectClass, btnPrimary, btnSecondary } from "@/components/Modal";
import { CalendarDays, Eye, Pencil, Trash2 } from "lucide-react";

const STORE_KEY = "budgetHarian";
const PLATFORMS = ["TikTok", "Instagram", "Facebook", "Google", "YouTube", "Twitter/X", "LinkedIn"];

function fmtRp(n: number) { return "Rp " + n.toLocaleString("id-ID"); }
function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 }) + "M";
  if (n >= 1_000) return (n / 1_000).toLocaleString("id-ID", { maximumFractionDigits: 1 }) + "K";
  return n.toLocaleString("id-ID");
}

export default function BudgetingHarianScreen() {
  const [items, setItems] = useState<BudgetHarianItem[]>([]);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<"add" | "edit" | "view" | null>(null);
  const [selected, setSelected] = useState<BudgetHarianItem | null>(null);
  const [form, setForm] = useState<Partial<BudgetHarianItem>>({});

  useEffect(() => { setItems(getItems(STORE_KEY, SEEDS.budgetHarian)); }, []);

  const filtered = items.filter(i =>
    i.platform.toLowerCase().includes(search.toLowerCase()) ||
    i.campaign.toLowerCase().includes(search.toLowerCase()) ||
    i.tanggal.includes(search)
  );

  const totalBudget = items.reduce((s, i) => s + i.budget, 0);
  const totalSpent = items.reduce((s, i) => s + i.spent, 0);
  const totalImpressions = items.reduce((s, i) => s + i.impressions, 0);
  const totalClicks = items.reduce((s, i) => s + i.clicks, 0);
  const totalKonversi = items.reduce((s, i) => s + i.konversi, 0);

  function openAdd() {
    setForm({ tanggal: new Date().toISOString().slice(0, 10), platform: "TikTok", campaign: "", budget: 0, spent: 0, impressions: 0, clicks: 0, konversi: 0, catatan: "" });
    setModal("add");
  }
  function openEdit(item: BudgetHarianItem) { setForm({ ...item }); setSelected(item); setModal("edit"); }
  function openView(item: BudgetHarianItem) { setSelected(item); setModal("view"); }
  function handleSave() {
    if (!form.campaign) return;
    if (modal === "add") setItems(addItem(STORE_KEY, items, form as Omit<BudgetHarianItem, "id">));
    else if (modal === "edit" && selected) setItems(updateItem(STORE_KEY, items, { ...selected, ...form } as BudgetHarianItem));
    setModal(null);
  }
  function handleDelete(id: string) { if (confirm("Hapus data ini?")) setItems(deleteItem(STORE_KEY, items, id)); }

  return (
    <div>
      <PageHeader title="Budgeting Harian" icon={<CalendarDays size={20} />} count={items.length} onAdd={openAdd} addLabel="Tambah Data" search={search} onSearch={setSearch} />

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-border">
          <p className="text-xs text-muted mb-1">Total Budget</p>
          <p className="text-lg font-bold">{fmtRp(totalBudget)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-border">
          <p className="text-xs text-muted mb-1">Total Spent</p>
          <p className="text-lg font-bold">{fmtRp(totalSpent)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-border">
          <p className="text-xs text-muted mb-1">Impressions</p>
          <p className="text-lg font-bold">{fmt(totalImpressions)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-border">
          <p className="text-xs text-muted mb-1">Clicks</p>
          <p className="text-lg font-bold">{fmt(totalClicks)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-border">
          <p className="text-xs text-muted mb-1">Konversi</p>
          <p className="text-lg font-bold">{totalKonversi.toLocaleString()}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b border-border">
              <th className="text-left px-4 py-3 font-semibold text-muted">Tanggal</th>
              <th className="text-left px-4 py-3 font-semibold text-muted">Platform</th>
              <th className="text-left px-4 py-3 font-semibold text-muted">Campaign</th>
              <th className="text-right px-4 py-3 font-semibold text-muted">Budget</th>
              <th className="text-right px-4 py-3 font-semibold text-muted">Spent</th>
              <th className="text-right px-4 py-3 font-semibold text-muted">Impr.</th>
              <th className="text-right px-4 py-3 font-semibold text-muted">Clicks</th>
              <th className="text-right px-4 py-3 font-semibold text-muted">Conv.</th>
              <th className="text-right px-4 py-3 font-semibold text-muted">Aksi</th>
            </tr></thead>
            <tbody>
              {filtered.map(item => {
                const overBudget = item.spent > item.budget;
                return (
                  <tr key={item.id} className="border-b border-border hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-muted">{item.tanggal}</td>
                    <td className="px-4 py-3 font-medium">{item.platform}</td>
                    <td className="px-4 py-3">{item.campaign}</td>
                    <td className="px-4 py-3 text-right">{fmtRp(item.budget)}</td>
                    <td className={`px-4 py-3 text-right font-medium ${overBudget ? "text-red-600" : ""}`}>{fmtRp(item.spent)}</td>
                    <td className="px-4 py-3 text-right text-muted">{fmt(item.impressions)}</td>
                    <td className="px-4 py-3 text-right text-muted">{fmt(item.clicks)}</td>
                    <td className="px-4 py-3 text-right font-medium">{item.konversi}</td>
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
              {filtered.length === 0 && <tr><td colSpan={9} className="px-4 py-8 text-center text-muted">Tidak ada data</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modal === "view"} onClose={() => setModal(null)} title="Detail Budget Harian">
        {selected && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-xs text-muted">Tanggal</span><p className="font-medium">{selected.tanggal}</p></div>
              <div><span className="text-xs text-muted">Platform</span><p className="font-medium">{selected.platform}</p></div>
              <div className="col-span-2"><span className="text-xs text-muted">Campaign</span><p>{selected.campaign}</p></div>
              <div><span className="text-xs text-muted">Budget</span><p className="font-semibold">{fmtRp(selected.budget)}</p></div>
              <div><span className="text-xs text-muted">Spent</span><p className={`font-semibold ${selected.spent > selected.budget ? "text-red-600" : ""}`}>{fmtRp(selected.spent)}</p></div>
              <div><span className="text-xs text-muted">Impressions</span><p>{fmt(selected.impressions)}</p></div>
              <div><span className="text-xs text-muted">Clicks</span><p>{fmt(selected.clicks)}</p></div>
              <div><span className="text-xs text-muted">Konversi</span><p className="font-semibold">{selected.konversi}</p></div>
              <div><span className="text-xs text-muted">CTR</span><p>{selected.impressions > 0 ? (selected.clicks / selected.impressions * 100).toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 0}%</p></div>
            </div>
            <div><span className="text-xs text-muted">Catatan</span><p className="text-sm">{selected.catatan || "-"}</p></div>
          </div>
        )}
      </Modal>

      <Modal open={modal === "add" || modal === "edit"} onClose={() => setModal(null)} title={modal === "add" ? "Tambah Budget Harian" : "Edit Budget Harian"}>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Tanggal"><input type="date" className={inputClass} value={form.tanggal || ""} onChange={e => setForm({ ...form, tanggal: e.target.value })} /></FormField>
          <FormField label="Platform"><select className={selectClass} value={form.platform || ""} onChange={e => setForm({ ...form, platform: e.target.value })}>{PLATFORMS.map(o => <option key={o}>{o}</option>)}</select></FormField>
        </div>
        <FormField label="Campaign"><input className={inputClass} value={form.campaign || ""} onChange={e => setForm({ ...form, campaign: e.target.value })} /></FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Budget"><input type="number" className={inputClass} value={form.budget || 0} onChange={e => setForm({ ...form, budget: Number(e.target.value) })} /></FormField>
          <FormField label="Spent"><input type="number" className={inputClass} value={form.spent || 0} onChange={e => setForm({ ...form, spent: Number(e.target.value) })} /></FormField>
          <FormField label="Impressions"><input type="number" className={inputClass} value={form.impressions || 0} onChange={e => setForm({ ...form, impressions: Number(e.target.value) })} /></FormField>
          <FormField label="Clicks"><input type="number" className={inputClass} value={form.clicks || 0} onChange={e => setForm({ ...form, clicks: Number(e.target.value) })} /></FormField>
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
