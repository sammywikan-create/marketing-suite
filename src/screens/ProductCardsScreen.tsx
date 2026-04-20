"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useStoreManager } from "@/store/useStoreManager";
import { fetchDailyTraffic, fetchProductStats } from "@/lib/product-card/queries";
import { BENCH_PRODUCT_CARD, BENCH_SHOP_TAB, getBenchmarkEmoji } from "@/lib/product-card/benchmarks";
import { calculateProductScore } from "@/lib/product-card/scoring";
import { generateProductInsights } from "@/components/product-cards/ProductInsightCards";
import KpiCardGrid from "@/components/product-cards/KpiCardGrid";
import ConversionFunnel from "@/components/product-cards/ConversionFunnel";
import DailyTrafficChart from "@/components/product-cards/DailyTrafficChart";
import RateTrendChart from "@/components/product-cards/RateTrendChart";
import DailyTrafficTable from "@/components/product-cards/DailyTrafficTable";
import ProductTable from "@/components/product-cards/ProductTable";
import ProductScoreGauge from "@/components/product-cards/ProductScoreGauge";
import ConversionBenchmarkTable from "@/components/product-cards/ConversionBenchmarkTable";
import ProductInsightCards from "@/components/product-cards/ProductInsightCards";
import ChannelComparisonSection from "@/components/product-cards/ChannelComparisonSection";
import UploadExcelModal from "@/components/product-cards/UploadExcelModal";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import { Upload, ArrowLeft, Copy, Check } from "lucide-react";

// ─── Helpers ─────────────────────────────────────────
function fR(v: number) {
  if (v >= 1_000_000_000) return `Rp ${(v / 1_000_000_000).toFixed(1)}M`;
  if (v >= 1_000_000) return `Rp ${(v / 1_000_000).toFixed(1)}Jt`;
  if (v >= 1_000) return `Rp ${(v / 1_000).toFixed(1)}Rb`;
  return `Rp ${v.toLocaleString("id-ID")}`;
}
function fN(v: number) { return v.toLocaleString("id-ID"); }
function fP(v: number) { return (v * 100).toFixed(2) + "%"; }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sumField(arr: any[], key: string): number {
  return arr.reduce((a, d) => a + (Number(d[key]) || 0), 0);
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function avgField(arr: any[], key: string): number {
  if (!arr.length) return 0;
  return arr.reduce((a, d) => a + (Number(d[key]) || 0), 0) / arr.length;
}

// ══════════════════════════════════════════════════════
// MAIN SCREEN
// ══════════════════════════════════════════════════════
export default function ProductCardsScreen() {
  const { getActiveStore } = useStoreManager();
  const activeStore = getActiveStore();
  const storeId = activeStore?.id || "";

  // ─── State ──────────────────────────────────────────
  const [mainTab, setMainTab] = useState(0); // 0=Kartu Produk, 1=Shop Tab, 2=Komparasi
  const [subTab, setSubTab] = useState(0);
  const [showUpload, setShowUpload] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Detail view
  const [detailProductId, setDetailProductId] = useState<string | null>(null);

  // ─── Data ───────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [kpDaily, setKpDaily] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [kpProducts, setKpProducts] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [stCoreDaily, setStCoreDaily] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [stSearchDaily, setStSearchDaily] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [stProducts, setStProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const [d1, d2, d3, d4, d5] = await Promise.all([
        fetchDailyTraffic(storeId, "product_card"),
        fetchProductStats(storeId, "product_card"),
        fetchDailyTraffic(storeId, "shop_tab_all"),
        fetchDailyTraffic(storeId, "shop_tab_search"),
        fetchProductStats(storeId, "shop_tab_shopping_center"),
      ]);
      setKpDaily(d1); setKpProducts(d2);
      setStCoreDaily(d3); setStSearchDaily(d4); setStProducts(d5);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [storeId]);

  useEffect(() => { loadData(); }, [loadData, refreshKey]);

  const hasData = kpDaily.length > 0 || kpProducts.length > 0 || stCoreDaily.length > 0 || stProducts.length > 0;

  // ─── If viewing product detail ──────────────────────
  if (detailProductId) {
    return (
      <ProductDetailView
        productId={detailProductId}
        kpProducts={kpProducts}
        stProducts={stProducts}
        storeAvgCTR={avgField(kpProducts, "rate_tayangan_to_klik")}
        storeAvgGmv={kpProducts.length ? sumField(kpProducts, "gmv") / kpProducts.length : 0}
        onBack={() => setDetailProductId(null)}
      />
    );
  }

  // ─── Empty State ────────────────────────────────────
  if (!hasData && !loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mb-6">
          <span className="text-4xl">📦</span>
        </div>
        <h2 className="text-2xl font-bold mb-2">Kartu Produk</h2>
        <p className="text-gray-500 mb-2 max-w-md">
          Upload file Excel dari TikTok Seller Center untuk melihat performa kartu produk dan shop tab.
        </p>
        <p className="text-xs text-gray-400 mb-6">Mendukung 5 jenis file: Products-Card-List, Product-Card-Traffic-Stats, Core-Stats, Channel-Stats-Search, Shopping_Center_Overview_Product</p>
        <button onClick={() => setShowUpload(true)}
          className="bg-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-blue-700 transition flex items-center gap-2">
          <Upload size={20} /> Upload File Excel
        </button>
        {activeStore && (
          <UploadExcelModal
            open={showUpload}
            onClose={() => setShowUpload(false)}
            storeId={storeId}
            storeName={activeStore.name}
            onImportDone={() => { setRefreshKey((k) => k + 1); }}
          />
        )}
      </div>
    );
  }

  const mainTabs = ["🃏 Kartu Produk", "🏪 Shop Tab", "⚖️ Komparasi"];

  return (
    <div className="space-y-6">
      {/* ═══ HEADER ═══ */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📦 Kartu Produk</h1>
          <p className="text-sm text-gray-400 mt-0.5">{activeStore?.name || "—"}</p>
        </div>
        <button onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition">
          <Upload size={16} /> Upload Excel
        </button>
      </div>

      {/* ═══ MAIN TABS ═══ */}
      <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
        {mainTabs.map((t, i) => (
          <button key={i} onClick={() => { setMainTab(i); setSubTab(0); }}
            className={`flex-1 text-sm px-4 py-2 rounded-lg font-medium transition ${mainTab === i ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            {t}
          </button>
        ))}
      </div>

      {loading && <div className="text-center py-12 text-gray-400">Memuat data...</div>}

      {/* ═══ TAB CONTENT ═══ */}
      {!loading && mainTab === 0 && <KartuProdukTab daily={kpDaily} products={kpProducts} subTab={subTab} setSubTab={setSubTab} onSelectProduct={setDetailProductId} />}
      {!loading && mainTab === 1 && <ShopTabSection core={stCoreDaily} search={stSearchDaily} products={stProducts} subTab={subTab} setSubTab={setSubTab} onSelectProduct={setDetailProductId} />}
      {!loading && mainTab === 2 && <ChannelComparisonSection kpData={kpProducts} stData={stProducts} />}

      {/* Upload Modal */}
      {activeStore && (
        <UploadExcelModal
          open={showUpload}
          onClose={() => setShowUpload(false)}
          storeId={storeId}
          storeName={activeStore.name}
          onImportDone={() => { setRefreshKey((k) => k + 1); setShowUpload(false); }}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════
// TAB 1: KARTU PRODUK
// ══════════════════════════════════════════════════════
function KartuProdukTab({
  daily, products, subTab, setSubTab, onSelectProduct,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  daily: any[]; products: any[];
  subTab: number; setSubTab: (n: number) => void;
  onSelectProduct: (id: string) => void;
}) {
  const subTabs = ["📊 Traffic Harian", "🛍️ Per Produk"];

  // KPI from daily data
  const totalTayangan = sumField(daily, "tayangan");
  const totalKlik = sumField(daily, "klik");
  const totalKlikUnik = sumField(daily, "klik_unik");
  const totalAddToCart = sumField(daily, "add_to_cart");
  const totalGmv = sumField(daily, "gmv");
  const totalGmvContent = sumField(daily, "gmv_from_content");
  const totalPembeli = sumField(daily, "pembeli");
  const totalSku = sumField(daily, "pesanan_sku");
  const avgCTR = avgField(daily, "rate_tayangan_to_klik");

  const kpiCards = [
    { icon: "👁️", label: "Tayangan", value: fN(totalTayangan), sub: `Penonton: ${fN(sumField(daily, "penonton"))}` },
    { icon: "🖱️", label: "Total Klik", value: fN(totalKlik), sub: `Unik: ${fN(totalKlikUnik)}` },
    { icon: "🛒", label: "Tambah Keranjang", value: fN(totalAddToCart) },
    { icon: "💰", label: "Total GMV", value: fR(totalGmv), sub: `Konten: ${fR(totalGmvContent)}` },
    { icon: "👤", label: "Pembeli", value: fN(totalPembeli), sub: `SKU: ${fN(totalSku)}` },
    {
      icon: "📈", label: "CTR", value: fP(avgCTR),
      badge: { text: getBenchmarkEmoji(avgCTR, BENCH_PRODUCT_CARD.ctr) + " " + (avgCTR >= 0.05 ? "Baik" : avgCTR >= 0.03 ? "Cukup" : "Rendah"),
        color: avgCTR >= 0.05 ? "bg-green-100 text-green-700" : avgCTR >= 0.03 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700" },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Sub tabs */}
      <div className="flex gap-2">
        {subTabs.map((t, i) => (
          <button key={i} onClick={() => setSubTab(i)}
            className={`text-xs px-4 py-2 rounded-xl font-medium transition ${subTab === i ? "bg-blue-600 text-white" : "bg-white text-gray-500 border hover:text-gray-700"}`}>
            {t}
          </button>
        ))}
      </div>

      {subTab === 0 && (
        <>
          <KpiCardGrid cards={kpiCards} cols={3} />
          {daily.length > 0 && (
            <ConversionFunnel
              steps={[
                { icon: "👁️", label: "Tayangan", value: totalTayangan, formatted: fN(totalTayangan) },
                { icon: "🖱️", label: "Klik", value: totalKlik, formatted: fN(totalKlik) },
                { icon: "🛒", label: "Keranjang", value: totalAddToCart, formatted: fN(totalAddToCart) },
                { icon: "👤", label: "Pembeli", value: totalPembeli, formatted: fN(totalPembeli) },
              ]}
              arrows={[
                { rate: avgCTR, benchmark: BENCH_PRODUCT_CARD.ctr },
                { rate: avgField(daily, "rate_klik_to_cart"), benchmark: BENCH_PRODUCT_CARD.klikToCart },
                { rate: avgField(daily, "rate_cart_to_pembayaran"), benchmark: BENCH_PRODUCT_CARD.cartToPayment },
              ]}
            />
          )}
          <DailyTrafficChart data={daily} />
          <RateTrendChart data={daily} />
          <DailyTrafficTable data={daily} />
        </>
      )}

      {subTab === 1 && (
        <ProductTable data={products} channel="product_card" onSelectProduct={onSelectProduct} />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════
// TAB 2: SHOP TAB
// ══════════════════════════════════════════════════════
function ShopTabSection({
  core, search, products, subTab, setSubTab, onSelectProduct,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  core: any[]; search: any[]; products: any[];
  subTab: number; setSubTab: (n: number) => void;
  onSelectProduct: (id: string) => void;
}) {
  const subTabs = ["📊 Core Stats", "🔍 Channel: Search", "🛍️ Per Produk"];

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {subTabs.map((t, i) => (
          <button key={i} onClick={() => setSubTab(i)}
            className={`text-xs px-4 py-2 rounded-xl font-medium transition ${subTab === i ? "bg-blue-600 text-white" : "bg-white text-gray-500 border hover:text-gray-700"}`}>
            {t}
          </button>
        ))}
      </div>

      {subTab === 0 && <ShopTabDailyView data={core} label="Core Stats" />}
      {subTab === 1 && <ShopTabSearchView searchData={search} coreData={core} />}
      {subTab === 2 && <ShopTabProductView products={products} onSelectProduct={onSelectProduct} />}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ShopTabDailyView({ data, label }: { data: any[]; label: string }) {
  const totalGmv = sumField(data, "gmv");
  const totalPembeli = sumField(data, "pembeli");
  const totalPenonton = sumField(data, "penonton");
  const totalKlikUnik = sumField(data, "klik_unik");
  const totalAddToCart = sumField(data, "add_to_cart");
  const totalRefund = sumField(data, "refund_amount");
  const avgCTR = avgField(data, "rate_tayangan_to_klik");
  const avgPesananPerKlik = avgField(data, "rate_pesanan_per_klik");
  const totalSku = sumField(data, "pesanan_sku");
  const avgAOV = avgField(data, "gmv_avg_per_buyer");

  const cards = [
    { icon: "💰", label: "GMV", value: fR(totalGmv), sub: `AOV: ${fR(avgAOV)}` },
    { icon: "👤", label: "Pembeli", value: fN(totalPembeli), sub: `SKU: ${fN(totalSku)}` },
    { icon: "👁️", label: "Lihat Produk", value: fN(totalPenonton) },
    { icon: "🖱️", label: "Klik Produk", value: fN(totalKlikUnik) },
    { icon: "🛒", label: "Keranjang", value: fN(totalAddToCart) },
    { icon: "💸", label: "Refund", value: fR(totalRefund), badge: totalRefund === 0 ? { text: "🟢 Nihil", color: "bg-green-100 text-green-700" } : { text: `${sumField(data, "pesanan_refund")} pesanan`, color: "bg-red-100 text-red-700" } },
    { icon: "📈", label: "CTR", value: fP(avgCTR), badge: { text: getBenchmarkEmoji(avgCTR, BENCH_SHOP_TAB.ctr) + " " + (avgCTR >= 0.08 ? "Baik" : avgCTR >= 0.05 ? "Cukup" : "Rendah"), color: avgCTR >= 0.08 ? "bg-green-100 text-green-700" : avgCTR >= 0.05 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700" } },
    { icon: "🛍️", label: "Pesanan/Klik", value: fP(avgPesananPerKlik), badge: { text: getBenchmarkEmoji(avgPesananPerKlik, BENCH_SHOP_TAB.pesananPerKlik) + " " + (avgPesananPerKlik >= 0.20 ? "Baik" : "Rendah"), color: avgPesananPerKlik >= 0.20 ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700" } },
  ];

  return (
    <>
      <KpiCardGrid cards={cards} cols={4} />
      <DailyTrafficChart data={data} />
      <RateTrendChart data={data} />
      <DailyTrafficTable data={data} showShopCols />
    </>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ShopTabSearchView({ searchData, coreData }: { searchData: any[]; coreData: any[] }) {
  // Comparison insight
  const searchGmv = sumField(searchData, "gmv");
  const coreGmv = sumField(coreData, "gmv");
  const searchCTR = avgField(searchData, "rate_tayangan_to_klik");
  const coreCTR = avgField(coreData, "rate_tayangan_to_klik");
  const kontribusi = coreGmv > 0 ? (searchGmv / coreGmv) * 100 : 0;

  return (
    <>
      {/* Search vs Core insight */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
        <h3 className="text-sm font-semibold mb-3">🔍 Search vs Keseluruhan Shop Tab (periode ini)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-500">CTR Search:</span> <strong>{fP(searchCTR)}</strong>
            <span className="text-gray-400 mx-1">vs</span>
            <span className="text-gray-500">Shop Tab All:</span> <strong>{fP(coreCTR)}</strong>
          </div>
          <div>
            <span className="text-gray-500">GMV Search:</span> <strong className="text-green-700">{fR(searchGmv)}</strong>
            <span className="text-gray-400 mx-1">vs</span>
            <span className="text-gray-500">Shop Tab All:</span> <strong className="text-green-700">{fR(coreGmv)}</strong>
          </div>
          <div>
            <span className="text-gray-500">Kontribusi Search:</span> <strong>{kontribusi.toFixed(1)}%</strong> dari total GMV Shop Tab
          </div>
        </div>
      </div>
      <ShopTabDailyView data={searchData} label="Channel Search" />
    </>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ShopTabProductView({ products, onSelectProduct }: { products: any[]; onSelectProduct: (id: string) => void }) {
  const totalImpresi = sumField(products, "tayangan");
  const totalImpresiUnik = sumField(products, "impresi_unik");
  const totalKlikUnik = sumField(products, "klik_unik");
  const totalPembeli = sumField(products, "pembeli");
  const totalGmv = sumField(products, "gmv");

  const kpiCards = [
    { icon: "👁️", label: "Total Impresi", value: fN(totalImpresi) },
    { icon: "🔍", label: "Impresi Unik", value: fN(totalImpresiUnik) },
    { icon: "🖱️", label: "Klik Unik", value: fN(totalKlikUnik) },
    { icon: "👤", label: "Pembeli", value: fN(totalPembeli) },
    { icon: "💰", label: "Total GMV", value: fR(totalGmv) },
  ];

  return (
    <>
      <KpiCardGrid cards={kpiCards} cols={3} />
      <ProductTable data={products} channel="shop_tab" onSelectProduct={onSelectProduct} />
    </>
  );
}

// ══════════════════════════════════════════════════════
// PRODUCT DETAIL VIEW
// ══════════════════════════════════════════════════════
function ProductDetailView({
  productId, kpProducts, stProducts, storeAvgCTR, storeAvgGmv, onBack,
}: {
  productId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  kpProducts: any[]; stProducts: any[];
  storeAvgCTR: number; storeAvgGmv: number;
  onBack: () => void;
}) {
  const [detailTab, setDetailTab] = useState(0); // 0=Kartu Produk, 1=Shop Tab
  const [copied, setCopied] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const kpData = kpProducts.filter((d: any) => d.product_id === productId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stData = stProducts.filter((d: any) => d.product_id === productId);
  const product = kpData[0] || stData[0];
  const productName = product?.product_name || productId;

  const activeData = detailTab === 0 ? kpData : stData;
  const current = activeData[0];

  const bench = detailTab === 0 ? BENCH_PRODUCT_CARD : BENCH_SHOP_TAB;

  const score = useMemo(() => {
    if (!current) return null;
    return calculateProductScore(
      current.rate_tayangan_to_klik || 0,
      current.rate_klik_to_pembayaran || 0,
      current.rate_klik_to_cart || 0,
      current.gmv || 0,
      storeAvgGmv,
      current.gmv_from_content || 0,
    );
  }, [current, storeAvgGmv]);

  const insights = useMemo(() => {
    if (!current) return [];
    return generateProductInsights(current, storeAvgCTR);
  }, [current, storeAvgCTR]);

  const benchRows = useMemo(() => {
    if (!current) return [];
    return [
      { label: "Tayangan → Klik (CTR)", value: current.rate_tayangan_to_klik || 0, benchmarkText: "> 5%", benchmark: bench.ctr },
      { label: "Tayangan → Pembayaran", value: current.rate_tayangan_to_pembayaran || 0, benchmarkText: "> 1%", benchmark: { green: 0.01, yellow: 0.005 } },
      { label: "Klik → Tambah Keranjang", value: current.rate_klik_to_cart || 0, benchmarkText: "> 10%", benchmark: bench.klikToCart },
      { label: "Klik → Pembayaran (CVR)", value: current.rate_klik_to_pembayaran || 0, benchmarkText: "> 15%", benchmark: bench.cvr },
      { label: "Keranjang → Pembayaran", value: current.rate_cart_to_pembayaran || 0, benchmarkText: "> 80%", benchmark: bench.cartToPayment },
    ];
  }, [current, bench]);

  // Funnel
  const funnelSteps = current ? [
    { icon: "👁️", label: "Tayangan", value: current.tayangan || 0, formatted: fN(current.tayangan || 0) },
    { icon: "🔍", label: "Klik Unik", value: current.klik_unik || 0, formatted: fN(current.klik_unik || 0) },
    { icon: "🖱️", label: "Klik", value: current.klik || 0, formatted: fN(current.klik || 0) },
    { icon: "🛒", label: "+Keranjang", value: current.add_to_cart || 0, formatted: fN(current.add_to_cart || 0) },
    { icon: "👤", label: "Pembeli", value: current.pembeli || 0, formatted: fN(current.pembeli || 0) },
  ] : [];

  const funnelArrows = current ? [
    { rate: current.rate_tayangan_to_klik || 0, benchmark: bench.ctr },
    { rate: current.klik > 0 && current.klik_unik > 0 ? 1 : 0, benchmark: { green: 0.5, yellow: 0.3 } },
    { rate: current.rate_klik_to_cart || 0, benchmark: bench.klikToCart },
    { rate: current.rate_cart_to_pembayaran || 0, benchmark: bench.cartToPayment },
  ] : [];

  const kpiCards = current ? [
    { icon: "👁️", label: "Tayangan", value: fN(current.tayangan || 0) },
    { icon: "🖱️", label: "Klik", value: fN(current.klik || 0), sub: `Unik: ${fN(current.klik_unik || 0)}` },
    { icon: "🛒", label: "+Keranjang", value: fN(current.add_to_cart || 0) },
    { icon: "💰", label: "GMV", value: fR(current.gmv || 0), sub: `Konten: ${fR(current.gmv_from_content || 0)}` },
    { icon: "👤", label: "Pembeli", value: fN(current.pembeli || 0), sub: `SKU: ${fN(current.pesanan_sku || 0)}` },
    { icon: "📈", label: "CTR", value: fP(current.rate_tayangan_to_klik || 0) },
  ] : [];

  // Historical chart data (multiple periods)
  const historyChart = useMemo(() => {
    return activeData.map((d) => ({
      period: d.period_start || "",
      gmv: (d.gmv || 0) / 1_000_000,
      tayangan: d.tayangan || 0,
      pembeli: d.pembeli || 0,
    }));
  }, [activeData]);

  const copyId = () => {
    navigator.clipboard.writeText(productId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <button onClick={onBack} className="flex items-center gap-1 text-blue-600 hover:underline">
          <ArrowLeft size={14} /> Kartu Produk
        </button>
        <span className="text-gray-300">/</span>
        <span className="text-gray-500 truncate max-w-[300px]">{productName}</span>
      </div>

      {/* Product header */}
      <div className="bg-white rounded-2xl border p-6">
        <h1 className="text-xl font-bold text-gray-900 mb-1">{productName}</h1>
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <span>ID: {productId}</span>
          <button onClick={copyId} className="text-gray-400 hover:text-gray-600">
            {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
          </button>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700">🟢 Aktif</span>
        </div>
      </div>

      {/* Tab selector */}
      <div className="flex gap-2">
        {["🃏 Kartu Produk", "🏪 Shop Tab"].map((t, i) => (
          <button key={i} onClick={() => setDetailTab(i)}
            className={`text-xs px-4 py-2 rounded-xl font-medium transition ${detailTab === i ? "bg-blue-600 text-white" : "bg-white text-gray-500 border"}`}>
            {t}
          </button>
        ))}
      </div>

      {!current && (
        <div className="text-center py-12 text-gray-400">
          Belum ada data {detailTab === 0 ? "Kartu Produk" : "Shop Tab"} untuk produk ini
        </div>
      )}

      {current && (
        <>
          <KpiCardGrid cards={kpiCards} cols={3} />
          {score && <ProductScoreGauge score={score} />}
          <ConversionBenchmarkTable rows={benchRows} />
          {funnelSteps.length > 0 && <ConversionFunnel steps={funnelSteps} arrows={funnelArrows} />}

          {/* Historical chart */}
          {historyChart.length > 1 && (
            <div className="bg-white rounded-2xl border p-6">
              <h3 className="text-sm font-semibold mb-4">📈 Historis Lintas Periode</h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={historyChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} unit=" Jt" />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="right" type="monotone" dataKey="gmv" name="GMV (Jt)" stroke="#10b981" strokeWidth={2} />
                  <Line yAxisId="left" type="monotone" dataKey="tayangan" name="Tayangan" stroke="#3b82f6" strokeWidth={2} />
                  <Line yAxisId="left" type="monotone" dataKey="pembeli" name="Pembeli" stroke="#f97316" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Historical table */}
          {activeData.length > 0 && (
            <div className="bg-white rounded-2xl border p-6">
              <h3 className="text-sm font-semibold mb-4">📋 Tabel Historis</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="p-2 text-left">Periode</th>
                      <th className="p-2 text-right">Tayangan</th>
                      <th className="p-2 text-right">Klik</th>
                      <th className="p-2 text-right">Pembeli</th>
                      <th className="p-2 text-right">GMV</th>
                      <th className="p-2 text-right">CTR</th>
                      <th className="p-2 text-right">CVR</th>
                      <th className="p-2 text-right">GMV Konten</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeData.map((d, i) => {
                      const maxGmv = Math.max(...activeData.map((x) => x.gmv || 0));
                      return (
                        <tr key={i} className={`border-b ${(d.gmv || 0) === maxGmv ? "bg-green-50" : "hover:bg-gray-50"}`}>
                          <td className="p-2 font-medium">{d.period_start} ~ {d.period_end}</td>
                          <td className="p-2 text-right">{fN(d.tayangan || 0)}</td>
                          <td className="p-2 text-right">{fN(d.klik || 0)}</td>
                          <td className="p-2 text-right">{fN(d.pembeli || 0)}</td>
                          <td className="p-2 text-right font-bold text-green-700">{fR(d.gmv || 0)}</td>
                          <td className="p-2 text-right">{fP(d.rate_tayangan_to_klik || 0)}</td>
                          <td className="p-2 text-right">{fP(d.rate_klik_to_pembayaran || 0)}</td>
                          <td className="p-2 text-right">{fR(d.gmv_from_content || 0)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Insights */}
          <ProductInsightCards insights={insights} />
        </>
      )}
    </div>
  );
}
