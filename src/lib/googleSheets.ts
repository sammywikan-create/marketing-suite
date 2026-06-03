import { google } from 'googleapis';

// ═══ SHEET NAMES ═══
const SHEETS = {
  FV_SHOP:       'ADV SAEFUL- FRESHVISION(SHOP)',
  FV_VIDEO:      'ADV SAEFUL - FRESHVISION(VIDEO)',
  FV_LIVE:       'ADV SAEFUL - FRESHVISION(LIVE STREAMING)',
  FV_SHOP_TAB:   'ADV SAEFUL - FRESHVISION(SHOP TAB)',
  FV_AFFILIATE:  'ADV SAEFUL - FRESHVISION(AFFILIATE)',
  FV_PROPORSI:   'ADV SAEFUL - FRESHVISION(PROPORSI TOTAL OMSET)',
  EVALUASI:      'TOTAL EVALUASI PRODUK (TIKTOKSHOP)',
};

// ═══ VALUE CLEANERS ═══
// "Rp20.309.480,00" → 20309480
function cleanRp(val: unknown): number {
  if (!val) return 0;
  const s = String(val).replace(/Rp/gi, '').replace(/\./g, '').replace(',', '.').trim();
  return parseFloat(s) || 0;
}
// "24,96%" → 24.96
function cleanPct(val: unknown): number {
  if (!val) return 0;
  const s = String(val).replace('%', '').replace(',', '.').trim();
  return parseFloat(s) || 0;
}
// "1,8" → 1.8
function cleanDecimal(val: unknown): number {
  if (!val) return 0;
  return parseFloat(String(val).replace(',', '.').trim()) || 0;
}
// Check if cell looks like a date row (e.g. "Rabu, April 1, 2026")
function isDateRow(val: unknown): boolean {
  if (!val) return false;
  const s = String(val).trim();
  // Must contain a month name and a year — skip TOTAL, RATA-RATA, empty, etc.
  return /\w+,\s+\w+\s+\d+,\s+\d{4}/.test(s);
}
// "Rabu, April 1, 2026" → "1 Apr"
function cleanDate(val: unknown): string {
  if (!val) return '';
  const s = String(val).trim();
  const match = s.match(/(\w+)\s+(\d+),\s*(\d{4})$/);
  if (match) {
    const bulanMap: Record<string, string> = {
      January: 'Jan', February: 'Feb', March: 'Mar', April: 'Apr',
      May: 'Mei', June: 'Jun', July: 'Jul', August: 'Agu',
      September: 'Sep', October: 'Okt', November: 'Nov', December: 'Des',
    };
    return `${match[2]} ${bulanMap[match[1]] || match[1].slice(0, 3)}`;
  }
  return s;
}
// Parse int, handles "96" or similar
function cleanInt(val: unknown): number {
  if (!val) return 0;
  return parseInt(String(val).replace(/\./g, '').replace(',', '.')) || 0;
}

// ═══ AUTH ═══
function getSpreadsheetId(): string {
  const id = process.env.GOOGLE_SHEETS_ID;
  if (!id) throw new Error('GOOGLE_SHEETS_ID belum diset di environment variables');
  return id;
}
function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY;
  if (!email || !key) {
    throw new Error(`Google credentials belum lengkap. EMAIL: ${email ? '✅' : '❌'}, KEY: ${key ? '✅' : '❌'}`);
  }
  return new google.auth.GoogleAuth({
    credentials: { client_email: email, private_key: key.replace(/\\n/g, '\n') },
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
}
function getSheetsClient() {
  return google.sheets({ version: 'v4', auth: getAuth() });
}
async function fetchRange(sheetName: string, range: string) {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: getSpreadsheetId(),
    range: `'${sheetName}'!${range}`,
  });
  return res.data.values || [];
}

// ═══ EXPORTED TYPES ═══
export interface FVShopRow {
  tanggal: string; closing: number; botol: number; nilai_per_txn: number;
  omzet: number; cac_ads: number; cac_total: number; upsell: number;
  biaya_iklan: number; komisi_affiliate: number;
  // New cost breakdown columns
  komisi_platform: number; shipping_cost: number; biaya_layanan_mall: number;
  biaya_komisi_dinamis: number; program_growth_extra: number; biaya_pemrosesan: number;
  // New ROI columns
  roi_no_ppn: number; roi_ads: number; total_roi: number;
}
export interface FVChannelRow {
  tanggal: string; omzet: number; closing: number; botol: number;
  upsell: number; cac_ads: number; cac_total: number;
  biaya_iklan: number;  // VIDEO/LIVE/SHOP_TAB: col D (biaya iklan); AFFILIATE: col B (komisi affiliate)
}
export interface EvalRow {
  tanggal: string; omzet_freshvision: number; omzet_nutriflakes: number;
  omzet_freshmag: number; omzet_etawaku: number; omzet_total: number;
}

// ═══ FETCHER 1: FreshVision SHOP (main) ═══
// Kolom baru (setelah penambahan BIAYA PEMROSESAN PESANAN di kolom J):
//   A=tanggal
//   B=biaya iklan gmv max, C=non gmv max, D=gmv max+non gmv max & ppn 11%
//   E=komisi platform, F=shipping cost, G=biaya layanan mall
//   H=biaya komisi dinamis, I=program growth extra, J=biaya pemrosesan pesanan (BARU!)
//   K=komisi affiliate, L=closing, M=botol, N=nilai per txn, O=omzet
//   P=cac of ads, Q=cac total, R=upsell, S=roi no ppn, T=roi ads, U=total roi
export async function getFreshVisionShop(): Promise<FVShopRow[]> {
  const rows = await fetchRange(SHEETS.FV_SHOP, 'A4:U50');
  return rows
    .filter(r => isDateRow(r[0]))
    .map(r => ({
      tanggal:             cleanDate(r[0]),
      // D (r[3]) = total biaya iklan termasuk PPN — SAMA seperti sebelumnya
      biaya_iklan:         cleanRp(r[3]),
      // Cost breakdown (new columns E-J)
      komisi_platform:     cleanRp(r[4]),   // E
      shipping_cost:       cleanRp(r[5]),   // F
      biaya_layanan_mall:  cleanRp(r[6]),   // G
      biaya_komisi_dinamis: cleanRp(r[7]), // H
      program_growth_extra: cleanRp(r[8]), // I
      biaya_pemrosesan:    cleanRp(r[9]),   // J = BIAYA PEMROSESAN PESANAN (KOLOM BARU)
      // Semua kolom berikut BERGESER +1 karena kolom J baru
      komisi_affiliate:    cleanRp(r[10]),  // K (dulu J=r[9])
      closing:             cleanInt(r[11]), // L (dulu K=r[10])
      botol:               cleanInt(r[12]), // M (dulu L=r[11])
      nilai_per_txn:       cleanRp(r[13]),  // N (dulu M=r[12])
      omzet:               cleanRp(r[14]),  // O (dulu N=r[13])
      cac_ads:             cleanPct(r[15]), // P (dulu O=r[14])
      cac_total:           cleanPct(r[16]), // Q (dulu P=r[15])
      upsell:              cleanDecimal(r[17]), // R (dulu Q=r[16])
      // Kolom ROI baru di S, T, U
      roi_no_ppn:          cleanDecimal(r[18]), // S
      roi_ads:             cleanDecimal(r[19]), // T
      total_roi:           cleanDecimal(r[20]), // U
    }))
    .filter(r => r.omzet > 0);
}

// ═══ FETCHER 2: FreshVision VIDEO ═══
// Kolom TOTAL: D=biaya_iklan, E=closing, F=botol, G=nilai, H=omzet, I=cac, J=upsell
export async function getFreshVisionVideo(): Promise<FVChannelRow[]> {
  const rows = await fetchRange(SHEETS.FV_VIDEO, 'A4:J50');
  return rows
    .filter(r => isDateRow(r[0]))
    .map(r => ({
      tanggal:    cleanDate(r[0]),
      biaya_iklan: cleanRp(r[3]),    // D
      omzet:      cleanRp(r[7]),     // H
      closing:    cleanInt(r[4]),    // E
      botol:      cleanInt(r[5]),    // F
      upsell:     cleanDecimal(r[9]), // J
      cac_ads:    cleanPct(r[8]),    // I (only one CAC column)
      cac_total:  cleanPct(r[8]),    // I
    }))
    .filter(r => r.omzet > 0);
}

// ═══ FETCHER 3: FreshVision LIVE STREAMING ═══
// Kolom TOTAL: D=biaya_iklan, E=closing, F=botol, G=nilai, H=omzet, I=cac, J=upsell
export async function getFreshVisionLive(): Promise<FVChannelRow[]> {
  const rows = await fetchRange(SHEETS.FV_LIVE, 'A4:J50');
  return rows
    .filter(r => isDateRow(r[0]))
    .map(r => ({
      tanggal:    cleanDate(r[0]),
      biaya_iklan: cleanRp(r[3]),    // D
      omzet:      cleanRp(r[7]),     // H
      closing:    cleanInt(r[4]),    // E
      botol:      cleanInt(r[5]),    // F
      upsell:     cleanDecimal(r[9]), // J
      cac_ads:    cleanPct(r[8]),    // I
      cac_total:  cleanPct(r[8]),    // I
    }))
    .filter(r => r.omzet > 0);
}

// ═══ FETCHER 4: FreshVision SHOP TAB ═══
// Layout TOTAL FRESH VISION SHOP TAB (cols B-J): same as VIDEO/LIVE
//   D=biaya_iklan, E=closing, F=botol, G=nilai_per_txn, H=omzet, I=cac, J=upsell
// Sheet juga punya sub-sections FRESH VISION SHOP (K-S) & FRESH VISION OFC (T-AB)
// tapi kita hanya butuh TOTAL di kolom B-J.
export async function getFreshVisionShopTab(): Promise<FVChannelRow[]> {
  const rows = await fetchRange(SHEETS.FV_SHOP_TAB, 'A4:J50');
  return rows
    .filter(r => isDateRow(r[0]))
    .map(r => ({
      tanggal:    cleanDate(r[0]),
      biaya_iklan: cleanRp(r[3]),    // D
      omzet:      cleanRp(r[7]),     // H
      closing:    cleanInt(r[4]),    // E
      botol:      cleanInt(r[5]),    // F
      upsell:     cleanDecimal(r[9]), // J
      cac_ads:    cleanPct(r[8]),    // I
      cac_total:  cleanPct(r[8]),    // I
    }))
    .filter(r => r.omzet > 0);
}

// ═══ FETCHER 5: FreshVision AFFILIATE ═══
// Kolom TOTAL: B=komisi_aff, C=closing, D=botol, E=nilai, F=omzet, G=cac, H=upsell
export async function getFreshVisionAffiliate(): Promise<FVChannelRow[]> {
  const rows = await fetchRange(SHEETS.FV_AFFILIATE, 'A4:H50');
  return rows
    .filter(r => isDateRow(r[0]))
    .map(r => ({
      tanggal:    cleanDate(r[0]),
      biaya_iklan: cleanRp(r[1]),    // B = komisi affiliate (treated as cost)
      omzet:      cleanRp(r[5]),     // F
      closing:    cleanInt(r[2]),    // C
      botol:      cleanInt(r[3]),    // D
      upsell:     cleanDecimal(r[7]), // H
      cac_ads:    cleanPct(r[6]),    // G
      cac_total:  cleanPct(r[6]),    // G
    }))
    .filter(r => r.omzet > 0);
}

// ═══ FETCHER 6: EVALUASI (all brands) ═══
// FreshVision block: LQ (col 329, index 328) to MH (col 346, index 345)
// Urutan kolom dalam block FreshVision:
//   +0  BIAYA IKLAN GMV MAX
//   +1  BIAYA IKLAN NON GMV MAX
//   +2  BIAYA IKLAN GMV MAX+NON GMV MAX & PPN 11%
//   +3  KOMISI PLATFORM, +4 SHIPPING COST, +5 BIAYA LAYANAN MALL
//   +6  BIAYA KOMISI DINAMIS, +7 PROGAM GROWTH EXTRA, +8 BIAYA PEMROSESAN PESANAN
//   +9  KOMISI AFFILIATE, +10 CLOSING, +11 BOTOL, +12 UPSELL
//   +13 NILAI PER TRANSAKSI, +14 OMZET, +15 CAC OF ADS, +16 CAC TOTAL, +17 ROI
export async function getEvaluasiHarian(): Promise<EvalRow[]> {
  // Fetch from row 1 (to include headers) through row 100 up to column MH
  const rows = await fetchRange(SHEETS.EVALUASI, 'A1:MH100');

  // FreshVision block constants (0-indexed)
  const FV_START = 328;  // Column LQ
  const FV_END   = 345;  // Column MH
  const DEFAULT_OMZET_OFFSET = 14; // OMZET is the 15th column in the block

  // Header-based detection: scan first 5 rows for 'omzet' in FV block range
  let fvOmzetIdx = FV_START + DEFAULT_OMZET_OFFSET; // default = 342
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    const row = rows[i] || [];
    for (let j = FV_START; j <= FV_END; j++) {
      const cell = String(row[j] ?? '').toLowerCase().trim();
      if (cell === 'omzet' || cell === 'total omzet') {
        fvOmzetIdx = j;
        console.log(`[Evaluasi] OMZET column found at index ${j} (row ${i + 1})`);
        break;
      }
    }
    if (fvOmzetIdx !== FV_START + DEFAULT_OMZET_OFFSET) break;
  }

  return rows
    .filter(r => isDateRow(r[0]))
    .map(r => {
      const omzet_fv = cleanRp(r[fvOmzetIdx]);
      return {
        tanggal:           cleanDate(r[0]),
        omzet_freshvision: omzet_fv,
        omzet_nutriflakes: 0, // posisi kolom brand lain belum ditentukan
        omzet_freshmag:    0,
        omzet_etawaku:     0,
        omzet_total:       omzet_fv,
      };
    })
    .filter(r => r.omzet_total > 0);
}

// ═══ Backward compat alias ═══
export const getFreshVisionHarian = getFreshVisionShop;
