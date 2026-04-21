import { NextResponse } from 'next/server';
import { google } from 'googleapis';

const FV_SHEETS = [
  'ADV SAEFUL- FRESHVISION(SHOP)',
  'ADV SAEFUL - FRESHVISION(VIDEO)',
  'ADV SAEFUL - FRESHVISION(LIVE STREAMING)',
  'ADV SAEFUL - FRESHVISION(SHOP TAB)',
  'ADV SAEFUL - FRESHVISION(AFFILIATE)',
];

function colLabel(ci: number): string {
  if (ci < 26) return String.fromCharCode(65 + ci);
  return String.fromCharCode(64 + Math.floor(ci / 26)) + String.fromCharCode(65 + (ci % 26));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('mode') || 'all-headers';

  try {
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
    if (!spreadsheetId) return NextResponse.json({ error: 'GOOGLE_SHEETS_ID not set' }, { status: 500 });

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    const sheets = google.sheets({ version: 'v4', auth });

    if (mode === 'all-headers') {
      // Dump rows 1-5 from ALL FreshVision sheets
      const results: Record<string, unknown> = {};
      for (const sheetName of FV_SHEETS) {
        try {
          const res = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `'${sheetName}'!A1:Z5`,
          });
          const rows = res.data.values || [];
          results[sheetName] = rows.map((r, ri) => ({
            row: ri + 1,
            cols: r.map((cell: unknown, ci: number) => `${colLabel(ci)}=${cell}`),
          }));
        } catch (e) {
          results[sheetName] = { error: String(e) };
        }
      }
      return NextResponse.json({ mode, results });
    }

    // Single sheet mode
    const sheet = searchParams.get('sheet') || FV_SHEETS[0];
    const range = searchParams.get('range') || 'A1:Z10';
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${sheet}'!${range}`,
    });
    const rows = response.data.values || [];
    return NextResponse.json({
      requestedSheet: sheet,
      totalRows: rows.length,
      rows: rows.map((r, i) => ({
        rowIndex: i,
        cols: r.map((cell: unknown, ci: number) => ({ col: colLabel(ci), idx: ci, value: cell })),
      })),
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
