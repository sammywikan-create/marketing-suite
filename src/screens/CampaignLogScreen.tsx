"use client";
import { useEffect, useState, useMemo } from "react";
import { CampaignItem } from "@/lib/types";
import { getItems, SEEDS, addItem, updateItem, deleteItem } from "@/lib/store";
import PageHeader from "@/components/PageHeader";
import Modal, { FormField, inputClass, selectClass, btnPrimary, btnSecondary } from "@/components/Modal";
import StatusBadge from "@/components/StatusBadge";
import { Megaphone, Eye, Pencil, Trash2, BarChart3, List } from "lucide-react";
import {
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from "recharts";

const STORE_KEY = "campaign";
const STATUSES: CampaignItem["status"][] = ["Planning", "Active", "Completed", "Paused"];
const PLATFORMS = ["Multi-channel", "TikTok", "Instagram", "Facebook", "YouTube", "Google Ads", "Email", "Website"];
const TIPE = ["Seasonal", "Product Launch", "Awareness", "Retention", "Performance", "Branding"];

function fmtRp(n: number) { return "Rp " + n.toLocaleString("id-ID"); }

const STATUS_COLORS: Record<string, string> = { Planning: "#3b82f6", Active: "#10b981", Completed: "#6366f1", Paused: "#f59e0b" };
const TIPE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

export default function CampaignLogScreen() {
  const [items, setItems] = useState<CampaignItem[]>([]);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<"add" | "edit" | "view" | null>(null);
  const [selected, setSelected] = useState<CampaignItem | null>(null);
  const [form, setForm] = useState<Partial<CampaignItem>>({});
  const [view, setView] = useState<"analytics" | "table">("analytics");

  useEffect(() => { setItems(getItems(STORE_KEY, SEEDS.campaign)); }, []);

  const filtered = items.filter(i =>
    i.nama.toLowerCase().includes(search.toLowerCase()) ||
    i.platform.toLowerCase().includes(search.toLowerCase())
  );

  const analytics = useMemo(() => {
    const totalBudget = items.reduce((s, c) => s + c.budget, 0);
    const active = items.filter(i => i.status === "Active").length;
    const completed = items.filter(i => i.status === "Completed").length;
    const avgBudget = items.length > 0 ? totalBudget / items.length : 0;

    const statusData = STATUSES.map(s => ({ name: s, value: items.filter(i => i.status === s).length, color: STATUS_COLORS[s] })).filter(d => d.value > 0);

    const platformBudget = PLATFORMS.map(p => {
      const cs = items.filter(i => i.platform === p);
      return { name: p, budget: cs.reduce((s, c) => s + c.budget, 0), count: cs.length };
    }).filter(d => d.count > 0).sort((a, b) => b.budget - a.budget);

    const tipeBudget = TIPE.map((t, i) => {
      const cs = items.filter(c => c.tipe === t);
      return { name: t, budget: cs.reduce((s, c) => s + c.budget, 0), count: cs.length, fill: TIPE_COLORS[i % TIPE_COLORS.length] };
    }).filter(d => d.count > 0).sort((a, b) => b.budget - a.budget);

    // Timeline: campaigns sorted by start date
    const timeline = [...items].sort((a, b) => a.mulai.localeCompare(b.mulai));

    return { totalBudget, active, completed, avgBudget, statusData, platformBudget, tipeBudget, timeline };
  }, [items]);

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
    <div className="space-y-5">
      <PageHeader title="Campaign Log" icon={<Megaphone size={20} />} count={items.length} onAdd={openAdd} addLabel="Tambah Campaign" search={search} onSearch={setSearch} />

      <div className="flex gap-1">
        <button onClick={() => setView("analytics")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${view === "analytics" ? "bg-blue-600 text-white" : "bg-white border text-gray-600 hover:bg-gray-50"}`}><BarChart3 size={14} /> Analytics</button>
        <button onClick={() => setView("table")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${view === "table" ? "bg-blue-600 text-white" : "bg-white border text-gray-600 hover:bg-gray-50"}`}><List size={14} /> Tabel Data</button>
      </div>

      {view === "analytics" && (
        <div className="space-y-5">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border p-4"><div className="text-xs text-gray-400 font-medium">Total Campaign</div><div className="text-2xl font-bold text-gray-900 mt-1">{items.length}</div></div>
            <div className="bg-white rounded-xl border p-4"><div className="text-xs text-gray-400 font-medium">Active</div><div className="text-2xl font-bold text-green-600 mt-1">{analytics.active}</div><div className="text-xs text-gray-400">{analytics.completed} completed</div></div>
            <div className="bg-white rounded-xl border p-4"><div className="text-xs text-gray-400 font-medium">Total Budget</div><div className="text-2xl font-bold text-blue-600 mt-1">{fmtRp(analytics.totalBudget)}</div></div>
            <div className="bg-white rounded-xl border p-4"><div className="text-xs text-gray-400 font-medium">Avg Budget</div><div className="text-2xl font-bold text-purple-600 mt-1">{fmtRp(analytics.avgBudget)}</div><div className="text-xs text-gray-400">per campaign</div></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Status Distribution */}
            <div className="bg-white rounded-xl border p-5">
              <h3 className="text-sm font-semibold mb-3">Distribusi Status</h3>
              {analytics.statusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart><Pie data={analytics.statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40} label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                    {analytics.statusData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie><Tooltip /></PieChart>
                </ResponsiveContainer>
              ) : <div className="text-sm text-gray-400 text-center py-10">Belum ada data</div>}
            </div>

            {/* Budget by Platform */}
            <div className="bg-white rounded-xl border p-5">
              <h3 className="text-sm font-semibold mb-3">Budget Per Platform</h3>
              {analytics.platformBudget.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={analytics.platformBudget} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 9 }} tickFormatter={(v) => fmtRp(v)} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={90} />
                    <Tooltip formatter={(v) => fmtRp(Number(v))} />
                    <Bar dataKey="budget" name="Budget" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="text-sm text-gray-400 text-center py-10">Belum ada data</div>}
            </div>

            {/* Budget by Type */}
            <div className="bg-white rounded-xl border p-5">
              <h3 className="text-sm font-semibold mb-3">Budget Per Tipe Campaign</h3>
              {analytics.tipeBudget.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={analytics.tipeBudget}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 9 }} tickFormatter={(v) => fmtRp(v)} />
                    <Tooltip formatter={(v) => fmtRp(Number(v))} />
                    <Bar dataKey="budget" name="Budget" radius={[4, 4, 0, 0]}>
                      {analytics.tipeBudget.map((d, i) => <Cell key={i} fill={d.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="text-sm text-gray-400 text-center py-10">Belum ada data</div>}
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-xl border p-5">
              <h3 className="text-sm font-semibold mb-3">Timeline Campaign</h3>
              <div className="space-y-2 max-h-[220px] overflow-y-auto">
                {analytics.timeline.map((c, i) => (
                  <div key={i} className="flex items-center gap-3 text-xs">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${c.status === "Active" ? "bg-green-500" : c.status === "Completed" ? "bg-blue-500" : c.status === "Paused" ? "bg-yellow-500" : "bg-gray-300"}`} />
                    <div className="flex-1 min-w-0 truncate font-medium">{c.nama}</div>
                    <div className="text-gray-400 shrink-0">{c.mulai} — {c.selesai || "..."}</div>
                    <div className="shrink-0 font-semibold">{fmtRp(c.budget)}</div>
                  </div>
                ))}
                {analytics.timeline.length === 0 && <div className="text-gray-400 text-center py-10">Belum ada data</div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {view === "table" && (
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
      )}

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
