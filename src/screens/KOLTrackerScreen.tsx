"use client";
import { useEffect, useState, useMemo } from "react";
import { KOLItem } from "@/lib/types";
import { getItems, SEEDS, addItem, updateItem, deleteItem } from "@/lib/store";
import PageHeader from "@/components/PageHeader";
import Modal, { FormField, inputClass, selectClass, btnPrimary, btnSecondary } from "@/components/Modal";
import StatusBadge from "@/components/StatusBadge";
import { Users, Eye, Pencil, Trash2, BarChart3, LayoutGrid } from "lucide-react";
import {
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip,
} from "recharts";

const STORE_KEY = "kol";
const STATUSES: KOLItem["status"][] = ["Active", "Pending", "Completed", "Rejected"];
const PLATFORMS = ["TikTok", "Instagram", "YouTube", "Twitter/X", "Facebook"];
const KATEGORI = ["Beauty", "Food", "Tech", "Lifestyle", "Fashion", "Health", "Education", "Entertainment"];

function fmtRp(n: number) { return "Rp " + n.toLocaleString("id-ID"); }
const PLAT_COLORS: Record<string, string> = { TikTok: "#000", Instagram: "#E1306C", YouTube: "#FF0000", "Twitter/X": "#1DA1F2", Facebook: "#1877F2" };
const KAT_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316", "#ec4899"];

export default function KOLTrackerScreen() {
  const [items, setItems] = useState<KOLItem[]>([]);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<"add" | "edit" | "view" | null>(null);
  const [selected, setSelected] = useState<KOLItem | null>(null);
  const [form, setForm] = useState<Partial<KOLItem>>({});
  const [view, setView] = useState<"analytics" | "cards">("analytics");

  useEffect(() => { setItems(getItems(STORE_KEY, SEEDS.kol)); }, []);

  const filtered = items.filter(i =>
    i.nama.toLowerCase().includes(search.toLowerCase()) ||
    i.platform.toLowerCase().includes(search.toLowerCase()) ||
    i.kategori.toLowerCase().includes(search.toLowerCase())
  );

  const analytics = useMemo(() => {
    const totalSpend = items.reduce((s, k) => s + k.biaya, 0);
    const active = items.filter(i => i.status === "Active").length;
    const avgSpend = items.length > 0 ? totalSpend / items.length : 0;

    const platData = PLATFORMS.map(p => {
      const ks = items.filter(i => i.platform === p);
      return { name: p, spend: ks.reduce((s, k) => s + k.biaya, 0), count: ks.length, color: PLAT_COLORS[p] || "#94a3b8" };
    }).filter(d => d.count > 0).sort((a, b) => b.spend - a.spend);

    const katData = KATEGORI.map((k, i) => {
      const ks = items.filter(it => it.kategori === k);
      return { name: k, spend: ks.reduce((s, x) => s + x.biaya, 0), count: ks.length, color: KAT_COLORS[i % KAT_COLORS.length] };
    }).filter(d => d.count > 0).sort((a, b) => b.spend - a.spend);

    const topKOL = [...items].sort((a, b) => b.biaya - a.biaya).slice(0, 10);

    const statusData = STATUSES.map(s => ({ name: s, value: items.filter(i => i.status === s).length })).filter(d => d.value > 0);
    const statusColors: Record<string, string> = { Active: "#10b981", Pending: "#f59e0b", Completed: "#3b82f6", Rejected: "#ef4444" };

    return { totalSpend, active, avgSpend, platData, katData, topKOL, statusData, statusColors };
  }, [items]);

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
    <div className="space-y-5">
      <PageHeader title="KOL Tracker" icon={<Users size={20} />} count={items.length} onAdd={openAdd} addLabel="Tambah KOL" search={search} onSearch={setSearch} />

      <div className="flex gap-1">
        <button onClick={() => setView("analytics")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${view === "analytics" ? "bg-blue-600 text-white" : "bg-white border text-gray-600 hover:bg-gray-50"}`}><BarChart3 size={14} /> Analytics</button>
        <button onClick={() => setView("cards")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${view === "cards" ? "bg-blue-600 text-white" : "bg-white border text-gray-600 hover:bg-gray-50"}`}><LayoutGrid size={14} /> Cards</button>
      </div>

      {view === "analytics" && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border p-4"><div className="text-xs text-gray-400 font-medium">Total KOL</div><div className="text-2xl font-bold text-gray-900 mt-1">{items.length}</div></div>
            <div className="bg-white rounded-xl border p-4"><div className="text-xs text-gray-400 font-medium">Active</div><div className="text-2xl font-bold text-green-600 mt-1">{analytics.active}</div></div>
            <div className="bg-white rounded-xl border p-4"><div className="text-xs text-gray-400 font-medium">Total Spending</div><div className="text-2xl font-bold text-blue-600 mt-1">{fmtRp(analytics.totalSpend)}</div></div>
            <div className="bg-white rounded-xl border p-4"><div className="text-xs text-gray-400 font-medium">Avg Cost/KOL</div><div className="text-2xl font-bold text-purple-600 mt-1">{fmtRp(analytics.avgSpend)}</div></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Spending by Platform */}
            <div className="bg-white rounded-xl border p-5">
              <h3 className="text-sm font-semibold mb-3">Spending Per Platform</h3>
              {analytics.platData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart><Pie data={analytics.platData} dataKey="spend" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40} label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                    {analytics.platData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie><Tooltip formatter={(v) => fmtRp(Number(v))} /></PieChart>
                </ResponsiveContainer>
              ) : <div className="text-sm text-gray-400 text-center py-10">Belum ada data</div>}
            </div>

            {/* Spending by Category */}
            <div className="bg-white rounded-xl border p-5">
              <h3 className="text-sm font-semibold mb-3">Spending Per Kategori</h3>
              {analytics.katData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={analytics.katData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 9 }} tickFormatter={(v) => fmtRp(v)} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
                    <Tooltip formatter={(v) => fmtRp(Number(v))} />
                    <Bar dataKey="spend" name="Spending" radius={[0, 4, 4, 0]}>
                      {analytics.katData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="text-sm text-gray-400 text-center py-10">Belum ada data</div>}
            </div>

            {/* Top KOL by Spending */}
            <div className="bg-white rounded-xl border p-5">
              <h3 className="text-sm font-semibold mb-3">Top KOL (by Spending)</h3>
              <div className="space-y-2 max-h-[220px] overflow-y-auto">
                {analytics.topKOL.map((k, i) => (
                  <div key={i} className="flex items-center gap-3 text-xs">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold shrink-0">{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{k.nama}</div>
                      <div className="text-gray-400">{k.platform} · {k.kategori}</div>
                    </div>
                    <div className="font-semibold shrink-0">{fmtRp(k.biaya)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Status Overview */}
            <div className="bg-white rounded-xl border p-5">
              <h3 className="text-sm font-semibold mb-3">Status Overview</h3>
              <div className="grid grid-cols-2 gap-3">
                {analytics.statusData.map((s, i) => (
                  <div key={i} className="rounded-lg p-3 text-center" style={{ backgroundColor: analytics.statusColors[s.name] + "15" }}>
                    <div className="text-2xl font-bold" style={{ color: analytics.statusColors[s.name] }}>{s.value}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{s.name}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {view === "cards" && (
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
      )}

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
