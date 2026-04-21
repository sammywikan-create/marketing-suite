import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sheet = searchParams.get('sheet') || 'ADV SAEFUL- FRESHVISION(SHOP)';

  try {
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
    if (!spreadsheetId) {
      return NextResponse.json({ error: 'GOOGLE_SHEETS_ID not set' }, { status: 500 });
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // First get all sheet names
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetNames = meta.data.sheets?.map(s => s.properties?.title) || [];

    // Then get raw data from requested sheet (first 5 rows for debugging)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${sheet}'!A1:Z10`,
    });

    const rows = response.data.values || [];

    return NextResponse.json({
      sheetNames,
      requestedSheet: sheet,
      totalRows: rows.length,
      rows: rows.map((r, i) => ({
        rowIndex: i,
        columnCount: r.length,
        data: r.map((cell: unknown, ci: number) => ({
          col: ci,
          colLetter: String.fromCharCode(65 + ci),
          value: cell,
        })),
      })),
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
