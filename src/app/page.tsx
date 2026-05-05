"use client";
import { useState, useCallback, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import { TabKey } from "@/lib/types";
import Sidebar from "@/components/Sidebar";
import StoreSelector from "@/components/StoreSelector";
import ErrorBoundary from "@/components/ErrorBoundary";
import CommandPalette from "@/components/CommandPalette";
import { Toaster } from "react-hot-toast";
import { useGMVStore } from "@/lib/gmvStore";
import { useStoreManager } from "@/store/useStoreManager";
import { AIAssistant } from "@/components/ai/AIAssistant";
import { useAIPageContext } from "@/hooks/useAIPageContext";
import { useDarkMode } from "@/hooks/useDarkMode";
import type { BusinessOverviewData, VideoPerformanceData } from "@/lib/types";

// ─── Lazy-loaded screens (reduces initial bundle by ~70%) ───
const HomeScreen = dynamic(() => import("@/screens/HomeScreen"), { ssr: false });
const DashboardScreen = dynamic(() => import("@/screens/DashboardScreen"), { ssr: false });
const PanduanScreen = dynamic(() => import("@/screens/PanduanScreen"), { ssr: false });
const ContentTrackerScreen = dynamic(() => import("@/screens/ContentTrackerScreen"), { ssr: false });
const CampaignLogScreen = dynamic(() => import("@/screens/CampaignLogScreen"), { ssr: false });
const KOLTrackerScreen = dynamic(() => import("@/screens/KOLTrackerScreen"), { ssr: false });
const HipotesisPlanScreen = dynamic(() => import("@/screens/HipotesisPlanScreen"), { ssr: false });
const ReferensiKPIScreen = dynamic(() => import("@/screens/ReferensiKPIScreen"), { ssr: false });
const AIDAFunnelScreen = dynamic(() => import("@/screens/AIDAFunnelScreen"), { ssr: false });
const BudgetROIScreen = dynamic(() => import("@/screens/BudgetROIScreen"), { ssr: false });
const TOFUMOFUBOFUScreen = dynamic(() => import("@/screens/TOFUMOFUBOFUScreen"), { ssr: false });
const TargetROIBulananScreen = dynamic(() => import("@/screens/TargetROIBulananScreen"), { ssr: false });
const BudgetingHarianScreen = dynamic(() => import("@/screens/BudgetingHarianScreen"), { ssr: false });
const AnalisisTMBScreen = dynamic(() => import("@/screens/AnalisisTMBScreen"), { ssr: false });
const GMVUploadScreen = dynamic(() => import("@/screens/GMVUploadScreen"), { ssr: false });
const GMVDashboardScreen = dynamic(() => import("@/screens/GMVDashboardScreen"), { ssr: false });
const GMVSKUScreen = dynamic(() => import("@/screens/GMVSKUScreen"), { ssr: false });
const GMVCreativeScreen = dynamic(() => import("@/screens/GMVCreativeScreen"), { ssr: false });
const GMVBenchmarkScreen = dynamic(() => import("@/screens/GMVBenchmarkScreen"), { ssr: false });
const GMVChecklistScreen = dynamic(() => import("@/screens/GMVChecklistScreen"), { ssr: false });
const GMVOptimasiScreen = dynamic(() => import("@/screens/GMVOptimasiScreen"), { ssr: false });
const GMVCalculatorScreen = dynamic(() => import("@/screens/GMVCalculatorScreen"), { ssr: false });
const GMVOverviewScreen = dynamic(() => import("@/screens/GMVOverviewScreen"), { ssr: false });
const VideoPerformanceScreen = dynamic(() => import("@/screens/VideoPerformanceScreen"), { ssr: false });
const SetupScreen = dynamic(() => import("@/screens/SetupScreen"), { ssr: false });
const StoreCompareScreen = dynamic(() => import("@/screens/StoreCompareScreen"), { ssr: false });
const CompareGabunganScreen = dynamic(() => import("@/screens/CompareGabunganScreen"), { ssr: false });
const OKRScreen = dynamic(() => import("@/screens/OKRScreen"), { ssr: false });
const AffiliateScreen = dynamic(() => import("@/screens/AffiliateScreen"), { ssr: false });
const ReportBuilderScreen = dynamic(() => import("@/screens/ReportBuilderScreen"), { ssr: false });
const LiveAnalyticsScreen = dynamic(() => import("@/screens/LiveAnalyticsScreen"), { ssr: false });
const StoreSettingsScreen = dynamic(() => import("@/screens/StoreSettingsScreen"), { ssr: false });
const GmaxOverviewScreen = dynamic(() => import("@/screens/GmaxOverviewScreen"), { ssr: false });
const ProductCardsScreen = dynamic(() => import("@/screens/ProductCardsScreen"), { ssr: false });
const LaporanHarianScreen = dynamic(() => import("@/screens/LaporanHarianScreen"), { ssr: false });
const SKUTrackingScreen = dynamic(() => import("@/screens/SKUTrackingScreen"), { ssr: false });
const GmaxEvaluasiScreen = dynamic(() => import("@/screens/GmaxEvaluasiScreen"), { ssr: false });

// ─── Valid tab keys for hash routing ───
const VALID_TABS = new Set<string>([
  "home","dashboard","panduan","content-tracker","campaign-log","kol-tracker",
  "hipotesis-plan","referensi-kpi","aida-funnel","budget-roi","tofu-mofu-bofu",
  "target-roi-bulanan","budgeting-harian","analisis-tmb","gmv-upload","gmv-dashboard",
  "gmv-sku","gmv-creative","gmv-benchmark","gmv-checklist","gmv-optimasi","gmv-kalkulator",
  "gmv-overview","video-performance","store-compare","store-settings","compare-gabungan",
  "okr","affiliate","report-builder","live-analytics","gmax-overview","product-cards",
  "laporan-harian","sku-tracking","gmax-evaluasi",
]);

const PAGE_TITLES: Record<TabKey, string> = {
  home: "Executive Summary", dashboard: "Dashboard", panduan: "Panduan",
  "content-tracker": "Content Tracker", "campaign-log": "Campaign Log",
  "kol-tracker": "KOL Tracker", "hipotesis-plan": "Hipotesis & Plan",
  "referensi-kpi": "Referensi KPI", "aida-funnel": "AIDA Funnel",
  "budget-roi": "Budget & ROI", "tofu-mofu-bofu": "TOFU MOFU BOFU",
  "target-roi-bulanan": "Target & ROI Bulanan", "budgeting-harian": "Budgeting Harian",
  "analisis-tmb": "Analisis TMB", "gmv-upload": "Upload Data",
  "gmv-dashboard": "GMV Dashboard", "gmv-sku": "SKU Analyzer",
  "gmv-creative": "Creative Optimizer", "gmv-benchmark": "Top Seller Metrics",
  "gmv-checklist": "Checklist Evaluasi", "gmv-optimasi": "Optimasi Kreatif",
  "gmv-kalkulator": "ROI Calculator", "gmv-overview": "Overview Bisnis",
  "video-performance": "Video Performance", "store-compare": "Bandingkan Toko",
  "store-settings": "Kelola Toko", "compare-gabungan": "Compare & Gabungan",
  okr: "OKR Framework", affiliate: "Affiliate Manager",
  "report-builder": "Report Builder", "live-analytics": "Live Analytics",
  "gmax-overview": "GMAX Overview", "product-cards": "Kartu Produk",
  "laporan-harian": "Laporan Harian", "sku-tracking": "SKU Tracking",
  "gmax-evaluasi": "GMAX Evaluasi",
};

function getTabFromHash(): TabKey {
  if (typeof window === "undefined") return "home";
  const h = window.location.hash.replace(/^#\/?/, "");
  return VALID_TABS.has(h) ? (h as TabKey) : "home";
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabKey>("home");
  const [hydrated, setHydrated] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { dark, toggle: toggleDark } = useDarkMode();
  const { fileName, setData: setGMVData } = useGMVStore();
  const { stores, activeStoreId, getActiveStore, addStore, setActiveStore, saveOverviewData, saveVideoData, migrated, setMigrated, initFromSupabase, loadAffiliateFromSupabase } = useStoreManager();
  const activeStore = getActiveStore();
  const [migrationBanner, setMigrationBanner] = useState(false);

  // Wait for Zustand persist hydration + read initial hash
  useEffect(() => {
    setActiveTab(getTabFromHash());
    setHydrated(true);
  }, []);

  // Sync hash ↔ tab (back/forward browser buttons)
  useEffect(() => {
    const onHashChange = () => setActiveTab(getTabFromHash());
    window.addEventListener("hashchange", onHashChange);
    window.addEventListener("popstate", onHashChange);
    return () => {
      window.removeEventListener("hashchange", onHashChange);
      window.removeEventListener("popstate", onHashChange);
    };
  }, []);

  // Init from Supabase on mount
  useEffect(() => {
    initFromSupabase().catch(() => {});
  }, [initFromSupabase]);

  // Load affiliate summaries from Supabase when active store changes
  useEffect(() => {
    if (!activeStoreId) return;
    loadAffiliateFromSupabase(activeStoreId).catch(() => {});
  }, [activeStoreId, loadAffiliateFromSupabase]);

  // Data migration from old localStorage keys
  useEffect(() => {
    if (migrated || stores.length > 0) return;
    if (typeof window === "undefined") return;
    (async () => {
      try {
        const oldOverview = localStorage.getItem("gmv_overview_months");
        const oldVideo = localStorage.getItem("gmv_video_months");
        if (!oldOverview && !oldVideo) return;

        const id = await addStore("Toko Utama", "#1A237E", "🛒");
        setActiveStore(id);

        if (oldOverview) {
          const parsed = JSON.parse(oldOverview) as BusinessOverviewData[];
          parsed.forEach((d) => saveOverviewData(id, d));
          localStorage.removeItem("gmv_overview_months");
        }
        if (oldVideo) {
          const parsed = JSON.parse(oldVideo) as VideoPerformanceData[];
          parsed.forEach((d) => saveVideoData(id, d));
          localStorage.removeItem("gmv_video_months");
        }
        setMigrated();
        setMigrationBanner(true);
      } catch { /* ignore */ }
    })();
  }, [migrated, stores.length, addStore, setActiveStore, saveOverviewData, saveVideoData, setMigrated]);

  // Sync GMV store when active store changes (load latest gmvData)
  useEffect(() => {
    if (!activeStore) return;
    const keys = Object.keys(activeStore.gmvData).sort();
    if (keys.length > 0) {
      const latest = activeStore.gmvData[keys[keys.length - 1]];
      if (latest?.rows) setGMVData(latest.fileName || "stored", latest.rows);
    }
  }, [activeStoreId, activeStore, setGMVData]);

  // Navigate: update tab + push hash
  const navigate = useCallback((tab: string) => {
    setActiveTab(tab as TabKey);
    window.location.hash = `#/${tab}`;
    setSidebarOpen(false);
  }, []);

  // Wrap setActiveTab for Sidebar to also update hash
  const handleTabSelect = useCallback((tab: TabKey) => {
    setActiveTab(tab);
    window.location.hash = `#/${tab}`;
    setSidebarOpen(false);
  }, []);

  // Update document title
  useEffect(() => {
    document.title = `${PAGE_TITLES[activeTab] || "Marketing Suite"} — Marketing Suite`;
  }, [activeTab]);

  const isGMVPage = activeTab.startsWith("gmv-") && activeTab !== "gmv-upload" && activeTab !== "gmv-overview";

  const aiPage = useMemo(() => {
    const map: Record<string, string> = {
      "dashboard": "dashboard",
      "gmv-dashboard": "dashboard",
      "gmv-sku": "sku",
      "gmv-creative": "creative",
      "gmv-overview": "overview",
      "gmv-benchmark": "benchmark",
      "gmv-checklist": "checklist",
      "gmv-optimasi": "optimasi",
      "gmv-kalkulator": "kalkulator",
      "video-performance": "video-performance",
      "store-compare": "store-compare",
      "compare-gabungan": "compare-gabungan",
      "okr": "okr",
      "affiliate": "affiliate",
      "report-builder": "report-builder",
    };
    return map[activeTab] || "dashboard";
  }, [activeTab]);

  const aiContext = useAIPageContext(aiPage);

  // All hooks above — conditional returns below

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Memuat...</p>
        </div>
      </div>
    );
  }

  if (stores.length === 0) {
    return <SetupScreen />;
  }

  const renderScreen = () => {
    switch (activeTab) {
      case "home": return <HomeScreen onNavigate={navigate} />;
      case "dashboard": return <DashboardScreen />;
      case "panduan": return <PanduanScreen />;
      case "content-tracker": return <ContentTrackerScreen />;
      case "campaign-log": return <CampaignLogScreen />;
      case "kol-tracker": return <KOLTrackerScreen />;
      case "hipotesis-plan": return <HipotesisPlanScreen />;
      case "referensi-kpi": return <ReferensiKPIScreen />;
      case "aida-funnel": return <AIDAFunnelScreen />;
      case "budget-roi": return <BudgetROIScreen />;
      case "tofu-mofu-bofu": return <TOFUMOFUBOFUScreen />;
      case "target-roi-bulanan": return <TargetROIBulananScreen />;
      case "budgeting-harian": return <BudgetingHarianScreen />;
      case "analisis-tmb": return <AnalisisTMBScreen />;
      case "gmv-upload": return <GMVUploadScreen onNavigate={navigate} />;
      case "gmv-dashboard": return <GMVDashboardScreen onNavigate={navigate} />;
      case "gmv-sku": return <GMVSKUScreen onNavigate={navigate} />;
      case "gmv-creative": return <GMVCreativeScreen onNavigate={navigate} />;
      case "gmv-benchmark": return <GMVBenchmarkScreen onNavigate={navigate} />;
      case "gmv-checklist": return <GMVChecklistScreen />;
      case "gmv-optimasi": return <GMVOptimasiScreen />;
      case "gmv-kalkulator": return <GMVCalculatorScreen />;
      case "gmv-overview": return <GMVOverviewScreen />;
      case "video-performance": return <VideoPerformanceScreen />;
      case "store-compare": return <StoreCompareScreen />;
      case "compare-gabungan": return <CompareGabunganScreen />;
      case "okr": return <OKRScreen />;
      case "affiliate": return <AffiliateScreen />;
      case "live-analytics": return <LiveAnalyticsScreen />;
      case "report-builder": return <ReportBuilderScreen />;
      case "store-settings": return <StoreSettingsScreen />;
      case "gmax-overview": return <GmaxOverviewScreen />;
      case "product-cards": return <ProductCardsScreen />;
      case "laporan-harian": return <LaporanHarianScreen />;
      case "sku-tracking": return <SKUTrackingScreen />;
      case "gmax-evaluasi": return <GmaxEvaluasiScreen />;
      default: return <DashboardScreen />;
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar active={activeTab} onSelect={handleTabSelect} mobileOpen={sidebarOpen} onMobileClose={() => setSidebarOpen(false)} />
      <main className="flex-1 overflow-y-auto min-w-0">
        {/* Store selector header */}
        <div className="bg-white dark:bg-gray-900 border-b border-border dark:border-gray-700 px-4 md:px-6 py-2.5 flex items-center justify-between gap-2 md:gap-4">
          <div className="flex items-center gap-2 md:gap-3">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Open menu">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
            <StoreSelector onNavigate={navigate} />
            {activeStore && (
              <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ backgroundColor: activeStore.color + '15', color: activeStore.color }}>
                {activeStore.avatar} {activeStore.name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isGMVPage && fileName && (
              <div className="flex items-center gap-2 text-sm hidden md:flex">
                <span className="text-muted">📄</span>
                <span className="font-medium text-foreground">{fileName}</span>
              </div>
            )}
            <button onClick={() => { const e = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }); window.dispatchEvent(e); }} className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" title="Ctrl+K">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              Cari...
              <kbd className="ml-1 px-1 py-0.5 text-[10px] font-mono bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-600">⌘K</kbd>
            </button>
            <button onClick={toggleDark} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors" aria-label="Toggle dark mode" title={dark ? "Light mode" : "Dark mode"}>
              {dark ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              )}
            </button>
          </div>
        </div>
        {migrationBanner && (
          <div className="bg-green-50 border-b border-green-200 px-6 py-2.5 flex items-center justify-between text-sm">
            <span className="text-green-700">✅ Data lama berhasil dipindahkan ke toko &quot;Toko Utama&quot;. Silakan ubah nama toko di Settings.</span>
            <button onClick={() => setMigrationBanner(false)} className="text-green-600 hover:text-green-800 font-semibold text-xs">Tutup</button>
          </div>
        )}
        <div className="p-3 md:p-6 max-w-[1400px] mx-auto">
          <ErrorBoundary key={activeTab}>
            {renderScreen()}
          </ErrorBoundary>
        </div>
      </main>
      <AIAssistant page={aiPage} context={aiContext} />
      <CommandPalette onNavigate={handleTabSelect} />
      <Toaster position="top-right" toastOptions={{ duration: 3000, style: { fontSize: '14px' } }} />
    </div>
  );
}
