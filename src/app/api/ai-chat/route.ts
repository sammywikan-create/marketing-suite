import { NextRequest, NextResponse } from 'next/server'
import { callGemini } from '@/lib/ai/providers/gemini'
import { callOpenAI } from '@/lib/ai/providers/openai'
import { callOllama } from '@/lib/ai/providers/ollama'
import { callOpenRouter } from '@/lib/ai/providers/openrouter'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { systemPrompt, messages, settings } = body

    if (!systemPrompt || !messages || !settings) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    let content: string

    switch (settings.provider) {
      case 'gemini':
        content = await callGemini(
          systemPrompt, messages,
          settings.geminiModel || 'gemini-1.5-flash',
          settings.temperature ?? 0.7,
          settings.maxTokens ?? 600,
          settings.geminiApiKey
        )
        break
      case 'openai':
        content = await callOpenAI(
          systemPrompt, messages,
          settings.openaiModel || 'gpt-4o-mini',
          settings.openaiBaseUrl || 'https://api.openai.com/v1',
          settings.openaiApiKey,
          settings.temperature ?? 0.7,
          settings.maxTokens ?? 600
        )
        break
      case 'ollama': {
        const baseUrl = settings.ollamaBaseUrl || 'http://localhost:11434';
        if (process.env.VERCEL && (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1'))) {
          throw new Error('Vercel tidak dapat mengakses Ollama di localhost. Harap gunakan IP publik (misal Ngrok) atau gunakan provider Gemini.');
        }

        content = await callOllama(
          systemPrompt, messages,
          settings.ollamaModel || 'llama3.2',
          baseUrl,
          settings.temperature ?? 0.7,
          settings.maxTokens ?? 600,
          settings.ollamaApiKey
        )
        break
      }
      case 'openrouter':
        content = await callOpenRouter(
          systemPrompt, messages,
          settings.openrouterModel || 'google/gemini-flash-1.5',
          settings.temperature ?? 0.7,
          settings.maxTokens ?? 600,
          settings.openrouterApiKey
        )
        break
      default:
        return NextResponse.json({ error: 'Provider tidak dikenal' }, { status: 400 })
    }

    return NextResponse.json({ content })
  } catch (err: any) {
    const message = err?.message || 'Terjadi kesalahan pada server AI'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
