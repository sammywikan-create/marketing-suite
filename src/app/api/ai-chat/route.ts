import { NextRequest, NextResponse } from 'next/server'
import { callGemini } from '@/lib/ai/providers/gemini'
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
          settings.maxTokens ?? 600
        )
        break
      case 'ollama':
        content = await callOllama(
          systemPrompt, messages,
          settings.ollamaModel || 'llama3.2',
          settings.ollamaBaseUrl || 'http://localhost:11434',
          settings.temperature ?? 0.7,
          settings.maxTokens ?? 600,
          settings.ollamaMode || 'local'
        )
        break
      case 'openrouter':
        content = await callOpenRouter(
          systemPrompt, messages,
          settings.openrouterModel || 'google/gemini-flash-1.5',
          settings.temperature ?? 0.7,
          settings.maxTokens ?? 600
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
