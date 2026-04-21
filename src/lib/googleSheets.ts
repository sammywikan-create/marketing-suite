import { google } from 'googleapis';

const SHEET_FRESHVISION = 'ADV SAEFUL- FRESHVISION(SHOP)';
const SHEET_EVALUASI = 'TOTAL EVALUASI PRODUK (TIKTOKSHOP)';

// "Rp20.309.480,00" → 20309480
// "172" → 172
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

// "1,8" or "1.8" → 1.8
function cleanDecimal(val: unknown): number {
  if (!val) return 0;
  const s = String(val).replace(',', '.').trim();
  return parseFloat(s) || 0;
}

// "Rabu, April 1, 2026" → "1 Apr"
function cleanDate(val: unknown): string {
  if (!val) return '';
  const s = String(val).trim();
  // Format: "Hari, Bulan Tanggal, Tahun" e.g. "Rabu, April 1, 2026"
  const match = s.match(/(\w+)\s+(\d+),\s*(\d{4})$/);
  if (match) {
    const bulanMap: Record<string, string> = {
      January: 'Jan', February: 'Feb', March: 'Mar', April: 'Apr',
      May: 'Mei', June: 'Jun', July: 'Jul', August: 'Agu',
      September: 'Sep', October: 'Okt', November: 'Nov', December: 'Des',
    };
    const bulan = bulanMap[match[1]] || match[1].slice(0, 3);
    return `${match[2]} ${bulan}`;
  }
  return s;
}

function getSpreadsheetId(): string {
  const id = process.env.GOOGLE_SHEETS_ID;
  if (!id) {
    console.error('[GoogleSheets] ENV vars present:', {
      GOOGLE_SHEETS_ID: !!process.env.GOOGLE_SHEETS_ID,
      GOOGLE_SERVICE_ACCOUNT_EMAIL: !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      GOOGLE_PRIVATE_KEY: !!process.env.GOOGLE_PRIVATE_KEY,
    });
    throw new Error('GOOGLE_SHEETS_ID belum diset di environment variables. Buka Vercel → Settings → Environment Variables → tambahkan GOOGLE_SHEETS_ID');
  }
  return id;
}

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY;
  if (!email || !key) {
    throw new Error(`Google credentials belum lengkap. GOOGLE_SERVICE_ACCOUNT_EMAIL: ${email ? '✅' : '❌'}, GOOGLE_PRIVATE_KEY: ${key ? '✅' : '❌'}`);
  }
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: email,
      private_key: key.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
}

// ─── Freshvision Harian ─────────────────────────────────
// Kolom: A=tanggal, J=komisi_affiliate, K=closing, L=botol,
//        M=nilai_per_transaksi, N=omzet, O=cac_ads, P=cac_total, Q=upsell
export async function getFreshVisionHarian() {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: getSpreadsheetId(),
    range: `'${SHEET_FRESHVISION}'!A4:Q35`,
  });

  const rows = response.data.values || [];

  return rows
    .filter(r => r[0] && r[13])
    .map(r => ({
      tanggal:       cleanDate(r[0]),
      closing:       parseInt(r[10]) || 0,
      botol:         parseInt(r[11]) || 0,
      nilai_per_txn: cleanRp(r[12]),
      omzet:         cleanRp(r[13]),
      cac_ads:       cleanPct(r[14]),
      cac_total:     cleanPct(r[15]),
      upsell:        cleanDecimal(r[16]),
    }))
    .filter(r => r.omzet > 0);
}

// ─── Evaluasi Harian (semua produk) ─────────────────────
export async function getEvaluasiHarian() {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: getSpreadsheetId(),
    range: `'${SHEET_EVALUASI}'!A4:NZ35`,
  });

  const rows = response.data.values || [];

  return rows
    .filter(r => r[0])
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
