/**
 * Summary formatter for Telegram bot commands
 * Generates daily/monthly summaries with key metrics and recommendations
 */

interface SummaryData {
  summary: {
    total_omzet: number;
    total_closing: number;
    total_botol: number;
    rata_upsell: number;
    rata_cac: number;
    roas: number;
    total_biaya_iklan: number;
    hari: number;
    avg_omzet_harian: number;
    margin_after_cost: number;
    nilai_per_txn: number;
  };
  target: number;
  channels?: Record<string, {
    total_omzet: number;
    total_closing: number;
    total_botol: number;
    rata_cac: number;
    roi: number;
    hari: number;
  }>;
  harian?: { tanggal: string; omzet: number; closing: number; botol: number; cac_total: number }[];
  highlights?: {
    best_day?: { tanggal: string; omzet: number } | null;
    worst_day?: { tanggal: string; omzet: number } | null;
  };
  period?: string;
}

function fR(v: number) {
  if (v >= 1_000_000_000) return `Rp${(v / 1_000_000_000).toFixed(1)}M`;
  if (v >= 1_000_000) return `Rp${(v / 1_000_000).toFixed(1)}Jt`;
  if (v >= 1_000) return `Rp${(v / 1_000).toFixed(0)}Rb`;
  return `Rp${Math.round(v).toLocaleString('id-ID')}`;
}

function fN(v: number) {
  return v.toLocaleString('id-ID');
}

export function formatDailySummary(data: SummaryData): string {
  const { summary: s, target, channels, harian, highlights, period } = data;
  const pctTarget = target > 0 ? ((s.total_omzet / target) * 100).toFixed(0) : '0';

  // Find top channel
  let topChannel = { name: '-', omzet: 0, pct: 0 };
  let droppedChannels: { name: string; drop: number }[] = [];
  const totalChOmzet = Object.values(channels || {}).reduce((sum, c) => sum + c.total_omzet, 0);

  if (channels) {
    Object.entries(channels).forEach(([name, c]) => {
      const pct = totalChOmzet > 0 ? (c.total_omzet / totalChOmzet) * 100 : 0;
      if (c.total_omzet > topChannel.omzet) {
        topChannel = { name, omzet: c.total_omzet, pct };
      }
    });

    // Find dropped channels (compare with previous day if available)
    if (harian && harian.length >= 2) {
      const today = harian[harian.length - 1];
      const yesterday = harian[harian.length - 2];
      // Simple heuristic: if today's omzet is 30% less than yesterday's average
      const avgYesterday = harian.slice(0, -1).reduce((sum, h) => sum + h.omzet, 0) / (harian.length - 1);
      if (today.omzet < avgYesterday * 0.7) {
        droppedChannels.push({ name: 'Hari ini', drop: ((avgYesterday - today.omzet) / avgYesterday * 100) });
      }
    }
  }

  // Generate 3 recommendations
  const recommendations: string[] = [];
  if (s.roas < 2) {
    recommendations.push(`📉 ROAS ${s.roas.toFixed(1)}x di bawah target. Evaluasi performa iklan dan matikan underperforming ads.`);
  } else if (s.rata_cac > 60) {
    recommendations.push(`⚠️ CAC ${s.rata_cac.toFixed(1)}% tinggi. Pertimbangkan optimasi creative atau target audience.`);
  } else if (s.rata_upsell < 1.2) {
    recommendations.push(`🛒 Upsell ${s.rata_upsell.toFixed(2)}x rendah. Tambah cross-sell di funnel.`);
  } else if (pctTarget !== '0' && parseFloat(pctTarget) < 50) {
    recommendations.push(`🎯 Target baru ${pctTarget}% perlu push. Scale top-performing channel: ${topChannel.name}.`);
  } else {
    recommendations.push(`✅ Performa stabil. Pertahankan strategy dan scale channel dengan ROI tertinggi.`);
  }
  if (recommendations.length < 2) {
    recommendations.push(`📊 Review channel performance mingguan untuk optimasi.`);
  }
  if (recommendations.length < 3) {
    recommendations.push(`💡 Test creative baru untuk freshen up campaign.`);
  }

  const lines = [
    `<b>📊 DAILY SUMMARY${period ? ` - ${period}` : ''}</b>`,
    '',
    `<b>📈 KEY METRICS</b>`,
    `Omzet: ${fR(s.total_omzet)} (${pctTarget}% target)`,
    `Closing: ${fN(s.total_closing)} | Botol: ${fN(s.total_botol)}`,
    `ROAS: ${s.roas.toFixed(1)}x | CAC: ${s.rata_cac.toFixed(1)}%`,
    `Avg: ${fR(s.avg_omzet_harian)}/hari | Upsell: ${s.rata_upsell.toFixed(2)}x`,
    '',
    `<b>🎯 PROGRESS TARGET</b>`,
    `${fR(s.total_omzet)} / ${fR(target)} (${pctTarget}%)`,
    s.hari > 0 ? `Pace: ${fR(s.total_omzet / s.hari)}/hari` : '',
    '',
    `<b>🏆 TOP CHANNEL</b>`,
    `${topChannel.name}: ${fR(topChannel.omzet)} (${topChannel.pct.toFixed(0)}%)`,
    '',
    droppedChannels.length > 0 ? `<b>⚠️ DROPPED CHANNELS</b>` : '',
    ...droppedChannels.map(d => `${d.name}: -${d.drop.toFixed(0)}%`),
    '',
    `<b>💡 3 REKOMENDASI TINDAKAN</b>`,
    ...recommendations.slice(0, 3).map((r, i) => `${i + 1}. ${r}`),
    '',
    `<i>Generated at ${new Date().toLocaleString('id-ID')}</i>`,
  ].filter(Boolean);

  return lines.join('\n');
}

export function formatMonthlySummary(data: SummaryData): string {
  const { summary: s, target, channels, highlights, period } = data;
  const pctTarget = target > 0 ? ((s.total_omzet / target) * 100).toFixed(0) : '0';

  // Find top channel
  let topChannel = { name: '-', omzet: 0, pct: 0 };
  const totalChOmzet = Object.values(channels || {}).reduce((sum, c) => sum + c.total_omzet, 0);

  if (channels) {
    Object.entries(channels).forEach(([name, c]) => {
      const pct = totalChOmzet > 0 ? (c.total_omzet / totalChOmzet) * 100 : 0;
      if (c.total_omzet > topChannel.omzet) {
        topChannel = { name, omzet: c.total_omzet, pct };
      }
    });
  }

  // Monthly recommendations
  const recommendations: string[] = [];
  if (parseFloat(pctTarget) < 80) {
    recommendations.push(`🎯 Target ${pctTarget}% belum tercapai. Review strategy bulan depan.`);
  }
  if (s.roas < 3) {
    recommendations.push(`📉 ROAS ${s.roas.toFixed(1)}x perlu improvement. Audit semua campaign.`);
  }
  if (s.rata_cac > 50) {
    recommendations.push(`⚠️ CAC ${s.rata_cac.toFixed(1)}% tinggi. Optimasi funnel dan creative.`);
  }
  if (recommendations.length < 3) {
    recommendations.push(`✅ Scale channel dengan ROI tertinggi.`);
    recommendations.push(`📊 Analisis trend channel untuk budget allocation bulan depan.`);
  }

  const lines = [
    `<b>📊 MONTHLY SUMMARY${period ? ` - ${period}` : ''}</b>`,
    '',
    `<b>📈 KEY METRICS</b>`,
    `Omzet: ${fR(s.total_omzet)} (${pctTarget}% target)`,
    `Total Closing: ${fN(s.total_closing)} | Botol: ${fN(s.total_botol)}`,
    `ROAS: ${s.roas.toFixed(1)}x | CAC: ${s.rata_cac.toFixed(1)}%`,
    `Avg Omzet: ${fR(s.avg_omzet_harian)}/hari | Upsell: ${s.rata_upsell.toFixed(2)}x`,
    `Hari: ${s.hari} hari`,
    '',
    `<b>🎯 PROGRESS TARGET</b>`,
    `${fR(s.total_omzet)} / ${fR(target)} (${pctTarget}%)`,
    '',
    `<b>🏆 TOP CHANNEL</b>`,
    `${topChannel.name}: ${fR(topChannel.omzet)} (${topChannel.pct.toFixed(0)}%)`,
    '',
    highlights?.best_day ? `<b>🌟 BEST DAY</b>` : '',
    highlights?.best_day ? `${highlights.best_day.tanggal}: ${fR(highlights.best_day.omzet)}` : '',
    '',
    `<b>💡 REKOMENDASI</b>`,
    ...recommendations.slice(0, 3).map((r, i) => `${i + 1}. ${r}`),
    '',
    `<i>Generated at ${new Date().toLocaleString('id-ID')}</i>`,
  ].filter(Boolean);

  return lines.join('\n');
}

export function formatAlertSummary(alerts: any[]): string {
  if (!alerts || alerts.length === 0) {
    return '<b>✅ Tidak ada alert aktif</b>\n\nSemua metrik dalam batas normal.';
  }

  const criticals = alerts.filter((a: any) => a.severity === 'critical');
  const warnings = alerts.filter((a: any) => a.severity === 'warning');

  const lines = [
    `<b>🚨 ALERT SUMMARY</b>`,
    '',
    criticals.length > 0 ? `<b>🔴 CRITICAL (${criticals.length})</b>` : '',
    ...criticals.map((a: any) => `• ${a.ruleName}: ${a.message}`),
    '',
    warnings.length > 0 ? `<b>🟡 WARNING (${warnings.length})</b>` : '',
    ...warnings.map((a: any) => `• ${a.ruleName}: ${a.message}`),
    '',
    `<i>Generated at ${new Date().toLocaleString('id-ID')}</i>`,
  ].filter(Boolean);

  return lines.join('\n');
}

export function formatTargetProgress(data: SummaryData): string {
  const { summary: s, target, period } = data;

  // Handle target yang 0 atau tidak tersedia
  if (!target || target <= 0) {
    const lines = [
      `<b>🎯 TARGET PROGRESS${period ? ` - ${period}` : ''}</b>`,
      '',
      `<b>⚠️ TARGET BELUM DISET</b>`,
      '',
      `Omzet saat ini: ${fR(s.total_omzet)}`,
      `Hari ke-${s.hari} dari 30`,
      `Pace harian: ${fR(s.avg_omzet_harian)}/hari`,
      '',
      `<i>Set target di Google Sheets untuk melihat progress.</i>`,
      '',
      `<i>Generated at ${new Date().toLocaleString('id-ID')}</i>`,
    ];
    return lines.join('\n');
  }

  const pctTarget = ((s.total_omzet / target) * 100).toFixed(0);
  const remaining = target - s.total_omzet;
  const daysLeft = 30 - s.hari;
  const requiredPace = daysLeft > 0 ? remaining / daysLeft : 0;

  const lines = [
    `<b>🎯 TARGET PROGRESS${period ? ` - ${period}` : ''}</b>`,
    '',
    `Omzet: ${fR(s.total_omzet)} / ${fR(target)} (${pctTarget}%)`,
    '',
    `<b>📊 PROGRESS BAR</b>`,
    `${'█'.repeat(Math.min(Math.floor(parseFloat(pctTarget) / 10), 10))}${'░'.repeat(10 - Math.min(Math.floor(parseFloat(pctTarget) / 10), 10))} ${pctTarget}%`,
    '',
    `<b>📅 STATUS</b>`,
    `Hari ke-${s.hari} dari 30`,
    `Sisa hari: ${daysLeft}`,
    '',
    `<b>💪 PACE YANG DIBUTUHKAN</b>`,
    `Sisa target: ${fR(remaining)}`,
    `Pace harian: ${fR(requiredPace)}/hari`,
    '',
    s.avg_omzet_harian >= requiredPace ? '<b>✅ PACE AMAN</b>' : '<b>⚠️ PACE PERLU DITINGKATKAN</b>',
    '',
    `<i>Generated at ${new Date().toLocaleString('id-ID')}</i>`,
  ];

  return lines.join('\n');
}

export function formatChannelPerformance(data: SummaryData): string {
  const { channels, period } = data;
  if (!channels) return '<b>❌ Data channel tidak tersedia</b>';

  const chLabels: Record<string, string> = { video: 'Video', live: 'Live', shop_tab: 'Shop Tab', affiliate: 'Affiliate' };
  const totalOmzet = Object.values(channels).reduce((sum, c) => sum + c.total_omzet, 0);

  const sorted = Object.entries(channels).sort((a, b) => b[1].total_omzet - a[1].total_omzet);

  const lines = [
    `<b>📊 CHANNEL PERFORMANCE${period ? ` - ${period}` : ''}</b>`,
    '',
    ...sorted.map(([name, c]) => {
      const pct = totalOmzet > 0 ? (c.total_omzet / totalOmzet) * 100 : 0;
      return [
        `<b>${chLabels[name] || name}</b>`,
        `Omzet: ${fR(c.total_omzet)} (${pct.toFixed(0)}%)`,
        `Closing: ${fN(c.total_closing)} | Botol: ${fN(c.total_botol)}`,
        `ROI: ${(c.roi || 0).toFixed(1)}x | CAC: ${(c.rata_cac || 0).toFixed(1)}%`,
        '',
      ].join('\n');
    }),
    `<i>Generated at ${new Date().toLocaleString('id-ID')}</i>`,
  ];

  return lines.join('\n');
}
