import type { AISettings } from '@/store/useAIStore'

export async function callAI(
  systemPrompt: string,
  messages: { role: string; content: string }[],
  settings: AISettings,
  storeId?: string
): Promise<string> {
  const res = await fetch('/api/ai-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ systemPrompt, messages, settings, storeId }),
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.error || 'Gagal menghubungi AI. Cek pengaturan provider.')
  }

  return data.content
}
