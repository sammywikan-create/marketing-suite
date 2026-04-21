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

// ─── Utility ───
function sum<T>(a: T[], fn: (r: T) => number) { return a.reduce((s, r) => s + fn(r), 0); }
function avg<T>(a: T[], fn: (r: T) => number) { return a.length ? sum(a, fn) / a.length : 0; }
function pct(part: number, total: number) { return total > 0 ? parseFloat((part / total * 100).toFixed(2)) : 0; }

function channelSummary(rows: (FVChannelRow | FVShopRow)[]) {
  return {
    total_omzet:   sum(rows, r => r.omzet),
    total_closing: sum(rows, r => r.closing),
    total_botol:   sum(rows, r => r.botol),
    rata_upsell:   avg(rows, r => r.upsell),
    rata_cac:      avg(rows, r => r.cac_total),
    hari:          rows.length,
  };
}

function groupByWeek<T extends { omzet: number; closing: number; botol: number; upsell: number; cac_total: number }>(rows: T[]) {
  const weeks: Record<string, T[]> = {};
  rows.forEach((r, i) => {
    const key = `Minggu ${Math.floor(i / 7) + 1}`;
    if (!weeks[key]) weeks[key] = [];
    weeks[key].push(r);
  });
  return Object.entries(weeks).map(([label, data], idx, arr) => {
    const s = {
      label,
      hari: data.length,
      total_omzet:       sum(data, r => r.omzet),
      total_closing:     sum(data, r => r.closing),
      total_botol:       sum(data, r => r.botol),
      rata_upsell:       avg(data, r => r.upsell),
      rata_cac:          avg(data, r => r.cac_total),
      rata_omzet_harian: sum(data, r => r.omzet) / (data.length || 1),
      // WoW comparison (vs previous week)
      wow_omzet: 0,
      wow_closing: 0,
    };
    if (idx > 0) {
      const prev = arr[idx - 1][1];
      const prevOmzet = sum(prev, r => r.omzet);
      const prevClosing = sum(prev, r => r.closing);
      s.wow_omzet = prevOmzet > 0 ? parseFloat(((s.total_omzet - prevOmzet) / prevOmzet * 100).toFixed(1)) : 0;
      s.wow_closing = prevClosing > 0 ? parseFloat(((s.total_closing - prevClosing) / prevClosing * 100).toFixed(1)) : 0;
    }
    return s;
  });
}

export async function GET() {
  try {
    const [shop, video, live, shopTab, affiliate, evaluasi] = await Promise.all([
      getFreshVisionShop(),
      getFreshVisionVideo(),
      getFreshVisionLive(),
      getFreshVisionShopTab(),
      getFreshVisionAffiliate(),
      getEvaluasiHarian(),
    ]);

    // ─── Merge shop with evaluasi kontribusi % ───
    const shopMerged = shop.map(row => {
      const evalRow = evaluasi.find(e => e.tanggal === row.tanggal);
      return {
        ...row,
        omzet_total_brand: evalRow?.omzet_total || 0,
        pct_kontribusi_fv: pct(row.omzet, evalRow?.omzet_total || 0),
      };
    });

    // ─── Totals ───
    const totalOmzet     = sum(shop, r => r.omzet);
    const totalBotol     = sum(shop, r => r.botol);
    const totalClosing   = sum(shop, r => r.closing);
    const totalBiayaIklan = sum(shop, r => r.biaya_iklan);
    const totalKomisiAff = sum(shop, r => r.komisi_affiliate);
    const totalCost      = totalBiayaIklan + totalKomisiAff;
    const totalOmzetAll  = sum(evaluasi, r => r.omzet_total);
    const totalOmzetFV   = sum(evaluasi, r => r.omzet_freshvision);
    const hari           = shop.length;

    // ─── ROAS & Cost Analysis ───
    const roas = totalBiayaIklan > 0 ? parseFloat((totalOmzet / totalBiayaIklan).toFixed(2)) : 0;
    const costPerClosing = totalClosing > 0 ? Math.round(totalCost / totalClosing) : 0;
    const costPerBotol   = totalBotol > 0 ? Math.round(totalCost / totalBotol) : 0;
    const marginAfterCost = totalOmzet > 0 ? parseFloat(((totalOmzet - totalCost) / totalOmzet * 100).toFixed(1)) : 0;

    // ─── Best / Worst Day ───
    const sorted = [...shop].sort((a, b) => b.omzet - a.omzet);
    const bestDay  = sorted[0] || null;
    const worstDay = sorted[sorted.length - 1] || null;

    // ─── Anomalies ───
    const avgOmzet = avg(shop, r => r.omzet);
    const stdDev   = Math.sqrt(avg(shop, r => Math.pow(r.omzet - avgOmzet, 2)));
    const anomalies = shop
      .filter(r => Math.abs(r.omzet - avgOmzet) > 1.5 * stdDev)
      .map(r => ({
        tanggal: r.tanggal,
        omzet: r.omzet,
        type: r.omzet > avgOmzet ? 'spike' as const : 'drop' as const,
        deviation: parseFloat(((r.omzet - avgOmzet) / avgOmzet * 100).toFixed(1)),
      }));

    const summary = {
      total_omzet: totalOmzet,
      total_botol: totalBotol,
      total_closing: totalClosing,
      rata_upsell: avg(shop, r => r.upsell),
      rata_cac: avg(shop, r => r.cac_total),
      rata_cac_ads: avg(shop, r => r.cac_ads),
      total_biaya_iklan: totalBiayaIklan,
      total_komisi_aff: totalKomisiAff,
      total_cost: totalCost,
      roas,
      cost_per_closing: costPerClosing,
      cost_per_botol: costPerBotol,
      margin_after_cost: marginAfterCost,
      total_omzet_all: totalOmzetAll,
      total_omzet_fv: totalOmzetFV,
      pct_kontribusi_fv: pct(totalOmzetFV, totalOmzetAll),
      hari,
      avg_omzet_harian: hari > 0 ? Math.round(totalOmzet / hari) : 0,
      avg_closing_harian: hari > 0 ? Math.round(totalClosing / hari) : 0,
      avg_botol_harian: hari > 0 ? Math.round(totalBotol / hari) : 0,
      nilai_per_txn: totalClosing > 0 ? Math.round(totalOmzet / totalClosing) : 0,
    };

    // ─── Weekly ───
    const weekly = groupByWeek(shop);

    // ─── Per-channel summaries ───
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
      channel_data: { video, live, shop_tab: shopTab, affiliate },
      evaluasi_per_brand: {
        freshvision: totalOmzetFV,
        nutriflakes: sum(evaluasi, r => r.omzet_nutriflakes),
        freshmag:    sum(evaluasi, r => r.omzet_freshmag),
        etawaku:     sum(evaluasi, r => r.omzet_etawaku),
        total:       totalOmzetAll,
      },
      highlights: {
        best_day:  bestDay  ? { tanggal: bestDay.tanggal, omzet: bestDay.omzet } : null,
        worst_day: worstDay ? { tanggal: worstDay.tanggal, omzet: worstDay.omzet } : null,
        anomalies,
      },
    });
  } catch (err) {
    console.error('[laporan-harian]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
