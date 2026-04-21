import { google } from 'googleapis';

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID;
const SHEET_FRESHVISION = 'ADV SAEFUL- FRESHVISION(SHOP)';
const SHEET_EVALUASI = 'TOTAL EVALUASI PRODUK (TIKTOKSH';

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
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
    spreadsheetId: SPREADSHEET_ID!,
    range: `'${SHEET_FRESHVISION}'!A4:Q35`,
  });

  const rows = response.data.values || [];

  return rows
    .filter(r => r[0] && r[13])
    .map(r => ({
      tanggal:       r[0],
      closing:       parseInt(r[10]) || 0,
      botol:         parseFloat(r[11]) || 0,
      nilai_per_txn: parseFloat(r[12]) || 0,
      omzet:         parseFloat(r[13]) || 0,
      cac_ads:       parseFloat(r[14]) || 0,
      cac_total:     parseFloat(r[15]) || 0,
      upsell:        parseFloat(r[16]) || 0,
    }))
    .filter(r => r.omzet > 0);
}

// ─── Evaluasi Harian (semua produk) ─────────────────────
export async function getEvaluasiHarian() {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID!,
    range: `'${SHEET_EVALUASI}'!A4:NZ35`,
  });

  const rows = response.data.values || [];

  return rows
    .filter(r => r[0])
    .map(r => ({
      tanggal:           r[0],
      omzet_freshvision: parseFloat(r[322]) || 0,
      omzet_nutriflakes: parseFloat(r[273]) || 0,
      omzet_freshmag:    parseFloat(r[256]) || 0,
      omzet_etawaku:     parseFloat(r[175]) || 0,
      omzet_total:       parseFloat(r[339]) || 0,
    }))
    .filter(r => r.omzet_total > 0);
}
