/**
 * Telegram Bot API integration for sending alerts
 */

export interface TelegramConfig {
  chatId?: string;
  enabled: boolean;
}

interface TelegramResponse {
  ok: boolean;
  description?: string;
}

const TG_API = 'https://api.telegram.org';

export function getTelegramBotToken(): string {
  return process.env.TELEGRAM_BOT_TOKEN || '';
}

function getTelegramChatId(config: TelegramConfig): string {
  return config.chatId || process.env.TELEGRAM_DEFAULT_CHAT_ID || '';
}

export async function sendTelegramMessage(
  config: TelegramConfig,
  message: string,
  parseMode: 'Markdown' | 'HTML' = 'HTML'
): Promise<{ success: boolean; error?: string }> {
  if (!config.enabled) {
    return { success: false, error: 'Telegram notifications disabled' };
  }
  const botToken = getTelegramBotToken();
  const chatId = getTelegramChatId(config);
  if (!botToken) {
    return { success: false, error: 'TELEGRAM_BOT_TOKEN belum diset di Vercel Environment Variables' };
  }
  if (!chatId) {
    return { success: false, error: 'Chat ID belum diisi' };
  }

  const url = `${TG_API}/bot${botToken}/sendMessage`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: parseMode,
        disable_web_page_preview: true,
      }),
    });

    const data: TelegramResponse = await res.json();

    if (!data.ok) {
      console.error('[Telegram] Send failed:', data.description);
      return { success: false, error: data.description || 'Gagal kirim pesan Telegram' };
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Network error';
    console.error('[Telegram] Error:', msg);
    return { success: false, error: msg };
  }
}

export async function sendTelegramDocument(
  config: TelegramConfig,
  fileBuffer: Buffer,
  filename: string,
  caption?: string,
): Promise<{ success: boolean; error?: string }> {
  if (!config.enabled) {
    return { success: false, error: 'Telegram notifications disabled' };
  }
  const botToken = getTelegramBotToken();
  const chatId = getTelegramChatId(config);
  if (!botToken) {
    return { success: false, error: 'TELEGRAM_BOT_TOKEN belum diset di Vercel Environment Variables' };
  }
  if (!chatId) {
    return { success: false, error: 'Chat ID belum diisi' };
  }

  const url = `${TG_API}/bot${botToken}/sendDocument`;

  try {
    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append('document', new Blob([new Uint8Array(fileBuffer)]), filename);
    if (caption) {
      formData.append('caption', caption);
      formData.append('parse_mode', 'HTML');
    }

    const res = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    const data: TelegramResponse = await res.json();

    if (!data.ok) {
      console.error('[Telegram] Send document failed:', data.description);
      return { success: false, error: data.description || 'Gagal kirim dokumen' };
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Network error';
    console.error('[Telegram] Document error:', msg);
    return { success: false, error: msg };
  }
}

export async function testTelegramConnection(): Promise<{ success: boolean; botName?: string; error?: string }> {
  const botToken = getTelegramBotToken();
  if (!botToken) {
    return { success: false, error: 'TELEGRAM_BOT_TOKEN belum diset di Vercel Environment Variables' };
  }

  const url = `${TG_API}/bot${botToken}/getMe`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (!data.ok) {
      return { success: false, error: 'Bot token tidak valid' };
    }

    return { success: true, botName: data.result?.username || 'Unknown' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Network error';
    return { success: false, error: msg };
  }
}
