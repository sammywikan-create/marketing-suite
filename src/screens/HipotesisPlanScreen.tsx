"use client";
import { useEffect, useState, useMemo } from "react";
import { HipotesisItem } from "@/lib/types";
import { getItems, SEEDS, addItem, updateItem, deleteItem } from "@/lib/store";
import PageHeader from "@/components/PageHeader";
import Modal, { FormField, inputClass, selectClass, btnPrimary, btnSecondary } from "@/components/Modal";
import StatusBadge from "@/components/StatusBadge";
import { Lightbulb, Eye, Pencil, Trash2, Columns3, List } from "lucide-react";

const STORE_KEY = "hipotesis";
const STATUSES: HipotesisItem["status"][] = ["Backlog", "Testing", "Validated", "Invalidated"];
const PRIORITIES: HipotesisItem["prioritas"][] = ["High", "Medium", "Low"];
const KATEGORI = ["Content", "Email", "Promo", "Ads", "SEO", "Social Media", "Product"];
const STATUS_COLORS: Record<string, string> = { Backlog: "#94a3b8", Testing: "#f59e0b", Validated: "#10b981", Invalidated: "#ef4444" };
const PRIO_BORDER: Record<string, string> = { High: "border-l-red-500", Medium: "border-l-yellow-500", Low: "border-l-gray-300" };

export default function HipotesisPlanScreen() {
  const [items, setItems] = useState<HipotesisItem[]>([]);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<"add" | "edit" | "view" | null>(null);
  const [selected, setSelected] = useState<HipotesisItem | null>(null);
  const [form, setForm] = useState<Partial<HipotesisItem>>({});
  const [view, setView] = useState<"kanban" | "list">("kanban");

  useEffect(() => { setItems(getItems(STORE_KEY, SEEDS.hipotesis)); }, []);

  const filtered = items.filter(i =>
    i.hipotesis.toLowerCase().includes(search.toLowerCase()) ||
    i.kategori.toLowerCase().includes(search.toLowerCase())
  );

  const stats = useMemo(() => {
    const total = items.length;
    const validated = items.filter(i => i.status === "Validated").length;
    const invalidated = items.filter(i => i.status === "Invalidated").length;
    const testing = items.filter(i => i.status === "Testing").length;
    const backlog = items.filter(i => i.status === "Backlog").length;
    const tested = validated + invalidated;
    const successRate = tested > 0 ? (validated / tested * 100) : 0;
    const catBreakdown = KATEGORI.map(k => ({ name: k, count: items.filter(i => i.kategori === k).length })).filter(d => d.count > 0).sort((a, b) => b.count - a.count);
    return { total, validated, invalidated, testing, backlog, successRate, catBreakdown };
  }, [items]);

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

  const KanbanCard = ({ item }: { item: HipotesisItem }) => (
    <div className={`bg-white rounded-lg p-3 shadow-sm border border-l-4 ${PRIO_BORDER[item.prioritas]} hover:shadow-md transition-shadow`}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <StatusBadge value={item.prioritas} />
        <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{item.kategori}</span>
      </div>
      <p className="text-xs font-medium leading-snug mb-1.5 line-clamp-2">{item.hipotesis}</p>
      {item.hasil && <p className="text-[10px] text-gray-400 line-clamp-1">Hasil: {item.hasil}</p>}
      <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-100">
        <span className="text-[10px] text-gray-400">{item.tanggal}</span>
        <div className="flex gap-0.5">
          <button onClick={() => openView(item)} className="p-1 rounded hover:bg-gray-100 text-gray-400"><Eye size={12} /></button>
          <button onClick={() => openEdit(item)} className="p-1 rounded hover:bg-gray-100 text-gray-400"><Pencil size={12} /></button>
          <button onClick={() => handleDelete(item.id)} className="p-1 rounded hover:bg-red-50 text-red-400"><Trash2 size={12} /></button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <PageHeader title="Hipotesis & Plan" icon={<Lightbulb size={20} />} count={items.length} onAdd={openAdd} addLabel="Tambah Hipotesis" search={search} onSearch={setSearch} />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white rounded-xl border p-4"><div className="text-xs text-gray-400">Total</div><div className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</div></div>
        <div className="bg-white rounded-xl border p-4"><div className="text-xs text-gray-400">Backlog</div><div className="text-2xl font-bold mt-1" style={{ color: STATUS_COLORS.Backlog }}>{stats.backlog}</div></div>
        <div className="bg-white rounded-xl border p-4"><div className="text-xs text-gray-400">Testing</div><div className="text-2xl font-bold mt-1" style={{ color: STATUS_COLORS.Testing }}>{stats.testing}</div></div>
        <div className="bg-white rounded-xl border p-4"><div className="text-xs text-gray-400">Validated</div><div className="text-2xl font-bold mt-1" style={{ color: STATUS_COLORS.Validated }}>{stats.validated}</div></div>
        <div className="bg-white rounded-xl border p-4"><div className="text-xs text-gray-400">Invalidated</div><div className="text-2xl font-bold mt-1" style={{ color: STATUS_COLORS.Invalidated }}>{stats.invalidated}</div></div>
        <div className="bg-white rounded-xl border p-4"><div className="text-xs text-gray-400">Success Rate</div><div className={`text-2xl font-bold mt-1 ${stats.successRate >= 50 ? "text-green-600" : "text-red-500"}`}>{stats.successRate.toFixed(0)}%</div></div>
      </div>

      {/* Category Breakdown */}
      {stats.catBreakdown.length > 0 && (
        <div className="bg-white rounded-xl border p-5">
          <h3 className="text-sm font-semibold mb-3">Hipotesis Per Kategori</h3>
          <div className="flex flex-wrap gap-2">
            {stats.catBreakdown.map((c, i) => (
              <div key={i} className="bg-gray-50 rounded-lg px-3 py-2 text-center">
                <div className="text-lg font-bold text-gray-900">{c.count}</div>
                <div className="text-[10px] text-gray-500">{c.name}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* View Toggle */}
      <div className="flex gap-1">
        <button onClick={() => setView("kanban")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${view === "kanban" ? "bg-blue-600 text-white" : "bg-white border text-gray-600 hover:bg-gray-50"}`}><Columns3 size={14} /> Kanban</button>
        <button onClick={() => setView("list")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${view === "list" ? "bg-blue-600 text-white" : "bg-white border text-gray-600 hover:bg-gray-50"}`}><List size={14} /> List</button>
      </div>

      {/* Kanban View */}
      {view === "kanban" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {STATUSES.map(status => {
            const colItems = filtered.filter(i => i.status === status);
            return (
              <div key={status} className="bg-gray-50 rounded-xl p-3 min-h-[200px]">
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[status] }} />
                    <span className="text-sm font-semibold">{status}</span>
                  </div>
                  <span className="text-xs text-gray-400 bg-white px-2 py-0.5 rounded-full">{colItems.length}</span>
                </div>
                <div className="space-y-2">
                  {colItems.map(item => <KanbanCard key={item.id} item={item} />)}
                  {colItems.length === 0 && <p className="text-xs text-gray-400 text-center py-6">Kosong</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List View */}
      {view === "list" && (
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
      )}

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
