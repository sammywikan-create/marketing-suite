'use client'
import { useAIStore } from '@/store/useAIStore'

const BADGES: Record<string, { label: string; color: string }> = {
  gemini: { label: '🔵 Gemini', color: 'bg-blue-100 text-blue-700' },
  ollama: { label: '🟢 Ollama', color: 'bg-green-100 text-green-700' },
  openrouter: { label: '🟣 OpenRouter', color: 'bg-purple-100 text-purple-700' },
}

export function AIProviderBadge() {
  const { settings } = useAIStore()
  const badge = BADGES[settings.provider] || BADGES.gemini

  const modelLabel =
    settings.provider === 'gemini' ? settings.geminiModel :
    settings.provider === 'ollama' ? `${settings.ollamaModel} (${settings.ollamaMode === 'cloud' ? 'Cloud' : 'Lokal'})` :
    settings.openrouterModel

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${badge.color}`}>
      {badge.label} · {modelLabel}
    </span>
  )
}
