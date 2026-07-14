"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CalendarDays, CheckCircle2, CircleDashed, Clock3, Plus, Trash2, UserRound, X } from "lucide-react";
import {
  createDailyAction,
  deleteDailyAction,
  isActionOverdue,
  loadDailyActions,
  saveDailyAction,
  type DailyActionItem,
  type DailyActionPriority,
  type DailyActionStatus,
} from "@/lib/laporan-harian/actions";

interface SuggestedAction {
  title: string;
  description: string;
  priority: DailyActionPriority;
  metric?: string;
}

interface ActionCenterProps {
  period: string;
  suggestions: SuggestedAction[];
  onCountChange?: (count: number) => void;
}

const STATUS_LABELS: Record<DailyActionStatus, string> = {
  todo: "Belum mulai",
  in_progress: "Dikerjakan",
  blocked: "Terhambat",
  done: "Selesai",
};

const PRIORITY_LABELS: Record<DailyActionPriority, string> = {
  high: "Tinggi",
  medium: "Sedang",
  low: "Rendah",
};

function todayInput() {
  return new Date().toISOString().slice(0, 10);
}

function defaultDueDate() {
  const date = new Date();
  date.setDate(date.getDate() + 2);
  return date.toISOString().slice(0, 10);
}

export default function ActionCenter({ period, suggestions, onCountChange }: ActionCenterProps) {
  const [items, setItems] = useState<DailyActionItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | DailyActionStatus>("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "high" as DailyActionPriority,
    assignee: "",
    dueDate: defaultDueDate(),
    source: "Manual",
    metric: "",
  });
  const [formError, setFormError] = useState("");

  useEffect(() => {
    const next = loadDailyActions(period);
    setItems(next);
    onCountChange?.(next.filter((item) => item.status !== "done").length);
  }, [period, onCountChange]);

  const assignees = useMemo(() => Array.from(new Set(items.map((item) => item.assignee).filter(Boolean))).sort(), [items]);
  const visibleItems = useMemo(() => items.filter((item) => {
    const statusMatch = statusFilter === "all" || item.status === statusFilter;
    const assigneeMatch = assigneeFilter === "all" || item.assignee === assigneeFilter;
    return statusMatch && assigneeMatch;
  }), [items, statusFilter, assigneeFilter]);

  const doneCount = items.filter((item) => item.status === "done").length;
  const overdueCount = items.filter((item) => isActionOverdue(item)).length;
  const blockedCount = items.filter((item) => item.status === "blocked").length;
  const progress = items.length ? Math.round((doneCount / items.length) * 100) : 0;

  function persist(item: DailyActionItem) {
    const next = saveDailyAction(item);
    setItems(next);
    onCountChange?.(next.filter((entry) => entry.status !== "done").length);
  }

  function openSuggestion(suggestion: SuggestedAction) {
    setForm({
      title: suggestion.title,
      description: suggestion.description,
      priority: suggestion.priority,
      assignee: "",
      dueDate: defaultDueDate(),
      source: "Rekomendasi briefing",
      metric: suggestion.metric || "",
    });
    setFormError("");
    setShowForm(true);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.title.trim() || !form.assignee.trim() || !form.dueDate) {
      setFormError("Judul, PIC, dan deadline wajib diisi.");
      return;
    }
    persist(createDailyAction(period, {
      ...form,
      title: form.title.trim(),
      description: form.description.trim(),
      assignee: form.assignee.trim(),
    }));
    setShowForm(false);
    setFormError("");
    setForm({ title: "", description: "", priority: "high", assignee: "", dueDate: defaultDueDate(), source: "Manual", metric: "" });
  }

  function updateStatus(item: DailyActionItem, status: DailyActionStatus) {
    const now = new Date().toISOString();
    persist({ ...item, status, updatedAt: now, completedAt: status === "done" ? now : undefined });
  }

  function remove(item: DailyActionItem) {
    if (!window.confirm(`Hapus tindakan “${item.title}”?`)) return;
    const next = deleteDailyAction(item.id, period);
    setItems(next);
    onCountChange?.(next.filter((entry) => entry.status !== "done").length);
  }

  return (
    <section className="flex flex-col gap-5" aria-labelledby="action-center-title">
      <div className="dashboard-panel p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="dashboard-eyebrow">Execution workspace</p>
            <h2 id="action-center-title" className="mt-2 text-xl font-bold tracking-tight text-foreground">Action Center</h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">Ubah insight menjadi pekerjaan yang jelas, lengkap dengan PIC, deadline, dan status penyelesaian.</p>
          </div>
          <button type="button" onClick={() => setShowForm(true)} className="dashboard-action bg-primary px-4 text-primary-foreground hover:opacity-90">
            <Plus size={16} aria-hidden="true" /> Buat tindakan
          </button>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: "Progress", value: `${progress}%`, detail: `${doneCount}/${items.length} selesai` },
            { label: "Aktif", value: String(items.length - doneCount), detail: "perlu ditindaklanjuti" },
            { label: "Terlambat", value: String(overdueCount), detail: "melewati deadline" },
            { label: "Terhambat", value: String(blockedCount), detail: "butuh eskalasi" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-border bg-background p-4">
              <p className="text-xs font-semibold text-muted">{stat.label}</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{stat.value}</p>
              <p className="mt-1 text-xs text-muted">{stat.detail}</p>
            </div>
          ))}
        </div>
      </div>

      {suggestions.length > 0 && (
        <div className="dashboard-panel p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} className="text-primary" aria-hidden="true" />
            <h3 className="text-sm font-bold text-foreground">Rekomendasi dari briefing</h3>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            {suggestions.slice(0, 3).map((suggestion) => (
              <article key={suggestion.title} className="flex flex-col gap-3 rounded-xl border border-border bg-background p-4">
                <div className="flex items-start justify-between gap-3">
                  <h4 className="text-sm font-bold leading-snug text-foreground">{suggestion.title}</h4>
                  <span className="rounded-full bg-muted/10 px-2 py-1 text-[10px] font-bold uppercase text-muted">{PRIORITY_LABELS[suggestion.priority]}</span>
                </div>
                <p className="flex-1 text-xs leading-relaxed text-muted">{suggestion.description}</p>
                <button type="button" onClick={() => openSuggestion(suggestion)} className="dashboard-action border border-border bg-card px-3 text-foreground hover:border-primary/30">Jadikan tindakan</button>
              </article>
            ))}
          </div>
        </div>
      )}

      <div className="dashboard-panel overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <h3 className="text-sm font-bold text-foreground">Daftar tindakan</h3>
          <div className="flex flex-wrap gap-2">
            <label className="sr-only" htmlFor="action-status-filter">Filter status</label>
            <select id="action-status-filter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className="min-h-10 rounded-lg border border-border bg-card px-3 text-xs font-semibold text-foreground">
              <option value="all">Semua status</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <label className="sr-only" htmlFor="action-assignee-filter">Filter PIC</label>
            <select id="action-assignee-filter" value={assigneeFilter} onChange={(event) => setAssigneeFilter(event.target.value)} className="min-h-10 rounded-lg border border-border bg-card px-3 text-xs font-semibold text-foreground">
              <option value="all">Semua PIC</option>
              {assignees.map((assignee) => <option key={assignee} value={assignee}>{assignee}</option>)}
            </select>
          </div>
        </div>

        {visibleItems.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-5 py-14 text-center">
            <CircleDashed size={30} className="text-muted" aria-hidden="true" />
            <div>
              <p className="text-sm font-bold text-foreground">Belum ada tindakan pada filter ini</p>
              <p className="mt-1 text-xs text-muted">Buat tindakan baru atau ubah filter untuk melihat pekerjaan lain.</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {visibleItems.map((item) => {
              const overdue = isActionOverdue(item);
              return (
                <article key={item.id} className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_150px_170px_auto] lg:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-bold uppercase text-muted">{PRIORITY_LABELS[item.priority]}</span>
                      {overdue && <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive">Terlambat</span>}
                      <span className="text-[10px] text-muted">{item.source}</span>
                    </div>
                    <h4 className={`mt-2 text-sm font-bold text-foreground ${item.status === "done" ? "line-through opacity-60" : ""}`}>{item.title}</h4>
                    {item.description && <p className="mt-1 text-xs leading-relaxed text-muted">{item.description}</p>}
                    {item.metric && <p className="mt-2 text-xs font-semibold text-primary">Bukti: {item.metric}</p>}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted"><UserRound size={14} aria-hidden="true" /><span className="font-semibold text-foreground">{item.assignee}</span></div>
                  <div className={`flex items-center gap-2 text-xs ${overdue ? "font-semibold text-destructive" : "text-muted"}`}><CalendarDays size={14} aria-hidden="true" />{new Date(`${item.dueDate}T00:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</div>
                  <div className="flex items-center gap-2">
                    <select aria-label={`Status ${item.title}`} value={item.status} onChange={(event) => updateStatus(item, event.target.value as DailyActionStatus)} className="min-h-10 rounded-lg border border-border bg-card px-2 text-xs font-semibold text-foreground">
                      {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                    <button type="button" onClick={() => remove(item)} className="flex size-10 items-center justify-center rounded-lg border border-border text-muted hover:border-destructive/30 hover:text-destructive" aria-label={`Hapus ${item.title}`}><Trash2 size={15} /></button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowForm(false); }}>
          <form onSubmit={submit} className="w-full max-w-xl rounded-2xl border border-border bg-card p-5 shadow-2xl sm:p-6" role="dialog" aria-modal="true" aria-labelledby="new-action-title">
            <div className="flex items-start justify-between gap-4">
              <div><p className="dashboard-eyebrow">Action plan</p><h3 id="new-action-title" className="mt-1 text-lg font-bold text-foreground">Buat tindakan baru</h3></div>
              <button type="button" onClick={() => setShowForm(false)} className="flex size-9 items-center justify-center rounded-lg text-muted hover:bg-background" aria-label="Tutup"><X size={18} /></button>
            </div>
            <div className="mt-5 grid gap-4">
              <label className="grid gap-1.5 text-xs font-semibold text-foreground">Judul tindakan<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm font-normal" autoFocus /></label>
              <label className="grid gap-1.5 text-xs font-semibold text-foreground">Deskripsi<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={3} className="rounded-lg border border-border bg-background p-3 text-sm font-normal" /></label>
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="grid gap-1.5 text-xs font-semibold text-foreground">Prioritas<select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value as DailyActionPriority })} className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm font-normal"><option value="high">Tinggi</option><option value="medium">Sedang</option><option value="low">Rendah</option></select></label>
                <label className="grid gap-1.5 text-xs font-semibold text-foreground">PIC<input value={form.assignee} onChange={(event) => setForm({ ...form, assignee: event.target.value })} placeholder="Nama penanggung jawab" className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm font-normal" /></label>
                <label className="grid gap-1.5 text-xs font-semibold text-foreground">Deadline<input type="date" min={todayInput()} value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm font-normal" /></label>
              </div>
              {formError && <p className="text-xs font-semibold text-destructive" role="alert">{formError}</p>}
              <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setShowForm(false)} className="dashboard-action border border-border px-4 text-foreground">Batal</button><button type="submit" className="dashboard-action bg-primary px-4 text-primary-foreground"><CheckCircle2 size={16} /> Simpan tindakan</button></div>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
