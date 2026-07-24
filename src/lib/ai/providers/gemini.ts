import { GoogleGenerativeAI } from '@google/generative-ai'

export async function callGemini(
  systemPrompt: string,
  messages: { role: string; content: string }[],
  model: string = 'gemini-2.0-flash',
  temperature: number = 0.7,
  maxTokens: number = 600,
  customApiKey?: string
): Promise<string> {
  const apiKey = customApiKey || process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('API Key Gemini tidak ditemukan. Harap masukan API Key Gemini di Pengaturan AI (aistudio.google.com) atau .env.local')
  }

  const genAI = new GoogleGenerativeAI(apiKey)

  // Candidate models to try automatically if requested model returns 404 / not found
  const modelsToTry = Array.from(
    new Set([
      model,
      'gemini-2.0-flash',
      'gemini-2.0-flash-lite',
      'gemini-1.5-flash-latest',
      'gemini-1.5-flash',
      'gemini-1.5-pro',
    ])
  )

  let lastError: any = null

  for (const m of modelsToTry) {
    try {
      const genModel = genAI.getGenerativeModel({
        model: m,
        systemInstruction: systemPrompt,
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
        },
      })

      const history = messages.slice(0, -1).map((msg) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }))

      const lastMessage = messages[messages.length - 1]?.content || 'Halo'
      const chat = genModel.startChat({ history })
      const result = await chat.sendMessage(lastMessage)
      return result.response.text()
    } catch (err: any) {
      lastError = err
      const msg = String(err?.message || '').toLowerCase()
      const is404 = msg.includes('404') || msg.includes('not found') || err?.status === 404
      if (!is404) {
        // If error is invalid API key or quota limits, don't try other models
        throw err
      }
      console.warn(`[Gemini Provider] Model '${m}' returned 404, trying fallback model...`)
    }
  }

  throw lastError || new Error('Gagal menghubungi model Gemini. Pastikan API key Anda aktif di aistudio.google.com.')
}

export const GEMINI_MODELS = [
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (Rekomendasi & Cepat)' },
  { value: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite (Sangat Cepat)' },
  { value: 'gemini-1.5-flash-latest', label: 'Gemini 1.5 Flash Latest' },
  { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro (Lebih Pintar)' },
]
