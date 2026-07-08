"use client";
import { TabKey } from "@/lib/types";
import {
  LayoutDashboard, BookOpen, FileText, Megaphone, Users, Lightbulb,
  Target, Filter, DollarSign, Layers, CalendarCheck, CalendarDays, BarChart3,
  ChevronLeft, ChevronRight, Upload, PieChart, Package, Sparkles, Award,
  ClipboardCheck, Wrench, Calculator, Video, GitCompareArrows, Settings, ScanBarcode, ClipboardList,
  X, ShieldCheck,
} from "lucide-react";
import { useState, useEffect } from "react";

// Menu yang boleh dilihat oleh role 'viewer'
const VIEWER_ALLOWED_TABS = new Set<TabKey>(['home', 'affiliate', 'laporan-harian']);

export type UserRole = 'admin' | 'viewer';


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
      { key: "product-cards", label: "📦 Kartu Produk", icon: <Package size={18} /> },
      { key: "sku-tracking", label: "SKU Tracking", icon: <ScanBarcode size={18} /> },
    ],
  },
  {
    title: "GMV Maximizer",
    items: [
      { key: "gmax-overview", label: "🚀 GMAX Overview", icon: <DollarSign size={18} /> },
      { key: "gmax-evaluasi", label: "GMAX Evaluasi", icon: <ClipboardList size={16} /> },
    ],
  },
  {
    title: "Tim",
    items: [
      { key: "staff-tracker", label: "👥 Staff Tracker", icon: <Users size={18} /> },
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
      { key: "laporan-harian", label: "📊 Laporan Harian", icon: <BarChart3 size={18} /> },
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

interface SidebarProps {
  active: TabKey;
  onSelect: (t: TabKey) => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  userRole?: UserRole;
}


export default function Sidebar({ active, onSelect, mobileOpen = false, onMobileClose, userRole = 'admin' }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const isViewer = userRole === 'viewer';

  // Viewer hanya boleh akses tab tertentu
  const canView = (key: TabKey) => !isViewer || VIEWER_ALLOWED_TABS.has(key);

  // Jika active tab tidak diizinkan, paksa ke home
  useEffect(() => {
    if (isViewer && !VIEWER_ALLOWED_TABS.has(active)) {
      onSelect('home');
    }
  }, [isViewer, active, onSelect]);

  // Close mobile sidebar on Escape key
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onMobileClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen, onMobileClose]);

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    if (mobileOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const sidebarContent = (isMobile: boolean) => (
    <>
      <div className="flex items-center gap-2 px-4 py-4 border-b border-white/10">
        {(!collapsed || isMobile) && (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-lg shadow-lg shadow-blue-500/20">📊</div>
            <div className="flex flex-col">
              <span className="font-bold text-sm whitespace-nowrap leading-tight">Marketing Suite</span>
              <span className="text-[9px] text-white/40 font-medium tracking-wider uppercase">FreshVision Analytics</span>
            </div>
          </div>
        )}
        {collapsed && !isMobile && <span className="text-2xl mx-auto">📊</span>}
        {isMobile ? (
          <button onClick={onMobileClose} className="p-1 rounded hover:bg-white/10 shrink-0" aria-label="Close menu">
            <X size={20} />
          </button>
        ) : (
          <button onClick={() => setCollapsed(!collapsed)} className="p-1 rounded hover:bg-white/10 shrink-0">
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        )}
      </div>

      {/* Viewer badge */}
      {isViewer && (!collapsed || isMobile) && (
        <div className="mx-3 mt-3 mb-1 px-3 py-2 bg-amber-500/20 border border-amber-400/30 rounded-lg flex items-center gap-2">
          <ShieldCheck size={14} className="text-amber-300 shrink-0" />
          <span className="text-[11px] text-amber-200 font-medium">Akses Terbatas</span>
        </div>
      )}
      {isViewer && collapsed && !isMobile && (
        <div className="flex justify-center mt-3 mb-1" title="Akses Terbatas">
          <ShieldCheck size={16} className="text-amber-300" />
        </div>
      )}

      <nav className="flex-1 overflow-y-auto py-1">
        {tabGroups.map((group) => {
          // Filter items berdasarkan role
          const visibleItems = group.items.filter(tab => canView(tab.key));
          if (visibleItems.length === 0) return null; // sembunyikan grup kosong
          return (
            <div key={group.title}>
              {(!collapsed || isMobile) && (
                <div className="px-4 pt-4 pb-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">{group.title}</span>
                </div>
              )}
              {collapsed && !isMobile && <div className="border-t border-white/10 my-1" />}
              {visibleItems.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => onSelect(tab.key)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-[13px] transition-all duration-200 ${
                    active === tab.key
                      ? "sidebar-active-glow text-white font-semibold"
                      : "text-white/60 hover:bg-white/8 hover:text-white"
                  } ${collapsed && !isMobile ? "justify-center px-2" : ""}`}
                  title={tab.label}
                  aria-label={tab.label}
                >
                  {tab.icon}
                  {(!collapsed || isMobile) && <span className="truncate">{tab.label}</span>}
                </button>
              ))}
            </div>
          );
        })}
      </nav>
      {(!collapsed || isMobile) && (
        <div className="px-4 py-3 text-xs text-white/40 border-t border-white/10">
          © 2026 Marketing Suite
        </div>
      )}
    </>
  );


  return (
    <>
      {/* Desktop sidebar */}
      <aside className={`${collapsed ? "w-16" : "w-64"} transition-all duration-300 sidebar-premium text-white hidden md:flex flex-col h-screen sticky top-0 shrink-0`}>
        {sidebarContent(false)}
      </aside>

      {/* Mobile overlay sidebar */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={onMobileClose} />
          <aside className="fixed inset-y-0 left-0 w-72 sidebar-premium text-white flex flex-col z-50 md:hidden animate-slide-in">
            {sidebarContent(true)}
          </aside>
        </>
      )}
    </>
  );
}
