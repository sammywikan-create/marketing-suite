import { GoogleGenerativeAI } from '@google/generative-ai'

export async function callGemini(
  systemPrompt: string,
  messages: { role: string; content: string }[],
  model: string = 'gemini-2.5-flash',
  temperature: number = 0.7,
  maxTokens: number = 4000,
  customApiKey?: string
): Promise<string> {
  const apiKey = customApiKey || process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('API Key Gemini tidak ditemukan. Harap masukan API Key Gemini di Pengaturan AI (aistudio.google.com) atau .env.local')
  }

  const genAI = new GoogleGenerativeAI(apiKey)

  const cleanModelName = (name: string) => (name || '').replace(/^models\//i, '').trim()
  const requestedModel = cleanModelName(model) || 'gemini-2.5-flash'

  // Candidate models to try automatically if requested model returns 404 / 429 Quota Exceeded
  const modelsToTry = Array.from(
    new Set([
      requestedModel,
      'gemini-2.5-flash',
      'gemini-2.5-pro',
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-1.5-flash-8b',
      'gemini-2.0-flash-lite',
    ])
  )

  const effectiveMaxTokens = Math.max(maxTokens || 8192, 8192)
  let lastError: any = null

  for (const m of modelsToTry) {
    try {
      const genModel = genAI.getGenerativeModel({
        model: m,
        systemInstruction: systemPrompt,
        generationConfig: {
          temperature,
          maxOutputTokens: effectiveMaxTokens,
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
      const isRetryable =
        msg.includes('404') ||
        msg.includes('not found') ||
        msg.includes('429') ||
        msg.includes('quota') ||
        msg.includes('limit') ||
        err?.status === 404 ||
        err?.status === 429

      if (!isRetryable) {
        throw err
      }
      console.warn(`[Gemini Provider] Model '${m}' returned retryable error (${err?.status || 'quota/404'}), trying fallback model...`)
    }
  }

  const errMsg = String(lastError?.message || '').toLowerCase()
  if (errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('limit')) {
    throw new Error(
      '⚠️ Quota Gemini API Key Anda telah habis / terkena Rate Limit (429).\n\n💡 SOLUSI API KEY GRATIS TANPA LIMIT:\n1. Gunakan Provider "OpenRouter" di Pengaturan AI ➔ Dapatkan API Key Gratis di openrouter.ai (Bebas limit 429 Google).\n2. Atau pilih model gemini-2.5-flash di Pengaturan AI.'
    )
  }

  throw lastError || new Error('Gagal menghubungi model Gemini. Pastikan API key Anda aktif di aistudio.google.com.')
}

export const GEMINI_MODELS = [
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Rekomendasi Utama - Cepat & Efisien)' },
  { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (Analisis Kompleks & Laporan Mendalam)' },
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (Stabil)' },
  { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
  { value: 'gemini-1.5-flash-8b', label: 'Gemini 1.5 Flash 8B (Ringan)' },
]
