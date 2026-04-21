import { NextRequest, NextResponse } from 'next/server';
import { getFreshVisionHarian, getEvaluasiHarian } from '@/lib/googleSheets';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sheet = searchParams.get('sheet'); // 'freshvision' | 'evaluasi'

  try {
    if (sheet === 'freshvision') {
      const data = await getFreshVisionHarian();
      return NextResponse.json({ ok: true, data });
    }

    if (sheet === 'evaluasi') {
      const data = await getEvaluasiHarian();
      return NextResponse.json({ ok: true, data });
    }

    // Default: return both
    const [freshvision, evaluasi] = await Promise.all([
      getFreshVisionHarian(),
      getEvaluasiHarian(),
    ]);
    return NextResponse.json({ ok: true, data: { freshvision, evaluasi } });
  } catch (err) {
    console.error('[Google Sheets API]', err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
