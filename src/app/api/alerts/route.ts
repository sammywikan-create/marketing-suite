import { NextRequest, NextResponse } from 'next/server';
import { evaluateAlerts, formatAlertForTelegram, AlertThresholds } from '@/lib/alerts/rules';
import { sendTelegramMessage, testTelegramConnection, TelegramConfig } from '@/lib/alerts/telegram';

// POST /api/alerts — evaluate alerts and optionally send via Telegram
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { summary, harian, target, thresholds, enabledRules, telegram, period } = body;

    if (!summary) {
      return NextResponse.json({ error: 'Missing summary data' }, { status: 400 });
    }

    // Evaluate alerts
    const alerts = evaluateAlerts(
      summary,
      harian || [],
      target || 0,
      thresholds as AlertThresholds,
      enabledRules,
    );

    let telegramResult = { sent: false, error: '' };

    // Send via Telegram if configured and there are alerts
    if (telegram?.enabled && alerts.length > 0) {
      const message = formatAlertForTelegram(alerts, period);
      const result = await sendTelegramMessage(telegram as TelegramConfig, message);
      telegramResult = { sent: result.success, error: result.error || '' };
    }

    return NextResponse.json({
      alerts,
      count: alerts.length,
      telegram: telegramResult,
      checkedAt: Date.now(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT /api/alerts — test Telegram connection
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { chatId } = body;

    // Test bot connection
    const botResult = await testTelegramConnection();
    if (!botResult.success) {
      return NextResponse.json({ error: botResult.error }, { status: 400 });
    }

    // Send test message if chatId provided
    if (chatId) {
      const testMsg = `\u2705 <b>Test Alert Berhasil!</b>\n\nBot @${botResult.botName} terhubung ke chat ini.\nAlert otomatis dari Marketing Suite akan dikirim ke sini.`;
      const sendResult = await sendTelegramMessage(
        { chatId, enabled: true },
        testMsg,
      );
      if (!sendResult.success) {
        return NextResponse.json({ error: `Bot valid tapi gagal kirim: ${sendResult.error}` }, { status: 400 });
      }
    }

    return NextResponse.json({
      success: true,
      botName: botResult.botName,
      message: chatId ? 'Test message sent!' : 'Bot token valid!',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
