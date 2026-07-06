"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Users, UserPlus, UserCheck, Search, Plus, Save, Trash2, Edit3,
  TrendingUp, Target, BarChart3, ClipboardList, Send, Heart,
  Video, Package, ArrowRight, CheckCircle2, Clock, AlertTriangle,
  Loader2, RefreshCw, ChevronRight, X, Calendar,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, LineChart, Line,
} from "recharts";

// ─── TYPES ──────────────────────────────────────────────
type StaffRole = "akuisisi" | "retensi";
type PipelineStage = "found" | "contacted" | "responded" | "joined" | "sample_sent" | "first_upload" | "handover" | "active" | "loyal";
type TabKey = "dashboard" | "input-akuisisi" | "input-retensi" | "pipeline" | "kpi";

interface DailyLog {
  id?: string;
  staff_role: StaffRole;
  tanggal: string;
  period: string;
  creators_found: number; outreach_sent: number; responses_received: number;
  creators_joined: number; samples_sent: number; first_uploads: number; handovers: number;
  followups_done: number; active_monitored: number; insights_shared: number;
  broadcasts_sent: number; scripts_sent: number; content_delivered: number;
  samples_sent_ret: number; reactivated: number;
  notes: string;
}

interface PipelineEntry {
  id: string;
  creator_name: string;
  platform: string;
  stage: PipelineStage;
  assigned_to: StaffRole;
  contact_date: string | null;
  join_date: string | null;
  sample_sent_date: string | null;
  first_upload_date: string | null;
  handover_date: string | null;
  status: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

// ─── HELPERS ────────────────────────────────────────────
const fN = (n: number) => n.toLocaleString("id-ID");
const fP = (n: number) => `${n.toFixed(1)}%`;
const today = () => new Date().toISOString().slice(0, 10);
const currentPeriod = () => new Date().toISOString().slice(0, 7);

const STAGE_CONFIG: Record<PipelineStage, { label: string; emoji: string; color: string }> = {
  found:        { label: "Ditemukan",      emoji: "🔍", color: "bg-gray-100 text-gray-700" },
  contacted:    { label: "Dikontak",       emoji: "📩", color: "bg-blue-100 text-blue-700" },
  responded:    { label: "Respon",         emoji: "💬", color: "bg-indigo-100 text-indigo-700" },
  joined:       { label: "Join",           emoji: "✅", color: "bg-green-100 text-green-700" },
  sample_sent:  { label: "Sampel Dikirim", emoji: "📦", color: "bg-yellow-100 text-yellow-700" },
  first_upload: { label: "Upload Pertama", emoji: "🎬", color: "bg-purple-100 text-purple-700" },
  handover:     { label: "Handover",       emoji: "🤝", color: "bg-teal-100 text-teal-700" },
  active:       { label: "Aktif Rutin",    emoji: "🔥", color: "bg-orange-100 text-orange-700" },
  loyal:        { label: "Loyal Creator",  emoji: "⭐", color: "bg-amber-100 text-amber-700" },
};

const STAGES_ORDER: PipelineStage[] = ["found", "contacted", "responded", "joined", "sample_sent", "first_upload", "handover", "active", "loyal"];
const PIE_COLORS = ["#6366f1", "#3b82f6", "#06b6d4", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];

const emptyAkuisisiLog = (): DailyLog => ({
  staff_role: "akuisisi", tanggal: today(), period: currentPeriod(),
  creators_found: 0, outreach_sent: 0, responses_received: 0, creators_joined: 0,
  samples_sent: 0, first_uploads: 0, handovers: 0,
  followups_done: 0, active_monitored: 0, insights_shared: 0, broadcasts_sent: 0,
  scripts_sent: 0, content_delivered: 0, samples_sent_ret: 0, reactivated: 0,
  notes: "",
});

const emptyRetensiLog = (): DailyLog => ({
  staff_role: "retensi", tanggal: today(), period: currentPeriod(),
  creators_found: 0, outreach_sent: 0, responses_received: 0, creators_joined: 0,
  samples_sent: 0, first_uploads: 0, handovers: 0,
  followups_done: 0, active_monitored: 0, insights_shared: 0, broadcasts_sent: 0,
  scripts_sent: 0, content_delivered: 0, samples_sent_ret: 0, reactivated: 0,
  notes: "",
});

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════
export default function StaffTrackerScreen() {
  const [tab, setTab] = useState<TabKey>("dashboard");
  const [period, setPeriod] = useState(currentPeriod());
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [pipeline, setPipeline] = useState<PipelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [logsRes, pipeRes] = await Promise.all([
        fetch(`/api/staff-tracker?type=logs&period=${period}`),
        fetch(`/api/staff-tracker?type=pipeline`),
      ]);
      const logsData = await logsRes.json();
      const pipeData = await pipeRes.json();
      setLogs(logsData.data || []);
      setPipeline(pipeData.data || []);
    } catch {
      setMsg({ type: "error", text: "Gagal memuat data" });
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Save daily log
  const saveDailyLog = async (log: DailyLog) => {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/staff-tracker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...log, type: "log" }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setMsg({ type: "success", text: "✅ Data berhasil disimpan!" });
      fetchData();
    } catch (e: any) {
      setMsg({ type: "error", text: e.message || "Gagal menyimpan" });
    } finally {
      setSaving(false);
    }
  };

  // Pipeline CRUD
  const addCreator = async (entry: Partial<PipelineEntry>) => {
    try {
      await fetch("/api/staff-tracker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...entry, type: "pipeline" }),
      });
      fetchData();
    } catch { setMsg({ type: "error", text: "Gagal menambah creator" }); }
  };

  const updateCreator = async (id: string, updates: Partial<PipelineEntry>) => {
    try {
      await fetch("/api/staff-tracker", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updates }),
      });
      fetchData();
    } catch { setMsg({ type: "error", text: "Gagal update creator" }); }
  };

  const deleteCreator = async (id: string) => {
    if (!confirm("Hapus creator ini?")) return;
    try {
      await fetch(`/api/staff-tracker?type=pipeline&id=${id}`, { method: "DELETE" });
      fetchData();
    } catch { setMsg({ type: "error", text: "Gagal menghapus" }); }
  };

  // Aggregated stats
  const akuisisiLogs = useMemo(() => logs.filter(l => l.staff_role === "akuisisi"), [logs]);
  const retensiLogs = useMemo(() => logs.filter(l => l.staff_role === "retensi"), [logs]);

  const akuisisiStats = useMemo(() => {
    const sum = (key: keyof DailyLog) => akuisisiLogs.reduce((a, l) => a + (Number(l[key]) || 0), 0);
    return {
      found: sum("creators_found"), outreach: sum("outreach_sent"),
      responses: sum("responses_received"), joined: sum("creators_joined"),
      samples: sum("samples_sent"), uploads: sum("first_uploads"), handovers: sum("handovers"),
      days: akuisisiLogs.length,
    };
  }, [akuisisiLogs]);

  const retensiStats = useMemo(() => {
    const sum = (key: keyof DailyLog) => retensiLogs.reduce((a, l) => a + (Number(l[key]) || 0), 0);
    return {
      followups: sum("followups_done"), monitored: sum("active_monitored"),
      insights: sum("insights_shared"), broadcasts: sum("broadcasts_sent"),
      scripts: sum("scripts_sent"), content: sum("content_delivered"),
      samples: sum("samples_sent_ret"), reactivated: sum("reactivated"),
      days: retensiLogs.length,
    };
  }, [retensiLogs]);

  const pipelineStats = useMemo(() => {
    const counts: Record<PipelineStage, number> = {} as any;
    STAGES_ORDER.forEach(s => { counts[s] = 0; });
    pipeline.forEach(p => { counts[p.stage] = (counts[p.stage] || 0) + 1; });
    return counts;
  }, [pipeline]);

  const tabs = [
    { key: "dashboard" as TabKey, label: "Dashboard", icon: <BarChart3 size={14} /> },
    { key: "input-akuisisi" as TabKey, label: "Input Akuisisi", icon: <UserPlus size={14} /> },
    { key: "input-retensi" as TabKey, label: "Input Retensi", icon: <UserCheck size={14} /> },
    { key: "pipeline" as TabKey, label: "Pipeline", icon: <ArrowRight size={14} /> },
    { key: "kpi" as TabKey, label: "KPI & Target", icon: <Target size={14} /> },
  ];

  return (
    <div className="space-y-5 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Users size={22} /> Staff Tracker — Affiliate Team
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">Tracking harian staf Akuisisi & Retensi</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="month" value={period} onChange={e => setPeriod(e.target.value)}
            className="border rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-800 dark:border-gray-700" />
          <button onClick={fetchData} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition">
            <RefreshCw size={16} className={loading ? "animate-spin text-blue-500" : "text-gray-400"} />
          </button>
        </div>
      </div>

      {/* Message */}
      {msg && (
        <div className={`flex items-center gap-2 p-3 rounded-xl text-sm ${msg.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {msg.type === "success" ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          {msg.text}
          <button onClick={() => setMsg(null)} className="ml-auto"><X size={14} /></button>
        </div>
      )}

      {/* Tab Bar */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
              tab === t.key ? "bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white" : "text-gray-500 hover:text-gray-700"
            }`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-20 gap-2 text-gray-400">
          <Loader2 size={20} className="animate-spin" /> Memuat data...
        </div>
      ) : (
        <div key={tab} className="animate-fade-slide-up">
          {tab === "dashboard" && <DashboardTab akuisisi={akuisisiStats} retensi={retensiStats} pipelineStats={pipelineStats} pipeline={pipeline} akuisisiLogs={akuisisiLogs} retensiLogs={retensiLogs} />}
          {tab === "input-akuisisi" && <InputTab role="akuisisi" logs={akuisisiLogs} onSave={saveDailyLog} saving={saving} />}
          {tab === "input-retensi" && <InputTab role="retensi" logs={retensiLogs} onSave={saveDailyLog} saving={saving} />}
          {tab === "pipeline" && <PipelineTab pipeline={pipeline} onAdd={addCreator} onUpdate={updateCreator} onDelete={deleteCreator} />}
          {tab === "kpi" && <KPITab akuisisi={akuisisiStats} retensi={retensiStats} pipeline={pipeline} period={period} />}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// DASHBOARD TAB
// ═══════════════════════════════════════════════════════════
function DashboardTab({ akuisisi, retensi, pipelineStats, pipeline, akuisisiLogs, retensiLogs }: {
  akuisisi: any; retensi: any; pipelineStats: Record<PipelineStage, number>;
  pipeline: PipelineEntry[]; akuisisiLogs: DailyLog[]; retensiLogs: DailyLog[];
}) {
  const funnelData = STAGES_ORDER.map(s => ({ name: STAGE_CONFIG[s].label, value: pipelineStats[s], emoji: STAGE_CONFIG[s].emoji }));
  const needFollowUp = pipeline.filter(p => {
    if (p.stage === "sample_sent" && p.sample_sent_date) {
      const days = (Date.now() - new Date(p.sample_sent_date).getTime()) / 86400000;
      return days > 7;
    }
    return false;
  });

  // Trend data (last 7 days from logs)
  const trendData = useMemo(() => {
    const allLogs = [...akuisisiLogs, ...retensiLogs].sort((a, b) => a.tanggal.localeCompare(b.tanggal));
    const dateMap = new Map<string, { akuisisi: number; retensi: number }>();
    allLogs.forEach(l => {
      const d = dateMap.get(l.tanggal) || { akuisisi: 0, retensi: 0 };
      if (l.staff_role === "akuisisi") d.akuisisi = (l.creators_found || 0) + (l.outreach_sent || 0);
      else d.retensi = (l.followups_done || 0) + (l.content_delivered || 0);
      dateMap.set(l.tanggal, d);
    });
    return Array.from(dateMap.entries()).slice(-14).map(([date, vals]) => ({
      date: date.slice(5),
      Akuisisi: vals.akuisisi,
      Retensi: vals.retensi,
    }));
  }, [akuisisiLogs, retensiLogs]);

  return (
    <div className="space-y-5">
      {/* 2 Staff Score Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Akuisisi Card */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <UserPlus size={20} />
            <h3 className="font-bold">Staf Akuisisi (NEW)</h3>
            <span className="ml-auto text-xs bg-white/20 px-2 py-0.5 rounded-full">{akuisisi.days} hari data</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Ditemukan", value: akuisisi.found },
              { label: "Outreach", value: akuisisi.outreach },
              { label: "Join", value: akuisisi.joined },
              { label: "Sampel", value: akuisisi.samples },
              { label: "Upload 1st", value: akuisisi.uploads },
              { label: "Handover", value: akuisisi.handovers },
            ].map(item => (
              <div key={item.label} className="bg-white/10 rounded-xl p-2.5 text-center">
                <div className="text-xl font-black">{fN(item.value)}</div>
                <div className="text-[10px] text-blue-200">{item.label}</div>
              </div>
            ))}
          </div>
          {akuisisi.outreach > 0 && (
            <div className="mt-3 text-xs text-blue-200">
              Conversion: Outreach→Respon {fP(akuisisi.responses / akuisisi.outreach * 100)} · Respon→Join {akuisisi.responses > 0 ? fP(akuisisi.joined / akuisisi.responses * 100) : "—"}
            </div>
          )}
        </div>

        {/* Retensi Card */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <UserCheck size={20} />
            <h3 className="font-bold">Staf Retensi</h3>
            <span className="ml-auto text-xs bg-white/20 px-2 py-0.5 rounded-full">{retensi.days} hari data</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Follow Up", value: retensi.followups },
              { label: "Dipantau", value: retensi.monitored },
              { label: "Insight", value: retensi.insights },
              { label: "Broadcast", value: retensi.broadcasts },
              { label: "Konten Kirim", value: retensi.content },
              { label: "Reaktivasi", value: retensi.reactivated },
            ].map(item => (
              <div key={item.label} className="bg-white/10 rounded-xl p-2.5 text-center">
                <div className="text-xl font-black">{fN(item.value)}</div>
                <div className="text-[10px] text-emerald-200">{item.label}</div>
              </div>
            ))}
          </div>
          {retensi.days > 0 && (
            <div className="mt-3 text-xs text-emerald-200">
              Rata-rata/hari: {(retensi.followups / retensi.days).toFixed(1)} follow up · {(retensi.content / retensi.days).toFixed(1)} konten dikirim
            </div>
          )}
        </div>
      </div>

      {/* Pipeline Funnel */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 p-5">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <ArrowRight size={16} /> Pipeline Creator ({pipeline.length} total)
        </h3>
        <div className="flex items-end gap-1 h-[180px]">
          {funnelData.map((item, i) => {
            const maxVal = Math.max(...funnelData.map(d => d.value), 1);
            const height = (item.value / maxVal) * 140 + 20;
            return (
              <div key={item.name} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{item.value}</span>
                <div className="w-full rounded-t-lg transition-all" style={{
                  height: `${height}px`,
                  backgroundColor: PIE_COLORS[i % PIE_COLORS.length],
                  opacity: 0.8,
                }} />
                <span className="text-[9px] text-gray-500 text-center leading-tight">{item.emoji}<br/>{item.name}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Activity Trend + Follow Up Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Trend */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 p-5">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">📈 Aktivitas Harian</h3>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="Akuisisi" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="Retensi" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-10 text-sm text-gray-400">Belum ada data aktivitas</div>
          )}
        </div>

        {/* Follow Up Alert */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 p-5">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <AlertTriangle size={14} className="text-amber-500" /> Perlu Follow Up ({needFollowUp.length})
          </h3>
          {needFollowUp.length === 0 ? (
            <div className="text-center py-10 text-sm text-gray-400">✅ Semua creator on track</div>
          ) : (
            <div className="space-y-2 max-h-[180px] overflow-y-auto">
              {needFollowUp.map(p => (
                <div key={p.id} className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-2.5">
                  <span className="text-base">⚠️</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">{p.creator_name}</div>
                    <div className="text-[10px] text-gray-500">Sampel dikirim {p.sample_sent_date} — belum upload</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// INPUT TAB (Akuisisi / Retensi)
// ═══════════════════════════════════════════════════════════
function InputTab({ role, logs, onSave, saving }: {
  role: StaffRole; logs: DailyLog[]; onSave: (log: DailyLog) => void; saving: boolean;
}) {
  const [form, setForm] = useState<DailyLog>(role === "akuisisi" ? emptyAkuisisiLog() : emptyRetensiLog());
  const [selectedDate, setSelectedDate] = useState(today());

  // Load existing log if date changes
  useEffect(() => {
    const existing = logs.find(l => l.tanggal === selectedDate);
    if (existing) {
      setForm(existing);
    } else {
      const empty = role === "akuisisi" ? emptyAkuisisiLog() : emptyRetensiLog();
      setForm({ ...empty, tanggal: selectedDate, period: selectedDate.slice(0, 7) });
    }
  }, [selectedDate, logs, role]);

  const updateField = (key: keyof DailyLog, value: number | string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onSave({ ...form, tanggal: selectedDate, period: selectedDate.slice(0, 7) });
  };

  const akuisisiFields = [
    { key: "creators_found", label: "Creator Ditemukan", icon: "🔍", desc: "Jumlah creator baru yang ditemukan hari ini" },
    { key: "outreach_sent", label: "Outreach Terkirim", icon: "📩", desc: "DM TikTok, WhatsApp, Telegram, dll" },
    { key: "responses_received", label: "Respon Diterima", icon: "💬", desc: "Creator yang membalas outreach" },
    { key: "creators_joined", label: "Creator Join", icon: "✅", desc: "Creator yang berhasil jadi affiliate" },
    { key: "samples_sent", label: "Sampel Dikirim", icon: "📦", desc: "Produk sampel yang dikirimkan" },
    { key: "first_uploads", label: "Upload Pertama", icon: "🎬", desc: "Creator yang upload konten pertama" },
    { key: "handovers", label: "Handover ke Retensi", icon: "🤝", desc: "Creator yang di-handover ke tim retensi" },
  ];

  const retensiFields = [
    { key: "followups_done", label: "Follow Up Dilakukan", icon: "📞", desc: "Follow up creator lama yang sudah join" },
    { key: "active_monitored", label: "Creator Dipantau", icon: "👁️", desc: "Creator aktif yang dipantau performanya" },
    { key: "insights_shared", label: "Insight Dibagikan", icon: "💡", desc: "Insight konten yang lagi naik" },
    { key: "broadcasts_sent", label: "Broadcast Terkirim", icon: "📢", desc: "Campaign baru/program reward" },
    { key: "scripts_sent", label: "Skrip Dikirim", icon: "📝", desc: "Ide skrip ke content support" },
    { key: "content_delivered", label: "Konten Dikirim", icon: "🎥", desc: "Konten jadi dikirim ke affiliator" },
    { key: "samples_sent_ret", label: "Sampel Dikirim", icon: "📦", desc: "Sampel untuk creator yang sudah aktif" },
    { key: "reactivated", label: "Creator Direaktivasi", icon: "🔄", desc: "Creator dormant yang diaktifkan kembali" },
  ];

  const fields = role === "akuisisi" ? akuisisiFields : retensiFields;
  const existingLog = logs.find(l => l.tanggal === selectedDate);

  return (
    <div className="space-y-4">
      {/* Date selector + existing indicator */}
      <div className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4">
        <Calendar size={16} className="text-gray-400" />
        <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
          className="border rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-700 dark:border-gray-600" />
        {existingLog && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✅ Data sudah ada (akan di-update)</span>}
        <span className="ml-auto text-xs text-gray-400">{role === "akuisisi" ? "Staf Akuisisi (NEW)" : "Staf Retensi"}</span>
      </div>

      {/* Input fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {fields.map(f => (
          <div key={f.key} className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{f.icon}</span>
              <div>
                <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">{f.label}</div>
                <div className="text-[10px] text-gray-400">{f.desc}</div>
              </div>
            </div>
            <input
              type="number" min={0}
              value={(form as any)[f.key] || 0}
              onChange={e => updateField(f.key as keyof DailyLog, parseInt(e.target.value) || 0)}
              className="w-full border rounded-lg px-3 py-2 text-lg font-bold text-center bg-gray-50 dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        ))}
      </div>

      {/* Notes */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4">
        <label className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2 block">📝 Catatan Hari Ini</label>
        <textarea
          value={form.notes}
          onChange={e => updateField("notes", e.target.value)}
          rows={3}
          placeholder="Catatan, kendala, atau hal penting hari ini..."
          className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
        />
      </div>

      {/* Save button */}
      <button onClick={handleSave} disabled={saving}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition shadow-lg">
        {saving ? <><Loader2 size={16} className="animate-spin" /> Menyimpan...</> : <><Save size={16} /> Simpan Data Hari Ini</>}
      </button>

      {/* Recent logs */}
      {logs.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">📅 Data Terakhir</h3>
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {logs.slice(0, 10).map((l, i) => (
              <div key={i} className="flex items-center gap-3 text-sm p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                <span className="text-xs text-gray-400 w-16 flex-shrink-0">{l.tanggal?.slice(5)}</span>
                {role === "akuisisi" ? (
                  <span className="text-xs text-gray-600 dark:text-gray-300">
                    🔍{l.creators_found} · 📩{l.outreach_sent} · ✅{l.creators_joined} · 🤝{l.handovers}
                  </span>
                ) : (
                  <span className="text-xs text-gray-600 dark:text-gray-300">
                    📞{l.followups_done} · 👁️{l.active_monitored} · 🎥{l.content_delivered} · 🔄{l.reactivated}
                  </span>
                )}
                {l.notes && <span className="text-[10px] text-gray-400 truncate max-w-[120px]" title={l.notes}>💬 {l.notes}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// PIPELINE TAB
// ═══════════════════════════════════════════════════════════
function PipelineTab({ pipeline, onAdd, onUpdate, onDelete }: {
  pipeline: PipelineEntry[];
  onAdd: (entry: Partial<PipelineEntry>) => void;
  onUpdate: (id: string, updates: Partial<PipelineEntry>) => void;
  onDelete: (id: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPlatform, setNewPlatform] = useState("tiktok");
  const [filter, setFilter] = useState<"all" | StaffRole>("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let list = pipeline;
    if (filter !== "all") list = list.filter(p => p.assigned_to === filter);
    if (search) list = list.filter(p => p.creator_name.toLowerCase().includes(search.toLowerCase()));
    return list;
  }, [pipeline, filter, search]);

  const handleAdd = () => {
    if (!newName.trim()) return;
    onAdd({
      creator_name: newName.trim(),
      platform: newPlatform,
      stage: "found",
      assigned_to: "akuisisi",
      contact_date: today(),
      status: "active",
      notes: "",
    });
    setNewName("");
    setShowForm(false);
  };

  const nextStage = (current: PipelineStage): PipelineStage | null => {
    const idx = STAGES_ORDER.indexOf(current);
    return idx < STAGES_ORDER.length - 1 ? STAGES_ORDER[idx + 1] : null;
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg px-2">
          <Search size={14} className="text-gray-400" />
          <input type="text" placeholder="Cari creator..." value={search} onChange={e => setSearch(e.target.value)}
            className="border-0 py-2 text-sm focus:outline-none bg-transparent w-40" />
        </div>
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
          {(["all", "akuisisi", "retensi"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                filter === f ? "bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white" : "text-gray-500"
              }`}>
              {f === "all" ? "Semua" : f === "akuisisi" ? "Akuisisi" : "Retensi"}
            </button>
          ))}
        </div>
        <button onClick={() => setShowForm(true)} className="ml-auto flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition">
          <Plus size={14} /> Tambah Creator
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-4 flex flex-wrap gap-2 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-gray-500 mb-1 block">Nama Creator</label>
            <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="@username"
              className="w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Platform</label>
            <select value={newPlatform} onChange={e => setNewPlatform(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700">
              <option value="tiktok">TikTok</option>
              <option value="instagram">Instagram</option>
              <option value="youtube">YouTube</option>
              <option value="other">Lainnya</option>
            </select>
          </div>
          <button onClick={handleAdd} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">Tambah</button>
          <button onClick={() => setShowForm(false)} className="text-gray-500 px-3 py-2 text-sm">Batal</button>
        </div>
      )}

      {/* Pipeline Cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-sm text-gray-400">
          <Users size={32} className="mx-auto mb-2 text-gray-300" />
          Belum ada creator di pipeline
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(p => {
            const stageConf = STAGE_CONFIG[p.stage];
            const next = nextStage(p.stage);
            const daysSinceSample = p.sample_sent_date ? Math.floor((Date.now() - new Date(p.sample_sent_date).getTime()) / 86400000) : null;
            const isOverdue = p.stage === "sample_sent" && daysSinceSample !== null && daysSinceSample > 7;

            return (
              <div key={p.id} className={`bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4 flex items-center gap-3 ${isOverdue ? "border-amber-300 dark:border-amber-600 bg-amber-50/50 dark:bg-amber-900/10" : ""}`}>
                <span className="text-xl flex-shrink-0">{stageConf.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-gray-900 dark:text-white">{p.creator_name}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${stageConf.color}`}>{stageConf.label}</span>
                    <span className="text-[10px] text-gray-400">{p.platform}</span>
                    {isOverdue && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">⚠️ {daysSinceSample}d tanpa upload</span>}
                  </div>
                  {p.notes && <div className="text-[10px] text-gray-400 mt-0.5 truncate">{p.notes}</div>}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {next && (
                    <button onClick={() => {
                      const updates: Partial<PipelineEntry> = { stage: next };
                      if (next === "joined") updates.join_date = today();
                      if (next === "sample_sent") updates.sample_sent_date = today();
                      if (next === "first_upload") updates.first_upload_date = today();
                      if (next === "handover") { updates.handover_date = today(); updates.assigned_to = "retensi"; }
                      onUpdate(p.id, updates);
                    }}
                      className="text-[10px] bg-blue-100 text-blue-700 hover:bg-blue-200 px-2 py-1 rounded-lg transition flex items-center gap-0.5"
                      title={`Pindah ke ${STAGE_CONFIG[next].label}`}>
                      <ChevronRight size={10} /> {STAGE_CONFIG[next].label}
                    </button>
                  )}
                  <button onClick={() => onDelete(p.id)} className="text-gray-300 hover:text-red-500 transition p-1">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// KPI TAB
// ═══════════════════════════════════════════════════════════
function KPITab({ akuisisi, retensi, pipeline, period }: {
  akuisisi: any; retensi: any; pipeline: PipelineEntry[]; period: string;
}) {
  const weeks = Math.max(1, akuisisi.days / 7);

  const akuisisiKPIs = [
    { label: "Creator Baru/Minggu", target: 20, actual: akuisisi.found / weeks, unit: "" },
    { label: "Outreach Conversion", target: 30, actual: akuisisi.outreach > 0 ? (akuisisi.responses / akuisisi.outreach) * 100 : 0, unit: "%" },
    { label: "Join Rate", target: 50, actual: akuisisi.responses > 0 ? (akuisisi.joined / akuisisi.responses) * 100 : 0, unit: "%" },
    { label: "Handover/Minggu", target: 5, actual: akuisisi.handovers / weeks, unit: "" },
    { label: "Upload 1st/Minggu", target: 5, actual: akuisisi.uploads / weeks, unit: "" },
  ];

  const retensiWeeks = Math.max(1, retensi.days / 7);
  const retensiKPIs = [
    { label: "Follow Up/Hari", target: 10, actual: retensi.days > 0 ? retensi.followups / retensi.days : 0, unit: "" },
    { label: "Konten Delivery/Hari", target: 5, actual: retensi.days > 0 ? retensi.content / retensi.days : 0, unit: "" },
    { label: "Reaktivasi/Minggu", target: 3, actual: retensi.reactivated / retensiWeeks, unit: "" },
    { label: "Broadcast/Minggu", target: 3, actual: retensi.broadcasts / retensiWeeks, unit: "" },
    { label: "Insight/Hari", target: 3, actual: retensi.days > 0 ? retensi.insights / retensi.days : 0, unit: "" },
  ];

  const renderKPIRow = (kpi: { label: string; target: number; actual: number; unit: string }) => {
    const pct = kpi.target > 0 ? Math.min((kpi.actual / kpi.target) * 100, 150) : 0;
    const color = pct >= 100 ? "bg-green-500" : pct >= 70 ? "bg-yellow-500" : "bg-red-500";
    const statusEmoji = pct >= 100 ? "✅" : pct >= 70 ? "🟡" : "🔴";

    return (
      <div key={kpi.label} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
        <span className="text-base">{statusEmoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">{kpi.label}</span>
            <span className="text-xs text-gray-500">
              {kpi.actual.toFixed(1)}{kpi.unit} / {kpi.target}{kpi.unit}
            </span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
          </div>
        </div>
        <span className={`text-xs font-bold ${pct >= 100 ? "text-green-600" : pct >= 70 ? "text-yellow-600" : "text-red-600"}`}>
          {pct.toFixed(0)}%
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Akuisisi KPIs */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="bg-blue-600 text-white p-1.5 rounded-lg"><UserPlus size={14} /></div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">KPI Staf Akuisisi (NEW)</h3>
          <span className="ml-auto text-xs text-gray-400">{period}</span>
        </div>
        <div className="space-y-2">
          {akuisisiKPIs.map(renderKPIRow)}
        </div>
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
          <p className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
            📋 Alur: Cari → Rekrut → Follow up → Join → Kirim Sampel → Upload Pertama → Handover Ke Retensi
          </p>
        </div>
      </div>

      {/* Retensi KPIs */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="bg-emerald-600 text-white p-1.5 rounded-lg"><UserCheck size={14} /></div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">KPI Staf Retensi</h3>
          <span className="ml-auto text-xs text-gray-400">{period}</span>
        </div>
        <div className="space-y-2">
          {retensiKPIs.map(renderKPIRow)}
        </div>
        <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
            📋 Alur: Repeat upload 2 & 3 → Kirim brief → Kirim sample → Kirim konten → Program Collab → Share Campaign → Affiliator Aktif Naik → Loyal Creator
          </p>
        </div>
      </div>

      {/* Pipeline Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 p-5">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">📊 Ringkasan Pipeline</h3>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {STAGES_ORDER.map(s => {
            const count = pipeline.filter(p => p.stage === s).length;
            return (
              <div key={s} className="text-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <span className="text-lg">{STAGE_CONFIG[s].emoji}</span>
                <div className="text-lg font-black text-gray-900 dark:text-white">{count}</div>
                <div className="text-[9px] text-gray-500">{STAGE_CONFIG[s].label}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
