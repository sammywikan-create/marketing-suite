"use client";
import { useState, useCallback, useMemo, useEffect } from "react";
import { TabKey } from "@/lib/types";
import Sidebar from "@/components/Sidebar";
import DashboardScreen from "@/screens/DashboardScreen";
import PanduanScreen from "@/screens/PanduanScreen";
import ContentTrackerScreen from "@/screens/ContentTrackerScreen";
import CampaignLogScreen from "@/screens/CampaignLogScreen";
import KOLTrackerScreen from "@/screens/KOLTrackerScreen";
import HipotesisPlanScreen from "@/screens/HipotesisPlanScreen";
import ReferensiKPIScreen from "@/screens/ReferensiKPIScreen";
import AIDAFunnelScreen from "@/screens/AIDAFunnelScreen";
import BudgetROIScreen from "@/screens/BudgetROIScreen";
import TOFUMOFUBOFUScreen from "@/screens/TOFUMOFUBOFUScreen";
import TargetROIBulananScreen from "@/screens/TargetROIBulananScreen";
import BudgetingHarianScreen from "@/screens/BudgetingHarianScreen";
import AnalisisTMBScreen from "@/screens/AnalisisTMBScreen";
import GMVUploadScreen from "@/screens/GMVUploadScreen";
import GMVDashboardScreen from "@/screens/GMVDashboardScreen";
import GMVSKUScreen from "@/screens/GMVSKUScreen";
import GMVCreativeScreen from "@/screens/GMVCreativeScreen";
import GMVBenchmarkScreen from "@/screens/GMVBenchmarkScreen";
import GMVChecklistScreen from "@/screens/GMVChecklistScreen";
import GMVOptimasiScreen from "@/screens/GMVOptimasiScreen";
import GMVCalculatorScreen from "@/screens/GMVCalculatorScreen";
import GMVOverviewScreen from "@/screens/GMVOverviewScreen";
import VideoPerformanceScreen from "@/screens/VideoPerformanceScreen";
import SetupScreen from "@/screens/SetupScreen";
import StoreCompareScreen from "@/screens/StoreCompareScreen";
import CompareGabunganScreen from "@/screens/CompareGabunganScreen";
import OKRScreen from "@/screens/OKRScreen";
import AffiliateScreen from "@/screens/AffiliateScreen";
import ReportBuilderScreen from "@/screens/ReportBuilderScreen";
import HomeScreen from "@/screens/HomeScreen";
import StoreSettingsScreen from "@/screens/StoreSettingsScreen";
import StoreSelector from "@/components/StoreSelector";
import { useGMVStore } from "@/lib/gmvStore";
import { useStoreManager } from "@/store/useStoreManager";
import { AIAssistant } from "@/components/ai/AIAssistant";
import { useAIPageContext } from "@/hooks/useAIPageContext";
import type { BusinessOverviewData, VideoPerformanceData } from "@/lib/types";

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabKey>("home");
  const [hydrated, setHydrated] = useState(false);
  const { fileName, setData: setGMVData } = useGMVStore();
  const { stores, activeStoreId, getActiveStore, addStore, setActiveStore, saveOverviewData, saveVideoData, migrated, setMigrated, initFromSupabase, loadAffiliateFromSupabase } = useStoreManager();
  const activeStore = getActiveStore();
  const [migrationBanner, setMigrationBanner] = useState(false);

  // Wait for Zustand persist hydration before rendering
  useEffect(() => { setHydrated(true); }, []);

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

  const navigate = useCallback((tab: string) => {
    setActiveTab(tab as TabKey);
  }, []);

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
      case "report-builder": return <ReportBuilderScreen />;
      case "store-settings": return <StoreSettingsScreen />;
      default: return <DashboardScreen />;
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar active={activeTab} onSelect={setActiveTab} />
      <main className="flex-1 overflow-y-auto">
        {/* Store selector header */}
        <div className="bg-white border-b border-border px-6 py-2.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <StoreSelector onNavigate={navigate} />
            {activeStore && (
              <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ backgroundColor: activeStore.color + '15', color: activeStore.color }}>
                {activeStore.avatar} {activeStore.name}
              </span>
            )}
          </div>
          {isGMVPage && fileName && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted">📄</span>
              <span className="font-medium text-foreground">{fileName}</span>
            </div>
          )}
        </div>
        {migrationBanner && (
          <div className="bg-green-50 border-b border-green-200 px-6 py-2.5 flex items-center justify-between text-sm">
            <span className="text-green-700">✅ Data lama berhasil dipindahkan ke toko &quot;Toko Utama&quot;. Silakan ubah nama toko di Settings.</span>
            <button onClick={() => setMigrationBanner(false)} className="text-green-600 hover:text-green-800 font-semibold text-xs">Tutup</button>
          </div>
        )}
        <div className="p-6 max-w-[1400px] mx-auto">
          {renderScreen()}
        </div>
      </main>
      <AIAssistant page={aiPage} context={aiContext} />
    </div>
  );
}
