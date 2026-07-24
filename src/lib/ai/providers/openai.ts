import OpenAI from 'openai'

export async function callOpenAI(
  systemPrompt: string,
  messages: { role: string; content: string }[],
  model: string = 'gpt-4o-mini',
  baseUrl: string = 'https://api.openai.com/v1',
  apiKey?: string,
  temperature: number = 0.7,
  maxTokens: number = 600
): Promise<string> {
  const finalKey = apiKey || process.env.OPENAI_API_KEY
  if (!finalKey) throw new Error('API Key OpenAI / WeizeRouter Gateway tidak ditemukan. Harap masukan API Key Anda di Pengaturan AI.')

  // Clean base URL: strip trailing slashes & accidental /chat/completions suffix
  let cleanBaseUrl = (baseUrl || 'https://api.openai.com/v1').trim().replace(/\/+$/, '')
  cleanBaseUrl = cleanBaseUrl.replace(/\/chat\/completions\/?$/i, '').replace(/\/+$/, '')

  const rawModel = (model || '').trim()
  const selectedModel = rawModel === '*' || !rawModel ? 'gpt-4o-mini' : rawModel

  const client = new OpenAI({
    baseURL: cleanBaseUrl,
    apiKey: finalKey,
  })

  const response = await client.chat.completions.create({
    model: selectedModel,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages.map((m) => ({
        role: (m.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant',
        content: m.content,
      })),
    ],
    temperature,
    max_tokens: maxTokens,
  })

  return response.choices[0]?.message?.content || 'Tidak ada respons.'
}

export const OPENAI_MODELS = [
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Default)' },
  { value: 'gpt-4o', label: 'GPT-4o (Unggulan)' },
  { value: 'deepseek-chat', label: 'DeepSeek V3 / R1' },
  { value: 'claude-3-5-sonnet', label: 'Claude 3.5 Sonnet' },
  { value: '*', label: '* (Semua Model / Gateway Default)' },
]
