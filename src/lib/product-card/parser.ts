import * as XLSX from 'xlsx';

// Helper: "15.76%" → 0.1576
export function parsePercent(val: unknown): number {
  if (!val || val === '-') return 0;
  return parseFloat(String(val).replace('%', '').replace(',', '.').trim()) / 100;
}

// Helper: extract date range from first row of Excel
function extractDateRange(rows: unknown[][]): { start: string; end: string } {
  const raw = String(rows[0]?.[0] || '');
  const cleaned = raw.replace(/\[Rentang Tanggal\]:|Date Range:/gi, '').trim();
  const [start, end] = cleaned.split('~').map(s => s.trim());
  return { start: start || '', end: end || '' };
}

// Auto-detect file type from headers & filename
export type ExcelFileType =
  | 'PRODUCT_CARD_LIST'
  | 'PRODUCT_CARD_TRAFFIC'
  | 'SHOP_TAB_CORE'
  | 'SHOP_TAB_SEARCH'
  | 'SHOP_TAB_PRODUCT'
  | 'UNKNOWN';

export function detectFileType(workbook: XLSX.WorkBook, filename: string): ExcelFileType {
  const ws = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null });
  const h = (rows[2] || []) as string[];
  const name = filename.toLowerCase();

  if (h[0] === 'ID Produk' && String(h[16] || '').includes('konten')) {
    return 'PRODUCT_CARD_LIST';
  }
  if (h[0] === 'ID Produk' && String(h[2] || '').includes('Impresi')) {
    return 'SHOP_TAB_PRODUCT';
  }
  if (h[0] === 'Waktu') {
    if (name.includes('channel-stats-search') || name.includes('channel-stats')) return 'SHOP_TAB_SEARCH';
    if (name.includes('core-stats')) return 'SHOP_TAB_CORE';
    if (name.includes('traffic-stats')) return 'PRODUCT_CARD_TRAFFIC';
    if (String(h[15] || '').toLowerCase().includes('konten')) return 'PRODUCT_CARD_TRAFFIC';
    return 'SHOP_TAB_CORE';
  }
  return 'UNKNOWN';
}

export const FILE_TYPE_LABELS: Record<ExcelFileType, string> = {
  PRODUCT_CARD_LIST: '🃏 Kartu Produk Per Produk',
  PRODUCT_CARD_TRAFFIC: '🃏 Traffic Harian Kartu Produk',
  SHOP_TAB_CORE: '🏪 Shop Tab Core Stats',
  SHOP_TAB_SEARCH: '🔍 Shop Tab Channel Search',
  SHOP_TAB_PRODUCT: '🏪 Shop Tab Per Produk',
  UNKNOWN: '❓ Tidak Dikenali',
};

// PARSER 1: Products-Card-List.xlsx
export function parseProductCardList(workbook: XLSX.WorkBook) {
  const ws = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null });
  const { start: period_start, end: period_end } = extractDateRange(rows);

  const data = [];
  for (let i = 3; i < rows.length; i++) {
    const r = rows[i] as unknown[];
    if (!r[0] || !r[1]) continue;
    data.push({
      product_id: String(r[0]),
      product_name: String(r[1]),
      channel_source: 'product_card',
      period_start, period_end,
      period_type: 'monthly',
      penonton: Number(r[2]) || 0,
      tayangan: Number(r[3]) || 0,
      klik_unik: Number(r[4]) || 0,
      klik: Number(r[5]) || 0,
      pesanan_sku: Number(r[6]) || 0,
      pembeli: Number(r[7]) || 0,
      add_to_cart: Number(r[8]) || 0,
      klik_to_cart: Number(r[9]) || 0,
      gmv: Number(r[10]) || 0,
      rate_tayangan_to_pembayaran: parsePercent(r[11]),
      rate_tayangan_to_klik: parsePercent(r[12]),
      rate_klik_to_cart: parsePercent(r[13]),
      rate_klik_to_pembayaran: parsePercent(r[14]),
      rate_cart_to_pembayaran: parsePercent(r[15]),
      gmv_from_content: Number(r[16]) || 0,
    });
  }
  return { fileType: 'PRODUCT_CARD_LIST' as ExcelFileType, period_start, period_end, data };
}

// PARSER 2: Product-Card-Traffic-Stats.xlsx
export function parseProductCardTraffic(workbook: XLSX.WorkBook) {
  const ws = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null });

  const data = [];
  for (let i = 3; i < rows.length; i++) {
    const r = rows[i] as unknown[];
    if (!r[0]) continue;
    data.push({
      date: String(r[0]),
      channel_source: 'product_card',
      tayangan: Number(r[1]) || 0,
      klik: Number(r[2]) || 0,
      pembeli: Number(r[3]) || 0,
      pesanan_sku: Number(r[4]) || 0,
      gmv: Number(r[5]) || 0,
      rate_cart_to_pembayaran: parsePercent(r[6]),
      penonton: Number(r[7]) || 0,
      klik_to_cart: Number(r[8]) || 0,
      klik_unik: Number(r[9]) || 0,
      add_to_cart: Number(r[10]) || 0,
      rate_klik_to_cart: parsePercent(r[11]),
      rate_tayangan_to_klik: parsePercent(r[12]),
      rate_tayangan_to_pembayaran: parsePercent(r[13]),
      rate_klik_to_pembayaran: parsePercent(r[14]),
      gmv_from_content: Number(r[15]) || 0,
    });
  }
  return { fileType: 'PRODUCT_CARD_TRAFFIC' as ExcelFileType, data };
}

// PARSER 3 & 4: Core-Stats.xlsx & Channel-Stats-Search.xlsx
export function parseShopTabDaily(workbook: XLSX.WorkBook, channelSource: string) {
  const ws = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null });

  const data = [];
  for (let i = 3; i < rows.length; i++) {
    const r = rows[i] as unknown[];
    if (!r[0]) continue;
    data.push({
      date: String(r[0]),
      channel_source: channelSource,
      gmv: Number(r[1]) || 0,
      gmv_avg_per_buyer: Number(r[2]) || 0,
      refund_amount: Number(r[3]) || 0,
      penonton: Number(r[4]) || 0,
      klik_unik: Number(r[5]) || 0,
      add_to_cart: Number(r[6]) || 0,
      pesanan_sku: Number(r[7]) || 0,
      pembeli: Number(r[8]) || 0,
      pesanan_refund: Number(r[9]) || 0,
      rate_tayangan_to_klik: parsePercent(r[10]),
      rate_pesanan_per_klik: parsePercent(r[11]),
      rate_tayangan_to_pembayaran: parsePercent(r[12]),
    });
  }
  return { fileType: channelSource as ExcelFileType, data };
}

// PARSER 5: Shopping_Center_Overview_Product.xlsx
export function parseShopTabProduct(workbook: XLSX.WorkBook) {
  const ws = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null });
  const { start: period_start, end: period_end } = extractDateRange(rows);

  const data = [];
  for (let i = 3; i < rows.length; i++) {
    const r = rows[i] as unknown[];
    if (!r[0] || !r[1]) continue;
    data.push({
      product_id: String(r[0]),
      product_name: String(r[1]),
      channel_source: 'shop_tab_shopping_center',
      period_start, period_end,
      period_type: 'monthly',
      tayangan: Number(r[2]) || 0,
      perolehan_impresi: Number(r[3]) || 0,
      impresi_unik: Number(r[4]) || 0,
      klik_unik: Number(r[5]) || 0,
      rate_tayangan_to_klik: parsePercent(r[6]),
      pembeli: Number(r[7]) || 0,
      rate_klik_to_pembayaran: parsePercent(r[8]),
      produk_terjual: Number(r[9]) || 0,
      gmv: Number(r[10]) || 0,
    });
  }
  return { fileType: 'SHOP_TAB_PRODUCT' as ExcelFileType, period_start, period_end, data };
}

// MASTER PARSER
export async function parseProductCardExcel(file: File) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });
  const fileType = detectFileType(workbook, file.name);

  switch (fileType) {
    case 'PRODUCT_CARD_LIST':    return { ...parseProductCardList(workbook), filename: file.name };
    case 'PRODUCT_CARD_TRAFFIC': return { ...parseProductCardTraffic(workbook), filename: file.name };
    case 'SHOP_TAB_CORE':        return { ...parseShopTabDaily(workbook, 'shop_tab_all'), filename: file.name };
    case 'SHOP_TAB_SEARCH':      return { ...parseShopTabDaily(workbook, 'shop_tab_search'), filename: file.name };
    case 'SHOP_TAB_PRODUCT':     return { ...parseShopTabProduct(workbook), filename: file.name };
    default:
      throw new Error(`Tipe file tidak dikenali. Pastikan file dari TikTok Seller Center: ${file.name}`);
  }
}
