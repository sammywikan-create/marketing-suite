export async function callOpenAI(
  systemPrompt: string,
  messages: { role: string; content: string }[],
  model: string = 'gpt-4o-mini',
  baseUrl: string = 'https://api.openai.com/v1',
  apiKey?: string,
  temperature: number = 0.7,
  maxTokens: number = 4000
): Promise<string> {
  const finalKey = (apiKey || process.env.OPENAI_API_KEY || '').trim()
  if (!finalKey) {
    throw new Error('API Key OpenAI / WeizeRouter Gateway tidak ditemukan. Harap masukan API Key Anda di Pengaturan AI.')
  }

  // Clean base URL: strip trailing slashes & accidental /chat/completions suffix
  let cleanBaseUrl = (baseUrl || 'https://api.openai.com/v1').trim().replace(/\/+$/, '')
  cleanBaseUrl = cleanBaseUrl.replace(/\/chat\/completions\/?$/i, '').replace(/\/+$/, '')

  const rawModel = (model || '').trim()
  const selectedModel = rawModel === '*' || !rawModel ? 'gpt-4o-mini' : rawModel
  const effectiveMaxTokens = Math.max(maxTokens || 4000, 4000)

  const endpoint = `${cleanBaseUrl}/chat/completions`

  const payload = {
    model: selectedModel,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages.map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      })),
    ],
    temperature,
    max_tokens: effectiveMaxTokens,
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${finalKey}`,
    },
    body: JSON.stringify(payload),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    const errorMsg =
      data?.error?.message ||
      data?.message ||
      (typeof data?.error === 'string' ? data.error : null) ||
      `HTTP ${res.status} ${res.statusText}`
    throw new Error(`OpenAI/Gateway Error (${res.status}): ${errorMsg}`)
  }

  const resultText = data?.choices?.[0]?.message?.content || data?.choices?.[0]?.text
  if (!resultText) {
    if (data?.error) throw new Error(`Gateway Error: ${JSON.stringify(data.error)}`)
    throw new Error('Gateway tidak mengembalikan respons teks valid.')
  }

  return resultText
}

export const OPENAI_MODELS = [
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Default)' },
  { value: 'gpt-4o', label: 'GPT-4o (Unggulan)' },
  { value: 'deepseek-chat', label: 'DeepSeek V3 / R1' },
  { value: 'claude-3-5-sonnet', label: 'Claude 3.5 Sonnet' },
  { value: '*', label: '* (Semua Model / Gateway Default)' },
]
