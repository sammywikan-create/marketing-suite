"use client";
import { useState, useMemo, useCallback } from "react";
import { useStoreManager } from "@/store/useStoreManager";
import { useReportStore } from "@/store/useReportStore";
import { useOKRStore } from "@/store/useOKRStore";
import { useRawFileStore } from "@/store/useRawFileStore";
import { generatePDFReport, generateExcelReport } from "@/lib/reportGenerator";
import type { ReportConfig, ReportSection, ReportFormat, ReportPeriod, ReportTemplate, SavedReport } from "@/lib/types";
import { FileText, Trash2, Download, RefreshCw, Clock, Zap, Settings2 } from "lucide-react";
import { nanoid } from "nanoid";

/* eslint-disable @typescript-eslint/no-explicit-any */

type RBTab = "build" | "templates" | "history";
const TABS: { key: RBTab; label: string }[] = [
  { key: "build", label: "🚀 Buat Laporan" },
  { key: "templates", label: "📋 Template Siap Pakai" },
  { key: "history", label: "🕐 Riwayat" },
];

// ── Section definitions ──
interface SectionDef {
  key: ReportSection;
  label: string;
  icon: string;
  group: string;
  estPages: number;
}
const ALL_SECTIONS: SectionDef[] = [
  { key: "overview", label: "Overview Bisnis", icon: "📈", group: "RINGKASAN BISNIS", estPages: 2 },
  { key: "gmvmax", label: "GMV Max Performance", icon: "📊", group: "RINGKASAN BISNIS", estPages: 2 },
  { key: "sku", label: "SKU Analyzer", icon: "🔍", group: "RINGKASAN BISNIS", estPages: 2 },
  { key: "creative", label: "Creative Performance", icon: "🎬", group: "RINGKASAN BISNIS", estPages: 1 },
  { key: "video", label: "Video Performance", icon: "📹", group: "KONTEN & VIDEO", estPages: 2 },
  { key: "affiliate", label: "Affiliate Summary", icon: "🤝", group: "AFFILIATE", estPages: 2 },
  { key: "okr", label: "OKR Progress", icon: "🎯", group: "TARGET & OKR", estPages: 2 },
  { key: "compare", label: "Compare 2 Toko", icon: "⚖️", group: "ANALISIS LANJUTAN", estPages: 2 },
];

// ── Template presets ──
interface TemplateDef {
  template: ReportTemplate;
  name: string;
  icon: string;
  desc: string;
  pages: string;
  sections: ReportSection[];
}
const TEMPLATE_PRESETS: TemplateDef[] = [
  { template: "executive", name: "Executive Report", icon: "👔", desc: "Ringkas untuk manager & investor", pages: "~3-5 halaman", sections: ["overview", "gmvmax", "okr"] },
  { template: "operational", name: "Operational Report", icon: "⚙️", desc: "Detail untuk tim internal & evaluasi", pages: "~10-15 halaman", sections: ["overview", "gmvmax", "sku", "creative", "video", "affiliate", "okr"] },
  { template: "okr-review", name: "OKR Review", icon: "🎯", desc: "Progress OKR & rekomendasi", pages: "~5-8 halaman", sections: ["okr", "overview"] },
  { template: "affiliate", name: "Affiliate Report", icon: "🤝", desc: "Khusus laporan KOL & kreator", pages: "~5-8 halaman", sections: ["affiliate", "video"] },
];

// ── Quick templates for Tab 2 ──
interface QuickTemplate {
  name: string;
  icon: string;
  desc: string;
  pages: string;
  sections: ReportSection[];
  template: ReportTemplate;
}
const QUICK_TEMPLATES: QuickTemplate[] = [
  { name: "Laporan Mingguan", icon: "📊", desc: "Overview + GMV Max + Video + OKR Progress", pages: "~4 halaman", sections: ["overview", "gmvmax", "video", "okr"], template: "operational" },
  { name: "Laporan Bulanan Lengkap", icon: "📅", desc: "Semua section tersedia", pages: "~15 halaman", sections: ["overview", "gmvmax", "sku", "creative", "video", "affiliate", "okr", "compare"], template: "operational" },
  { name: "Executive Summary", icon: "👔", desc: "Overview + KPI utama + OKR + AI Insight", pages: "~3 halaman", sections: ["overview", "okr"], template: "executive" },
  { name: "Laporan KOL/Affiliate", icon: "🤝", desc: "Affiliate Summary + Top Kreator + Segmentasi", pages: "~6 halaman", sections: ["affiliate", "video"], template: "affiliate" },
  { name: "OKR Review", icon: "🎯", desc: "OKR Progress + Laporan Bulanan + Riwayat", pages: "~5 halaman", sections: ["okr", "overview"], template: "okr-review" },
  { name: "Laporan Pertumbuhan", icon: "📈", desc: "Tren bulanan semua metrik + Compare", pages: "~8 halaman", sections: ["overview", "gmvmax", "video", "affiliate", "compare"], template: "operational" },
];

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════
export default function ReportBuilderScreen() {
  const [activeTab, setActiveTab] = useState<RBTab>("build");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">📄 Report Builder</h1>

      {/* Tab Nav */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-semibold transition-colors whitespace-nowrap ${
              activeTab === t.key ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "build" && <TabBuild />}
      {activeTab === "templates" && <TabTemplates />}
      {activeTab === "history" && <TabHistory />}
    </div>
  );
}

// ════════════════════════════════════════
// TAB 1: BUAT LAPORAN
// ════════════════════════════════════════
function getGMVMaxSummary(targetStores: any[]): any {
  for (const store of targetStores) {
    const candidates = [
      store.gmvData, store.creativeData, store.campaignData,
      store.gmvMaxData, (store as any).adData,
    ].filter(Boolean);
    for (const candidate of candidates) {
      if (typeof candidate === 'object' && !Array.isArray(candidate)) {
        const values = Object.values(candidate);
        if (values.length > 0) {
          const latest = values[values.length - 1] as any;
          if (latest?.totalRevenue || latest?.summary?.totalRevenue) return latest?.summary || latest;
        }
      } else if (Array.isArray(candidate) && candidate.length > 0) {
        const latest = candidate[candidate.length - 1] as any;
        if (latest?.totalRevenue || latest?.summary?.totalRevenue) return latest?.summary || latest;
      }
    }
  }
  return null;
}

function TabBuild() {
  const { stores, getActiveStore } = useStoreManager();
  const activeStore = getActiveStore();
  const { saveConfig, addToHistory } = useReportStore();
  const { objectives, monthlyReports } = useOKRStore();
  const getRawFiles = useRawFileStore((s) => s.getFiles);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>(activeStore ? [activeStore.id] : []);
  const [period, setPeriod] = useState<ReportPeriod>("current");
  const [template, setTemplate] = useState<ReportTemplate>("executive");
  const [sections, setSections] = useState<ReportSection[]>(["overview", "gmvmax", "okr"]);
  const [format, setFormat] = useState<ReportFormat>("pdf");
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeAIInsight, setIncludeAIInsight] = useState(true);
  const [language, setLanguage] = useState<"id" | "en">("id");
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState("");

  // When template changes, update sections
  const handleTemplateChange = useCallback((t: ReportTemplate) => {
    setTemplate(t);
    const preset = TEMPLATE_PRESETS.find((p) => p.template === t);
    if (preset) setSections([...preset.sections]);
  }, []);

  const toggleSection = useCallback((s: ReportSection) => {
    setSections((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  }, []);

  const toggleStore = useCallback((id: string) => {
    setSelectedStoreIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }, []);

  const estPages = useMemo(() => {
    return 2 + sections.reduce((a, s) => a + (ALL_SECTIONS.find((d) => d.key === s)?.estPages ?? 1), 0);
  }, [sections]);

  // Gather all data
  const gatherData = useCallback(() => {
    const targetStores = selectedStoreIds.length > 0
      ? stores.filter((s) => selectedStoreIds.includes(s.id))
      : activeStore ? [activeStore] : [];
    const primary = targetStores[0] || activeStore;
    return {
      brandName: primary?.name || 'FreshVision',
      stores: targetStores,
      activeStore: primary,
      overviewData: primary?.overviewData || [],
      videoData: primary?.videoData || [],
      affiliateData: primary?.affiliateData || [],
      okrData: { objectives: objectives || [], monthlyReports: monthlyReports || [] },
      gmvMaxSummary: getGMVMaxSummary(targetStores.length > 0 ? targetStores : (activeStore ? [activeStore] : [])),
      rawFiles: primary ? getRawFiles(primary.id) : {},
    };
  }, [stores, activeStore, selectedStoreIds, objectives, monthlyReports, getRawFiles]);

  const handleGenerate = useCallback(async () => {
    if (!name.trim()) { alert("Nama laporan wajib diisi"); return; }
    setIsGenerating(true);

    const config: ReportConfig = {
      id: nanoid(),
      name: name.trim(),
      description,
      sections,
      format,
      period,
      includeCharts,
      includeAIInsight,
      language,
      storeIds: selectedStoreIds,
      template,
      createdAt: new Date().toISOString(),
    };

    try {
      setProgress("Mengumpulkan data...");
      await new Promise((r) => setTimeout(r, 400));
      const allData = gatherData();

      setProgress("Menyusun halaman...");
      await new Promise((r) => setTimeout(r, 400));

      if (format === "pdf") {
        await generatePDFReport(config, allData);
      } else {
        generateExcelReport(config, allData);
      }

      addToHistory({
        config,
        generatedAt: new Date().toISOString(),
        fileSize: format === "pdf" ? `~${Math.max(1, estPages * 0.3).toFixed(1)} MB` : "~500 KB",
      });

      setProgress("Selesai! ✅");
      setTimeout(() => setProgress(""), 2000);
    } catch (err) {
      console.error(err);
      alert("Gagal generate laporan. Coba lagi.");
      setProgress("");
    } finally {
      setIsGenerating(false);
    }
  }, [name, description, sections, format, period, includeCharts, includeAIInsight, language, selectedStoreIds, template, gatherData, addToHistory, estPages]);

  const handleSaveConfig = useCallback(() => {
    if (!name.trim()) { alert("Nama laporan wajib diisi"); return; }
    saveConfig({ name: name.trim(), description, sections, format, period, includeCharts, includeAIInsight, language, storeIds: selectedStoreIds, template });
    alert("Konfigurasi tersimpan!");
  }, [name, description, sections, format, period, includeCharts, includeAIInsight, language, selectedStoreIds, template, saveConfig]);

  // Group sections
  const groups = useMemo(() => {
    const map = new Map<string, SectionDef[]>();
    ALL_SECTIONS.forEach((s) => {
      const arr = map.get(s.group) || [];
      arr.push(s);
      map.set(s.group, arr);
    });
    return Array.from(map.entries());
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* LEFT: Form */}
      <div className="lg:col-span-2 space-y-6">

        {/* STEP 1 */}
        <div className="bg-white rounded-xl border p-5 space-y-4">
          <h3 className="font-bold text-sm text-gray-700">STEP 1 — Informasi Dasar</h3>
          <div>
            <label className="text-xs text-gray-500 font-semibold">Nama Laporan *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Laporan Bulanan April 2026" className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-semibold">Deskripsi (opsional)</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Deskripsi singkat laporan..." rows={2} className="w-full border rounded-lg px-3 py-2 text-sm mt-1 resize-none" />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-semibold mb-2 block">Toko</label>
            <div className="space-y-1">
              {stores.map((s) => (
                <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={selectedStoreIds.includes(s.id)} onChange={() => toggleStore(s.id)} className="rounded" />
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                  {s.name}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 font-semibold mb-2 block">Periode</label>
            <div className="flex gap-3">
              {([["current", "Bulan Ini"], ["last3months", "3 Bulan Terakhir"], ["custom", "Custom"]] as const).map(([val, lbl]) => (
                <label key={val} className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input type="radio" name="period" checked={period === val} onChange={() => setPeriod(val)} />
                  {lbl}
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* STEP 2 */}
        <div className="bg-white rounded-xl border p-5 space-y-4">
          <h3 className="font-bold text-sm text-gray-700">STEP 2 — Template</h3>
          <div className="grid grid-cols-2 gap-3">
            {TEMPLATE_PRESETS.map((t) => (
              <button
                key={t.template}
                onClick={() => handleTemplateChange(t.template)}
                className={`text-left p-4 rounded-xl border-2 transition-all ${
                  template === t.template ? "border-indigo-500 bg-indigo-50 shadow-md" : "border-gray-200 hover:border-indigo-300"
                }`}
              >
                <span className="text-2xl">{t.icon}</span>
                <p className="font-bold text-sm mt-2">{t.name}</p>
                <p className="text-xs text-gray-500 mt-1">{t.desc}</p>
                <p className="text-[10px] text-gray-400 mt-1">{t.pages}</p>
              </button>
            ))}
          </div>
        </div>

        {/* STEP 3 */}
        <div className="bg-white rounded-xl border p-5 space-y-4">
          <h3 className="font-bold text-sm text-gray-700">STEP 3 — Pilih Section</h3>
          {groups.map(([group, items]) => (
            <div key={group}>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">{group}</p>
              <div className="space-y-1">
                {items.map((s) => (
                  <label key={s.key} className="flex items-center gap-2 text-sm cursor-pointer py-1 px-2 rounded-lg hover:bg-gray-50">
                    <input type="checkbox" checked={sections.includes(s.key)} onChange={() => toggleSection(s.key)} className="rounded" />
                    <span>{s.icon}</span>
                    <span>{s.label}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* STEP 4 */}
        <div className="bg-white rounded-xl border p-5 space-y-4">
          <h3 className="font-bold text-sm text-gray-700">STEP 4 — Pengaturan Tambahan</h3>
          <div>
            <label className="text-xs text-gray-500 font-semibold mb-2 block">Format Output</label>
            <div className="flex gap-4">
              {([["pdf", "📄 PDF"], ["excel", "📊 Excel"]] as const).map(([val, lbl]) => (
                <label key={val} className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input type="radio" name="format" checked={format === val} onChange={() => setFormat(val)} />
                  {lbl}
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={includeCharts} onChange={(e) => setIncludeCharts(e.target.checked)} className="rounded" />
              Sertakan grafik & chart
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={includeAIInsight} onChange={(e) => setIncludeAIInsight(e.target.checked)} className="rounded" />
              Sertakan AI Insight & Rekomendasi
            </label>
          </div>
          <div>
            <label className="text-xs text-gray-500 font-semibold mb-2 block">Bahasa</label>
            <div className="flex gap-4">
              {([["id", "🇮🇩 Indonesia"], ["en", "🇬🇧 English"]] as const).map(([val, lbl]) => (
                <label key={val} className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input type="radio" name="lang" checked={language === val} onChange={() => setLanguage(val)} />
                  {lbl}
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* STEP 5: Generate */}
        <div className="space-y-3">
          <button
            onClick={handleGenerate}
            disabled={isGenerating || sections.length === 0}
            className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? progress || "Sedang memproses..." : "⚡ Generate Laporan Sekarang"}
          </button>
          {isGenerating && (
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full animate-pulse" style={{ width: progress.includes("Selesai") ? "100%" : "60%" }} />
            </div>
          )}
          <button onClick={handleSaveConfig} className="w-full py-2 border-2 border-dashed border-gray-300 text-gray-500 rounded-xl text-sm font-semibold hover:border-indigo-300 hover:text-indigo-600 transition-colors">
            💾 Simpan Konfigurasi
          </button>
          {process.env.NODE_ENV === 'development' && (() => { const d = gatherData(); return (
            <div className="bg-gray-900 text-green-400 p-4 rounded-xl font-mono text-xs mt-3 space-y-0.5">
              <p className="font-bold text-white mb-1">Debug allData:</p>
              <p>overviewData: {d.overviewData?.length || 0} bulan{d.overviewData?.length ? ` | GMV: Rp ${((d.overviewData[d.overviewData.length-1]?.summary?.gmv||0)/1e6).toFixed(1)}Jt` : ''}</p>
              <p>videoData: {d.videoData?.length || 0} bulan{d.videoData?.length ? ` | ${d.videoData[d.videoData.length-1]?.summary?.totalVideos||0} video` : ''}</p>
              <p>affiliateData: {d.affiliateData?.length || 0} bulan{d.affiliateData?.length ? ` | GMV: Rp ${((d.affiliateData[d.affiliateData.length-1]?.summary?.totalGMV||0)/1e6).toFixed(1)}Jt` : ''}</p>
              <p>gmvMaxSummary: {d.gmvMaxSummary ? `✅ ROI ${d.gmvMaxSummary.overallROI || d.gmvMaxSummary.roi || '?'}x` : '❌ null'}</p>
              <p>OKR: {d.okrData?.objectives?.length || 0} objectives</p>
              <p>Stores: {d.stores?.map((s: any) => s.name).join(', ') || 'none'}</p>
            </div>
          ); })()}
        </div>
      </div>

      {/* RIGHT: Preview */}
      <div className="space-y-4">
        <div className="bg-white rounded-xl border p-5 sticky top-4">
          <h3 className="font-bold text-sm mb-1">📄 Struktur Laporan</h3>
          <p className="text-xs text-gray-400 mb-4">Estimasi: ~{estPages} halaman</p>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs py-1.5 px-2 bg-indigo-50 rounded-lg">
              <span className="w-5 text-center font-bold text-indigo-600">1</span>
              <span>Cover Page</span>
            </div>
            <div className="flex items-center gap-2 text-xs py-1.5 px-2 bg-indigo-50 rounded-lg">
              <span className="w-5 text-center font-bold text-indigo-600">2</span>
              <span>Ringkasan Eksekutif</span>
            </div>
            {sections.map((s, i) => {
              const def = ALL_SECTIONS.find((d) => d.key === s);
              return (
                <div key={s} className="flex items-center gap-2 text-xs py-1.5 px-2 bg-gray-50 rounded-lg">
                  <span className="w-5 text-center font-bold text-gray-500">{i + 3}</span>
                  <span>{def?.icon} {def?.label || s}</span>
                  <span className="ml-auto text-gray-400 text-[10px]">~{def?.estPages ?? 1}p</span>
                </div>
              );
            })}
            {includeAIInsight && (
              <div className="flex items-center gap-2 text-xs py-1.5 px-2 bg-yellow-50 rounded-lg">
                <span className="w-5 text-center font-bold text-yellow-600">{sections.length + 3}</span>
                <span>🤖 AI Insight & Rekomendasi</span>
              </div>
            )}
          </div>

          {/* Mini preview thumbnails */}
          <div className="mt-4 grid grid-cols-4 gap-1.5">
            {Array.from({ length: Math.min(estPages, 12) }).map((_, i) => (
              <div key={i} className={`aspect-[3/4] rounded border text-[8px] flex items-center justify-center font-semibold ${
                i === 0 ? "bg-indigo-100 border-indigo-300 text-indigo-600" : "bg-gray-50 border-gray-200 text-gray-400"
              }`}>
                {i === 0 ? "COVER" : i === 1 ? "RINGKASAN" : `hal ${i + 1}`}
              </div>
            ))}
          </div>
        </div>

        {/* Format badge */}
        <div className="bg-white rounded-xl border p-4 text-center">
          <p className="text-xs text-gray-400">Format output</p>
          <p className="text-lg font-bold mt-1">{format === "pdf" ? "📄 PDF" : "📊 Excel"}</p>
          <p className="text-xs text-gray-400 mt-1">{sections.length} section · ~{estPages} halaman</p>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════
// TAB 2: TEMPLATE SIAP PAKAI
// ════════════════════════════════════════
function TabTemplates() {
  const { stores, getActiveStore } = useStoreManager();
  const activeStore = getActiveStore();
  const { addToHistory, reportHistory } = useReportStore();
  const { objectives, monthlyReports } = useOKRStore();
  const getRawFiles = useRawFileStore((s) => s.getFiles);
  const [generating, setGenerating] = useState<string | null>(null);

  const handleQuickGenerate = useCallback(async (qt: QuickTemplate) => {
    if (!activeStore) { alert("Pilih toko terlebih dahulu"); return; }
    setGenerating(qt.name);

    const config: ReportConfig = {
      id: nanoid(),
      name: qt.name,
      description: qt.desc,
      sections: qt.sections,
      format: "pdf",
      period: "current",
      includeCharts: true,
      includeAIInsight: true,
      language: "id",
      storeIds: [activeStore.id],
      template: qt.template,
      createdAt: new Date().toISOString(),
    };

    try {
      const allData = {
        brandName: activeStore.name || 'FreshVision',
        stores: [activeStore],
        activeStore,
        overviewData: activeStore.overviewData || [],
        videoData: activeStore.videoData || [],
        affiliateData: activeStore.affiliateData || [],
        okrData: { objectives: objectives || [], monthlyReports: monthlyReports || [] },
        gmvMaxSummary: getGMVMaxSummary([activeStore]),
        rawFiles: getRawFiles(activeStore.id),
      };
      await generatePDFReport(config, allData);
      addToHistory({ config, generatedAt: new Date().toISOString(), fileSize: "~2 MB" });
    } catch (err) {
      console.error(err);
      alert("Gagal generate. Coba lagi.");
    } finally {
      setGenerating(null);
    }
  }, [activeStore, addToHistory, objectives, monthlyReports]);

  const getLastGenerated = (templateName: string) => {
    const found = reportHistory.find((r) => r.config.name === templateName);
    return found ? fmtDate(found.generatedAt) : "Belum pernah";
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {QUICK_TEMPLATES.map((qt) => (
        <div key={qt.name} className="bg-white rounded-xl border p-5 flex flex-col">
          <div className="flex items-start gap-3 mb-3">
            <span className="text-3xl">{qt.icon}</span>
            <div className="flex-1">
              <h3 className="font-bold text-sm">{qt.name}</h3>
              <p className="text-xs text-gray-500 mt-0.5">{qt.desc}</p>
            </div>
          </div>

          {/* Section badges */}
          <div className="flex flex-wrap gap-1 mb-3">
            {qt.sections.map((s) => {
              const def = ALL_SECTIONS.find((d) => d.key === s);
              return (
                <span key={s} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                  {def?.icon} {def?.label}
                </span>
              );
            })}
          </div>

          <div className="text-xs text-gray-400 mb-3 flex items-center gap-1">
            <Clock size={12} />
            Terakhir: {getLastGenerated(qt.name)}
          </div>
          <p className="text-xs text-gray-400 mb-4">📄 PDF · {qt.pages}</p>

          <div className="mt-auto flex gap-2">
            <button
              onClick={() => handleQuickGenerate(qt)}
              disabled={generating === qt.name}
              className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-1"
            >
              {generating === qt.name ? <RefreshCw size={12} className="animate-spin" /> : <Zap size={12} />}
              {generating === qt.name ? "Generating..." : "Generate"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ════════════════════════════════════════
// TAB 3: RIWAYAT
// ════════════════════════════════════════
function TabHistory() {
  const { reportHistory, clearHistory, addToHistory } = useReportStore();
  const { stores, getActiveStore } = useStoreManager();
  const activeStore = getActiveStore();
  const { objectives, monthlyReports } = useOKRStore();
  const getRawFiles = useRawFileStore((s) => s.getFiles);

  const handleRegenerate = useCallback(async (saved: SavedReport) => {
    const config = saved.config;
    const primary = stores.find((s) => config.storeIds.includes(s.id)) || activeStore;
    if (!primary) return;
    try {
      const allData = {
        brandName: primary.name || 'FreshVision',
        stores: [primary],
        activeStore: primary,
        overviewData: primary.overviewData || [],
        videoData: primary.videoData || [],
        affiliateData: primary.affiliateData || [],
        okrData: { objectives: objectives || [], monthlyReports: monthlyReports || [] },
        gmvMaxSummary: getGMVMaxSummary([primary]),
        rawFiles: getRawFiles(primary.id),
      };
      if (config.format === "pdf") {
        await generatePDFReport(config, allData);
      } else {
        generateExcelReport(config, allData);
      }
      addToHistory({ config, generatedAt: new Date().toISOString(), fileSize: saved.fileSize });
    } catch (err) {
      console.error(err);
      alert("Gagal regenerate.");
    }
  }, [stores, activeStore, addToHistory, objectives, monthlyReports]);

  if (reportHistory.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <FileText size={48} className="mx-auto mb-4 opacity-30" />
        <p className="font-semibold">Belum ada riwayat laporan</p>
        <p className="text-sm mt-1">Generate laporan pertama Anda di tab &quot;Buat Laporan&quot;</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{reportHistory.length} laporan</p>
        <button onClick={() => { if (confirm("Hapus semua riwayat?")) clearHistory(); }} className="text-xs text-red-500 hover:text-red-700 font-semibold flex items-center gap-1">
          <Trash2 size={12} /> Hapus Semua
        </button>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="p-3 text-left font-bold">Nama</th>
                <th className="p-3 text-left font-bold">Template</th>
                <th className="p-3 text-center font-bold">Format</th>
                <th className="p-3 text-center font-bold">Section</th>
                <th className="p-3 text-right font-bold">Ukuran</th>
                <th className="p-3 text-right font-bold">Tanggal</th>
                <th className="p-3 text-center font-bold">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {reportHistory.map((r) => (
                <tr key={r.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-semibold">{r.config.name}</td>
                  <td className="p-3 text-gray-500 capitalize">{r.config.template}</td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      r.config.format === "pdf" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                    }`}>
                      {r.config.format.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-3 text-center text-gray-500">{r.config.sections.length}</td>
                  <td className="p-3 text-right text-gray-500">{r.fileSize}</td>
                  <td className="p-3 text-right text-gray-500">{fmtDate(r.generatedAt)}</td>
                  <td className="p-3 text-center">
                    <button onClick={() => handleRegenerate(r)} className="p-1 text-gray-400 hover:text-indigo-600" title="Generate ulang">
                      <RefreshCw size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
