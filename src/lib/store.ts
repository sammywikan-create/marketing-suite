import {
  ContentItem, CampaignItem, KOLItem, HipotesisItem, KPIItem,
  AIDAItem, BudgetROIItem, FunnelTMBItem, TargetBulananItem,
  BudgetHarianItem, AnalisisTMBItem, PanduanItem
} from "./types";

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

const STORAGE_PREFIX = "ms_";

function load<T>(key: string, fallback: T[]): T[] {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

function save<T>(key: string, data: T[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(data));
}

// --- Seed Data ---
const seedContent: ContentItem[] = [
  { id: genId(), judul: "Instagram Reels - Promo Ramadan", platform: "Instagram", jenis: "Reels", status: "Published", tanggal: "2026-03-15", pic: "Rina", catatan: "Engagement rate 4.2%" },
  { id: genId(), judul: "TikTok Product Review Skincare", platform: "TikTok", jenis: "Video", status: "In Review", tanggal: "2026-03-20", pic: "Budi", catatan: "Menunggu approval brand" },
  { id: genId(), judul: "Blog: Tips Marketing Digital 2026", platform: "Website", jenis: "Artikel", status: "Draft", tanggal: "2026-04-01", pic: "Sari", catatan: "Perlu riset keyword" },
  { id: genId(), judul: "Facebook Ads - Flash Sale", platform: "Facebook", jenis: "Ads Copy", status: "Scheduled", tanggal: "2026-04-05", pic: "Dani", catatan: "Jadwal jam 19:00" },
  { id: genId(), judul: "YouTube Tutorial Produk Baru", platform: "YouTube", jenis: "Video", status: "Draft", tanggal: "2026-04-10", pic: "Rina", catatan: "Script sudah selesai" },
];

const seedCampaign: CampaignItem[] = [
  { id: genId(), nama: "Ramadan Sale 2026", platform: "Multi-channel", tipe: "Seasonal", status: "Active", mulai: "2026-03-01", selesai: "2026-04-01", budget: 50000000, hasil: "Revenue naik 25%", pic: "Tim A" },
  { id: genId(), nama: "Product Launch Skincare", platform: "TikTok", tipe: "Product Launch", status: "Planning", mulai: "2026-04-15", selesai: "2026-05-15", budget: 30000000, hasil: "-", pic: "Tim B" },
  { id: genId(), nama: "Brand Awareness Q2", platform: "Instagram", tipe: "Awareness", status: "Planning", mulai: "2026-04-01", selesai: "2026-06-30", budget: 20000000, hasil: "-", pic: "Tim A" },
  { id: genId(), nama: "Loyalty Program", platform: "Email", tipe: "Retention", status: "Completed", mulai: "2026-01-01", selesai: "2026-03-31", budget: 10000000, hasil: "Retention +15%", pic: "Tim C" },
];

const seedKOL: KOLItem[] = [
  { id: genId(), nama: "Sarah Beauty", platform: "TikTok", followers: "500K", kategori: "Beauty", status: "Active", biaya: 5000000, kontakPIC: "Rina", catatan: "Kontrak 3 bulan" },
  { id: genId(), nama: "FoodieJakarta", platform: "Instagram", followers: "1.2M", kategori: "Food", status: "Pending", biaya: 8000000, kontakPIC: "Budi", catatan: "Negosiasi harga" },
  { id: genId(), nama: "TechReviewID", platform: "YouTube", followers: "800K", kategori: "Tech", status: "Completed", biaya: 12000000, kontakPIC: "Sari", catatan: "Campaign selesai" },
  { id: genId(), nama: "LifestyleNia", platform: "TikTok", followers: "300K", kategori: "Lifestyle", status: "Active", biaya: 3500000, kontakPIC: "Dani", catatan: "Performa bagus" },
];

const seedHipotesis: HipotesisItem[] = [
  { id: genId(), hipotesis: "Video pendek < 30 detik lebih efektif di TikTok", kategori: "Content", prioritas: "High", status: "Testing", rpiAction: "A/B test video 15s vs 60s", hasil: "CTR 15s: 3.5%, 60s: 1.8%", tanggal: "2026-03-01" },
  { id: genId(), hipotesis: "Email jam 8 pagi punya open rate tertinggi", kategori: "Email", prioritas: "Medium", status: "Validated", rpiAction: "Kirim email jam 8, 12, 18", hasil: "Jam 8: 32%, Jam 12: 24%", tanggal: "2026-02-15" },
  { id: genId(), hipotesis: "Bundling produk meningkatkan AOV 20%", kategori: "Promo", prioritas: "High", status: "Backlog", rpiAction: "Buat paket bundling 3 produk", hasil: "-", tanggal: "2026-04-01" },
];

const seedKPI: KPIItem[] = [
  { id: genId(), namaKPI: "Monthly Revenue", kategori: "Revenue", target: "500.000.000", aktual: "420.000.000", satuan: "Rupiah", periode: "April 2026", catatan: "84% tercapai" },
  { id: genId(), namaKPI: "New Leads", kategori: "Acquisition", target: "1.000", aktual: "850", satuan: "Leads", periode: "April 2026", catatan: "Perlu push ads" },
  { id: genId(), namaKPI: "Engagement Rate", kategori: "Social Media", target: "4.5%", aktual: "3.8%", satuan: "Persen", periode: "April 2026", catatan: "Coba format baru" },
  { id: genId(), namaKPI: "Customer Retention", kategori: "Retention", target: "80%", aktual: "75%", satuan: "Persen", periode: "April 2026", catatan: "Program loyalti" },
  { id: genId(), namaKPI: "ROAS", kategori: "Advertising", target: "3.0", aktual: "2.7", satuan: "Rasio", periode: "April 2026", catatan: "Optimasi targeting" },
];

const seedAIDA: AIDAItem[] = [
  { id: genId(), tahap: "Attention", metrik: "Impressions", target: 1000000, aktual: 820000, satuan: "Views", channel: "TikTok Ads", periode: "April 2026" },
  { id: genId(), tahap: "Attention", metrik: "Reach", target: 500000, aktual: 450000, satuan: "Users", channel: "Instagram", periode: "April 2026" },
  { id: genId(), tahap: "Interest", metrik: "Click-through Rate", target: 3.5, aktual: 2.8, satuan: "%", channel: "Multi-channel", periode: "April 2026" },
  { id: genId(), tahap: "Interest", metrik: "Page Views", target: 50000, aktual: 42000, satuan: "Views", channel: "Website", periode: "April 2026" },
  { id: genId(), tahap: "Desire", metrik: "Add to Cart", target: 5000, aktual: 4200, satuan: "Actions", channel: "E-commerce", periode: "April 2026" },
  { id: genId(), tahap: "Action", metrik: "Purchases", target: 2000, aktual: 1650, satuan: "Orders", channel: "All", periode: "April 2026" },
];

const seedBudgetROI: BudgetROIItem[] = [
  { id: genId(), kategori: "Social Media Ads", deskripsi: "TikTok + Instagram Ads", budgetAlokasi: 25000000, budgetTerpakai: 22000000, revenue: 75000000, roi: 241, periode: "Q1 2026", catatan: "Perform baik" },
  { id: genId(), kategori: "KOL Marketing", deskripsi: "KOL Beauty & Lifestyle", budgetAlokasi: 20000000, budgetTerpakai: 18500000, revenue: 55000000, roi: 197, periode: "Q1 2026", catatan: "ROI di atas target" },
  { id: genId(), kategori: "Content Production", deskripsi: "Video, foto, copywriting", budgetAlokasi: 10000000, budgetTerpakai: 9000000, revenue: 0, roi: 0, periode: "Q1 2026", catatan: "Support indirect" },
  { id: genId(), kategori: "Email Marketing", deskripsi: "Email tools & campaigns", budgetAlokasi: 5000000, budgetTerpakai: 4500000, revenue: 20000000, roi: 344, periode: "Q1 2026", catatan: "Sangat efisien" },
];

const seedFunnelTMB: FunnelTMBItem[] = [
  { id: genId(), stage: "TOFU", channel: "TikTok Ads", metrik: "Impressions", target: 500000, aktual: 420000, conversionRate: 2.5, periode: "April 2026", catatan: "Scale up budget" },
  { id: genId(), stage: "TOFU", channel: "Instagram Reels", metrik: "Reach", target: 300000, aktual: 280000, conversionRate: 3.1, periode: "April 2026", catatan: "Organik bagus" },
  { id: genId(), stage: "MOFU", channel: "Website Blog", metrik: "Page Views", target: 50000, aktual: 38000, conversionRate: 8.2, periode: "April 2026", catatan: "SEO perlu push" },
  { id: genId(), stage: "MOFU", channel: "Email Nurture", metrik: "Open Rate", target: 30, aktual: 28, conversionRate: 12.5, periode: "April 2026", catatan: "Segmentasi baik" },
  { id: genId(), stage: "BOFU", channel: "Retargeting Ads", metrik: "Conversions", target: 2000, aktual: 1650, conversionRate: 18.3, periode: "April 2026", catatan: "CPA turun 15%" },
];

const seedTargetBulanan: TargetBulananItem[] = [
  { id: genId(), bulan: "Januari 2026", targetRevenue: 400000000, aktualRevenue: 380000000, budgetBulan: 40000000, roi: 850, leads: 900, konversi: 180, catatan: "Awal tahun solid" },
  { id: genId(), bulan: "Februari 2026", targetRevenue: 420000000, aktualRevenue: 410000000, budgetBulan: 42000000, roi: 876, leads: 950, konversi: 195, catatan: "Valentines push" },
  { id: genId(), bulan: "Maret 2026", targetRevenue: 500000000, aktualRevenue: 520000000, budgetBulan: 50000000, roi: 940, leads: 1200, konversi: 260, catatan: "Ramadan effect" },
  { id: genId(), bulan: "April 2026", targetRevenue: 450000000, aktualRevenue: 0, budgetBulan: 45000000, roi: 0, leads: 0, konversi: 0, catatan: "In progress" },
];

const seedBudgetHarian: BudgetHarianItem[] = [
  { id: genId(), tanggal: "2026-04-01", platform: "TikTok", campaign: "Spring Sale", budget: 1500000, spent: 1480000, impressions: 120000, clicks: 3600, konversi: 85, catatan: "CPM bagus" },
  { id: genId(), tanggal: "2026-04-01", platform: "Instagram", campaign: "Brand Awareness", budget: 1000000, spent: 950000, impressions: 80000, clicks: 2400, konversi: 45, catatan: "Reach luas" },
  { id: genId(), tanggal: "2026-04-02", platform: "TikTok", campaign: "Spring Sale", budget: 1500000, spent: 1520000, impressions: 135000, clicks: 4050, konversi: 95, catatan: "Over budget sedikit" },
  { id: genId(), tanggal: "2026-04-02", platform: "Facebook", campaign: "Retargeting", budget: 800000, spent: 780000, impressions: 45000, clicks: 1800, konversi: 72, catatan: "Konversi tinggi" },
  { id: genId(), tanggal: "2026-04-03", platform: "Google", campaign: "Search Ads", budget: 2000000, spent: 1850000, impressions: 60000, clicks: 5400, konversi: 162, catatan: "CPC turun" },
];

const seedAnalisisTMB: AnalisisTMBItem[] = [
  { id: genId(), periode: "Q1 2026", stage: "TOFU", channel: "TikTok Ads", impressions: 1500000, clicks: 45000, leads: 4500, konversi: 450, revenue: 180000000, cpa: 55556, roas: 4.0, catatan: "Channel utama" },
  { id: genId(), periode: "Q1 2026", stage: "TOFU", channel: "Instagram", impressions: 900000, clicks: 27000, leads: 2700, konversi: 270, revenue: 108000000, cpa: 66667, roas: 3.2, catatan: "Perlu optimasi" },
  { id: genId(), periode: "Q1 2026", stage: "MOFU", channel: "Email", impressions: 100000, clicks: 32000, leads: 8000, konversi: 1600, revenue: 64000000, cpa: 3125, roas: 12.8, catatan: "Sangat efisien" },
  { id: genId(), periode: "Q1 2026", stage: "BOFU", channel: "Retargeting", impressions: 200000, clicks: 36000, leads: 3600, konversi: 1800, revenue: 72000000, cpa: 11111, roas: 7.2, catatan: "Konversi kuat" },
];

const seedPanduan: PanduanItem[] = [
  { id: genId(), judul: "SOP Pembuatan Konten", kategori: "Content", isi: "1. Brief dari tim marketing\\n2. Riset keyword & trend\\n3. Buat draft konten\\n4. Review oleh lead\\n5. Revisi jika perlu\\n6. Approval final\\n7. Publish sesuai jadwal\\n8. Monitor performa 7 hari", updatedAt: "2026-03-01" },
  { id: genId(), judul: "SOP Campaign Launch", kategori: "Campaign", isi: "1. Define objective & KPI\\n2. Budget allocation\\n3. Audience targeting\\n4. Creative brief\\n5. A/B testing setup\\n6. Launch campaign\\n7. Daily monitoring\\n8. Weekly report\\n9. Post-campaign analysis", updatedAt: "2026-03-15" },
  { id: genId(), judul: "Panduan KOL Management", kategori: "KOL", isi: "1. Identifikasi KOL potensial\\n2. Cek engagement rate & audience\\n3. Negosiasi & kontrak\\n4. Brief konten\\n5. Review draft KOL\\n6. Approve & publish\\n7. Track performa\\n8. Evaluasi & feedback", updatedAt: "2026-02-20" },
  { id: genId(), judul: "Framework AIDA", kategori: "Strategy", isi: "Attention: Tarik perhatian lewat hook kuat\\nInterest: Bangun ketertarikan dengan value proposition\\nDesire: Ciptakan keinginan dengan social proof & benefit\\nAction: Dorong aksi dengan CTA yang jelas & urgency", updatedAt: "2026-01-10" },
];

// --- Store Functions ---
export function getItems<T>(key: string, seed: T[]): T[] { return load<T>(key, seed); }
export function setItems<T>(key: string, items: T[]) { save(key, items); }
export function addItem<T extends { id: string }>(key: string, items: T[], item: Omit<T, "id">): T[] {
  const newItem = { ...item, id: genId() } as T;
  const updated = [...items, newItem];
  save(key, updated);
  return updated;
}
export function updateItem<T extends { id: string }>(key: string, items: T[], item: T): T[] {
  const updated = items.map(i => i.id === item.id ? item : i);
  save(key, updated);
  return updated;
}
export function deleteItem<T extends { id: string }>(key: string, items: T[], id: string): T[] {
  const updated = items.filter(i => i.id !== id);
  save(key, updated);
  return updated;
}

export const SEEDS = {
  content: seedContent,
  campaign: seedCampaign,
  kol: seedKOL,
  hipotesis: seedHipotesis,
  kpi: seedKPI,
  aida: seedAIDA,
  budgetRoi: seedBudgetROI,
  funnelTmb: seedFunnelTMB,
  targetBulanan: seedTargetBulanan,
  budgetHarian: seedBudgetHarian,
  analisisTmb: seedAnalisisTMB,
  panduan: seedPanduan,
};

export { genId };
