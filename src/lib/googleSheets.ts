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
}
export interface FVChannelRow {
  tanggal: string; omzet: number; closing: number; botol: number;
  upsell: number; cac_ads: number; cac_total: number;
}
export interface EvalRow {
  tanggal: string; omzet_freshvision: number; omzet_nutriflakes: number;
  omzet_freshmag: number; omzet_etawaku: number; omzet_total: number;
}

// ═══ FETCHER 1: FreshVision SHOP (main) ═══
// Kolom: A=tanggal, B-I=biaya, J=komisi_affiliate, K=closing, L=botol,
//        M=nilai_per_txn, N=omzet, O=cac_ads, P=cac_total, Q=upsell
export async function getFreshVisionShop(): Promise<FVShopRow[]> {
  const rows = await fetchRange(SHEETS.FV_SHOP, 'A4:Q50');
  return rows
    .filter(r => isDateRow(r[0]))
    .map(r => ({
      tanggal:          cleanDate(r[0]),
      biaya_iklan:      cleanRp(r[3]),   // D = biaya iklan total
      komisi_affiliate: cleanRp(r[9]),   // J
      closing:          cleanInt(r[10]), // K
      botol:            cleanInt(r[11]), // L
      nilai_per_txn:    cleanRp(r[12]),  // M
      omzet:            cleanRp(r[13]),  // N
      cac_ads:          cleanPct(r[14]), // O
      cac_total:        cleanPct(r[15]), // P
      upsell:           cleanDecimal(r[16]), // Q
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
      tanggal:   cleanDate(r[0]),
      omzet:     cleanRp(r[7]),    // H
      closing:   cleanInt(r[4]),   // E
      botol:     cleanInt(r[5]),   // F
      upsell:    cleanDecimal(r[9]), // J
      cac_ads:   cleanPct(r[8]),   // I (only one CAC column)
      cac_total:  cleanPct(r[8]),  // I
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
      tanggal:   cleanDate(r[0]),
      omzet:     cleanRp(r[7]),    // H
      closing:   cleanInt(r[4]),   // E
      botol:     cleanInt(r[5]),   // F
      upsell:    cleanDecimal(r[9]), // J
      cac_ads:   cleanPct(r[8]),   // I
      cac_total:  cleanPct(r[8]),  // I
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
      tanggal:   cleanDate(r[0]),
      omzet:     cleanRp(r[7]),      // H
      closing:   cleanInt(r[4]),     // E
      botol:     cleanInt(r[5]),     // F
      upsell:    cleanDecimal(r[9]), // J
      cac_ads:   cleanPct(r[8]),     // I
      cac_total: cleanPct(r[8]),     // I
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
      tanggal:   cleanDate(r[0]),
      omzet:     cleanRp(r[5]),    // F
      closing:   cleanInt(r[2]),   // C
      botol:     cleanInt(r[3]),   // D
      upsell:    cleanDecimal(r[7]), // H
      cac_ads:   cleanPct(r[6]),   // G
      cac_total:  cleanPct(r[6]),  // G
    }))
    .filter(r => r.omzet > 0);
}

// ═══ FETCHER 6: EVALUASI (all brands) ═══
export async function getEvaluasiHarian(): Promise<EvalRow[]> {
  const rows = await fetchRange(SHEETS.EVALUASI, 'A4:NZ50');
  return rows
    .filter(r => isDateRow(r[0]))
    .map(r => ({
      tanggal:           cleanDate(r[0]),
      omzet_freshvision: cleanRp(r[322]),
      omzet_nutriflakes: cleanRp(r[273]),
      omzet_freshmag:    cleanRp(r[256]),
      omzet_etawaku:     cleanRp(r[175]),
      omzet_total:       cleanRp(r[339]),
    }))
    .filter(r => r.omzet_total > 0);
}

// ═══ Backward compat alias ═══
export const getFreshVisionHarian = getFreshVisionShop;
