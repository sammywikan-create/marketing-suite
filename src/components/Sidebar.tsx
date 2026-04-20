"use client";
import { TabKey } from "@/lib/types";
import {
  LayoutDashboard, BookOpen, FileText, Megaphone, Users, Lightbulb,
  Target, Filter, DollarSign, Layers, CalendarCheck, CalendarDays, BarChart3,
  ChevronLeft, ChevronRight, Upload, PieChart, Package, Sparkles, Award,
  ClipboardCheck, Wrench, Calculator, Video, GitCompareArrows, Settings
} from "lucide-react";
import { useState } from "react";

interface TabGroup {
  title: string;
  items: { key: TabKey; label: string; icon: React.ReactNode }[];
}

const tabGroups: TabGroup[] = [
  {
    title: "Home",
    items: [
      { key: "home", label: "🏠 Executive Summary", icon: <LayoutDashboard size={18} /> },
    ],
  },
  {
    title: "Marketing Planner",
    items: [
      { key: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
      { key: "panduan", label: "Panduan", icon: <BookOpen size={18} /> },
      { key: "content-tracker", label: "Content Tracker", icon: <FileText size={18} /> },
      { key: "campaign-log", label: "Campaign Log", icon: <Megaphone size={18} /> },
      { key: "kol-tracker", label: "KOL Tracker", icon: <Users size={18} /> },
      { key: "hipotesis-plan", label: "Hipotesis & Plan", icon: <Lightbulb size={18} /> },
      { key: "referensi-kpi", label: "Referensi KPI", icon: <Target size={18} /> },
      { key: "aida-funnel", label: "AIDA Funnel", icon: <Filter size={18} /> },
      { key: "budget-roi", label: "Budget & ROI", icon: <DollarSign size={18} /> },
      { key: "tofu-mofu-bofu", label: "TOFU·MOFU·BOFU", icon: <Layers size={18} /> },
      { key: "target-roi-bulanan", label: "Target & ROI Bulanan", icon: <CalendarCheck size={18} /> },
      { key: "budgeting-harian", label: "Budgeting Harian", icon: <CalendarDays size={18} /> },
      { key: "analisis-tmb", label: "Analisis TMB", icon: <BarChart3 size={18} /> },
    ],
  },
  {
    title: "GMV Analyzer",
    items: [
      { key: "gmv-upload", label: "Upload Data", icon: <Upload size={18} /> },
      { key: "gmv-dashboard", label: "GMV Dashboard", icon: <PieChart size={18} /> },
      { key: "gmv-overview", label: "Overview Bisnis", icon: <BarChart3 size={18} /> },
      { key: "video-performance", label: "📹 Video Performance", icon: <Video size={18} /> },
      { key: "affiliate", label: "🤝 Affiliate Manager", icon: <Users size={18} /> },
      { key: "live-analytics", label: "🔴 Live Analytics", icon: <BarChart3 size={18} /> },
      { key: "gmv-sku", label: "SKU Analyzer", icon: <Package size={18} /> },
      { key: "gmv-creative", label: "Creative Optimizer", icon: <Sparkles size={18} /> },
      { key: "gmv-benchmark", label: "Top Seller Metrics", icon: <Award size={18} /> },
      { key: "gmv-checklist", label: "Checklist Evaluasi", icon: <ClipboardCheck size={18} /> },
      { key: "gmv-optimasi", label: "Optimasi Kreatif", icon: <Wrench size={18} /> },
      { key: "gmv-kalkulator", label: "ROI Calculator", icon: <Calculator size={18} /> },
    ],
  },
  {
    title: "GMV Maximizer",
    items: [
      { key: "gmax-overview", label: "🚀 GMAX Overview", icon: <DollarSign size={18} /> },
    ],
  },
  {
    title: "OKR",
    items: [
      { key: "okr", label: "🎯 OKR Framework", icon: <Target size={18} /> },
    ],
  },
  {
    title: "Laporan",
    items: [
      { key: "report-builder", label: "📄 Report Builder", icon: <FileText size={18} /> },
    ],
  },
  {
    title: "Multi-Toko",
    items: [
      { key: "compare-gabungan", label: "⚖️ Compare & Gabungan", icon: <GitCompareArrows size={18} /> },
      { key: "store-compare", label: "📊 Bandingkan Toko", icon: <GitCompareArrows size={18} /> },
      { key: "store-settings", label: "⚙️ Kelola Toko", icon: <Settings size={18} /> },
    ],
  },
];

export default function Sidebar({ active, onSelect }: { active: TabKey; onSelect: (t: TabKey) => void }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`${collapsed ? "w-16" : "w-64"} transition-all duration-300 bg-sidebar text-white flex flex-col h-screen sticky top-0 shrink-0`}>
      <div className="flex items-center gap-2 px-4 py-4 border-b border-white/10">
        {!collapsed && (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-2xl">📊</span>
            <span className="font-bold text-lg whitespace-nowrap">Marketing Suite</span>
          </div>
        )}
        {collapsed && <span className="text-2xl mx-auto">📊</span>}
        <button onClick={() => setCollapsed(!collapsed)} className="p-1 rounded hover:bg-white/10 shrink-0">
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto py-1">
        {tabGroups.map((group) => (
          <div key={group.title}>
            {!collapsed && (
              <div className="px-4 pt-4 pb-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">{group.title}</span>
              </div>
            )}
            {collapsed && <div className="border-t border-white/10 my-1" />}
            {group.items.map((tab) => (
              <button
                key={tab.key}
                onClick={() => onSelect(tab.key)}
                className={`w-full flex items-center gap-3 px-4 py-2 text-[13px] transition-colors ${
                  active === tab.key
                    ? "bg-white/20 text-white font-semibold border-r-3 border-white"
                    : "text-white/70 hover:bg-sidebar-hover hover:text-white"
                } ${collapsed ? "justify-center px-2" : ""}`}
                title={tab.label}
              >
                {tab.icon}
                {!collapsed && <span className="truncate">{tab.label}</span>}
              </button>
            ))}
          </div>
        ))}
      </nav>
      {!collapsed && (
        <div className="px-4 py-3 text-xs text-white/40 border-t border-white/10">
          © 2026 Marketing Suite
        </div>
      )}
    </aside>
  );
}
