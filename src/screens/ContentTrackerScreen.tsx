"use client";
import { useEffect, useState, useMemo } from "react";
import { ContentItem } from "@/lib/types";
import { getItems, SEEDS, addItem, updateItem, deleteItem } from "@/lib/store";
import PageHeader from "@/components/PageHeader";
import Modal, { FormField, inputClass, selectClass, btnPrimary, btnSecondary } from "@/components/Modal";
import StatusBadge from "@/components/StatusBadge";
import { FileText, Eye, Pencil, Trash2, BarChart3, List } from "lucide-react";
import {
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, LineChart, Line,
} from "recharts";

const STORE_KEY = "content";
const STATUSES: ContentItem["status"][] = ["Draft", "In Review", "Published", "Scheduled"];
const PLATFORMS = ["Instagram", "TikTok", "YouTube", "Facebook", "Twitter/X", "Website", "LinkedIn"];
const JENIS = ["Reels", "Video", "Artikel", "Ads Copy", "Story", "Carousel", "Infografis", "Podcast"];

const STATUS_COLORS: Record<string, string> = { Draft: "#94a3b8", "In Review": "#f59e0b", Published: "#10b981", Scheduled: "#3b82f6" };
const PLATFORM_COLORS: Record<string, string> = { Instagram: "#E1306C", TikTok: "#000000", YouTube: "#FF0000", Facebook: "#1877F2", "Twitter/X": "#1DA1F2", Website: "#6366f1", LinkedIn: "#0077B5" };

export default function ContentTrackerScreen() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<"add" | "edit" | "view" | null>(null);
  const [selected, setSelected] = useState<ContentItem | null>(null);
  const [form, setForm] = useState<Partial<ContentItem>>({});
  const [view, setView] = useState<"analytics" | "table">("analytics");

  useEffect(() => { setItems(getItems(STORE_KEY, SEEDS.content)); }, []);

  const filtered = items.filter(i =>
    i.judul.toLowerCase().includes(search.toLowerCase()) ||
    i.platform.toLowerCase().includes(search.toLowerCase()) ||
    i.pic.toLowerCase().includes(search.toLowerCase())
  );

  // ═══ ANALYTICS DATA ═══
  const analytics = useMemo(() => {
    const total = items.length;
    const published = items.filter(i => i.status === "Published").length;
    const publishRate = total > 0 ? (published / total * 100) : 0;
    const thisWeek = items.filter(i => {
      const d = new Date(i.tanggal);
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 86400000);
      return d >= weekAgo && d <= now;
    }).length;

    // Status distribution
    const statusData = STATUSES.map(s => ({ name: s, value: items.filter(i => i.status === s).length, color: STATUS_COLORS[s] })).filter(d => d.value > 0);

    // Platform distribution
    const platformData = PLATFORMS.map(p => ({ name: p, count: items.filter(i => i.platform === p).length, color: PLATFORM_COLORS[p] || "#94a3b8" })).filter(d => d.count > 0).sort((a, b) => b.count - a.count);

    // Jenis distribution
    const jenisData = JENIS.map(j => ({ name: j, count: items.filter(i => i.jenis === j).length })).filter(d => d.count > 0).sort((a, b) => b.count - a.count);

    // Weekly production trend (last 8 weeks)
    const weeklyData: { week: string; total: number; published: number }[] = [];
    for (let w = 7; w >= 0; w--) {
      const now = new Date();
      const weekStart = new Date(now.getTime() - (w * 7 + 6) * 86400000);
      const weekEnd = new Date(now.getTime() - w * 7 * 86400000);
      const label = `W${8 - w}`;
      const inWeek = items.filter(i => { const d = new Date(i.tanggal); return d >= weekStart && d <= weekEnd; });
      weeklyData.push({ week: label, total: inWeek.length, published: inWeek.filter(i => i.status === "Published").length });
    }

    // PIC productivity
    const picMap = new Map<string, { total: number; published: number }>();
    items.forEach(i => {
      const pic = i.pic || "Unassigned";
      const curr = picMap.get(pic) || { total: 0, published: 0 };
      curr.total++;
      if (i.status === "Published") curr.published++;
      picMap.set(pic, curr);
    });
    const picData = Array.from(picMap.entries()).map(([name, d]) => ({ name, ...d, rate: d.total > 0 ? Math.round(d.published / d.total * 100) : 0 })).sort((a, b) => b.total - a.total);

    return { total, published, publishRate, thisWeek, statusData, platformData, jenisData, weeklyData, picData };
  }, [items]);

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
    <div className="space-y-5">
      <PageHeader title="Content Tracker" icon={<FileText size={20} />} count={items.length} onAdd={openAdd} addLabel="Tambah Konten" search={search} onSearch={setSearch} />

      {/* View toggle */}
      <div className="flex gap-1">
        <button onClick={() => setView("analytics")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${view === "analytics" ? "bg-blue-600 text-white" : "bg-white border text-gray-600 hover:bg-gray-50"}`}><BarChart3 size={14} /> Analytics</button>
        <button onClick={() => setView("table")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${view === "table" ? "bg-blue-600 text-white" : "bg-white border text-gray-600 hover:bg-gray-50"}`}><List size={14} /> Tabel Data</button>
      </div>

      {view === "analytics" && (
        <div className="space-y-5">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border p-4">
              <div className="text-xs text-gray-400 font-medium">Total Konten</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">{analytics.total}</div>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <div className="text-xs text-gray-400 font-medium">Published</div>
              <div className="text-2xl font-bold text-green-600 mt-1">{analytics.published}</div>
              <div className="text-xs text-gray-400">{analytics.publishRate.toFixed(0)}% publish rate</div>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <div className="text-xs text-gray-400 font-medium">Minggu Ini</div>
              <div className="text-2xl font-bold text-blue-600 mt-1">{analytics.thisWeek}</div>
              <div className="text-xs text-gray-400">konten baru</div>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <div className="text-xs text-gray-400 font-medium">Platform Aktif</div>
              <div className="text-2xl font-bold text-purple-600 mt-1">{analytics.platformData.length}</div>
              <div className="text-xs text-gray-400">dari {PLATFORMS.length} platform</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Status Distribution */}
            <div className="bg-white rounded-xl border p-5">
              <h3 className="text-sm font-semibold mb-3">Distribusi Status</h3>
              {analytics.statusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={analytics.statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40} label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                      {analytics.statusData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : <div className="text-sm text-gray-400 text-center py-10">Belum ada data</div>}
            </div>

            {/* Platform Distribution */}
            <div className="bg-white rounded-xl border p-5">
              <h3 className="text-sm font-semibold mb-3">Konten Per Platform</h3>
              {analytics.platformData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={analytics.platformData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
                    <Tooltip />
                    <Bar dataKey="count" name="Konten" radius={[0, 4, 4, 0]}>
                      {analytics.platformData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="text-sm text-gray-400 text-center py-10">Belum ada data</div>}
            </div>

            {/* Weekly Production Trend */}
            <div className="bg-white rounded-xl border p-5">
              <h3 className="text-sm font-semibold mb-3">Tren Produksi Mingguan</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={analytics.weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="total" name="Total" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="published" name="Published" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* PIC Productivity */}
            <div className="bg-white rounded-xl border p-5">
              <h3 className="text-sm font-semibold mb-3">Produktivitas PIC</h3>
              {analytics.picData.length > 0 ? (
                <div className="space-y-2.5 max-h-[220px] overflow-y-auto">
                  {analytics.picData.map((p, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">{p.name.charAt(0).toUpperCase()}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium truncate">{p.name}</span>
                          <span className="text-gray-400 shrink-0">{p.total} konten · {p.rate}% published</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${analytics.picData[0]?.total > 0 ? (p.total / analytics.picData[0].total * 100) : 0}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <div className="text-sm text-gray-400 text-center py-10">Belum ada data</div>}
            </div>
          </div>

          {/* Jenis Content Breakdown */}
          <div className="bg-white rounded-xl border p-5">
            <h3 className="text-sm font-semibold mb-3">Breakdown Jenis Konten</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
              {analytics.jenisData.map((j, i) => (
                <div key={i} className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-lg font-bold text-gray-900">{j.count}</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">{j.name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {view === "table" && (
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
      )}

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
