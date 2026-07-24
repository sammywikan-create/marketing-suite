export interface ContentItem {
  id: string;
  judul: string;
  platform: string;
  jenis: string;
  status: "Draft" | "In Review" | "Published" | "Scheduled";
  tanggal: string;
  pic: string;
  catatan: string;
}

export interface CampaignItem {
  id: string;
  nama: string;
  platform: string;
  tipe: string;
  status: "Planning" | "Active" | "Completed" | "Paused";
  mulai: string;
  selesai: string;
  budget: number;
  hasil: string;
  pic: string;
}

export interface KOLItem {
  id: string;
  nama: string;
  platform: string;
  followers: string;
  kategori: string;
  status: "Active" | "Pending" | "Completed" | "Rejected";
  biaya: number;
  kontakPIC: string;
  catatan: string;
}

export interface HipotesisItem {
  id: string;
  hipotesis: string;
  kategori: string;
  prioritas: "High" | "Medium" | "Low";
  status: "Backlog" | "Testing" | "Validated" | "Invalidated";
  rpiAction: string;
  hasil: string;
  tanggal: string;
}

export interface KPIItem {
  id: string;
  namaKPI: string;
  kategori: string;
  target: string;
  aktual: string;
  satuan: string;
  periode: string;
  catatan: string;
}

export interface AIDAItem {
  id: string;
  tahap: "Attention" | "Interest" | "Desire" | "Action";
  metrik: string;
  target: number;
  aktual: number;
  satuan: string;
  channel: string;
  periode: string;
}

export interface BudgetROIItem {
  id: string;
  kategori: string;
  deskripsi: string;
  budgetAlokasi: number;
  budgetTerpakai: number;
  revenue: number;
  roi: number;
  periode: string;
  catatan: string;
}

export interface FunnelTMBItem {
  id: string;
  stage: "TOFU" | "MOFU" | "BOFU";
  channel: string;
  metrik: string;
  target: number;
  aktual: number;
  conversionRate: number;
  periode: string;
  catatan: string;
}

export interface TargetBulananItem {
  id: string;
  bulan: string;
  targetRevenue: number;
  aktualRevenue: number;
  budgetBulan: number;
  roi: number;
  leads: number;
  konversi: number;
  catatan: string;
}

export interface BudgetHarianItem {
  id: string;
  tanggal: string;
  platform: string;
  campaign: string;
  budget: number;
  spent: number;
  impressions: number;
  clicks: number;
  konversi: number;
  catatan: string;
}

export interface AnalisisTMBItem {
  id: string;
  periode: string;
  stage: "TOFU" | "MOFU" | "BOFU";
  channel: string;
  impressions: number;
  clicks: number;
  leads: number;
  konversi: number;
  revenue: number;
  cpa: number;
  roas: number;
  catatan: string;
}

export interface PanduanItem {
  id: string;
  judul: string;
  kategori: string;
  isi: string;
  updatedAt: string;
}

export interface SKUItem {
  skuId: string;
  productId: string;
  productName: string;
  status: "Active" | "Inactive";
  gmv: number;
  orders: number;
  sold: number;
  gmvTabToko?: number;
  gmvLive?: number;
  gmvVideo?: number;
  gmvKartuProduk?: number;
  ctrTabToko?: string;
  konversiTabToko?: string;
  ctrLive?: string;
  konversiLive?: string;
  ctrVideo?: string;
  konversiVideo?: string;
  ctrKartu?: string;
  konversiKartu?: string;
  photoUrl?: string;
}

export type TabKey =
  | "home"
  | "dashboard"
  | "panduan"
  | "content-tracker"
  | "campaign-log"
  | "kol-tracker"
  | "hipotesis-plan"
  | "referensi-kpi"
  | "aida-funnel"
  | "budget-roi"
  | "tofu-mofu-bofu"
  | "target-roi-bulanan"
  | "budgeting-harian"
  | "analisis-tmb"
  | "gmv-upload"
  | "gmv-dashboard"
  | "gmv-sku"
  | "gmv-creative"
  | "gmv-benchmark"
  | "gmv-checklist"
  | "gmv-optimasi"
  | "gmv-kalkulator"
  | "gmv-overview"
  | "video-performance"
  | "store-compare"
  | "store-settings"
  | "compare-gabungan"
  | "okr"
  | "affiliate"
  | "report-builder"
  | "live-analytics"
  | "gmax-overview"
  | "product-cards"
  | "laporan-harian"
  | "sku-tracking"
  | "gmax-evaluasi"
  | "staff-tracker"
  | "revenue-breakdown"
  | "funnel-analyzer"
  | "live-scorecard"
  | "affiliate-tracker"
  | "omset-doctor"
  | "product-traffic";

// ═══════════════════════════════════════════════════════════
// PRODUCT TRAFFIC ANALYZER (Analisis Trafik Produk)
// Field snake_case = 1:1 dengan kolom tabel Supabase (pola LiveCoreStat)
// ═══════════════════════════════════════════════════════════

/** Jenis konten pada export Product Traffic TikTok Shop */
export type ProductTrafficContentType =
  | "all"
  | "live_penjual"
  | "video_penjual"
  | "kartu_produk"
  | "afiliasi";

/** Baris harian per produk per jenis konten (tabel product_traffic_daily) */
export interface ProductTrafficDaily {
  store_id: string;
  product_id: string;
  product_name: string;
  date: string; // ISO YYYY-MM-DD
  content_type: ProductTrafficContentType;
  gmv: number;
  orders: number;
  sku_orders: number;
  products_sold: number;
  buyers: number;
  aov: number;
  impressions: number;
  clicks: number;
  ctr: number; // persen
  atc: number;
  atc_rate: number; // persen
  ctor: number; // persen
  impressions_unique: number;
  clicks_unique: number;
  ctr_unique: number; // persen
}

/** Master produk dari export product_list (tabel product_catalog) */
export interface ProductCatalogEntry {
  store_id: string;
  product_id: string;
  name: string;
  status: string;
  gmv_range: string;
  period_start: string; // ISO
  period_end: string; // ISO
  gmv: number;
  channel_gmv: Record<string, number>; // breakdown GMV per channel (jsonb)
  orders: number;
  sku_orders: number;
  products_sold: number;
  buyers: number;
  aov: number;
  impressions: number;
  clicks: number;
  ctr: number;
  atc: number;
  atc_rate: number;
  ctor: number;
}

/** Statistik harian channel VIDEO dari Video Performance Core Stats (tabel video_core_stats) */
export interface VideoCoreStatDaily {
  store_id: string;
  date: string; // ISO
  gmv_from_video: number; // total teratribusi (direct + indirect)
  gmv_video: number; // direct
  gmv_indirect: number;
  vv: number;
  gpm: number;
  sku_orders_attr: number;
  sku_orders_video: number;
  sku_orders_indirect: number;
  avg_daily_buyers: number;
  product_viewers: number;
  product_impressions: number;
  product_clicks: number;
  ctr_video: number; // persen
  ctor_video: number; // persen
}

export interface ChannelDropAlert {
  channel: string;
  date: string;
  dropPct: number;
  currentValue: number;
  avg7Days: number;
  severity: "critical" | "warning";
}

export interface FunnelComparisonStage {
  stage: string;
  highPeriodValue: number;
  lowPeriodValue: number;
  dropPct: number;
  conversionRateHigh: number;
  conversionRateLow: number;
}

export interface OmsetDiagnosisItem {
  id: string;
  category: "TRAFFIC" | "CTR" | "CTOR" | "GPM_LIVE" | "AFFILIATE";
  severity: "CRITICAL" | "WARNING" | "HEALTHY";
  title: string;
  diagnosis: string;
  rootCause: string;
  recommendation: string;
  impactScore: number;
}

export interface TabConfig {
  key: TabKey;
  label: string;
  icon: string;
}

// --- Business Overview Types ---
export interface BusinessOverviewSummary {
  gmv: number;
  refund: number;
  grossRevenueWithSubsidy: number;
  productsSold: number;
  uniqueBuyers: number;
  pageViews: number;
  shopVisits: number;
  skuOrders: number;
  orders: number;
  conversionRate: number;
}

export interface DailyBusinessData extends BusinessOverviewSummary {
  date: string;
}

export interface BusinessOverviewData {
  summary: BusinessOverviewSummary;
  daily: DailyBusinessData[];
  period: {
    start: string;
    end: string;
    month: string;
  };
}

export interface WeeklyData {
  week: number;
  label: string;
  totalGMV: number;
  totalOrders: number;
  avgConversion: number;
  avgPageViews: number;
  growthGMV: number | null;
}

export interface BusinessInsight {
  type: string;
  label: string;
  value: string;
  trend?: "up" | "down" | "neutral";
  color: string;
  icon: string;
}

// --- Multi-Month Analytics Types ---
export interface MonthComparison {
  metrik: string;
  values: { month: string; value: number; formatted: string }[];
  trendPct: number | null;
  trendDir: "up" | "down" | "same";
  invertTrend?: boolean;
}

export interface QuarterData {
  quarter: string;
  label: string;
  year: number;
  totalGMV: number;
  totalOrders: number;
  avgConversion: number;
  totalBuyers: number;
  bestMonth: string;
  bestMonthGMV: number;
  growthVsPrev: number | null;
  months: BusinessOverviewData[];
}

export interface DayOfWeekStats {
  day: string;
  dayIndex: number;
  avgGMV: number;
  avgOrders: number;
  totalDays: number;
}

export interface AnomalyData {
  date: string;
  gmv: number;
  status: "spike" | "drop" | "normal";
  deviation: number;
  possibleCause: string;
  month: string;
}

export interface ForecastResult {
  slope: number;
  intercept: number;
  nextMonthEstimate: number;
  confidence: number;
  nextMonthLabel: string;
  dataPoints: { month: string; gmv: number; index: number }[];
  trendLine: { index: number; value: number }[];
}

export interface FunnelStep {
  label: string;
  value: number;
  dropRate: number | null;
  color: string;
}

// --- Video Performance Types ---
export interface VideoPerformanceItem {
  creatorName: string;
  creatorId: string;
  videoInfo: string;
  videoId: string;
  postedAt: string;
  products: string[];
  vv: number;
  likes: number;
  comments: number;
  shares: number;
  newFollowers: number;
  clickToLive: number;
  productViews: number;
  productClicks: number;
  uniqueBuyers: number;
  videoOrders: number;
  productsSold: number;
  grossRevenue: number;
  gpm: number;
  gmv: number;
  ctr: number;
  liveRate: number;
  watchRate: number;
  ctor: number;
  diagnosis: string;
  videoScore: number;
  videoStatus: '🏆 TOP PERFORMER' | '✅ POTENSIAL' | '⚠️ PERLU PERBAIKAN' | '🔴 UNDERPERFORM' | '⬜ NO SALES';
  boostCandidate: boolean;
}

export interface VideoSummary {
  totalVideos: number;
  totalVV: number;
  totalGMV: number;
  totalOrders: number;
  totalProductViews: number;
  totalProductClicks: number;
  totalUniqueBuyers: number;
  avgGPM: number;
  avgCTR: number;
  avgCTOR: number;
  avgWatchRate: number;
  topCreator: string;
  totalCreators: number;
}

export interface VideoPerformanceData {
  period: string;
  periodRaw: string;
  videos: VideoPerformanceItem[];
  summary: VideoSummary;
}

// --- OKR Types ---
export type OKRDepartment = 'konseptor' | 'smo' | 'advertiser' | 'affiliate' | 'custom';

export type KRMetricSource =
  | 'gmv.total'
  | 'gmv.orders'
  | 'gmv.conversion'
  | 'gmv.pageViews'
  | 'gmv.shopVisits'
  | 'video.totalGMV'
  | 'video.avgGPM'
  | 'video.avgCTR'
  | 'video.avgCTOR'
  | 'video.totalVV'
  | 'video.totalVideos'
  | 'konseptor.kontenFresh'
  | 'konseptor.kontenFootage'
  | 'konseptor.kontenAI'
  | 'konseptor.bankContent'
  | 'smo.sesiLive'
  | 'smo.uploadHarian'
  | 'smo.liveImpression'
  | 'advertiser.gmvVideo'
  | 'advertiser.gmvLive'
  | 'advertiser.gmvKartuProduk'
  | 'advertiser.totalGMV'
  | 'affiliate.gmvAffiliate'
  | 'affiliate.kreatorAktif'
  | 'affiliate.videoJualanKreator'
  | 'affiliate.endorseDokter'
  | 'affiliate.endorseMacro'
  | 'affiliate.endorseMicro'
  | 'affiliate.endorseAgency'
  | 'manual';

export interface Objective {
  id: string;
  title: string;
  description: string;
  department: OKRDepartment;
  keyResults: KeyResult[];
  status: 'active' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface KeyResult {
  id: string;
  title: string;
  metricSource: KRMetricSource;
  targetValue: number;
  currentValue: number;
  unit: string;
  weight: number;
}

export interface OKRTableRow {
  parameter: OKRDepartment;
  metric: string;
  metricKey: KRMetricSource;
  satuan: string;
  targetBulanLalu: number | null;
  achieveBulanLalu: number | null;
  targetBulanIni: number;
  achieveBulanIni: number | null;
  notes: string;
}

export interface MonthlyOKRReport {
  id: string;
  storeId: string;
  bulanLalu: string;
  bulanIni: string;
  rows: OKRTableRow[];
  createdAt: string;
  lastUpdated: string;
}

// --- Affiliate Types ---
export interface AffiliateCoreSummary {
  gmvFromCreator: number;
  productsSoldViaAffiliate: number;
  refundAmount: number;
  productsRefunded: number;
  avgDailyBuyers: number;
  aov: number;
  videoCount: number;
  liveStreamCount: number;
  avgDailyCreatorsWithSales: number;
  avgDailyCreatorsPosting: number;
  avgDailyProductsSold: number;
  avgDailyProductsInCollab: number;
  samplesSent: number;
  avgDailyLiveWithSales: number;
  avgDailyVideoWithSales: number;
  estimatedCommission: number;
}

export interface AffiliateCoreStats {
  affiliateGMV: number;
  affiliateLiveGMV: number;
  affiliateShoppableVideoGMV: number;
  affiliateProductCardGMV: number;
  itemsSold: number;
  estCommission: number;
  estFlatFee: number;
  affiliateCollaborations: number;
  affiliateLiveStreams: number;
  affiliateShoppableVideos: number;
  affiliateRefundedGMV: number;
  affiliateItemsRefunded: number;
}

export interface AffiliateCreatorItem {
  creatorUsername: string;
  affiliateGMV: number;
  affiliateLiveGMV: number;
  affiliateShoppableVideoGMV: number;
  affiliateProductCardGMV: number;
  affiliateProductsSold: number;
  itemsSold: number;
  estCommission: number;
  estFlatFee: number;
  avgOrderValue: number;
  affiliateProductShowcase: number;
  affiliateOrders: number;
  ctr: number;
  productImpressions: number;
  avgAffiliateCustomers: number;
  affiliateLiveStreams: number;
  affiliateShoppableVideos: number;
  targetCollabGMV: number;
  targetCollabEstCommission: number;
  openCollabGMV: number;
  openCollabEstCommission: number;
  affiliateRefundedGMV: number;
  affiliateItemsRefunded: number;
  affiliateFollowers: number;
  creatorTier: 'Nano' | 'Micro' | 'Mid' | 'Macro' | 'Mega' | 'Unknown';
  refundRate: number;
  commissionRate: number;
  gmvPerVideo: number;
  creatorScore: number;
  creatorStatus: '🏆 TOP' | '✅ AKTIF' | '⚠️ PERLU DORONG' | '😴 TIDAK AKTIF';
  sampelTerkirim?: number;
}

export interface AffiliateMonthSummary {
  totalCreators: number;
  activeCreators: number;
  inactiveCreators: number;
  activeRate: number;
  // Creator activity breakdown
  activePromoters: number;      // kreator yang membuat video ATAU live
  videoCreators: number;        // kreator yang membuat shoppable video
  liveCreators: number;         // kreator yang melakukan siaran LIVE
  bothVideoAndLive: number;     // kreator yang melakukan keduanya (video DAN live)
  totalGMV: number;
  totalOrders: number;
  totalVideos: number;
  totalLive: number;
  totalCommission: number;
  totalRefundedGMV: number;
  refundRate: number;
  avgAOV: number;
  avgGMVPerCreator: number;
  topCreator: string;
  topCreatorGMV: number;
  nanoCount: number;
  microCount: number;
  midCount: number;
  macroCount: number;
  megaCount: number;
  videoGMV: number;
  liveGMV: number;
  productCardGMV: number;
}

export interface AffiliateMonthData {
  period: string;
  periodRaw: string;
  storeId: string;
  source: 'transaction' | 'analitik' | 'combined';
  platform?: 'tiktok' | 'tokopedia';
  coreSummary?: AffiliateCoreSummary;
  coreStats?: AffiliateCoreStats;
  creators: AffiliateCreatorItem[];
  summary: AffiliateMonthSummary;
}

// --- Affiliate Target Types ---
export interface AffiliateTarget {
  id: string;
  period: string;          // "2025-01" or "all" for global
  targetGMV: number;
  targetVideos: number;
  targetLive: number;
  targetOrders: number;
  targetActiveCreators: number;
  targetCommission: number;
  notes: string;
}

// --- Combined Store Types ---
export interface CombinedStoreData {
  period: string;
  stores: { id: string; name: string; color: string }[];
  combinedGMV: number;
  combinedOrders: number;
  combinedUniqueBuyers: number;
  combinedPageViews: number;
  combinedShopVisits: number;
  combinedRefund: number;
  combinedConversionRate: number;
  combinedVideoGMV: number;
  combinedVideoOrders: number;
  combinedTotalVV: number;
  combinedProductViews: number;
  combinedProductClicks: number;
  combinedAvgGPM: number;
  combinedAvgCTR: number;
  combinedAvgCTOR: number;
  combinedAvgWatchRate: number;
  combinedTotalVideos: number;
}

// --- Multi-Store Types ---
export interface Store {
  id: string;
  name: string;
  color: string;
  avatar: string;
  createdAt: string;
  gmvData: Record<string, any>;
  overviewData: BusinessOverviewData[];
  videoData: VideoPerformanceData[];
  affiliateData: AffiliateMonthData[];
  affiliateTargets?: AffiliateTarget[];
}

export interface MultiStoreState {
  stores: Store[];
  activeStoreId: string | null;
}

// --- Report Builder Types ---
export type ReportSection =
  | 'overview'
  | 'gmvmax'
  | 'sku'
  | 'creative'
  | 'video'
  | 'affiliate'
  | 'okr'
  | 'compare';

export type ReportFormat = 'pdf' | 'excel';
export type ReportPeriod = 'current' | 'last3months' | 'custom';

export type ReportTemplate =
  | 'executive'
  | 'operational'
  | 'okr-review'
  | 'affiliate'
  | 'custom';

export interface ReportConfig {
  id: string;
  name: string;
  description: string;
  sections: ReportSection[];
  format: ReportFormat;
  period: ReportPeriod;
  customPeriodStart?: string;
  customPeriodEnd?: string;
  includeCharts: boolean;
  includeAIInsight: boolean;
  language: 'id' | 'en';
  storeIds: string[];
  template: ReportTemplate;
  createdAt: string;
  lastGenerated?: string;
}

// --- GMAX Evaluasi Types ---
export interface SKUGmaxItem {
  no: number;
  namaProduk: string;
  skuId: string;
  klasifikasiStatus: "SUPER HERO SKU" | "HERO SKU" | "GROWING STAR" | "STAR SKU" | "";
  gmv: number;
  produkTerjual: number;
  pesanan: number;
  gmvPerHari: number;
  terjualPerHari: number;
  pesananPerHari: number;
}

export interface CampaignEtalaseItem {
  no: number;
  namaCampaign: string;
  etalase: string;
  skuId: string;
  namaProduk: string;
}

export interface CampaignOverviewItem {
  namaCampaign: string;
  setAnggaran: number;
  setROI: number;
  totalAnggaran: number;
  totalGmv: number;
  roi: number;
  cac: number;
  absorbAnggaran: string;
  achieveROI: string;
  anggaran7Hari: number;
  gmv7Hari: number;
  anggaran3Hari: number;
  gmv3Hari: number;
}

export interface FunnelKontenItem {
  jenisKonten: string;
  funnel: "UPPER" | "MIDDLE" | "LOWER";
  subKonten: string;
}

export interface KonseptorItem {
  no: number;
  jenis: string;
  contentPillar: string;
  konseptor1: string;
  jumlah1: number;
  konseptor2: string;
  jumlah2: number;
}

export interface ViewFunnelStage {
  label: string;
  jumlah: number;
  penurunan: number;
}

export interface PenilaianPenempatan {
  jangkauan: number;
  cpm: number;
  impresi: number;
  frekuensi: number;
  statusCpm: "✅" | "❌";
  statusFrekuensi: "✅" | "❌";
}

export interface EvalVideoItem {
  namaIklan: string;
  status: string;
  biaya: number;
  impresi: number;
  cpm: number;
  jangkauan: number;
  frekuensi: number;
  viewFunnel: ViewFunnelStage[];
  ctr: string;
  penilaianPenempatan: PenilaianPenempatan;
  sheetType: "UPPER" | "LOWER";
}

export interface GmaxEvaluasiData {
  skuList: SKUGmaxItem[];
  campaignEtalase: CampaignEtalaseItem[];
  campaignOverview: CampaignOverviewItem[];
  funnelKonten: FunnelKontenItem[];
  konseptorPembagian: KonseptorItem[];
  evalUpper: EvalVideoItem[];
  evalLower: EvalVideoItem[];
  periode: string;
  namaFile: string;
}

export interface SavedReport {
  id: string;
  config: ReportConfig;
  generatedAt: string;
  fileSize: string;
  downloadUrl?: string;
}
