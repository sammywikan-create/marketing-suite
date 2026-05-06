/**
 * Alert Rules Engine
 * Evaluates laporan harian data against configurable thresholds
 * and generates alert messages when conditions are met.
 */

export type AlertSeverity = 'critical' | 'warning' | 'info';

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  severity: AlertSeverity;
}

export interface AlertResult {
  ruleId: string;
  ruleName: string;
  severity: AlertSeverity;
  message: string;
  value: number;
  threshold: number;
  timestamp: number;
}

export interface AlertThresholds {
  // Omzet pace: alert if daily average is below X% of required pace
  omzetPacePct: number; // default 80 = alert if pace < 80% of target
  // ROAS minimum threshold
  roasMin: number; // default 2.0
  // CAC maximum threshold (%)
  cacMax: number; // default 60
  // Daily omzet drop from average (%)
  dailyDropPct: number; // default 30
  // Cost spike threshold (%)
  costSpikePct: number; // default 20
}

export const DEFAULT_THRESHOLDS: AlertThresholds = {
  omzetPacePct: 80,
  roasMin: 2.0,
  cacMax: 60,
  dailyDropPct: 30,
  costSpikePct: 20,
};

export const ALERT_RULES: AlertRule[] = [
  {
    id: 'omzet_below_pace',
    name: 'Omzet Di Bawah Pace Target',
    description: 'Alert jika rata-rata omzet harian di bawah pace yang dibutuhkan untuk capai target',
    enabled: true,
    severity: 'critical',
  },
  {
    id: 'roas_low',
    name: 'ROAS Rendah',
    description: 'Alert jika ROAS keseluruhan di bawah threshold minimum',
    enabled: true,
    severity: 'warning',
  },
  {
    id: 'cac_high',
    name: 'CAC Terlalu Tinggi',
    description: 'Alert jika rata-rata CAC melebihi batas maksimum',
    enabled: true,
    severity: 'warning',
  },
  {
    id: 'daily_drop',
    name: 'Penurunan Harian Drastis',
    description: 'Alert jika omzet hari terakhir turun drastis dari rata-rata',
    enabled: true,
    severity: 'critical',
  },
  {
    id: 'cost_spike',
    name: 'Lonjakan Biaya Iklan',
    description: 'Alert jika biaya iklan hari terakhir naik drastis dari rata-rata',
    enabled: true,
    severity: 'warning',
  },
];

interface SummaryData {
  total_omzet: number;
  total_closing: number;
  total_botol: number;
  total_biaya_iklan: number;
  rata_cac: number;
  roas: number;
  hari: number;
  avg_omzet_harian: number;
}

interface HarianData {
  tanggal: string;
  omzet: number;
  biaya_iklan: number;
}

export function evaluateAlerts(
  summary: SummaryData,
  harian: HarianData[],
  target: number,
  thresholds: AlertThresholds = DEFAULT_THRESHOLDS,
  enabledRules: string[] = ALERT_RULES.map(r => r.id),
): AlertResult[] {
  const alerts: AlertResult[] = [];
  const now = Date.now();

  // 1. Omzet below pace
  if (enabledRules.includes('omzet_below_pace') && target > 0 && summary.hari > 0) {
    const daysInMonth = 30;
    const remainingDays = Math.max(daysInMonth - summary.hari, 1);
    const remainingTarget = target - summary.total_omzet;
    const requiredDailyPace = remainingTarget / remainingDays;
    const actualDailyPace = summary.avg_omzet_harian || (summary.total_omzet / summary.hari);
    const pacePct = requiredDailyPace > 0 ? (actualDailyPace / requiredDailyPace) * 100 : 100;

    if (pacePct < thresholds.omzetPacePct && remainingTarget > 0) {
      alerts.push({
        ruleId: 'omzet_below_pace',
        ruleName: 'Omzet Di Bawah Pace Target',
        severity: 'critical',
        message: `⚠️ Pace omzet harian (${fR(actualDailyPace)}/hari) hanya ${pacePct.toFixed(0)}% dari yang dibutuhkan (${fR(requiredDailyPace)}/hari) untuk capai target ${fR(target)}.`,
        value: pacePct,
        threshold: thresholds.omzetPacePct,
        timestamp: now,
      });
    }
  }

  // 2. ROAS low
  if (enabledRules.includes('roas_low') && summary.roas > 0) {
    if (summary.roas < thresholds.roasMin) {
      alerts.push({
        ruleId: 'roas_low',
        ruleName: 'ROAS Rendah',
        severity: 'warning',
        message: `📉 ROAS saat ini ${summary.roas.toFixed(2)}x, di bawah minimum ${thresholds.roasMin}x. Efisiensi iklan perlu ditingkatkan.`,
        value: summary.roas,
        threshold: thresholds.roasMin,
        timestamp: now,
      });
    }
  }

  // 3. CAC high
  if (enabledRules.includes('cac_high') && summary.rata_cac > 0) {
    if (summary.rata_cac > thresholds.cacMax) {
      alerts.push({
        ruleId: 'cac_high',
        ruleName: 'CAC Terlalu Tinggi',
        severity: 'warning',
        message: `💸 CAC rata-rata ${summary.rata_cac.toFixed(1)}% melebihi batas ${thresholds.cacMax}%. Biaya akuisisi customer terlalu besar.`,
        value: summary.rata_cac,
        threshold: thresholds.cacMax,
        timestamp: now,
      });
    }
  }

  // 4. Daily drop
  if (enabledRules.includes('daily_drop') && harian.length >= 2) {
    const sorted = [...harian].sort((a, b) => a.tanggal.localeCompare(b.tanggal));
    const lastDay = sorted[sorted.length - 1];
    const avgOmzet = summary.total_omzet / summary.hari;
    const dropPct = avgOmzet > 0 ? ((avgOmzet - lastDay.omzet) / avgOmzet) * 100 : 0;

    if (dropPct > thresholds.dailyDropPct) {
      alerts.push({
        ruleId: 'daily_drop',
        ruleName: 'Penurunan Harian Drastis',
        severity: 'critical',
        message: `🔻 Omzet ${lastDay.tanggal} (${fR(lastDay.omzet)}) turun ${dropPct.toFixed(0)}% dari rata-rata (${fR(avgOmzet)}). Investigasi segera!`,
        value: dropPct,
        threshold: thresholds.dailyDropPct,
        timestamp: now,
      });
    }
  }

  // 5. Cost spike
  if (enabledRules.includes('cost_spike') && harian.length >= 2) {
    const sorted = [...harian].sort((a, b) => a.tanggal.localeCompare(b.tanggal));
    const lastDay = sorted[sorted.length - 1];
    const avgCost = summary.total_biaya_iklan / summary.hari;
    const spikePct = avgCost > 0 ? ((lastDay.biaya_iklan - avgCost) / avgCost) * 100 : 0;

    if (spikePct > thresholds.costSpikePct) {
      alerts.push({
        ruleId: 'cost_spike',
        ruleName: 'Lonjakan Biaya Iklan',
        severity: 'warning',
        message: `🔺 Biaya iklan ${lastDay.tanggal} (${fR(lastDay.biaya_iklan)}) naik ${spikePct.toFixed(0)}% dari rata-rata (${fR(avgCost)}). Cek campaign yang over-spend.`,
        value: spikePct,
        threshold: thresholds.costSpikePct,
        timestamp: now,
      });
    }
  }

  return alerts;
}

function fR(v: number): string {
  if (v >= 1_000_000) return `Rp${(v / 1_000_000).toFixed(1)}Jt`;
  if (v >= 1_000) return `Rp${(v / 1_000).toFixed(0)}Rb`;
  return `Rp${Math.round(v).toLocaleString('id-ID')}`;
}

export function formatAlertForTelegram(alerts: AlertResult[], period?: string): string {
  if (alerts.length === 0) return '';

  const header = `🚨 *ALERT LAPORAN HARIAN*${period ? ` — ${period}` : ''}\n${'─'.repeat(30)}\n\n`;

  const criticals = alerts.filter(a => a.severity === 'critical');
  const warnings = alerts.filter(a => a.severity === 'warning');

  let msg = header;

  if (criticals.length > 0) {
    msg += `🔴 *CRITICAL (${criticals.length}):*\n`;
    criticals.forEach(a => { msg += `${a.message}\n\n`; });
  }

  if (warnings.length > 0) {
    msg += `🟡 *WARNING (${warnings.length}):*\n`;
    warnings.forEach(a => { msg += `${a.message}\n\n`; });
  }

  msg += `─────────────────\n📅 ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}\n`;
  msg += `💡 _Cek dashboard untuk detail lengkap_`;

  return msg;
}
