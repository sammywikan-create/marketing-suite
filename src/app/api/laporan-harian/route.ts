import { NextResponse } from 'next/server';
import {
  getFreshVisionShop,
  getFreshVisionVideo,
  getFreshVisionLive,
  getFreshVisionShopTab,
  getFreshVisionAffiliate,
  getEvaluasiHarian,
} from '@/lib/googleSheets';
import type { FVShopRow, FVChannelRow } from '@/lib/googleSheets';

function sumField<T>(arr: T[], fn: (r: T) => number) { return arr.reduce((s, r) => s + fn(r), 0); }
function avgField<T>(arr: T[], fn: (r: T) => number) { return arr.length > 0 ? sumField(arr, fn) / arr.length : 0; }

function channelSummary(rows: FVChannelRow[] | FVShopRow[]) {
  const n = rows.length || 1;
  return {
    total_omzet:   sumField(rows, r => r.omzet),
    total_closing: sumField(rows, r => r.closing),
    total_botol:   sumField(rows, r => r.botol),
    rata_upsell:   avgField(rows, r => r.upsell),
    rata_cac:      avgField(rows, r => r.cac_total),
    hari:          rows.length,
  };
}

// Weekly grouping helper
function groupByWeek<T extends { tanggal: string; omzet: number; closing: number; botol: number; upsell: number; cac_total: number }>(rows: T[]) {
  const weeks: Record<string, T[]> = {};
  rows.forEach((r, i) => {
    const weekNum = Math.floor(i / 7) + 1;
    const key = `Minggu ${weekNum}`;
    if (!weeks[key]) weeks[key] = [];
    weeks[key].push(r);
  });
  return Object.entries(weeks).map(([label, data]) => ({
    label,
    hari: data.length,
    total_omzet:   sumField(data, r => r.omzet),
    total_closing: sumField(data, r => r.closing),
    total_botol:   sumField(data, r => r.botol),
    rata_upsell:   avgField(data, r => r.upsell),
    rata_cac:      avgField(data, r => r.cac_total),
    rata_omzet_harian: sumField(data, r => r.omzet) / (data.length || 1),
  }));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const bulan = searchParams.get('bulan') || 'april-2026';
  const TARGET_OMZET = parseInt(searchParams.get('target') || '350000000');

  try {
    const [shop, video, live, shopTab, affiliate, evaluasi] = await Promise.all([
      getFreshVisionShop(),
      getFreshVisionVideo(),
      getFreshVisionLive(),
      getFreshVisionShopTab(),
      getFreshVisionAffiliate(),
      getEvaluasiHarian(),
    ]);

    // Merge shop with evaluasi kontribusi %
    const shopMerged = shop.map(row => {
      const evalRow = evaluasi.find(e => e.tanggal === row.tanggal);
      const pctFV = evalRow && evalRow.omzet_total > 0
        ? (row.omzet / evalRow.omzet_total) * 100 : 0;
      return {
        ...row,
        omzet_total_brand: evalRow?.omzet_total || 0,
        pct_kontribusi_fv: parseFloat(pctFV.toFixed(2)),
      };
    });

    // Summary (SHOP = main channel)
    const total_omzet_all = evaluasi.reduce((s, r) => s + r.omzet_total, 0);
    const total_omzet_fv = evaluasi.reduce((s, r) => s + r.omzet_freshvision, 0);

    const summary = {
      bulan,
      target_omzet: TARGET_OMZET,
      total_omzet:     sumField(shop, r => r.omzet),
      total_botol:     sumField(shop, r => r.botol),
      total_closing:   sumField(shop, r => r.closing),
      rata_upsell:     avgField(shop, r => r.upsell),
      rata_cac:        avgField(shop, r => r.cac_total),
      total_biaya_iklan: sumField(shop, r => r.biaya_iklan),
      total_komisi_aff:  sumField(shop, r => r.komisi_affiliate),
      total_omzet_all,
      total_omzet_fv,
      pct_kontribusi_fv: total_omzet_all > 0
        ? parseFloat((total_omzet_fv / total_omzet_all * 100).toFixed(2)) : 0,
    };

    // Weekly evaluation (SHOP)
    const weekly = groupByWeek(shop);

    // Per-channel summaries
    const channels = {
      shop:      channelSummary(shop),
      video:     channelSummary(video),
      live:      channelSummary(live),
      shop_tab:  channelSummary(shopTab),
      affiliate: channelSummary(affiliate),
    };

    return NextResponse.json({
      summary,
      harian: shopMerged,
      weekly,
      channels,
      channel_data: {
        video,
        live,
        shop_tab: shopTab,
        affiliate,
      },
      evaluasi_per_brand: {
        freshvision: total_omzet_fv,
        nutriflakes: evaluasi.reduce((s, r) => s + r.omzet_nutriflakes, 0),
        freshmag:    evaluasi.reduce((s, r) => s + r.omzet_freshmag, 0),
        etawaku:     evaluasi.reduce((s, r) => s + r.omzet_etawaku, 0),
        total:       total_omzet_all,
      },
    });
  } catch (err) {
    console.error('[laporan-harian]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
