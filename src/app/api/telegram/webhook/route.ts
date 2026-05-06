import { NextRequest, NextResponse } from 'next/server';
import { sendTelegramMessage, getTelegramBotToken } from '@/lib/alerts/telegram';
import { formatDailySummary, formatMonthlySummary, formatAlertSummary, formatTargetProgress, formatChannelPerformance } from '@/lib/reports/summaryFormatter';

// Verify webhook secret
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || '';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Verify webhook secret if configured
    if (WEBHOOK_SECRET && req.headers.get('x-telegram-bot-api-secret-token') !== WEBHOOK_SECRET) {
      console.error('[Telegram Webhook] Invalid secret');
      return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
    }

    const { message } = body;
    if (!message?.text || !message.chat?.id) {
      return NextResponse.json({ ok: true }); // Acknowledge but ignore non-text messages
    }

    const chatId = message.chat.id.toString();
    const text = message.text.trim();
    const botToken = getTelegramBotToken();

    if (!botToken) {
      console.error('[Telegram Webhook] Bot token not configured');
      return NextResponse.json({ ok: true });
    }

    console.log('[Telegram Webhook] Command:', text, 'Chat:', chatId);

    // Use origin for internal fetch
    const baseUrl = req.nextUrl.origin;

    // Handle commands
    let responseMessage = '';

    if (text === '/today' || text === '/start') {
      // Fetch current data from Google Sheets
      const sheetsRes = await fetch(`${baseUrl}/api/laporan-harian`);
      const sheetsData = sheetsRes.ok ? await sheetsRes.json() : null;

      if (sheetsData?.summary) {
        responseMessage = formatDailySummary({
          summary: sheetsData.summary,
          target: sheetsData.target || 0,
          channels: sheetsData.channels,
          harian: sheetsData.harian,
          highlights: sheetsData.highlights,
          period: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
        });
      } else {
        responseMessage = '<b>❌ Gagal mengambil data</b>\n\nCoba lagi nanti atau cek dashboard.';
      }
    } else if (text === '/month') {
      const sheetsRes = await fetch(`${baseUrl}/api/laporan-harian`);
      const sheetsData = sheetsRes.ok ? await sheetsRes.json() : null;

      if (sheetsData?.summary) {
        responseMessage = formatMonthlySummary({
          summary: sheetsData.summary,
          target: sheetsData.target || 0,
          channels: sheetsData.channels,
          highlights: sheetsData.highlights,
          period: new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
        });
      } else {
        responseMessage = '<b>❌ Gagal mengambil data</b>\n\nCoba lagi nanti atau cek dashboard.';
      }
    } else if (text === '/alert') {
      // Get alert history from store (this won't work server-side, so we'll need a different approach)
      responseMessage = '<b>🔔 ALERT STATUS</b>\n\nGunakan /today untuk melihat ringkasan dengan alert aktif.';
    } else if (text === '/target') {
      const sheetsRes = await fetch(`${baseUrl}/api/laporan-harian`);
      const sheetsData = sheetsRes.ok ? await sheetsRes.json() : null;

      if (sheetsData?.summary) {
        responseMessage = formatTargetProgress({
          summary: sheetsData.summary,
          target: sheetsData.target || 0,
          period: new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
        });
      } else {
        responseMessage = '<b>❌ Gagal mengambil data</b>\n\nCoba lagi nanti atau cek dashboard.';
      }
    } else if (text === '/channel') {
      const sheetsRes = await fetch(`${baseUrl}/api/laporan-harian`);
      const sheetsData = sheetsRes.ok ? await sheetsRes.json() : null;

      if (sheetsData?.channels && sheetsData?.summary) {
        responseMessage = formatChannelPerformance({
          summary: sheetsData.summary,
          target: sheetsData.target || 0,
          channels: sheetsData.channels,
          period: new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
        });
      } else {
        responseMessage = '<b>❌ Gagal mengambil data</b>\n\nCoba lagi nanti atau cek dashboard.';
      }
    } else if (text === '/help') {
      responseMessage = [
        '<b>🤖 TELEGRAM BOT COMMANDS</b>',
        '',
        '<b>📊 Summary Commands:</b>',
        '/today - Ringkasan harian',
        '/month - Ringkasan bulanan',
        '',
        '<b>🎯 Monitoring Commands:</b>',
        '/target - Progress target',
        '/channel - Performa channel',
        '/alert - Status alert',
        '',
        '<b>ℹ️ Other:</b>',
        '/help - Bantuan',
        '/start - Mulai / ringkasan hari ini',
        '',
        '<i>Powered by FreshVision Marketing Suite</i>',
      ].join('\n');
    } else {
      // Unknown command
      responseMessage = [
        '<b>❓ Command tidak dikenali</b>',
        '',
        'Gunakan /help untuk melihat command yang tersedia.',
      ].join('\n');
    }

    // Send response to Telegram
    if (responseMessage) {
      await sendTelegramMessage(
        { chatId, enabled: true },
        responseMessage,
        'HTML',
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    console.error('[Telegram Webhook] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET /api/telegram/webhook - get webhook info (for debugging)
export async function GET() {
  const botToken = getTelegramBotToken();
  if (!botToken) {
    return NextResponse.json({ error: 'Bot token not configured' }, { status: 400 });
  }

  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/telegram/webhook`;
  return NextResponse.json({
    webhookUrl,
    setupCommand: `curl -F "url=${webhookUrl}" https://api.telegram.org/bot${botToken}/setWebhook`,
  });
}
