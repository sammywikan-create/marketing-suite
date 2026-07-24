import OpenAI from 'openai'

export async function callOpenRouter(
  systemPrompt: string,
  messages: { role: string; content: string }[],
  model: string = 'google/gemini-flash-1.5',
  temperature: number = 0.7,
  maxTokens: number = 4000,
  customApiKey?: string
): Promise<string> {
  const apiKey = customApiKey || process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('OPENROUTER_API_KEY tidak ditemukan. Harap masukan API Key OpenRouter di Pengaturan AI.')

  const effectiveMaxTokens = Math.max(maxTokens || 4000, 4000)

  const client = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey,
    defaultHeaders: {
      'HTTP-Referer': 'https://gmv-evaluator.app',
      'X-Title': 'GMV Max Evaluator',
    },
  })

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ],
    temperature,
    max_tokens: effectiveMaxTokens,
  })

  return response.choices[0]?.message?.content || 'Tidak ada respons.'
}

export const OPENROUTER_MODELS = [
  { value: 'google/gemini-flash-1.5', label: 'Gemini 1.5 Flash (Google) - Gratis' },
  { value: 'meta-llama/llama-3.2-11b-vision-instruct:free', label: 'Llama 3.2 11B (Meta) - Gratis' },
  { value: 'deepseek/deepseek-r1:free', label: 'DeepSeek R1 - Gratis' },
  { value: 'mistralai/mistral-7b-instruct:free', label: 'Mistral 7B - Gratis' },
]
