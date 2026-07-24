import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type AIProvider = 'gemini' | 'openai' | 'ollama' | 'openrouter'

export interface AISettings {
  provider: AIProvider
  geminiModel: string
  geminiApiKey: string
  openaiModel: string
  openaiBaseUrl: string
  openaiApiKey: string
  ollamaModel: string
  ollamaBaseUrl: string
  ollamaApiKey: string
  openrouterModel: string
  openrouterApiKey: string
  temperature: number
  maxTokens: number
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  page?: string
}

interface AIStore {
  settings: AISettings
  chatHistory: Record<string, ChatMessage[]>
  isOpen: boolean
  unreadInsights: number
  updateSettings: (s: Partial<AISettings>) => void
  addMessage: (page: string, msg: ChatMessage) => void
  clearHistory: (page: string) => void
  setOpen: (open: boolean) => void
  markRead: () => void
}

export const useAIStore = create<AIStore>()(
  persist(
    (set) => ({
      settings: {
        provider: 'gemini',
        geminiModel: 'gemini-2.0-flash',
        geminiApiKey: '',
        openaiModel: 'gpt-4o-mini',
        openaiBaseUrl: 'https://api.openai.com/v1',
        openaiApiKey: '',
        ollamaModel: 'llama3.2',
        ollamaBaseUrl: 'http://localhost:11434',
        ollamaApiKey: '',
        openrouterModel: 'google/gemini-flash-1.5',
        openrouterApiKey: '',
        temperature: 0.7,
        maxTokens: 600,
      },
      chatHistory: {},
      isOpen: false,
      unreadInsights: 0,
      updateSettings: (s) =>
        set((state) => ({ settings: { ...state.settings, ...s } })),
      addMessage: (page, msg) =>
        set((state) => ({
          chatHistory: {
            ...state.chatHistory,
            [page]: [...(state.chatHistory[page] || []), msg],
          },
        })),
      clearHistory: (page) =>
        set((state) => ({
          chatHistory: { ...state.chatHistory, [page]: [] },
        })),
      setOpen: (open) => set({ isOpen: open }),
      markRead: () => set({ unreadInsights: 0 }),
    }),
    { name: 'gmv-ai-settings' }
  )
)
