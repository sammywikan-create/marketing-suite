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
  if (!finalKey) throw new Error('API Key OpenAI tidak ditemukan. Harap masukan API Key OpenAI Anda di Pengaturan AI.')

  const cleanBaseUrl = (baseUrl || 'https://api.openai.com/v1').trim().replace(/\/+$/, '')

  const client = new OpenAI({
    baseURL: cleanBaseUrl,
    apiKey: finalKey,
  })

  const response = await client.chat.completions.create({
    model,
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
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Cepat, Hemat & Pintar)' },
  { value: 'gpt-4o', label: 'GPT-4o (Model Unggulan OpenAI)' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (Standar)' },
  { value: 'o3-mini', label: 'o3-Mini (Reasoning Agent)' },
]
