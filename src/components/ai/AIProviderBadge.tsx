'use client'
import { useAIStore } from '@/store/useAIStore'

const BADGES: Record<string, { label: string; color: string }> = {
  gemini: { label: '🔵 Gemini', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' },
  openai: { label: '🟢 OpenAI', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300' },
  ollama: { label: '🦙 Ollama', color: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' },
  openrouter: { label: '🟣 OpenRouter', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300' },
}

export function AIProviderBadge() {
  const { settings } = useAIStore()
  const badge = BADGES[settings.provider] || BADGES.gemini

  const modelLabel =
    settings.provider === 'gemini' ? settings.geminiModel :
    settings.provider === 'openai' ? (settings.openaiModel || 'gpt-4o-mini') :
    settings.provider === 'ollama' ? settings.ollamaModel :
    settings.openrouterModel

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${badge.color}`}>
      {badge.label} · {modelLabel}
    </span>
  )
}
