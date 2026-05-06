/**
 * Telegram Bot API integration for sending alerts
 */

export interface TelegramConfig {
  botToken: string;
  chatId: string;
  enabled: boolean;
}

interface TelegramResponse {
  ok: boolean;
  description?: string;
}

const TG_API = 'https://api.telegram.org';

export async function sendTelegramMessage(
  config: TelegramConfig,
  message: string,
  parseMode: 'Markdown' | 'HTML' = 'HTML'
): Promise<{ success: boolean; error?: string }> {
  if (!config.enabled) {
    return { success: false, error: 'Telegram notifications disabled' };
  }
  if (!config.botToken || !config.chatId) {
    return { success: false, error: 'Bot token atau Chat ID belum diisi' };
  }

  const url = `${TG_API}/bot${config.botToken}/sendMessage`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: config.chatId,
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
  if (!config.botToken || !config.chatId) {
    return { success: false, error: 'Bot token atau Chat ID belum diisi' };
  }

  const url = `${TG_API}/bot${config.botToken}/sendDocument`;

  try {
    const formData = new FormData();
    formData.append('chat_id', config.chatId);
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

export async function testTelegramConnection(
  config: TelegramConfig
): Promise<{ success: boolean; botName?: string; error?: string }> {
  if (!config.botToken) {
    return { success: false, error: 'Bot token belum diisi' };
  }

  const url = `${TG_API}/bot${config.botToken}/getMe`;

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