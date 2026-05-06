import { NextRequest, NextResponse } from 'next/server';
import { getTelegramBotToken } from '@/lib/alerts/telegram';

export async function GET(req: NextRequest) {
  try {
    const botToken = getTelegramBotToken();
    if (!botToken) {
      return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN not set' }, { status: 400 });
    }

    const webhookUrl = `${req.nextUrl.origin}/api/telegram/webhook`;

    // Set webhook
    const res = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: webhookUrl }),
    });

    const data = await res.json();

    if (!data.ok) {
      return NextResponse.json({ error: data.description }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      webhookUrl,
      message: 'Webhook set successfully',
      data,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
