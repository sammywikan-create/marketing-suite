import { GoogleGenerativeAI } from '@google/generative-ai'

export async function callGemini(
  systemPrompt: string,
  messages: { role: string; content: string }[],
  model: string = 'gemini-1.5-flash',
  temperature: number = 0.7,
  maxTokens: number = 600
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY tidak ditemukan di .env.local')

  const genAI = new GoogleGenerativeAI(apiKey)
  const genModel = genAI.getGenerativeModel({
    model,
    systemInstruction: systemPrompt,
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
    },
  })

  const history = messages.slice(0, -1).map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

  const lastMessage = messages[messages.length - 1].content
  const chat = genModel.startChat({ history })
  const result = await chat.sendMessage(lastMessage)
  return result.response.text()
}

export const GEMINI_MODELS = [
  { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash (Cepat & Gratis)' },
  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro (Lebih Pintar)' },
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (Terbaru)' },
  { value: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite (Paling Cepat)' },
]
