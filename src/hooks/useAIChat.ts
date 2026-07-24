'use client'
import { useState, useCallback } from 'react'
import { useAIStore, ChatMessage } from '@/store/useAIStore'
import { callAI } from '@/lib/ai/aiClient'
import { MASTER_SYSTEM_PROMPT, AUTO_INSIGHT_PROMPTS } from '@/lib/ai/prompts'
import { nanoid } from 'nanoid'

export function useAIChat(page: string, context: string, storeId?: string) {
  const { settings, chatHistory, addMessage, clearHistory } = useAIStore()
  const [isLoading, setIsLoading] = useState(false)
  const [autoInsights, setAutoInsights] = useState<string[]>([])
  const [insightLoading, setInsightLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const messages = chatHistory[page] || []

  const systemPrompt = MASTER_SYSTEM_PROMPT +
    (context ? `\n\n=== DATA KONTEKS HALAMAN AKTIF ===\n${context}` : '')

  const sendMessage = useCallback(async (content: string) => {
    setError(null)
    const userMsg: ChatMessage = {
      id: nanoid(), role: 'user', content, timestamp: new Date(), page
    }
    addMessage(page, userMsg)
    setIsLoading(true)
    try {
      const history = [...messages, userMsg].map(m => ({
        role: m.role, content: m.content
      }))
      const reply = await callAI(systemPrompt, history, settings, storeId)
      const aiMsg: ChatMessage = {
        id: nanoid(), role: 'assistant', content: reply,
        timestamp: new Date(), page
      }
      addMessage(page, aiMsg)
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan. Cek API key kamu.')
    } finally {
      setIsLoading(false)
    }
  }, [messages, settings, page, context, systemPrompt, addMessage, storeId])

  const generateAutoInsight = useCallback(async () => {
    const prompt = AUTO_INSIGHT_PROMPTS[page]
    if (!prompt || !context) return
    setInsightLoading(true)
    try {
      const reply = await callAI(
        systemPrompt,
        [{ role: 'user', content: prompt }],
        settings,
        storeId
      )
      const insights = reply.split('\n').filter(l => l.trim().length > 10)
      setAutoInsights(insights.slice(0, 3))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setInsightLoading(false)
    }
  }, [page, context, settings, systemPrompt, storeId])

  return {
    messages,
    isLoading,
    insightLoading,
    autoInsights,
    error,
    sendMessage,
    generateAutoInsight,
    clearHistory: () => clearHistory(page),
  }
}
