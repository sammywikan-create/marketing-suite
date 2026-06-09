import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';

// Load .env.local
const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)$/);
    if (match) {
      const key = match[1].trim();
      let val = match[2].trim();
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  });
}

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

async function run() {
  try {
    console.log("Fetching headers & early rows from FV_SHOP...");
    const shopRows = await fetchRange(SHEETS.FV_SHOP, 'A1:T5');
    console.log("FV_SHOP Rows (A1:T5):");
    shopRows.forEach((row, i) => {
      console.log(`Row ${i + 1}:`, JSON.stringify(row));
    });

    console.log("\nFetching headers & early rows from EVALUASI...");
    const evalRows = await fetchRange(SHEETS.EVALUASI, 'A1:T5');
    console.log("EVALUASI Rows (A1:T5):");
    evalRows.forEach((row, i) => {
      console.log(`Row ${i + 1}:`, JSON.stringify(row));
    });

  } catch (error) {
    console.error("Error:", error);
  }
}

run();
