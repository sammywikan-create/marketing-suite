import { NextRequest, NextResponse } from 'next/server';
import { sendTelegramMessage, getTelegramBotToken } from '@/lib/alerts/telegram';
import { formatDailySummary, formatMonthlySummary, formatAlertSummary, formatTargetProgress, formatChannelPerformance } from '@/lib/reports/summaryFormatter';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, chatId } = body;

    if (!type || !chatId) {
      return NextResponse.json({ error: 'Missing required fields: type, chatId' }, { status: 400 });
    }

    const botToken = getTelegramBotToken();
    if (!botToken) {
      return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN belum diset' }, { status: 400 });
    }

    // Fetch current data from Google Sheets
    const sheetsRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/laporan-harian`);
    const sheetsData = sheetsRes.ok ? await sheetsRes.json() : null;

    if (!sheetsData?.summary) {
      return NextResponse.json({ error: 'Gagal mengambil data dari Google Sheets' }, { status: 500 });
    }

    let message = '';
    const period = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    switch (type) {
      case 'today':
        message = formatDailySummary({
          summary: sheetsData.summary,
          target: sheetsData.target || 0,
          channels: sheetsData.channels,
          harian: sheetsData.harian,
          highlights: sheetsData.highlights,
          period,
        });
        break;
      case 'month':
        message = formatMonthlySummary({
          summary: sheetsData.summary,
          target: sheetsData.target || 0,
          channels: sheetsData.channels,
          highlights: sheetsData.highlights,
          period: new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
        });
        break;
      case 'alert':
        // Evaluate alerts first
        const alertsRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/alerts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            summary: sheetsData.summary,
            harian: sheetsData.harian?.map((h: any) => ({ tanggal: h.tanggal, omzet: h.omzet, biaya_iklan: h.biaya_iklan })),
            target: sheetsData.target || 0,
            telegram: { enabled: false, chatId: '', botToken: '' },
          }),
        });
        const alertsData = alertsRes.ok ? await alertsRes.json() : null;
        message = formatAlertSummary(alertsData?.alerts || []);
        break;
      case 'target':
        message = formatTargetProgress({
          summary: sheetsData.summary,
          target: sheetsData.target || 0,
          period: new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
        });
        break;
      case 'channel':
        message = formatChannelPerformance({
          summary: sheetsData.summary,
          target: sheetsData.target || 0,
          channels: sheetsData.channels,
          period: new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
        });
        break;
      default:
        return NextResponse.json({ error: 'Invalid type. Use: today, month, alert, target, channel' }, { status: 400 });
    }

    // Send to Telegram
    const result = await sendTelegramMessage(
      { chatId, enabled: true },
      message,
      'HTML',
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, type });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    console.error('[Telegram Summary] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
