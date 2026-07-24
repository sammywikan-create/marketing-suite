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

    const effectiveMaxTokens = Math.max(settings.maxTokens || 4000, 4000)
    let content: string

    switch (settings.provider) {
      case 'gemini':
        content = await callGemini(
          systemPrompt, messages,
          settings.geminiModel || 'gemini-2.5-flash',
          settings.temperature ?? 0.7,
          effectiveMaxTokens,
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
          effectiveMaxTokens
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
          effectiveMaxTokens,
          settings.ollamaApiKey
        )
        break
      }
      case 'openrouter':
        content = await callOpenRouter(
          systemPrompt, messages,
          settings.openrouterModel || 'google/gemini-flash-1.5',
          settings.temperature ?? 0.7,
          effectiveMaxTokens,
          settings.openrouterApiKey
        )
        break
      default:
        return NextResponse.json({ error: 'Provider AI tidak dikenal' }, { status: 400 })
    }

    return NextResponse.json({ content })
  } catch (err: any) {
    console.error('AI Chat Route Error:', err)
    return NextResponse.json({ error: err.message || 'Error processing request' }, { status: 500 })
  }
}
