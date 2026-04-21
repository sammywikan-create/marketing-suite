import { NextResponse } from 'next/server';
import { getFreshVisionHarian, getEvaluasiHarian } from '@/lib/googleSheets';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const bulan = searchParams.get('bulan') || 'april-2026';

  try {
    const [harianFV, evaluasi] = await Promise.all([
      getFreshVisionHarian(),
      getEvaluasiHarian(),
    ]);

    // Gabungkan data harian dengan kontribusi %
    const dataMerged = harianFV.map(row => {
      const evalRow = evaluasi.find(e => e.tanggal === row.tanggal);
      const pctFV = evalRow && evalRow.omzet_total > 0
        ? (row.omzet / evalRow.omzet_total) * 100
        : 0;

      return {
        ...row,
        omzet_total_brand: evalRow?.omzet_total || 0,
        pct_kontribusi_fv: parseFloat(pctFV.toFixed(2)),
      };
    });

    // Summary KPI
    const total_omzet_all = evaluasi.reduce((s, r) => s + r.omzet_total, 0);
    const total_omzet_fv = evaluasi.reduce((s, r) => s + r.omzet_freshvision, 0);

    const summary = {
      bulan,
      total_omzet:     harianFV.reduce((s, r) => s + r.omzet, 0),
      total_botol:     harianFV.reduce((s, r) => s + r.botol, 0),
      total_closing:   harianFV.reduce((s, r) => s + r.closing, 0),
      rata_upsell:     harianFV.length > 0 ? harianFV.reduce((s, r) => s + r.upsell, 0) / harianFV.length : 0,
      rata_cac:        harianFV.length > 0 ? harianFV.reduce((s, r) => s + r.cac_total, 0) / harianFV.length : 0,
      total_omzet_all,
      total_omzet_fv,
      pct_kontribusi_fv: total_omzet_all > 0
        ? parseFloat((total_omzet_fv / total_omzet_all * 100).toFixed(2))
        : 0,
    };

    return NextResponse.json({
      summary,
      harian: dataMerged,
      evaluasi_per_brand: {
        freshvision:  evaluasi.reduce((s, r) => s + r.omzet_freshvision, 0),
        nutriflakes:  evaluasi.reduce((s, r) => s + r.omzet_nutriflakes, 0),
        freshmag:     evaluasi.reduce((s, r) => s + r.omzet_freshmag, 0),
        etawaku:      evaluasi.reduce((s, r) => s + r.omzet_etawaku, 0),
        total:        evaluasi.reduce((s, r) => s + r.omzet_total, 0),
      },
    });
  } catch (err) {
    console.error('[laporan-harian]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
